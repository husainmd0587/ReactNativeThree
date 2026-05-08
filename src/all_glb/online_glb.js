// CastIronPart.jsx - complete file
import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Patch navigator in case index.js patch didn't apply yet
if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

const MODEL_URL =
  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/testing/casteIronPart.glb'

export function Online_CastIronPart(props) {
  const [gltf, setGltf] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        console.log('Fetching GLB...')
        const res = await fetch(MODEL_URL)
        const buffer = await res.arrayBuffer()
        console.log('Buffer received:', buffer.byteLength)

        const manager = new LoadingManager()
        manager.itemStart = () => {}
        manager.itemEnd = () => {}
        manager.itemError = () => {}

        const loader = new GLTFLoader(manager)

        loader.parse(
          buffer,
          '',
          (result) => {
            console.log('GLTF parsed successfully:', result)
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

  if (loading) {
    console.log('Loading model...')
    return null
  }

  if (error) {
    console.error('Render error state:', error)
    return null
  }

  if (!gltf) return null

  return (
    <group {...props}>
      <primitive object={gltf.scene} />
    </group>
  )
}