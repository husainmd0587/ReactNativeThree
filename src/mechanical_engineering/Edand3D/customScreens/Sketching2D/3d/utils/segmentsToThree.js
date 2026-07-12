// utils/toThreeGeometry.js
import * as THREE from 'three';

/**
 * Convert a single closed loop of segments into a THREE.Shape.
 * Segments must form a continuous closed path (end of one = start of next).
 */
export function segmentsToThreeShape(segments) {
  const shape = new THREE.Shape();
  let started = false;

  for (const seg of segments) {

    if (seg.type === 'line') {
      if (!started) {
        shape.moveTo(seg.startPoint.x, seg.startPoint.y);
        started = true;
      }
      shape.lineTo(seg.endPoint.x, seg.endPoint.y);
    }

    if (seg.type === 'arc') {
      if (!started) {
        shape.moveTo(seg.startPoint.x, seg.startPoint.y);
        started = true;
      }
      // THREE.Shape.absarc(cx, cy, r, startAngle, endAngle, anticlockwise)
      shape.absarc(
        seg.center.x,
        seg.center.y,
        seg.radius,
        seg.startAngle,
        seg.endAngle,
        !seg.clockwise        // THREE uses anticlockwise flag
      );
    }

    if (seg.type === 'circle') {
      // A full circle — use absarc full 360
      shape.absarc(
        seg.center.x,
        seg.center.y,
        seg.radius,
        0,
        Math.PI * 2,
        false
      );
      started = true;
    }

    if (seg.type === 'rectangle') {
      const { topLeft: tl, bottomRight: br } = seg;
      shape.moveTo(tl.x, tl.y);
      shape.lineTo(br.x, tl.y);
      shape.lineTo(br.x, br.y);
      shape.lineTo(tl.x, br.y);
      shape.closePath();
      started = true;
    }
  }

  shape.closePath();
  return shape;
}

/**
 * Extrude a THREE.Shape into a mesh.
 * depth     — how thick to extrude (in world units)
 * material  — optional THREE.Material
 */
export function extrudeShape(threeShape, depth = 10, material) {
  const extrudeSettings = {
    depth,
    bevelEnabled: false,        // set true if you want beveled edges
    bevelThickness: 1,
    bevelSize: 1,
    bevelSegments: 3,
  };

  const geometry = new THREE.ExtrudeGeometry(threeShape, extrudeSettings);
  const mat      = material ?? new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
  return new THREE.Mesh(geometry, mat);
}

/**
 * Full pipeline: shapeList → extruded THREE.Mesh
 */
export function shapeListToMesh(shapeList, depth = 10, material) {
  const threeShape = segmentsToThreeShape(shapeList);
  return extrudeShape(threeShape, depth, material);
}