import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { NativeModules } from 'react-native'
import { useTextureLoader } from '../../../../assets/all_textures'
import { useFrame } from '@react-three/fiber/native'

const { NativeCSG } = NativeModules

/* ─────────────────────────────────────────────────────────────
   DEFAULT CONSTANTS
───────────────────────────────────────────────────────────── */

const DEFAULT_STOCK_RADIUS   = 12.5
const DEFAULT_STOCK_HEIGHT   = 40
const DEFAULT_STOCK_SEGMENTS = 64
const DEFAULT_STOCK_TYPE     = 'cylinder'

const DEFAULT_POSITION = Object.freeze([0, 0, -30])
const DEFAULT_ROTATION = Object.freeze([0, Math.PI / 2, 0])
const DEFAULT_CUTLIST  = Object.freeze([{
  geometry: new THREE.CylinderGeometry(5, 5, 120, 32),
  position: { x: 0, y: 0, z: 0 },
  subtract: true,
  enabled:  true,
  material: { color: '#888888', roughness: 0.2, metalness: 0.8 },
}])



/* ─────────────────────────────────────────────────────────────
   MERGE VERTICES
───────────────────────────────────────────────────────────── */

function mergeVertices(geometry, tolerance = 1e-4) {
  const pos     = geometry.getAttribute('position')
  const map     = new Map()
  const unique  = []
  const indices = []
  const invTol  = 1 / tolerance

  for (let i = 0; i < pos.count; i++) {
    const x   = pos.getX(i)
    const y   = pos.getY(i)
    const z   = pos.getZ(i)
    const key = `${Math.round(x * invTol)},${Math.round(y * invTol)},${Math.round(z * invTol)}`
    if (!map.has(key)) {
      map.set(key, unique.length / 3)
      unique.push(x, y, z)
    }
    indices.push(map.get(key))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(unique), 3))
  geo.setIndex(indices)
  return geo
}

/* ─────────────────────────────────────────────────────────────
   MAKE MANIFOLD SAFE
───────────────────────────────────────────────────────────── */

function makeManifoldSafe(geometry, mergeTolerance = 0.0001) {
  let geo = geometry.clone()
  if (geo.index !== null) geo = geo.toNonIndexed()
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  geo = mergeVertices(geo, mergeTolerance)

  const pos = geo.getAttribute('position')
  const idx = geo.index
  if (!idx) throw new Error('Invalid topology after mergeVertices')

  const vertices = Array.from(pos.array)
  const indices  = Array.from(idx.array)
  geo.dispose()
  return { vertices, indices }
}

/* ─────────────────────────────────────────────────────────────
   APPLY AUTO UVs
───────────────────────────────────────────────────────────── */

function applyAutoUVs(geometry) {
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  const box      = geometry.boundingBox
  const size     = new THREE.Vector3()
  box.getSize(size)

  const pos      = geometry.getAttribute('position')
  const uvs      = new Float32Array(pos.count * 2)
  const TWO_PI   = Math.PI * 2
  const invSizeY = size.y > 0 ? 1 / size.y : 0
  const minY     = box.min.y

  for (let i = 0; i < pos.count; i++) {
    const angle    = Math.atan2(pos.getZ(i), pos.getX(i))
    uvs[i * 2]     = (angle / TWO_PI + 0.5) % 1
    uvs[i * 2 + 1] = (pos.getY(i) - minY) * invSizeY
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}

/* ─────────────────────────────────────────────────────────────
   MATERIAL FACTORY
───────────────────────────────────────────────────────────── */

const _matCache = new Map()

function resolveMaterial(desc, textureLoader = () => null) {
  if (!desc) return null
  if (desc.isMaterial) return desc

  const key = JSON.stringify(desc)
  if (_matCache.has(key)) return _matCache.get(key)

  const params = {}
  if (desc.color     !== undefined) params.color     = new THREE.Color(desc.color)
  if (desc.roughness !== undefined) params.roughness = desc.roughness
  if (desc.metalness !== undefined) params.metalness = desc.metalness
  if (desc.wireframe !== undefined) params.wireframe = desc.wireframe
  if (desc.opacity   !== undefined) {
    params.opacity     = desc.opacity
    params.transparent = true
  }

  if (desc.map?.isTexture) {
    desc.map.wrapS = desc.map.wrapT = THREE.RepeatWrapping
    params.map = desc.map
  } else if (desc.texture) {
    const tex = textureLoader(desc.texture)   // <- must be a function
    if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; params.map = tex }
  }

  const mat = new THREE.MeshStandardMaterial(params)
  _matCache.set(key, mat)
  return mat
}

