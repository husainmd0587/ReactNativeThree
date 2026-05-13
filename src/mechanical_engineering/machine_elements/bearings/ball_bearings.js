if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import { useGLTF } from '../../../hooks/useGLTFonline'
const MODEL_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/bearings/ball_bearings.glb'


// import { useTextureLoader } from '../assets/all_textures'

function BallBearings(props) {
  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready } = useGLTF(MODEL_URL)

  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh) return
      console.log('Processing parent:', child.parent.name)
      console.log('Processing mesh:', child.name)
      // Store mesh
      meshRefs.current[child.name] = child

      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }


      // Materials
      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({
            // map: texture,
             color:'#999',
            metalness: 0.9,
            roughness: 0.2,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: '#ccc',
            metalness: 0.9,
            roughness: 0.4,
          })
          break
        default:
          child.material = new MeshStandardMaterial({
            color: '#999',
            metalness: 0.9,
            roughness: 0.4,
          })

      }

      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  // Animate gears
  useFrame((state, delta) => {
    const gear1 = meshRefs.current['bearings001']
    const gear2 = meshRefs.current['bearings002']

    // Rotate parent pivot nodes
    if (gear1) {
      gear1.rotation.y += delta * .5
    }

    if (gear2) {
      gear2.rotation.y += delta * 2
    }
  })

  if (!ready || !scene) return null

  return (
    <primitive
      ref={group}
      object={scene}
      {...props}
    />
  )
}

export default BallBearings