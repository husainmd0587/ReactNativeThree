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
import SoundPlayer from '../../../utils/sound/soundPlayer'
const MODEL_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/RobotsModals/robot.glb'


// import { useTextureLoader } from '../assets/all_textures'

function Robot2(props) {


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

  useEffect(() => {
  const action = actions['Armature|ArmatureAction']

  let mounted = true

  const startRobot = async () => {
    if (!action) return

    try {
      // WAIT for sound load
      await SoundPlayer.load(
        'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/RobotsModals/robot.mp3'
      )

      if (!mounted) return

      // START BOTH TOGETHER
      action.reset().fadeIn(0.5).play()

      SoundPlayer.play()
    } catch (e) {
      console.log(e)
    }
  }

  startRobot()

  return () => {
    mounted = false

    action?.fadeOut(0.5)

    SoundPlayer.stop()
    SoundPlayer.release()
  }
}, [actions])



  if (!ready || !scene) return null

  return (
    <primitive
      ref={group}
      object={scene}
      {...props}
    />
  )
}

export default Robot2