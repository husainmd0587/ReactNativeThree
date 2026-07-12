import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

/**
 * Walks along a pass's cutting-move polyline as `progressRef.current` goes 0->1.
 * Position is in the SAME local space as the lathe group (x = radius axis, y = our
 * part's Z / axial axis) so it sits directly on the part surface being cut.
 */
export default function ToolBit({ pass, progressRef, color = '#ffb020' }) {
  const groupRef = useRef();

  const cuttingMoves = (pass?.moves ?? []).filter((m) => m.isCutting);
  const totalLen = useRef(0);
  const cum = useRef([]);

  if (cuttingMoves.length && cum.current.length !== cuttingMoves.length) {
    let acc = 0;
    cum.current = cuttingMoves.map((m) => {
      const len = Math.hypot((m.to.x - m.from.x) / 2, m.to.z - m.from.z);
      acc += len;
      return acc;
    });
    totalLen.current = acc || 1;
  }

  useFrame(() => {
    if (!groupRef.current || cuttingMoves.length === 0) return;
    const t = Math.max(0, Math.min(1, progressRef.current));
    const target = t * totalLen.current;
    let idx = cum.current.findIndex((c) => c >= target);
    if (idx === -1) idx = cuttingMoves.length - 1;
    const mv = cuttingMoves[idx];
    const segStart = idx > 0 ? cum.current[idx - 1] : 0;
    const segLen = cum.current[idx] - segStart || 1;
    const segT = Math.max(0, Math.min(1, (target - segStart) / segLen));

    const r = (mv.from.x / 2) + ((mv.to.x - mv.from.x) / 2) * segT;
    const z = mv.from.z + (mv.to.z - mv.from.z) * segT;

    groupRef.current.position.set(r, z, 0);
  });

  if (cuttingMoves.length === 0) return null;

  return (
    <group ref={groupRef}>
      {/* Insert tip */}
      <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Tool holder shank pointing away from the work */}
      <mesh position={[3.5, 0, 0]}>
        <boxGeometry args={[6, 2, 2]} />
        <meshStandardMaterial color="#2b2f36" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
