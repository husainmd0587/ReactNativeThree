import React, { useRef, useState, useMemo, forwardRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import CanvaProvider from '../../../provider'

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const STOCK_RADIUS   = 0.9
const STOCK_LENGTH   = 2.4          // half-length of each piece
const JOINT_RADIUS   = STOCK_RADIUS // starts at full stock radius
const JOINT_HEIGHT   = 0.18         // thin connecting disc
const FEED_SPEED     = 0.28         // radial cut speed (units/s)
const SPIN_SPEED     = 0.055        // rotation per frame
const RETRACT_SPEED  = 1.2          // tool Y retract speed
const FALL_SPEED     = 1.8          // right piece fall speed after parting
const SEGMENTS       = 96

/* ═══════════════════════════════════════════════
   PARTING TOOL  (flat blade shape)
═══════════════════════════════════════════════ */
const PartingTool = forwardRef((_, ref) => (
  <group ref={ref}>
    {/* Blade */}
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[0.06, JOINT_HEIGHT * 1.1, 0.38]} />
      <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.15} />
    </mesh>
    {/* Shank */}
    <mesh position={[0.28, 0, 0]}>
      <boxGeometry args={[0.5, 0.12, 0.38]} />
      <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
    </mesh>
    {/* Tip highlight */}
    <mesh position={[-0.035, 0, 0]}>
      <boxGeometry args={[0.012, JOINT_HEIGHT * 0.9, 0.36]} />
      <meshStandardMaterial color="#ffe066" emissive="#ffe066" emissiveIntensity={0.6} metalness={1} roughness={0.05} />
    </mesh>
  </group>
))

/* ═══════════════════════════════════════════════
   LATHE PROFILE → LatheGeometry
   profile: [{r, z}, …]  (rotated around Y in three.js)
═══════════════════════════════════════════════ */
function buildLathe(profile, segments = SEGMENTS) {
  const pts = profile.map(p => new THREE.Vector2(p.r, p.z))
  return new THREE.LatheGeometry(pts, segments)
}

/* ═══════════════════════════════════════════════
   STOCK MATERIAL (shared look)
═══════════════════════════════════════════════ */
function StockMaterial({ color = '#b8c4cc' }) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={0.75}
      roughness={0.22}
    />
  )
}

