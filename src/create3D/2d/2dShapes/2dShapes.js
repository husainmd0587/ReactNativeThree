import * as THREE from 'three';
import React,{useEffect} from 'react';
import { useTextureLoader } from '../../../assets/all_textures';
// ─── Shape Creators ────────────────────────────────────────────────────────────

// Square
export const createSquare = (size = 0.2) => {
  const shape = new THREE.Shape();
  shape.moveTo(-size, -size);
  shape.lineTo( size, -size);
  shape.lineTo( size,  size);
  shape.lineTo(-size,  size);
  shape.lineTo(-size, -size);
  return shape;
};

// Rectangle
export const createRectangle = (width = 0.4, height = 0.2) => {
  const hw = width / 2, hh = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo( hw, -hh);
  shape.lineTo( hw,  hh);
  shape.lineTo(-hw,  hh);
  shape.lineTo(-hw, -hh);
  return shape;
};

// Circle
export const createCircle = ({radius = 20, segments = 64}) => {
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

// Ellipse
export const createEllipse = (rx = 0.3, ry = 0.15, segments = 64) => {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
};

// Triangle (equilateral)
export const createTriangle = (size = 0.2) => {
  const shape = new THREE.Shape();
  const height = size * Math.sqrt(3);
  shape.moveTo(0, height / 2);
  shape.lineTo(-size, -height / 2);
  shape.lineTo( size, -height / 2);
  shape.lineTo(0, height / 2);
  return shape;
};

// Right Triangle
export const createRightTriangle = (base = 0.3, height = 0.2) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(base, 0);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);
  return shape;
};

// Half Circle
export const createHalfCircle = (radius = 0.2, segments = 32) => {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.lineTo(radius, 0);
  return shape;
};

// Arc Sector (pie slice)
export const createSector = (radius = 0.2, startAngle = 0, endAngle = Math.PI / 2, segments = 32) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (i / segments) * (endAngle - startAngle);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.lineTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.lineTo(0, 0);
  return shape;
};

// Regular Polygon (n-sided)
export const createPolygon = (sides = 6, size = 0.2, angleOffset = 0) => {
  const shape = new THREE.Shape();
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + angleOffset;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
};

// Pentagon
export const createPentagon = (size = 0.2) =>
  createPolygon(5, size, -Math.PI / 2);

// Hexagon
export const createHexagon = (size = 0.2) =>
  createPolygon(6, size, 0);

// Octagon
export const createOctagon = (size = 0.2) =>
  createPolygon(8, size, Math.PI / 8);

// Star
export const createStar = ({ outerRadius = 2, innerRadius = 1, points = 5 } = {}) => {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
};

// Arrow (pointing right)
export const createArrow = (length = 0.4, width = 0.1, headLength = 0.15, headWidth = 0.2) => {
  const shape = new THREE.Shape();
  const bodyEnd = length - headLength;
  shape.moveTo(0, -width / 2);
  shape.lineTo(bodyEnd, -width / 2);
  shape.lineTo(bodyEnd, -headWidth / 2);
  shape.lineTo(length, 0);
  shape.lineTo(bodyEnd,  headWidth / 2);
  shape.lineTo(bodyEnd,  width / 2);
  shape.lineTo(0,  width / 2);
  shape.lineTo(0, -width / 2);
  return shape;
};

// Cross / Plus
export const createCross = (size = 0.2, thickness = 0.06) => {
  const h = thickness / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-h, -size);
  shape.lineTo( h, -size);
  shape.lineTo( h, -h);
  shape.lineTo( size, -h);
  shape.lineTo( size,  h);
  shape.lineTo( h,  h);
  shape.lineTo( h,  size);
  shape.lineTo(-h,  size);
  shape.lineTo(-h,  h);
  shape.lineTo(-size,  h);
  shape.lineTo(-size, -h);
  shape.lineTo(-h, -h);
  shape.lineTo(-h, -size);
  return shape;
};

// Heart
export const createHeart = (size = 0.2) => {
  const s = size;
  const shape = new THREE.Shape();
  shape.moveTo(0, -s);
  shape.bezierCurveTo(-s * 2, -s * 2, -s * 2.5, s, 0, s * 1.2);
  shape.bezierCurveTo( s * 2.5, s, s * 2, -s * 2, 0, -s);
  return shape;
};

// Diamond / Rhombus
export const createDiamond = (width = 0.15, height = 0.25) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, height);
  shape.lineTo(width, 0);
  shape.lineTo(0, -height);
  shape.lineTo(-width, 0);
  shape.lineTo(0, height);
  return shape;
};

// Trapezoid
export const createTrapezoid = (topWidth = 0.15, bottomWidth = 0.3, height = 0.2) => {
  const shape = new THREE.Shape();
  shape.moveTo(-bottomWidth / 2, -height / 2);
  shape.lineTo( bottomWidth / 2, -height / 2);
  shape.lineTo( topWidth / 2,     height / 2);
  shape.lineTo(-topWidth / 2,     height / 2);
  shape.lineTo(-bottomWidth / 2, -height / 2);
  return shape;
};

