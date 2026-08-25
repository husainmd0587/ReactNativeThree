/**
 * GlbRobotArm.jsx
 *
 * Replaces the old procedural box/cylinder RobotRenderer.jsx with the
 * real GLB model. This is fundamentally a different rendering
 * paradigm from the old one: RobotRenderer was declarative (React
 * props -> JSX transform tree, re-rendered by React on every state
 * change). The GLB model is controlled IMPERATIVELY via SceneModel's
 * ref API (ref.current.call('setJointAngle', ...)) - so this
 * component's job is to bridge RobotEngine's plain reactive state
 * (jointValues, grip) into imperative calls on that ref, rather than
 * expressing the robot's pose as JSX.
 *
 * Per-joint rotation reconstruction: RobotEngine only tracks a single
 * scalar per joint (matching every dialect's J1/J2/... semantics
 * unchanged). Each joint's full {x,y,z} rotation is reconstructed here
 * by taking its defaultPose and overriding just the active axis with
 * the live scalar - see core/glbRobotConfig.js for where axis/
 * defaultPose come from.
 *
 * Gripper: this rig's gripper is LINEAR (finger objects translate on
 * an axis), not rotational like the old procedural two-box gripper -
 * handled entirely by the relocated glbRobotController's
 * gripOpenAnimated/gripCloseAnimated, driven by our GRIP_STATES.
 *
 * End-effector world position/orientation: reported every frame via
 * onFrame, same contract RobotEngine.reportGripperWorldPosition
 * already expects - read directly off the J5 Object3D via
 * getWorldPosition/getWorldQuaternion, so the box lands exactly where
 * the real rig's wrist is, the same way the old procedural renderer
 * did it off its own Three.js group.
 *
 * autoFit is left ON (Scene's default): AutoFitCamera adjusts
 * whatever camera the enclosing screen's CanvaProvider set up to
 * frame the loaded model once, on load. This matters because this
 * model's real scale is unknown here (the CDN host is blocked by this
 * sandbox's network allowlist, so it couldn't be measured) - letting
 * the model self-fit avoids guessing a camPosition that might be
 * wildly wrong for whatever units the GLB was actually exported in.
 *
 * IMPORT PATH NOTE: Scene is the named export alongside the default
 * Model3DPreview in the same file (see the SceneModel.js source you
 * provided) - adjust this path if Scene isn't re-exported from
 * glbPreview.js in your actual project structure.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { Vector3, Quaternion } from 'three';
import { Scene } from '../../../../../utils/components/glbPreview';
import { createRobotController } from '../engine/glbRobotController';
import { GRIP_STATES } from '../core/robotConstants';

const GRIP_ANIMATION_MS = 300;

export function GlbRobotArm({ definition, jointValues, grip, onGripperFrame }) {
  const robotRef = useRef(null);
  const worldPos = useRef(new Vector3());
  const worldQuat = useRef(new Quaternion());
  const lastAppliedGrip = useRef(null);

  const glbJointConfig = definition.glbJointConfig;
  const controller = useMemo(() => createRobotController(glbJointConfig), [glbJointConfig]);

  // Push our engine's scalar joint values into the real rig every time
  // they change (manual drag, program-driven MOVEJ/HOME, etc). Safe to
  // call before the model/controller has finished loading - the
  // controller's api.call() no-ops with a warning until
  // registerMethods() has run, and this effect re-fires on the very
  // next jointValues change anyway (self-healing, no extra
  // ready-state plumbing needed).
  useEffect(() => {
    if (!robotRef.current) return;
    definition.joints.forEach((joint) => {
      const liveAngle = jointValues[joint.id] ?? joint.value ?? 0;
      const rotation = { ...joint.defaultPose, [joint.axis]: liveAngle };
      robotRef.current.call('setJointAngle', joint.id, rotation);
    });
  }, [jointValues, definition]);

  // Animate the linear gripper open/closed on grip state changes only
  // (not every render) - mirrors how the old procedural gripper only
  // reacted to actual OPEN<->CLOSED transitions.
  useEffect(() => {
    if (!robotRef.current || grip === lastAppliedGrip.current) return;
    lastAppliedGrip.current = grip;
    const method = grip === GRIP_STATES.CLOSED ? 'gripCloseAnimated' : 'gripOpenAnimated';
    robotRef.current.call(method, GRIP_ANIMATION_MS);
  }, [grip]);

  useFrame(() => {
    if (!onGripperFrame || !robotRef.current) return;
    const endJoint = robotRef.current.getJoint(definition.endEffectorJointName);
    if (!endJoint) return;
    endJoint.getWorldPosition(worldPos.current);
    endJoint.getWorldQuaternion(worldQuat.current);
    onGripperFrame(
      [worldPos.current.x, worldPos.current.y, worldPos.current.z],
      [worldQuat.current.x, worldQuat.current.y, worldQuat.current.z, worldQuat.current.w]
    );
  });

  return (
    <Scene
      ref={robotRef}
      modelUrl={definition.modelUrl}
      controller={controller}
      jointConfig={glbJointConfig}
    />
  );
}
