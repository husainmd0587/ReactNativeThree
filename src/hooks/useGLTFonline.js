if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const { MeshoptDecoder } = require('./meshopt_decoder_reference.js')

let decoderReady = false
const cache = {}

export function useGLTF(url) {
  const [state, setState] = useState({
    nodes: {}, materials: {}, animations: [], scene: null, ready: false
  })

  useEffect(() => {
    if (!url) return
    if (cache[url]) { setState(cache[url]); return }

    async function load() {
      try {
        if (!decoderReady) {
          await MeshoptDecoder.ready
          decoderReady = true
        }

        const res = await fetch(url)
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
          cache[url] = result
          setState(result)
        }, (err) => console.error('useGLTF error:', err))
      } catch (e) {
        console.error('useGLTF load error:', e)
      }
    }

    load()
  }, [url])

  return state
}