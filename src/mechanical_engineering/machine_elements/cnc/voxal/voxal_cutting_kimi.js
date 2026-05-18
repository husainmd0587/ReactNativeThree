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
// ── Config ────────────────────────────────────────────────────────────────
const PLATE_W     = 12
const PLATE_D     = 12
const PLATE_H     = 1.8
const PLATE_Y     = -2
const PLATE_TOP   = PLATE_Y + PLATE_H / 2
const PLATE_BOT   = PLATE_TOP - PLATE_H

const HOLE_R      = 3.5
const DRILL_DEPTH = 1.2
const DRILL_R     = 0.35

const WALL_SEGS   = 96

// ── Hole State ────────────────────────────────────────────────────────────
const hole = {
  radius: 0,           // Current hole radius
  maxRadius: HOLE_R
}

// ── Build Plate Top using Shape with Hole ─────────────────────────────────
function buildPlateTopGeometry(radius) {
  const shape = new THREE.Shape()
  
  // Outer rectangle
  const hw = PLATE_W / 2
  const hd = PLATE_D / 2
  shape.moveTo(-hw, -hd)
  shape.lineTo(hw, -hd)
  shape.lineTo(hw, hd)
  shape.lineTo(-hw, hd)
  shape.lineTo(-hw, -hd)
  
  // Circular hole at CENTER (fixed)
  if (radius > 0.01) {
    const holePath = new THREE.Path()
    holePath.absarc(0, 0, Math.min(radius, HOLE_R + 0.5), 0, Math.PI * 2, true)
    shape.holes.push(holePath)
  }
  
  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: WALL_SEGS
  }
  
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, PLATE_TOP, 0)
  
  return geo
}

// ── Build Hole Walls & Bottom ───────────────────────────────────────────
function buildHoleGeometry(radius) {
  if (radius <= 0.01) return null
  
  const geo = new THREE.BufferGeometry()
  const verts = [], indices = [], normals = [], uvs = []
  let vi = 0
  const addVert = (x,y,z,nx,ny,nz,u,v) => {
    verts.push(x,y,z); normals.push(nx,ny,nz); uvs.push(u,v)
    return vi++
  }
  
  const hy = PLATE_TOP - DRILL_DEPTH
  const hr = Math.min(radius, HOLE_R)
  
  // Rim vertices at CENTER
  const rimTop = [], rimBot = []
  for (let i = 0; i < WALL_SEGS; i++) {
    const a = (i/WALL_SEGS) * Math.PI * 2
    const cos = Math.cos(a), sin = Math.sin(a)
    const rx = hr * cos
    const rz = hr * sin
    
    rimTop.push(addVert(rx, PLATE_TOP, rz, cos, 0, sin, i/WALL_SEGS, 0))
    rimBot.push(addVert(rx, hy, rz, cos, 0, sin, i/WALL_SEGS, 1))
  }
  
  // Bottom center
  const botCenter = addVert(0, hy, 0, 0, -1, 0, 0.5, 0.5)
  
  // Wall faces
  for (let i = 0; i < WALL_SEGS; i++) {
    const n = (i+1) % WALL_SEGS
    indices.push(rimTop[i], rimBot[i], rimTop[n])
    indices.push(rimBot[i], rimBot[n], rimTop[n])
  }
  
  // Bottom faces
  for (let i = 0; i < WALL_SEGS; i++) {
    const n = (i+1) % WALL_SEGS
    indices.push(botCenter, rimBot[n], rimBot[i])
  }
  
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  
  return geo
}

