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

// Sweep's profile — a small square cross-section, defined in the profile's
// own local XY plane. three.js's ExtrudeGeometry orients this along the
// path automatically (it computes the path's own local frame internally),
// so this profile doesn't need to know the path's shape at all.
export const SWEEP_PROFILE = [
  { x: -3, y: -3 },
  { x: 3, y: -3 },
  { x: 3, y: 3 },
  { x: -3, y: 3 },
];

// A simple bent path (a "pipe elbow") — straight up, then a curve out to
// the side. `bendOut` controls how far the elbow reaches sideways, the
// one adjustable parameter Sweep's setup screen exposes.
function buildSweepPath(bendOut) {
  return [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 15 },
    { x: bendOut * 0.4, y: 0, z: 25 },
    { x: bendOut, y: 0, z: 25 },
  ];
}

// Loft's two cross-sections — a smaller square at the bottom (z=0), a
// larger one at the top. `topHalfWidth` and `heightPx` (both adjustable
// on the setup screen) control the top ring's size and how far apart the
// two rings sit, so the taper is genuinely visible and controllable.
function buildLoftRings(topHalfWidth, heightPx) {
  const bottom = [
    { x: -8, y: -8, z: 0 }, { x: 8, y: -8, z: 0 }, { x: 8, y: 8, z: 0 }, { x: -8, y: 8, z: 0 },
  ];
  const top = [
    { x: -topHalfWidth, y: -topHalfWidth, z: heightPx },
    { x: topHalfWidth, y: -topHalfWidth, z: heightPx },
    { x: topHalfWidth, y: topHalfWidth, z: heightPx },
    { x: -topHalfWidth, y: topHalfWidth, z: heightPx },
  ];
  return [bottom, top];
}

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

// A thin tube tracing Sweep's path — shown alongside the flat profile in
// Setup so the student can see both what's being swept AND the path it
// will follow, before running the command.
export function buildSweepPathPreviewGeometry(bendOut) {
  const curve = new THREE.CatmullRomCurve3(
    buildSweepPath(bendOut).map((p) => new THREE.Vector3(p.x, p.y, p.z)),
  );
  return new THREE.TubeGeometry(curve, 40, 0.6, 8, false);
}

// The two rings Loft is about to connect, shown as flat filled shapes —
// same idea as the boolean setup preview, but for a taper instead of an
// overlap. buildFlatProfileGeometry only reads each point's x/y (a
// THREE.Shape is inherently 2D), so the top ring needs an explicit
// z-translate afterward even though its own points already carry z —
// that z is what buildFlatProfileGeometry would otherwise silently drop.
export function buildLoftSetupGeometries(topHalfWidth, heightPx) {
  const [bottom, top] = buildLoftRings(topHalfWidth, heightPx);
  const bottomGeometry = buildFlatProfileGeometry(bottom);
  const topGeometry = buildFlatProfileGeometry(top);
  topGeometry.translate(0, 0, heightPx);
  return { bottom: bottomGeometry, top: topGeometry };
}

// Connects an arbitrary number of same-vertex-count rings into one
// closed solid: side faces between every consecutive pair of rings, plus
// a fan-triangulated cap on the first and last ring. No native call
// involved — pure BufferGeometry construction, which is also why Loft
// (like Sweep) works on iOS too, unlike Extrude/Revolve/Union/Subtract/
// Intersect, which depend on the Android-only native CSG module.
function buildLoftGeometry(rings) {
  const n = rings[0].length;
  const positions = [];
  const indices = [];
  rings.forEach((ring) => ring.forEach((p) => positions.push(p.x, p.y, p.z)));

  for (let r = 0; r < rings.length - 1; r += 1) {
    const base0 = r * n;
    const base1 = (r + 1) * n;
    for (let i = 0; i < n; i += 1) {
      const a = base0 + i;
      const b = base0 + ((i + 1) % n);
      const c = base1 + i;
      const d = base1 + ((i + 1) % n);
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  function addCap(ringIndex, reverse) {
    const base = ringIndex * n;
    const ring = rings[ringIndex];
    const centroid = ring.reduce(
      (acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n, z: acc.z + p.z / n }),
      { x: 0, y: 0, z: 0 },
    );
    const centroidIndex = positions.length / 3;
    positions.push(centroid.x, centroid.y, centroid.z);
    for (let i = 0; i < n; i += 1) {
      const a = base + i;
      const b = base + ((i + 1) % n);
      indices.push(centroidIndex, reverse ? b : a, reverse ? a : b);
    }
  }
  addCap(0, true);
  addCap(rings.length - 1, false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ── "Commit" — the real native calls (Sweep/Loft below are the exception:
// pure client-side geometry, no native call, but kept behind the same
// Setup -> Result flow as everything else for a consistent feel) ───────

export async function runSweep(bendOut) {
  const shape = new THREE.Shape();
  SWEEP_PROFILE.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });
  shape.closePath();
  const curve = new THREE.CatmullRomCurve3(
    buildSweepPath(bendOut).map((p) => new THREE.Vector3(p.x, p.y, p.z)),
  );
  return new THREE.ExtrudeGeometry(shape, { steps: 40, bevelEnabled: false, extrudePath: curve });
}

export async function runLoft(topHalfWidth, heightPx) {
  return buildLoftGeometry(buildLoftRings(topHalfWidth, heightPx));
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
