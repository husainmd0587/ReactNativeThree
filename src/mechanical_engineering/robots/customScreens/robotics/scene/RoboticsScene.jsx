/**
 * RoboticsScene.jsx
 *
 * Scene *content* only - the robot itself, the pickable box, a small
 * ground plane, and the per-frame simulation driver. Grid, axis
 * labels, camera, and lighting are already provided by the existing
 * shared CanvaProvider - this component doesn't duplicate them, it's
 * just what gets passed as CanvaProvider's children.
 *
 * The box is now ALWAYS rendered here (no more `!box.held` check) -
 * with the real GLB model, there's no JSX tree to nest the box inside
 * when held, so instead RobotEngine keeps box.position/box.quaternion
 * synced to the gripper's real transform every tick while held (see
 * RobotEngine._tick). The box just always renders at whatever
 * position/quaternion the engine currently reports.
 *
 * `onFrame`, if provided, is called every render frame with the delta
 * time (seconds) via R3F's useFrame - this is how RobotEngine.update()
 * gets driven without the engine itself needing to know about
 * Three.js/R3F.
 */

import React from 'react';
import { useFrame } from '@react-three/fiber/native';
import { GlbRobotArm } from './GlbRobotArm';
import { PickableBox, DropZoneMarker } from './PickableBox';

function SimulationLoop({ onFrame }) {
  useFrame((_, delta) => {
    if (typeof onFrame === 'function') {
      onFrame(delta);
    }
  });
  return null;
}

function Ground({ size = 2 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#2a2f3a" />
    </mesh>
  );
}

export function RoboticsScene({
  definition,
  jointValues,
  grip,
  box,
  dropZonePosition,
  showGround = true,
  onFrame,
  onGripperFrame,
}) {
  return (
    <group>
      <SimulationLoop onFrame={onFrame} />
      {showGround && <Ground />}

      {dropZonePosition && <DropZoneMarker position={dropZonePosition} />}
      {box && <PickableBox position={box.position} quaternion={box.quaternion} />}

      <GlbRobotArm
        definition={definition}
        jointValues={jointValues}
        grip={grip}
        onGripperFrame={onGripperFrame}
      />
    </group>
  );
}
