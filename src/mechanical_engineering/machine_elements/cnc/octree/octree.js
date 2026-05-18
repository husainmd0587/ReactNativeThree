if (typeof global.navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
}
if (typeof global.window === 'undefined') {
  global.window = global
}

import React, { useRef, useState, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import CanvaProvider from '../../../../provider'

// ═══════════════════════════════════════════════════════════════════════════
// 6. OCTREE — Sparse Voxel Subdivision System (FIXED)
// ═══════════════════════════════════════════════════════════════════════════

const PLATE_W     = 12
const PLATE_D     = 12
const PLATE_H     = 1.8
const PLATE_Y     = -2
const PLATE_TOP   = PLATE_Y + PLATE_H / 2   // -1.1
const PLATE_BOT   = PLATE_TOP - PLATE_H       // -2.9

const HOLE_R      = 3.5
const DRILL_DEPTH = 1.2
const DRILL_R     = 0.35

const MAX_DEPTH   = 6

class OctNode {
  constructor(x, y, z, size, depth = 0) {
    this.x = x
    this.y = y
    this.z = z
    this.size = size
    this.depth = depth
    this.state = 1
    this.children = null
  }

  intersectsSphere(cx, cy, cz, r) {
    const half = this.size / 2
    const dx = Math.max(Math.abs(cx - this.x) - half, 0)
    const dy = Math.max(Math.abs(cy - this.y) - half, 0)
    const dz = Math.max(Math.abs(cz - this.z) - half, 0)
    return dx*dx + dy*dy + dz*dz <= r*r
  }

  fullyInsideSphere(cx, cy, cz, r) {
    const half = this.size / 2
    for (let i = 0; i < 8; i++) {
      const dx = (i & 1 ? half : -half) + this.x - cx
      const dy = (i & 2 ? half : -half) + this.y - cy
      const dz = (i & 4 ? half : -half) + this.z - cz
      if (dx*dx + dy*dy + dz*dz > r*r) return false
    }
    return true
  }

  subtractSphere(cx, cy, cz, r) {
    if (this.state === 0) return false

    if (this.fullyInsideSphere(cx, cy, cz, r)) {
      this.state = 0
      this.children = null
      return true
    }

    if (!this.intersectsSphere(cx, cy, cz, r)) return false

    if (this.depth >= MAX_DEPTH) {
      this.state = 0
      this.children = null
      return true
    }

    if (this.state === 1) this._subdivide()

    let changed = false
    for (const child of this.children) {
      if (child.subtractSphere(cx, cy, cz, r)) changed = true
    }

    this._tryCollapse()
    return changed
  }

  _subdivide() {
    const q = this.size / 4
    this.children = []
    for (let i = 0; i < 8; i++) {
      const cx = this.x + (i & 1 ? q : -q)
      const cy = this.y + (i & 2 ? q : -q)
      const cz = this.z + (i & 4 ? q : -q)
      this.children.push(new OctNode(cx, cy, cz, this.size / 2, this.depth + 1))
    }
    this.state = 2
  }

  _tryCollapse() {
    if (!this.children) return
    const firstState = this.children[0].state
    if (firstState === 2) return
    for (let i = 1; i < 8; i++) {
      if (this.children[i].state !== firstState) return
    }
    this.state = firstState
    this.children = null
  }

  collectSolid(leaves = []) {
    if (this.state === 0) return leaves
    if (this.state === 1) {
      leaves.push(this)
      return leaves
    }
    for (const child of this.children) {
      child.collectSolid(leaves)
    }
    return leaves
  }
}

class OctreeWorkpiece {
  constructor() {
    const rootY = (PLATE_TOP + PLATE_BOT) / 2
    const rootSize = Math.max(PLATE_W, PLATE_H, PLATE_D)
    this.root = new OctNode(0, rootY, 0, rootSize)
    this.dirty = false
    this.leafCount = 0
  }

  subtractCylinder(cx, cz, r, yBot, yTop) {
    const midY = (yBot + yTop) / 2
    const halfH = (yTop - yBot) / 2
    const sphereR = Math.sqrt(r*r + halfH*halfH)
    const changed = this.root.subtractSphere(cx, midY, cz, sphereR)
    if (changed) this.dirty = true
  }

  buildGeometry() {
    const leaves = this.root.collectSolid()
    this.leafCount = leaves.length
    if (leaves.length === 0) return new THREE.BufferGeometry()

    const verts = []
    const indices = []
    const normals = []
    let vi = 0

    for (const node of leaves) {
      const half = node.size / 2
      const x0 = node.x - half, x1 = node.x + half
      const y0 = node.y - half, y1 = node.y + half
      const z0 = node.z - half, z1 = node.z + half

      const t0 = vi
      verts.push(x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1)
      normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
      indices.push(t0,t0+1,t0+2, t0,t0+2,t0+3)

      const b0 = vi+4
      verts.push(x0,y0,z0, x0,y0,z1, x1,y0,z1, x1,y0,z0)
      normals.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0)
      indices.push(b0,b0+1,b0+2, b0,b0+2,b0+3)

      const f0 = vi+8
      verts.push(x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0)
      normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1)
      indices.push(f0,f0+1,f0+2, f0,f0+2,f0+3)

      const ba0 = vi+12
      verts.push(x1,y0,z1, x0,y0,z1, x0,y1,z1, x1,y1,z1)
      normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
      indices.push(ba0,ba0+1,ba0+2, ba0,ba0+2,ba0+3)

      const l0 = vi+16
      verts.push(x0,y0,z1, x0,y0,z0, x0,y1,z0, x0,y1,z1)
      normals.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0)
      indices.push(l0,l0+1,l0+2, l0,l0+2,l0+3)

      const r0 = vi+20
      verts.push(x1,y0,z0, x1,y0,z1, x1,y1,z1, x1,y1,z0)
      normals.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
      indices.push(r0,r0+1,r0+2, r0,r0+2,r0+3)

      vi += 24
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    this.dirty = false
    return geo
  }
}

