// cad/CadApi.js
//
// Single entry point for the CAD workflow:
//
//   Sketch (2D) -> Profile (outer + holes) -> Extrude / Revolve -> Solid
//   -> Features -> Render
//
// NATIVE-FIRST: Extrude and Revolve build the solid on the native side via
// Manifold::Extrude / Manifold::Revolve (native/manifoldNativeApi.js's
// initExtrude/initRevolve) — NOT with THREE.ExtrudeGeometry/LatheGeometry.
// A profile with an outer boundary AND holes goes to native in ONE call
// (Manifold's own polygon-with-holes support), not one Extrude + N boolean
// cuts. utils/profile/loopDetection.js is what builds that profile out of
// the Sketcher's flat segment list.
//
// PERFORMANCE: once a solid exists, it stays resident in native memory.
// Cutting many features into it (a bolt circle of 20-50 holes) goes through
// cutMany() — one native call regardless of hole count.
//
// Usage:
//
//   import { singleProfileFrom } from '../utils/profile/loopDetection'
//   import { Extrude, CircularHolePattern } from './CadApi'
//
//   const profile = singleProfileFrom(sketchSegments) // throws a clear error
//                                                      // if ambiguous/open
//   let plate = await Extrude(profile, { depth: 5 })
//   plate = await CircularHolePattern({ count: 8, patternRadius: 30, holeRadius: 3, depth: 10 })

import {
  Box, Cylinder, Cone, Sphere, Torus,
  subtract, union, intersect,
  translate, rotate, scale,
  geometryToManifold, manifoldToGeometry,
  reset,

  initBox,
  initCylinder,
  initExtrude,
  initRevolve,
  cut,
  join,
  intersectWith,
  cutExtrudedProfile,
  cutMany,
  joinMany,
  getModel,
  resetModel,
  translateModel,
} from '../native/manifoldNativeApi.js'

import {
  Line, Rectangle, Circle,
  isClosedProfile,
} from '../utils/profile/profile.js'

import { profileToNativeInput } from '../utils/profile/loopDetection.js'

// ═══════════════════════════════════════════════════════════════════════════
// EXTRUDE — profile (outer + holes) -> native Manifold solid
// ═══════════════════════════════════════════════════════════════════════════
//
// profile: the { outer, holes } shape from
//          utils/profile/loopDetection.js's classifyLoops()/singleProfileFrom(),
//          OR a plain array of {x,y} points for a simple hole-free loop.
//
// options.depth:     extrusion distance along Z (required)
// options.reverse:   extrude to the other side of the sketch plane
// options.symmetric: extrude half the distance on each side of the sketch
//                    plane (takes priority over `reverse` if both are set)
//
// Resets the native stock to this solid. Returns a THREE.BufferGeometry for
// rendering — the real solid now lives in native memory, ready for
// cut()/join()/cutMany() below.

export async function Extrude(profile, { depth = 10, reverse = false, symmetric = false } = {}) {
  const nativeInput = Array.isArray(profile) ? profile : profileToNativeInput(profile)
  return initExtrude(nativeInput, { depth, reverse, symmetric })
}

// ═══════════════════════════════════════════════════════════════════════════
// REVOLVE — closed profile (single outer loop only — see note) -> native
// Manifold solid of revolution
// ═══════════════════════════════════════════════════════════════════════════
//
// profile: an array of {x,y} points, every point x >= 0 (or y >= 0 for an
//          X-axis revolve) — distance from the revolve axis. Multi-loop
//          (profile with holes) revolve is NOT implemented yet — pass the
//          outer boundary only; see the note in the audit for why this is
//          deferred rather than guessed at.
//
// options.segments: radial tessellation quality
// options.angle:    revolve sweep in degrees, (0, 360], default 360
// options.axis:     'y' (default) or 'x'
// options.reverse:  sweep the other way (only visible for angle < 360 —
//                   see the caveat in manifoldNativeApi.js's initRevolve)

