if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/bevel_gear.glb')


// import { useTextureLoader } from '../assets/all_textures'

function BevelGear(props) {
  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready } = useGLTF(MODEL_URL)

  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh) return
      console.log('Processing mesh:', child.parent.name)
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
             color:'gray',
            metalness: 0.8,
            roughness: 0,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: 'gray',
            metalness: 0.9,
            roughness: 0,
          })
          break
      }

      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  // Animate gears
  useFrame((state, delta) => {
    const gear1 = meshRefs.current['Gear001']
    const gear2 = meshRefs.current['Gear002']

    // Rotate parent pivot nodes
    if (gear1) {
      gear1.rotation.y += delta * 2
    }

    if (gear2) {
      gear2.rotation.x += delta * 2
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

export default BevelGear