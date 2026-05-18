if (typeof global.navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
}
if (typeof global.window === 'undefined') {
  global.window = global
}

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import CanvaProvider from '../../../../provider'

// ═══════════════════════════════════════════════════════════════════════════
// 5. DEXEL / MULTI-DEXEL SYSTEM — OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════

const PLATE_W       = 12
const PLATE_D       = 12
const PLATE_H       = 1.8
const PLATE_Y       = -2
const PLATE_TOP     = PLATE_Y + PLATE_H / 2
const PLATE_BOT     = PLATE_TOP - PLATE_H

const HOLE_R        = 3.5
const DRILL_DEPTH   = 1.2
const DRILL_R       = 0.35

// Lower res = much faster rebuild. 64 is smooth, 32 is very fast.
const DEXEL_RES     = 64
const DEXEL_SPACING = PLATE_W / DEXEL_RES

// ── Dexel Grid with Dirty Tracking ─────────────────────────────────────────

class DexelGrid {
  constructor() {
    this.res = DEXEL_RES
    this.spacing = DEXEL_SPACING
    this.halfW = PLATE_W / 2
    this.halfD = PLATE_D / 2
    
    this.data = new Array(this.res * this.res)
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = [[PLATE_BOT, PLATE_TOP]]
    }
    
    // Track which cells changed since last build
    this.dirty = new Set()
    // Cached geometry data for incremental updates
    this.cellGeos = new Map() // key: "gx,gz,intervalIdx" -> { startIndex, count }
  }

  _index(gx, gz) { return gz * this.res + gx }
  
  _gridToWorld(gx, gz) {
    return {
      x: -this.halfW + (gx + 0.5) * this.spacing,
      z: -this.halfD + (gz + 0.5) * this.spacing
    }
  }

  subtractCylinder(toolX, toolZ, toolR, toolBottomZ, toolTopZ) {
    const minGx = Math.max(0, Math.floor((toolX - toolR + this.halfW) / this.spacing))
    const maxGx = Math.min(this.res - 1, Math.floor((toolX + toolR + this.halfW) / this.spacing))
    const minGz = Math.max(0, Math.floor((toolZ - toolR + this.halfD) / this.spacing))
    const maxGz = Math.min(this.res - 1, Math.floor((toolZ + toolR + this.halfD) / this.spacing))

    const r2 = toolR * toolR

    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const w = this._gridToWorld(gx, gz)
        const dx = w.x - toolX
        const dz = w.z - toolZ
        if (dx * dx + dz * dz > r2) continue

        const idx = this._index(gx, gz)
        const oldIntervals = this.data[idx]
        const newIntervals = this._subtractInterval(oldIntervals, toolBottomZ, toolTopZ)
        
        // Only mark dirty if actually changed
        if (newIntervals.length !== oldIntervals.length || 
            newIntervals.some((seg, i) => 
              !oldIntervals[i] || seg[0] !== oldIntervals[i][0] || seg[1] !== oldIntervals[i][1]
            )) {
          this.data[idx] = newIntervals
          this.dirty.add(`${gx},${gz}`)
        }
      }
    }
  }

  _subtractInterval(intervals, cutBot, cutTop) {
    const result = []
    for (const [segBot, segTop] of intervals) {
      if (cutTop <= segBot || cutBot >= segTop) {
        result.push([segBot, segTop])
      } else if (cutBot <= segBot && cutTop >= segTop) {
        continue
      } else if (cutBot > segBot && cutTop < segTop) {
        result.push([segBot, cutBot])
        result.push([cutTop, segTop])
      } else if (cutBot <= segBot && cutTop < segTop) {
        result.push([cutTop, segTop])
      } else if (cutBot > segBot && cutTop >= segTop) {
        result.push([segBot, cutBot])
      }
    }
    return result
  }

  // Build full geometry — only call when dirty.size is large, or throttle
  buildGeometry() {
    const verts = []
    const indices = []
    const normals = []
    let vi = 0

    const s = this.spacing
    const hw = PLATE_W / 2
    const hd = PLATE_D / 2

    for (let gz = 0; gz < this.res; gz++) {
      for (let gx = 0; gx < this.res; gx++) {
        const intervals = this.data[this._index(gx, gz)]
        if (intervals.length === 0) continue

        const x0 = -hw + gx * s
        const x1 = x0 + s
        const z0 = -hd + gz * s
        const z1 = z0 + s

        for (const [yBot, yTop] of intervals) {
          // Skip degenerate intervals
          if (yTop - yBot < 0.001) continue

          // Top face
          const v0 = vi; verts.push(x0,yTop,z0, x1,yTop,z0, x1,yTop,z1, x0,yTop,z1)
          normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
          indices.push(v0,v0+1,v0+2, v0,v0+2,v0+3)
          
          // Bottom face
          const v4 = vi+4; verts.push(x0,yBot,z0, x0,yBot,z1, x1,yBot,z1, x1,yBot,z0)
          normals.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0)
          indices.push(v4,v4+1,v4+2, v4,v4+2,v4+3)
          
          // Front (z-)
          const v8 = vi+8; verts.push(x0,yBot,z0, x1,yBot,z0, x1,yTop,z0, x0,yTop,z0)
          normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1)
          indices.push(v8,v8+1,v8+2, v8,v8+2,v8+3)
          
          // Back (z+)
          const v12 = vi+12; verts.push(x1,yBot,z1, x0,yBot,z1, x0,yTop,z1, x1,yTop,z1)
          normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
          indices.push(v12,v12+1,v12+2, v12,v12+2,v12+3)
          
          // Left (x-)
          const v16 = vi+16; verts.push(x0,yBot,z1, x0,yBot,z0, x0,yTop,z0, x0,yTop,z1)
          normals.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0)
          indices.push(v16,v16+1,v16+2, v16,v16+2,v16+3)
          
          // Right (x+)
          const v20 = vi+20; verts.push(x1,yBot,z0, x1,yBot,z1, x1,yTop,z1, x1,yTop,z0)
          normals.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
          indices.push(v20,v20+1,v20+2, v20,v20+2,v20+3)

          vi += 24
        }
      }
    }

    if (verts.length === 0) return new THREE.BufferGeometry()

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    
    this.dirty.clear()
    return geo
  }
}

