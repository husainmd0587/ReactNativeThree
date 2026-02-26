import * as THREE from 'three'
import StepWithCsg from '../stepTurningCSG'

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const deg = (d) => d * (Math.PI / 180)

/* ─────────────────────────────────────────────────────────────
   EXTERNAL THREAD PROFILES
   X axis: negative = outward from shank surface (cut direction)
   Y axis: axial along bolt
───────────────────────────────────────────────────────────── */
const THREAD_PROFILES = {

  // ISO METRIC (M series) — 60° V-thread, most common worldwide
  metric: ({ depth, pitch }) => {
    const h    = depth
    const w    = pitch * 0.5 * 0.866
    const flat = pitch * 0.125
    return [
      new THREE.Vector2( flat * 0.5,   -w - flat * 0.5),
      new THREE.Vector2(-h,             0              ),
      new THREE.Vector2( flat * 0.5,    w + flat * 0.5),
      new THREE.Vector2( depth + flat,  w + flat * 0.5),
      new THREE.Vector2( depth + flat, -w - flat * 0.5),
    ]
  },

  // ACME — 29° included angle, workhorse power thread
  // Used in: lead screws, vises, C-clamps, linear actuators
  acme: ({ depth, pitch }) => {
    const h      = depth
    const flank  = Math.tan(deg(14.5)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,    -wRoot  * 0.5),
      new THREE.Vector2(-h,    -wCrest * 0.5),
      new THREE.Vector2(-h,     wCrest * 0.5),
      new THREE.Vector2( 0,     wRoot  * 0.5),
      new THREE.Vector2( pad,   wRoot  * 0.5),
      new THREE.Vector2( pad,  -wRoot  * 0.5),
    ]
  },

  // BUTTRESS — asymmetric: shallow load flank (7°), steep clearance flank (45°)
  // Used in: artillery breeches, high-pressure vessels, pipe couplings, rock drill rods
  buttress: ({ depth, pitch }) => {
    const halfPitch  = pitch * 0.5
    const clearAngle = 45
    const loadAngle  = 7
    const maxDepth   = halfPitch / Math.tan(deg(clearAngle))
    const h          = Math.min(depth, maxDepth * 0.95)
    const clearFlank = Math.tan(deg(clearAngle)) * h
    const loadFlank  = Math.tan(deg(loadAngle))  * h
    const pad        = depth * 0.3
    return [
      new THREE.Vector2(  pad,        -halfPitch            ),
      new THREE.Vector2( -h,          -halfPitch + loadFlank ),
      new THREE.Vector2( -h,           halfPitch - clearFlank),
      new THREE.Vector2(  pad,         halfPitch             ),
      new THREE.Vector2(  pad + depth, halfPitch             ),
      new THREE.Vector2(  pad + depth,-halfPitch             ),
    ]
  },

  // SQUARE THREAD — 90° flanks, equal tooth/space width
  // Zero radial force, max efficiency, no self-locking
  // Used in: vises, presses, jack screws, old machine tools
  square: ({ depth, pitch }) => {
    const h     = depth
    const halfT = pitch * 0.25
    const pad   = depth * 0.25
    return [
      new THREE.Vector2( pad,        -halfT),
      new THREE.Vector2(-h,          -halfT),
      new THREE.Vector2(-h,           halfT),
      new THREE.Vector2( pad,         halfT),
      new THREE.Vector2( pad + h,     halfT),
      new THREE.Vector2( pad + h,    -halfT),
    ]
  },

  // KNUCKLE / ROUNDED THREAD (DIN 405) — sinusoidal profile
  // Durable under shock/vibration, self-cleaning in dirty environments
  // Used in: rail couplings, light-bulb bases, fire hose couplings, bottle caps
  knuckle: ({ depth, pitch }) => {
    const h     = depth
    const steps = 12
    const pts   = []
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps
      const py = (t - 0.5) * pitch
      const px = -h * 0.5 * (1 - Math.cos(t * Math.PI * 2))
      pts.push(new THREE.Vector2(px, py))
    }
    pts.push(new THREE.Vector2( depth * 0.3,  pitch * 0.5))
    pts.push(new THREE.Vector2( depth * 0.3, -pitch * 0.5))
    return pts
  },

  // ISO TRAPEZOIDAL (DIN 103) — 30° included angle (15° per flank)
  // European equivalent of ACME; more self-locking
  // Used in: CNC machines, measuring instruments, valve stems, European lead screws
  trapezoidal: ({ depth, pitch }) => {
    const h      = depth
    const flank  = Math.tan(deg(15)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,   -wRoot  * 0.5),
      new THREE.Vector2(-h,   -wCrest * 0.5),
      new THREE.Vector2(-h,    wCrest * 0.5),
      new THREE.Vector2( 0,    wRoot  * 0.5),
      new THREE.Vector2( pad,  wRoot  * 0.5),
      new THREE.Vector2( pad, -wRoot  * 0.5),
    ]
  },

  // STUB ACME — shallower ACME (approx 0.3x pitch depth)
  // Same 29° flanks as ACME but shorter; fits where axial space is limited
  // Used in: machinery with limited hub depth, quick-disconnect mechanisms
  stubAcme: ({ depth, pitch }) => {
    const h      = depth * 0.6
    const flank  = Math.tan(deg(14.5)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,   -wRoot  * 0.5),
      new THREE.Vector2(-h,   -wCrest * 0.5),
      new THREE.Vector2(-h,    wCrest * 0.5),
      new THREE.Vector2( 0,    wRoot  * 0.5),
      new THREE.Vector2( pad,  wRoot  * 0.5),
      new THREE.Vector2( pad, -wRoot  * 0.5),
    ]
  },

  // UNIFIED NATIONAL (UN / UNC / UNF) — 60° V-thread, p/8 crest flat, p/4 root flat
  // America's standard fastener thread
  // Used in: virtually all US standard fasteners (bolts, screws, nuts)
  unified: ({ depth, pitch }) => {
    const h     = depth
    const w     = pitch * 0.5 * Math.tan(deg(30))
    const flat  = pitch / 8
    const rFlat = pitch / 4
    return [
      new THREE.Vector2( rFlat * 0.5,  -w + rFlat * 0.5),
      new THREE.Vector2(-h,             0              ),
      new THREE.Vector2( rFlat * 0.5,   w - rFlat * 0.5),
      new THREE.Vector2( depth + flat,  w + flat * 0.5),
      new THREE.Vector2( depth + flat, -w - flat * 0.5),
    ]
  },

  // WHITWORTH (BSW) — 55° included angle, rounded roots & crests (r = 0.1373 x pitch)
  // British standard, still used in plumbing, vintage machinery, aerospace legacy
  // Used in: UK/Commonwealth plumbing fittings, BSP pipe threads, classic British motorcycles
  whitworth: ({ depth, pitch }) => {
    const h        = depth
    const angle    = deg(27.5)
    const w        = pitch * 0.5 * Math.tan(angle)
    const r        = pitch * 0.1373
    const pad      = depth * 0.2
    const arcPts   = []
    const arcSteps = 5
    for (let i = 0; i <= arcSteps; i++) {
      const a  = Math.PI + (i / arcSteps) * Math.PI
      const ax = -h + r + Math.cos(a) * r
      const ay =         Math.sin(a) * r
      arcPts.push(new THREE.Vector2(ax, ay))
    }
    return [
      new THREE.Vector2( pad,          -w - pad),
      new THREE.Vector2(-h + r,        -r      ),
      ...arcPts,
      new THREE.Vector2(-h + r,         r      ),
      new THREE.Vector2( pad,           w + pad),
      new THREE.Vector2( pad + depth,   w + pad),
      new THREE.Vector2( pad + depth,  -w - pad),
    ]
  },

}

