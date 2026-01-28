import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';

/**
 * Initialize chip pool
 */
export const createChipPool = (count = 50) => {
  return Array.from({ length: count }, () => ({
    visible: false,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    life: 0,
  }));
};

/**
 * Spawn a chip
 */
export const spawnChip = (chips, pos) => {
  const chip = chips.find(c => !c.visible);
  if (!chip) return;

  chip.visible = true;
  chip.position.x = pos.x;
  chip.position.y = pos.y;
  chip.position.z = pos.z;

  chip.velocity.x = Math.random() * 0.05;
  chip.velocity.y = Math.random() * 0.05;
  chip.velocity.z = (Math.random() - 0.5) * 0.05;
  chip.life = 60;
};

/**
 * Update chips per frame
 */
export function updateChips(chips) {
  chips.forEach(chip => {
    if (!chip.visible) return;

    chip.position.x += chip.velocity.x;
    chip.position.y += chip.velocity.y;
    chip.position.z += chip.velocity.z;

    chip.life -= 1;

    if (chip.life <= 0) {
      chip.visible = false;
    }
  });
}


export default function Chips({position}) {
  const meshRefs = useRef([]);
  const chips = useRef(createChipPool(50));
  const frameCount = useRef(0);

  useFrame(() => {
    // emit chips
    frameCount.current++;
    if (frameCount.current % 3 === 0) {
      spawnChip(chips.current, {
        x: 0,
        y: 0,
        z: 0,
      });
    }
    updateChips(chips.current);
    chips.current.forEach((chip, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      mesh.visible = chip.visible;
      mesh.position.set(
        chip.position.x,
        chip.position.y,
        chip.position.z
      );
    });
  });

  return (
    <group position={position}>
      {chips.current.map((_, i) => (
        <mesh
          key={i}
          ref={el => (meshRefs.current[i] = el)}
          visible={false}
        >
          <boxGeometry args={[0.05, 0.06, 0.01]} />
          <meshStandardMaterial  color="#9ca3af" metalness={0.75}  roughness={0.25}   envMapIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}