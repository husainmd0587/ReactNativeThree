/**
 * robotPresets.js
 *
 * Data-driven robot definitions. The renderer/engine consume this shape;
 * nothing here is Three.js-specific. Adding a 4th, 5th, 6th joint later
 * only means adding entries to `joints` / `links` - no code changes.
 */

import { JOINT_TYPES } from './robotConstants';

export const threeDofArmPreset = {
  id: 'three_dof_arm',
  name: 'Three DOF Arm',

  base: {
    id: 'base',
    position: [0, 0, 0],
  },

  joints: [
    {
      id: 'joint-1',
      name: 'Base Rotate',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'base',
      childId: 'link-1',
      axis: [0, 1, 0],
      position: [0, 0.2, 0],
      limits: { min: -180, max: 180 },
      value: 0,
    },
    {
      id: 'joint-2',
      name: 'Shoulder',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'link-1',
      childId: 'link-2',
      axis: [0, 0, 1],
      position: [0, 0.4, 0],
      limits: { min: -90, max: 90 },
      value: 0,
    },
    {
      id: 'joint-3',
      name: 'Elbow',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'link-2',
      childId: 'end-effector',
      axis: [0, 0, 1],
      position: [0, 0.6, 0],
      limits: { min: -120, max: 120 },
      value: 0,
    },
  ],

  links: [
    {
      id: 'link-1',
      name: 'Base Link',
      parentJointId: 'joint-1',
      length: 0.4,
      geometry: { type: 'cylinder', radius: 0.12, height: 0.4 },
      color: '#4a72b0',
    },
    {
      id: 'link-2',
      name: 'Upper Arm',
      parentJointId: 'joint-2',
      length: 0.6,
      geometry: { type: 'box', width: 0.15, height: 0.6, depth: 0.15 },
      color: '#5b8dd6',
    },
  ],

  endEffector: {
    id: 'end-effector',
    name: 'Gripper',
    type: 'gripper',
    attachedJointId: 'joint-3',
  },
};

/**
 * A more realistic pick-and-place industrial arm: base rotate, shoulder,
 * elbow (with an actual forearm segment - the earlier 3-DOF preset had
 * none, which is why rotating the elbow was invisible), a wrist, and a
 * two-finger gripper that opens/closes with the engine's `grip` state.
 * Styled orange/dark to read as an industrial arm (see reference image).
 */
export const pickDropArmPreset = {
  id: 'pick_drop_arm',
  name: 'Pick & Drop Arm',

  base: {
    id: 'base',
    position: [0, 0, 0],
  },

  joints: [
    {
      id: 'joint-1',
      name: 'Base Rotate',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'base',
      childId: 'link-1',
      axis: [0, 1, 0],
      position: [0, 0.15, 0],
      limits: { min: -180, max: 180 },
      value: 0,
    },
    {
      id: 'joint-2',
      name: 'Shoulder',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'link-1',
      childId: 'link-2',
      axis: [0, 0, 1],
      position: [0, 0.15, 0],
      limits: { min: -90, max: 90 },
      value: -20,
    },
    {
      id: 'joint-3',
      name: 'Elbow',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'link-2',
      childId: 'link-3',
      axis: [0, 0, 1],
      position: [0, 0.5, 0],
      limits: { min: -150, max: 20 },
      value: 40,
    },
    {
      id: 'joint-4',
      name: 'Wrist',
      type: JOINT_TYPES.REVOLUTE,
      parentId: 'link-3',
      childId: 'end-effector',
      axis: [0, 0, 1],
      position: [0, 0.38, 0],
      limits: { min: -100, max: 100 },
      value: 0,
    },
  ],

  links: [
    {
      id: 'link-1',
      name: 'Base Pedestal',
      parentJointId: 'joint-1',
      length: 0.15,
      geometry: { type: 'cylinder', radius: 0.16, height: 0.15 },
      color: '#2c2c2c',
    },
    {
      id: 'link-2',
      name: 'Upper Arm',
      parentJointId: 'joint-2',
      length: 0.5,
      geometry: { type: 'box', width: 0.14, height: 0.5, depth: 0.14 },
      color: '#e8791a',
    },
    {
      id: 'link-3',
      name: 'Forearm',
      parentJointId: 'joint-3',
      length: 0.38,
      geometry: { type: 'box', width: 0.1, height: 0.38, depth: 0.1 },
      color: '#e8791a',
    },
    {
      id: 'link-4',
      name: 'Wrist Link',
      parentJointId: 'joint-4',
      length: 0.16,
      geometry: { type: 'cylinder', radius: 0.06, height: 0.16 },
      color: '#3a3a3a',
    },
  ],

  endEffector: {
    id: 'end-effector',
    name: 'Gripper',
    type: 'gripper',
    attachedJointId: 'joint-4',
  },
};

export const robotPresets = {
  three_dof_arm: threeDofArmPreset,
  pick_drop_arm: pickDropArmPreset,
};

export function getRobotPreset(presetId) {
  return robotPresets[presetId] || null;
}
