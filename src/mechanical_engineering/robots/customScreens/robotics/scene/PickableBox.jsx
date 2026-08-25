/**
 * PickableBox.jsx
 *
 * The small box the robot picks up and moves, plus a flat ring marking
 * the suggested drop zone. Both are purely visual - there's no
 * physics/collision here yet, just meshes positioned by state.
 *
 * `quaternion` is optional - RobotEngine keeps it synced to the real
 * gripper's orientation while the box is held (see RobotEngine._tick),
 * so the box also rotates with the wrist, not just translates with it.
 */

import React from 'react';

const BOX_SIZE = 0.07;
const BOX_COLOR = '#f2c14e';
const IDENTITY_QUATERNION = [0, 0, 0, 1];

export function PickableBox({
  position = [0, 0, 0],
  quaternion = IDENTITY_QUATERNION,
  size = BOX_SIZE,
  color = BOX_COLOR,
}) {
  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

export function DropZoneMarker({ position = [0, 0, 0], radius = 0.09, color = '#4ade80' }) {
  return (
    <mesh position={[position[0], 0.002, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.7, radius, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} side={2} />
    </mesh>
  );
}
