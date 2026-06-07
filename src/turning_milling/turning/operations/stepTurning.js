import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../utils/materials/textures'
import CanvaPovider from '../../../provider'
import { gcodeToLatheProfiles } from './utils/gcodeToLatheProfile'

/* ─────────────────────────────────────────────────────────────────
   DEFAULT PROFILE  (used when neither gcode nor profile prop given)
───────────────────────────────────────────────────────────────── */
const defaultProfile = [
  { z: -3, r: 0   },
  { z: -3, r: 1   },
  { z: -2, r: 0.9 },
  { z: -1, r: 0.7 },
  { z:  0, r: 0.6 },
  { z:  1, r: 0.6 },
  { z:  2, r: 0.5 },
  { z:  3, r: 0.5 },
  { z:  3, r: 0   },
]

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/**
 * Interpolate radius at a given Z along a profile array.
 */
function RadiusAtZ(profile, z) {
  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = profile[i]
    const p1 = profile[i + 1]
    if (z >= p0.z && z <= p1.z) {
      const t = (z - p0.z) / Math.max(p1.z - p0.z, 0.0001)
      return p0.r + t * (p1.r - p0.r)
    }
  }
  return profile.at(-1).r
}

/**
 * Generate depth-per-pass profiles from a finish profile + stock radius.
 * Used as fallback when no G-code is supplied.
 */
function generateCncPasses(profile, rawRadius, maxDepthPerPass) {
  const allProfiles = []
  let currentProfile = profile.map(p => ({ z: p.z, r: rawRadius }))

  while (true) {
    const nextProfile = profile.map((p, i) => {
      const targetR  = p.r
      const currentR = currentProfile[i].r
      if (currentR > targetR) {
        return { z: p.z, r: Math.max(targetR, currentR - maxDepthPerPass) }
      }
      return { ...p }
    })

    allProfiles.push(nextProfile)
    if (nextProfile.every((p, i) => p.r <= profile[i].r + 0.0001)) break
    currentProfile = nextProfile
  }

  return allProfiles
}

/* ─────────────────────────────────────────────────────────────────
   TOOL MESH
───────────────────────────────────────────────────────────────── */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.2, 0.4, 0.2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))
Tool.displayName = 'Tool'

