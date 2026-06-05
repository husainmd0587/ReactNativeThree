if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import Privider from '../../../provider';
import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/worm_gear.glb')
// import { useTextureLoader } from '../assets/all_textures'

function Scene(props) {
  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready } = useGLTF(MODEL_URL)

  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh) return

      // Store mesh
      meshRefs.current[child.name] = child
      console.log('Processing mesh:', child.parent.name)
      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }


      // Materials
      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({
            // map: texture,
            color: '#999',
            metalness: 0.7,
            roughness: 0.2,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: 'gray',
            metalness: 0.7,
            roughness: 0.2,
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
    const gear = meshRefs.current['Gear']
    const gearShaft = meshRefs.current['Plane']

    // Rotate parent pivot nodes
    if (gear) {
      gear.rotation.y += delta * 0.2
    }

    if (gearShaft) {
      gearShaft.rotation.y += delta * 4
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

const WormGear = (props) => {
  return (
    <Privider camPosition={[2,7,2]}>
      <Scene {...props} />
    </Privider>)
    }

export default WormGear