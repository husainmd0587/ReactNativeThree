if (typeof global.navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
}
if (typeof global.window === 'undefined') {
  global.window = global
}

import React, { useRef, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import CanvaProvider from '../../../../provider'
// ── Config ────────────────────────────────────────────────────────────────
const GRID_RES  = 240
const PLATE_W   = 14
const PLATE_D   = 14
const PLATE_H   = 2.0
const PLATE_Y   = -1.5
const PLATE_TOP = PLATE_Y + PLATE_H / 2
const PLATE_BOT = PLATE_TOP - PLATE_H

// Face mill cutter — large flat-bottom disk
const CUTTER_R    = 0.2    // cutter radius (large for face mill)
const FEATHER     = 0.08   // tiny feather — flat end mill makes sharp edges
const CUT_DEPTH   = 0.35   // depth of each facing pass (axial DOC)

// Zigzag raster toolpath
// Passes sweep X from -PLATE_W/2+CUTTER_R to +PLATE_W/2-CUTTER_R
// Stepover in Z between passes = CUTTER_R * STEPOVER_RATIO
const STEPOVER_RATIO = 0.75   // 75% stepover — overlapping passes, flat result
const FEED_SPEED     = 5.5    // world units per second (X traverse speed)
const PLUNGE_TIME    = 0.8    // seconds to plunge before first pass

// Derived
const BORDER      = 2
const SKIRT_ROWS  = 2

// Compute pass Z positions
const Z_START   = -PLATE_D / 2 + CUTTER_R
const Z_END     =  PLATE_D / 2 - CUTTER_R
const STEPOVER  = CUTTER_R * 2 * STEPOVER_RATIO
const NUM_PASSES = Math.ceil((Z_END - Z_START) / STEPOVER) + 1

// X travel extents per pass
const X_MIN = -PLATE_W / 1.5 + CUTTER_R
const X_MAX =  PLATE_W / 2 - CUTTER_R
const PASS_DURATION = (X_MAX - X_MIN) / FEED_SPEED   // seconds per pass

// Total animation duration
const TOTAL_DURATION = PLUNGE_TIME + NUM_PASSES * PASS_DURATION + 1.0

// ── Toolpath: given time t → (cx, cz, toolY) ─────────────────────────────
// Returns current cutter centre and Y position
function getToolPosition(t) {
  if (t < PLUNGE_TIME) {
    // Plunging straight down at first pass start position
    const pp  = t / PLUNGE_TIME
    const ps  = pp * pp * (3 - 2 * pp)   // smoothstep
    const toolY = PLATE_TOP - CUT_DEPTH * ps
    return { cx: X_MIN, cz: Z_START, toolY }
  }

  const st       = t - PLUNGE_TIME
  const passIdx  = Math.min(Math.floor(st / PASS_DURATION), NUM_PASSES - 1)
  const passT    = (st - passIdx * PASS_DURATION) / PASS_DURATION   // 0..1 within pass
  const cz       = Math.min(Z_START + passIdx * STEPOVER, Z_END)
  const leftToRight = (passIdx % 2 === 0)

  // X traverses left→right or right→left alternating (zigzag)
  const cx = leftToRight
    ? X_MIN + (X_MAX - X_MIN) * Math.min(passT, 1)
    : X_MAX - (X_MAX - X_MIN) * Math.min(passT, 1)

  const toolY = PLATE_TOP - CUT_DEPTH

  return { cx, cz, toolY }
}

// ── Geometry builders (shared with spiral scene) ─────────────────────────

function buildFullGeo(dexels) {
  const topCount   = GRID_RES * GRID_RES
  const skirtCount = GRID_RES * SKIRT_ROWS * 4
  const botCount   = 4
  const totalVerts = topCount + skirtCount + botCount

  const positions = new Float32Array(totalVerts * 3)
  const normals   = new Float32Array(totalVerts * 3)

  // Top grid
  for (let row = 0; row < GRID_RES; row++) {
    for (let col = 0; col < GRID_RES; col++) {
      const i  = row * GRID_RES + col
      const wx = -PLATE_W / 2 + (col / (GRID_RES - 1)) * PLATE_W
      const wz = -PLATE_D / 2 + (row / (GRID_RES - 1)) * PLATE_D
      positions[i * 3 + 0] = wx
      positions[i * 3 + 1] = dexels[i]
      positions[i * 3 + 2] = wz
    }
  }

  // Skirts
  const wxAt = col => -PLATE_W / 2 + (col / (GRID_RES - 1)) * PLATE_W
  const wzAt = row => -PLATE_D / 2 + (row / (GRID_RES - 1)) * PLATE_D

  const sides = [
    { n: [0,0,1],  len: GRID_RES,
      topIdx: c => (GRID_RES - 1) * GRID_RES + c,
      pos: c => [wxAt(c), 0, PLATE_D / 2] },
    { n: [0,0,-1], len: GRID_RES,
      topIdx: c => 0 * GRID_RES + (GRID_RES - 1 - c),
      pos: c => [wxAt(GRID_RES - 1 - c), 0, -PLATE_D / 2] },
    { n: [1,0,0],  len: GRID_RES,
      topIdx: c => c * GRID_RES + (GRID_RES - 1),
      pos: c => [PLATE_W / 2, 0, wzAt(c)] },
    { n: [-1,0,0], len: GRID_RES,
      topIdx: c => (GRID_RES - 1 - c) * GRID_RES + 0,
      pos: c => [-PLATE_W / 2, 0, wzAt(GRID_RES - 1 - c)] },
  ]

  const skirtBases = []
  let vBase = topCount

  for (const side of sides) {
    skirtBases.push(vBase)
    for (let c = 0; c < side.len; c++) {
      const dexelI    = side.topIdx(c)
      const topY      = positions[dexelI * 3 + 1]
      const [px,,pz]  = side.pos(c)
      for (let r = 0; r < SKIRT_ROWS; r++) {
        const t  = r / (SKIRT_ROWS - 1)
        const wy = topY + (PLATE_BOT - topY) * t
        const vi = vBase + c * SKIRT_ROWS + r
        positions[vi * 3 + 0] = px
        positions[vi * 3 + 1] = wy
        positions[vi * 3 + 2] = pz
        normals[vi * 3 + 0]   = side.n[0]
        normals[vi * 3 + 1]   = side.n[1]
        normals[vi * 3 + 2]   = side.n[2]
      }
    }
    vBase += side.len * SKIRT_ROWS
  }

  // Bottom quad
  const botBase = vBase
  const hw = PLATE_W / 2, hd = PLATE_D / 2, b = PLATE_BOT
  const botPts = [[-hw,b,-hd],[hw,b,-hd],[hw,b,hd],[-hw,b,hd]]
  for (let i = 0; i < 4; i++) {
    positions[(botBase + i) * 3 + 0] = botPts[i][0]
    positions[(botBase + i) * 3 + 1] = botPts[i][1]
    positions[(botBase + i) * 3 + 2] = botPts[i][2]
    normals[(botBase + i) * 3 + 1]   = -1
  }

  // Indices
  const indices = []
  for (let row = 0; row < GRID_RES - 1; row++) {
    for (let col = 0; col < GRID_RES - 1; col++) {
      const tl = row * GRID_RES + col
      const tr = tl + 1
      const bl = tl + GRID_RES
      const br = bl + 1
      indices.push(tl, bl, tr,  bl, br, tr)
    }
  }

  let sb = topCount
  for (const side of sides) {
    const N = side.len
    for (let c = 0; c < N - 1; c++) {
      for (let r = 0; r < SKIRT_ROWS - 1; r++) {
        const t0 = sb + c       * SKIRT_ROWS + r
        const t1 = sb + (c + 1) * SKIRT_ROWS + r
        const b0 = t0 + 1
        const b1 = t1 + 1
        indices.push(t0, b0, t1,  b0, b1, t1)
      }
    }
    sb += N * SKIRT_ROWS
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3))
  geo.setIndex(indices)
  geo.userData.skirtBases = skirtBases
  geo.userData.sides      = sides
  return geo
}

