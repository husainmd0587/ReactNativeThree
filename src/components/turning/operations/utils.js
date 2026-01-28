import * as THREE from "three";

export function buildSweepGeometry({
  shapePoints,      // Vector2[]
  pathPoints,       // Vector3[]
  up = new THREE.Vector3(0, 0, 1),
}) {
  const curve = new THREE.CatmullRomCurve3(pathPoints);
  const segments = pathPoints.length - 1;

  const points = curve.getPoints(segments);
  const tangents = curve.computeFrenetFrames(segments, false).tangents;

  const vertices = [];
  const indices = [];
  const uvs = [];

  const shapeCount = shapePoints.length;

  for (let i = 0; i < points.length; i++) {
    const tangent = tangents[i].clone().normalize();

    const right = new THREE.Vector3()
      .crossVectors(up, tangent)
      .normalize();

    const normal = new THREE.Vector3()
      .crossVectors(tangent, right)
      .normalize();

    const v = i / segments;

    for (let j = 0; j < shapeCount; j++) {
      const p = shapePoints[j];

      const vertex = new THREE.Vector3()
        .copy(points[i])
        .addScaledVector(right, p.x)
        .addScaledVector(normal, p.y);

      vertices.push(vertex.x, vertex.y, vertex.z);

      const u = j / shapeCount;
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < shapeCount; j++) {
      const a = i * shapeCount + j;
      const b = i * shapeCount + (j + 1) % shapeCount;
      const c = (i + 1) * shapeCount + j;
      const d = (i + 1) * shapeCount + (j + 1) % shapeCount;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}


export function createSpringPath({
  radius = 2,
  turns = 5,
  height = 8,
  segments = 300,
  reverce=false,
}) {
  const points = [];

  for (let i = 0; i <= segments; i++) {

    const t = reverce? -(i / segments) * Math.PI * 2 * turns: (i / segments) * Math.PI * 2 * turns
    
    points.push(
      new THREE.Vector3(
        Math.cos(t) * radius,
        Math.sin(t) * radius,
        (i / segments) * height
      )
    );
  }

  return points;
}

export const createSquare = (size = 0.2) => [
  new THREE.Vector2(-size, -size),
  new THREE.Vector2(size, -size),
  new THREE.Vector2(size, size),
  new THREE.Vector2(-size, size),
];
// Triangle
export const createTriangle = (size = 0.2) =>{
  const h = size * Math.sqrt(3);
  return [
    new THREE.Vector2(0, 0),        // root (on path)
    new THREE.Vector2(size, h / 2), // outer edge (sticks out)
    new THREE.Vector2(size, -h / 2) // outer edge
  ];
}
// reverce tringle
export const createReverceTriangle = (size = 0.2) =>{
  const h = size * Math.sqrt(3);
  return [
    new THREE.Vector2(0, 0),        // root (on path)
    new THREE.Vector2(-size, h / 2), // outer edge (sticks out)
    new THREE.Vector2(-size, -h / 2) // outer edge
  ];
}

export const createCircle = (radius = 0.2, segments = 16) =>
  Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector2(
      Math.cos(a) * radius,
      Math.sin(a) * radius
    );
  });

  



