import React from 'react';

/**
 * AxisGizmo
 *
 * Small always-visible X+/Z+ direction indicator, standard CAD/CNC color
 * convention (X=red, Z=blue) so it's readable without needing text labels
 * (kept deliberately text-free - no verified text-rendering library like drei's
 * <Text> in this project, and billboarded HTML labels are non-trivial in RN).
 *
 * Lives in the same local space as CNCLatheSimulator (local Y = part's axial
 * "Z" axis, local X = radius/"X" axis) - render as a sibling inside the same
 * rotated scene group.
 *
 * Props:
 *  - origin: [x, y, z] position for the gizmo (default near the stock face)
 *  - length: arrow length
 */
export default function AxisGizmo({ origin = [0, 0, 0], length = 18 }) {
  const shaftRadius = length * 0.03;
  const headLength = length * 0.25;
  const headRadius = shaftRadius * 2.2;

  return (
    <group position={origin}>
      {/* X+ arrow (radius direction, local X) - red */}
      <group rotation={[0, 0, -Math.PI / 2]}>
        <Arrow length={length} shaftRadius={shaftRadius} headLength={headLength} headRadius={headRadius} color="#e5484d" />
      </group>

      {/* Z+ arrow (axial direction, local Y) - blue */}
      <Arrow length={length} shaftRadius={shaftRadius} headLength={headLength} headRadius={headRadius} color="#3b82f6" />
    </group>
  );
}

/** A single arrow pointing along local +Y, built from a cylinder shaft + cone head. */
function Arrow({ length, shaftRadius, headLength, headRadius, color }) {
  const shaftLength = length - headLength;
  return (
    <group>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shaftLength + headLength / 2, 0]}>
        <coneGeometry args={[headRadius, headLength, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
