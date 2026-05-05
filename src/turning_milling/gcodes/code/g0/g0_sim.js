import { useRef, useState, useEffect } from 'react'
import {
  StyleSheet, Text, View, ScrollView, Dimensions, StatusBar,
  TouchableOpacity, Animated,
} from 'react-native'
import { useFrame } from '@react-three/fiber'
import CanvaProvider from '../../../../provider'
import CncFrameTurning from '../../../components/machines/turning'


const { height } = Dimensions.get('window')

// ── Chips ──────────────────────────────────────────────────────────────────
function Chips({ active, x, z }) {
  const ref = useRef()
  const particles = useRef(
    Array.from({ length: 24 }, () => ({ pos: [0, 0, 0], vel: [0, 0, 0], life: 0, maxLife: 0 }))
  )

  useFrame((_, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    const col = ref.current.geometry.attributes.color.array
    particles.current.forEach((p, i) => {
      if (active && p.life <= 0 && Math.random() < 0.4) {
        p.pos = [x / 24, z * 0.05 + 0.65, 0.65]
        p.vel = [(Math.random() - 0.5) * 0.08, Math.random() * 0.06, (Math.random() - 0.5) * 0.06]
        p.maxLife = 0.4 + Math.random() * 0.4
        p.life = p.maxLife
      }
      if (p.life > 0) {
        p.life -= delta
        p.pos[0] += p.vel[0]
        p.pos[1] += p.vel[1]
        p.vel[1] -= delta * 0.15
        p.pos[2] += p.vel[2]
      }
      const t = Math.max(0, p.life / (p.maxLife || 1))
      pos[i * 3] = p.pos[0]; pos[i * 3 + 1] = p.pos[1]; pos[i * 3 + 2] = p.pos[2]
      col[i * 3] = t > 0.5 ? 1 : t * 2; col[i * 3 + 1] = t > 0.5 ? (t - 0.5) * 1.5 : 0; col[i * 3 + 2] = 0
    })
    ref.current.geometry.attributes.position.needsUpdate = true
    ref.current.geometry.attributes.color.needsUpdate = true
  })

  const count = 24
  const p = new Float32Array(count * 3)
  const c = new Float32Array(count * 3)

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={p} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={c} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.9} />
    </points>
  )
}

