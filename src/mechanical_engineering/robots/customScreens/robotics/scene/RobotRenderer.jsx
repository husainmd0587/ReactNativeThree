/**
 * RobotRenderer.jsx
 *
 * Renders a robot from its data definition + live joint values.
 *
 * This phase does NOT implement a real Forward Kinematics engine yet.
 * Instead each joint is rendered as a nested <group> that rotates
 * around its own axis and offsets by its declared `position`, with the
 * next joint/link nested inside it - a stacked local-transform chain.
 * IMPORTANT: `joint.position` is the joint's full local offset from its
 * PARENT joint's origin (i.e. it already accounts for standing on top
 * of the parent's link) - do not add another link-length translation
 * on top of it, or every joint down the chain gets offset twice.
 * This is enough to visually verify the robot structure end-to-end;
 * KinematicsEngine will later replace the transform math without
 * changing this component's props/shape.
 *
 * Props:
 *   definition  - robot definition (see core/robotPresets.js)
 *   jointValues - { [jointId]: number } current joint angles (degrees)
 *   grip        - 'open' | 'closed' (see core/robotConstants GRIP_STATES),
 *                 drives how far the gripper's two fingers are spread
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { Vector3 } from 'three';
import { PickableBox } from './PickableBox';

const DEG2RAD = Math.PI / 180;
const JOINT_HUB_COLOR = '#1c1c1c';
const GRIPPER_COLOR = '#2c2c2c';

function findLinkForJoint(definition, jointId) {
  return definition.links.find((link) => link.parentJointId === jointId) || null;
}

function findChildJoint(definition, joint) {
  return definition.joints.find((j) => j.parentId === joint.childId) || null;
}

function LinkMesh({ link }) {
  if (!link) return null;
  const { geometry, color = '#888888' } = link;

  if (geometry?.type === 'cylinder') {
    return (
      <mesh position={[0, (geometry.height ?? 0.4) / 2, 0]}>
        <cylinderGeometry args={[geometry.radius ?? 0.1, geometry.radius ?? 0.1, geometry.height ?? 0.4, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
    );
  }

  // default: box
  return (
    <mesh position={[0, (geometry?.height ?? 0.4) / 2, 0]}>
      <boxGeometry args={[geometry?.width ?? 0.15, geometry?.height ?? 0.4, geometry?.depth ?? 0.15]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
    </mesh>
  );
}

/** Small dark sphere marking a joint's pivot point, like a real actuator housing. */
function JointHub({ radius = 0.07 }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={JOINT_HUB_COLOR} roughness={0.4} metalness={0.4} />
    </mesh>
  );
}

/** Two-finger gripper. Fingers translate apart when grip === 'open'. */
function GripperMesh({ grip = 'open' }) {
  const spread = grip === 'open' ? 0.05 : 0.012;
  const fingerSize = [0.02, 0.12, 0.03];

  return (
    <group>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.06]} />
        <meshStandardMaterial color={GRIPPER_COLOR} roughness={0.4} metalness={0.3} />
      </mesh>

      <mesh position={[-spread, 0.06, 0]}>
        <boxGeometry args={fingerSize} />
        <meshStandardMaterial color={GRIPPER_COLOR} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[spread, 0.06, 0]}>
        <boxGeometry args={fingerSize} />
        <meshStandardMaterial color={GRIPPER_COLOR} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Wraps the gripper mesh in a ref so its real rendered world position
 * can be read each frame (via Object3D.getWorldPosition) and reported
 * back to the engine - this is what lets a dropped box land exactly
 * where the gripper visually is, without needing a real IK solve.
 * When `heldBox` is true, the box is rendered as a child here too, so
 * it inherits every parent transform (rides along with the arm) for
 * free.
 */
function GripperAssembly({ grip, heldBox, onGripperFrame }) {
  const groupRef = useRef(null);
  const worldPos = useRef(new Vector3());

  useFrame(() => {
    if (!onGripperFrame || !groupRef.current) return;
    groupRef.current.getWorldPosition(worldPos.current);
    onGripperFrame([worldPos.current.x, worldPos.current.y, worldPos.current.z]);
  });

  return (
    <group ref={groupRef}>
      <GripperMesh grip={grip} />
      {heldBox && <PickableBox position={[0, 0.06, 0]} />}
    </group>
  );
}

/**
 * Renders one joint and everything downstream of it (its link, its
 * child joint, recursively), assuming a simple serial chain.
 */
function JointNode({ definition, joint, jointValues, endEffectorJointId, grip, heldBox, onGripperFrame }) {
  const angleDeg = jointValues[joint.id] ?? joint.value ?? 0;
  const rotation = joint.axis.map((a) => a * angleDeg * DEG2RAD);

  const link = findLinkForJoint(definition, joint.id);
  const childJoint = findChildJoint(definition, joint);
  const isEndEffectorJoint = joint.id === endEffectorJointId;

  return (
    <group position={joint.position} rotation={rotation}>
      <JointHub />
      <LinkMesh link={link} />

      {isEndEffectorJoint && (
        <group position={[0, link?.length ?? 0, 0]}>
          <GripperAssembly grip={grip} heldBox={heldBox} onGripperFrame={onGripperFrame} />
        </group>
      )}

      {childJoint && (
        <JointNode
          definition={definition}
          joint={childJoint}
          jointValues={jointValues}
          endEffectorJointId={endEffectorJointId}
          grip={grip}
          heldBox={heldBox}
          onGripperFrame={onGripperFrame}
        />
      )}
    </group>
  );
}

export function RobotRenderer({ definition, jointValues, grip, heldBox, onGripperFrame }) {
  if (!definition) return null;

  const rootJoint = definition.joints.find((j) => j.parentId === definition.base.id);
  const endEffectorJointId = definition.endEffector?.attachedJointId ?? null;

  if (!rootJoint) return null;

  return (
    <group position={definition.base.position ?? [0, 0, 0]}>
      <JointNode
        definition={definition}
        joint={rootJoint}
        jointValues={jointValues}
        endEffectorJointId={endEffectorJointId}
        grip={grip}
        heldBox={heldBox}
        onGripperFrame={onGripperFrame}
      />
    </group>
  );
}
