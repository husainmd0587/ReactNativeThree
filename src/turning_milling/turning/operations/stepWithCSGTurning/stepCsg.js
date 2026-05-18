import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'
import { useFrame } from '@react-three/fiber/native'
import { useTextureLoader } from '../../../../utils/materials/textures'
import CanvaPovider from '../../../../provider'
/* -----------------------------
   🔧 GEOMETRY FACTORY
------------------------------ */
const createGeometry = (item) => {
  switch (item.type) {
    case 'cylinder':
      return new THREE.CylinderGeometry(...item.args)
    case 'box':
      return new THREE.BoxGeometry(...item.args)
    case 'lathe': {
      const pts = item.args.points.map(p => new THREE.Vector2(p.r, p.z))
      return new THREE.LatheGeometry(pts, item.args.segments || 32)
    }
    default:
      return null
  }
}
const cutList = [ 
  { type: "cylinder", args: [1, 1, 7, 32], position: [0, -1.2, 0], rotation: [0, 0, Math.PI / 2], cut: true, subtract: true },
   { type: "cylinder", args: [0.6, 0.6, 8, 32], position: [0, 1.0, 0], rotation: [0, 0, Math.PI / 2], cut: true, subtract: true },
   { type: "lathe", position: [0, 5, 0], args: { points: [ { z: -3, r: 0 }, { z: -3, r: 1 }, { z: 0, r: 1 }, { z: 2, r: 0.8 }, { z: 3, r: 1 }, 
      { z: 3, r: 0 } ], segments: 32 }, cut: true, subtract: false },
    { type: "cylinder", args: [0.6, 0.6, 15, 32], position: [0, 1.2, 0], rotation: [0, 0, Math.PI], cut: true, subtract: true }, 
    { type: "box", args: [2, 0.5, 5], position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], cut: true, subtract: false }, 
    { type: "lathe", position: [0, -4, 0], args: { points: [ { z: -3, r: 3 }, { z: 0, r: 3 }, { z: 2, r: 3 }, { z: 3, r: 3 }, { z: 3, r: 1.8 },
       { z: 2, r: 1.8 }, { z: 0, r: 1.8 }, { z: -3, r: 1.8 }, { z: -3, r: 3 } ], segments: 32 }, cut: true, subtract: true } 
  ]
  const Scene = () => {
  const meshRef = useRef()
  const evaluatorRef = useRef(new Evaluator())
  const csgStepsRef = useRef([])

  evaluatorRef.current.useGroups = true

  const texture = useTextureLoader('wood')
  const [step, setStep] = useState(0)

  /* -----------------------------
     🎨 MATERIALS (ONCE)
  ------------------------------ */
  const stockMaterial = useRef(
    new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide
    })
  )

  const cutMaterial = useRef(
    new THREE.MeshStandardMaterial({ map: texture })
  )

  /* -----------------------------
     🏗 BUILD ALL CSG ONCE
  ------------------------------ */
  useEffect(() => {
    if (!texture) return
    if (csgStepsRef.current.length > 0) return // already built

    const evaluator = evaluatorRef.current

    // STEP 0 — STOCK
    const stock = new Brush(
      new THREE.BoxGeometry(2, 5, 4),
      stockMaterial.current
    )
    stock.updateMatrixWorld()
    csgStepsRef.current.push(stock)

    let current = stock

    // APPLY EACH CUT ONCE
    for (const item of cutList.filter(i => i.cut)) {
      const geom = createGeometry(item)
      if (!geom) continue

      const brush = new Brush(geom, cutMaterial.current)

      item.position && brush.position.set(...item.position)
      item.rotation && brush.rotation.set(...item.rotation)
      brush.updateMatrixWorld()

      const next = evaluator.evaluate(
        current,
        brush,
        item.subtract ? SUBTRACTION : ADDITION
      )

      current.geometry.dispose()
      next.geometry.computeVertexNormals()

      csgStepsRef.current.push(next)
      current = next
    }
  }, [texture])

  /* -----------------------------
     ⏱ STEP PLAYER (NO CSG)
  ------------------------------ */
useEffect(() => {
  const max = csgStepsRef.current.length
  if (!max) return

  const id = setInterval(() => {
    setStep(prev => {
      if (prev >= max - 1) {
        clearInterval(id)   // ✅ STOP interval
        return prev         // stay at last step
      }
      return prev + 1
    })
  }, 6000)

  return () => clearInterval(id)
}, [])


  /* -----------------------------
     🔄 ROTATION (SAFE)
  ------------------------------ */
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002
    }
  })
const previewGeometry = useRef(new THREE.BoxGeometry(2, 5, 4))

const previewMaterial = useRef(
  new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide
  })
)
  const csgMesh = csgStepsRef.current[step]

console.log('Current Step:', step)

  return (
    <mesh
      ref={meshRef}
      geometry={csgMesh ? csgMesh.geometry : previewGeometry.current}
      material={csgMesh ? csgMesh.material : previewMaterial.current}
      castShadow
      receiveShadow
    />
  )
}

export default function StepWithCsg() {
  return (
    <CanvaPovider>
      <Scene />
    </CanvaPovider>
  )
}