/* ═══════════════════════════════════════════════
   MAIN SCENE
═══════════════════════════════════════════════ */
function Scene({
  stockRadius  = STOCK_RADIUS,
  stockLength  = STOCK_LENGTH,
  jointRadius  = JOINT_RADIUS,
  jointHeight  = JOINT_HEIGHT,
  feedSpeed    = FEED_SPEED,
}) {
  /* refs */
  const spindleRef  = useRef()   // rotates everything
  const toolRef     = useRef()   // parting tool (does NOT rotate)
  const rightRef    = useRef()   // right piece (falls after parting)
  const discRef     = useRef()   // the joint disc

  /* state machine */
  // phases: 'cutting' | 'parted'
  const [phase, setPhase]         = useState('cutting')
  const [jointR, setJointR]       = useState(jointRadius)  // live disc radius
  const [spinSpeed, setSpinSpeed] = useState(SPIN_SPEED)

  /* ── profiles ── */
  // LEFT piece profile (z: 0 → -stockLength, capped at both ends)
  const leftProfile = useMemo(() => [
    { r: 0,           z: 0 },
    { r: stockRadius, z: 0 },
    { r: stockRadius, z: -stockLength },
    { r: 0,           z: -stockLength },
  ], [stockRadius, stockLength])

  // RIGHT piece profile (z: 0 → +stockLength)
  const rightProfile = useMemo(() => [
    { r: 0,           z: 0 },
    { r: stockRadius, z: 0 },
    { r: stockRadius, z: stockLength },
    { r: 0,           z: stockLength },
  ], [stockRadius, stockLength])

  const leftGeo  = useMemo(() => buildLathe(leftProfile),  [leftProfile])
  const rightGeo = useMemo(() => buildLathe(rightProfile), [rightProfile])

  /* ── disc geometry (rebuilt when jointR changes) ── */
  const discGeo = useMemo(() => {
    if (jointR <= 0.001) return null
    return new THREE.CylinderGeometry(
      jointR, jointR,           // top / bottom radius
      jointHeight,              // height
      SEGMENTS,
      1,
      false
    )
  }, [jointR, jointHeight])

  /* ── tool start X (just outside stock + a gap) ── */
  const toolStartX = stockRadius + 0.55
  const toolRef_x  = useRef(toolStartX)

  /* ── chip particles ── */
  const [chips, setChips] = useState([])
  const chipTimer = useRef(0)

  const spawnChip = useCallback((x) => {
    const id = Math.random()
    const angle = Math.random() * Math.PI * 2
    const speed = 0.4 + Math.random() * 0.6
    setChips(c => [
      ...c.slice(-18),   // keep max 18
      { id, x, vx: Math.cos(angle) * speed, vy: 1 + Math.random(), vz: Math.sin(angle) * speed, life: 1 }
    ])
  }, [])

  /* ═══════ FRAME LOOP ═══════ */
  useFrame((_, delta) => {
    /* ── ROTATION ── */
    if (spindleRef.current) {
      spindleRef.current.rotation.y += spinSpeed
    }

    /* ── CUTTING PHASE ── */
    if (phase === 'cutting') {
      const newR = Math.max(0, jointR - feedSpeed * delta)
      setJointR(newR)

      // tool tracks the cutting edge (X = current disc radius + blade half-width)
      const tx = newR + 0.03
      toolRef_x.current = tx
      if (toolRef.current) {
        toolRef.current.position.set(toolStartX - (toolStartX - tx), 0, 0)
      }

      // chip particles while cutting
      chipTimer.current += delta
      if (chipTimer.current > 0.08 && newR > 0.05) {
        chipTimer.current = 0
        spawnChip(newR)
      }

      if (newR <= 0.001) {
        setPhase('parted')
      }
    }

    /* ── PARTED PHASE ── */
    if (phase === 'parted') {
      // tool retracts upward
      if (toolRef.current) {
        toolRef.current.position.y += RETRACT_SPEED * delta
      }

      // right piece falls
      if (rightRef.current) {
        rightRef.current.position.y -= FALL_SPEED * delta
      }

      // spin slows to zero
      setSpinSpeed(s => Math.max(0, s - delta * 0.08))
    }

    /* ── CHIP ANIMATION ── */
    setChips(c =>
      c
        .map(ch => ({
          ...ch,
          x:    ch.x + ch.vx * delta,
          vy:   ch.vy - 2.5 * delta,
          life: ch.life - delta * 1.2,
        }))
        .filter(ch => ch.life > 0)
    )
  })

  /* ═══════ RENDER ═══════ */
  return (
    <>
      {/* ── LIGHTS ── */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, -2, -3]} intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color="#ffe8cc" />

      {/* ── SPINDLE GROUP (rotates) ── */}
      <group ref={spindleRef}>
        {/* LEFT STOCK */}
        <mesh geometry={leftGeo}>
          <StockMaterial color="#a8b8c0" />
        </mesh>

        {/* JOINT DISC — the star of the show */}
        {discGeo && (
          <mesh ref={discRef} geometry={discGeo} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
              color="#c8d8e0"
              metalness={0.8}
              roughness={0.18}
              emissive={phase === 'cutting' && jointR < 0.3 ? '#ff4400' : '#000000'}
              emissiveIntensity={phase === 'cutting' && jointR < 0.3
                ? (0.3 - jointR) / 0.3 * 0.5
                : 0}
            />
          </mesh>
        )}

        {/* RIGHT STOCK */}
        <mesh ref={rightRef} geometry={rightGeo}>
          <StockMaterial color="#b0bcc4" />
        </mesh>
      </group>

      {/* ── PARTING TOOL (does not rotate with spindle) ── */}
      <PartingTool ref={toolRef} />

      {/* ── CHIP PARTICLES ── */}
      {chips.map(ch => (
        <mesh key={ch.id} position={[ch.x, ch.life * 0.3, 0]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial
            color="#ffaa22"
            emissive="#ff6600"
            emissiveIntensity={ch.life * 1.2}
            transparent
            opacity={ch.life}
          />
        </mesh>
      ))}

      {/* ── CUT GLOW RING (when nearly through) ── */}
      {phase === 'cutting' && jointR < 0.25 && jointR > 0.001 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <torusGeometry args={[jointR, 0.025, 8, 64]} />
          <meshStandardMaterial
            color="#ff5500"
            emissive="#ff3300"
            emissiveIntensity={2}
            transparent
            opacity={(0.25 - jointR) / 0.25}
          />
        </mesh>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════ */
export default function PartingSimulator() {
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  )
}