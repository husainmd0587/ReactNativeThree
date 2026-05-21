import React, { useMemo, useRef, useState, useCallback,useEffect } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../utils/materials/textures'
import CanvaPovider from '../../../provider'
// ─── phases ──────────────────────────────────────────────────────
const PHASE = { IDLE: 0, CUT: 1, SEPARATE: 2, DONE: 3 }

// ─── helpers ─────────────────────────────────────────────────────
function radiusAtZ(profile, z) {
  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = profile[i], p1 = profile[i + 1]
    if (z >= p0.z && z <= p1.z) {
      const t = (z - p0.z) / Math.max(p1.z - p0.z, 0.0001)
      return p0.r + t * (p1.r - p0.r)
    }
  }
  return profile.at(-1).r
}

function makeLathe(pts) {
  return new THREE.LatheGeometry(pts, 128)
}

// build left part up to partingZ
function buildLeft(profile, partingZ) {
 
  // close at parting plane
  const rAtCut = radiusAtZ(profile, partingZ)
  clipped.push({ z: partingZ, r: rAtCut })
  const pts = clipped.map(p => new THREE.Vector2(p.r, p.z))
  pts.push(new THREE.Vector2(0, pts.at(-1).y))

  return makeLathe(pts)
}


// parting strip with shrinking radii (progress 0→1 = full→gone)
function buildParting(profile, partingZ, partingWidth, cutProgress) {
  const R1full = radiusAtZ(profile, partingZ)
  const R2full = radiusAtZ(profile, partingZ + partingWidth)
  const R1 = R1full * (1 - cutProgress)
  const R2 = R2full * (1 - cutProgress)

  const pts = [
    new THREE.Vector2(0,  0),
    new THREE.Vector2(R1, 0),
    new THREE.Vector2(R2, partingWidth),
    new THREE.Vector2(0,  partingWidth),
  ]
  return makeLathe(pts)
}

// ─── Tool ────────────────────────────────────────────────────────
export const Tool = React.forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.12, 0.35, 0.12]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))

// ─── Scene ───────────────────────────────────────────────────────
const PROFILE = [
  { z: -3, r: 0 },
  { z: -3, r: 1 },
  { z: -2, r: 0.9 },
  { z: -1, r: 0.7 },
  { z:  0, r: 0.6 },
  { z:  1, r: 0.6 },
  { z:  2, r: 0.5 },
  { z:  3, r: 0.5 },
  { z:  3, r: 0 },
]
const PARTING_Z     = -1
const PARTING_WIDTH = 0.20
const TOOL_START_X  = 2.0   // tool rests here before cut
const CUT_SPEED     = 0.2   // units / second (radial feed)
const SEP_SPEED     = 0.3   // part separation speed

export default function Scene() {
  // animation state as refs (mutated in useFrame, no re-renders)
  const phase       = useRef(PHASE.IDLE)
  const cutProgress = useRef(0)   // 0 = not started, 1 = fully cut
  const sepProgress = useRef(0)   // 0 = touching, 1 = separated

  const toolRef   = useRef()
  const leftRef   = useRef()
  const rightRef  = useRef()
  const midRef    = useRef()
 const texture = useTextureLoader({})
  // start button triggers animation
  const [started, setStarted] = useState(true)

  // ── static geometries (left / right never change shape) ──
  const leftGeo  = useMemo(() => buildLeft(PROFILE, PARTING_Z), [])
  const rightGeo = useMemo(() => buildRight(PROFILE, PARTING_Z, PARTING_WIDTH), [])
  const partingGeo= useMemo(() => buildLeft(PROFILE, PARTING_Z,PARTING_WIDTH, 0), [])
  // parting geo is rebuilt each frame during cut — start with full
  const partingGeoRef = useRef(buildParting(PROFILE, PARTING_Z, PARTING_WIDTH, 0))

  // ── tool start X: parked just outside max radius ──
  const maxR = radiusAtZ(PROFILE, PARTING_Z) + 0.2

  useFrame((_, delta) => {
    if (!started) return

    const tool = toolRef.current
    const mid  = midRef.current
    const left = leftRef.current
    const right= rightRef.current

    // spin workpiece
    if (left)  left.rotation.y  += 0.04
    if (right) right.rotation.y += 0.04
    if (mid)   mid.rotation.y   += 0.04

    // ── PHASE: CUT ──────────────────────────────────────────
    if (phase.current === PHASE.CUT) {
      cutProgress.current = Math.min(cutProgress.current + delta * CUT_SPEED, 1)

      // move tool radially inward
      const toolX = maxR * (1 - cutProgress.current)
      if (tool) tool.position.set(toolX, PARTING_Z + PARTING_WIDTH / 2, 0)

      // rebuild parting geometry with shrinking radii
      const newGeo = buildParting(PROFILE, PARTING_Z, PARTING_WIDTH, cutProgress.current)
      if (mid) {
        mid.geometry.dispose()
        mid.geometry = newGeo
      }
      partingGeoRef.current = newGeo

      if (cutProgress.current >= 1) {
        phase.current = PHASE.SEPARATE
        // hide parting mesh
        if (mid) mid.visible = false
        // hide tool
        if (tool) tool.visible = false
      }
    }

    // ── PHASE: SEPARATE ─────────────────────────────────────
    if (phase.current === PHASE.SEPARATE) {
      sepProgress.current = Math.min(sepProgress.current + delta * SEP_SPEED, 1)
      const d = sepProgress.current * 0.8  // drift distance

      // left part moves toward -Z (operator side)
      if (left)  left.position.z  = -d
      // right part moves toward +Z (tailstock side)
      if (right) right.position.z =  d

      if (sepProgress.current >= 1) phase.current = PHASE.DONE
    }
  })
 const Materials=<meshStandardMaterial metalness={0.5} map={texture} roughness={0.3} color="#c8a882"   side={THREE.DoubleSide}/>
  return (
    <>
      {/* LEFT */}
      <mesh ref={leftRef} geometry={leftGeo}>
        {Materials}
      </mesh>

      {/* RIGHT */}
      <mesh ref={rightRef} geometry={rightGeo}>
        {Materials}
      </mesh>

      {/* PARTING STRIP */}
      <mesh ref={midRef} position={[0, PARTING_Z, 0]}>
        <primitive object={partingGeoRef.current} attach="geometry" />
       {Materials}
      </mesh>

      {/* TOOL — starts parked at maxR, Y centred on parting zone */}
      <Tool
        ref={toolRef}
        position={[maxR, PARTING_Z + PARTING_WIDTH / 2, 0]}
      />

    </>
  )
}

export default function Facing() {
  return (
    <CanvaPovider camPosition={[0,0,6]}>
      <Scene />
    </CanvaPovider>
  )
}