function syncSkirtTops(geo, dexels) {
  const pos = geo.getAttribute('position')
  const arr = pos.array
  const { skirtBases, sides } = geo.userData
  for (let si = 0; si < sides.length; si++) {
    const side  = sides[si]
    const sBase = skirtBases[si]
    for (let c = 0; c < side.len; c++) {
      const topY = dexels[side.topIdx(c)]
      const vi0  = sBase + c * SKIRT_ROWS
      for (let r = 0; r < SKIRT_ROWS; r++) {
        const t  = r / (SKIRT_ROWS - 1)
        arr[(vi0 + r) * 3 + 1] = topY + (PLATE_BOT - topY) * t
      }
    }
  }
  pos.needsUpdate = true
}

function recomputeTopNormalsLocal(geo, minCol, maxCol, minRow, maxRow) {
  const posArr  = geo.getAttribute('position').array
  const nrmAttr = geo.getAttribute('normal')
  const nrmArr  = nrmAttr.array
  const pad = 2
  const c0 = Math.max(0,            minCol - pad)
  const c1 = Math.min(GRID_RES - 1, maxCol + pad)
  const r0 = Math.max(0,            minRow - pad)
  const r1 = Math.min(GRID_RES - 1, maxRow + pad)

  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) {
      const i = (row * GRID_RES + col) * 3
      nrmArr[i] = 0; nrmArr[i+1] = 0; nrmArr[i+2] = 0
    }

  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3()
  const cb = new THREE.Vector3(), ab = new THREE.Vector3()

  for (let row = r0; row < Math.min(r1, GRID_RES - 1); row++)
    for (let col = c0; col < Math.min(c1, GRID_RES - 1); col++) {
      const tl = row * GRID_RES + col, tr = tl+1, bl = tl+GRID_RES, br = bl+1
      for (const [ai,bi,ci] of [[tl,bl,tr],[bl,br,tr]]) {
        va.fromArray(posArr,ai*3); vb.fromArray(posArr,bi*3); vc.fromArray(posArr,ci*3)
        cb.subVectors(vc,vb); ab.subVectors(va,vb); cb.cross(ab)
        for (const idx of [ai,bi,ci]) {
          nrmArr[idx*3]+=cb.x; nrmArr[idx*3+1]+=cb.y; nrmArr[idx*3+2]+=cb.z
        }
      }
    }

  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) {
      const i   = (row * GRID_RES + col) * 3
      const len = Math.sqrt(nrmArr[i]**2+nrmArr[i+1]**2+nrmArr[i+2]**2) || 1
      nrmArr[i]/=len; nrmArr[i+1]/=len; nrmArr[i+2]/=len
    }

  nrmAttr.needsUpdate = true
}