/* ─────────────────────────────────────────────────────────────
   INTERNAL THREAD PROFILES
   X axis: positive = inward toward bore axis (cuts INTO bore wall)
   Y axis: axial (same as external)

   FIX: Profile extends from boreRadius outward into wall material.
        The helix sweeps at boreRadius; positive X reaches into the wall.
───────────────────────────────────────────────────────────── */
const INTERNAL_THREAD_PROFILES = {

  metric: ({ depth, pitch }) => {
    const h    = depth
    const w    = pitch * 0.5 * 0.866
    const flat = pitch * 0.125
    return [
      new THREE.Vector2(-flat * 0.5,   -w - flat * 0.5),
      new THREE.Vector2( h,             0              ),   // apex points INTO wall
      new THREE.Vector2(-flat * 0.5,    w + flat * 0.5),
      new THREE.Vector2(-depth - flat,  w + flat * 0.5),
      new THREE.Vector2(-depth - flat, -w - flat * 0.5),
    ]
  },

  acme: ({ depth, pitch }) => {
    const h      = depth
    const flank  = Math.tan(deg(14.5)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,   -wRoot  * 0.5),
      new THREE.Vector2( h,   -wCrest * 0.5),
      new THREE.Vector2( h,    wCrest * 0.5),
      new THREE.Vector2( 0,    wRoot  * 0.5),
      new THREE.Vector2(-pad,  wRoot  * 0.5),
      new THREE.Vector2(-pad, -wRoot  * 0.5),
    ]
  },

  buttress: ({ depth, pitch }) => {
    const halfPitch  = pitch * 0.5
    const clearAngle = 45
    const loadAngle  = 7
    const maxDepth   = halfPitch / Math.tan(deg(clearAngle))
    const h          = Math.min(depth, maxDepth * 0.95)
    const clearFlank = Math.tan(deg(clearAngle)) * h
    const loadFlank  = Math.tan(deg(loadAngle))  * h
    const pad        = depth * 0.3
    return [
      new THREE.Vector2(-pad,          -halfPitch            ),
      new THREE.Vector2( h,            -halfPitch + loadFlank ),
      new THREE.Vector2( h,             halfPitch - clearFlank),
      new THREE.Vector2(-pad,           halfPitch             ),
      new THREE.Vector2(-pad - depth,   halfPitch             ),
      new THREE.Vector2(-pad - depth,  -halfPitch             ),
    ]
  },

  square: ({ depth, pitch }) => {
    const halfT = pitch * 0.25
    const pad   = depth * 0.25
    return [
      new THREE.Vector2(-pad,          -halfT),
      new THREE.Vector2( depth,        -halfT),
      new THREE.Vector2( depth,         halfT),
      new THREE.Vector2(-pad,           halfT),
      new THREE.Vector2(-pad - depth,   halfT),
      new THREE.Vector2(-pad - depth,  -halfT),
    ]
  },

  knuckle: ({ depth, pitch }) => {
    const h     = depth
    const steps = 12
    const pts   = []
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps
      const py = (t - 0.5) * pitch
      const px =  h * 0.5 * (1 - Math.cos(t * Math.PI * 2))  // positive = into wall
      pts.push(new THREE.Vector2(px, py))
    }
    pts.push(new THREE.Vector2(-depth * 0.3,  pitch * 0.5))
    pts.push(new THREE.Vector2(-depth * 0.3, -pitch * 0.5))
    return pts
  },

  trapezoidal: ({ depth, pitch }) => {
    const h      = depth
    const flank  = Math.tan(deg(15)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,   -wRoot  * 0.5),
      new THREE.Vector2( h,   -wCrest * 0.5),
      new THREE.Vector2( h,    wCrest * 0.5),
      new THREE.Vector2( 0,    wRoot  * 0.5),
      new THREE.Vector2(-pad,  wRoot  * 0.5),
      new THREE.Vector2(-pad, -wRoot  * 0.5),
    ]
  },

  stubAcme: ({ depth, pitch }) => {
    const h      = depth * 0.6
    const flank  = Math.tan(deg(14.5)) * h
    const wRoot  = pitch * 0.5
    const wCrest = wRoot - 2 * flank
    const pad    = depth * 0.25
    return [
      new THREE.Vector2( 0,   -wRoot  * 0.5),
      new THREE.Vector2( h,   -wCrest * 0.5),
      new THREE.Vector2( h,    wCrest * 0.5),
      new THREE.Vector2( 0,    wRoot  * 0.5),
      new THREE.Vector2(-pad,  wRoot  * 0.5),
      new THREE.Vector2(-pad, -wRoot  * 0.5),
    ]
  },

  unified: ({ depth, pitch }) => {
    const h     = depth
    const w     = pitch * 0.5 * Math.tan(deg(30))
    const flat  = pitch / 8
    const rFlat = pitch / 4
    return [
      new THREE.Vector2(-rFlat * 0.5,   -w + rFlat * 0.5),
      new THREE.Vector2( h,              0              ),
      new THREE.Vector2(-rFlat * 0.5,    w - rFlat * 0.5),
      new THREE.Vector2(-depth - flat,   w + flat * 0.5),
      new THREE.Vector2(-depth - flat,  -w - flat * 0.5),
    ]
  },

  whitworth: ({ depth, pitch }) => {
    const angle    = deg(27.5)
    const w        = pitch * 0.5 * Math.tan(angle)
    const r        = pitch * 0.1373
    const pad      = depth * 0.2
    const arcPts   = []
    const arcSteps = 5
    for (let i = 0; i <= arcSteps; i++) {
      const a  = Math.PI + (i / arcSteps) * Math.PI
      arcPts.push(new THREE.Vector2(depth - r + Math.cos(a) * r, Math.sin(a) * r))
    }
    return [
      new THREE.Vector2(-pad,           -w - pad),
      new THREE.Vector2( depth - r,     -r      ),
      ...arcPts,
      new THREE.Vector2( depth - r,      r      ),
      new THREE.Vector2(-pad,            w + pad),
      new THREE.Vector2(-pad - depth,    w + pad),
      new THREE.Vector2(-pad - depth,   -w - pad),
    ]
  },

}