export async function Revolve(profile, { segments = 64, angle = 360, axis = 'y', reverse = false } = {}) {
  const points = Array.isArray(profile) ? profile : profile.outer?.points
  if (!Array.isArray(points)) {
    throw new Error('Revolve requires an array of {x,y} points, or a profile with an outer loop (holes are not supported for Revolve yet)')
  }
  if (!Array.isArray(profile) && profile.holes?.length > 0) {
    throw new Error('This profile has holes — Revolve only supports a single outer boundary for now. Extrude supports holes.')
  }

  return initRevolve(points, { segments, angle, axis, reverse })
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLE PATTERNS — the fast path for "cut 20/50 holes"
// ═══════════════════════════════════════════════════════════════════════════
//
// Both build ONE cylinder tool and reuse it for every instance via
// cutMany() — a single native call regardless of hole count.

export async function CircularHolePattern({
  count = 8,
  patternRadius = 20,
  holeRadius = 2,
  depth = 20,
  segments = 32,
  centerX = 0,
  centerY = 0,
} = {}) {
  if (!(count > 0)) throw new Error('CircularHolePattern requires count > 0')

  const hole = Cylinder({ radius: holeRadius, height: depth * 2, segments })

  const transforms = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    transforms.push({
      tx: centerX + Math.cos(angle) * patternRadius,
      ty: centerY + Math.sin(angle) * patternRadius,
      tz: 0,
      rx: Math.PI / 2, // align cylinder's own Y-axis with the stock's Z-axis
      ry: 0,
      rz: 0,
    })
  }

  const result = await cutMany(hole, transforms, 'subtract')
  hole.dispose()
  return result
}

export async function RectHolePattern({
  rows = 2,
  cols = 2,
  spacingX = 20,
  spacingY = 20,
  holeRadius = 2,
  depth = 20,
  segments = 32,
  centerX = 0,
  centerY = 0,
} = {}) {
  if (!(rows > 0) || !(cols > 0)) throw new Error('RectHolePattern requires rows > 0 and cols > 0')

  const hole = Cylinder({ radius: holeRadius, height: depth * 2, segments })

  const startX = centerX - (spacingX * (cols - 1)) / 2
  const startY = centerY - (spacingY * (rows - 1)) / 2

  const transforms = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      transforms.push({
        tx: startX + c * spacingX,
        ty: startY + r * spacingY,
        tz: 0,
        rx: Math.PI / 2,
        ry: 0,
        rz: 0,
      })
    }
  }

  const result = await cutMany(hole, transforms, 'subtract')
  hole.dispose()
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS — one import for the whole CAD workflow
// ═══════════════════════════════════════════════════════════════════════════

export {
  // 2D sketch entities + validation (legacy single-loop helpers)
  Line,
  Rectangle,
  Circle,
  isClosedProfile,

  // 3D primitives (native-bridge compatible, built client-side as tools)
  Box,
  Cylinder,
  Cone,
  Sphere,
  Torus,

  // One-off boolean ops between two independent solids (re-inits stock)
  subtract,
  union,
  intersect,

  // Native stock lifecycle
  initBox,
  initCylinder,
  getModel,
  resetModel,
  translateModel,
  reset,

  // Fast path — operate on the CURRENT native stock
  cut,
  join,
  intersectWith,
  cutExtrudedProfile,
  cutMany,
  joinMany,

  // Transforms (client-side, for tool geometry before cut/join)
  translate,
  rotate,
  scale,

  // Low-level conversion helpers, exposed for advanced use
  geometryToManifold,
  manifoldToGeometry,
}

export default {
  Line, Rectangle, Circle, isClosedProfile,
  Extrude, Revolve,
  CircularHolePattern, RectHolePattern,
  Box, Cylinder, Cone, Sphere, Torus,
  subtract, union, intersect,
  initBox, initCylinder, getModel, resetModel, translateModel, reset,
  cut, join, intersectWith, cutExtrudedProfile, cutMany, joinMany,
  translate, rotate, scale,
  geometryToManifold, manifoldToGeometry,
}
