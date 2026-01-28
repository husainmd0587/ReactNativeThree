import * as THREE from 'three'
import React, { useMemo } from 'react'

export function LatheCylinder({
  radius = 1,
  length = 4,
  segments = 64,
}) {
  const geometry = useMemo(() => {
    const vertices = []
    const indices = []
    const half = length / 2

    // Create rings along Z
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const x = Math.cos(theta) * radius
      const y = Math.sin(theta) * radius

      // Front ring
      vertices.push(x, y, -half)
      // Back ring
      vertices.push(x, y, half)
    }

    // Create faces
    for (let i = 0; i < segments; i++) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3

      // two triangles per quad
      indices.push(a, b, d)
      indices.push(a, d, c)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    )

    geometry.computeVertexNormals()
    return geometry
  }, [radius, length, segments])

  return <primitive object={geometry} attach="geometry" />
}
