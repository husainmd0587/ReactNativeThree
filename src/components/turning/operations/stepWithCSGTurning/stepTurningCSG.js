import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber/native'
import { NativeModules } from 'react-native'
import { useTextureLoader } from '../../../../assets/all_textures'
import { generateStressCutList } from './cutlistUtil'

const { NativeCSG } = NativeModules

const STOCK_RADIUS   = 12.5
const STOCK_HEIGHT   = 40
const STOCK_SEGMENTS = 64
const STOCK_HALF_H   = STOCK_HEIGHT / 2

const TOOL_OUTER_R   = STOCK_RADIUS * 3

const stockProfile = [
  { r: 0,            y: -STOCK_HALF_H },
  { r: STOCK_RADIUS, y: -STOCK_HALF_H },
  { r: STOCK_RADIUS, y: +STOCK_HALF_H },
  { r: 0,            y: +STOCK_HALF_H },
]

/**
 * Apply consistent UV mapping based on cylindrical coordinates
 * This works for any geometry - maps based on angle around Y and height along Y
 */
function applyCylindricalUVs(geometry) {
  const pos = geometry.getAttribute('position')
  const vertCount = pos.count

  const uvs = new Float32Array(vertCount * 2)
  
  for (let i = 0; i < vertCount; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    
    // U = angle around Y axis (atan2 of X-Z)
    // This maps 0..2π to 0..1
    const angle = Math.atan2(z, x)
    uvs[i * 2] = (angle / (Math.PI * 2) + 0.5) % 1.0
    
    // V = position along Y axis
    // Normalize to 0..1 based on stock height
    uvs[i * 2 + 1] = (y + STOCK_HALF_H) / STOCK_HEIGHT
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}

/**
 * Build stock display using CylinderGeometry
 * Apply cylindrical UVs to match CSG results
 */
function buildStockDisplayGeo() {
  const geo = new THREE.CylinderGeometry(
    STOCK_RADIUS,
    STOCK_RADIUS,
    STOCK_HEIGHT,
    STOCK_SEGMENTS,
    1,
    false
  )
  geo.rotateX(Math.PI / 2)
  // Apply same UV mapping as CSG results
  return applyCylindricalUVs(geo)
}

/**
 * Build geometry from CSG result
 * Apply same cylindrical UVs as stock display
 */
function buildGeoFromManifold(result) {
  if (!result?.success) throw new Error(result?.error ?? 'unknown CSG error')
  if (!result.vertices?.length || !result.indices?.length) throw new Error('empty CSG result')

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',
    new THREE.BufferAttribute(new Float32Array(result.vertices), 3))
  geo.setIndex(
    new THREE.BufferAttribute(new Uint32Array(result.indices), 1))

  geo.computeVertexNormals()
  
  // Apply same UV mapping as stock
  return applyCylindricalUVs(geo)
}

const cutList = generateStressCutList({
  totalLength: 60,
  stockRadius: STOCK_RADIUS,
  outerRadius: TOOL_OUTER_R,
  stepCount: 20,
  taperCount: 5,
  boreCount: 5,
  segments: 64,
})

