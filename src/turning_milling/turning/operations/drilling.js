import React, { useMemo, useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../utils/materials/textures'
import CanvaPovider from '../../../provider'
/* ================= DRILL TOOL ================= */
export const DrillTool = forwardRef((props, ref) => {
    const texture = useTextureLoader({})
  return (
    <group ref={ref} {...props}>
      {/* Tool body */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 2, 32]} />
        <meshStandardMaterial    
          map={texture}
          metalness={0.4}
          roughness={0.25} />
      </mesh>

      {/* Drill tip (reference) */}
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.5, 0.5, 32]} />
        <meshStandardMaterial    
         map={texture}
          metalness={0.4}
          roughness={0.25} />
      </mesh>
    </group>
  )
})

/* ================= DRILLING OPERATION ================= */
function Scene({ length = 5, rawRadius = 1 }) {
  const rawPartRef = useRef()
  const groupRef = useRef()
  const toolRef = useRef()
 
const texture = useTextureLoader({})

  const DRILL_TIP_OFFSET_Y = 1.07

  /* ---------- RAW PART GEOMETRY ---------- */
  const rawGeometry = useMemo(() => {
    const profile = [
      { r: 0, z: -0.005 },
      { r: rawRadius-0.005, z: -0.005 },
      { r: rawRadius-0.005, z: length-0.005 },
      { r: 0, z: length },
    ]
    const pts = profile.map(p => new THREE.Vector2(p.r, p.z))
    return new THREE.LatheGeometry(pts, 128)
  }, [length, rawRadius])

  /* ---------- FINISHED PART (HOLE) ---------- */
  const finishedGeometry = useMemo(() => {
    const holeRadius = 0.5
    const profile = [
      { r: holeRadius, z: 0 },
      { r: rawRadius, z: 0 },
      { r: rawRadius, z: length },
      { r: holeRadius, z: length },
    ]
    const pts = profile.map(p => new THREE.Vector2(p.r, p.z))
    return new THREE.LatheGeometry(pts, 128)
  }, [length, rawRadius])

  /* ---------- CLIPPING PLANE ---------- */
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  )

  /* ---------- ANIMATION ---------- */
  useFrame((_, delta) => {
    if (!toolRef.current) return
    if (toolRef.current.position.y > length+2){
        return
    }

   
    groupRef.current.rotation.y+=0.05
    toolRef.current.rotation.y-=0.09
    const speed = 0.9 * delta

    // Move tool
    toolRef.current.position.y += speed

    // Drill tip world Y
    const tipY = toolRef.current.position.y

    // Align everything
  
    clipPlane.constant = -tipY
  })

  return (
    <>
      {/* TOOL */}
      <DrillTool ref={toolRef} position={[0, -3, 0]} />

      <group   ref={groupRef}>
          {/* RAW MATERIAL */}
      <mesh ref={rawPartRef}>
        <primitive object={rawGeometry} />
        <meshStandardMaterial
          map={texture}
          metalness={0.4}
          roughness={0.25}
          clippingPlanes={[clipPlane]}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* FINISHED PART (REFERENCE) */}
      <mesh
        geometry={finishedGeometry}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          map={texture}
          metalness={0.4}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    
      </group>
    </>
  )
}

export default function DrillingOperation() {
  return (
    <CanvaPovider camPosition={[1,-4,6]}>
      <Scene />
    </CanvaPovider>
  )
}
