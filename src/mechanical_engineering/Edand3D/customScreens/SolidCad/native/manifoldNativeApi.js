import * as THREE from 'three'
import { NativeModules } from 'react-native'

const { NativeCSG } = NativeModules

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SEGMENTS = 64
const DEFAULT_MERGE_TOLERANCE = 0.0001

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function positiveNumber(value, fallback) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
    ? value
    : fallback
}

function positiveInt(value, fallback) {
  return (
    Number.isInteger(value) &&
    value >= 3
  )
    ? value
    : fallback
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGE VERTICES
// ═══════════════════════════════════════════════════════════════════════════

function mergeVertices(
  geometry,
  tolerance = DEFAULT_MERGE_TOLERANCE
) {
  const position = geometry.getAttribute('position')

  if (!position) {
    throw new Error('Geometry has no position attribute')
  }

  const map = new Map()
  const vertices = []
  const indices = []

  const invTolerance = 1 / tolerance

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)

    const key =
      `${Math.round(x * invTolerance)},` +
      `${Math.round(y * invTolerance)},` +
      `${Math.round(z * invTolerance)}`

    let index = map.get(key)

    if (index === undefined) {
      index = vertices.length / 3

      map.set(key, index)

      vertices.push(x, y, z)
    }

    indices.push(index)
  }

  return {
    vertices,
    indices,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS GEOMETRY → MANIFOLD DATA
// ═══════════════════════════════════════════════════════════════════════════

export function geometryToManifold(
  geometry,
  tolerance = DEFAULT_MERGE_TOLERANCE
) {
  if (!(geometry instanceof THREE.BufferGeometry)) {
    throw new Error(
      'geometryToManifold expects THREE.BufferGeometry'
    )
  }

  let geo = geometry.clone()

  // Make sure geometry is non-indexed first.
  // This gives us a clean triangle list.
  if (geo.index) {
    geo = geo.toNonIndexed()
  }

  // We only need positions for Manifold.
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  geo.deleteAttribute('color')
  geo.deleteAttribute('tangent')

  const result = mergeVertices(geo, tolerance)

  geo.dispose()

  if (
    result.vertices.length < 9 ||
    result.indices.length < 3
  ) {
    throw new Error(
      'Invalid geometry: not enough vertices or triangles'
    )
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// MANIFOLD RESULT → THREE.JS GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

export function manifoldToGeometry(result) {
  if (
    !result ||
    !result.vertices ||
    !result.indices ||
    result.vertices.length === 0 ||
    result.indices.length === 0
  ) {
    return null
  }

  const geometry = new THREE.BufferGeometry()

  const vertices = new Float32Array(result.vertices)
  const indices = new Uint32Array(result.indices)

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3)
  )

  geometry.setIndex(
    new THREE.BufferAttribute(indices, 1)
  )

  geometry.computeVertexNormals()

  return geometry
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE PRIMITIVE GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

export function Box({
  width = 10,
  height = 10,
  depth = 10,
} = {}) {
  width = positiveNumber(width, 10)
  height = positiveNumber(height, 10)
  depth = positiveNumber(depth, 10)

  return new THREE.BoxGeometry(
    width,
    height,
    depth
  )
}

export function Cylinder({
  radius = 5,
  height = 10,
  segments = DEFAULT_SEGMENTS,
} = {}) {
  radius = positiveNumber(radius, 5)
  height = positiveNumber(height, 10)
  segments = positiveInt(segments, DEFAULT_SEGMENTS)

  return new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segments
  )
}

export function Cone({
  radiusBottom = 5,
  radiusTop = 0,
  height = 10,
  segments = DEFAULT_SEGMENTS,
} = {}) {
  radiusBottom = positiveNumber(radiusBottom, 5)
  radiusTop = Math.max(0, radiusTop)
  height = positiveNumber(height, 10)
  segments = positiveInt(segments, DEFAULT_SEGMENTS)

  return new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    segments
  )
}

export function Sphere({
  radius = 5,
  widthSegments = DEFAULT_SEGMENTS,
  heightSegments = 32,
} = {}) {
  radius = positiveNumber(radius, 5)

  return new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments
  )
}