function Scene() {
  const toolRef = useRef()
  const octree = useMemo(() => new OctreeWorkpiece(), [])
  const [geometry, setGeometry] = useState(() => octree.buildGeometry())
  const [leafCount, setLeafCount] = useState(1)
  const lastRebuild = useRef(0)
  const frameCount = useRef(0)
  const prevToolPos = useRef({ x: 0, y: PLATE_TOP + 2, z: 0 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    const maxR = HOLE_R
    const minR = 0.2
    const currentR = Math.min(maxR, minR + t * 0.15)
    const angle = t * 2.5

    const cx = Math.cos(angle) * currentR
    const cz = Math.sin(angle) * currentR

    const plungeTime = 1.0
    let ty
    if (t < plungeTime) {
      ty = THREE.MathUtils.lerp(2.0, PLATE_TOP - DRILL_DEPTH, t / plungeTime)
    } else {
      ty = PLATE_TOP - DRILL_DEPTH
    }

    if (toolRef.current) toolRef.current.position.set(cx, ty, cz)

    if (ty <= PLATE_TOP - 0.3) {
      const prev = prevToolPos.current
      const dist = Math.sqrt((cx - prev.x)**2 + (cz - prev.z)**2)
      const steps = Math.max(1, Math.ceil(dist / (DRILL_R * 0.3)))

      for (let i = 0; i <= steps; i++) {
        const f = i / steps
        const sx = prev.x + (cx - prev.x) * f
        const sz = prev.z + (cz - prev.z) * f
        const sy = prev.y + (ty - prev.y) * f
        octree.subtractCylinder(sx, sz, DRILL_R + 0.05, sy - 0.4, sy + 0.15)
      }
    }
    prevToolPos.current = { x: cx, y: ty, z: cz }

    frameCount.current++
    const now = performance.now()

    if ((frameCount.current % 5 === 0 && octree.dirty) || (octree.dirty && now - lastRebuild.current > 300)) {
      if (now - lastRebuild.current > 50) {
        lastRebuild.current = now
        const geo = octree.buildGeometry()
        setGeometry(geo)
        setLeafCount(octree.leafCount)
      }
    }
  })

  const material = (
    <meshStandardMaterial
      color="#9e9590"
      metalness={0.55}
      roughness={0.38}
      side={THREE.DoubleSide}
    />
  )

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 18, 8]} intensity={2.5} castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.6} />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#ffe0b0" />
      <pointLight position={[0, PLATE_TOP - DRILL_DEPTH * 0.5, 0]} intensity={0.6} color="#5a3820" distance={8} />

      <mesh geometry={geometry} castShadow receiveShadow>
        {material}
      </mesh>

      <group ref={toolRef}>
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 5, 16]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.95} roughness={0.08} />
        </mesh>
        <mesh position={[-0.18, 1.0, 0]} rotation={[0, 0, -0.25]}>
          <cylinderGeometry args={[0.05, 0.05, 4.5, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.18, 1.0, 0]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.05, 0.05, 4.5, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <coneGeometry args={[0.22, 0.55, 16]} />
          <meshStandardMaterial color="#aaa" metalness={1.0} roughness={0.05} />
        </mesh>
        <mesh position={[0, 4.8, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.6, 16]} />
          <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      <mesh position={[0, PLATE_BOT - 0.1, 0]} receiveShadow>
        <boxGeometry args={[36, 0.2, 36]} />
        <meshStandardMaterial color="#1a1818" roughness={1} />
      </mesh>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
})

export default function Octree() {
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  )
}