if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/helical_gear.glb')
// import { useTextureLoader } from '../assets/all_textures'



function HelicalGear(props) {
  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready } = useGLTF(MODEL_URL)

  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh) return
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
            color:'#ccc',
            metalness: 0.9,
            roughness: 0.1,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: '#ccc',
            metalness: 0.9,
            roughness: 0.1,
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
    const gear003 = meshRefs.current['Gear']
    const gear005 = meshRefs.current['Gear002']

    // Rotate parent pivot nodes
    if (gear003) {
      gear003.rotation.y += delta * 0.5
    }

    if (gear005) {
      gear005.rotation.y -= delta * 0.5
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

export default HelicalGear