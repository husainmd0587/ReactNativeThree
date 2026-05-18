import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../utils/materials/textures'
import CanvaPovider from '../../../provider'

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

function generateCncPasses(profile, rawRadius, maxDepthPerPass) {
  const allProfiles = []
  let currentProfile = profile.map(p => ({ z: p.z, r: rawRadius }))

  while (true) {
    const nextProfile = profile.map((p, i) => {
      const currentR = currentProfile[i].r
      return {
        z: p.z,
        r: Math.max(p.r, currentR - maxDepthPerPass),
      }
    })

    allProfiles.push(nextProfile)

    if (nextProfile.every((p, i) => p.r <= profile[i].r + 1e-4)) break
    currentProfile = nextProfile
  }

  return allProfiles
}

/* ---------------- MODES ---------------- */
const MODE_TURN = 0
const MODE_FACE = 1
const MODE_DONE = 2

/* ---------------- WORKPIECE ---------------- */
function Scene({
  length = 7,
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

  const modeRef = useRef(MODE_TURN)
  const passRef = useRef(0)
  const stepRef = useRef(0)

  const toolZ = useRef(profile[0].z)
  const faceX = useRef(rawRadius)

  const toolRef = useRef()
  const partRef = useRef()
  const rawPartRef = useRef()
  const faceCapRef = useRef()
  const backCapRef = useRef()

  const texture = useTextureLoader()

  /* ---------------- PASSES ---------------- */
  const allProfiles = useMemo(
    () => generateCncPasses(profile, rawRadius, maxDepthPerPass),
    [profile, rawRadius, maxDepthPerPass]
  )
  const passes = allProfiles.length - 1

  /* ---------------- CLIP PLANE ---------------- */
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), length / 2),
    [length]
  )

  /* ---------------- GEOMETRY ---------------- */
  const rawGeometry = useMemo(() => {
    const pts = allProfiles[Math.max(passIndex - 1, 0)].map(p => new THREE.Vector2(p.r, p.z))
    pts.push(new THREE.Vector2(0, pts.at(-1).y))
    return new THREE.LatheGeometry(pts, 128)
  }, [passIndex])

  const finishedGeometry = useMemo(() => {
    const pts = allProfiles[passIndex].map(p => new THREE.Vector2(p.r, p.z))
    pts.unshift(new THREE.Vector2(0, pts[0].y))
    return new THREE.LatheGeometry(pts, 128)
  }, [passIndex])

  /* ---------------- ANIMATION ---------------- */
useFrame((_, delta) => {

  /* ================= OD TURNING ================= */
  if (modeRef.current === MODE_TURN) {

    if (passRef.current >= passes) {
      modeRef.current = MODE_FACE
      faceX.current = rawRadius
      return
    }

    const prof = allProfiles[passRef.current]
    const i = stepRef.current
    const n = Math.min(i + 1, prof.length - 1)

    const z0 = prof[i].z
    const z1 = prof[n].z
    const r0 = prof[i].r
    const r1 = prof[n].r

    toolZ.current += delta * speed

    if (toolZ.current >= z1) {
      stepRef.current = n
      if (n === prof.length - 1) {
        passRef.current++
        setPassIndex(passRef.current)
        stepRef.current = 0
        toolZ.current = prof[0].z
        clipPlane.constant = length / 2
        return
      }
    }

    const t = (toolZ.current - z0) / Math.max(z1 - z0, 1e-4)
    const toolX = r0 + t * (r1 - r0)

    // Tool follows OD profile
    toolRef.current.position.set(toolX, toolZ.current, 0)
    clipPlane.constant = -toolZ.current

    /* ---- FRONT FACE (FIXED Z, SHRINKS WITH PROFILE) ---- */
    const faceZ = profile[0].z
    const faceRadius = RadiusAtZ(prof,toolZ.current )

    faceCapRef.current.position.y = toolZ.current + 0.001 // 🔴 push forward
    faceCapRef.current.scale.set(faceRadius , 1, faceRadius )
    faceCapRef.current.visible = true
  }

  /* ================ FACE TURNING ================ */
  else if (modeRef.current === MODE_FACE) {

    faceX.current -= delta * speed

    if (faceX.current <= 0) {
      modeRef.current = MODE_DONE
      setCutting(false)
      faceCapRef.current.visible = false
      return
    }

    const faceZ = profile[0].z

    // Tool feeds radially inward
    toolRef.current.position.set(faceX.current, faceZ, 0)
    clipPlane.constant = -faceZ

    // Face shrinks with tool X
    faceCapRef.current.position.y = faceZ + 0.001
    faceCapRef.current.scale.set(faceX.current, 1, faceX.current)
    faceCapRef.current.visible = true
  }

  /* ================= ROTATION ================= */
  partRef.current.rotation.y += 0.01
  rawPartRef.current.rotation.y += 0.01

  /* ================= BACK CAP ================= */
  const backZ = profile.at(-1).z
  const backProfile = allProfiles[Math.min(passRef.current, passes)]
  const backRadius = RadiusAtZ(backProfile, backZ)

  backCapRef.current.position.y = backZ
  backCapRef.current.scale.set(backRadius, 1, backRadius)
  backCapRef.current.visible = true
})



  /* ---------------- RENDER ---------------- */
  return (
    <>
      <mesh ref={rawPartRef} geometry={rawGeometry}>
        <meshStandardMaterial
          map={texture}
          metalness={0.5}
          roughness={0.45}
          clippingPlanes={cutting ? [clipPlane] : []}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={partRef} geometry={finishedGeometry}>
        <meshStandardMaterial
          map={texture}
          metalness={0.4}
          roughness={0.25}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh ref={faceCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="red"   clippingPlanes={[]} />
      </mesh>

      <mesh ref={backCapRef}>
        <cylinderGeometry args={[1, 1, 0.01, 64]} />
        <meshStandardMaterial color="#777"   clippingPlanes={[]} />
      </mesh>

      <Tool ref={toolRef} />
    </>
  )
}


export default function FaceTurning() {
  return (
    <CanvaPovider>
      <Scene />
    </CanvaPovider>
   )
  }