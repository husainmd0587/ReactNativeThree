if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo,useEffect } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import { useGLTF } from '../../../hooks/useGLTFonline'
import {useAnimations}  from '@react-three/drei/native'
const MODEL_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/cnc/cnc.glb'


// import { useTextureLoader } from '../assets/all_textures'

function CNC(props) {


  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(
    animations,
    group
  )

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
      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

   
  if (!ready || !scene) return null

  return (
    <primitive
      ref={group}
      object={scene}
      {...props}
    />
  )
}

export default CNC