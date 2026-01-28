import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTextureLoader } from '../../../assets/all_textures'
import { useSelector } from 'react-redux'

export default function FreehandTurning({ radialSegments = 64 }) {
  const { x, y, active } = useSelector(state => state.gesture)

  const meshRef = useRef()
  const geometryRef = useRef()
  const dirtyNormalsRef = useRef(false)

  /* ---------------- PROFILE (WOOD SHAPE) ---------------- */
  const profileRef = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      y: (i / 79) * 5,
      r: 2.0,
    }))
  )

  /* ---------------- PRECOMPUTE TRIG TABLE ---------------- */
  const trigTable = useMemo(() => {
    return Array.from({ length: radialSegments }, (_, i) => {
      const t = (i / radialSegments) * Math.PI * 2
      return [Math.cos(t), Math.sin(t)]
    })
  }, [radialSegments])

  /* ---------------- TEXTURE ---------------- */
  const texture = useTextureLoader()
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(radialSegments / 8, 1)

  /* ---------------- CREATE GEOMETRY ONCE ---------------- */
  useEffect(() => {
    const profilePoints = profileRef.current.length
    const vertexCount = radialSegments * profilePoints

    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
    )
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(uvs, 2)
    )

    const indices = []
    for (let i = 0; i < radialSegments; i++) {
      const next = (i + 1) % radialSegments
      for (let j = 0; j < profilePoints - 1; j++) {
        const a = i * profilePoints + j
        const b = next * profilePoints + j
        const c = next * profilePoints + j + 1
        const d = i * profilePoints + j + 1
        indices.push(a, b, d, b, c, d)
      }
    }

    geometry.setIndex(indices)

    geometryRef.current = geometry
    meshRef.current.geometry = geometry

    // initial build
    updateLatheGeometry(
      geometry,
      radialSegments,
      profileRef.current,
      trigTable
    )

    geometry.computeVertexNormals()

  }, [radialSegments, trigTable])

  /* ---------------- FRAME LOOP ---------------- */
  useFrame(() => {
    if (!meshRef.current) return

    // spindle rotation (cheap)
    meshRef.current.rotation.x += 0.05

    if (!active) {
      // recompute normals once after cutting ends
      if (dirtyNormalsRef.current && geometryRef.current) {
        geometryRef.current.computeVertexNormals()
        dirtyNormalsRef.current = false
      }
      return
    }

    const toolY = THREE.MathUtils.lerp(0, 5, y)
    const cutDepth = THREE.MathUtils.clamp(x * 0.05, 0, 0.06)

    const profile = profileRef.current
    let changed = false

    for (let i = 0; i < profile.length; i++) {
      const p = profile[i]
      const d = Math.abs(p.y - toolY)

      if (d < 0.08) {
        const falloff = Math.exp(-d * 35)
        const newR = Math.max(0.15, p.r - cutDepth * falloff)

        if (newR !== p.r) {
          p.r = newR
          changed = true
        }
      }
    }

    if (changed && geometryRef.current) {
      updateLatheGeometry(
        geometryRef.current,
        radialSegments,
        profile,
        trigTable
      )
      dirtyNormalsRef.current = true
    }
  })

  return (
    <group>
         <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      rotation={[0, 0, Math.PI / 2]}
      position={[2.5, 2.5, 0]}
    >
      <meshStandardMaterial
        map={texture}
        metalness={0.3}
        roughness={0.15}
        flatShading
        side={THREE.DoubleSide}
      />
    </mesh>
    <mesh rotation={[0, 0, 0]}
     position={[x,y, 0]}>
  <boxGeometry args={[0.3, 0.8, .1]} />
  <meshStandardMaterial color="red" />
</mesh>
    </group>
  )
}

/* ---------------- FAST LATHE UPDATE ---------------- */
function updateLatheGeometry(geometry, radialSegments, profile, trigTable) {
  const pos = geometry.attributes.position.array
  const uvs = geometry.attributes.uv.array
  const points = profile.length

  let v = 0
  let uvIndex = 0

  for (let i = 0; i < radialSegments; i++) {
    const [cos, sin] = trigTable[i]
    const u = i / (radialSegments - 1) // horizontal UV

    for (let j = 0; j < points; j++) {
      const p = profile[j]

      pos[v++] = p.r * cos
      pos[v++] = p.y
      pos[v++] = p.r * sin

      const vCoord = j / (points - 1) // vertical UV
      uvs[uvIndex++] = u
      uvs[uvIndex++] = vCoord
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.uv.needsUpdate = true
}