// ── Turret ─────────────────────────────────────────────────────────────────
function Turret({ machX, machZ, spindleOn, spindleSpeed = 0, isCutting }) {
  const turretRef = useRef()
  const glowRef = useRef()

  useFrame((_, delta) => {
    if (turretRef.current && spindleOn) turretRef.current.rotation.y += delta * spindleSpeed
    if (glowRef.current) glowRef.current.material.opacity = spindleOn ? 0.2 + Math.sin(Date.now() * 0.005) * 0.1 : 0
  })

  const posX = (machX / 60) * 2.5
  const posY = -0.4 + machZ * 0.04

  return (
    <group position={[posX, posY, 0.3]}>
      <mesh castShadow>
        <boxGeometry args={[1.0, 0.55, 0.75]} />
        <meshStandardMaterial color="#5a5f62" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.38]}>
        <boxGeometry args={[0.95, 0.5, 0.02]} />
        <meshStandardMaterial color="#6e7478" metalness={0.8} roughness={0.25} />
      </mesh>
      {[-0.35, 0.35].map((ox, i) => (
        <mesh key={i} position={[ox, -0.32, 0]}>
          <boxGeometry args={[0.22, 0.1, 0.65]} />
          <meshStandardMaterial color="#4a5055" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <group ref={turretRef} position={[0, 0.18, 0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.22, 6]} />
          <meshStandardMaterial
            color={spindleOn ? '#1e6e88' : '#2a5a6e'}
            metalness={0.85} roughness={0.2}
            emissive={spindleOn ? '#0a3040' : '#000'}
            emissiveIntensity={spindleOn ? 0.6 : 0}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.40, 0.40, 0.02, 6]} />
          <meshStandardMaterial color="#3a7a8e" metalness={0.9} roughness={0.15} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.28, 0.12, Math.sin(a) * 0.28]}>
              <boxGeometry args={[0.07, 0.04, 0.07]} />
              <meshStandardMaterial
                color={i === 0 ? '#f59e0b' : '#3a8090'}
                metalness={0.95} roughness={0.1}
                emissive={i === 0 && spindleOn ? '#7a3500' : '#000'}
                emissiveIntensity={i === 0 && spindleOn ? 0.4 : 0}
              />
            </mesh>
          )
        })}
        <mesh ref={glowRef} position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.01, 24]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0} emissive="#38bdf8" emissiveIntensity={2} />
        </mesh>
      </group>
      <mesh position={[0, 0.08, 0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.08, 0.22, 10]} />
        <meshStandardMaterial color="#8a9298" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.08, 0.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
        <meshStandardMaterial
          color="#c8d0d8" metalness={0.98} roughness={0.05}
          emissive={isCutting ? '#334400' : '#000'}
          emissiveIntensity={isCutting ? 0.3 : 0}
        />
      </mesh>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[Math.cos((i / 4) * Math.PI * 2) * 0.025, 0.08, 0.72 + Math.sin((i / 4) * Math.PI * 2) * 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.2, 4]} />
          <meshStandardMaterial color="#a0a8b0" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0.84]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial
          color="#f59e0b" metalness={0.8} roughness={0.2}
          emissive={isCutting ? '#c05000' : '#603000'}
          emissiveIntensity={isCutting ? 1.2 : 0.2}
        />
      </mesh>
      <mesh position={[0.54, 0, 0]}>
        <boxGeometry args={[0.06, 0.55, 0.08]} />
        <meshStandardMaterial color="#3a4248" metalness={0.85} roughness={0.3} />
      </mesh>
      <Chips active={isCutting} x={machX} z={machZ} />
    </group>
  )
}

