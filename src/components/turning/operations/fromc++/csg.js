/**
 * CSG.js  —  Clean JS wrapper for the C++ Manifold CSG engine
 *
 * Gives you full control from JS:
 *   - Pass ANY THREE.BufferGeometry as stock or tool
 *   - Built-in helpers for cylinder / box / sphere tools
 *   - Persistent stock API for fast multi-pass CNC
 *
 * Usage:
 *   import CSG from './CSG'
 */

import { NativeModules } from 'react-native'
import * as THREE from 'three'

const { NativeCSG } = NativeModules

if (!NativeCSG) {
  console.error('[CSG] NativeCSG module not found — did you rebuild the Android app?')
}

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Extract flat vertex + index arrays from a THREE.BufferGeometry.
 * The geometry MUST be indexed. If it isn't, call toIndexed() first.
 */
function extractMesh(geometry) {
  // Auto-index if not already indexed
  let geo = geometry
  if (!geo.index) {
    // Create a simple sequential index
    const count = geo.getAttribute('position').count
    const indices = new Uint32Array(count)
    for (let i = 0; i < count; i++) indices[i] = i
    geo = geometry.clone()
    geo.setIndex(new THREE.BufferAttribute(indices, 1))
  }

  const pos = geo.getAttribute('position')
  const idx = geo.index

  // Convert typed arrays → plain JS arrays (required for RN bridge)
  const vertices = Array.from(pos.array)   // Float32Array → Array<number>
  const indices  = Array.from(idx.array)   // Uint16/32Array → Array<number>

  return { vertices, indices }
}

/**
 * Build a THREE.BufferGeometry from the result returned by C++.
 * Automatically recomputes vertex normals.
 */
function buildGeometry(result) {
  if (!result || !result.success) {
    throw new Error('[CSG] Operation failed: ' + (result?.error ?? 'unknown error'))
  }

  const geo = new THREE.BufferGeometry()

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(result.vertices, 3)
  )
  geo.setIndex(
    new THREE.BufferAttribute(new Uint32Array(result.indices), 1)
  )
  geo.computeVertexNormals()

  return geo
}

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

const CSG = {

  // ── One-shot operations (stateless) ──────────────────────────────────────

  /**
   * Boolean operation between ANY two geometries.
   *
   * @param {THREE.BufferGeometry} stockGeo   - workpiece
   * @param {THREE.BufferGeometry} toolGeo    - cutter
   * @param {'subtract'|'union'|'intersect'} op
   * @returns {Promise<THREE.BufferGeometry>}
   *
   * Example:
   *   const result = await CSG.boolean(cylinderStock, ballEndMill, 'subtract')
   */
  async boolean(stockGeo, toolGeo, op = 'subtract') {
    const opCode = { subtract: 0, union: 1, intersect: 2 }[op] ?? 0
    const { vertices: sv, indices: si } = extractMesh(stockGeo)
    const { vertices: tv, indices: ti } = extractMesh(toolGeo)
    const result = await NativeCSG.subtractMesh(sv, si, tv, ti, opCode)
    return buildGeometry(result)
  },

  /**
   * Subtract a CYLINDER from any stock geometry.
   *
   * @param {THREE.BufferGeometry} stockGeo
   * @param {{ radius: number, height: number, segments?: number }} tool
   * @param {{ x?: number, y?: number, z?: number }} position  - centre of cylinder
   * @returns {Promise<THREE.BufferGeometry>}
   *
   * Example:
   *   const result = await CSG.subtractCylinder(
   *     stockGeo,
   *     { radius: 5, height: 20 },
   *     { x: 0, y: 10, z: 0 }
   *   )
   */
  async subtractCylinder(stockGeo, { radius, height, segments = 0 }, { x = 0, y = 0, z = 0 } = {}) {
    const { vertices, indices } = extractMesh(stockGeo)
    const result = await NativeCSG.subtractShape(
      vertices, indices,
      0,               // shapeType = cylinder
      radius, height, segments,
      x, y, z
    )
    return buildGeometry(result)
  },

  /**
   * Subtract a BOX from any stock geometry.
   *
   * @param {THREE.BufferGeometry} stockGeo
   * @param {{ width: number, height: number, depth: number }} tool
   * @param {{ x?: number, y?: number, z?: number }} position  - centre of box
   * @returns {Promise<THREE.BufferGeometry>}
   */
  async subtractBox(stockGeo, { width, height, depth }, { x = 0, y = 0, z = 0 } = {}) {
    const { vertices, indices } = extractMesh(stockGeo)
    const result = await NativeCSG.subtractShape(
      vertices, indices,
      1,               // shapeType = box
      width, height, depth,
      x, y, z
    )
    return buildGeometry(result)
  },

  /**
   * Subtract a SPHERE from any stock geometry.
   *
   * @param {THREE.BufferGeometry} stockGeo
   * @param {{ radius: number, segments?: number }} tool
   * @param {{ x?: number, y?: number, z?: number }} position
   * @returns {Promise<THREE.BufferGeometry>}
   */
  async subtractSphere(stockGeo, { radius, segments = 0 }, { x = 0, y = 0, z = 0 } = {}) {
    const { vertices, indices } = extractMesh(stockGeo)
    const result = await NativeCSG.subtractShape(
      vertices, indices,
      2,               // shapeType = sphere
      radius, segments, 0,
      x, y, z
    )
    return buildGeometry(result)
  },


  // ── Persistent stock API (best for multi-pass CNC) ────────────────────────
  //
  //  Stock is stored in C++ memory — only the (small) tool mesh crosses
  //  the JS→native boundary on each pass. Much faster for 100s of passes.

  /**
   * Upload stock geometry to C++ once.
   * Call this at the start of your simulation.
   *
   * @param {THREE.BufferGeometry} stockGeo
   *
   * Example:
   *   await CSG.initStock(new THREE.CylinderGeometry(20, 20, 80, 64))
   */
  async initStock(stockGeo) {
    const { vertices, indices } = extractMesh(stockGeo)
    await NativeCSG.initStock(vertices, indices)
  },

  /**
   * Subtract ANY tool geometry from persistent stock.
   * Returns the updated stock geometry.
   *
   * @param {THREE.BufferGeometry} toolGeo
   * @returns {Promise<THREE.BufferGeometry>}
   *
   * Example:
   *   const updated = await CSG.applyToolMesh(myCustomToolGeo)
   */
  async applyToolMesh(toolGeo) {
    const { vertices, indices } = extractMesh(toolGeo)
    const result = await NativeCSG.applyToolMesh(vertices, indices)
    return buildGeometry(result)
  },

  /**
   * Subtract a cylinder from persistent stock.
   * Returns updated stock geometry.
   *
   * Example:
   *   const updated = await CSG.applyShape.cylinder(
   *     { radius: 3, height: 10 },
   *     { x: 0, y: 20, z: 0 }
   *   )
   */
  applyShape: {
    async cylinder({ radius, height, segments = 0 }, { x = 0, y = 0, z = 0 } = {}) {
      const result = await NativeCSG.applyShape(0, radius, height, segments, x, y, z)
      return buildGeometry(result)
    },
    async box({ width, height, depth }, { x = 0, y = 0, z = 0 } = {}) {
      const result = await NativeCSG.applyShape(1, width, height, depth, x, y, z)
      return buildGeometry(result)
    },
    async sphere({ radius, segments = 0 }, { x = 0, y = 0, z = 0 } = {}) {
      const result = await NativeCSG.applyShape(2, radius, segments, 0, x, y, z)
      return buildGeometry(result)
    },
  },

  /**
   * Get the current persistent stock mesh without modifying it.
   * Useful to render the current state mid-simulation.
   *
   * @returns {Promise<THREE.BufferGeometry>}
   */
  async getStock() {
    const result = await NativeCSG.getStock()
    return buildGeometry(result)
  },

  /**
   * Reset / clear the persistent stock.
   * Call before starting a new simulation.
   */
  async resetStock() {
    await NativeCSG.resetStock()
  },
}

