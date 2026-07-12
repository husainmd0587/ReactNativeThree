import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const COUNT = 24;
const GRAVITY = -180;

/**
 * Cheap spark burst rendered at the active tool tip. Uses a single InstancedMesh
 * (one draw call) with per-particle position/velocity/life tracked in plain arrays -
 * no physics library, safe for mobile.
 */
export default function Sparks({ active, pass, progressRef, color = '#ffb020' }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useRef(
    Array.from({ length: COUNT }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 }))
  );
  const spawnCursor = useRef(0);
  const spawnAccum = useRef(0);

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
    if (!meshRef.current) return;
    const list = particles.current;

    // Find current tool tip position (same interpolation ToolBit uses).
    let tipX = 0;
    let tipY = 0;
    if (active && cuttingMoves.length) {
      const t = Math.max(0, Math.min(1, progressRef.current));
      const target = t * totalLenRef.current;
      let idx = cumRef.current.findIndex((c) => c >= target);
      if (idx === -1) idx = cuttingMoves.length - 1;
      const mv = cuttingMoves[idx];
      const segStart = idx > 0 ? cumRef.current[idx - 1] : 0;
      const segLen = cumRef.current[idx] - segStart || 1;
      const segT = Math.max(0, Math.min(1, (target - segStart) / segLen));
      tipX = mv.from.x / 2 + ((mv.to.x - mv.from.x) / 2) * segT;
      tipY = mv.from.z + (mv.to.z - mv.from.z) * segT;

      // Spawn a few sparks per second while cutting.
      spawnAccum.current += delta;
      const spawnInterval = 0.02;
      while (spawnAccum.current > spawnInterval) {
        spawnAccum.current -= spawnInterval;
        const p = list[spawnCursor.current];
        spawnCursor.current = (spawnCursor.current + 1) % COUNT;
        p.x = tipX + 0.6;
        p.y = tipY;
        p.z = 0;
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + Math.random() * 14;
        p.vx = Math.cos(angle) * speed * 0.3 + 6;
        p.vy = Math.sin(angle) * speed * 0.3;
        p.vz = (Math.random() - 0.5) * speed * 0.4;
        p.maxLife = 0.25 + Math.random() * 0.25;
        p.life = p.maxLife;
      }
    }

    for (let i = 0; i < COUNT; i++) {
      const p = list[i];
      if (p.life <= 0) {
        dummy.position.set(9999, 9999, 9999);
        dummy.scale.setScalar(0.0001);
      } else {
        p.life -= delta;
        p.vy += GRAVITY * delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        const lifeT = Math.max(0, p.life / p.maxLife);
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(0.25 * lifeT);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}
