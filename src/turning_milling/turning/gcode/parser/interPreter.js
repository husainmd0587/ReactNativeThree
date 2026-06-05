// src/cnc/core/interpreter.js

/**
 * CNC G-code Interpreter (Main Engine)
 * Sequential block executor — reads parsed AST, updates modal state,
 * dispatches motion commands, and builds the complete tool-path timeline.
 * Matches Fanuc single-block / auto-run behaviour.
 */

import  Parser              from './parser.js';
import  StateMachine         from './stateMachine.js';
import LinearInterpolator     from './linearInterpolation.js';
import ArcInterpolator        from './arcInterpolation.js';
import CannedCycles           from './cannedCycles.js';

export default class Interpreter {
  /**
   * @param {Object} config
   * @param {string} config.machineType   – 'MILL' | 'LATHE'
   * @param {number} config.maxX          – travel limit X (mm)
   * @param {number} config.maxY          – travel limit Y (mm)
   * @param {number} config.maxZ          – travel limit Z (mm)
   * @param {number} config.maxSpindle    – max RPM
   * @param {number} config.rapidRate     – rapid traverse speed mm/min
   */
  constructor(config = {}) {
    this.config = {
      machineType: config.machineType || 'LATHE',
      maxX:        config.maxX        || 300,
      maxY:        config.maxY        || 300,
      maxZ:        config.maxZ        || 300,
      maxSpindle:  config.maxSpindle  || 6000,
      rapidRate:   config.rapidRate   || 10000,
      ...config
    };

    // Sub-systems
    this.parser       = new Parser();
    this.state        = new StateMachine(this.config);
    this.linearInterp = new LinearInterpolator();
    this.arcInterp    = new ArcInterpolator();
    this.cannedCycles = new CannedCycles(this.state);
    this.cannedCycles.linearInterp = this.linearInterp; // wire dependency

    // Execution state
    this.program      = [];          // parsed AST
    this.pc           = 0;           // program counter (current block index)
    this.timeline     = [];          // ordered motion segments (output)
    this.errors       = [];          // accumulated errors
    this.warnings     = [];          // accumulated warnings
    this.elapsedTime  = 0;           // total accumulated time (seconds)

    // Canned-cycle context (G71 stores profile for later G70)
    this.cannedContext = {
      roughProfile: null,            // saved by G71 for G70
      activeFinishProfile: null,
      cannedReturnZ: 0,
      cannedReturnX: 0
    };

    // Sub-routine / label map (N-word → pc index)
    this.labelMap     = {};

    // Event callbacks (optional hooks)
    this.onBlockExecuted = null;     // (block, segmentIndex) => void
    this.onError        = null;      // (error) => void
  }

  // ───────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────

  /**
   * Load & parse a complete G-code program string.
   * Does NOT execute — call run() afterward.
   */
  load(gcodeText) {
    this.reset();
    this.program = this.parser.parse(gcodeText);
    this._buildLabelMap();
    return this;
  }

  /**
   * Full reset — clears everything back to power-on state.
   */
  reset() {
    this.state.reset();
    this.pc           = 0;
    this.timeline     = [];
    this.errors       = [];
    this.warnings     = [];
    this.elapsedTime  = 0;
    this.cannedContext = {
      roughProfile:        null,
      activeFinishProfile: null,
      cannedReturnZ:       0,
      cannedReturnX:       0
    };
  }

  /**
   * Execute the entire loaded program sequentially.
   * Returns the completed timeline and any errors.
   */
  run() {
    this.pc = 0;

    while (this.pc < this.program.length) {
      const block = this.program[this.pc];
      this._executeBlock(block);

      // Stop on program-end M-codes
      if (this.state.program.stopped) break;
      this.pc++;
    }

    return {
      timeline:    this.timeline,
      errors:      this.errors,
      warnings:    this.warnings,
      totalTime:   this.elapsedTime,
      finalState:  this.state.getState()
    };
  }

