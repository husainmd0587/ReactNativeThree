// This deliberately reuses the SolidCad module's existing CadApi.js
// rather than reimplementing extrusion/revolution/CSG math from scratch —
// that math already exists, is backed by a real native library (Manifold,
// via NativeModules.NativeCSG — confirmed registered in
// android/app/src/main/java/com/threeapp/MainApplication.kt and built via
// android/app/src/main/cpp/CMakeLists.txt), and reimplementing it would
// mean shipping a second, untested CSG engine next to a working one.
//
// The tradeoff: this couples AutoCad's 3D commands to the SolidCad
// module's continued existence at this path. If that module ever moves
// or is refactored, this import breaks. That's a real cost, weighed
// against not re-deriving CSG math.
//
// KNOWN LIMITATION: NativeCSG is Android-only — there's no iOS native
// module for it anywhere in this repo. These commands won't work on iOS
// until one exists.
//
// Unlike the 2D commands, the "commit" functions below are real async
// native calls, not synchronous point math — every one can reject
// (native module missing, geometry error, etc.), and
// screens/CommandPractice3D.jsx handles that with a visible error state
// rather than letting it crash. The "preview" functions are plain
// synchronous THREE.js geometry — no native call involved — specifically
// so the student sees the 2D profile / input solids BEFORE running the
// command, the same way AutoCAD shows you the sketch before you extrude
// it rather than only ever showing the finished result.

import * as THREE from 'three';
import {
  Extrude, Revolve, Box, Cylinder, translate, union, subtract, intersect,
} from '../../../SolidCad/cad/CadApi';

// A simple rectangular profile — good enough to see Extrude/Revolve
// actually work without requiring the student to sketch one first (that's
// a separate, larger integration — see the delivery notes).
export const EXTRUDE_PROFILE = [
  { x: -15, y: -10 },
  { x: 15, y: -10 },
  { x: 15, y: 10 },
  { x: -15, y: 10 },
];

// Revolve requires every point's x >= 0 (distance from the revolve axis)
// — a different default profile for that reason.
export const REVOLVE_PROFILE = [
  { x: 5, y: -15 },
  { x: 15, y: -15 },
  { x: 15, y: 15 },
  { x: 5, y: 15 },
];

// ── "Before" previews — plain THREE.js, no native call, shown while the
// student is still choosing options ─────────────────────────────────────

// A flat filled shape at z=0 — literally the 2D profile, viewable from
// any angle via the same orbit controls used for the 3D result, so it's
// visibly flat before Extrude/Revolve turns it into a solid.
export function buildFlatProfileGeometry(points) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// The box and cylinder as two SEPARATE geometries (not yet combined) —
// what Union/Subtract/Intersect are about to operate on. `offset` is the
// exact same overlap distance used once the operation actually runs, so
// the preview matches the result 1:1.
export function buildBooleanSetupGeometries(offset) {
  const box = Box({ width: 24, height: 24, depth: 24 });
  const cylinder = translate(Cylinder({ radius: 9, height: 32 }), offset, 0, 0);
  return { box, cylinder };
}

// ── "Commit" — the real native calls ──────────────────────────────────

export async function runExtrude(depth, direction) {
  return Extrude(EXTRUDE_PROFILE, { depth, reverse: direction === 'negative' });
}

export async function runRevolve(angleDeg, direction) {
  return Revolve(REVOLVE_PROFILE, {
    angle: angleDeg, axis: 'y', segments: 48, reverse: direction === 'ccw',
  });
}

// swapTarget flips which solid is "kept" for Subtract — real AutoCAD's
// SUBTRACT asks you to select objects to subtract FROM first, then
// objects to subtract; the result is genuinely different depending on
// which one is which (box-minus-cylinder leaves a box with a cylindrical
// hole; cylinder-minus-box leaves a cylinder with a corner cut away).
// Union/Intersect are symmetric, so the toggle only matters for Subtract,
// but it's harmless to pass for either.
export async function runBoolean(operation, offset, swapTarget) {
  const { box, cylinder } = buildBooleanSetupGeometries(offset);
  const target = swapTarget ? cylinder : box;
  const tool = swapTarget ? box : cylinder;
  const opFn = { union, subtract, intersect }[operation];
  if (!opFn) throw new Error(`Unknown boolean operation: ${operation}`);
  return opFn(target, tool);
}
