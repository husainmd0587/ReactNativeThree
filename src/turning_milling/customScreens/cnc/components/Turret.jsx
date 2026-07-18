import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { TOOL_STATIONS, stationFromToolNumber } from '../toolLibrary';

const STATION_COUNT = TOOL_STATIONS.length; // 8

/**
 * Turret
 *
 * Lives in the same local space as CNCLatheSimulator/Chuck (local Y = part's axial
 * axis, X/Z = radius plane). Render as a sibling of ToolBit INSIDE
 * CNCLatheSimulator's own returned group (not from a parent screen) - it needs
 * `pass`/`progressRef` for live position tracking, which only exist there.
 *
 * POSITION: previously used a fixed offset along local X, which - after the
 * scene's -90deg-about-Z rotation - maps to a large world-Y displacement (verified
 * numerically: offsetX ~58 became worldY ~-58, while the stock/chuck occupy
 * worldY in roughly [-21,21]). That's why it rendered floating far away,
 * disconnected from everything else, and never appeared to track the tool.
 * Fixed by tracking the ACTUAL live tool-tip position (same interpolation
 * ToolBit.jsx uses) and standing off further out along the same radial line -
 * the turret now moves WITH the cutting action, the way it holds the tool in
 * reality, instead of sitting at an unrelated static point.
 *
 * Indexing (which station faces "front") rotates around local Y - the SAME axis
 * the station blocks are placed around (mirrors the jaw-placement pattern in
 * Chuck.jsx), so the animation always brings the right station to the front.
 *
 * Props:
 *  - activeToolNumber: number, e.g. 101 for T0101 (matches telemetry.toolNumber's
 *    actual shape straight out of latheInterpreter.js - NOT a "T"-prefixed string)
 *  - stockConfig: used to scale the turret proportionally to the stock (a real
 *    turret is a substantial fixture, not a small accessory)
 *  - pass, progressRef: SAME props as ToolBit - the active pass and 0..1 sweep
 *    progress, used to compute the live tool-tip position to stand off from.
 *    If the current pass has no cutting moves (e.g. a G184 radial-drill pass),
 *    the turret just holds its last known position rather than jumping.
 *  - turretRadius, standoff: override the auto-sized defaults if needed
 */
export default function Turret({ activeToolNumber, stockConfig, pass, progressRef, turretRadius, standoff = 10 }) {
  const groupRef = useRef(); // indexing rotation
  const outerGroupRef = useRef(); // live position
  const targetAngleRef = useRef(0);
  const lastPositionRef = useRef({ r: 12, z: 0 }); // sensible starting guess before any move data arrives

  const activeStation = stationFromToolNumber(activeToolNumber) || 1;

  const stockRadius = (stockConfig?.stockDiameter ?? 40) / 2;
  const resolvedTurretRadius = turretRadius ?? stockRadius * 1.4;
  const depth = resolvedTurretRadius * 0.9;

  // CylinderGeometry's vertex 0 sits at theta=0 (along local +Z), with vertices
  // spaced every 2PI/N - verified directly against THREE's actual output. A flat
  // FACE's center sits at the MIDPOINT between two consecutive vertices,
  // (i + 0.5) * (2PI/N), not i * (2PI/N).
  const stepAngle = (Math.PI * 2) / STATION_COUNT;
  const faceAngle = (i) => (i + 0.5) * stepAngle;
  const apothem = resolvedTurretRadius * Math.cos(Math.PI / STATION_COUNT);

  targetAngleRef.current = -faceAngle(activeStation - 1);

  // Same live tool-tip interpolation as ToolBit.jsx.
  const cuttingMoves = (pass?.moves ?? []).filter((m) => m.isCutting);
  const cumRef = useRef([]);
  if (cuttingMoves.length && cumRef.current.length !== cuttingMoves.length) {
    let acc = 0;
    cumRef.current = cuttingMoves.map((m) => {
      acc += Math.hypot((m.to.x - m.from.x) / 2, m.to.z - m.from.z);
      return acc;
    });
  }
  const totalLenRef = useRef(1);
  totalLenRef.current = cumRef.current.at(-1) || 1;

  useFrame((_, delta) => {
    if (!groupRef.current || !outerGroupRef.current) return;

    // Indexing rotation - unchanged logic, eases toward the active station.
    const current = groupRef.current.rotation.y;
    const target = targetAngleRef.current;
    let diff = target - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest path around the circle
    groupRef.current.rotation.y = current + diff * Math.min(1, delta * 4);

    // Live position: follow the tool tip if this pass has cutting moves,
    // otherwise hold the last known position (e.g. during a G184 pass, which
    // doesn't move the X/Z carriage - see latheInterpreter.js).
    if (progressRef && cuttingMoves.length) {
      const t = Math.max(0, Math.min(1, progressRef.current));
      const targetDist = t * totalLenRef.current;
      let idx = cumRef.current.findIndex((c) => c >= targetDist);
      if (idx === -1) idx = cuttingMoves.length - 1;
      const mv = cuttingMoves[idx];
      const segStart = idx > 0 ? cumRef.current[idx - 1] : 0;
      const segLen = cumRef.current[idx] - segStart || 1;
      const segT = Math.max(0, Math.min(1, (targetDist - segStart) / segLen));
      const r = mv.from.x / 2 + ((mv.to.x - mv.from.x) / 2) * segT;
      const z = mv.from.z + (mv.to.z - mv.from.z) * segT;
      lastPositionRef.current = { r, z };
    }

    const standoffRadius = lastPositionRef.current.r + resolvedTurretRadius + standoff;
    outerGroupRef.current.position.set(standoffRadius, lastPositionRef.current.z, 0);
  });

  return (
    <group ref={outerGroupRef}>
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
