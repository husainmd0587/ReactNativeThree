//CNC PASSES ANALYZER
/**
 * ═══════════════════════════════════════════════════════════════════
 * CNC PASSES & GEOMETRY GENERATION SYSTEM
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Extends the CNC Interpreter with:
 * ✅ Pass tracking (identifies cutting passes from motion segments)
 * ✅ Geometry building (converts passes to CSG-ready geometry)
 * ✅ Stock profile management (tracks material removal)
 * ✅ Timeline synchronization (motion → geometry mapping)
 * 
 * Core Concept:
 * [stock] → [after_pass_1] → [after_pass_2] → ... → [after_pass_N]
 */

// ═══════════════════════════════════════════════════════════════════
// PASS ANALYZER
// ═══════════════════════════════════════════════════════════════════

/**
 * PassAnalyzer - Converts motion timeline into distinct cutting passes
 * 
 * Key Rule:
 *   ✅ ONE PASS = continuous G01/G2/G3 motion segments
 *   ❌ PASS ENDS when:
 *       - G00 (rapid) appears
 *       - Tool change (M06)
 *       - Spindle stop (M05)
 *       - Program pause/stop
 */
export class PassAnalyzer {
  constructor(config = {}) {
    this.config = {
      machineType: config.machineType || 'LATHE',
      tolerance: config.tolerance || 0.01,
      ...config
    };
    this.passes = [];
    this.currentPass = null;
  }

  /**
   * Analyze timeline and group segments into passes
   * @param {Array} timeline - Motion segments from interpreter
   * @param {Object} state - Final machine state
   * @returns {Array} Array of Pass objects
   */
  analyze(timeline, state) {
    this.passes = [];
    this.currentPass = null;

    timeline.forEach((segment, index) => {
      this._processSegment(segment, index, timeline);
    });

    // Finalize last pass if exists
    if (this.currentPass && this.currentPass.segments.length > 0) {
      this._finalizePass();
    }

    return this.passes;
  }

  /**
   * Process individual segment and route to appropriate pass
   * @private
   */
  _processSegment(segment, index, timeline) {
    // Skip non-motion segments
    if (!this._isMotionSegment(segment)) {
      return;
    }

    // RAPID (G00) terminates current pass and starts new one
    if (segment.type === 'RAPID') {
      if (this.currentPass && this.currentPass.segments.length > 0) {
        this._finalizePass();
      }
      // Don't add rapid to any pass - it's just repositioning
      return;
    }

    // Tool change / spindle stop / feed motions break passes
    if (this._isPassBreaker(segment, timeline[index - 1])) {
      if (this.currentPass && this.currentPass.segments.length > 0) {
        this._finalizePass();
      }
    }

    // Create new pass if needed
    if (!this.currentPass) {
      this.currentPass = this._createNewPass(segment);
    }

    // Add segment to current pass
    this.currentPass.segments.push(segment);
    this.currentPass.endTime = segment.endTime;
    this.currentPass.distance += segment.distance;
    this.currentPass.duration += segment.duration || 0;
  }

  /**
   * Check if a segment breaks the current pass
   * @private
   */
  _isPassBreaker(segment, prevSegment) {
    // Tool change in previous segment
    if (prevSegment && prevSegment.type === 'TOOL_CHANGE') {
      return true;
    }

    // Spindle stop
    if (segment.block && segment.block.mCodes.includes(5)) {
      return true;
    }

    // Program pause/stop
    if (segment.block && segment.block.mCodes.some(m => [0, 1, 2, 30].includes(m))) {
      return true;
    }

    return false;
  }

  /**
   * Create a new pass object
   * @private
   */
  _createNewPass(firstSegment) {
    return {
      id: this.passes.length + 1,
      type: this._classifyPassType(firstSegment),
      startTime: firstSegment.startTime,
      endTime: firstSegment.startTime,
      startPosition: { ...firstSegment.start },
      endPosition: { ...firstSegment.end },
      segments: [],
      distance: 0,
      duration: 0,
      feedRate: firstSegment.feedRate || 0,
      toolNumber: firstSegment.block?.toolNumber || 0,
      cutProfile: [], // Lathe-specific: profile of cut
      sweepVolume: null, // CSG-ready geometry
      metadata: {
        planeMode: firstSegment.block?.plane || 'G17',
        arcCount: 0,
        feedChanges: 0
      }
    };
  }

  /**
   * Classify pass type based on motion and coordinates
   * @private
   */
  _classifyPassType(segment) {
    const block = segment.block;
    if (!block) return 'UNKNOWN';

    // Check for canned cycles
    if (block.gCodes.some(g => [70, 71, 72, 73, 74, 75, 76].includes(g))) {
      if (block.gCodes.includes(70)) return 'FINISH_CYCLE';
      if (block.gCodes.includes(71)) return 'ROUGH_TURNING';
      if (block.gCodes.includes(72)) return 'ROUGH_FACING';
      if (block.gCodes.includes(74)) return 'PECK_DRILL';
      if (block.gCodes.includes(75)) return 'PECK_GROOVE';
      if (block.gCodes.includes(76)) return 'THREADING';
    }

    // Check motion type
    if (segment.type === 'LINEAR') return 'LINEAR_FEED';
    if (segment.type === 'ARC_CW') return 'ARC_CW';
    if (segment.type === 'ARC_CCW') return 'ARC_CCW';

    return 'MOTION';
  }

  /**
   * Finalize and store current pass
   * @private
   */
  _finalizePass() {
    if (!this.currentPass) return;

    // Recalculate aggregate stats
    this.currentPass.distance = this.currentPass.segments.reduce(
      (sum, seg) => sum + (seg.distance || 0), 0
    );
    this.currentPass.duration = this.currentPass.segments.reduce(
      (sum, seg) => sum + (seg.duration || 0), 0
    );

    // Extract arc count
    this.currentPass.metadata.arcCount = this.currentPass.segments.filter(
      seg => seg.type?.includes('ARC')
    ).length;

    this.passes.push(this.currentPass);
    this.currentPass = null;
  }

  /**
   * Check if segment is motion-related
   * @private
   */
  _isMotionSegment(segment) {
    const motionTypes = [
      'RAPID', 'LINEAR', 'ARC_CW', 'ARC_CCW',
      'ROUGH_TURNING', 'ROUGH_FACING', 'FINISH_PASS',
      'PECK_DRILL', 'PECK_GROOVE', 'THREAD_PASS'
    ];
    return motionTypes.includes(segment.type);
  }

  /**
   * Get summary of all passes
   */
  getSummary() {
    return {
      totalPasses: this.passes.length,
      byType: this._groupPassesByType(),
      totalTime: this.passes.reduce((sum, p) => sum + p.duration, 0),
      totalDistance: this.passes.reduce((sum, p) => sum + p.distance, 0),
      passes: this.passes
    };
  }

  /**
   * Group passes by type for reporting
   * @private
   */
  _groupPassesByType() {
    const groups = {};
    this.passes.forEach(pass => {
      if (!groups[pass.type]) groups[pass.type] = [];
      groups[pass.type].push(pass);
    });
    return groups;
  }
}