/* ─────────────────────────────────────────────────────────────
   BUILD GEOMETRY FROM NATIVE CSG RESULT
───────────────────────────────────────────────────────────── */

function buildGeoFromResult(result, faceColorMap = new Map(), stockMat) {
  if (!result?.vertices?.length || !result?.indices?.length) return null

  const positions = new Float32Array(result.vertices)
  const allIdx    = result.indices
  const faceIDs   = result.faceIDs
  const geo       = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  if (faceIDs?.length && faceColorMap.size > 0) {
    const matArray  = [stockMat]
    const idToIndex = new Map([[0, 0]])

    for (const [id, mat] of faceColorMap) {
      if (id === 0) continue
      idToIndex.set(id, matArray.length)
      matArray.push(mat)
    }

    const buckets  = new Array(matArray.length).fill(null).map(() => [])
    const triCount = allIdx.length / 3

    for (let t = 0; t < triCount; t++) {
      const id = faceIDs[t] ?? 0
      const mi = idToIndex.get(id) ?? 0
      const b  = buckets[mi]
      b.push(allIdx[t * 3], allIdx[t * 3 + 1], allIdx[t * 3 + 2])
    }

    let offset     = 0
    const combined = new Uint32Array(allIdx.length)
    for (let mi = 0; mi < buckets.length; mi++) {
      const b = buckets[mi]
      if (b.length > 0) {
        combined.set(b, offset)
        geo.addGroup(offset, b.length, mi)
        offset += b.length
      }
    }

    geo.setIndex(new THREE.BufferAttribute(combined, 1))
    geo.computeVertexNormals()
    applyAutoUVs(geo)
    return { geo, materials: matArray }
  }

  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(allIdx), 1))
  geo.computeVertexNormals()
  applyAutoUVs(geo)
  return { geo, materials: null }
}

/* ─────────────────────────────────────────────────────────────
   INIT STOCK
───────────────────────────────────────────────────────────── */

