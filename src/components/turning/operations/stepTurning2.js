import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { useTextureLoader } from '../../../assets/all_textures'

/* ---------------- CONFIG ---------------- */

const SEGMENTS = 160
const LENGTH = 10
const START_RADIUS = 3
const REBUILD_STEP = 8

/* -------- PROFILE -------- */

const profile = [
  { type: 'step', z0: 0.5, z1: 2.0, radius: 2.4 },
  { type: 'taper', z0: 2.0, z1: 4.5, r0: 2.4, r1: 1.8 },
  { type: 'radius', z0: 4.5, z1: 5.8, r0: 1.8, r1: 1.4 },
  { type: 'step', z0: 5.8, z1: 9.0, radius: 1.4 },
]

function getTargetRadius(z) {
  for (const p of profile) {
    if (z >= p.z0 && z <= p.z1) {
      if (p.type === 'step') return p.radius

      if (p.type === 'taper') {
        const t = (z - p.z0) / (p.z1 - p.z0)
        return THREE.MathUtils.lerp(p.r0, p.r1, t)
      }

      if (p.type === 'radius') {
        const t = (z - p.z0) / (p.z1 - p.z0)
        const s = t * t * (3 - 2 * t)
        return THREE.MathUtils.lerp(p.r0, p.r1, s)
      }
    }
  }
  return START_RADIUS
}

/* ---------------- COMPONENT ---------------- */

export function StepTurning() {
  const partRef = useRef()
  const toolRef = useRef()
  const spindleRef=useRef()

  const tool = useRef({ z: -0.5, feed: 0.035,running: true, })
  const radiusProfile = useRef(Array(SEGMENTS).fill(START_RADIUS))

  const cutCounter = useRef(0)
  const dirty = useRef(false)

  /* -------- INITIAL GEOMETRY -------- */

  const geometry = useMemo(() => {
    const pts = []

    // front cap
    pts.push(new THREE.Vector2(0, 0))

    for (let i = 0; i < SEGMENTS; i++) {
      const z = (i / SEGMENTS) * LENGTH
      pts.push(new THREE.Vector2(START_RADIUS, z))
      pts.push(new THREE.Vector2(START_RADIUS, z))
    }

    // end cap
    pts.push(new THREE.Vector2(0, LENGTH))

    return new THREE.LatheGeometry(pts, 64)
  }, [])

  /* -------- GEOMETRY REBUILD (THROTTLED) -------- */

  const rebuildGeometry = () => {
    const pts = []

    pts.push(new THREE.Vector2(0, 0))

    for (let i = 0; i < SEGMENTS; i++) {
      const z = (i / SEGMENTS) * LENGTH
      const r = radiusProfile.current[i]
      pts.push(new THREE.Vector2(r, z))
      pts.push(new THREE.Vector2(r, z))
    }

    pts.push(new THREE.Vector2(0, LENGTH))

    const newGeo = new THREE.LatheGeometry(pts, 64)
    partRef.current.geometry.dispose()
    partRef.current.geometry = newGeo
  }

  /* ---------------- FRAME LOOP ---------------- */

  useFrame(() => {
    const t = tool.current
    
    // feed in Z
    if (!t.running) return
    t.z += t.feed
    if (t.z > LENGTH) {
      t.z = -0.5
      cutCounter.current = 0
      dirty.current = false
      t.running = false 
    }

    const idx = Math.floor((t.z / LENGTH) * SEGMENTS)

    if (idx >= 0 && idx < SEGMENTS) {
      const z = (idx / SEGMENTS) * LENGTH
      const targetR = getTargetRadius(z)

      if (radiusProfile.current[idx] > targetR) {
        radiusProfile.current[idx] = targetR
        cutCounter.current++
        dirty.current = true
      }
    }
 
    // 🔥 rebuild only every N cuts
    if (dirty.current && cutCounter.current % REBUILD_STEP === 0) {
      rebuildGeometry()
      dirty.current = false
    }
    toolRef.current.position.set(
      getTargetRadius(t.z),
      t.z,
      0
    )
  })

useFrame((_, delta) => {
  spindleRef.current.rotation.y += delta * 2  // rad/sec
})

  return (
    <group position={[0, 2, 0]}>
        <group ref={spindleRef}>
        <mesh ref={partRef} geometry={geometry}>
        <meshStandardMaterial
          color="silver"
          metalness={0.6}
          roughness={0.35}
          side={THREE.DoubleSide}
            map={useTextureLoader()}
        />
      </mesh>
        </group>

      <mesh ref={toolRef}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </group>
  )
}