export function Torus({
  radius = 5,
  tube = 1,
  radialSegments = 32,
  tubularSegments = 64,
} = {}) {
  return new THREE.TorusGeometry(
    radius,
    tube,
    radialSegments,
    tubularSegments
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// NATIVE STOCK INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initFromGeometry(geometry) {
  const manifold = geometryToManifold(geometry)

  const success = await NativeCSG.initStock(
    manifold.vertices,
    manifold.indices
  )

  if (!success) {
    throw new Error(
      'Native Manifold failed to initialize geometry'
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOLEAN OPERATION
// ═══════════════════════════════════════════════════════════════════════════

async function booleanOperation(
  target,
  tool,
  operation
) {
  if (!(target instanceof THREE.BufferGeometry)) {
    throw new Error(
      'Boolean target must be THREE.BufferGeometry'
    )
  }

  if (!(tool instanceof THREE.BufferGeometry)) {
    throw new Error(
      'Boolean tool must be THREE.BufferGeometry'
    )
  }

  // Initialize target as native Manifold stock.
  await initFromGeometry(target)

  const toolData = geometryToManifold(tool)

  let op

  switch (operation) {
    case 'subtract':
      op = 0
      break

    case 'union':
      op = 1
      break

    case 'intersect':
      op = 2
      break

    default:
      throw new Error(
        `Unknown boolean operation: ${operation}`
      )
  }

  const result = await NativeCSG.applyMeshToolWithTransform(
    toolData.vertices,
    toolData.indices,

    // Position
    0,
    0,
    0,

    // Rotation
    0,
    0,
    0,

    // Scale
    1,
    1,
    1,

    // Operation
    op,

    // Material
    0
  )

  if (!result?.vertices?.length) {
    throw new Error(
      `Manifold ${operation} returned an empty result`
    )
  }

  return manifoldToGeometry(result)
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOLEAN API
// ═══════════════════════════════════════════════════════════════════════════

export async function subtract(
  target,
  tool
) {
  return booleanOperation(
    target,
    tool,
    'subtract'
  )
}

export async function union(
  target,
  tool
) {
  return booleanOperation(
    target,
    tool,
    'union'
  )
}

export async function intersect(
  target,
  tool
) {
  return booleanOperation(
    target,
    tool,
    'intersect'
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════════

export function translate(
  geometry,
  x = 0,
  y = 0,
  z = 0
) {
  const result = geometry.clone()

  result.translate(
    x,
    y,
    z
  )

  return result
}

export function rotate(
  geometry,
  x = 0,
  y = 0,
  z = 0
) {
  const result = geometry.clone()

  result.rotateX(x)
  result.rotateY(y)
  result.rotateZ(z)

  return result
}

export function scale(
  geometry,
  x = 1,
  y = 1,
  z = 1
) {
  const result = geometry.clone()

  result.scale(
    x,
    y,
    z
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// FAST PATH — operate directly on the persistent native stock
// ═══════════════════════════════════════════════════════════════════════════
//
// Everything above (subtract/union/intersect) re-initializes the native
// stock from `target` on every single call — simple and fine for one-off
// combinations of two independent solids, but wasteful for a sketch-driven
// modeling flow: build one solid, then cut a bunch of features into THAT
// SAME solid.
//
// The functions below assume the native stock is already the solid you want
// to keep working on (set by initExtrude/initRevolve/initBox/initCylinder
// below, or any of the raw NativeCSG.initStock* calls). They never re-send
// the current solid back into native — they just keep mutating it — so
// cutting N holes costs N small tool uploads, not N full-model round trips.
//
// initExtrude / initRevolve build the base solid straight from a 2D profile
// using Manifold on the native side (Manifold::Extrude / Manifold::Revolve),
// instead of building it with THREE.ExtrudeGeometry/LatheGeometry client-side
// and converting that mesh into a manifold afterwards.

const DEFAULT_TRANSFORM = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 }

function transformArgs(transform = {}) {
  const t = { ...DEFAULT_TRANSFORM, ...transform }
  return [t.tx, t.ty, t.tz, t.rx, t.ry, t.rz, t.sx, t.sy, t.sz]
}

function flattenPoints(points) {
  const flat = new Array(points.length * 2)
  for (let i = 0; i < points.length; i++) {
    flat[i * 2] = points[i].x
    flat[i * 2 + 1] = points[i].y
  }
  return flat
}

function opCode(operation) {
  switch (operation) {
    case 'union': return 1
    case 'intersect': return 2
    case 'subtract':
    default: return 0
  }
}

// ── Establish the base solid (resets the native stock) ─────────────────────

export async function initBox({ width = 10, height = 10, depth = 10 } = {}) {
  const ok = await NativeCSG.initStockBox(
    positiveNumber(width, 10),
    positiveNumber(height, 10),
    positiveNumber(depth, 10)
  )
  if (!ok) throw new Error('Native Manifold failed to build the box stock')
  return getModel()
}

export async function initCylinder({ radius = 5, height = 10, segments = DEFAULT_SEGMENTS } = {}) {
  const ok = await NativeCSG.initStockCylinder(
    positiveNumber(radius, 5),
    positiveNumber(height, 10),
    positiveInt(segments, DEFAULT_SEGMENTS)
  )
  if (!ok) throw new Error('Native Manifold failed to build the cylinder stock')
  return getModel()
}

// loops: either a plain array of {x,y} points (single loop, no holes — kept
// for backward compatibility), or { outer: points[], holes: points[][] } as
// produced by utils/profile/loopDetection.js's profileToNativeInput().
//
// options:
//   depth:     extrusion distance (required)
//   reverse:   extrude to the OTHER side of the sketch plane
//   symmetric: extrude half the distance on each side of the sketch plane
function loopsToNativeArgs(loops) {
  if (Array.isArray(loops)) {
    return { points: flattenPoints(loops), loopSizes: [loops.length] }
  }
  if (loops && Array.isArray(loops.points) && Array.isArray(loops.loopSizes)) {
    return loops // already flattened (e.g. straight from profileToNativeInput)
  }
  throw new Error('Profile must be an array of {x,y} points, or { points, loopSizes } from profileToNativeInput()')
}

export async function initExtrude(loops, { depth = 10, reverse = false, symmetric = false } = {}) {
  if (!(depth > 0)) throw new Error('Extrude depth must be a positive number')

  const { points, loopSizes } = loopsToNativeArgs(loops)
  if (loopSizes.some((n) => n < 3)) throw new Error('Every loop in the profile needs at least 3 points')

  const ok = await NativeCSG.initStockFromExtrudeProfile(points, loopSizes, depth)
  if (!ok) throw new Error('Native Manifold failed to extrude this profile — check that every loop is a simple closed region')

  if (symmetric) {
    await NativeCSG.translateStock(0, 0, -depth / 2)
  } else if (reverse) {
    await NativeCSG.translateStock(0, 0, -depth)
  }

  return getModel()
}

// points: array of {x, y} where x >= 0 (distance from the revolve axis).
// options:
//   segments: radial tessellation quality
//   angle:    revolve sweep in degrees, (0, 360], default 360 (full revolve)
//   axis:     'y' (default — matches the profile's own x/y as-is) or
//             'x' (swaps the profile's x/y before revolving, so the sketch's
//             X axis becomes the revolve axis instead of Y)
//   reverse:  sweep the other way — only visibly different for angle < 360,
//             and depends on the native Manifold build accepting a negative
//             degrees value the same way; verify on a partial revolve before
//             relying on it.
export async function initRevolve(points, { segments = DEFAULT_SEGMENTS, angle = 360, axis = 'y', reverse = false } = {}) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('initRevolve requires at least 3 profile points')
  }

  const axisPoints = axis === 'x' ? points.map((p) => ({ x: p.y, y: p.x })) : points
  const degrees = reverse ? -Math.abs(angle) : Math.abs(angle)

  const ok = await NativeCSG.initStockFromProfile(
    flattenPoints(axisPoints),
    positiveInt(segments, DEFAULT_SEGMENTS),
    degrees
  )
  if (!ok) throw new Error('Native Manifold failed to revolve this profile — check every point has x >= 0 (or y >= 0 for X-axis revolve)')
  return getModel()
}

// ── Cut / join / intersect a single tool into the CURRENT stock ────────────

export async function cut(tool, transform) {
  return applyToolToStock(tool, transform, 'subtract')
}

export async function join(tool, transform) {
  return applyToolToStock(tool, transform, 'union')
}

export async function intersectWith(tool, transform) {
  return applyToolToStock(tool, transform, 'intersect')
}

async function applyToolToStock(tool, transform, operation) {
  if (!(tool instanceof THREE.BufferGeometry)) {
    throw new Error('Tool must be a THREE.BufferGeometry')
  }

  const toolData = geometryToManifold(tool)

  const result = await NativeCSG.applyMeshToolWithTransform(
    toolData.vertices,
    toolData.indices,
    ...transformArgs(transform),
    opCode(operation),
    0
  )

  if (!result?.vertices?.length) {
    throw new Error(`Manifold ${operation} returned an empty result`)
  }

  return manifoldToGeometry(result)
}

// Extrude a 2D profile (single loop or { outer, holes }) straight into a
// cutting tool and apply it to the current stock in one native call — e.g. a
// slotted or hex-profile hole, where the tool shape isn't one of the
// primitive generators above.
export async function cutExtrudedProfile(loops, depth, transform = {}) {
  const { points, loopSizes } = loopsToNativeArgs(loops)
  if (loopSizes.some((n) => n < 3)) throw new Error('Every loop in the profile needs at least 3 points')

  const t = { ...DEFAULT_TRANSFORM, ...transform }

  const result = await NativeCSG.applyExtrudeProfile(
    points,
    loopSizes,
    depth,
    t.tx, t.ty, t.tz,
    t.rx, t.ry, t.rz,
    0 // subtract
  )

  if (!result?.vertices?.length) {
    throw new Error('Manifold extrude-cut returned an empty result')
  }

  return manifoldToGeometry(result)
}

// Move the current native stock in place (e.g. after building an Extrude
// with reverse/symmetric, or for a future "move body" feature).
export async function translateModel(tx, ty, tz) {
  const ok = await NativeCSG.translateStock(tx, ty, tz)
  if (!ok) throw new Error('Native Manifold failed to translate the current model')
  return getModel()
}

// ── Batch cut/join/intersect — the fast path for hole patterns ─────────────
//
// tool:       ONE THREE.BufferGeometry, reused for every instance (e.g. a
//             single hole cylinder).
// transforms: array of per-instance transform objects, same shape as the
//             single-tool functions above — one entry per hole/feature.
// operation:  'subtract' | 'union' | 'intersect', applied to every instance.
//
// This is a SINGLE native call no matter how many instances you pass —
// cutting 50 holes this way is one JNI round-trip, not fifty.

export async function cutMany(tool, transforms, operation = 'subtract') {
  if (!(tool instanceof THREE.BufferGeometry)) {
    throw new Error('Tool must be a THREE.BufferGeometry')
  }

  if (!Array.isArray(transforms) || transforms.length === 0) {
    throw new Error('cutMany requires a non-empty array of transforms, one per instance')
  }

  const toolData = geometryToManifold(tool)

  const flatTransforms = new Array(transforms.length * 9)
  transforms.forEach((transform, i) => {
    const args = transformArgs(transform)
    for (let j = 0; j < 9; j++) flatTransforms[i * 9 + j] = args[j]
  })

  const result = await NativeCSG.applyMeshToolBatch(
    toolData.vertices,
    toolData.indices,
    flatTransforms,
    opCode(operation),
    0
  )

  if (!result?.vertices?.length) {
    throw new Error(`Manifold batch ${operation} returned an empty result`)
  }

  return manifoldToGeometry(result)
}

export async function joinMany(tool, transforms) {
  return cutMany(tool, transforms, 'union')
}

// ── Read / clear the current native stock ───────────────────────────────────

export async function getModel() {
  const result = await NativeCSG.getStock()
  const geometry = manifoldToGeometry(result)
  if (!geometry) throw new Error('Native stock is empty or invalid')
  return geometry
}

export async function resetModel() {
  await NativeCSG.resetStock()
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET NATIVE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export async function reset() {
  await NativeCSG.resetStock()
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT API
// ═══════════════════════════════════════════════════════════════════════════

export default {
  Box,
  Cylinder,
  Cone,
  Sphere,
  Torus,

  subtract,
  union,
  intersect,

  translate,
  rotate,
  scale,

  geometryToManifold,
  manifoldToGeometry,

  reset,

  // Stock-resident fast path
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
}