/* ─────────────────────────────────────────────────────────────
   BUILD MANIFOLD HELIX SOLID
   Shared by both external and internal thread builders.
   profilePoints: pass pre-built profile to bypass THREAD_PROFILES lookup.
───────────────────────────────────────────────────────────── */
function buildManifoldHelixSolid({
  shankRadius,
  pitch,
  depth,
  turns,
  type          = 'metric',
  pathSegments  = null,
  profilePoints = null,
  invertRadial  = false,
}) {
  const profileFn = THREAD_PROFILES[type] ?? THREAD_PROFILES.metric
  const profile   = profilePoints ?? profileFn({ depth, pitch })
  const pCount    = profile.length

  const steps  = pathSegments ?? Math.ceil(turns * 90)
  const rings  = steps + 1
  const height = turns * pitch

  const positions = []
  const uvs       = []
  const indices   = []

  /* ── Sweep rings along helix ──────────────────────────── */
  for (let s = 0; s < rings; s++) {
    const t     = s / steps
    const angle = t * Math.PI * 2 * turns
    const y     = t * height 

    const cx = Math.cos(angle) * shankRadius
    const cz = Math.sin(angle) * shankRadius

    const dt   = 1 / (steps * 10)
    const a1   = (t + dt) * Math.PI * 2 * turns
    const a0   = (t - dt) * Math.PI * 2 * turns
    const tx   = Math.cos(a1) * shankRadius - Math.cos(a0) * shankRadius
    const ty   = dt * 2 * height
    const tz   = Math.sin(a1) * shankRadius - Math.sin(a0) * shankRadius
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz)

    const Tang = new THREE.Vector3(tx / tLen, ty / tLen, tz / tLen)
    const Rad  = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
    const radSign = invertRadial ? -1 : 1   // ← ADD THIS
    const Up   = new THREE.Vector3().crossVectors(Tang, Rad).normalize()

    for (let p = 0; p < pCount; p++) {
      const px = profile[p].x
      const py = profile[p].y
      positions.push(
     cx + Rad.x * px * radSign + Up.x * py,   // ← radSign
     y  + Rad.y * px * radSign + Up.y * py,   // ← radSign
     cz + Rad.z * px * radSign + Up.z * py,   // ← radSign
      )
      uvs.push(p / pCount, t)
    }
  }

  /* ── Stitch rings ─────────────────────────────────────── */
  for (let s = 0; s < steps; s++) {
    for (let p = 0; p < pCount; p++) {
      const next = (p + 1) % pCount
      const a = s       * pCount + p
      const b = s       * pCount + next
      const c = (s + 1) * pCount + p
      const d = (s + 1) * pCount + next
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  /* ── Start cap ────────────────────────────────────────── */
  let cx0 = 0, cy0 = 0, cz0 = 0
  for (let p = 0; p < pCount; p++) {
    cx0 += positions[p * 3]
    cy0 += positions[p * 3 + 1]
    cz0 += positions[p * 3 + 2]
  }
  const startCapIdx = positions.length / 3
  positions.push(cx0 / pCount, cy0 / pCount, cz0 / pCount)
  uvs.push(0.5, 0)
  for (let p = 0; p < pCount; p++) {
    indices.push(startCapIdx, p, (p + 1) % pCount)
  }

  /* ── End cap ──────────────────────────────────────────── */
  const baseIdx = steps * pCount
  let cxN = 0, cyN = 0, czN = 0
  for (let p = 0; p < pCount; p++) {
    cxN += positions[(baseIdx + p) * 3]
    cyN += positions[(baseIdx + p) * 3 + 1]
    czN += positions[(baseIdx + p) * 3 + 2]
  }
  const endCapIdx = positions.length / 3
  positions.push(cxN / pCount, cyN / pCount, czN / pCount)
  uvs.push(0.5, 1)
  for (let p = 0; p < pCount; p++) {
    indices.push(endCapIdx, baseIdx + (p + 1) % pCount, baseIdx + p)
  }

  /* ── Build geometry ───────────────────────────────────── */
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API — EXTERNAL THREADS (bolts, screws, studs)
───────────────────────────────────────────────────────────── */
export function buildThreadCuts({
  shankRadius,
  pitch        = 1.5,
  depth        = 0.8,
  length,
  startY       = 0,
  type         = 'metric',
  pathSegments = null,
  chamfer      = true,
  material     = { roughness: 0.15, metalness: 0.95 },
  shankLength=null
} = {}) {
  if (!shankRadius || !length) {
    throw new Error('buildThreadCuts: shankRadius and length are required')
  }

  const safeDepth = depth >= shankRadius
    ? (() => { console.warn(`buildThreadCuts: depth ${depth} exceeds shankRadius ${shankRadius}, clamping.`); return shankRadius * 0.8 })()
    : depth

  const turns = length / pitch
  const cuts  = []

  cuts.push({
    geometry: buildManifoldHelixSolid({
      shankRadius,
      pitch,
      depth: safeDepth,
      turns,
      type,
      pathSegments,
    }),
    position: { x: 0, y: startY, z: 0 },
    subtract: true,
    enabled:  true,
    material,
  })

  if (chamfer) {
    const chamferH = pitch * 2
    cuts.push({
      geometry: new THREE.CylinderGeometry(shankRadius + safeDepth,0, chamferH, 32),
      position: { x: 0, y: shankLength/2 , z: 0 },
      subtract: true,
      enabled:  true,
      material,
    })
  }

  return cuts
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API — INTERNAL THREADS (nuts, tapped holes)

   FIX NOTES:
   - chamfer defaults to FALSE — nut factory handles chamfer sizing
     precisely so it doesn't swallow thread geometry
   - boreRadius is the sweep center; profile X > 0 cuts INTO the wall
   - safeDepth hard-clamped to boreRadius * 0.6 to prevent blowthrough
───────────────────────────────────────────────────────────── */
export function buildInternalThreadCuts({
  boreRadius,
  pitch        = 1.5,
  depth        = 0.8,
  length,
  startY       = 0,
  type         = 'metric',
  pathSegments = null,
  chamfer      = false,
  material     = { roughness: 0.15, metalness: 0.95 },
} = {}) {
  if (!boreRadius || !length) {
    throw new Error('buildInternalThreadCuts: boreRadius and length are required')
  }

  const safeDepth = Math.min(depth, boreRadius * 0.6)

  const profileFn = INTERNAL_THREAD_PROFILES[type] ?? INTERNAL_THREAD_PROFILES.metric
  const profile   = profileFn({ depth: safeDepth, pitch })
  const turns     = length / pitch
  const cuts      = []

  cuts.push({
    geometry: buildManifoldHelixSolid({
      shankRadius:   boreRadius,
      pitch,
      depth:         safeDepth,
      turns,
      type:          '__custom__',   // bypass external profile lookup
      pathSegments,
      profilePoints: profile,        // pre-built internal profile passed directly
      invertRadial:  true, 
    }),
    position: { x: 0, y: -length / 2 - startY, z: 0 },
    subtract: true,
    enabled:  true,
    material,
  })

  return cuts
}

/* ─────────────────────────────────────────────────────────────
   AUTO DEPTH RESOLVER — shared by bolt and nut factories
───────────────────────────────────────────────────────────── */
function resolveDepth(threadDepth, threadType, threadPitch) {
  if (threadDepth !== null && threadDepth !== undefined) return threadDepth
  switch (threadType) {
    case 'acme':        return threadPitch * 0.5
    case 'buttress':    return threadPitch * 0.9
    case 'square':      return threadPitch * 0.5
    case 'trapezoidal': return threadPitch * 0.46
    case 'stubAcme':    return threadPitch * 0.3
    case 'knuckle':     return threadPitch * 0.35
    default:            return threadPitch * 0.6134  // ISO metric / unified / whitworth
  }
}

/* ─────────────────────────────────────────────────────────────
   BOLT FACTORY
───────────────────────────────────────────────────────────── */
function makeBoltComponent({
  shankR         = 5,
  headR          = 9,
  headH          = 6,
  length         = 40,
  threadDepth    = null,
  threadPitch    = 1.5,
  threadType     = 'metric',
  threadedLength = null,  // resolved inside factory (scope-safe default)
} = {}) {
  const tLen          = threadedLength ?? length * 0.7
  const shankLength   = length - headH
  const threadStartY  = -(shankLength / 2) + tLen / 2
  const resolvedDepth = resolveDepth(threadDepth, threadType, threadPitch)

  const headAddition = {
    geometry: new THREE.CylinderGeometry(headR, headR, headH, 6),
    position: { x: 0, y: -shankLength/2 - headH/2, z: 0 },
    subtract: false,
    enabled:  true,
    material: { texture: 'steel', roughness: 0.2, metalness: 0.1 },
  }

  const hexSocket = {
    geometry: new THREE.CylinderGeometry(headR * 0.2, headR * 0.2, headH * 2.55, 10),
    position: { x: 0, y: shankLength/2 - headH*1.5 / 2, z: 0 },
    rotation: { x: deg(0), y: 0, z: deg(90) },
    subtract: true,
    enabled:  true,
    material: { texture: 'steel', roughness: 0.3, metalness: 0.2 },
  }

  const threadCuts = buildThreadCuts({
    shankRadius: shankR,
    pitch:       threadPitch,
    depth:       resolvedDepth,
    length:      tLen,
    startY:      threadStartY,
    type:        threadType,
    chamfer:     true,
    material:    { roughness: 0.15, metalness: 0.85 },
    shankLength,
  })

  const cutList = [headAddition, ...threadCuts, hexSocket]

  function BoltMesh(props) {
    return (
      <StepWithCsg
        stockType="cylinder"
        stockRadius={shankR}
        stockHeight={shankLength}
        stockMaterial={{ texture: 'steel', roughness: 0.2, metalness: 0.1 }}
        stockSegments={64}
        cutList={cutList}
        {...props}
      />
    )
  }

  BoltMesh.displayName = `Bolt_M${shankR * 2}x${length}_${threadType}`
  return BoltMesh
}

/* ─────────────────────────────────────────────────────────────
   NUT / TAPPED-HOLE FACTORY

   FIX: cutList order is critical —
     1. bore hole FIRST  → creates the hollow cavity
     2. thread cuts      → carve helical grooves into bore wall
     3. entry chamfer    → small tight cone at opening (guide bolt in)
     4. outer chamfers   → bevel the hex body corners top & bottom

   hexSides: 6 = standard hex nut
             4 = square nut
            32 = round flanged / lock nut
───────────────────────────────────────────────────────────── */
function makeNutComponent({
  boreR       = 5,
  bodyR       = 9,
  height      = 8,
  threadDepth = null,
  threadPitch = 1.5,
  threadType  = 'metric',
  hexSides    = 6,
} = {}) {
  const resolvedDepth = resolveDepth(threadDepth, threadType, threadPitch)

  // ① BORE — must be first so hollow wall material exists for thread cuts
  const bore = {
    geometry: new THREE.CylinderGeometry(boreR, boreR, height * 2.2, 32),
    position: { x: 0, y: 0, z: 0 },
    subtract: true,
    enabled:  true,
    material: { roughness: 0.2, metalness: 0.8 },
  }

  // ② INTERNAL THREAD CUTS — helix at boreRadius, cuts INTO wall by resolvedDepth
  const threadCuts = buildInternalThreadCuts({
    boreRadius: boreR,
    pitch:      threadPitch,
    depth:      resolvedDepth,
    length:     height * 0.9,   // slightly shorter than body — prevents end blowout
    startY:     0,
    type:       threadType,
    chamfer:    false,
    material:   { roughness: 0.12, metalness: 0.5 },
  })

  // ③ ENTRY CHAMFER — tight cone at bore opening to guide mating bolt
  //    Only 1.5 pitch tall so it does not consume thread length
  const entryChamfer = {
    geometry: new THREE.CylinderGeometry(
      boreR + resolvedDepth,  // wide at entry face
      boreR * 0.85,           // narrows just inside bore
      threadPitch * 1.5,
      32
    ),
    position: { x: 0, y: height / 2 - threadPitch * 0.5, z: 0 },
    subtract: true,
    enabled:  true,
    material: { roughness: 0.2, metalness: 0.5 },
  }

  // ④ OUTER BODY CHAMFERS — bevel top and bottom hex face edges
  const outerTopChamfer = {
    geometry: new THREE.CylinderGeometry(bodyR + 1, bodyR - 1.5, 2, hexSides),
    position: { x: 0, y:  height / 2 + 0.8, z: 0 },
    subtract: true,
    enabled:  true,
    material: { roughness: 0.2, metalness: 0.5 },
  }
  const outerBotChamfer = {
    geometry: new THREE.CylinderGeometry(bodyR - 1.5, bodyR + 1, 2, hexSides),
    position: { x: 0, y: -height / 2 - 2, z: 0 },
    subtract: true,
    enabled:  true,
    material: { roughness: 0.2, metalness: 0.5 },
  }

  // Order matters: bore → threads → chamfers
  const cutList = [bore, ...threadCuts, entryChamfer, outerTopChamfer, outerBotChamfer]

  function NutMesh(props) {
    return (
      <StepWithCsg
        stockType="cylinder"
        stockRadius={bodyR}
        stockHeight={height}
        stockMaterial={{ texture: 'steel', roughness: 0.25, metalness: 0.6 }}
        stockSegments={hexSides}
        cutList={cutList}
        {...props}
      />
    )
  }

  NutMesh.displayName = `Nut_M${boreR * 2}_${threadType}`
  return NutMesh
}

/* ─────────────────────────────────────────────────────────────
   PRE-BUILT BOLT VARIANTS
───────────────────────────────────────────────────────────── */

// ── ISO Metric hex bolts
export const M6Bolt = makeBoltComponent({
  shankR: 3, headR: 5.5, headH: 4, length: 40,
  threadedLength: 28, threadPitch: 1.0, threadType: 'metric',
})
export const M8Bolt = makeBoltComponent({
  shankR: 4, headR: 7, headH: 5, length: 40,
  threadPitch: 1.25, threadType: 'metric',
})
export const M12Bolt = makeBoltComponent({
  shankR: 6, headR: 10, headH: 7, length: 50,
  threadPitch: 1.75, threadType: 'metric',
})
export const M20Bolt = makeBoltComponent({
  shankR: 10, headR: 16, headH: 12, length: 80,
  threadPitch: 2.5, threadType: 'metric',
})

// ── Power / motion screws (headless rods)
export const LeadScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 8.0, threadType: 'acme',
})
export const TrapezoidalScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 8.0, threadType: 'trapezoidal',
})
export const SquareScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 6.0, threadType: 'square', threadDepth: 3.0,
  threadedLength: 56,
})
export const StubAcmeScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 8.0, threadType: 'stubAcme', threadDepth: 2.4,
  threadedLength: 56,
})
export const ButtressScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 6.0, threadType: 'buttress', threadDepth: 4,
  threadedLength: 56,
})
export const KnuckleScrew = makeBoltComponent({
  shankR: 8, headR: 0, headH: 0, length: 60,
  threadPitch: 6.0, threadType: 'knuckle', threadDepth: 2.5,
  threadedLength: 56,
})

