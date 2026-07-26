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

// Default camera position passed to the shared CanvaProvider.
// The shared provider's own default ([0, 0, 100]) is tuned for
// larger CAD-scale scenes; the 3-DOF arm preset is only ~1.5 units
// tall, so robotics screens use a much closer camera.
export const DEFAULT_CAM_POSITION = [2, 2, 2];

export const DEFAULT_JOINT_LIMITS = Object.freeze({
  min: -90,
  max: 90,
});

// Where the pickable box starts (on the ground, within the arm's
// rough visual reach), and where the drop zone marker is drawn.
// These are purely visual placements - there is no reach/collision
// checking yet, so they're not guaranteed to exactly line up with
// any particular joint program.
export const DEFAULT_BOX_START_POSITION = [0.32, 0.03, 0.28];
export const DEFAULT_DROP_ZONE_POSITION = [-0.32, 0, 0.22];

// Box half-height, matching PickableBox's default size (0.07/2) - the
// box rests with its center at this Y when sitting on the ground.
export const BOX_REST_HEIGHT = 0.035;

// How close the gripper's real world position must be to the box for
// closing the gripper to actually pick it up. Below this, the gripper
// closes but grabs nothing - a real "miss".
export const PICK_RADIUS = 0.14;

// Simple gravity constant (units/s^2) used to animate a released box
// falling to the ground, instead of freezing wherever it was released.
export const GRAVITY = 2.4;
