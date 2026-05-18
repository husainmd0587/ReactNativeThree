import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber/native'
import CanvaProvider from '../../../../provider'

function VoxelCube() {
  const voxels = useMemo(() => {
    const cubes = []

    const size = 10
    const voxelSize = 1.1

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
          cubes.push(
            <mesh
              key={`${x}-${y}-${z}`}
              position={[
                x * voxelSize,
                y * voxelSize,
                z * voxelSize,
              ]}
            >
              <boxGeometry args={[1, 1, 1]}  />
              <meshStandardMaterial color="red" />
            </mesh>
          )
        }
      }
    }

    return cubes
  }, [])

  return <>{voxels}</>
}

export default function Voxel() {
    return (
        <CanvaProvider>
            <VoxelCube /> 
        </CanvaProvider>
    )
}