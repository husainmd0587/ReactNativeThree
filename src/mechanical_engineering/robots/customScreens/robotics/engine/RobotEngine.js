/**
 * RobotEngine.js
 *
 * Central coordinator: holds robot state, drives motion interpolation,
 * and steps through a loaded program. Kinematics/collision are still
 * out of scope for this phase - joints are treated as directly
 * controlling the renderer's transforms (see RobotRenderer.jsx), not
 * derived from a forward-kinematics solve yet.
 *
 * Pipeline this enables:
 *   Program Text -> ProgramInterpreter -> Instructions
 *     -> RobotEngine (executor) -> MotionController -> jointValues
 *     -> RobotRenderer
 */

import {
  createInitialRobotState,
  setJointValue,
  setJointValues,
  setMode,
  setSelectedJoint,
  setGrip,
  setBoxHeld,
  setBoxPosition,
  setBoxVelocity,
  resetBox,
} from '../model/RobotState';
import { MotionController } from './MotionController';
import { INSTRUCTION_TYPES } from './ProgramInterpreter';
import { getDialect } from './dialects';
import {
  SIMULATION_MODES,
  GRIP_STATES,
  PICK_RADIUS,
  GRAVITY,
  BOX_REST_HEIGHT,
  PLAYBACK_STATES,
  FIXED_STEP_SECONDS,
} from '../core/robotConstants';

const DEFAULT_MOVE_SPEED = 60; // degrees/second

export class RobotEngine {
  constructor(definition) {
    this.state = createInitialRobotState(definition);
    this.listeners = new Set();
    this.motion = new MotionController();

    this.program = {
      sourceText: '',
      dialect: 'simple',
      instructions: [],
      errors: [],
      pointer: -1,
      running: false,
      waitRemaining: 0,
    };

    // Updated every frame by the renderer (RobotRenderer's gripper
    // assembly) via reportGripperWorldPosition - the real rendered
    // world position of the gripper, read from Three.js. Used only at
    // the moment of drop, so the box lands exactly where the gripper
    // visually is.
    this.gripperWorldPosition = [0, 0, 0];

    // Overall simulation clock - separate from program.running (which
    // tracks only whether a program is mid-execution). update() only
    // advances anything when playback.state === 'playing', so pausing
    // freezes motion interpolation, box physics, AND program stepping
    // together - not just a running program.
    this.playback = {
      state: PLAYBACK_STATES.PLAYING,
      speed: 1,
    };
  }

  getPlaybackState() {
    return this.playback;
  }

  getState() {
    return this.state;
  }

