/**
 * RobotState.js
 *
 * Plain-JS helpers for building and updating robot state.
 * This is intentionally framework-agnostic (no React, no Three.js) so it
 * can be reused by the engine, the provider, and later a program
 * interpreter without change.
 */

import {
  SIMULATION_MODES,
  GRIP_STATES,
  DEFAULT_BOX_START_POSITION,
  DEFAULT_DROP_ZONE_POSITION,
} from '../core/robotConstants';

/**
 * Builds the initial robot state from a robot definition (preset).
 * Shape:
 * {
 *   definition,        // static robot definition (joints/links/etc.)
 *   jointValues,        // { [jointId]: number } - current live values
 *   mode,                // one of SIMULATION_MODES
 *   selectedJointId,
 *   grip,                // one of GRIP_STATES
 *   box,                 // { position: [x,y,z], held: bool, velocityY: number } - pick/place demo object
 *   dropZonePosition,    // [x,y,z] - visual marker only, doesn't affect logic
 * }
 */
export function createInitialRobotState(definition) {
  const jointValues = {};
  definition.joints.forEach((joint) => {
    jointValues[joint.id] = joint.value || 0;
  });

  return {
    definition,
    jointValues,
    mode: SIMULATION_MODES.MANUAL,
    selectedJointId: definition.joints[0]?.id ?? null,
    grip: GRIP_STATES.OPEN,
    box: {
      position: DEFAULT_BOX_START_POSITION,
      held: false,
      velocityY: 0,
    },
    dropZonePosition: DEFAULT_DROP_ZONE_POSITION,
  };
}

/**
 * Returns a new state with a single joint value updated and clamped
 * to that joint's limits.
 */
export function setJointValue(state, jointId, value) {
  const joint = state.definition.joints.find((j) => j.id === jointId);
  if (!joint) return state;

  const clamped = clamp(value, joint.limits.min, joint.limits.max);

  return {
    ...state,
    jointValues: {
      ...state.jointValues,
      [jointId]: clamped,
    },
  };
}

/**
 * Same as setJointValue but for many joints at once (each still clamped
 * to its own limits) - used by the motion controller so a frame of
 * interpolation is one state update, not one per joint.
 */
export function setJointValues(state, values) {
  const jointValues = { ...state.jointValues };

  Object.entries(values).forEach(([jointId, value]) => {
    const joint = state.definition.joints.find((j) => j.id === jointId);
    if (!joint) return;
    jointValues[jointId] = clamp(value, joint.limits.min, joint.limits.max);
  });

  return { ...state, jointValues };
}

export function setMode(state, mode) {
  return { ...state, mode };
}

export function setSelectedJoint(state, jointId) {
  return { ...state, selectedJointId: jointId };
}

export function setGrip(state, grip) {
  return { ...state, grip };
}

export function setBoxHeld(state, held) {
  return { ...state, box: { ...state.box, held } };
}

export function setBoxPosition(state, position) {
  return { ...state, box: { ...state.box, position } };
}

export function setBoxVelocity(state, velocityY) {
  return { ...state, box: { ...state.box, velocityY } };
}

export function resetBox(state) {
  return {
    ...state,
    box: { position: DEFAULT_BOX_START_POSITION, held: false, velocityY: 0 },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
