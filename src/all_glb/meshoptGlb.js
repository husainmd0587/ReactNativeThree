if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const { MeshoptDecoder } = require('./meshopt_decoder_reference.js')

const MODEL_URL =  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/testing/cubes125c.glb'

export function Cubes125(props) {
  const [gltf, setGltf] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        await MeshoptDecoder.ready
        console.log('MeshoptDecoder ready, supported:', MeshoptDecoder.supported)

        const res = await fetch(MODEL_URL)
        const buffer = await res.arrayBuffer()
        console.log('Model buffer:', buffer.byteLength)

        const manager = new LoadingManager()
        manager.itemStart = () => {}
        manager.itemEnd = () => {}
        manager.itemError = () => {}

        const loader = new GLTFLoader(manager)
        loader.meshoptDecoder = MeshoptDecoder

        loader.parse(
          buffer,
          '',
          (result) => {
            console.log('GLTF loaded successfully!')
            setGltf(result)
            setLoading(false)
          },
          (err) => {
            console.error('Parse error:', err)
            setError(err)
            setLoading(false)
          }
        )
      } catch (e) {
        console.error('Load error:', e)
        setError(e)
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading || error || !gltf) return null

  return (
    <group {...props}>
      <primitive object={gltf.scene} />
    </group>
  )
}