async function initStock({
  stockType = DEFAULT_STOCK_TYPE,
  radius    = DEFAULT_STOCK_RADIUS,
  height    = DEFAULT_STOCK_HEIGHT,
  segments  = DEFAULT_STOCK_SEGMENTS,
  width     = radius * 2,
  depth     = radius,
  profile   = null,
} = {}) {
  const safeNum  = (v, fb) => (typeof v === 'number' && isFinite(v) && v > 0) ? v : fb
  const r        = safeNum(radius,   DEFAULT_STOCK_RADIUS)
  const h        = safeNum(height,   DEFAULT_STOCK_HEIGHT)
  const s        = safeNum(segments, DEFAULT_STOCK_SEGMENTS)
  const w        = safeNum(width,    r * 2)
  const d        = safeNum(depth,    r)
  const resolved = typeof stockType === 'string' ? stockType : DEFAULT_STOCK_TYPE

  switch (resolved) {
    case 'box': {
      const ok = await NativeCSG.initStockBox(w, h, d)
      if (!ok) throw new Error(`initStock: initStockBox(${w},${h},${d}) failed`)
      break
    }
    case 'cylinder': {
      const ok = await NativeCSG.initStockCylinder(r, h, s)
      if (!ok) throw new Error(`initStock: initStockCylinder(${r},${h},${s}) failed`)
      break
    }
    case 'profile': {
      const halfH = h / 2
      const pts   = (Array.isArray(profile) && profile.length >= 6)
        ? profile : [0, -halfH, r, -halfH, r, halfH, 0, halfH]
      let ok = await NativeCSG.initStockFromProfile(pts, s)
      if (!ok) {
        console.warn('initStock: profile failed — falling back to cylinder')
        ok = await NativeCSG.initStockCylinder(r, h, s)
        if (!ok) throw new Error('initStock: profile + cylinder fallback both failed')
      }
      break
    }
    default: {
      console.warn(`initStock: unknown stockType "${resolved}" — falling back to cylinder`)
      const ok = await NativeCSG.initStockCylinder(r, h, s)
      if (!ok) throw new Error(`initStock: fallback cylinder(${r},${h},${s}) failed`)
      break
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   APPLY SINGLE CUT
───────────────────────────────────────────────────────────── */

async function applyCut(cut, mergeTolerance = 0.0001) {
  const i = cut.index ?? '?'

  if (!(cut.geometry instanceof THREE.BufferGeometry)) {
    console.warn(`Cut ${i}: invalid or missing geometry — skipped`)
    return null
  }

  let manifoldInput
  try {
    manifoldInput = makeManifoldSafe(cut.geometry, mergeTolerance)
  } catch (e) {
    console.warn(`Cut ${i}: makeManifoldSafe —`, e.message)
    return null
  }

  const tx = cut.position?.x ?? 0
  const ty = cut.position?.y ?? 0
  const tz = cut.position?.z ?? 0
  const rx = cut.rotation?.x ?? 0
  const ry = cut.rotation?.y ?? 0
  const rz = cut.rotation?.z ?? 0
  const sx = cut.scale?.x    ?? 1
  const sy = cut.scale?.y    ?? 1
  const sz = cut.scale?.z    ?? 1
  const op          = cut.subtract === false ? 1 : 0
  const hasMaterial = cut.material ? 1 : 0

  let result = null
  try {
    result = await NativeCSG.applyMeshToolWithTransform(
      manifoldInput.vertices, manifoldInput.indices,
      tx, ty, tz,
      rx, ry, rz,
      sx, sy, sz,
      op, hasMaterial,
    )
  } catch (e) {
    console.warn(`Cut ${i}: NativeCSG threw —`, e.message)
    return null
  }

  if (!result?.vertices?.length) {
    console.warn(`Cut ${i}: empty result from NativeCSG`)
    return null
  }

  return result
}

/* ─────────────────────────────────────────────────────────────
   FALLBACK MATERIAL  (module-level singleton)
───────────────────────────────────────────────────────────── */
const FALLBACK_MAT = new THREE.MeshStandardMaterial({ color: 0x888888 })

/* ─────────────────────────────────────────────────────────────
   COMPONENT

───────────────────────────────────────────────────────────── */

const StepWithCsg = ({
  stockType     = DEFAULT_STOCK_TYPE,
  stockRadius   = DEFAULT_STOCK_RADIUS,
  stockHeight   = DEFAULT_STOCK_HEIGHT,
  stockSegments = DEFAULT_STOCK_SEGMENTS,
  stockWidth    = stockRadius * 2,
  stockDepth    = stockRadius,
  stockProfile  = null,
  stockMaterial = null,
  cutList       = DEFAULT_CUTLIST,
  position      = DEFAULT_POSITION,
  rotation      = DEFAULT_ROTATION,
  animation     = null,
} = {}) => {

  const meshRef  = useRef()
  const hasBuilt = useRef(false)
  const stockMat = useRef(null)

  const [geo,       setGeo]       = useState(() => new THREE.BufferGeometry())
  const [materials, setMaterials] = useState(null)

  /* ── Texture loading ────────────────────────────────────────────────
     Stock: read stockMaterial.texture directly — no separate prop needed.
       stockMaterial={{ texture: 'steel', roughness: 0.2, metalness: 1 }}
                                 ↑ this key is used automatically
     'wood' is always loaded as the fallback (index 0 is stable).
     Cut materials: loadTexture falls back to wood for unknown keys.

     Rules of Hooks: two fixed useTextureLoader calls — never conditional,
     never in a loop. stockTexKey is a stable string derived from the prop.
  ─────────────────────────────────────────────────────────────────── */

  // Derive the stock texture key from stockMaterial — fallback to 'wood'
  const stockTexKey = (typeof stockMaterial?.texture === 'string' && stockMaterial.texture)
    ? stockMaterial.texture
    : 'wood'

  // Two fixed hook calls — 'wood' always loads, stock texture loads from key
  // When stockTexKey === 'wood' both hooks return the same texture (no waste)
  const woodTex     = useTextureLoader('wood')
  const stockTex    = useTextureLoader(stockTexKey)

  // Stable lookup function for cut materials — unknown keys fall back to wood
  const loadTexture = useCallback(
    (key) => {
      if (key === stockTexKey) return stockTex ?? woodTex
      if (key === 'wood')      return woodTex
      return woodTex   // fallback for any other key
    },
    [stockTexKey, stockTex, woodTex]
  )

  /* ── Stock material ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!woodTex) return
    stockMat.current?.dispose()

    if (stockMaterial) {
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
      const resolved = resolveMaterial(stockMaterial, loadTexture)
      stockMat.current = resolved ?? new THREE.MeshStandardMaterial({
        map: woodTex, roughness: 0.8, metalness: 0,
      })
    } else {
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
      stockMat.current = new THREE.MeshStandardMaterial({
        map: woodTex, roughness: 0.8, metalness: 0,
      })
    }
  }, [woodTex, stockMaterial, loadTexture])

  /* ── CSG rebuild trigger ─────────────────────────────────────────── */
  const stockKey = `${stockType}|${stockRadius}|${stockHeight}|${stockSegments}|${stockWidth}|${stockDepth}`

  useEffect(() => {
    if (!woodTex || !stockMat.current) return
    hasBuilt.current = false
  }, [stockKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Build ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!woodTex || !stockMat.current || hasBuilt.current) return
    hasBuilt.current = true
    let cancelled = false

    const build = async () => {
      try {
        await initStock({
          stockType, radius: stockRadius, height: stockHeight,
          segments: stockSegments, width: stockWidth,
          depth: stockDepth, profile: stockProfile,
        })

        if (cancelled) return

        const stockResult = await NativeCSG.getStock()
        if (!cancelled && stockResult?.vertices?.length) {
          const built = buildGeoFromResult(stockResult, new Map(), stockMat.current)
          if (built) {
            setGeo(prev => { prev?.dispose(); return built.geo })
            setMaterials(stockMat.current)
          }
        }

        const faceColorMap = new Map()

        for (let i = 0; i < cutList.length; i++) {
          if (cancelled) break

          const cut = cutList[i]
          if (cut.enabled === false) { console.log(`Cut ${i}: skipped`); continue }

          const result = await applyCut({ ...cut, index: i })
          if (!result || cancelled) continue

          if (cut.material && result.toolID > 0) {
            const mat = resolveMaterial(cut.material, loadTexture)
            if (mat) faceColorMap.set(result.toolID, mat)
          }

          const built = buildGeoFromResult(result, faceColorMap, stockMat.current)
          if (built && !cancelled) {
            setGeo(prev => { prev?.dispose(); return built.geo })
            setMaterials(built.materials ?? stockMat.current)
          }
        }

        if (!cancelled) await NativeCSG.resetStock()

      } catch (e) {
        if (!cancelled) console.error('CSG BUILD ERROR:', e)
      }
    }

    build()
    return () => { cancelled = true }

  }, [woodTex, stockKey, loadTexture]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Animation ───────────────────────────────────────────────────── */
  const animRef = useRef(null)
  useEffect(() => {
    animRef.current = (
      animation?.type === 'rotation' && ['x', 'y', 'z'].includes(animation.axis)
    ) ? { axis: animation.axis, speed: animation.speed ?? 0.01 } : null
  }, [animation?.type, animation?.axis, animation?.speed])

  useFrame(() => {
    if (animRef.current && meshRef.current) {
      meshRef.current.rotation[animRef.current.axis] += animRef.current.speed
    }
  })

  const renderMaterial = materials ?? stockMat.current ?? FALLBACK_MAT

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={renderMaterial}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    />
  )
}

export default StepWithCsg