// Parallelogram
export const createParallelogram = (width = 0.3, height = 0.15, skew = 0.1) => {
  const shape = new THREE.Shape();
  shape.moveTo(skew, height / 2);
  shape.lineTo(width + skew, height / 2);
  shape.lineTo(width - skew, -height / 2);
  shape.lineTo(-skew, -height / 2);
  shape.lineTo(skew, height / 2);
  return shape;
};

// Rounded Rectangle
export const createRoundedRect = (width = 0.4, height = 0.2, radius = 0.04) => {
  const hw = width / 2, hh = height / 2;
  const r = Math.min(radius, hw, hh);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo( hw - r, -hh);
  shape.quadraticCurveTo( hw, -hh,  hw, -hh + r);
  shape.lineTo( hw,  hh - r);
  shape.quadraticCurveTo( hw,  hh,  hw - r,  hh);
  shape.lineTo(-hw + r,  hh);
  shape.quadraticCurveTo(-hw,  hh, -hw,  hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
};

// ─── Display Components ────────────────────────────────────────────────────────

/**
 * Show2DShape — renders any THREE.Shape as a filled mesh
 *
 * Props:
 *   shape      {THREE.Shape}   – shape to render (default: 5-point star)
 *   color      {string|number} – fill color (default: "#cccccc")
 *   opacity    {number}        – 0–1 (default: 1)
 *   wireframe  {boolean}       – show as wireframe (default: false)
 *   position   {[x,y,z]}       – world position (default: [0,0,0])
 *   rotation   {[x,y,z]}       – Euler rotation in radians (default: [0,0,0])
 *   scale      {[x,y,z]|number}– scale factor (default: 1)
 *   segments   {number}        – curve segments (default: 32)
 */
export function Show2DShape({
  shape = createStar({ outerRadius: 3, innerRadius: 1, points: 5 }),
  color = '#cccccc',
  opacity = 1,
  wireframe = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  segments = 32,
}) {
  const geometry = React.useMemo(
    () => new THREE.ShapeGeometry(shape, segments),
    [shape, segments]
  );

  const scaleArr = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scaleArr}
    >
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={wireframe}
      />
    </mesh>
  );
}

/**
 * Show2DShapeOutline — renders a shape as a line loop (no fill)
 *
 * Props:
 *   shape      {THREE.Shape}   – shape to render
 *   color      {string|number} – line color (default: "#ffffff")
 *   linewidth  {number}        – line width (limited by WebGL; default: 1)
 *   position   {[x,y,z]}
 *   rotation   {[x,y,z]}
 *   scale      {[x,y,z]|number}
 *   segments   {number}
 */
export function Show2DShapeOutline({
  shape = createCircle(0.2),
  color = '#ffffff',
  linewidth = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  segments = 64,
}) {
  const geometry = React.useMemo(() => {
    const pts = shape.getPoints(segments);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [shape, segments]);

  const scaleArr = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <line
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scaleArr}
    >
      <lineBasicMaterial color={color} linewidth={linewidth} />
    </line>
  );
}

/**
 * Show2DShapeByPoints — renders a filled shape from raw Vector2 points
 *
 * Props:
 *   shapePoints {THREE.Vector2[]|[x,y][]} – array of points
 *   color       {string|number}
 *   opacity     {number}
 *   wireframe   {boolean}
 *   position    {[x,y,z]}
 *   rotation    {[x,y,z]}
 *   scale       {[x,y,z]|number}
 *   segments    {number}
 */
export function Show2DShapeByPoints({
  shapePoints = [],
  color = '#cccccc',
  opacity = 1,
  wireframe = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  segments = 32,
}) {
  const geometry = React.useMemo(() => {
    const pts = shapePoints.map(p =>
      Array.isArray(p) ? new THREE.Vector2(p[0], p[1]) : p
    );
    const shape = new THREE.Shape(pts);
    return new THREE.ShapeGeometry(shape, segments);
  }, [shapePoints, segments]);

  const scaleArr = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scaleArr}
    >
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={wireframe}
      />
    </mesh>
  );
}

/**
 * Show3DExtruded — extrudes any 2D shape into a 3D mesh
 */
export function Show3DExtruded({
  shape = createHexagon(0.5),
  depth = 0.3,
  bevelEnabled = true,
  bevelThickness = 0.05,
  bevelSize = 0.03,
  bevelSegments = 4,
  color = '#cccccc',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  texture=null
}) {
  const textures =useTextureLoader(texture)
  const geometry = React.useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled,
        bevelThickness,
        bevelSize,
        bevelSegments,
      }),
    [shape, depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments]
  )

  const scaleArr = typeof scale === 'number' ? [scale, scale, scale] : scale

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scaleArr}
    >
      <meshStandardMaterial color={color} side={THREE.DoubleSide} map={textures} />
    </mesh>
  )
}