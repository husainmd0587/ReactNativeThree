import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { LatheCylinder } from './components/shapes'

export default function CncTurningGroup(props) {
  const spindleRef = useRef()
  const [radius, setRadius] = useState(1)

  useFrame(() => {
    if (!spindleRef.current) return

    // True circular spindle rotation (Z-axis)
    spindleRef.current.rotation.z += 0.15

    // Material removal
    setRadius(r => (r > 0.4 ? r - 0.001 : r))
  })

  return (
    <group {...props}>
      {/* WORKPIECE */}
      <mesh ref={spindleRef}>
        <LatheCylinder radius={radius} length={4} segments={96} />
        <meshStandardMaterial
          color="#9ca3af"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* CUTTING TOOL */}
      <mesh position={[1.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.2, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}
