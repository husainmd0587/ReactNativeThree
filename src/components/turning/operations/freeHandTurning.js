import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useSelector } from 'react-redux'
import { useTextureLoader } from '../../../assets/all_textures'

const DZ = 0.02        // axial resolution
const TOOL_WIDTH = 0.01

export default function FreehandTurning({
  rawRadius = 1.6,
  length = 6,
  segments = 96,
}) {
  const partRef = useRef()
  const geometryRef = useRef()
  const texture = useTextureLoader()

  const { x, y, active } = useSelector(state => state.gesture)
  console.log(x,y,active)
  // x = R (radius), y = Z (axial)

  const profileRef = useRef([])
  const dirtyRef = useRef(false)

  /* ---------- INIT PROFILE ---------- */
  useEffect(() => {
    const profile = []
    for (let z = 0; z <= length; z += DZ) {
      profile.push({ z, r: rawRadius })
    }
    profileRef.current = profile
    rebuildGeometry()
  }, [])

  /* ---------- CUT APPLY ---------- */
  const applyToolCut = (toolZ, toolR) => {
    const profile = profileRef.current
    let changed = false

    for (let i = 0; i < profile.length; i++) {
      const p = profile[i]
      if (Math.abs(p.z - toolZ) <= TOOL_WIDTH / 2) {
        if (toolR < p.r) {
          p.r = toolR
          changed = true
        }
      }
    }

    return changed
  }

  /* ---------- GEOMETRY BUILD ---------- */
  const rebuildGeometry = () => {
    const pts = []

    // bottom cap
    pts.push(new THREE.Vector2(0, 0))

    for (const p of profileRef.current) {
      pts.push(new THREE.Vector2(p.r, p.z))
    }

    // top cap
    pts.push(new THREE.Vector2(0, length))

    const geo = new THREE.LatheGeometry(pts, segments)
    geometryRef.current.copy(geo)
    geometryRef.current.computeVertexNormals()
    geo.dispose()
  }

  /* ---------- FRAME LOOP ---------- */
  useFrame(() => {
    partRef.current.rotation.y += 0.03

    if (!active) return

    const toolR = Math.max(0.01, x)
    const toolZ = THREE.MathUtils.clamp(y, 0, length)

    const cut = applyToolCut(toolZ, toolR)

    if (cut) {
      rebuildGeometry()
    }
  })

  /* ---------- RENDER ---------- */
  return (
    <mesh ref={partRef}>
      <latheGeometry ref={geometryRef} />
      <meshStandardMaterial
        color="#fff"
        metalness={0.4}
        roughness={0.3}
        map={texture}
      />
    </mesh>
  )
}