// ── Plate mesh ────────────────────────────────────────────────────────────
function Plate({ geoRef, dexels }) {
  const geo = useMemo(() => {
    const g = buildFullGeo(dexels)
    geoRef.current = g
    return g
  }, [])

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        color="#8a8480"
        metalness={0.60}
        roughness={0.35}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}

// ── Face Mill Cutter geometry ─────────────────────────────────────────────
// Real face mill: wide flat disk body + insert tips around the rim
function FaceMill() {
  const INSERT_COUNT = 8
  const inserts = []
  for (let i = 0; i < INSERT_COUNT; i++) {
    const angle = (i / INSERT_COUNT) * Math.PI * 2
    const ix = Math.cos(angle) * (CUTTER_R - 0.18)
    const iz = Math.sin(angle) * (CUTTER_R - 0.18)
    inserts.push(
      <mesh key={i} position={[ix, -0.12, iz]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.22, 0.10, 0.14]} />
        <meshStandardMaterial color="#e8c840" metalness={0.9} roughness={0.15} />
      </mesh>
    )
  }

  return (
    <group>
      {/* Arbor / spindle shaft */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 5.0, 16]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Cutter body disk */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[CUTTER_R, CUTTER_R, 0.28, 32]} />
        <meshStandardMaterial color="#555" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Bottom face of cutter (flat cutting face) */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[CUTTER_R - 0.05, CUTTER_R - 0.05, 0.01, 32]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Carbide inserts around rim */}
      {inserts}

      {/* Chuck / collet collar */}
      <mesh position={[0, 4.6, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.55, 16]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────
function Scene() {
  const toolRef  = useRef()
  const geoRef   = useRef(null)
  const doneRef  = useRef(false)

  const dexels = useMemo(
    () => new Float32Array(GRID_RES * GRID_RES).fill(PLATE_TOP),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (doneRef.current) {
      if (toolRef.current) toolRef.current.position.set(0, PLATE_TOP + 3, 0)
      return
    }
    if (t > TOTAL_DURATION) { doneRef.current = true; return }

    const { cx, cz, toolY } = getToolPosition(t)

    if (toolRef.current) {
      toolRef.current.position.set(cx, toolY + 0.14, cz)
    }

    const geo = geoRef.current
    if (!geo) return

    // Flat end mill: bottom is perfectly flat — carve floor = toolY
    const carveY = Math.max(toolY, PLATE_BOT + 0.002)
    const expand = CUTTER_R + FEATHER

    // Dirty rectangle in dexel space
    const minCol = Math.max(BORDER,                Math.floor(((cx - expand) + PLATE_W/2) / PLATE_W * (GRID_RES-1)))
    const maxCol = Math.min(GRID_RES - 1 - BORDER, Math.ceil( ((cx + expand) + PLATE_W/2) / PLATE_W * (GRID_RES-1)))
    const minRow = Math.max(BORDER,                Math.floor(((cz - expand) + PLATE_D/2) / PLATE_D * (GRID_RES-1)))
    const maxRow = Math.min(GRID_RES - 1 - BORDER, Math.ceil( ((cz + expand) + PLATE_D/2) / PLATE_D * (GRID_RES-1)))

    const posArr = geo.getAttribute('position').array
    let changed  = false

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const wx   = -PLATE_W/2 + (col/(GRID_RES-1)) * PLATE_W
        const wz   = -PLATE_D/2 + (row/(GRID_RES-1)) * PLATE_D
        const dx   = wx - cx
        const dz   = wz - cz
        const dist = Math.sqrt(dx*dx + dz*dz)

        if (dist > CUTTER_R + FEATHER) continue

        const idx  = row * GRID_RES + col
        const curY = dexels[idx]
        let newY

        if (dist <= CUTTER_R) {
          // Inside cutter radius → flat floor (flat end mill = no ball radius)
          newY = carveY
        } else {
          // Narrow feather at rim edge only
          const ft = (dist - CUTTER_R) / FEATHER
          const sm = ft * ft * (3 - 2 * ft)
          newY = carveY + (PLATE_TOP - carveY) * sm
        }

        if (newY < curY) {
          dexels[idx]     = newY
          posArr[idx*3+1] = newY
          changed = true
        }
      }
    }

    if (changed) {
      geo.getAttribute('position').needsUpdate = true
      recomputeTopNormalsLocal(geo, minCol, maxCol, minRow, maxRow)
      syncSkirtTops(geo, dexels)
    }
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[12, 20, 8]}  intensity={2.4} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-10, 8, -6]} intensity={0.5} />
      <pointLight position={[0, 12, 0]} intensity={0.7} color="#ffe4b0" />
      {/* Subtle fill light from below to show machined surface */}
      <pointLight position={[0, PLATE_TOP - CUT_DEPTH * 0.5, 0]}
        intensity={0.25} color="#6080a0" distance={12} />

      {/* Workpiece */}
      <Plate geoRef={geoRef} dexels={dexels} />

      {/* Face mill cutter */}
      <group ref={toolRef}>
        <FaceMill />
      </group>

      {/* Worktable */}
      <mesh position={[0, PLATE_BOT - 0.12, 0]} receiveShadow>
        <boxGeometry args={[40, 0.22, 40]} />
        <meshStandardMaterial
          color="#181616"
          roughness={1}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* T-slot table surface lines (visual detail) */}
      {[-4, -2, 0, 2, 4].map(zOff => (
        <mesh key={zOff} position={[0, PLATE_BOT - 0.02, zOff]} receiveShadow>
          <boxGeometry args={[40, 0.04, 0.12]} />
          <meshStandardMaterial color="#111" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
})

export default function HeightMapCutting(){
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  )
}




