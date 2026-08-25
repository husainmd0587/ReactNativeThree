/**
 * robotConstants.js
 *
 * Shared constants for the Robotics module.
 * Plain JS "enums" (frozen objects) since the project uses JS/JSX, not TS.
 */

export const JOINT_TYPES = Object.freeze({
  REVOLUTE: 'revolute',
  PRISMATIC: 'prismatic',
  FIXED: 'fixed',
});

export const SIMULATION_MODES = Object.freeze({
  MANUAL: 'manual',
  TARGET: 'target',
  PROGRAM: 'program',
  BUILDER: 'builder',
});

export const GRIP_STATES = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

// Initial camera position passed to the shared CanvaProvider, before
// GlbRobotArm's Scene component runs its own AutoFitCamera pass once
// the real GLB model finishes loading (see scene/GlbRobotArm.jsx).
// This value only matters for the brief moment before that fit
// happens - AutoFitCamera adjusts for whatever the model's actual
// scale turns out to be, so this doesn't need to be scale-accurate.
export const DEFAULT_CAM_POSITION = [2, 2, 2];

export const DEFAULT_JOINT_LIMITS = Object.freeze({
  min: -90,
  max: 90,
});

// PLACEHOLDER VALUES - scale-dependent on the real GLB rig, which
// this environment can't measure (its CDN host is blocked by the
// sandbox's network allowlist). These were tuned for the earlier
// procedural robot's ~1.5-unit-tall geometry; the real rig's units
// could be completely different (meters vs a normalized/arbitrary
// scale). Recalibrate all four of these once you can see the model in
// the app: watch where the box renders relative to the arm, and
// adjust BOX_START/DROP_ZONE positions and PICK_RADIUS to match.
export const DEFAULT_BOX_START_POSITION = [0.32, 0.03, 0.28];
export const DEFAULT_DROP_ZONE_POSITION = [-0.32, 0, 0.22];

// Box half-height, matching PickableBox's default size (0.07/2) - the
// box rests with its center at this Y when sitting on the ground.
// Also scale-dependent - see the placeholder note above.
export const BOX_REST_HEIGHT = 0.035;

// How close the gripper's real world position must be to the box for
// closing the gripper to actually pick it up. Below this, the gripper
// closes but grabs nothing - a real "miss". Scale-dependent - see the
// placeholder note above.
export const PICK_RADIUS = 0.14;

// Simple gravity constant (units/s^2) used to animate a released box
// falling to the ground, instead of freezing wherever it was released.
// Scale-dependent - see the placeholder note above; a much larger
// rig's units would need a correspondingly larger constant to look
// like normal-speed gravity rather than a slow-motion drift.
export const GRAVITY = 2.4;

// Overall simulation clock state (see engine/RobotEngine.js's play/
// pause/stop/stepFrame) - separate from program.running, which tracks
// only whether a program is mid-execution. Pausing freezes EVERYTHING
// (motion interpolation, box physics, program stepping), not just a
// running program - so it also freezes ordinary manual jogging and a
// falling box.
export const PLAYBACK_STATES = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
});

export const FIXED_STEP_SECONDS = 1 / 60;

export const SPEED_PRESETS = Object.freeze([
  { label: 'Slow motion', value: 0.25 },
  { label: 'Normal', value: 1 },
  { label: '2×', value: 2 },
  { label: '5×', value: 5 },
  { label: '10×', value: 10 },
]);
