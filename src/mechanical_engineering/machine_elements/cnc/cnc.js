if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo,useEffect } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'

import CanvaProvider from '../../../provider'
import { useGLTF } from '../../../hooks/useGLTF'
import {useAnimations}  from '@react-three/drei/native'
const MODEL_URL = require('../../../assets/glb/milling.glb')
// 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/cnc/untitled2.glb'
// 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/cnc/cnc_milling_machine%20(1).glb'


// import { useTextureLoader } from '../assets/all_textures'

function CNC_Comp(props) {
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
      console.log('Processing mesh:', child.parent.name)
       if(child.parent && child.parent.name==='spindel'){
          console.log('Processing mesh:', child.name) 
      }
      // Store mesh
      meshRefs.current[child.name] = child

      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }
         // Materials
            switch (child.name) {
              case 'spindel_mesh':
                child.material = new MeshStandardMaterial({
                  // map: texture,
                   color:'red',
                  metalness: 0.8,
                  roughness: 0,
                })
                break
              default:
                child.material = new MeshStandardMaterial({
                color: '#888',
                metalness: 0.4,
                roughness: 0.5,
                })
            }
      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

    useFrame((state, delta) => {
    const spindel = meshRefs.current['spindel']
    const gear2 = meshRefs.current['spindel_support']

    // Rotate parent pivot nodes
    if (spindel) {
      spindel.rotation.x -= delta * 2
    }

    if (gear2) {
      gear2.position.z = 0.1
     if(gear2.position.z > -0.2){
      // gear2.position.z -= delta * 0.05
     } else{
      // gear2.position.z += 0.2
     }
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

export default function CNC() {
  return (
    <CanvaProvider>
      <CNC_Comp />
    </CanvaProvider>
  )
}