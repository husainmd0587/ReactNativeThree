import * as THREE from 'three';
import React from 'react';
// Square
export const createSquare = (size = 0.2) => {
    const shape = new THREE.Shape();
    shape.moveTo(-size, -size);
    shape.lineTo(size, -size);
    shape.lineTo(size, size);
    shape.lineTo(-size, size);
    shape.lineTo(-size, -size);
    return shape;
};

// Circle using sine and cosine
export const createCircle = (radius = 0.2, segments = 32) => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    return shape;
};

// Triangle
export const createTriangle = (size = 0.2) => {
    const shape = new THREE.Shape();
    const height = size * Math.sqrt(3);
    shape.moveTo(0, height / 2);
    shape.lineTo(-size, -height / 2);
    shape.lineTo(size, -height / 2);
    shape.lineTo(0, height / 2);
    return shape;
};

// Half Circle
export const createHalfCircle = (radius = 0.2, segments = 32) => {
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.lineTo(-radius, 0);
    return shape;
};

// Pentagon
export const createPentagon = (size = 0.2) => {
    const shape = new THREE.Shape();
    const sides = 5;
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    return shape;
};

// Hexagon
export const createHexagon = (size = 0.2) => {
    const shape = new THREE.Shape();
    const sides = 6;
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    return shape;
};

// Star
export const createStar = ({outerRadius = 2, innerRadius = 1.5, points = 5}) => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    return shape;
};

//Show 2D Shape by given shape
export function Show2DShape({
  shape=createStar({outerRadius:3, innerRadius : 1, points : 5}),
  segments = 32
}) {
  const geometry = React.useMemo(
    () => new THREE.ShapeGeometry(shape, segments),
    [shape, segments]
  )

  return (
    <mesh geometry={geometry} position={[0,5,0]}>
      <meshBasicMaterial color="#ccc" side={THREE.DoubleSide} />
    </mesh>
  )
}
// show 2d shape by given points
export function Show2DShapeByPoints({
  shapePoints=[],
  segments = 32
}) {
  const shape = new THREE.Shape(shapePoints);
  const geometry = React.useMemo(
    () => new THREE.ShapeGeometry(shape, segments),
    [shape, segments]
  )

  return (
    <mesh geometry={geometry} position={[0,5,0]}>
      <meshBasicMaterial color="#ccc" side={THREE.DoubleSide} />
    </mesh>
  )
}