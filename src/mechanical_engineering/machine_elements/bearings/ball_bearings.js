if (typeof navigator === 'undefined') {
  global.navigator = {
    userAgent: 'ReactNative',
  }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import React, {
  useRef,
  useEffect,
  useMemo,
} from 'react'
import { useFrame } from '@react-three/fiber/native'
import {
  MeshStandardMaterial,
} from 'three'
import { useGLTF } from '../../../hooks/useGLTFonline'

const MODEL_URL =
  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/bearings/ball_bearings.glb'

function BallBearings(props) {
  const group = useRef()
  const meshRefs = useRef({})

  const { scene, ready } =
    useGLTF(MODEL_URL)

  // clone scene
  const clonedScene = useMemo(() => {
    if (!scene) return null

    const clone = scene.clone(true)

    clone.traverse((child) => {
      if (!child.isMesh) return

      meshRefs.current[child.name] = child

      if (child.parent) {
        meshRefs.current[
          child.parent.name
        ] = child.parent
      }

      child.castShadow = true
      child.receiveShadow = true

      switch (child.name) {
        case 'mesh_0':
          child.material =
            new MeshStandardMaterial({
              color: '#999',
              metalness: 0.9,
              roughness: 0.2,
            })
          break

        case 'mesh_1':
          child.material =
            new MeshStandardMaterial({
              color: '#ccc',
              metalness: 0.9,
              roughness: 0.4,
            })
          break

        default:
          child.material =
            new MeshStandardMaterial({
              color: '#999',
              metalness: 0.9,
              roughness: 0.4,
            })
      }
    })

    return clone
  }, [scene])

  useFrame((state, delta) => {
    const gear1 =
      meshRefs.current['bearings001']
    const gear2 =
      meshRefs.current['bearings002']

    if (gear1) {
      gear1.rotation.y +=
        delta * 0.5
    }

    if (gear2) {
      gear2.rotation.y +=
        delta * 2
    }
  })

  if (!ready || !clonedScene)
    return null

  return (
    <group ref={group} {...props}>
      {clonedScene.children.map(
        (child, index) => (
          <primitive
            key={index}
            object={child}
            onClick={(e) => {
              e.stopPropagation()

              console.log(
                'Pressed mesh:',
                e.object.name
              )
            }}
          />
        )
      )}
    </group>
  )
}

export default BallBearings