// ── CNC Frame ──────────────────────────────────────────────────────────────
function CncFrame({ machineState }) {
  const { x, z, spindleOn, spindleSpeed, pathPoints, isCutting } = machineState

  return (
    <group>
      <ambientLight intensity={0.45} color="#c8d8f0" />
      <directionalLight position={[4, 8, 6]} intensity={1.4} castShadow color="#ffffff" />
      <directionalLight position={[-6, 4, -2]} intensity={0.5} color="#a0b8d0" />
      <pointLight position={[0, 3, 2]} intensity={spindleOn ? 1.2 : 0.3} color="#38bdf8" distance={6} />
      <pointLight position={[0, -1, 1]} intensity={0.4} color="#ffaa44" distance={4} />
      <Turret machX={x} machZ={z} spindleOn={spindleOn} spindleSpeed={spindleSpeed} isCutting={isCutting} />

      {/* Bed */}
      <mesh position={[0, -0.9, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.8, 0.28, 1.8]} />
        <meshStandardMaterial color="#3e4a52" metalness={0.65} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.76, 0]}>
        <boxGeometry args={[5.8, 0.01, 1.8]} />
        <meshStandardMaterial color="#4e5e6a" metalness={0.7} roughness={0.4} />
      </mesh>
      {[-2.1, -1.05, 0, 1.05, 2.1].map((tx, i) => (
        <mesh key={i} position={[tx, -0.76, 0]}>
          <boxGeometry args={[0.06, 0.03, 1.8]} />
          <meshStandardMaterial color="#2a3540" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.9, 0.92]}>
        <boxGeometry args={[5.8, 0.28, 0.04]} />
        <meshStandardMaterial color="#c8a020" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Left column */}
      <mesh position={[-2.85, 0.3, 0]} castShadow>
        <boxGeometry args={[0.42, 2.6, 1.4]} />
        <meshStandardMaterial color="#2e5f8a" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[-2.64, 0.3, 0]}>
        <boxGeometry args={[0.01, 2.6, 1.4]} />
        <meshStandardMaterial color="#4a80a8" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Right column */}
      <mesh position={[2.85, 0.3, 0]} castShadow>
        <boxGeometry args={[0.55, 2.6, 1.4]} />
        <meshStandardMaterial color="#2e5f8a" metalness={0.55} roughness={0.45} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[2.6, -0.6 + i * 0.32, 0.5]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#8a9aaa" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
      <mesh position={[2.6, 0.3, 0.5]}>
        <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
        <meshStandardMaterial color="#6a7a8a" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Gantry rail */}
      <mesh position={[0, 0.5, 0.55]} castShadow>
        <boxGeometry args={[5.5, 0.28, 0.26]} />
        <meshStandardMaterial color="#7a8e9a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.65, 0.55]}>
        <boxGeometry args={[5.5, 0.02, 0.26]} />
        <meshStandardMaterial color="#aabbc8" metalness={0.9} roughness={0.15} />
      </mesh>
      {[-0.08, 0.08].map((oy, i) => (
        <mesh key={i} position={[0, 0.5 + oy, 0.7]}>
          <boxGeometry args={[5.4, 0.04, 0.06]} />
          <meshStandardMaterial color="#c0ccd8" metalness={0.95} roughness={0.08} />
        </mesh>
      ))}
      {[-1.5, -0.5, 0.5, 1.5].map((cx, i) => (
        <mesh key={i} position={[cx, 0.5, 0.38]}>
          <boxGeometry args={[0.55, 0.22, 0.04]} />
          <meshStandardMaterial color="#3a4248" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* Tool path trace */}
      {pathPoints.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pathPoints.length}
              array={new Float32Array(pathPoints.flatMap(([px,, pz]) => [px / 24, pz * 0.04 - 0.38, 0.86]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#38bdf8" opacity={0.6} transparent />
        </line>
      )}

      {/* Work piece */}
      <mesh position={[0, -0.72, 0.1]} receiveShadow>
        <boxGeometry args={[3.5, 0.06, 0.9]} />
        <meshStandardMaterial color="#8a7a60" metalness={0.4} roughness={0.7} />
      </mesh>
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Simulation
// ══════════════════════════════════════════════════════════════════════════
export default function SimScreen({ route, navigation }) {
  const { gcode, command } = route.params

  const [running, setRunning]         = useState(false)
  const [activeLine, setActiveLine]   = useState(-1)
  const [machineState, setMachineState] = useState({
    x: 0, y: 0, z: 5, spindleOn: false, spindleSpeed: 0,
    isCutting: false, pathPoints: [], feed: 0,
    gateOpen: false,
  })

  const stateRef    = useRef({ x: 0, y: 0, z: 5, spindleOn: false, isCutting: false, pathPoints: [] })
  const runRef      = useRef(false)
  const timerRef    = useRef(null)
  const codeScrollRef = useRef(null)
  const lineHeight  = 38

  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (activeLine < 0) return
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ])
    ).start()
    const offset = Math.max(0, activeLine * lineHeight - lineHeight * 2)
    codeScrollRef.current?.scrollTo({ y: offset, animated: true })
  }, [activeLine])

  function reset() {
    runRef.current = false
    setRunning(false)
    setActiveLine(-1)
    stateRef.current = { x: 0, y: 0, z: 5, spindleOn: false, isCutting: false, pathPoints: [] }
    setMachineState({ x: 0, y: 0, z: 5, spindleOn: false, spindleSpeed: 0, isCutting: false, pathPoints: [], feed: 0 })
    if (timerRef.current) clearTimeout(timerRef.current)
    pulseAnim.stopAnimation()
  }

  function executeStep(idx) {
    if (!runRef.current || idx >= gcode.length) {
      runRef.current = false
      setRunning(false)
      return
    }
    const l = gcode[idx]
    setActiveLine(idx)
    const prev = { ...stateRef.current }
    const next = { ...prev }

    if (l.move) {
      if (l.move.x !== undefined) next.x = l.move.x
      if (l.move.y !== undefined) next.y = l.move.y
      if (l.move.z !== undefined) next.z = l.move.z
    }
    if (l.spindle !== undefined) next.spindleOn = l.spindle
    next.isCutting = l.type === 'G1'

    const dist = Math.sqrt((next.x - prev.x) ** 2 + (next.y - prev.y) ** 2 + (next.z - prev.z) ** 2)
    const spd = l.type === 'G0' ? 200 : (l.feed || 400)
    const dur = l.move ? Math.max(400, (dist / spd) * 6000) : 300
    const steps = 30
    const stepMs = dur / steps
    let step = 0

    function tick() {
      if (!runRef.current) return
      step++
      const t = step / steps
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const ix = prev.x + (next.x - prev.x) * ease
      const iy = prev.y + (next.y - prev.y) * ease
      const iz = prev.z + (next.z - prev.z) * ease
      const newPts = l.type === 'G1' ? [...prev.pathPoints, [ix, iy, iz]] : prev.pathPoints

      setMachineState({
        x: ix, y: iy, z: iz,
        spindleOn: next.spindleOn,
        spindleSpeed: next.spindleOn ? 10 : 0,
        isCutting: next.isCutting,
        pathPoints: newPts,
        feed: l.feed || (l.type === 'G0' ? 'RAPID' : 0),
      })

      if (step < steps) {
        timerRef.current = setTimeout(tick, stepMs)
      } else {
        stateRef.current = { ...next, pathPoints: newPts }
        timerRef.current = setTimeout(() => executeStep(idx + 1), 80)
      }
    }
    tick()
  }

  function startRun() {
    reset()
    setTimeout(() => { runRef.current = true; setRunning(true); executeStep(0) }, 100)
  }

  const pulseColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.14)'],
  })

  return (
    <View style={s2.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={s2.topBar}>
        <TouchableOpacity style={s2.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s2.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s2.topTitle}>{command?.name ?? 'G00'} code running example</Text>
    
      </View>

      {/* Canvas — 52% height */}
      <View style={s2.canvasArea}>
        <CanvaProvider style={s2.canvas} camPosition={[0, 2.5, 10]}>
          <CncFrameTurning machineState={machineState} />
        </CanvaProvider>
        <View style={s2.axisOverlay}>
          {[['X', machineState.x, '#4a9eff'], ['Y', machineState.y, '#22c55e'], ['Z', machineState.z, '#f59e0b']].map(([ax, val, col]) => (
            <View key={ax} style={s2.axisChip}>
              <Text style={[s2.axisLbl, { color: col }]}>{ax}</Text>
              <Text style={s2.axisNum}>{Number(val).toFixed(2)}</Text>
            </View>
          ))}
          <View style={s2.axisChip}>
            <Text style={[s2.axisLbl, { color: machineState.feed === 'RAPID' ? '#f59e0b' : '#94a3b8' }]}>F</Text>
            <Text style={s2.axisNum}>{machineState.feed === 'RAPID' ? 'RPN' : `${machineState.feed || 0}`}</Text>
          </View>
          <View style={s2.axisChip}>
             <View style={s2.rpmBadge}>
                <Text style={[s2.axisLbl, { color: '#f59e0b' }]}>rpm</Text>
                <Text style={s2.axisNum}>{machineState.spindleSpeed || 0}</Text>
             </View>
          </View>
        </View>
      </View>

      {/* Controls + code — remaining height */}
      <View style={s2.bottomArea}>
        <View style={s2.ctrlRow}>
          <TouchableOpacity style={[s2.btn, s2.btnRun]} onPress={startRun} disabled={running}>
            <Text style={s2.btnRunText}>▶  Run</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s2.btn, s2.btnStop]} onPress={reset}>
            <Text style={s2.btnStopText}>■  Reset</Text>
          </TouchableOpacity>
          <View style={s2.statusPill}>
            <View style={[s2.statusDot, running && s2.statusDotRun]} />
            <Text style={[s2.statusTxt, running && { color: '#fbbf24' }]}>
              {running ? `${activeLine + 1}/${gcode.length}` : 'Ready'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={codeScrollRef}
          style={s2.codePanel}
          scrollEnabled={!running}
          showsVerticalScrollIndicator={false}
        >
          {gcode.map((l, i) => {
            const isActive = i === activeLine
            const isDone   = i < activeLine
            const tc = l.type === 'G1' ? '#f59e0b' : l.type === 'G0' ? '#4a9eff' : '#555'
            return (
              <Animated.View key={l.id} style={[
                s2.codeLine,
                isDone   && s2.codeLineDone,
                isActive && { backgroundColor: pulseColor },
              ]}>
                <View style={[s2.cursor, isActive && s2.cursorActive]} />
                <Text style={s2.codeIdx}>{String(i + 1).padStart(2, '0')}</Text>
                {l.type
                  ? <Text style={[s2.codeType, { color: tc }]}>{l.type}</Text>
                  : <Text style={s2.codeTypeEmpty}>{'   '}</Text>
                }
                <Text style={[s2.codeCmd, isActive && s2.codeCmdActive, isDone && s2.codeCmdDone]}>
                  {l.text}
                </Text>
                <Text style={s2.codeCommentInline} numberOfLines={1}>{l.comment}</Text>
                {isActive && <Text style={s2.arrow}>◀</Text>}
              </Animated.View>
            )
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════
const s2 = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#000000' },
  topBar:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111', gap: 10 },
  backBtn:           { paddingHorizontal: 8, backgroundColor: '#ffee',paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#ee1111' },
  backText:          { color: '#64748b', fontSize: 12,fontWeight: '600' },
  topTitle:          { flex: 1, fontSize: 13, color: '#94a3b8', fontFamily: 'Oswald-Bold' },
  rpmBadge:          {  },
  rpmText:           { color: '#38bdf8', fontSize: 10, fontWeight: '600' },
  canvasArea:        { height: height * 0.70, backgroundColor: '#050a10', position: 'relative' },
  canvas:            { flex: 1 },
  axisOverlay:       { position: 'absolute',flexDirection:'row', top: 0, left: 8},
  axisChip:          { width:40, alignItems: 'center' },
  axisLbl:           { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  axisNum:           { fontSize: 11, color: '#000', fontFamily: 'monospace', marginTop: 1,width:'100%',textAlign:'center' },
  bottomArea:        { flex: 1, backgroundColor: '#000000', borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  ctrlRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111' },
  btn:               { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1 },
  btnRun:            { backgroundColor: '#0c2a10', borderColor: '#1a4a1a' },
  btnStop:           { backgroundColor: '#2a0f0f', borderColor: '#4a1f1f' },
  btnRunText:        { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  btnStopText:       { color: '#f87171', fontSize: 12, fontWeight: '600' },
  statusPill:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  statusDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#334155' },
  statusDotRun:      { backgroundColor: '#fbbf24' },
  statusTxt:         { fontSize: 11, color: '#475569', fontFamily: 'monospace' },
  codePanel:         { flex: 1, backgroundColor: '#000000' },
  codeLine:          { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 10, gap: 6 },
  codeLineDone:      { opacity: 0.3 },
  cursor:            { width: 2, height: 20, borderRadius: 1, backgroundColor: 'transparent', marginRight: 2 },
  cursorActive:      { backgroundColor: '#ffffff' },
  codeIdx:           { fontSize: 10, color: '#2a2a2a', minWidth: 22, fontFamily: 'monospace' },
  codeType:          { fontSize: 9, fontWeight: '700', fontFamily: 'monospace', minWidth: 26 },
  codeTypeEmpty:     { minWidth: 26 },
  codeCmd:           { fontSize: 12, color: '#888888', fontFamily: 'monospace', flex: 1 },
  codeCmdActive:     { color: '#ffffff', fontWeight: '600' },
  codeCmdDone:       { color: '#333333' },
  codeCommentInline: { fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  arrow:             { fontSize: 10, color: '#ffffff', marginLeft: 4 },
})