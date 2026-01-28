import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../assets/all_textures'

/* ---------------- TOOL ---------------- */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.12, 0.35, 0.12]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))

/* ---------------- HELPERS ---------------- */
function RadiusAtZ(profile, z) {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (z >= a.z && z <= b.z) {
      const t = (z - a.z) / Math.max(b.z - a.z, 0.0001)
      return a.r + t * (b.r - a.r)
    }
  }
  return profile.at(-1).r
}

/* ---------------- WORKPIECE ---------------- */
export default function PartingOperations({
  rawRadius = 1.6,
  feed = 0.4,

  partingZ = 0,
  partingWidth = 0.15,

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
  const texture = useTextureLoader()

  const toolRef = useRef()
  const leftRef = useRef()
  const rightRef = useRef()

  /* ---------------- STATE ---------------- */
  const [cutProgress, setCutProgress] = useState(1) // 1 → 0
  const [parted, setParted] = useState(false)

  /* ---------------- FINAL PROFILE ---------------- */
  const finalProfile = useMemo(() => profile, [profile])

  const startRadius = useMemo(
    () => RadiusAtZ(finalProfile, partingZ),
    [finalProfile, partingZ]
  )

  /* ---------------- SPLIT PROFILES ---------------- */
  const { leftProfile, rightProfile } = useMemo(() => ({
    leftProfile: finalProfile.filter(p => p.z <= partingZ),
    rightProfile: finalProfile.filter(p => p.z >= partingZ),
  }), [finalProfile, partingZ])

  /* ---------------- GEOMETRIES ---------------- */
  const leftGeometry = useMemo(() => {
    const pts = leftProfile.map(p => new THREE.Vector2(p.r, p.z))
    pts.unshift(new THREE.Vector2(0, pts[0].y))
    return new THREE.LatheGeometry(pts, 128)
  }, [leftProfile])

  const rightGeometry = useMemo(() => {
    const pts = rightProfile.map(p => new THREE.Vector2(p.r, p.z))
    pts.push(new THREE.Vector2(0, pts.at(-1).y))
    return new THREE.LatheGeometry(pts, 128)
  }, [rightProfile])

  const middleGeometry = useMemo(() => {
    if (cutProgress <= 0) return null

    const r = startRadius * cutProgress
    const z0 = partingZ - partingWidth / 2
    const z1 = partingZ + partingWidth / 2

    return new THREE.LatheGeometry(
      [
        new THREE.Vector2(r, z0),
        new THREE.Vector2(r, z1),
      ],
      64
    )
  }, [startRadius, partingZ, partingWidth, cutProgress])

  /* ---------------- ANIMATION ---------------- */
  useFrame((_, delta) => {
    leftRef.current.rotation.y += 0.01
    rightRef.current.rotation.y += 0.01

    if (!parted) {
      setCutProgress(p => {
        const next = Math.max(0, p - delta * feed)
        if (next === 0) setParted(true)
        return next
      })
    } else {
      rightRef.current.position.y += delta * 0.4
    }

    // TOOL POSITION (RADIAL FEED)
    const toolX = startRadius * cutProgress
    toolRef.current.position.set(toolX, partingZ, 0)
  })

  /* ---------------- RENDER ---------------- */
  return (
    <>
      {/* LEFT PART */}
      <mesh ref={leftRef} geometry={leftGeometry}>
        <meshStandardMaterial
          map={texture}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* PARTING ZONE */}
      {middleGeometry && (
        <mesh geometry={middleGeometry}>
          <meshStandardMaterial color="#888" />
        </mesh>
      )}

      {/* RIGHT PART */}
      <mesh ref={rightRef} geometry={rightGeometry}>
        <meshStandardMaterial
          map={texture}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* TOOL */}
      <Tool ref={toolRef} />
    </>
  )
}