/* ─────────────────────────────────────────────────────────────────
   SCENE  (pure Three.js / R3F — receives allProfiles as a prop)
───────────────────────────────────────────────────────────────── */
function Scene({
  allProfiles,          // required — array of [{r,z}] snapshots, one per pass
  profile,              // final finish profile (for back-cap Z reference)
  length        = 6,
  speed         = 0.5,
}) {
  /* ── State ── */
  const [passIndex, setPassIndex] = useState(1)
  const [cutting,   setCutting]   = useState(true)

  /* ── Refs (never trigger re-render) ── */
  const passRef    = useRef(0)
  const stepRef    = useRef(0)
  const toolZ      = useRef(profile?.[0]?.z ?? -3)
  const toolRef    = useRef()
  const partRef    = useRef()
  const rawPartRef = useRef()
  const faceCapRef = useRef()
  const backCapRef = useRef()

  const texture = useTextureLoader({})

  /* ── Derived ── */
  const passes = allProfiles.length - 1

  /* ── Clipping plane (mutable, intentionally stable ref) ── */
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), length / 2),
    [length]
  )

  /* ── Geometries ── */
  const rawGeometry = useMemo(() => {
    const src = allProfiles[Math.max(passIndex - 1, 0)]
    const pts = src.map(p => new THREE.Vector2(p.r, p.z))
    if (pts.at(-1).x !== 0) pts.push(new THREE.Vector2(0, pts.at(-1).y))
    return new THREE.LatheGeometry(pts, 128)
  }, [allProfiles, passIndex])

  const finishedGeometry = useMemo(() => {
    const src = allProfiles[Math.min(passIndex, allProfiles.length - 1)]
    const pts = src.map(p => new THREE.Vector2(p.r, p.z))
    if (pts[0].x !== 0) pts.unshift(new THREE.Vector2(0, pts[0].y))
    return new THREE.LatheGeometry(pts, 128)
  }, [allProfiles, passIndex])

  /* ── Animation loop ── */
  useFrame((_, delta) => {
    // All passes complete
    if (passRef.current >= passes) {
      setCutting(false)
      if (faceCapRef.current) faceCapRef.current.visible = false
      if (backCapRef.current) backCapRef.current.visible = true
      return
    }

    const currentProfile = allProfiles[passRef.current]
    const i    = stepRef.current
    const next = Math.min(i + 1, currentProfile.length - 1)

    const z0 = currentProfile[i].z
    const z1 = currentProfile[next].z
    const r0 = currentProfile[i].r
    const r1 = currentProfile[next].r

    toolZ.current += delta * speed

    // Advance to next profile point
    if (toolZ.current >= z1) {
      stepRef.current = next

      // End of this pass → start next
      if (stepRef.current === currentProfile.length - 1) {
        passRef.current  += 1
        setPassIndex(passRef.current)
        stepRef.current   = 0
        toolZ.current     = currentProfile[0].z
        clipPlane.constant = length / 2
        return
      }
    }

    // Interpolate tool position
    const t     = (toolZ.current - z0) / Math.max(z1 - z0, 0.0001)
    const toolX = r0 + t * (r1 - r0)

    if (toolRef.current)    toolRef.current.position.set(toolX, toolZ.current, 0)
    if (partRef.current)    partRef.current.rotation.y    += 0.04
    if (rawPartRef.current) rawPartRef.current.rotation.y += 0.04

    clipPlane.constant = -toolZ.current

    // Face cap (cutting face disc)
    const rawProfile  = allProfiles[Math.max(passRef.current - 1, 0)]
    const faceRadius  = RadiusAtZ(rawProfile, toolZ.current)
    if (faceCapRef.current) {
      faceCapRef.current.position.y = toolZ.current
      faceCapRef.current.scale.set(faceRadius, 1, faceRadius)
      faceCapRef.current.visible = cutting
    }

    // Back / bottom cap
    const backZ      = profile.at(-1).z
    const backRadius = RadiusAtZ(allProfiles[passRef.current], backZ)
    if (backCapRef.current) {
      backCapRef.current.position.y = backZ
      backCapRef.current.scale.set(backRadius, 1, backRadius)
      backCapRef.current.visible = true
    }
  })

  /* ── Render ── */
  return (
    <>
      {/* RAW STOCK */}
      <mesh ref={rawPartRef} geometry={rawGeometry}>
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.5}
          roughness={0.45}
          map={texture}
          clippingPlanes={cutting ? [clipPlane] : []}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* FINISHED SURFACE */}
      <mesh ref={partRef} geometry={finishedGeometry}>
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.4}
          roughness={0.25}
          map={texture}
          side={THREE.DoubleSide}
          depthWrite
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* FACE CAP  — disc at the cutting front */}
      <mesh ref={faceCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="#777777" />
      </mesh>

      {/* BACK CAP — disc at the chuck end */}
      <mesh ref={backCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="#777777" map={texture} />
      </mesh>

      {/* TOOL */}
      <Tool ref={toolRef} />
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────
   StepTurning  — public API
   
   Props:
     gcode        {string}   – G-code program text (optional)
     profile      {Array}    – finish profile [{z,r}] (used when no gcode)
     stockRadius  {number}   – stock radius in mm  (default 50 mm → 5.0 units)
     maxDepthPerPass {number} – fallback pass depth (default 0.2 units)
     speed        {number}   – animation speed (default 0.5)
     length       {number}   – workpiece length in scene units (default 6)
───────────────────────────────────────────────────────────────── */
export function StepTurning({
  gcode,
  profile: profileProp,
  stockRadius: stockProp,
  maxDepthPerPass = 0.2,
  speed  = 0.5,
  length = 6,
}) {
  /* ── Parse G-code when provided ── */
  const derived = useMemo(() => {
    if (!gcode) return null
    return gcodeToLatheProfiles(gcode, {
      stockRadius: stockProp ?? 50,
      scale: 0.1,                   // 1 mm → 0.1 Three.js units
    })
  }, [gcode, stockProp])

  /* ── Resolve profile & radius ── */
  const profile   = derived?.finishProfile ?? profileProp ?? defaultProfile
  const rawRadius = derived?.rawRadius     ?? (stockProp != null ? stockProp * 0.1 : 1.6)

  /* ── Build allProfiles ── */
  const allProfiles = useMemo(() => {
    // G-code path: use pass-by-pass profiles from interpreter
    if (derived?.allProfiles?.length > 1) return derived.allProfiles
    // Fallback: depth-per-pass generator
    return generateCncPasses(profile, rawRadius, maxDepthPerPass)
  }, [derived, profile, rawRadius, maxDepthPerPass])

  return (
    <CanvaPovider camPosition={[0, 0, 5]}>
      <Scene
        allProfiles={allProfiles}
        profile={profile}
        rawRadius={rawRadius}
        speed={speed}
        length={length}
      />
    </CanvaPovider>
  )
}