export default CSG


// ════════════════════════════════════════════════════════════════════════════
//  USAGE EXAMPLES  (copy any of these into your components)
// ════════════════════════════════════════════════════════════════════════════

/*

import CSG from './CSG'
import * as THREE from 'three'

// ─── Example 1: One-shot — any stock + any tool ───────────────────────────
const stock   = new THREE.CylinderGeometry(20, 20, 80, 64)
const toolGeo = new THREE.SphereGeometry(8, 32, 32)
toolGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 30, 0))

const result = await CSG.boolean(stock, toolGeo, 'subtract')
// result is a THREE.BufferGeometry — render it directly


// ─── Example 2: Built-in shapes ──────────────────────────────────────────
const stock2 = new THREE.BoxGeometry(40, 40, 40)

// Drill a cylinder hole
const drilled = await CSG.subtractCylinder(
  stock2,
  { radius: 5, height: 50 },    // tool size
  { x: 0, y: 0, z: 0 }          // tool position
)


// ─── Example 3: Multi-pass CNC (persistent stock = fastest) ───────────────
const rawStock = new THREE.CylinderGeometry(25, 25, 100, 64)

// Upload stock once to C++
await CSG.initStock(rawStock)

// Run all passes — stock stays in C++ memory the whole time
for (const pass of toolpathArray) {
  const geo = await CSG.applyShape.cylinder(
    { radius: pass.toolRadius, height: pass.depth },
    { x: pass.x, y: pass.y, z: pass.z }
  )
  updateRenderMesh(geo)   // swap the displayed mesh
}

// When done
await CSG.resetStock()


// ─── Example 4: Chain operations manually ────────────────────────────────
let current = new THREE.CylinderGeometry(20, 20, 80, 64)

current = await CSG.subtractCylinder(current, { radius: 5, height: 40 }, { x: 0, y: 0,  z: 0 })
current = await CSG.subtractCylinder(current, { radius: 3, height: 80 }, { x: 0, y: 0,  z: 0 })
current = await CSG.subtractBox(current,      { width: 30, height: 4, depth: 30 }, { x: 0, y: 38, z: 0 })

// current = final machined geometry

*/