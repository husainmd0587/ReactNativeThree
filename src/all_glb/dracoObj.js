import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FileLoader, Renderer } from 'expo-three'  // expo-three wraps WebGLRenderer for RN
import { GLView } from 'expo-gl'

// ── URLs ──────────────────────────────────────────────────────────────────────
const MODEL_URL =
  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/testing/cubes.glb'
const DRACO_URL =
  'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/draco/draco_decoder.js'

// ── Navigator polyfill ────────────────────────────────────────────────────────
if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

// ── Patch FileLoader ──────────────────────────────────────────────────────────
FileLoader.prototype.load = function (url, onLoad, _onProgress, onError) {
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => onLoad(buf))
    .catch(onError)
  return {}
}

// ── Draco helpers ─────────────────────────────────────────────────────────────
function getDracoDataType(draco, attributeType) {
  switch (attributeType) {
    case Float32Array: return draco.DT_FLOAT32
    case Int8Array:    return draco.DT_INT8
    case Int16Array:   return draco.DT_INT16
    case Int32Array:   return draco.DT_INT32
    case Uint8Array:   return draco.DT_UINT8
    case Uint16Array:  return draco.DT_UINT16
    case Uint32Array:  return draco.DT_UINT32
  }
}

function decodeIndex(draco, decoder, dracoGeometry) {
  const numFaces   = dracoGeometry.num_faces()
  const numIndices = numFaces * 3
  const byteLength = numIndices * 4
  const ptr        = draco._malloc(byteLength)
  decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr)
  const index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice()
  draco._free(ptr)
  return { array: index, itemSize: 1 }
}

function decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute) {
  const numComponents = attribute.num_components()
  const numPoints     = dracoGeometry.num_points()
  const numValues     = numPoints * numComponents
  const byteLength    = numValues * attributeType.BYTES_PER_ELEMENT
  const dataType      = getDracoDataType(draco, attributeType)
  const ptr           = draco._malloc(byteLength)
  decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dataType, byteLength, ptr)
  const array = new attributeType(draco.HEAPF32.buffer, ptr, numValues).slice()
  draco._free(ptr)
  return { name: attributeName, array, itemSize: numComponents }
}

function decodeGeometry(draco, decoder, array, taskConfig) {
  const { attributeIDs, attributeTypes } = taskConfig
  let dracoGeometry, decodingStatus

  const geometryType = decoder.GetEncodedGeometryType(array)
  if (geometryType === draco.TRIANGULAR_MESH) {
    dracoGeometry  = new draco.Mesh()
    decodingStatus = decoder.DecodeArrayToMesh(array, array.byteLength, dracoGeometry)
  } else if (geometryType === draco.POINT_CLOUD) {
    dracoGeometry  = new draco.PointCloud()
    decodingStatus = decoder.DecodeArrayToPointCloud(array, array.byteLength, dracoGeometry)
  } else {
    throw new Error('Unexpected geometry type: ' + geometryType)
  }

  if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
    throw new Error('Draco decoding failed: ' + decodingStatus.error_msg())
  }

  const typeMap = {
    Float32Array, Int8Array, Int16Array, Int32Array,
    Uint8Array, Uint16Array, Uint32Array,
  }
  const geometry = { index: null, attributes: [] }

  for (const attributeName in attributeIDs) {
    const attributeType = typeMap[attributeTypes[attributeName]]
    if (!attributeType) continue

    let attribute, attributeID
    if (taskConfig.useUniqueIDs) {
      attributeID = attributeIDs[attributeName]
      attribute   = decoder.GetAttributeByUniqueId(dracoGeometry, attributeID)
    } else {
      attributeID = decoder.GetAttributeId(dracoGeometry, draco[attributeIDs[attributeName]])
      if (attributeID === -1) continue
      attribute = decoder.GetAttribute(dracoGeometry, attributeID)
    }

    const result = decodeAttribute(
      draco, decoder, dracoGeometry, attributeName, attributeType, attribute
    )
    if (attributeName === 'color') result.vertexColorSpace = taskConfig.vertexColorSpace
    geometry.attributes.push(result)
  }

  if (geometryType === draco.TRIANGULAR_MESH) {
    geometry.index = decodeIndex(draco, decoder, dracoGeometry)
  }

  draco.destroy(dracoGeometry)
  return geometry
}

