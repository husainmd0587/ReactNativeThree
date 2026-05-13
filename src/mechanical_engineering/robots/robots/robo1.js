if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import { useGLTF } from '../../../hooks/useGLTFonline'
const MODEL_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/RobotsModals/mecha_robot.glb'


// import { useTextureLoader } from '../assets/all_textures'

function Robot1(props) {
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
    const gear1 = meshRefs.current['Mesh1_Mesh1010']
  

    // Rotate parent pivot nodes
    if (gear1) {
      gear1.rotation.y += delta * 0.8
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

export default Robot1