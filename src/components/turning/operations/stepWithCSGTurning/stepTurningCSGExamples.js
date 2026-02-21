import StepWithCsg from './stepTurningCSG'
import * as THREE from 'three'

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
    cutList={[
      {
        geometry: new THREE.CylinderGeometry(5, 5, 60, 32),
        position: { x: 0, y: -25, z: 0 },
        subtract: true,
        enabled: true,
        material: { color: '#888888', roughness: 0.2, metalness: 0.8 },
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
    cutList={[
      // Center pocket
      {
        geometry: new THREE.BoxGeometry(30, 15, 20),
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
const TeethNum = 16
const keywayCuts = [...Array(TeethNum)].map((_, i) => {
  const angleDeg = (i / TeethNum) * 360
  const angleRad = (angleDeg * Math.PI) / 180
  const radius = 18

  const x = Math.cos(angleRad) * radius
  const z = Math.sin(angleRad) * radius

  // Compute look angle in radians
  const lookRad = Math.atan2(-x, -z)

  // Convert to degrees
  const lookDeg = (lookRad * 180) / Math.PI

  return {
    geometry: new THREE.BoxGeometry(5, 45, 5),

    position: {
      x,
      y: -20,
      z,
    },

    rotation: {
      x: 0,
      y: lookDeg+45,   // ✅ degrees
      z: 0,
    },

    subtract: true,
    enabled: true,
    material: {
      color: '#ccc',
      roughness: 0.3,
      metalness: 0.6,
      texture: 'steel',
    },
  }
})



export const GearBlank = () => (
  <StepWithCsg
    stockType="cylinder"
    stockRadius={18}
    stockHeight={40}
    stockSegments={80}
    position={[0, 0, -30]}
    stockMaterial={{ texture: 'steel', roughness: 0.2, metalness: .1 }}
    animation={{ type: 'rotation', axis: 'y', speed: 0.02}}
    cutList={[
      // Center bore
      {
        geometry: new THREE.CylinderGeometry(6, 6, 50, 32),
        position: { x: 0, y: -15, z: 0 },
        subtract: true,
        enabled: true,
        material: { roughness: 0.2, metalness: 1.0, texture: 'steel' },
      },
        {
        geometry: new THREE.BoxGeometry(2, 45, 6),
        position: { x: 6, y: -15, z: 0 },
        subtract: true,
        enabled: true,
        material: { roughness: 0.2, metalness: .1, texture: 'steel',color: '#999' },
      },
      // 4 keyways spread programmatically
      ...keywayCuts,
    ]}
  />
)


/* ─────────────────────────────────────────────────────────────
   USE CASE 5: Toggle-able Features via State
   → Controlled component — features toggled at runtime
───────────────────────────────────────────────────────────── */
import { useState } from 'react'

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

/**
 * Creates a bolt-shaped CSG component from a spec object.
 *
 * @param {{ shankR: number, headR: number, length: number, threadDepth: number }} spec
 */
function makeBoltComponent({ shankR = 5, headR = 9, length = 40, threadDepth = 0.8 } = {}) {
  const cuts = [
    // Hex head socket (top)
    {
      geometry: new THREE.CylinderGeometry(headR * 0.55, headR * 0.55, headR, 6),
      position: { x: 0, y: length / 2 - headR * 0.5, z: 0 },
      subtract: true,
      enabled: true,
      material: { color: '#555', roughness: 0.3, metalness: 1 },
    },
    // Thread groove (simplified as thin cylinder ring)
    {
      geometry: new THREE.CylinderGeometry(shankR + threadDepth, shankR + threadDepth, length * 0.6, 64),
      position: { x: 0, y: -length * 0.15, z: 0 },
      subtract: true,
      enabled: true,
      material: { roughness: 0.2, metalness: 0.9, texture: 'steel' },
    },
  ]

  // Return a named component for use anywhere in the scene
  const BoltComponent = (props) => (
    <StepWithCsg
      stockType="cylinder"
      stockRadius={shankR}
      stockHeight={length}
      stockSegments={48}
      cutList={cuts}
      {...props}   // allow position/rotation override per instance
    />
  )
  BoltComponent.displayName = `Bolt_${shankR}x${length}`
  return BoltComponent
}

// Pre-build specific bolt variants
export const M8Bolt  = makeBoltComponent({ shankR: 4,  headR: 7,  length: 30 })
export const M12Bolt = makeBoltComponent({ shankR: 6,  headR: 10, length: 50 })
export const M20Bolt = makeBoltComponent({ shankR: 10, headR: 16, length: 80 })

// Usage in a scene:
export const BoltAssembly = () => (
  <>
    <M8Bolt  position={[-20, 0, -30]} />
    <M12Bolt position={[0,   0, -30]} />
    <M20Bolt position={[25,  0, -30]} />
  </>
)