  getProgramState() {
    return this.program;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ─── Manual control ──────────────────────────────────────────────
  setJointValue(jointId, value) {
    this.motion.stop();
    if (this.program.running) this.program.running = false;
    this.state = setJointValue(this.state, jointId, value);
    this._notify();
  }

  setMode(mode) {
    this.state = setMode(this.state, mode);
    this._notify();
  }

  setSelectedJoint(jointId) {
    this.state = setSelectedJoint(this.state, jointId);
    this._notify();
  }

  setGrip(grip) {
    const previousGrip = this.state.grip;
    const wasHolding = this.state.box.held;

    this.state = setGrip(this.state, grip);

    if (grip === GRIP_STATES.CLOSED && previousGrip !== GRIP_STATES.CLOSED && !wasHolding) {
      // Pick: only succeeds if the gripper's actual rendered position
      // is close enough to the box - closing the gripper elsewhere is
      // a real miss, not a guaranteed grab.
      const distance = distance3(this.gripperWorldPosition, this.state.box.position);
      if (distance <= PICK_RADIUS) {
        this.state = setBoxHeld(this.state, true);
        this.state = setBoxVelocity(this.state, 0);
      }
    } else if (grip === GRIP_STATES.OPEN && previousGrip === GRIP_STATES.CLOSED && wasHolding) {
      // Drop: detach at the gripper's last reported real world
      // position, then let update() animate it falling to the ground.
      this.state = setBoxHeld(this.state, false);
      this.state = setBoxPosition(this.state, this.gripperWorldPosition);
      this.state = setBoxVelocity(this.state, 0);
    }

    this._notify();
  }

  /**
   * Called every frame from the renderer with the gripper's actual
   * rendered world position (via Object3D.getWorldPosition). Cheap and
   * intentionally does not notify/re-render - it's only read back at
   * the moment of a drop.
   */
  reportGripperWorldPosition(position) {
    this.gripperWorldPosition = position;
  }

  /** Puts the box back at its starting position, released. */
  resetBox() {
    this.state = resetBox(this.state);
    this._notify();
  }

  // ─── Direct move (used by program executor, and reusable for a
  // future Target mode) ─────────────────────────────────────────────
  moveJ(jointTargets, speedDegPerSec = DEFAULT_MOVE_SPEED) {
    const targets = { ...this.state.jointValues, ...jointTargets };
    this.motion.moveJ(this.state.jointValues, targets, speedDegPerSec);
  }

  // ─── Program control ─────────────────────────────────────────────
  /**
   * Parses program text against the current robot definition, using
   * the given dialect's parser (see engine/dialects/). Every dialect
   * produces the same { instructions, errors } shape, so nothing else
   * in the engine needs to know which syntax was used.
   * Does not run it - call runProgram() after a successful load.
   */
  loadProgram(text, dialectId = 'simple') {
    const dialect = getDialect(dialectId);
    const { instructions, errors } = dialect.parse(text, this.state.definition);
    this.program = {
      sourceText: text,
      dialect: dialect.id,
      instructions,
      errors,
      pointer: -1,
      running: false,
      waitRemaining: 0,
    };
    this._notify();
    return { instructions, errors };
  }

  /**
   * Starts executing the currently loaded program from the top.
   * Refuses to run if the program has parse errors - fix and reload.
   */
  runProgram() {
    if (this.program.errors.length > 0) return false;
    if (this.program.instructions.length === 0) return false;

    this.program.pointer = -1;
    this.program.running = true;
    this.playback.state = PLAYBACK_STATES.PLAYING;
    this.setMode(SIMULATION_MODES.PROGRAM);
    this._advanceProgram();
    return true;
  }

  stopProgram() {
    this.program.running = false;
    this.motion.stop();
    this._notify();
  }

  _advanceProgram() {
    this.program.pointer += 1;

    if (this.program.pointer >= this.program.instructions.length) {
      this.program.running = false;
      this._notify();
      return;
    }

    this._startInstruction(this.program.instructions[this.program.pointer]);
    this._notify();
  }

  _startInstruction(instruction) {
    switch (instruction.type) {
      case INSTRUCTION_TYPES.HOME: {
        const targets = {};
        this.state.definition.joints.forEach((joint) => {
          targets[joint.id] = 0;
        });
        this.motion.moveJ(this.state.jointValues, targets, DEFAULT_MOVE_SPEED);
        break;
      }
      case INSTRUCTION_TYPES.MOVEJ: {
        const { jointTargets, speed } = instruction.args;
        this.moveJ(jointTargets, speed ?? DEFAULT_MOVE_SPEED);
        break;
      }
      case INSTRUCTION_TYPES.WAIT: {
        this.program.waitRemaining = instruction.args.seconds;
        break;
      }
      case INSTRUCTION_TYPES.GRIP: {
        const grip = instruction.args.state === 'OPEN' ? GRIP_STATES.OPEN : GRIP_STATES.CLOSED;
        this.setGrip(grip);
        break;
      }
      default:
        break;
    }
  }

  // ─── Simulation clock (Play / Pause / Stop / Step / Speed) ───────
  /** Resumes ticking - whatever was in flight (motion, physics, a
   * paused program) continues exactly where it left off. */
  play() {
    if (this.playback.state === PLAYBACK_STATES.PLAYING) return;
    this.playback.state = PLAYBACK_STATES.PLAYING;
    this._notify();
  }

  /** Freezes the clock. update() becomes a no-op until play()/stepFrame(). */
  pause() {
    if (this.playback.state !== PLAYBACK_STATES.PLAYING) return;
    this.playback.state = PLAYBACK_STATES.PAUSED;
    this._notify();
  }

  /**
   * Halts and rewinds: clears in-flight motion, stops any running
   * program and resets its instruction pointer to the top (so the
   * next Run/Play starts over, not mid-way). Does not otherwise move
   * the robot or box - like an e-stop, not a full scene reset.
   */
  stop() {
    this.playback.state = PLAYBACK_STATES.STOPPED;
    this.motion.stop();
    this.program.running = false;
    this.program.pointer = -1;
    this.program.waitRemaining = 0;
    this._notify();
  }

  /**
   * Advances exactly one fixed-size tick, regardless of playback
   * state - the tool for frame-by-frame inspection while paused.
   * No-ops while already playing (continuous ticking already covers
   * it).
   */
  stepFrame() {
    if (this.playback.state === PLAYBACK_STATES.PLAYING) return;
    this._tick(FIXED_STEP_SECONDS * this.playback.speed);
  }

  /** Sets the playback speed multiplier (e.g. 0.25 for slow motion, 10 for 10x). */
  setSpeed(multiplier) {
    this.playback.speed = Math.min(10, Math.max(0.1, multiplier));
    this._notify();
  }

  /**
   * Called every frame (see RoboticsScene's SimulationLoop). Only
   * advances anything while the playback clock is 'playing' - see
   * play()/pause()/stop() above.
   */
  update(deltaTime) {
    if (this.playback.state !== PLAYBACK_STATES.PLAYING) return;
    this._tick(deltaTime * this.playback.speed);
  }

  /**
   * The actual per-tick work: advances in-flight motion, box physics,
   * then steps the program forward if one is running and the current
   * instruction has finished (motion arrived, wait elapsed, or
   * grip/instant instructions complete immediately). Shared by
   * update() (continuous, gated by playback state) and stepFrame()
   * (single manual tick, bypasses the gate).
   */
  _tick(deltaTime) {
    let changed = false;

    if (this.motion.isMoving()) {
      const { values } = this.motion.update(deltaTime);
      this.state = setJointValues(this.state, values);
      changed = true;
    }

    if (this._stepBoxPhysics(deltaTime)) {
      changed = true;
    }

    if (this.program.running) {
      const instruction = this.program.instructions[this.program.pointer];

      if (instruction?.type === INSTRUCTION_TYPES.WAIT) {
        this.program.waitRemaining -= deltaTime;
        if (this.program.waitRemaining <= 0) {
          this._advanceProgram();
          changed = true;
        }
      } else if (instruction?.type === INSTRUCTION_TYPES.GRIP) {
        this._advanceProgram();
        changed = true;
      } else if (instruction && !this.motion.isMoving()) {
        this._advanceProgram();
        changed = true;
      }
    }

    if (changed) this._notify();
  }

  /**
   * Simple free-fall for a released box: not a physics engine, just
   * gravity integration until it reaches BOX_REST_HEIGHT, so a dropped
   * box actually falls instead of freezing wherever it was released.
   * Returns true if the box moved this frame.
   */
  _stepBoxPhysics(deltaTime) {
    const { box } = this.state;
    if (box.held) return false;

    const atRest = box.position[1] <= BOX_REST_HEIGHT + 0.0005 && box.velocityY === 0;
    if (atRest) return false;

    const nextVelocity = box.velocityY - GRAVITY * deltaTime;
    let nextY = box.position[1] + nextVelocity * deltaTime;
    let landedVelocity = nextVelocity;

    if (nextY <= BOX_REST_HEIGHT) {
      nextY = BOX_REST_HEIGHT;
      landedVelocity = 0;
    }

    this.state = setBoxPosition(this.state, [box.position[0], nextY, box.position[2]]);
    this.state = setBoxVelocity(this.state, landedVelocity);
    return true;
  }

  _notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

function distance3(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function createRobotEngine(definition) {
  return new RobotEngine(definition);
}
