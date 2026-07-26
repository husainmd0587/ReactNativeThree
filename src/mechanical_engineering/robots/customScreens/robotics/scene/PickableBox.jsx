/**
 * PickableBox.jsx
 *
 * The small box the robot picks up and moves, plus a flat ring marking
 * the suggested drop zone. Both are purely visual - there's no
 * physics/collision here yet, just meshes positioned by state.
 */

import React from 'react';

const BOX_SIZE = 0.07;
const BOX_COLOR = '#f2c14e';

export function PickableBox({ position = [0, 0, 0], size = BOX_SIZE, color = BOX_COLOR }) {
  return (
    <mesh position={position}>
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
