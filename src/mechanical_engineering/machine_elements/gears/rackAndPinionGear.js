import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import { useGLTF } from '../../../hooks/useGLTF'

const MODEL_URL = require('../../../assets/glb/rackandpinion_gear.glb')
import Privider from '../../../provider';
const GEAR_RADIUS = 1
const ANGULAR_SPEED = .4
const RACK_HALF_TRAVEL = 2
const LINEAR_SPEED = ANGULAR_SPEED * GEAR_RADIUS

function Scene(props) {
  const group = useRef()
  const meshRefs = useRef({})
  const rackOffset = useRef(0)
  const direction = useRef(1)         // +1 = forward, -1 = reverse

  const { scene, ready } = useGLTF(MODEL_URL)

  useMemo(() => {
    if (!scene) return
    scene.traverse((child) => {
      if (!child.isMesh) return
      meshRefs.current[child.name] = child
      if (child.parent) meshRefs.current[child.parent.name] = child.parent

      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({ color: 'gray', metalness: 0.6, roughness: 0.2 })
          break
        case 'mesh_1':
          child.material = new MeshStandardMaterial({ color: 'gray', metalness: 0.7, roughness: 0.2 })
          break
      }
      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  useFrame((_state, delta) => {
    const gear = meshRefs.current['Gear']
    const rack = meshRefs.current['Rack']

    // Advance rack position in current direction
    rackOffset.current += LINEAR_SPEED * delta * direction.current

    // Reverse direction smoothly at travel limits
    if (rackOffset.current >= RACK_HALF_TRAVEL) {
      rackOffset.current = RACK_HALF_TRAVEL   // clamp to boundary
      direction.current = -1                  // start returning
    } else if (rackOffset.current <= -RACK_HALF_TRAVEL) {
      rackOffset.current = -RACK_HALF_TRAVEL  // clamp to boundary
      direction.current = 1                   // start going forward
    }

    // Rack slides
    if (rack) {
      rack.position.x = rackOffset.current
    }

    // Pinion rotates in sync — direction flips automatically via direction.current
    if (gear) {
      gear.rotation.y += ANGULAR_SPEED * delta * direction.current
    }
  })

  if (!ready || !scene) return null

  return (
    <primitive ref={group} object={scene} {...props} />
  )
}


const RackAndPinionGear = (props) => {
  return <Privider camPosition={[2,7,2]}>
    <Scene {...props} />
  </Privider>
}


export default RackAndPinionGear