// ── Scene ─────────────────────────────────────────────────────────────────
function Scene() {
  const toolRef = useRef()
  const dexelGrid = useMemo(() => new DexelGrid(), [])
  const [geometry, setGeometry] = useState(() => dexelGrid.buildGeometry())
  const meshRef = useRef()
  
  const lastRebuild = useRef(0)
  const frameCount = useRef(0)
  const prevToolPos = useRef({ x: 0, y: PLATE_TOP, z: 0 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Tool motion
    const maxR = HOLE_R + 0.5
    const minR = 0.3
    const currentR = Math.min(maxR, minR + t * 0.24)
    const angle = t * 3.0

    const cx = Math.cos(angle) * currentR
    const cz = Math.sin(angle) * currentR

    const plungeTime = 0.8
    let ty
    if (t < plungeTime) {
      ty = THREE.MathUtils.lerp(3.0, PLATE_TOP - DRILL_DEPTH, t / plungeTime)
    } else {
      ty = PLATE_TOP - DRILL_DEPTH
    }

    if (toolRef.current) toolRef.current.position.set(cx, ty, cz)

    // Dexel subtraction with swept volume
    if (ty <= PLATE_TOP - 0.5) {
      const steps = Math.max(2, Math.ceil(Math.sqrt((cx-prevToolPos.current.x)**2 + (cz-prevToolPos.current.z)**2) / (DRILL_R * 0.5)))
      const prev = prevToolPos.current
      for (let i = 0; i <= steps; i++) {
        const f = i / steps
        dexelGrid.subtractCylinder(
          prev.x + (cx - prev.x) * f,
          prev.z + (cz - prev.z) * f,
          DRILL_R,
          prev.y + (ty - prev.y) * f - 0.3,
          prev.y + (ty - prev.y) * f + 0.2
        )
      }
    }
    prevToolPos.current = { x: cx, y: ty, z: cz }

    // Throttled rebuild: every 8 frames (~120ms at 60fps) or when many dirty cells
    frameCount.current++
    const now = performance.now()
    const dirtyCount = dexelGrid.dirty.size
    
    if (frameCount.current % 8 === 0 || dirtyCount > 200) {
      if (now - lastRebuild.current > 80) {
        lastRebuild.current = now
        // Use requestAnimationFrame scheduling to avoid blocking
        requestAnimationFrame(() => {
          setGeometry(dexelGrid.buildGeometry())
        })
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 18, 8]} intensity={2.5} castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={0.7} color="#ffe0b0" />
      <pointLight position={[0, PLATE_TOP - DRILL_DEPTH * 0.5, 0]} intensity={0.5} color="#5a3820" distance={8} />

      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
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

export default function Doxel() {
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  )
}