// ── National / legacy standard bolts
export const UNCBolt = makeBoltComponent({
  shankR: 4, headR: 7, headH: 5, length: 40,
  threadPitch: 1.25, threadType: 'unified',
})
export const WhitworthBolt = makeBoltComponent({
  shankR: 4, headR: 7, headH: 5, length: 40,
  threadPitch: 1.27, threadType: 'whitworth',
})

/* ─────────────────────────────────────────────────────────────
   PRE-BUILT NUT VARIANTS
───────────────────────────────────────────────────────────── */

// ── ISO Metric hex nuts — paired with bolt variants above
export const M6Nut = makeNutComponent({
  boreR: 3, bodyR: 5.5, height: 5,
  threadPitch: 1.0, threadType: 'metric',
})
export const M8Nut = makeNutComponent({
  boreR: 4, bodyR: 7, height: 6.5,
  threadPitch: 1.25, threadType: 'metric',
})
export const M12Nut = makeNutComponent({
  boreR: 6, bodyR: 10, height: 10,
  threadPitch: 1.75, threadType: 'metric',
})
export const M20Nut = makeNutComponent({
  boreR: 10, bodyR: 16, height: 16,
  threadPitch: 2.5, threadType: 'metric',
})

// ── Power-thread nuts — round flange body (hexSides=32)
export const AcmeNut = makeNutComponent({
  boreR: 8, bodyR: 14, height: 20,
  threadPitch: 8.0, threadType: 'acme', hexSides: 32,
})
export const TrapezoidalNut = makeNutComponent({
  boreR: 8, bodyR: 14, height: 20,
  threadPitch: 8.0, threadType: 'trapezoidal', hexSides: 32,
})
export const SquareThreadNut = makeNutComponent({
  boreR: 8, bodyR: 14, height: 18,
  threadPitch: 6.0, threadType: 'square', threadDepth: 3.0,
  hexSides: 4,   // square body to match tradition
})
export const ButtressNut = makeNutComponent({
  boreR: 8, bodyR: 14, height: 20,
  threadPitch: 6.0, threadType: 'buttress', threadDepth: 4,
  hexSides: 32,
})
export const KnuckleNut = makeNutComponent({
  boreR: 8, bodyR: 14, height: 20,
  threadPitch: 6.0, threadType: 'knuckle', threadDepth: 2.5,
  hexSides: 32,
})

// ── National / legacy standard nuts
export const UNCNut = makeNutComponent({
  boreR: 4, bodyR: 7, height: 6.5,
  threadPitch: 1.25, threadType: 'unified',
})
export const WhitworthNut = makeNutComponent({
  boreR: 4, bodyR: 7, height: 6.5,
  threadPitch: 1.27, threadType: 'whitworth',
})