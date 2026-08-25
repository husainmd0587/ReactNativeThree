/**
 * robotPresets.js
 *
 * Data-driven robot definitions. The old procedural box/cylinder
 * presets (threeDofArmPreset, pickDropArmPreset) and their renderer
 * (scene/RobotRenderer.jsx) have been removed entirely, per request -
 * the module now renders the real GLB model via scene/GlbRobotArm.jsx
 * instead of fake geometry.
 *
 * The one preset here, industrialGlbArmPreset, is derived from the
 * actual GLB rig's joint config (core/glbRobotConfig.js) rather than
 * hand-authored - so the two can never drift apart. `links`/`base`/
 * `endEffector` from the old shape are gone; GlbRobotArm doesn't need
 * them (the real mesh geometry comes from the loaded model, not from
 * this definition).
 */

import { buildJointsFromGlbConfig, industrialRobotConfig, ROBOT_MODEL_URL } from './glbRobotConfig';

export const industrialGlbArmPreset = {
  id: 'industrial_glb_arm',
  name: 'Industrial Arm (GLB)',

  modelUrl: ROBOT_MODEL_URL,
  glbJointConfig: industrialRobotConfig,
  endEffectorJointName: 'J5',

  joints: buildJointsFromGlbConfig(industrialRobotConfig),
};

export const robotPresets = {
  industrial_glb_arm: industrialGlbArmPreset,
};

export function getRobotPreset(presetId) {
  return robotPresets[presetId] || robotPresets.industrial_glb_arm;
}
