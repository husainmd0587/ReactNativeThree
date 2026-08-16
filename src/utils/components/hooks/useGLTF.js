if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Image } from 'react-native'

const { MeshoptDecoder } = require('./meshopt_decoder_reference.js')

let decoderReady = false
const cache = {}

// Resolve both local require() and remote URLs
function resolveURL(url) {
  // Local asset — require() returns a number in RN
  if (typeof url === 'number') {
    const source = Image.resolveAssetSource(url)
    return source.uri
  }
  // Remote URL string
  return url
}

export function useGLTF(url) {
  const [state, setState] = useState({
    nodes: {}, materials: {}, animations: [], scene: null, ready: false
  })

  useEffect(() => {
    if (!url && url !== 0) return

    const resolvedURL = resolveURL(url)
  

    if (cache[resolvedURL]) {
      setState(cache[resolvedURL])
      return
    }

    async function load() {
      try {
        if (!decoderReady) {
          await MeshoptDecoder.ready
          decoderReady = true
        }

        const res = await fetch(resolvedURL)
        const buffer = await res.arrayBuffer()
       

        const manager = new LoadingManager()
        manager.itemStart = () => {}
        manager.itemEnd = () => {}
        manager.itemError = () => {}

        const loader = new GLTFLoader(manager)
        loader.meshoptDecoder = MeshoptDecoder

        loader.parse(buffer, '', (gltf) => {
          const nodes = {}
          const materials = {}

          gltf.scene.traverse((child) => {
            if (child.name) nodes[child.name] = child
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material)
                ? child.material : [child.material]
              mats.forEach(m => { if (m.name) materials[m.name] = m })
            }
          })

          const result = {
            nodes, materials,
            animations: gltf.animations || [],
            scene: gltf.scene,
            ready: true,
          }

          cache[resolvedURL] = result
          setState(result)
        })

      } catch (e) {
        // Silent fail for GLTF load error handling.
      }
    }

    load()
  }, [url])

  return state
}