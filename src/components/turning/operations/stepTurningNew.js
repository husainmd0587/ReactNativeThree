import React, { useMemo, useRef } from 'react' 
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader, TurningMaterial } from '../../../assets/all_textures'

export default function TurningWorkpiece() {
  // ===== PART SETTINGS =====
  const PROFILE_RES = 512
  const LENGTH = 4
  const RADIUS = 1

  // ===== CUT SETTINGS =====
  const CUT_START = 0
  const CUT_END = 300
  const FEED = 5          // Z feed speed
  const TOOL_WIDTH = 1     // nose radius simulation

  // ===== REFS =====
  const groupRef = useRef()
  const cutProgress = useRef(0)

  // ===== TEXTURE =====
  const albedo = useTextureLoader()

  // 0–255 profile buffer
  const profile = useRef(new Uint8Array(PROFILE_RES))

  // ===== TAPER POINTS =====
  // [radius, z] with z in 0..LENGTH
  const taperPoints = [
    [1.0, 0],
    [0.8, 1],
    [0.6, 2],
    [0.4, 3],
    [0.4, 4],
  ]

  // ===== PROFILE TEXTURE =====
  const profileTexture = useMemo(() => {
    const tex = new THREE.DataTexture(
      profile.current,
      PROFILE_RES,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType
    )
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.needsUpdate = true
    return tex
  }, [])

  // ===== MATERIAL =====
  const material = useMemo(
    () =>
      TurningMaterial({
        profileTexture,
        albedoMap: albedo,
        partLength: LENGTH,
      }),
    [profileTexture, albedo]
  )

  // ===== GEOMETRY =====
  const bodyGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        RADIUS,
        RADIUS,
        LENGTH,
        64,
        PROFILE_RES,
        true
      ),
    []
  )

  const capGeometry = useMemo(
    () => new THREE.CylinderGeometry(RADIUS, RADIUS, 0.001, 64, 1, false),
    []
  )

  // ===== ANIMATION LOOP =====
  useFrame((_, dt) => {
    if (!groupRef.current) return

    // rotate spindle
    groupRef.current.rotation.y += dt * 2

    // advance tool along Z
    cutProgress.current += dt * FEED
    const idx = Math.floor(cutProgress.current)
    if (idx >= CUT_END) return

    // Fill profile progressively using taper points
    for (let i = 0; i < TOOL_WIDTH; i++) {
      const zi = idx - i
      if (zi < CUT_START) continue

      // map zi to Z in 0..LENGTH
      const zPos = (zi / (PROFILE_RES - 1)) * LENGTH

      // find surrounding taper points
      let p1 = taperPoints[0]
      let p2 = taperPoints[taperPoints.length - 1]
      for (let j = 0; j < taperPoints.length - 1; j++) {
        if (zPos >= taperPoints[j][1] && zPos <= taperPoints[j + 1][1]) {
          p1 = taperPoints[j]
          p2 = taperPoints[j + 1]
          break
        }
      }

      const t = (zPos - p1[1]) / (p2[1] - p1[1])
      const radius = THREE.MathUtils.lerp(p1[0], p2[0], t)

      // convert radius to 0–255
      const value = Math.floor((radius / RADIUS) * 255)

      // apply smoothing over TOOL_WIDTH
      const strength = 1.0 - i / TOOL_WIDTH
      const finalValue = Math.floor(value * strength)

      if (profile.current[zi] < finalValue) {
        profile.current[zi] = finalValue
        profileTexture.needsUpdate = true
      }
    }
  })

  // ===== RENDER =====
  return (
    <group ref={groupRef} position={[0, -3, 0]}>
      {/* SIDE */}
      <mesh geometry={bodyGeometry} material={material} />
      {/* FRONT CAP */}
      <mesh geometry={capGeometry} material={material} position={[0, LENGTH / 2, 0]} />
      {/* BACK CAP */}
      <mesh geometry={capGeometry} material={material} position={[0, -LENGTH / 2, 0]} />
    </group>
  )
}
