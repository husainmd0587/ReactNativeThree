/**
 * glbRobotConfig.js
 *
 * The real robot's joint configuration - relocated verbatim from the
 * mannualRobot/robot/robotConfig.js you provided (industrialRobotConfig),
 * since it's exactly what Scene/robotController expect as `jointConfig`.
 * Kept as the single source of truth: buildPresetFromGlbConfig() below
 * derives our internal RobotDefinition shape (joints/limits/defaults)
 * from THIS object, so the two never drift apart.
 *
 * IMPORTANT - home pose is not all-zero: J3's rest angle on its active
 * axis is 180°, J4 is 90°, J5 is 120° (Blender bind-pose). Each joint's
 * `default` therefore doubles as this simulator's "home" scalar value
 * for that joint - see buildPresetFromGlbConfig's `value` field below,
 * and RobotEngine's HOME instruction, which now targets each joint's
 * own configured default instead of a blanket 0.
 */

import { JOINT_TYPES } from './robotConstants';

export const ROBOT_MODEL_URL =
  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/robotics/robotTeaching/industrialRobotArm2.glb';

export const industrialRobotConfig = {
  J1: {
    object: 'J1',
    type: 'rotation',
    axes: { x: false, y: true, z: false },
    limit: { x: [-180, 180], y: [-180, 180], z: [-180, 180] },
    default: { x: 0, y: 0, z: 0 },
  },
  J2: {
    object: 'J2',
    type: 'rotation',
    axes: { x: true, y: false, z: false },
    limit: { x: [-90, 90], y: [-90, 90], z: [-180, 180] },
    default: { x: 0, y: 0, z: 0 },
  },
  J3: {
    object: 'J3',
    type: 'rotation',
    axes: { x: true, y: false, z: false },
    limit: { x: [-120, 180], y: [-120, 120], z: [-180, 180] },
    default: { x: 180, y: 0, z: 0 },
  },
  J4: {
    object: 'J4',
    type: 'rotation',
    axes: { x: true, y: false, z: false },
    limit: { x: [-30, 180], y: [-180, 180], z: [-180, 180] },
    default: { x: 90, y: 0, z: 0 },
  },
  J5: {
    object: 'J5',
    type: 'rotation',
    axes: { x: true, y: false, z: false },
    limit: { x: [-180, 180], y: [-120, 120], z: [-180, 180] },
    default: { x: 120, y: 0, z: 90 },
  },

  GRIPPER: {
    type: 'gripper',
    movementType: 'linear',
    open: {
      left: { object: 'Grabber_hand_1', axis: 'x', value: -0.05 },
      right: { object: 'Grabber_hand_2', axis: 'x', value: 0.05 },
    },
    closed: {
      left: { object: 'Grabber_hand_1', axis: 'x', value: -0.015 },
      right: { object: 'Grabber_hand_2', axis: 'x', value: 0.015 },
    },
  },
};

const JOINT_NAMES = ['J1', 'J2', 'J3', 'J4', 'J5'];

const JOINT_LABELS = {
  J1: 'Base Rotate',
  J2: 'Shoulder',
  J3: 'Elbow',
  J4: 'Wrist Pitch',
  J5: 'Wrist Roll',
};

/**
 * Derives a RobotDefinition-shaped object (joints array with id, name,
 * axis, limits, defaultPose, value) from the raw GLB joint config, so
 * the rest of the engine (MotionController, ProgramInterpreter,
 * RobotState) can keep working with simple per-joint scalars exactly
 * like before - only the render bridge (GlbRobotArm) needs to know
 * about axis/defaultPose to reconstruct the full {x,y,z} rotation.
 *
 * Joint ids are the literal GLB object names ("J1", "J2", ...) - this
 * makes the dialect parsers' J1/J2/... mapping (buildJointNameMap in
 * ProgramInterpreter.js) land on exactly the right object with zero
 * translation layer.
 */
export function buildJointsFromGlbConfig(config = industrialRobotConfig) {
  return JOINT_NAMES.filter((name) => config[name]).map((name) => {
    const cfg = config[name];
    const axis = Object.keys(cfg.axes || {}).find((key) => cfg.axes[key]) || 'x';
    const limits = cfg.limit?.[axis] || [-180, 180];
    const defaultPose = { x: cfg.default?.x ?? 0, y: cfg.default?.y ?? 0, z: cfg.default?.z ?? 0 };

    return {
      id: name,
      name: JOINT_LABELS[name] || name,
      type: JOINT_TYPES.REVOLUTE,
      axis,
      limits: { min: limits[0], max: limits[1] },
      defaultPose,
      // The joint's scalar "value" is its default on the ACTIVE axis -
      // this becomes both the initial pose and the HOME target, since
      // for this rig 0 is not a meaningful rest position for every
      // joint (see J3/J4/J5 above).
      value: defaultPose[axis],
    };
  });
}