const StepWithCsg = () => {
  const meshRef  = useRef()
  const texture  = useTextureLoader('wood')
  const stepsRef = useRef([])
  const material = useRef(null)

  const [step,    setStep]    = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [geo,     setGeo]     = useState(null)

  useEffect(() => {
    if (!texture) return
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true
    material.current = new THREE.MeshStandardMaterial({
      map:                 texture,
      side:                THREE.FrontSide,
      roughness:           0.8,
      metalness:           0.0,
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    })
  }, [texture])

  useEffect(() => {
    if (!texture || !material.current) return
    if (stepsRef.current.length > 0) return

    const build = async () => {
      try {
        console.log('[CSG] ═══════════════════════════════════════════════════════')
        console.log('[CSG] Starting CSG build (cylindrical UV mapping)...')
        const t0 = Date.now()

        // Stock display with cylindrical UVs
        const stockGeo = buildStockDisplayGeo()
        stepsRef.current.push(stockGeo)
        setGeo(stockGeo)
        console.log('[CSG] Step 0: Initial stock (CylinderGeometry + cylindrical UVs)')

        console.log('[CSG] ───────────────────────────────────────────────────────')
        console.log('[CSG] Initializing stock in C++...')
        const stockProfileFlat = []
        for (const p of stockProfile) {
          stockProfileFlat.push(p.r)
          stockProfileFlat.push(p.y)
        }
        
        await NativeCSG.initStockFromProfile(stockProfileFlat, STOCK_SEGMENTS)
        console.log('[CSG] ✓ Stock initialized')

        const cuts = cutList.filter(c => c.cut && c.subtract)
        console.log(`[CSG] ───────────────────────────────────────────────────────`)
        console.log(`[CSG] Applying ${cuts.length} cuts...`)

        for (let i = 0; i < cuts.length; i++) {
          const item = cuts[i]
          console.log(`[CSG] ═══════════════════════════════════════════════════════`)
          console.log(`[CSG] CUT ${i + 1}/${cuts.length}`)

          const profileFlat = []
          for (const p of item.args.points) {
            profileFlat.push(p.r)
            profileFlat.push(p.z - STOCK_HALF_H)
          }

          const pos = item.position || {}
          const rot = item.rotation || {}

          const tx = pos.x !== undefined ? pos.x : 0
          const ty = pos.y !== undefined ? pos.y : 0
          const tz = pos.z !== undefined ? pos.z : 0

          const rx = rot.x !== undefined ? rot.x : 0
          const ry = rot.y !== undefined ? rot.y : 0
          const rz = rot.z !== undefined ? rot.z : 0

          console.log(`[CSG]   Position: (${tx.toFixed(3)}, ${ty.toFixed(3)}, ${tz.toFixed(3)})`)
          console.log(`[CSG]   Rotation: (${rx.toFixed(1)}°, ${ry.toFixed(1)}°, ${rz.toFixed(1)}°)`)

          const result = await NativeCSG.applyLatheProfile(
            profileFlat,
            item.args.segments || STOCK_SEGMENTS,
            tx, ty, tz,
            rx, ry, rz
          )

          if (!result?.success) {
            console.warn(`[CSG] ✗ Cut ${i + 1} FAILED:`, result?.error)
            continue
          }

          try {
            stepsRef.current.push(buildGeoFromManifold(result))
            console.log(
              `[CSG] ✓ Cut ${i + 1} SUCCESS:`,
              `${(result.vertices.length / 3).toLocaleString()} verts,`,
              `${(result.indices.length / 3).toLocaleString()} tris`
            )
          } catch (e) {
            console.warn(`[CSG] ✗ Cut ${i + 1} error:`, e.message)
          }
        }

        await NativeCSG.resetStock()
        const elapsed = Date.now() - t0
        console.log(`[CSG] ═══════════════════════════════════════════════════════`)
        console.log(`[CSG] ✓ BUILD COMPLETE`)
        console.log(`[CSG]   Total steps: ${stepsRef.current.length}`)
        console.log(`[CSG]   Time: ${elapsed}ms`)
        console.log(`[CSG] ═══════════════════════════════════════════════════════`)
        setIsReady(true)

      } catch (e) {
        console.error('[CSG] ✗ BUILD ERROR:', e.message)
        console.error(e.stack)
      }
    }

    build()
  }, [texture])

  useEffect(() => {
    if (!isReady || stepsRef.current.length === 0) return
    
    setGeo(stepsRef.current[0])
    setStep(0)
    
    const id = setInterval(() => {
      setStep(prev => {
        const next = prev + 1
        const max  = stepsRef.current.length - 1
        
        if (next > max) { 
          clearInterval(id)
          return prev 
        }
        
        setGeo(stepsRef.current[next])
        console.log(`[UI] Showing step ${next}/${max}`)
        return next
      })
    }, 1000)
    
    return () => clearInterval(id)
  }, [isReady])

  useFrame(() => {
    if (meshRef.current) {
      // meshRef.current.rotation.y += 0.005
    }
  })

  const renderGeo = geo ?? buildStockDisplayGeo()
  const renderMat = material.current ?? new THREE.MeshStandardMaterial({
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  return (
    <mesh 
      ref={meshRef} 
      geometry={renderGeo} 
      material={renderMat}
      position={[0, 0, -30]}
      rotation={[0, Math.PI / 2, 0]}
      castShadow 
      receiveShadow 
    />
  )
}

export default StepWithCsg