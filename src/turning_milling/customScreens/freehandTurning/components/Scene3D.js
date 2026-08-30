import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame as useR3FFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { useTextureLoader } from '../../../../utils/materials/textures';
import { PROFILE_SEGS, STOCK_RADIUS, BASE_RPM, WORLD_H, WORLD_R } from '../constants';

function PotteryMesh({ profile, mat, autoRotate, rpm }) {
  const ref = useRef();
  // `mat.id` is passed through so the texture actually tracks the
  // selected material -- verify the exact param key against
  // utils/materials/textures.js if your Textures entries are keyed
  // differently (e.g. `name` instead of `type`).
  const texture = useTextureLoader({ type: mat.id });

  useR3FFrame((_, dt) => {
    if (autoRotate && ref.current) {
      // Rotation speed tracks spindle RPM instead of a fixed rate.
      ref.current.rotation.y += dt * (rpm / BASE_RPM);
    }
  });

  const geo = useMemo(() => {
    const pts = [];
    pts.push(new THREE.Vector2(0, 0));
    for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
      const y = ((PROFILE_SEGS - 1 - i) / (PROFILE_SEGS - 1)) * WORLD_H;
      const r = Math.max(0.012, (profile[i] / STOCK_RADIUS) * WORLD_R);
      pts.push(new THREE.Vector2(r, y));
    }
    pts.push(new THREE.Vector2(0, WORLD_H));
    const g = new THREE.LatheGeometry(pts, 72);
    g.computeVertexNormals();
    return g;
  }, [profile]);

  useEffect(() => { return () => geo.dispose(); }, [geo]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(mat.color),
    map: texture ?? null,
    roughness: mat.roughness,
    metalness: mat.metalness,
    side: THREE.DoubleSide,
  }), [mat, texture]);

  useEffect(() => { return () => material.dispose(); }, [material]);

  return (
    <group ref={ref} position={[0, -WORLD_H / 2, 0]}>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

export function Scene3D({ profile, mat, autoRotate, rpm }) {
  return (
    <>
      <color attach="background" args={['#0a0a18']} />
      <ambientLight intensity={0.35} color="#ffe8d0" />
      <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow color="#ffffff" />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color="#a0c8ff" />
      <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffd0a0" distance={10} />
      <pointLight position={[0, -1, 4]} intensity={0.3} color="#ffffff" distance={6} />
      <PotteryMesh profile={profile} mat={mat} autoRotate={autoRotate} rpm={rpm} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -WORLD_H / 2, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#141428" roughness={1} />
      </mesh>
    </>
  );
}
