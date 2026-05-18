import React, { useEffect, useState, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { NativeModules } from 'react-native'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { useFrame } from '@react-three/fiber'
import { useTextureLoader } from '../../../../assets/all_textures'

const { NativeTest } = NativeModules

/* --------------------------------------------------
   Native Lathe Geometry (must be CLOSED & WATERTIGHT)
-------------------------------------------------- */
async function createLatheGeometry() {
  const profile = [
     0, 0,
    -2, 0.5,
    -1, 2.7,
     0, 2.0,
     1, 0.6,
     2, 0.3,
    0, 0
  ]

  const segments = 64

  const data = await NativeTest.generateLatheFromJS(profile, segments)

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(data.vertices), 3)
  )

  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array(data.uvs), 2)
  )

  geometry.setIndex(
    new THREE.BufferAttribute(new Uint32Array(data.indices), 1)
  )

  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/* --------------------------------------------------
   Component
-------------------------------------------------- */
export default function CreateLatheMeshFromC() {
  const textures = useTextureLoader()
  const meshRef = useRef()
  const [geometry, setGeometry] = useState(null)

  /* ---------- MATERIAL ---------- */
  const stockMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#cccccc',
      side: THREE.DoubleSide
    })
  }, [])

  /* ---------- EVALUATOR (IMPORTANT) ---------- */
  const evaluator = useMemo(() => {
    const e = new Evaluator()
    e.useGroups = false          // 🔴 REQUIRED
    return e
  }, [])

  /* ---------- STOCK (MUST BE BIGGER THAN TOOL) ---------- */
  const stock = useMemo(() => {
    const geo = new THREE.BoxGeometry(2, 2, 4)
    geo.computeVertexNormals()
    return new Brush(geo, stockMaterial)
  }, [stockMaterial])

  /* ---------- BUILD CSG ---------- */
  useEffect(() => {
    let mounted = true

    createLatheGeometry().then(latheGeo => {
      /* 🔴 VERY IMPORTANT */
      latheGeo.computeVertexNormals()
      const toolGeo = new THREE.CylinderGeometry(1, 1, 4, 32);
      const toolBrush = new Brush(
        toolGeo,
        new THREE.MeshStandardMaterial({ color: '#ff0000' })
      )

      /* 🔴 Update matrices BEFORE evaluate */
      toolBrush.position.set(0, 0, 0)
      toolBrush.updateMatrixWorld(true)
      stock.updateMatrixWorld(true)

      const result = evaluator.evaluate(
        stock,
        toolBrush,
        SUBTRACTION
      )

      result.geometry.computeVertexNormals()

      if (mounted) {
        setGeometry(result.geometry)
      }
    })

    return () => { mounted = false }
  }, [evaluator, stock])

  /* ---------- ROTATION ---------- */
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  if (!geometry) return null

  /* ---------- RENDER ---------- */
  return (
    <mesh geometry={geometry} ref={meshRef}>
      <meshStandardMaterial
        map={textures}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
