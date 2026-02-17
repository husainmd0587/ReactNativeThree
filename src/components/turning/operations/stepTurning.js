import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../assets/all_textures'

/* ---------------- TOOL ---------------- */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.2, 0.4, 0.2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))

/* ---------------- HELPERS ---------------- */
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

// Fully adaptive CNC-style passes
function generateCncPasses(profile, rawRadius, maxDepthPerPass) {
  const allProfiles = []
  let currentProfile = profile.map(p => ({ z: p.z, r: rawRadius }))

  while (true) {
    const nextProfile = profile.map((p, i) => {
      const targetR = p.r
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

/* ---------------- WORKPIECE ---------------- */
export function StepTurning({
  length = 6,
  rawRadius = 1.6,
  speed = 0.5,
  maxDepthPerPass = 0.2,
  profile = [
    { z: -3, r: 0 },
    { z: -3, r: 1 },
    { z: -2, r: 0.9 },
    { z: -1, r: 0.7 },
    { z: 0, r: 0.6 },
    { z: 1, r: 0.6 },
    { z: 2, r: 0.5 },
    { z: 3, r: 0.5 },
    { z: 3, r: 0 },
  ],
}) {
  const [passIndex, setPassIndex] = useState(1)
  const [cutting, setCutting] = useState(true)

  const passRef = useRef(0)
  const stepRef = useRef(0)
  const toolZ = useRef(profile[0].z)

  const toolRef = useRef()
  const partRef = useRef()
  const rawPartRef = useRef()
  const faceCapRef = useRef()
  const backCapRef = useRef()

  const texture = useTextureLoader()

  /* ---------------- CNC PASSES ---------------- */
  const allProfiles = useMemo(
    () => generateCncPasses(profile, rawRadius, maxDepthPerPass),
    [profile, rawRadius, maxDepthPerPass]
  )
  const passes = allProfiles.length - 1
  // console.log(allProfiles)
  /* ---------------- CLIPPING ---------------- */
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), length / 2),
    [length]
  )

  /* ---------------- GEOMETRIES ---------------- */
const rawGeometry = useMemo(() => {
  const pts = allProfiles[passIndex - 1].map(p => new THREE.Vector2(p.r, p.z))
  const last = pts[pts.length - 1]
  if (last.x !== 0) pts.push(new THREE.Vector2(0, last.y))
  return new THREE.LatheGeometry(pts, 128)
}, [passIndex])

  // Finished geometry with bottom always closed
  const finishedGeometry = useMemo(() => {
    const pts = allProfiles[passIndex].map(p => new THREE.Vector2(p.r, p.z))
    if (pts[0].x !== 0) pts.unshift(new THREE.Vector2(0, pts[0].y)) // force bottom cap
    return new THREE.LatheGeometry(pts, 128)
  }, [allProfiles, passIndex])

  /* ---------------- ANIMATION ---------------- */
  useFrame((_, delta) => {
    if (passRef.current >= passes) {
      setCutting(false)
      faceCapRef.current && (faceCapRef.current.visible = false)
      backCapRef.current && (backCapRef.current.visible = true)
      return
    }

    const currentProfile = allProfiles[passRef.current]
    const i = stepRef.current
    const next = Math.min(i + 1, currentProfile.length - 1)

    const z0 = currentProfile[i].z
    const z1 = currentProfile[next].z
    const r0 = currentProfile[i].r
    const r1 = currentProfile[next].r

    toolZ.current += delta * speed

    if (toolZ.current >= z1) {
      stepRef.current = next
      if (stepRef.current === currentProfile.length - 1) {
        passRef.current += 1
        setPassIndex(passRef.current)
        stepRef.current = 0
        toolZ.current = currentProfile[0].z
        clipPlane.constant = length / 2
        return
      }
    }

    const t = (toolZ.current - z0) / Math.max(z1 - z0, 0.0001)
    const toolX = r0 + t * (r1 - r0)
    toolRef.current?.position.set(toolX, toolZ.current, 0)
    clipPlane.constant = -toolZ.current

    partRef.current.rotation.y += 0.01
    rawPartRef.current.rotation.y += 0.01

    const rawProfile = allProfiles[Math.max(passRef.current - 1, 0)]
    const faceRadius = RadiusAtZ(rawProfile, toolZ.current)
    faceCapRef.current.position.y = toolZ.current
    faceCapRef.current.scale.set(faceRadius, 1, faceRadius)
    faceCapRef.current.visible = cutting

    // Back/bottom cap always visible
    const backZ = profile.at(-1).z
    const backRadius = RadiusAtZ(allProfiles[passRef.current], backZ)
    backCapRef.current.position.y = backZ
    backCapRef.current.scale.set(backRadius, 1, backRadius)
    backCapRef.current.visible = true
  })

  /* ---------------- RENDER ---------------- */
  return (
    <>
      {/* RAW MATERIAL */}
      <mesh ref={rawPartRef} geometry={rawGeometry}>
        <meshStandardMaterial
          color="#fff"
          metalness={0.5}
          roughness={0.45}
          map={texture}
          clippingPlanes={cutting ? [clipPlane] : []}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* FINISHED PART */}
      <mesh ref={partRef} geometry={finishedGeometry}>
        <meshStandardMaterial
          color="#fff"
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

      {/* FRONT CAP */}
      <mesh ref={faceCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="#777" />
      </mesh>

      {/* BACK/BOTTOM CAP */}
      <mesh ref={backCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="#777" />
      </mesh>

      {/* TOOL */}
      <Tool ref={toolRef} />
    </>
  )
}
 