// ── Build Plate Sides & Bottom ──────────────────────────────────────────
function buildPlateSidesGeometry() {
  const geo = new THREE.BufferGeometry()
  const verts = [], indices = [], normals = [], uvs = []
  let vi = 0
  const addVert = (x,y,z,nx,ny,nz,u,v) => {
    verts.push(x,y,z); normals.push(nx,ny,nz); uvs.push(u,v)
    return vi++
  }
  
  const hw = PLATE_W/2, hd = PLATE_D/2
  const t = PLATE_TOP, b = PLATE_BOT
  
  const sv = [
    -hw,t,hd, hw,t,hd, hw,b,hd, -hw,b,hd,
    hw,t,-hd, -hw,t,-hd, -hw,b,-hd, hw,b,-hd,
    hw,t,hd, hw,t,-hd, hw,b,-hd, hw,b,hd,
    -hw,t,-hd, -hw,t,hd, -hw,b,hd, -hw,b,-hd,
    -hw,b,-hd, hw,b,-hd, hw,b,hd, -hw,b,hd
  ]
  const sn = [
    0,0,1,0,0,1,0,0,1,0,0,1,
    0,0,-1,0,0,-1,0,0,-1,0,0,-1,
    1,0,0,1,0,0,1,0,0,1,0,0,
    -1,0,0,-1,0,0,-1,0,0,-1,0,0,
    0,-1,0,0,-1,0,0,-1,0,0,-1,0
  ]
  
  for (let i = 0; i < sv.length; i += 3) {
    addVert(sv[i], sv[i+1], sv[i+2], sn[i], sn[i+1], sn[i+2], 0, 0)
  }
  
  const sf = [[0,2,1,0,3,2],[4,6,5,4,7,6],[8,10,9,8,11,10],[12,14,13,12,15,14],[16,18,17,16,19,18]]
  for (const f of sf) for (const idx of f) indices.push(idx)
  
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  
  return geo
}

// ── Scene ─────────────────────────────────────────────────────────────────
 function Scene() {
  const toolRef = useRef()
  const [topGeo, setTopGeo] = useState(() => buildPlateTopGeometry(0))
  const [holeGeo, setHoleGeo] = useState(() => buildHoleGeometry(0))
  const sidesGeo = useMemo(() => buildPlateSidesGeometry(), [])
  const lastRebuild = useRef(0)
  
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    
    // DRILL SPIRALS FROM CENTER OUTWARD (natural milling direction)
    const maxR = HOLE_R + 0.5
    const minR = 0.3
    
    // Spiral: radius INCREASES over time (start center, move outward)
    const spiralSpeed = 0.12
    const currentR = Math.min(maxR, minR + t * spiralSpeed * 2)
    const angle = t * 3.0  // Fast rotation
    
    const cx = Math.cos(angle) * currentR
    const cz = Math.sin(angle) * currentR
    
    // Plunge once at start, stay at depth
    const plungeTime = 0.8
    let ty
    if (t < plungeTime) {
      ty = THREE.MathUtils.lerp(3.0, PLATE_TOP - DRILL_DEPTH, t / plungeTime)
    } else {
      ty = PLATE_TOP - DRILL_DEPTH
    }
    
    if (toolRef.current) toolRef.current.position.set(cx, ty, cz)
    
    // HOLE GROWS from center as drill moves outward
    if (ty <= PLATE_TOP - 0.5) {
      // The hole radius is where the drill HAS BEEN (swept volume)
      // Since drill spirals from center, hole grows naturally
      const distFromCenter = Math.sqrt(cx*cx + cz*cz)
      
      // Hole encompasses drill's path plus tool radius
      const targetR = distFromCenter + DRILL_R + 0.1
      
      // Smoothly grow hole to match
      if (targetR > hole.radius) {
        hole.radius = Math.min(targetR, HOLE_R)
      }
    }
    
    // Rebuild geometry
    const now = performance.now()
    if (now - lastRebuild.current > 30) {
      lastRebuild.current = now
      setTopGeo(buildPlateTopGeometry(hole.radius))
      setHoleGeo(buildHoleGeometry(hole.radius))
    }
  })
  
  const material = (
    <meshStandardMaterial color="#9e9590" metalness={0.55} roughness={0.38} side={THREE.DoubleSide} />
  )
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 18, 8]} intensity={2.5} castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={0.7} color="#ffe0b0" />
      <pointLight position={[0, PLATE_TOP - DRILL_DEPTH*0.5, 0]} intensity={0.5} color="#5a3820" distance={8} />
      
      <mesh geometry={topGeo} castShadow receiveShadow>
        {material}
      </mesh>
      
      {holeGeo && (
        <mesh geometry={holeGeo} castShadow receiveShadow>
          {material}
        </mesh>
      )}
      
      <mesh geometry={sidesGeo} castShadow receiveShadow>
        {material}
      </mesh>
      
      {/* Drill bit */}
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

export default function VoxalCuttingKimi() {
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  )
}



// https://www.kimi.com/chat/19e2a5e3-de32-8f18-8000-09b41b2a151e?chat_enter_method=home
//https://www.kimi.com/chat/19e2a017-2042-840d-8000-09b48a7e9e4f?chat_enter_method=home