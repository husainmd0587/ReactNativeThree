import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';


export function createSegmentedBar({
  segments = 24,
  radius = 2,
  height = 0.2,
  depth = 0.4,
  active = 12,
  activeColor = '#00ff88',
  inactiveColor = '#333333',
  altActiveColor = '#00ccff', // for odd/even
} = {}) {
  const group = new THREE.Group();

  const angleStep = (Math.PI * 2) / segments;

  const geometry = new THREE.BoxGeometry(
    0.4, // segment width
    height,
    depth
  );

  for (let i = 0; i < segments; i++) {
    const material = new THREE.MeshStandardMaterial({
      color:
        i < active
          ? i % 2
            ? activeColor
            : altActiveColor
          : inactiveColor,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const angle = i * angleStep;

    // circular placement
    mesh.position.set(
      Math.cos(angle) * radius,
      3.2,
      Math.sin(angle) * radius
    );

    // rotate to face outward
    mesh.rotation.y = -angle;

    mesh.userData.index = i;
    group.add(mesh);
  }

  // 🔄 update active segments
  group.setActive = (count) => {
    group.children.forEach((child, i) => {
      child.material.color.set(
        i < count
          ? i % 2
            ? activeColor
            : altActiveColor
          : inactiveColor
      );
    });
  };

  return group;
}



export function SegmentedBar({
  value = 0.5,
  segments = 24,
}) {
  const bar = useMemo(() => {
    return createSegmentedBar({
      segments,
      active: Math.round(value * segments),
    });
  }, []);

  useFrame((_, delta) => {
    bar.setActive(Math.round(value * segments));
      bar.rotation.y += delta; // smooth spin
  });

  return <primitive object={bar} />;
}


///Round Bar


export function createRoundSegmentedBar({
  segments = 24,
  radius = 2,
  segmentWidth = 0.35,
  height = 0.2,
  depth = 0.45,
  active = 12,
  activeColor = '#00ff88',
  altActiveColor = '#00ccff',
  inactiveColor = '#333333',
  y = 0,
} = {}) {
  const group = new THREE.Group();

  const angleStep = (Math.PI * 2) / segments;

  const geometry = new THREE.BoxGeometry(
    segmentWidth,
    height,
    depth
  );

  for (let i = 0; i < segments; i++) {
    const material = new THREE.MeshStandardMaterial({
      color:
        i < active
          ? i % 2 === 0
            ? activeColor
            : altActiveColor
          : inactiveColor,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const angle = i * angleStep;

    mesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    // rotate outward
    mesh.rotation.y = -angle;

    mesh.userData.index = i;
    group.add(mesh);
  }

  // 🔄 update filled segments
  group.setActive = (count) => {
    group.children.forEach((child, i) => {
      child.material.color.set(
        i < count
          ? i % 2 === 0
            ? activeColor
            : altActiveColor
          : inactiveColor
      );
    });
  };

  return group;
}


export function SegmentedRoundBar({
  value = 0.5, // 0 → 1
  segments = 24,
}) {
  const bar = useMemo(
    () =>
      createRoundSegmentedBar({
        segments,
        active: Math.round(value * segments),
        y: 1.2,
      }),
    []
  );

  useFrame((_, delta) => {
    bar.setActive(Math.round(value * segments));
      bar.rotation.y -= delta; // smooth spin
  });

  return <primitive object={bar} />;
}