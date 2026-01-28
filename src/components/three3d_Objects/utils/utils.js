import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber/native'

export function createFilledExtrudeGeometry({
  outline,     // [[x,y], ...] closed path
  depth = 10,
}) {
  const vertices = []
  const indices = []
  const len = outline.length

  // ---- vertices (front + back) ----
  outline.forEach(([x, y]) => {
    vertices.push(x, y, 0)       // front
    vertices.push(x, y, depth)   // back
  })

  // ---- side faces ----
  for (let i = 0; i < len - 1; i++) {
    const a = i * 2
    const b = a + 1
    const c = (i + 1) * 2
    const d = c + 1

    indices.push(a, b, d)
    indices.push(a, d, c)
  }

  // ---- front face (fan triangulation) ----
  for (let i = 1; i < len - 1; i++) {
    indices.push(0, i * 2, (i + 1) * 2)
  }

  // ---- back face (fan triangulation) ----
  for (let i = 1; i < len - 1; i++) {
    indices.push(
      1,
      (i + 1) * 2 + 1,
      i * 2 + 1
    )
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}



function RotatingGroup({ speed = 0.02, children }) {
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.rotation.z += speed
  })

  return <group ref={groupRef}>{children}</group>
}
