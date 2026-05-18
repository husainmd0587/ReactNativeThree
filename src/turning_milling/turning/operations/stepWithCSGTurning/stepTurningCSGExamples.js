import StepWithCsg from './stepTurningCSG'
import * as THREE from 'three'
import { useState,useEffect } from 'react'
const STEEL   = { texture: 'steel', roughness: 0.15, metalness: 0.2 }
const DARK    = { color: '#1a1a2e',  roughness: 0.55, metalness: 0.4  }
const GOLD    = { color: '#c8a84b',  roughness: 0.25, metalness: 0.5 }
const LEATHER = { color: '#3b1f0a',  roughness: 0.7,  metalness: 0.0  }

/* ─────────────────────────────────────────────────────────────
   USE CASE 1: Simple Drilled Cylinder (Lathe Part)
   → Default cylinder stock with a single center bore
───────────────────────────────────────────────────────────── */
export const DrilledCylinder = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={15}
    stockHeight={50}
    stockSegments={64}
    position={[0, 0, 0]}
    animation={{ type: 'rotation', axis: 'y', speed: 0.01}}
    cutList={[
      {
        geometry: new THREE.CylinderGeometry(5, 5, 60, 32),
        position: { x: 0, y: -25, z: 0 },
        subtract: true,
        enabled: true,
        material: STEEL,
      },
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE 2: Rectangular Block with Pocket + Slot
   → Box stock, two subtract ops, different face materials
───────────────────────────────────────────────────────────── */
export const PocketedBlock = () => (
  <StepWithCsg
    stockType="box"
    stockWidth={60}
    stockHeight={30}
    stockDepth={40}
    position={[0, 0, -20]}
    stockMaterial={{ texture: 'steel', roughness: 0.2, metalness: .1 }}
    cutList={[
      // Center pocket
      {
        geometry: new THREE.BoxGeometry(30, 30, 20),
        position: { x: 0, y: 7, z: 0 },
        subtract: true,
        enabled: true,
        material: { color: '#4a90d9', roughness: 0.4, metalness: 0.6 },
      },
      // Side slot
      {
        geometry: new THREE.BoxGeometry(70, 8, 8),
        position: { x: 0, y: -5, z: 0 },
        subtract: true,
        enabled: true,
        material: { color: '#e67e22', roughness: 0.5 },
      },
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE 3: Turned Profile Part  (like a chess rook)
   → Custom revolved profile, multiple bores + chamfer
───────────────────────────────────────────────────────────── */
const rookProfile = [
  0,  -20,   // bottom center
  12, -20,   // base outer
  12, -15,   // base top
  8,  -10,   // waist bottom
  8,   10,   // waist top
  12,  15,   // crown base
  12,  20,   // crown outer
  0,   20,   // top center
]

export const TurnedRook = () => (
  <StepWithCsg
    stockType="profile"
    stockProfile={rookProfile}
    stockRadius={12}
    stockHeight={40}
    stockSegments={72}
    position={[0, 0, -40]}
    cutList={[
      // Top bore (hollow center)
      {
        geometry: new THREE.CylinderGeometry(4, 4, 15, 32),
        position: { x: 0, y: 13, z: 0 },
        subtract: true,
        enabled: true,
        material: { color: '#2ecc71', roughness: 0.3, metalness: 0.5 },
      },
      // Decorative ring cut
      {
        geometry: new THREE.CylinderGeometry(13, 13, 3, 64),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: { color: '#9b59b6', roughness: 0.6 },
      },
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE 4: Gear Blank  (cylinder with multiple keyways)
   → Same geometry, cloned 4× at different rotations
───────────────────────────────────────────────────────────── */

function buildKeywayCuts({teethNum = 16, radius = 18, angleOffsetfTooth= 45,faceToCenter=true}) {


  return [...Array(teethNum)].map((_, i) => {
    const angleRad = (i / teethNum) * Math.PI * 2
    const x = Math.cos(angleRad) * radius
    const z = Math.sin(angleRad) * radius

    const lookRad = faceToCenter ? Math.atan2(-x, -z) : 0
    const angleToRad = angleOffsetfTooth * Math.PI / 180
    return {
      geometry: new THREE.BoxGeometry(5, 45, 5),
      position: { x, y: 0, z },
      rotation: { x: 0, y: lookRad + angleToRad, z: 0 },
      subtract: true,
      enabled:  true,
      material: { color: '#ccc', roughness: 0.3, metalness: 0.6 },
    }
  })
}

export const GearBlank = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={18}
    stockHeight={40}
    stockSegments={80}
    position={[0, 0, 0]}
    stockMaterial={{ texture: 'steel', roughness: 0.2, metalness: .1 }}
    cutList={[
      {
        geometry: new THREE.CylinderGeometry(6, 6, 50, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: { roughness: 0.2, metalness: 1.0, texture: 'steel' },
      },
      {
        geometry: new THREE.BoxGeometry(2, 50, 6),
        position: { x: 6, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: { roughness: 0.2, metalness: 0.1, texture: 'steel', color: '#999' },
      },
      ...buildKeywayCuts({teethNum: 16, radius: 18, angleOffsetfTooth:45,faceToCenter:true}),
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE 5: Toggle-able Features via State
   → Controlled component — features toggled at runtime
───────────────────────────────────────────────────────────── */

export const ConfigurablePart = () => {
  const [hasBore,   setHasBore]   = useState(true)
  const [hasChamfer, setHasChamfer] = useState(false)
  const [hasSlot,   setHasSlot]   = useState(true)

  const cutList = [
    {
      geometry: new THREE.CylinderGeometry(4, 4, 60, 32),
      position: { x: 0, y: 0, z: 0 },
      subtract: true,
      enabled: hasBore,
      material: { color: '#3498db', roughness: 0.2, metalness: 0.8 },
    },
    {
      geometry: new THREE.CylinderGeometry(8, 4, 6, 32),
      position: { x: 0, y: -18, z: 0 },
      subtract: true,
      enabled: hasChamfer,
      material: { color: '#f39c12', roughness: 0.4 },
    },
    {
      geometry: new THREE.BoxGeometry(30, 6, 6),
      position: { x: 0, y: 10, z: 0 },
      subtract: true,
      enabled: hasSlot,
      material: { color: '#27ae60', roughness: 0.5 },
    },
  ]

  return (
    <>
      {/* UI controls — wire these to your own UI library */}
      <ControlPanel
        onToggleBore={()    => setHasBore(v    => !v)}
        onToggleChamfer={() => setHasChamfer(v => !v)}
        onToggleSlot={()    => setHasSlot(v    => !v)}
        states={{ hasBore, hasChamfer, hasSlot }}
      />

      <StepWithCsg
        stockType="cylinder"
        stockRadius={14}
        stockHeight={36}
        stockSegments={64}
        position={[0, 0, -30]}
        cutList={cutList}
      />
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   USE CASE 6: Factory Function — generate many similar parts
   → Returns a ready-to-use component for each bolt spec
───────────────────────────────────────────────────────────── */


function makeBoltComponent({
  shankR      = 5,
  headR       = 9,
  headH       = 6,         // ← NEW: explicit head height
  length      = 40,
  threadDepth = 0.8,
  threadPitch = 2.5,       // ← NEW: controls groove spacing
} = {}) {

  const shankLength = length - headH   // shank sits below the head

  // ── Thread grooves ────────────────────────────────────────────
  // Build one thin torus-like disc per pitch step along the
  // threaded portion (lower 60 % of shank).
  const threadedLength = shankLength * 0.6
  const grooveCount    = Math.floor(threadedLength / threadPitch)
  const grooveH        = threadPitch * 0.45          // groove width ≈ 45 % of pitch
  const grooveR        = shankR + threadDepth        // outer groove radius
  const threadStart    = -shankLength / 2            // bottom of shank (local origin = shank centre)

  const threadGrooves = Array.from({ length: grooveCount }, (_, i) => {
    const y = threadStart + i * threadPitch + threadPitch / 2
    return {
      geometry: new THREE.CylinderGeometry(grooveR, grooveR, grooveH, 64),
      position: { x: 0, y, z: 0 },
      subtract: true,
      enabled: true,
      material: { roughness: 0.15, metalness: 0.95, texture: 'steel' },
    }
  })

  // ── Hex-head socket (Allen/hex drive recess on top face) ───────
  const socketDepth = headH * 0.55
  const hexSocket = {
    geometry: new THREE.CylinderGeometry(
      headR * 0.5, headR * 0.5,   // flat-to-flat ≈ headR × 0.5 gives nice M-series proportions
      socketDepth,
      6                            // 6 sides = hex
    ),
    position: { x: 0, y: shankLength / 2 + headH - socketDepth / 2, z: 0 },
    subtract: true,
    enabled: true,
    material: { color: '#444', roughness: 0.3, metalness: 1 },
  }

  // ── Chamfer ring at thread tip ─────────────────────────────────
  // A small cone at the very bottom creates the lead-in chamfer.
  const chamfer = {
    geometry: new THREE.CylinderGeometry(0, shankR, shankR * 0.8, 32),
    position: { x: 0, y: threadStart - shankR * 0.4, z: 0 },
    subtract: true,
    enabled: true,
    material: { roughness: 0.1, metalness: 1 },
  }

  const cutList = [hexSocket, chamfer, ...threadGrooves]

  // ── Component factory ─────────────────────────────────────────
  //
  // The bolt is modelled as TWO stacked stocks merged by the CSG
  // system: the shank (cylinder) + the hex head (6-sided cylinder).
  // We pass the head as an *additive* entry so it unifies with
  // the shank before any subtractions are applied.
  //
  // If your StepWithCsg only supports a single stock, replace the
  // additive head entry with a separate <StepWithCsg> and wrap
  // both in a <group> — see BoltAssembly comment below.

  const headAddition = {
    geometry: new THREE.CylinderGeometry(headR, headR, headH, 6),
    position: { x: 0, y: shankLength / 2 + headH / 2, z: 0 },
    subtract: false,   // UNION — adds material
    enabled: true,
    material: { roughness: 0.25, metalness: 0.9, texture: 'steel' },
  }

  const BoltComponent = (props) => (
    <StepWithCsg
      stockType="cylinder"
      stockRadius={shankR}
      stockHeight={shankLength}
      stockSegments={64}           // higher segments for smooth shank
      cutList={[headAddition, ...cutList]}
      {...props}
    />
  )

  BoltComponent.displayName = `Bolt_M${shankR * 2}x${length}`
  return BoltComponent
}

// ── Pre-built variants ────────────────────────────────────────────
export const M8Bolt  = makeBoltComponent({ shankR: 4,  headR: 7,  headH: 5,  length: 30, threadPitch: 1.25 })
export const M12Bolt = makeBoltComponent({ shankR: 6,  headR: 10, headH: 7,  length: 50, threadPitch: 1.75 })
export const M20Bolt = makeBoltComponent({ shankR: 10, headR: 16, headH: 12, length: 80, threadPitch: 2.5  })

// ── Scene usage ───────────────────────────────────────────────────
export const BoltAssembly = () => (
  <>
    <M8Bolt  position={[-20, 0, -30]} />
    {/* <M12Bolt position={[  0, 0, -30]} /> */}
    {/* <M20Bolt position={[ 25, 0, -30]} /> */}
  </>
)


//-----------------------------------------------------------------------------------------------------------------


// ── 1. HEAD ──────────────────────────────────────────────────────────────────
// Stock: box 55(X) × 40(Y) × 70(Z)  →  spans x:±27.5  y:±20  z:±35
//
// FIX SUMMARY:
//  • Face recesses: cutter centred at z:±32 (was ±37) so it overlaps the face
//  • Rune grooves:  same z correction + depth 10 so they bite in cleanly
//  • Side bands:    x:±24 (was ±29) so they're inside the stock width
//  • Handle socket: centred at y:0 so cylinder overlaps stock from y:-25 to +25

export const MjolnirHead = () => (
  <StepWithCsg
    stockType="box"
    stockWidth={55}
    stockHeight={40}
    stockDepth={70}
    position={[0, 50, 0]}
    stockMaterial={STEEL}
    cutList={[

      // Decorative face recess – front  (z:32 → cutter spans z:29–35 ✓)
      {
        geometry: new THREE.BoxGeometry(45, 30, 6),
        position: { x: 0, y: 0, z: 32 },
        subtract: true,
        enabled: true,
        material: DARK,
      },
      // Decorative face recess – back
      {
        geometry: new THREE.BoxGeometry(45, 30, 6),
        position: { x: 0, y: 0, z: -32 },
        subtract: true,
        enabled: true,
        material: DARK,
      },

      // Rune groove – front horizontal (depth 10 bites well into the face)
      {
        geometry: new THREE.BoxGeometry(35, 3, 10),
        position: { x: 0, y: 5, z: 31 },
        subtract: true,
        enabled: true,
        material: GOLD,
      },
      // Rune groove – front vertical
      {
        geometry: new THREE.BoxGeometry(3, 22, 10),
        position: { x: 0, y: 0, z: 31 },
        subtract: true,
        enabled: true,
        material: GOLD,
      },

      // Handle socket – centred at y:0 → spans y:±25, overlaps stock fully ✓
      {
        geometry: new THREE.CylinderGeometry(7, 7, 50, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: DARK,
      },

      // Side band groove – left  (x:24 → cutter spans x:21–27 inside stock ✓)
      {
        geometry: new THREE.BoxGeometry(6, 44, 74),
        position: { x: 24, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: GOLD,
      },
      // Side band groove – right
      {
        geometry: new THREE.BoxGeometry(6, 44, 74),
        position: { x: -24, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: GOLD,
      },
    ]}
  />
)

// ── 2. HANDLE ─────────────────────────────────────────────────────────────────
// Stock: cylinder radius 8, height 90  →  spans y:±45
//
// FIX: Replace Torus (flush = unreliable) with pairs of BoxGeometry cutters.
//      Two perpendicular boxes per groove = clean circumferential ring groove.

const ringGroove = (y) => [
  {
    geometry: new THREE.BoxGeometry(20, 3, 3),
    position: { x: 0, y, z: 0 },
    subtract: true,
    enabled: true,
    material: GOLD,
  },
  {
    geometry: new THREE.BoxGeometry(3, 3, 20),
    position: { x: 0, y, z: 0 },
    subtract: true,
    enabled: true,
    material: GOLD,
  },
]

export const MjolnirHandle = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={8}
    stockHeight={90}
    stockSegments={32}
    position={[0, -20, 0]}
    stockMaterial={LEATHER}
    cutList={[
      ...ringGroove(25),
      ...ringGroove(0),
      ...ringGroove(-25),
    ]}
  />
)

// ── 3. POMMEL ─────────────────────────────────────────────────────────────────
// Stock: cylinder radius 14, height 18  →  spans y:±9
//
// FIX: A wide box (32×4×32) clearly overlaps the r:14 cylinder on all sides
//      and carves a clean equatorial band groove.

export const MjolnirPommel = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={14}
    stockHeight={18}
    stockSegments={32}
    position={[0, -60, 0]}
    stockMaterial={STEEL}
    cutList={[
      {
        geometry: new THREE.BoxGeometry(32, 2, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled: true,
        material: GOLD,
      },
    ]}
  />
)

// ── 4. COMPOSITE ──────────────────────────────────────────────────────────────
export const ThorHammer = () => {
  const [stage, setStage] = useState(0)
  
  useEffect(() => {
    // Mount each part after the previous one finishes CSG
    if (stage < 3) {
      const t = setTimeout(() => setStage(s => s + 1), 500)
      return () => clearTimeout(t)
    }
  }, [stage])

  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      {stage >= 1 && <MjolnirHead   />}
      {stage >= 2 && <MjolnirHandle />}
      {stage >= 3 && <MjolnirPommel />}
    </group>
  )
}


/* ─────────────────────────────────────────────────────────────
   SWEEP GEOMETRY (same as your provided util)
───────────────────────────────────────────────────────────── */

function buildSweepGeometry({ shapePoints, pathPoints, up = new THREE.Vector3(0, 0, 1) }) {
  const curve    = new THREE.CatmullRomCurve3(pathPoints)
  const segments = pathPoints.length - 1
  const points   = curve.getPoints(segments)
  const tangents = curve.computeFrenetFrames(segments, false).tangents

  const vertices   = []
  const indices    = []
  const uvs        = []
  const shapeCount = shapePoints.length

  for (let i = 0; i < points.length; i++) {
    const tangent = tangents[i].clone().normalize()
    const right   = new THREE.Vector3().crossVectors(up, tangent).normalize()
    const normal  = new THREE.Vector3().crossVectors(tangent, right).normalize()
    const v       = i / segments

    for (let j = 0; j < shapeCount; j++) {
      const p      = shapePoints[j]
      const vertex = new THREE.Vector3()
        .copy(points[i])
        .addScaledVector(right, p.x)
        .addScaledVector(normal, p.y)
      vertices.push(vertex.x, vertex.y, vertex.z)
      uvs.push(j / shapeCount, v)
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < shapeCount; j++) {
      const a = i * shapeCount + j
      const b = i * shapeCount + (j + 1) % shapeCount
      const c = (i + 1) * shapeCount + j
      const d = (i + 1) * shapeCount + (j + 1) % shapeCount
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/* ─────────────────────────────────────────────────────────────
   HELIX PATH
───────────────────────────────────────────────────────────── */

function createHelixPath({ radius, turns, height, segments = 300, reverse = false }) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = (reverse ? -1 : 1) * (i / segments) * Math.PI * 2 * turns
    points.push(new THREE.Vector3(
      Math.cos(t) * radius,
      (i / segments) * height - height / 2,   // centred at Y=0
      Math.sin(t) * radius,
    ))
  }
  return points
}


const THREAD_PROFILES = {
  metric: ({ depth, pitch }) => {
    const h = depth
    const w = pitch * 0.5
    return [
      new THREE.Vector2(  0,  -w),
      new THREE.Vector2( -h,   0),
      new THREE.Vector2(  0,   w),
      new THREE.Vector2(  0,   w)
    ]
  },

  // Flat-crested trapezoidal (ACME-style)
  acme: ({ depth, pitch }) => {
    const h  = depth
    const wb = pitch * 0.5          // base half-width
    const wt = pitch * 0.25         // top (crest) half-width
    return [
      new THREE.Vector2(  0, -wb),
      new THREE.Vector2( -h, -wt),
      new THREE.Vector2( -h,  wt),
      new THREE.Vector2(  0,  wb),
    ]
  },

  // Buttress — asymmetric, handles axial load in one direction
  buttress: ({ depth, pitch }) => {
    const h = depth
    const w = pitch * 0.5
    return [
      new THREE.Vector2(  0,  -w),
      new THREE.Vector2( -h,  -w * 0.1),
      new THREE.Vector2( -h,   w * 0.4),
      new THREE.Vector2(  0,   w),
    ]
  },

  // Rounded (knuckle) thread — good for injection-moulded parts
  rounded: ({ depth, pitch, profileSegments = 8 }) => {
    const pts = []
    const r   = depth
    for (let i = 0; i <= profileSegments; i++) {
      const a = Math.PI + (i / profileSegments) * Math.PI   // 180° → 360° arc
      pts.push(new THREE.Vector2(
        Math.sin(a) * r,           // x  (outward)
        Math.cos(a) * r * (pitch / (depth * 2)),  // y scaled to pitch
      ))
    }
    return pts
  },
}

/* ─────────────────────────────────────────────────────────────
   MAIN API
   buildThreadCut(config) → cutList entry ready for StepWithCsg
───────────────────────────────────────────────────────────── */


export function buildThreadCut({
  shankRadius,
  pitch           = 1.5,
  depth           = 0.8,
  length,
  startY          = 0,
  type            = 'metric',
  pathSegments,
  profileSegments = 8,
  reverse         = false,
  material        = { roughness: 0.15, metalness: 0.95 },
} = {}) {

  if (!shankRadius || !length) {
    throw new Error('buildThreadCut: shankRadius and length are required')
  }

  const turns        = length / pitch
  const segments     = pathSegments ?? Math.ceil(turns * 120)
  const helixRadius  = shankRadius + depth * 0.5   // helix path rides at mid-depth

  // 1. Helix path (centred at Y=0, spans ±length/2)
  const pathPoints = createHelixPath({
    radius:   helixRadius,
    turns,
    height:   length,
    segments,
    reverse,
  })

  // 2. Cross-section profile
  const profileFn = THREAD_PROFILES[type] ?? THREAD_PROFILES.metric
  const shapePoints = profileFn({ depth, pitch, profileSegments })

  // 3. Sweep → geometry
  const geometry = buildSweepGeometry({
    shapePoints,
    pathPoints,
    up: new THREE.Vector3(0, 1, 0),   // Y-up for vertical bolt axis
  })

  // 4. Return as cutList entry
  return {
    geometry,
    position: { x: 0, y: startY, z: 0 },
    subtract: true,
    enabled:  true,
    material,
  }
}

/* ─────────────────────────────────────────────────────────────
   CONVENIENCE — build multiple cuts (lead-in chamfer + threads)
───────────────────────────────────────────────────────────── */

/**
 * Returns a ready-to-spread array for cutList.
 * Includes the helical thread cut + optional tip chamfer.
 *
 * @example
 * cutList={[headAddition, ...buildThreadCuts({ shankRadius: 4, pitch: 1.25, length: 18 })]}
 */
export function buildThreadCuts({
  shankRadius,
  pitch           = 1.5,
  depth           = 0.8,
  length,
  startY          = 0,
  type            = 'metric',
  pathSegments,
  profileSegments = 8,
  reverse         = false,
  material        = { roughness: 0.15, metalness: 0.95 },
  chamfer         = true,   // add tip chamfer cone?
} = {}) {

  const cuts = []

  // Main helical thread groove
  cuts.push(buildThreadCut({
    shankRadius, pitch, depth, length, startY,
    type, pathSegments, profileSegments, reverse, material,
  }))

  // Tip chamfer — small cone that removes the sharp leading edge
  if (chamfer) {
    const chamferHeight = pitch * 2
    const chamferY      = startY - length / 2 - chamferHeight / 2
    cuts.push({
      geometry: new THREE.CylinderGeometry(0, shankRadius + depth, chamferHeight, 32),
      position: { x: 0, y: chamferY, z: 0 },
      subtract: true,
      enabled:  true,
      material,
    })
  }

  return cuts
}



export function makeBoltComponentNew({
  shankR      = 5,
  headR       = 9,
  headH       = 6,
  length      = 40,
  threadDepth = 0.8,
  threadPitch = 1.5,
  threadType  = 'metric',   // 'metric' | 'acme' | 'buttress' | 'rounded'
} = {}) {

  const shankLength    = length - headH
  const threadedLength = shankLength * 0.65
  // threads start at bottom of shank → startY centres them in the lower zone
  const threadStartY   = -(shankLength / 2) + threadedLength / 2

  const threadCuts = buildThreadCuts({
    shankRadius: shankR,
    pitch:       threadPitch,
    depth:       threadDepth,
    length:      threadedLength,
    startY:      threadStartY,
    type:        threadType,
    material:    { roughness: 0.15, metalness: 0.95 },
    chamfer:     true,
  })

  const headAddition = {
    geometry: new THREE.CylinderGeometry(headR, headR, headH, 6),
    position: { x: 0, y: shankLength / 2 + headH / 2, z: 0 },
    subtract: false,
    enabled:  true,
    material: { roughness: 0.25, metalness: 0.9 },
  }

  const hexSocket = {
    geometry: new THREE.CylinderGeometry(headR * 0.5, headR * 0.5, headH * 0.55, 6),
    position: { x: 0, y: shankLength / 2 + headH * 0.72, z: 0 },
    subtract: true,
    enabled:  true,
    material: { color: '#444', roughness: 0.3, metalness: 1 },
  }

  const BoltComponent = (props) => (
    <StepWithCsg
      stockType="cylinder"
      stockRadius={shankR}
      stockHeight={shankLength}
      stockSegments={64}
      cutList={[headAddition, hexSocket, ...threadCuts]}
      {...props}
    />
  )

  BoltComponent.displayName = `Bolt_M${shankR * 2}x${length}`
  return BoltComponent
}

// Pre-built variants with proper thread profiles
export const M8BoltNew  = makeBoltComponentNew({ shankR: 4,  headR: 7,  headH: 5,  length: 30, threadPitch: 1.25, threadType: 'metric'   })
export const M12BoltNew = makeBoltComponentNew({ shankR: 6,  headR: 10, headH: 7,  length: 50, threadPitch: 1.75, threadType: 'metric'   })
export const M20BoltNew = makeBoltComponentNew({ shankR: 10, headR: 16, headH: 12, length: 80, threadPitch: 2.5,  threadType: 'metric'   })
export const LeadScrewNew = makeBoltComponentNew({ shankR: 8, headR: 0,  headH: 0,  length: 60, threadPitch: 8,   threadType: 'acme'     })



//intersection example 
/* ─────────────────────────────────────────────────────────────
   USE CASE: INTERSECTION 1 — Sphere-Clipped Cylinder
   → Only the volume where cylinder AND sphere overlap survives
   → Creates a lens/capsule-shaped slug
───────────────────────────────────────────────────────────── */

export const LensSlugs = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={18}
    stockHeight={50}
    stockSegments={64}
    position={[0, 0, -30]}
    stockMaterial={STEEL}
    animation={{ type: 'rotation', axis: 'y', speed: 0.01 }}
    cutList={[
      // Intersect with a sphere → keeps only the overlap region
      // Result: a lens-shaped solid — flat sides, rounded equator
      {
        geometry: new THREE.SphereGeometry(20, 64, 64),
        position: { x: 0, y: 0, z: 0 },
        subtract:  true,
        intersect: true,        // ← INTERSECTION
        enabled:   true,
        material:  STEEL,
      },
      // Bore through the center of the resulting lens shape
      {
        geometry: new THREE.CylinderGeometry(5, 5, 60, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled:  true,
        material: DARK,
      },
      // Decorative equator groove on the curved edge
      {
        geometry: new THREE.CylinderGeometry(21, 21, 3, 64),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled:  true,
        material: GOLD,
      },
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE: INTERSECTION 2 — Box-Clipped Gear Blank
   → Cylinder intersected with a rounded box
   → Creates a "squircle" disk — gear blank with flat sides
   → Then teeth + bore cut into it
───────────────────────────────────────────────────────────── */

const squareTeethCuts = [...Array(12)].map((_, i) => {
  const angle    = (i / 12) * Math.PI * 2
  const r        = 19
  return {
    geometry: new THREE.BoxGeometry(6, 45, 6),
    position: {
      x: Math.cos(angle) * r,
      y: -10,
      z: Math.sin(angle) * r,
    },
    rotation: { x: 0, y: (angle * 180) / Math.PI, z: 0 },
    subtract: true,
    enabled:  true,
    material: { roughness: 0.2, metalness: 0.9, texture: 'steel' },
  }
})

export const SquareGear = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={22}
    stockHeight={14}
    stockSegments={80}
    position={[0, 0, -30]}
    stockMaterial={STEEL}
    animation={{ type: 'rotation', axis: 'y', speed: 0.015 }}
    cutList={[

      // ── STEP 1: Intersect cylinder with a box ──────────────────
      // Cylinder (r:22) ∩ Box (38×14×38) = squircle disk
      // The 4 corners of the cylinder get clipped flat
      {
        geometry: new THREE.BoxGeometry(38, 16, 38),
        position: { x: 0, y: 0, z: 0 },
        subtract:  false,
        intersect: true,        // ← INTERSECTION clips the cylinder
        enabled:   true,
        material:  STEEL,
      },

      // ── STEP 2: Center bore ────────────────────────────────────
      {
        geometry: new THREE.CylinderGeometry(6, 6, 20, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        enabled:  true,
        material: DARK,
      },

      // ── STEP 3: Keyway slot ────────────────────────────────────
      {
        geometry: new THREE.BoxGeometry(3, 20, 8),
        position: { x: 7, y: 0, z: 0 },
        subtract: true,
        enabled:  true,
        material: DARK,
      },

      // ── STEP 4: Outer gear teeth ───────────────────────────────
      ...squareTeethCuts,

      // ── STEP 5: Face chamfer ring ──────────────────────────────
      {
        geometry: new THREE.CylinderGeometry(23, 20, 3, 64),
        position: { x: 0, y: 6, z: 0 },
        subtract: true,
        enabled:  true,
        material: GOLD,
      },
    ]}
  />
)

export const HollowPipe = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={15}
    stockHeight={40}
    stockSegments={64}
    position={[0, 0,0]}
    stockMaterial={STEEL}
    animation={{ type: 'rotation', axis: 'y', speed: 0.01 }}
    cutList={[
      {
        geometry: new THREE.CylinderGeometry(12, 12, 40, 32),
        position: { x: 0, y: 0, z: 0 },
        subtract: true,
        // intersect: true,
        enabled:  true,
        material: GOLD,
      },
    ]}
  />
)