// ── Draco module loader ───────────────────────────────────────────────────────
let dracoModulePromise = null

function loadDracoModule(decoderText) {
  if (dracoModulePromise) return dracoModulePromise
  dracoModulePromise = new Promise((resolve, reject) => {
    try {
      const moduleObj = {}
      moduleObj.onModuleParsed = function () {
        if (moduleObj.Decoder && moduleObj._malloc) {
          resolve(moduleObj)
        } else {
          moduleObj.ready.then(() => resolve(moduleObj)).catch(reject)
        }
      }
      // eslint-disable-next-line no-new-func
      new Function('DracoDecoderModule', decoderText)(moduleObj)
    } catch (e) {
      reject(e)
    }
  })
  return dracoModulePromise
}

// ── Load GLB ──────────────────────────────────────────────────────────────────
async function loadGLB() {
  const [modelBuffer, decoderText] = await Promise.all([
    fetch(MODEL_URL).then(r => r.arrayBuffer()),
    fetch(DRACO_URL).then(r => r.text()),
  ])

  const dracoModule = await loadDracoModule(decoderText)
  const loader = new GLTFLoader()

  loader.register(parser => ({
    name: 'KHR_draco_mesh_compression',
    async decodePrimitive(primitive) {
      const { bufferView, attributes } =
        primitive.extensions.KHR_draco_mesh_compression

      const bufferViewData = await parser.getDependency('bufferView', bufferView)

      const taskConfig = {
        attributeIDs:    {},
        attributeTypes:  {},
        useUniqueIDs:    true,
        vertexColorSpace: THREE.LinearSRGBColorSpace,
      }
      for (const [name, id] of Object.entries(attributes)) {
        taskConfig.attributeIDs[name]   = id
        taskConfig.attributeTypes[name] = 'Float32Array'
      }

      const decoder  = new dracoModule.Decoder()
      const geometry = decodeGeometry(
        dracoModule, decoder, new Int8Array(bufferViewData), taskConfig
      )
      dracoModule.destroy(decoder)

      const bufferGeometry = new THREE.BufferGeometry()
      for (const attr of geometry.attributes) {
        bufferGeometry.setAttribute(
          attr.name,
          new THREE.BufferAttribute(attr.array, attr.itemSize)
        )
      }
      if (geometry.index) {
        bufferGeometry.setIndex(
          new THREE.BufferAttribute(geometry.index.array, 1)
        )
      }
      return bufferGeometry
    },
  }))

  return new Promise((resolve, reject) => {
    loader.parse(modelBuffer, '', resolve, reject)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CastIronPart({ style }) {
  const rafRef = useRef(null)

  async function onContextCreate(gl) {
    // expo-three's Renderer handles the RN-specific WebGL setup
    const renderer = new Renderer({ gl })
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene  = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(
      60,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.01,
      1000
    )
    camera.position.set(0, 1, 3)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(5, 10, 5)
    scene.add(dir)

    try {
      const gltf   = await loadGLB()
      const box    = new THREE.Box3().setFromObject(gltf.scene)
      const center = box.getCenter(new THREE.Vector3())
      const size   = box.getSize(new THREE.Vector3())
      const scale  = 2 / Math.max(size.x, size.y, size.z)
      gltf.scene.position.sub(center)
      gltf.scene.scale.setScalar(scale)
      scene.add(gltf.scene)
      console.log('✅ Model added to scene')
    } catch (e) {
      console.error('❌ GLB load error:', e)
    }

    let angle = 0
    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      angle += 0.005
      camera.position.x = Math.sin(angle) * 3
      camera.position.z = Math.cos(angle) * 3
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      gl.endFrameEXP()
    }
    animate()
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <GLView
      style={style ?? { flex: 1 }}
      onContextCreate={onContextCreate}
    />
  )
}