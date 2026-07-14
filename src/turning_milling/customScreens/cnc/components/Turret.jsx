import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { TOOL_STATIONS, stationFromToolNumber } from '../toolLibrary';

const STATION_COUNT = TOOL_STATIONS.length; // 8

/**
 * Turret
 *
 * Lives in the same local space as CNCLatheSimulator/Chuck (local Y = part's axial
 * axis, X/Z = radius plane). Render as a sibling inside the same rotated scene
 * group. The turret disc lies flat in the X-Z plane (default CylinderGeometry
 * orientation - axis along Y), viewed face-on along the part's axial direction,
 * with tool stations arranged around it. Indexing rotates around local Y - the
 * SAME axis the station blocks are placed around (mirrors the jaw-placement
 * pattern in Chuck.jsx), so the animation always brings the right station to
 * the front.
 *
 * Props:
 *  - activeToolNumber: number, e.g. 101 for T0101 (matches telemetry.toolNumber's
 *    actual shape straight out of latheInterpreter.js - NOT a "T"-prefixed string).
 *    Station is derived as floor(toolNumber / 100), matching the real T-word
 *    convention (T0101 = station 1 offset 1, T0303 = station 3 offset 3, etc.)
 *  - stockConfig: used to position the turret AND to scale it proportionally
 *    (a real lathe turret is a substantial component, comparable in size to the
 *    chuck - a fixed small radius looked tiny next to anything but one specific
 *    stock size)
 *  - turretRadius, offsetX: override the auto-sized defaults if you want a
 *    specific look regardless of stock size
 */
export default function Turret({ activeToolNumber, stockConfig, turretRadius, offsetX }) {
  const groupRef = useRef();
  const targetAngleRef = useRef(0);

  const activeStation = stationFromToolNumber(activeToolNumber) || 1;

  const stockRadius = (stockConfig?.stockDiameter ?? 40) / 2;
  // Comparable scale to Chuck's 1.7x - a real turret is a substantial fixture,
  // not a small accessory. offsetX gives enough clearance so the (now bigger)
  // turret body never overlaps the stock: stockRadius + turretRadius + a gap.
  const resolvedTurretRadius = turretRadius ?? stockRadius * 1.4;
  const resolvedOffsetX = offsetX ?? stockRadius + resolvedTurretRadius + 8;

  // CylinderGeometry's vertex 0 sits at theta=0 (along local +Z), with vertices
  // spaced every 2PI/N - verified directly against THREE's actual output, not
  // assumed. That means a flat FACE's center sits at the MIDPOINT between two
  // consecutive vertices: (i + 0.5) * (2PI/N), not i * (2PI/N). Placing tool
  // blocks at i * (2PI/N) (the earlier version) put them on the seams between
  // faces instead of centered on each face - this is the fix.
  const stepAngle = (Math.PI * 2) / STATION_COUNT;
  const faceAngle = (i) => (i + 0.5) * stepAngle;
  // Distance from center to a flat face (apothem), not the circumscribed radius
  // CylinderGeometry itself uses - mounting at the circumscribed radius would
  // float the block outside the face instead of sitting flush against it.
  const apothem = resolvedTurretRadius * Math.cos(Math.PI / STATION_COUNT);

  targetAngleRef.current = -faceAngle(activeStation - 1);

  const zFace = stockConfig?.zFace ?? 0;
  const stockLength = stockConfig?.stockLength ?? 80;
  const turretY = zFace - stockLength * 0.35; // near the working zone, not buried at the chuck end
  const depth = resolvedTurretRadius * 0.9;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Smoothly ease toward the target index angle rather than snapping - reads
    // as a real turret "indexing" motion when the active tool changes.
    const current = groupRef.current.rotation.y;
    const target = targetAngleRef.current;
    let diff = target - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest path around the circle
    groupRef.current.rotation.y = current + diff * Math.min(1, delta * 4);
  });

  return (
    <group position={[resolvedOffsetX, turretY, 0]}>
      <group ref={groupRef}>
        {/* Turret body - octagonal drum, default CylinderGeometry axis (Y)
            already matches the part's axial direction, no extra rotation needed. */}
        <mesh>
          <cylinderGeometry args={[resolvedTurretRadius, resolvedTurretRadius, depth, STATION_COUNT]} />
          <meshStandardMaterial color="#33363c" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* Center hub cap */}
        <mesh position={[0, depth / 2 + 0.5, 0]}>
          <cylinderGeometry args={[resolvedTurretRadius * 0.25, resolvedTurretRadius * 0.25, 1, 24]} />
          <meshStandardMaterial color="#4a4e55" metalness={0.75} roughness={0.3} />
        </mesh>

        {TOOL_STATIONS.map((tool, i) => {
          const angle = faceAngle(i);
          const isActive = tool.station === activeStation;
          return (
            <group key={tool.station} rotation={[0, angle, 0]}>
              <mesh position={[0, depth / 2 + 1.2, apothem]}>
                <boxGeometry args={[resolvedTurretRadius * 0.5, 2.4, resolvedTurretRadius * 0.35]} />
                <meshStandardMaterial
                  color={isActive ? '#f5a524' : '#5a5e66'}
                  metalness={0.5}
                  roughness={0.4}
                  emissive={isActive ? '#5a3a00' : '#000000'}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