  /**
   * Single-block step (for debugger / single-block mode).
   * Returns the segment(s) produced by the current block, or null if done.
   */
  step() {
    if (this.pc >= this.program.length || this.state.program.stopped) {
      return null;
    }

    const block = this.program[this.pc];
    const segmentsBefore = this.timeline.length;
    this._executeBlock(block);
    this.pc++;

    return {
      block,
      newSegments: this.timeline.slice(segmentsBefore),
      done:        this.pc >= this.program.length || this.state.program.stopped
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // CORE EXECUTION
  // ───────────────────────────────────────────────────────────────────

  /**
   * Execute a single parsed block.
   * Order: tool change → spindle/coolant → feed/speed → motion
   * This mirrors real controller priority ordering.
   */
  _executeBlock(block) {
    // 1. Validate the block
    const validation = this.parser.validate(block);
    if (!validation.valid) {
      validation.errors.forEach(e => this._addError(e, block));
      return;
    }

    // 2. Process non-motion items first (Fanuc priority order)
    this._processToolChange(block);
    this._processMCodes(block);
    this._processFeedSpeed(block);

    // 3. Process G-codes (modal updates + motion dispatch)
    this._processGCodes(block);

    // 4. If coordinates present but NO explicit G-code, re-use last motion mode
    //    (modal persistence — core CNC behaviour)
    if (this._hasCoordinates(block) && block.gCodes.length === 0) {
      this._dispatchMotion(block, this._activeMotionCode());
    }

    // 5. Fire callback
    if (this.onBlockExecuted) {
      this.onBlockExecuted(block, this.timeline.length - 1);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // G-CODE PROCESSING
  // ───────────────────────────────────────────────────────────────────

  _processGCodes(block) {
    block.gCodes.forEach(code => {
      // Update modal state for ALL G-codes (even non-motion)
      this.state.updateGCode(code);

      // Dispatch motion only for motion-group codes
      if (this._isMotionCode(code)) {
        this._dispatchMotion(block, code);
      }
      // Non-motion G-codes (plane, units, comp, offsets) are
      // handled entirely by stateMachine.updateGCode above.
    });
  }

  /**
   * Route a motion G-code to the correct handler.
   */
  _dispatchMotion(block, code) {
    switch (code) {
      case 0:  this._executeG0(block);  break;  // Rapid
      case 1:  this._executeG1(block);  break;  // Linear feed
      case 2:  this._executeG2(block);  break;  // Arc CW
      case 3:  this._executeG3(block);  break;  // Arc CCW
      case 28: this._executeG28(block); break;  // Return to ref point
      case 70: this._executeG70(block); break;  // Finish cycle
      case 71: this._executeG71(block); break;  // Rough turning
      case 72: this._executeG72(block); break;  // Rough facing
      case 74: this._executeG74(block); break;  // Peck drilling
      case 75: this._executeG75(block); break;  // Peck grooving
      case 76: this._executeG76(block); break;  // Threading
      default:
        // Non-motion modal codes — no segment produced
        break;
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // INDIVIDUAL MOTION HANDLERS
  // ───────────────────────────────────────────────────────────────────

  /** G0 – Rapid traverse */
  _executeG0(block) {
    const start = this._currentPosition();
    const end   = this._resolveTarget(block);

    if (this._positionsEqual(start, end)) return; // No movement

    const segment = this.linearInterp.interpolate(
      start, end, this.config.rapidRate, true /* isRapid */
    );

    this._commitSegment(segment, block);
    this.state.updatePosition(end); // absolute end position
    this._syncPosition(end);
  }

  /** G1 – Linear feed motion */
  _executeG1(block) {
    const start = this._currentPosition();
    const end   = this._resolveTarget(block);
    const feed  = this.state.feed.rate;

    if (this._positionsEqual(start, end)) return;

    if (feed <= 0) {
      this._addError({ type: 'NO_FEED_RATE', message: 'G1 commanded with zero feed rate' }, block);
      return;
    }

    const segment = this.linearInterp.interpolate(start, end, feed, false);
    this._commitSegment(segment, block);
    this._syncPosition(end);
  }

  /** G2 – Circular CW */
  _executeG2(block) {
    this._executeArc(block, true);
  }

  /** G3 – Circular CCW */
  _executeG3(block) {
    this._executeArc(block, false);
  }

  /** Shared arc handler for G2/G3 */
  _executeArc(block, isClockwise) {
    const start = this._currentPosition();
    const end   = this._resolveTarget(block);
    const feed  = this.state.feed.rate;
    const plane = this.state.plane.mode;

    if (feed <= 0) {
      this._addError({ type: 'NO_FEED_RATE', message: 'Arc commanded with zero feed rate' }, block);
      return;
    }

    const segment = this.arcInterp.interpolate(
      start, end, block.arcParams, plane, isClockwise, feed
    );

    if (segment.error) {
      this._addError({ type: 'ARC_ERROR', message: segment.error }, block);
      return;
    }

    this._commitSegment(segment, block);
    this._syncPosition(end);
  }

  /** G28 – Return to machine reference point */
  _executeG28(block) {
    const start = this._currentPosition();

    // If intermediate point specified, go there first
    const intermediate = this._resolveTarget(block);
    if (!this._positionsEqual(start, intermediate)) {
      const seg1 = this.linearInterp.interpolate(
        start, intermediate, this.config.rapidRate, true
      );
      this._commitSegment(seg1, block);
    }

    // Then rapid to reference (0,0,0)
    const ref = { X: 0, Y: 0, Z: 0 };
    const seg2 = this.linearInterp.interpolate(
      intermediate, ref, this.config.rapidRate, true
    );
    this._commitSegment(seg2, block);
    this._syncPosition(ref);
  }

  // ───────────────────────────────────────────────────────────────────
  // CANNED CYCLE HANDLERS  (delegate to cannedCycles engine)
  // ───────────────────────────────────────────────────────────────────

  /** G70 – Finish pass (uses profile saved by G71) */
  _executeG70(block) {
    const result = this.cannedCycles.executeG70(block, this.cannedContext.roughProfile);
    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }
    result.segments.forEach(seg => {
      this._commitSegment(seg.toolPath, block);
      this._syncPosition(seg.end);
    });
  }

  /** G71 – Rough turning cycle */
  _executeG71(block) {
    // Collect finish profile: all blocks between this G71 and the next
    // non-profile block (simplified — real Fanuc uses P/Q line references)
    const profile = this._collectFinishProfile(block);
    const result  = this.cannedCycles.executeG71(block, profile);

    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }

    // Save profile for a later G70 finish call
    this.cannedContext.roughProfile = { points: profile };

    // Commit each rough pass
    result.segments.forEach(seg => {
      seg.moves.forEach(move => {
        if (move.type === 'DWELL') return; // skip dwell entries
        const segment = this.linearInterp.interpolate(
          move.start, move.end,
          move.rapid ? this.config.rapidRate : move.feedRate,
          move.rapid
        );
        this._commitSegment(segment, block);
        this._syncPosition(move.end);
      });
    });
  }

  /** G72 – Rough facing cycle */
  _executeG72(block) {
    const profile = this._collectFinishProfile(block);
    const result  = this.cannedCycles.executeG72(block, profile);

    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }

    result.segments.forEach(seg => {
      seg.moves.forEach(move => {
        if (move.type === 'DWELL') return;
        const segment = this.linearInterp.interpolate(
          move.start, move.end,
          move.rapid ? this.config.rapidRate : move.feedRate,
          move.rapid
        );
        this._commitSegment(segment, block);
        this._syncPosition(move.end);
      });
    });
  }

  /** G74 – Peck drilling */
  _executeG74(block) {
    const result = this.cannedCycles.executeG74(block);
    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }

    result.segments.forEach(seg => {
      seg.moves.forEach(move => {
        if (move.type === 'DWELL') return;
        const segment = this.linearInterp.interpolate(
          move.start, move.end,
          move.rapid ? this.config.rapidRate : move.feedRate,
          move.rapid
        );
        this._commitSegment(segment, block);
        this._syncPosition(move.end);
      });
    });
  }

  /** G75 – Peck grooving */
  _executeG75(block) {
    const result = this.cannedCycles.executeG75(block);
    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }

    result.segments.forEach(seg => {
      seg.moves.forEach(move => {
        if (move.type === 'DWELL') return;
        const segment = this.linearInterp.interpolate(
          move.start, move.end,
          move.rapid ? this.config.rapidRate : move.feedRate,
          move.rapid
        );
        this._commitSegment(segment, block);
        this._syncPosition(move.end);
      });
    });
  }

  /** G76 – Threading cycle */
  _executeG76(block) {
    const result = this.cannedCycles.executeG76(block);
    if (result.error) {
      this._addError({ type: 'CANNED_ERROR', message: result.error }, block);
      return;
    }

    result.segments.forEach(seg => {
      seg.moves.forEach(move => {
        if (move.type === 'DWELL') return;
        const segment = this.linearInterp.interpolate(
          move.start, move.end,
          move.rapid ? this.config.rapidRate : move.feedRate,
          move.rapid
        );
        this._commitSegment(segment, block);
        this._syncPosition(move.end);
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // M-CODE & AUXILIARY PROCESSING
  // ───────────────────────────────────────────────────────────────────

  _processMCodes(block) {
    block.mCodes.forEach(code => {
      this.state.updateMCode(code);

      // M6 – Tool change (already handled by _processToolChange)
      // M2/M30 – Program end (state machine sets stopped flag)
      // M0/M1 – Program stop / optional stop (state machine handles)
    });
  }

  _processToolChange(block) {
    if (block.toolNumber !== null && block.toolNumber !== this.state.tool.number) {
      // Record tool change event in timeline
      this.timeline.push({
        type:       'TOOL_CHANGE',
        toolNumber: block.toolNumber,
        previous:   this.state.tool.number,
        time:       this.elapsedTime,
        block:      block
      });
      this.state.tool.number = block.toolNumber;
    }
  }

  _processFeedSpeed(block) {
    if (block.feedRate !== null) {
      this.state.feed.rate      = block.feedRate;
      this.state.feed.commanded = block.feedRate;
      this.state.feed.active    = true;
    }
    if (block.spindleSpeed !== null) {
      this.state.spindle.speed          = block.spindleSpeed;
      this.state.spindle.commandedSpeed = block.spindleSpeed;
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // COORDINATE RESOLUTION  (absolute vs incremental, units)
  // ───────────────────────────────────────────────────────────────────

  /**
   * Resolve the target position from a block's coordinates,
   * applying absolute/incremental mode and unit conversion.
   * Axes not present in the block retain their current value.
   */
  _resolveTarget(block) {
    const current = this._currentPosition();
    const target  = { ...current };
    const mult    = this.state.units.multiplier;

    ['X', 'Y', 'Z', 'A', 'B', 'C'].forEach(axis => {
      if (block.coordinates[axis] !== undefined) {
        if (this.state.positioning.isAbsolute) {
          target[axis] = block.coordinates[axis] * mult;
        } else {
          target[axis] = current[axis] + block.coordinates[axis] * mult;
        }
      }
    });

    return target;
  }

  /** Snapshot of current machine position (XYZ only for motion) */
  _currentPosition() {
    return {
      X: this.state.position.X,
      Y: this.state.position.Y,
      Z: this.state.position.Z
    };
  }

  /** Write resolved end-position back into state */
  _syncPosition(pos) {
    if (pos.X !== undefined) this.state.position.X = pos.X;
    if (pos.Y !== undefined) this.state.position.Y = pos.Y;
    if (pos.Z !== undefined) this.state.position.Z = pos.Z;
  }

  // ───────────────────────────────────────────────────────────────────
  // TIMELINE / SEGMENT MANAGEMENT
  // ───────────────────────────────────────────────────────────────────

  /**
   * Append a motion segment to the timeline and accumulate time.
   */
  _commitSegment(segment, block) {
    segment.startTime = this.elapsedTime;
    segment.endTime   = this.elapsedTime + (segment.duration || 0);
    segment.block     = block;                  // back-reference
    segment.index     = this.timeline.length;   // unique index

    this.timeline.push(segment);
    this.elapsedTime += (segment.duration || 0);
  }

  // ───────────────────────────────────────────────────────────────────
  // FINISH-PROFILE COLLECTION (for G71/G72 → G70)
  // ───────────────────────────────────────────────────────────────────

  /**
   * Simple heuristic: scan forward from current PC and collect
   * coordinate-only blocks (no G70/G71/G72) as the finish profile.
   * Real Fanuc uses P/Q word line-number references; this is a
   * pragmatic approximation for simulation.
   */
  _collectFinishProfile(block) {
    const profile = [];
    // Start with current position
    profile.push({ X: this.state.position.X, Z: this.state.position.Z });

    let lookahead = this.pc + 1;
    while (lookahead < this.program.length) {
      const b = this.program[lookahead];
      // Stop scanning at next canned cycle or program end
      if (b.gCodes.some(g => [70, 71, 72, 73, 74, 75, 76].includes(g))) break;
      if (b.mCodes.some(m => [2, 30].includes(m))) break;

      if (b.coordinates.X !== undefined || b.coordinates.Z !== undefined) {
        profile.push({
          X: b.coordinates.X !== undefined ? b.coordinates.X : profile[profile.length - 1].X,
          Z: b.coordinates.Z !== undefined ? b.coordinates.Z : profile[profile.length - 1].Z
        });
      }
      lookahead++;
    }

    return profile;
  }

  // ───────────────────────────────────────────────────────────────────
  // UTILITY / HELPERS
  // ───────────────────────────────────────────────────────────────────

  _buildLabelMap() {
    this.labelMap = {};
    this.program.forEach((block, idx) => {
      if (block.lineNumber !== null) {
        this.labelMap[block.lineNumber] = idx;
      }
    });
  }

  _isMotionCode(code) {
    return [0, 1, 2, 3, 28, 33, 70, 71, 72, 73, 74, 75, 76].includes(code);
  }

  /** Return the currently active motion-mode G-code number */
  _activeMotionCode() {
    const modeStr = this.state.motion.mode; // e.g. 'G1'
    return parseInt(modeStr.replace('G', ''), 10);
  }

  _hasCoordinates(block) {
    return Object.keys(block.coordinates).length > 0;
  }

  _positionsEqual(a, b, tol = 0.0001) {
    return Math.abs(a.X - b.X) < tol &&
           Math.abs(a.Y - b.Y) < tol &&
           Math.abs(a.Z - b.Z) < tol;
  }

  _addError(error, block) {
    error.lineNumber = block ? block.lineNumber : null;
    error.lineIndex  = block ? block.lineIndex  : null;
    this.errors.push(error);
    if (this.onError) this.onError(error);
  }
}
