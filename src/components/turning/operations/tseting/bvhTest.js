import React, { useEffect,useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber/native'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { useFrame } from '@react-three/fiber/native'

function CSGObject() {
  const { scene } = useThree()
  const ref=useRef()
  useEffect(() => {
    const evaluator = new Evaluator()

    // ---- Initial stock
    let currentStock = new Brush(
      new THREE.CylinderGeometry(20, 20, 100, 64)
        // new THREE.BoxGeometry(20, 100, 20)

    )
    currentStock.updateMatrixWorld()

    // ---- TOOL 1
    const tool1 = new Brush(
      new THREE.BoxGeometry(10, 10, 110)
    )
    tool1.position.set(10, 0, 0)
    tool1.rotation.set(Math.PI/2,0,0)
    tool1.updateMatrixWorld()

    currentStock = evaluator.evaluate(
      currentStock,
      tool1,
      SUBTRACTION
    )
        // ---- TOOL 4
    const tool4 = new Brush(
      new THREE.BoxGeometry(10, 10, 110)
    )
    tool4.position.set(-10, 0, 0)
    tool4.rotation.set(Math.PI/2,0,0)
    tool4.updateMatrixWorld()

    currentStock = evaluator.evaluate(
      currentStock,
      tool4,
      SUBTRACTION
    )

    // ---- TOOL 2
    const tool2 = new Brush(
      new THREE.BoxGeometry(6, 6, 50)
    )
    tool2.position.set(5, 0, 0)
    tool2.updateMatrixWorld()

    currentStock = evaluator.evaluate(
      currentStock,
      tool2,
      SUBTRACTION
    )

    // ---- TOOL 3
    const tool3 = new Brush(
      new THREE.BoxGeometry(4, 4, 50)
    )
    tool3.position.set(8, 0, -20)
    tool3.updateMatrixWorld()

    currentStock = evaluator.evaluate(
      currentStock,
      tool3,
      SUBTRACTION
    )

    // ---- Final material
    currentStock.material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.2,
    })

    scene.add(currentStock)

    return () => {
      scene.remove(currentStock)
      currentStock.geometry.dispose()
    }
  }, [scene])

  return null
}

export default function BvhTest() {
  return (
      <CSGObject />
  )
}
