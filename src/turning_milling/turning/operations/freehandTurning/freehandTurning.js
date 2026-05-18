import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar, Platform,
} from 'react-native';
import {
  GestureDetector, Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  Canvas as SkiaCanvas,
  Path, Skia, Group, Line, Circle, Oval,
  LinearGradient, vec,
} from '@shopify/react-native-skia';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useFrame as useR3FFrame } from '@react-three/fiber/native';
import useControls from 'r3f-native-orbitcontrols';
import { useTextureLoader } from '../../../../utils/materials/textures'
import CanvaPovider from '../../../../provider'
import * as THREE from 'three';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Layout ────────────────────────────────────────────────────
const HEADER_H   = Platform.OS === 'ios' ? 96 : 58;
const TOOLBAR_H  = 88;
const CANVAS_H   = SH - HEADER_H - TOOLBAR_H;
const CANVAS_W   = SW;

// ── Drawing space ─────────────────────────────────────────────
const PROFILE_SEGS  = 80;
const STOCK_RADIUS  = Math.min(CANVAS_H * 0.38, 140);
const AXIS_Y        = CANVAS_H * 0.50;
const STOCK_LEFT    = 28;
const STOCK_RIGHT   = CANVAS_W - 28;
const STOCK_WIDTH   = STOCK_RIGHT - STOCK_LEFT;

// ── Tools ─────────────────────────────────────────────────────
const TOOLS = [
  { id: 'roughing', name: 'Roughing',    icon: '▬', color: '#e67e22', width: 24, depth: 9,   shape: 'round'  },
  { id: 'gouge',    name: 'Bowl Gouge',  icon: '◡', color: '#3498db', width: 14, depth: 5,   shape: 'round'  },
  { id: 'skew',     name: 'Skew',        icon: '◇', color: '#9b59b6', width: 8,  depth: 3.5, shape: 'flat'   },
  { id: 'parting',  name: 'Parting',     icon: '|', color: '#e74c3c', width: 3,  depth: 10,  shape: 'narrow' },
  { id: 'scraper',  name: 'Scraper',     icon: '▱', color: '#1abc9c', width: 22, depth: 1.2, shape: 'flat'   },
  { id: 'spindle',  name: 'Spindle',     icon: '⟨', color: '#f39c12', width: 5,  depth: 6,   shape: 'point'  },
  { id: 'bead',     name: 'Bead',        icon: '◉', color: '#ff6b9d', width: 6,  depth: 4,   shape: 'round'  },
];

const MATERIALS = [
  { id: 'clay',    label: 'Clay',    color: '#c8956c', roughness: 0.88, metalness: 0.00 },
  { id: 'ceramic', label: 'Ceramic', color: '#e8ddd0', roughness: 0.30, metalness: 0.05 },
  { id: 'glazed',  label: 'Glazed',  color: '#5b8fa8', roughness: 0.08, metalness: 0.15 },
  { id: 'wood',    label: 'Wood',    color: '#8B5E3C', roughness: 0.95, metalness: 0.00 },
  { id: 'bronze',  label: 'Bronze',  color: '#cd7f32', roughness: 0.35, metalness: 0.80 },
];

// ── Profile helpers ───────────────────────────────────────────
const makeProfile = () => new Array(PROFILE_SEGS).fill(STOCK_RADIUS);

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function xToSeg(x) {
  return clamp(
    Math.floor(((x - STOCK_LEFT) / STOCK_WIDTH) * PROFILE_SEGS),
    0, PROFILE_SEGS - 1
  );
}

function applyTool(profile, cx, cy, tool) {
  const dist = Math.abs(cy - AXIS_Y);
  if (dist < 2 || cx < STOCK_LEFT || cx > STOCK_RIGHT) return profile;

  const next = profile.slice();
  const seg  = xToSeg(cx);
  const half = Math.floor(tool.width / 2);

  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;

    const t = di / (half + 1);
    let w = 1;
    if      (tool.shape === 'round')  w = Math.sqrt(Math.max(0, 1 - t * t));
    else if (tool.shape === 'point')  w = Math.max(0, 1 - Math.abs(t));
    else if (tool.shape === 'narrow') w = Math.abs(t) < 0.4 ? 1 : 0;

    if (dist < next[s]) {
      next[s] = Math.max(2, next[s] - (next[s] - dist) * w * (tool.depth / 10));
    }
  }
  return next;
}

function smooth(profile, str = 0.4) {
  const o = profile.slice();
  for (let i = 1; i < profile.length - 1; i++)
    o[i] = profile[i] * (1 - str) + (profile[i-1] + profile[i+1]) / 2 * str;
  return o;
}

// ── Skia path builders — silhouette stays constant ────────────
function fillPath(profile) {
  const p = Skia.Path.Make();
  p.moveTo(STOCK_LEFT, AXIS_Y - profile[0]);
  for (let i = 0; i < PROFILE_SEGS; i++) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    p.lineTo(x, AXIS_Y - profile[i]);
  }
  p.lineTo(STOCK_RIGHT, AXIS_Y - profile[PROFILE_SEGS - 1]);
  p.lineTo(STOCK_RIGHT, AXIS_Y + profile[PROFILE_SEGS - 1]);
  for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    p.lineTo(x, AXIS_Y + profile[i]);
  }
  p.lineTo(STOCK_LEFT, AXIS_Y + profile[0]);
  p.close();
  return p;
}

function outlinePath(profile) {
  const p = Skia.Path.Make();
  for (let i = 0; i < PROFILE_SEGS; i++) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    const y = AXIS_Y - profile[i];
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    const y = AXIS_Y + profile[i];
    p.lineTo(x, y);
  }
  p.close();
  return p;
}

// Highlight path — X offset shifts with rotOffset for moving specular
function highlightPath(profile, rotOffset) {
  const p = Skia.Path.Make();
  const offsetX = rotOffset * 22;
  for (let i = 0; i < PROFILE_SEGS; i++) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH + offsetX;
    const y = AXIS_Y - profile[i] * 0.72;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p;
}

// ── 3D: LatheGeometry from profile ───────────────────────────
const WORLD_H = 4.0;
const WORLD_R = 1.8;

function PotteryMesh({ profile, mat, autoRotate }) {
  const ref = useRef();
  const texture = useTextureLoader({});

  useR3FFrame((_, dt) => {
    if (autoRotate && ref.current) ref.current.rotation.y += dt * 1;
  });

  const geo = useMemo(() => {
    const pts = [];
    pts.push(new THREE.Vector2(0, 0));
    for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
      const y = ((PROFILE_SEGS - 1 - i) / (PROFILE_SEGS - 1)) * WORLD_H;
      const r = Math.max(0.012, (profile[i] / STOCK_RADIUS) * WORLD_R);
      pts.push(new THREE.Vector2(r, y));
    }
    pts.push(new THREE.Vector2(0, WORLD_H));
    const g = new THREE.LatheGeometry(pts, 72);
    g.computeVertexNormals();
    return g;
  }, [profile]);

  useEffect(() => {
    return () => geo.dispose();
  }, [geo]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(mat.color),
    map: texture,
    roughness: mat.roughness,
    metalness: mat.metalness,
    side: THREE.DoubleSide,
  }), [mat]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <group ref={ref} position={[0, -WORLD_H / 2, 0]}>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

function Scene3D({ profile, mat, autoRotate }) {
  return (
    <>
      <color attach="background" args={['#0a0a18']} />
      <ambientLight intensity={0.35} color="#ffe8d0" />
      <directionalLight position={[4, 8, 4]}  intensity={1.4} castShadow color="#ffffff" />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color="#a0c8ff" />
      <pointLight       position={[0, 6, 2]}   intensity={0.8}  color="#ffd0a0" distance={10} />
      <pointLight       position={[0, -1, 4]}  intensity={0.3}  color="#ffffff"  distance={6}  />

      <PotteryMesh profile={profile} mat={mat} autoRotate={autoRotate} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -WORLD_H / 2, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#141428" roughness={1} />
      </mesh>
    </>
  );
}

// ── 2D canvas ─────────────────────────────────────────────────
function DrawingCanvas({ profile, onProfile, tool }) {
  // ── FAKE 3D ROTATION ────────────────────────────────────────
  // rotFactor: -1 to 1 sine wave, drives gradient + highlight
  const [rotFactor, setRotFactor] = useState(0);
  // angleRef for ring phases (needs to be ref for access in render without re-render)
  const angleRef = useRef(0);
  const isSpinningRef = useRef(true);
  const spinRafRef = useRef(null);

  useEffect(() => {
    let lastTime = Date.now();

    const spinLoop = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isSpinningRef.current) {
        angleRef.current += dt * 3;
        setRotFactor(Math.sin(angleRef.current));
      }

      spinRafRef.current = requestAnimationFrame(spinLoop);
    };

    spinRafRef.current = requestAnimationFrame(spinLoop);

    return () => {
      if (spinRafRef.current) cancelAnimationFrame(spinRafRef.current);
    };
  }, []);

  // Reanimated shared values for gesture (worklet-safe)
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);

  // Cursor - plain React state for position
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });

  // RAF batching refs
  const pendingPoint = useRef(null);
  const rafRef = useRef(null);
  const isProcessing = useRef(false);

  const lastReactUpdate = useRef(0);
  const profileRef = useRef(profile);

  profileRef.current = profile;

  const updatePendingPoint = useCallback((x, y) => {
    pendingPoint.current = { x, y };
  }, []);

  const processCut = useCallback(() => {
    if (!isProcessing.current) {
      rafRef.current = null;
      return;
    }

    const point = pendingPoint.current;
    pendingPoint.current = null;

    if (point) {
      let next = applyTool(profileRef.current, point.x, point.y, tool);
      if (tool.id === 'scraper') next = smooth(next, 0.35);
      profileRef.current = next;

      const now = Date.now();
      if (now - lastReactUpdate.current > 30) {
        lastReactUpdate.current = now;
        onProfile([...next]);
      }
    }

    rafRef.current = requestAnimationFrame(processCut);
  }, [tool, onProfile]);

  const startProcessing = useCallback(() => {
    if (!isProcessing.current) {
      isProcessing.current = true;
      rafRef.current = requestAnimationFrame(processCut);
    }
  }, [processCut]);

  const stopProcessing = useCallback(() => {
    isProcessing.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPoint.current = null;
  }, []);

  const syncReactState = useCallback(() => {
    const now = Date.now();
    if (now - lastReactUpdate.current > 30) {
      lastReactUpdate.current = now;
      onProfile([...profileRef.current]);
    }
  }, [onProfile]);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => {
      'worklet';
      isSpinningRef.current = false;

      prevX.value = e.x;
      prevY.value = e.y;

      runOnJS(setCursorPos)({ x: e.x, y: e.y, visible: true });
      runOnJS(startProcessing)();
      runOnJS(updatePendingPoint)(e.x, e.y);
    })
    .onUpdate(e => {
      'worklet';
      runOnJS(setCursorPos)({ x: e.x, y: e.y, visible: true });
      runOnJS(updatePendingPoint)(e.x, e.y);

      prevX.value = e.x;
      prevY.value = e.y;
    })
    .onEnd(() => {
      'worklet';
      isSpinningRef.current = true;

      runOnJS(setCursorPos)({ x: 0, y: 0, visible: false });
      runOnJS(stopProcessing)();
      runOnJS(syncReactState)();
    });

  // ── Paths — silhouette stays constant ─────────────────────
  const fp = useMemo(() => fillPath(profile), [profile]);
  const op = useMemo(() => outlinePath(profile), [profile]);
  const hp = useMemo(() => highlightPath(profile, rotFactor), [profile, rotFactor]);

  // Rings — ry fixed, rx will animate in render
  const rings = useMemo(() => {
    const out = [];
    for (let i = 6; i < PROFILE_SEGS - 6; i += 12) {
      const x  = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      const ry = profile[i];
      out.push({ x, ry });
    }
    return out;
  }, [profile]);

  const toolCursor = useMemo(() => {
    const halfW = tool.width / 2;
    const p = Skia.Path.Make();

    if (tool.shape === 'round' || tool.shape === 'bead') {
      p.moveTo(-halfW, 0);
      p.quadTo(0, -halfW * 1.5, halfW, 0);
      p.lineTo(-halfW, 0);
      p.close();
    } else if (tool.shape === 'flat' || tool.shape === 'scraper') {
      p.addRect({ x: -halfW, y: -4, width: halfW * 2, height: 8 });
    } else if (tool.shape === 'point' || tool.shape === 'spindle') {
      p.moveTo(0, -halfW);
      p.lineTo(halfW, halfW);
      p.lineTo(-halfW, halfW);
      p.close();
    } else if (tool.shape === 'narrow') {
      p.addRect({ x: -1, y: -10, width: 2, height: 20 });
    } else {
      p.addRect({ x: -halfW, y: -4, width: halfW * 2, height: 8 });
    }

    return p;
  }, [tool]);

  // Gradient shift based on rotFactor
  const gradStartX = CANVAS_W * (0.2 + rotFactor * 0.25);
  const gradEndX = CANVAS_W * (0.55 + rotFactor * 0.2);

  return (
    <GestureDetector gesture={gesture}>
      <SkiaCanvas style={{ width: CANVAS_W, height: CANVAS_H }}>

        {/* Lathe bed - horizontal rails */}
        <Line p1={vec(STOCK_LEFT - 8, AXIS_Y - 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y - 3)}
          strokeWidth={5} color="#1e3a5f" />
        <Line p1={vec(STOCK_LEFT - 8, AXIS_Y + 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y + 3)}
          strokeWidth={5} color="#1e3a5f" />
        <Line p1={vec(STOCK_LEFT - 8, AXIS_Y - 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y - 3)}
          strokeWidth={2} color="#3b6fa0" />
        <Line p1={vec(STOCK_LEFT - 8, AXIS_Y + 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y + 3)}
          strokeWidth={2} color="#3b6fa0" />

        {/* Center axis dashes */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Line key={i}
            p1={vec(STOCK_LEFT + i * (STOCK_WIDTH / 12), AXIS_Y)}
            p2={vec(STOCK_LEFT + (i + 0.42) * (STOCK_WIDTH / 12), AXIS_Y)}
            strokeWidth={1} color="rgba(59,130,246,0.3)" />
        ))}

        {/* Stock fill — silhouette constant, gradient animates */}
        <Path path={fp} style="fill">
          <LinearGradient
            start={vec(gradStartX, AXIS_Y - STOCK_RADIUS)}
            end={vec(gradEndX, AXIS_Y + STOCK_RADIUS)}
            colors={['#3a1a08', '#7a3818', '#ecb898', '#ffd8b8', '#c07848', '#3a1a08']}
          />
        </Path>

        {/* Cross-section depth lines */}
        {Array.from({ length: 15 }).map((_, i) => {
          const idx = Math.floor((i / 15) * PROFILE_SEGS);
          const x   = STOCK_LEFT + (idx / PROFILE_SEGS) * STOCK_WIDTH;
          const r   = profile[idx];
          return (
            <Line key={i} p1={vec(x, AXIS_Y - r)} p2={vec(x, AXIS_Y + r)}
              strokeWidth={0.35} color="rgba(140,60,20,0.15)" />
          );
        })}

        {/* Rotation rings — rx animates with phase, ry fixed */}
        <Group opacity={0.22}>
          {rings.map((r, i) => {
            const phase = (i / rings.length) * Math.PI;
            const animRx = Math.abs(Math.sin(angleRef.current * 2 + phase)) * r.ry * 0.13;
            if (animRx < 0.5) return null;
            return (
              <Oval key={i}
                x={r.x - animRx} y={AXIS_Y - r.ry}
                width={animRx * 2} height={r.ry * 2}
                color="#ffcc88" style="stroke" strokeWidth={0.8} />
            );
          })}
        </Group>

        {/* Highlight streak — X shifts with rotFactor */}
        <Path path={hp} style="stroke" strokeWidth={2.5}
          color="rgba(255,230,190,0.30)" />

        {/* Silhouette — constant */}
        <Path path={op} style="stroke" strokeWidth={2.5} color="#5c2a10" />

        {/* Stock OD guide — constant */}
        <Line p1={vec(STOCK_LEFT, AXIS_Y - STOCK_RADIUS)}
              p2={vec(STOCK_RIGHT, AXIS_Y - STOCK_RADIUS)}
              strokeWidth={1} color="rgba(255,70,70,0.18)" />
        <Line p1={vec(STOCK_LEFT, AXIS_Y + STOCK_RADIUS)}
              p2={vec(STOCK_RIGHT, AXIS_Y + STOCK_RADIUS)}
              strokeWidth={1} color="rgba(255,70,70,0.18)" />

        {/* End caps — always static */}
        <Line p1={vec(STOCK_LEFT, AXIS_Y - profile[0])}
              p2={vec(STOCK_LEFT, AXIS_Y + profile[0])}
              strokeWidth={3} color="#5c2a10" />
        <Line p1={vec(STOCK_RIGHT, AXIS_Y - profile[PROFILE_SEGS - 1])}
              p2={vec(STOCK_RIGHT, AXIS_Y + profile[PROFILE_SEGS - 1])}
              strokeWidth={3} color="#5c2a10" />

        {/* Axis dot */}
        <Circle cx={CANVAS_W / 2} cy={AXIS_Y} r={3} color="#3b82f6" />

        {/* Ruler ticks */}
        {Array.from({ length: 6 }).map((_, i) => {
          const x = STOCK_LEFT + (i / 5) * STOCK_WIDTH;
          return <Line key={i} p1={vec(x, AXIS_Y - 10)} p2={vec(x, AXIS_Y - 4)}
            strokeWidth={1} color="rgba(70,110,160,0.45)" />;
        })}

        {/* TOOL CURSOR — plain transform */}
        {cursorPos.visible && (
          <Group transform={[{ translateX: cursorPos.x }, { translateY: cursorPos.y }]}>
            <Path
              path={toolCursor}
              style="fill"
              color={tool.color + '40'}
              transform={[{ translateX: 2 }, { translateY: 2 }]}
            />
            <Path
              path={toolCursor}
              style="fill"
              color={tool.color + 'CC'}
            />
            <Path
              path={toolCursor}
              style="stroke"
              strokeWidth={1.5}
              color="#ffffff"
            />
            <Circle cx={0} cy={0} r={2} color="#ffffff" />
            <Circle
              cx={0}
              cy={0}
              r={tool.width / 2}
              color={tool.color}
              style="stroke"
              strokeWidth={1}
              opacity={0.5}
            />
          </Group>
        )}

      </SkiaCanvas>
    </GestureDetector>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function FreehandTurning() {
  const [profile,    setProfile]   = useState(makeProfile);
  const [tool,       setTool]      = useState(TOOLS[0]);
  const [is3D,       setIs3D]      = useState(false);
  const [matIdx,     setMatIdx]    = useState(0);
  const [autoRotate, setAutoRot]   = useState(true);
  const [OrbitControls] = useControls();

  const mat = MATERIALS[matIdx];
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#090910" />
      <View style={s.root}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.hLeft}>
            <Text style={s.logo}>🏺</Text>
            <View>
              <Text style={s.title}>Pottery Studio</Text>
              <Text style={s.sub}>
                {is3D ? `${mat.label} · drag to orbit` : `${tool.name} tool active`}
              </Text>
            </View>
          </View>

          <View style={s.hRight}>
            {!is3D ? (
              <>
                <TouchableOpacity style={s.aBtn} onPress={() => setProfile(p => smooth(p, 0.5))}>
                  <Text style={s.aTxt}>Smooth</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={() => setProfile(makeProfile())}>
                  <Text style={s.aTxt}>Reset</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[s.aBtn, autoRotate && { borderColor: '#f59e0b' }]}
                onPress={() => setAutoRot(v => !v)}
              >
                <Text style={[s.aTxt, autoRotate && { color: '#f59e0b' }]}>
                  {autoRotate ? '⟳ Spin' : '⟳ Stop'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.toggle, is3D && s.toggleOn]}
              onPress={() => setIs3D(v => !v)}
            >
              <Text style={[s.toggleTxt, is3D && s.toggleTxtOn]}>
                {is3D ? '3D' : '2D'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}  >
          {is3D ? (
            <View style={{ flex: 1 }} >
             <CanvaPovider camPosition={[0,0,7]}>
                  <Scene3D profile={profile} mat={mat} autoRotate={autoRotate}  />
             </CanvaPovider>
              {/* Material selector */}
              <View style={s.matBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.matRow}>
                  {MATERIALS.map((m, i) => (
                    <TouchableOpacity key={m.id}
                      style={[s.matBtn, i === matIdx && { borderColor: m.color }]}
                      onPress={() => setMatIdx(i)}>
                      <View style={[s.swatch, { backgroundColor: m.color }]} />
                      <Text style={[s.matTxt, i === matIdx && { color: m.color }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#0c1018' }}>
              <DrawingCanvas profile={profile} onProfile={setProfile} tool={tool} />
              <View style={s.hintWrap} pointerEvents="none">
                <Text style={s.hintTxt}>Draw toward center ↑↓ to carve · both sides cut</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tool bar (2D only) */}
        {!is3D && (
          <View style={s.toolBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.toolRow}>
              {TOOLS.map(t => (
                <TouchableOpacity key={t.id}
                  style={[s.toolBtn, tool.id === t.id && {
                    borderColor: t.color,
                    backgroundColor: t.color + '18',
                  }]}
                  onPress={() => setTool(t)}
                  activeOpacity={0.75}>
                  <Text style={[s.toolIcon, { color: tool.id === t.id ? t.color : '#4a6080' }]}>
                    {t.icon}
                  </Text>
                  <Text style={[s.toolName, tool.id === t.id && { color: t.color }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </View>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090910' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10, paddingHorizontal: 14,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  hLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 6  },
  logo:   { fontSize: 24 },
  title:  { fontSize: 15, fontWeight: '700', color: '#e2c9a0', letterSpacing: 0.3 },
  sub:    { fontSize: 10, color: '#4a6080', marginTop: 1 },

  aBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, backgroundColor: '#182030',
    borderWidth: 1, borderColor: '#253050',
  },
  aTxt: { color: '#7a9ab8', fontSize: 11, fontWeight: '500' },

  toggle: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 7, backgroundColor: '#182030',
    borderWidth: 1.5, borderColor: '#3b82f6', marginLeft: 2,
  },
  toggleOn:    { backgroundColor: '#3b82f6' },
  toggleTxt:   { color: '#3b82f6', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  toggleTxtOn: { color: '#fff' },

  body: { flex: 1, overflow: 'hidden' },

  matBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
    backgroundColor: 'rgba(9,9,16,0.88)',
    borderTopWidth: 1, borderTopColor: '#182030',
    justifyContent: 'center',
  },
  matRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  matBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#141c2a',
    borderWidth: 1.5, borderColor: '#1e2a3c',
  },
  swatch: { width: 11, height: 11, borderRadius: 6 },
  matTxt: { fontSize: 11, fontWeight: '600', color: '#4a6080' },

  toolBar: {
    height: TOOLBAR_H,
    backgroundColor: '#0d1220',
    borderTopWidth: 1, borderTopColor: '#182030',
    justifyContent: 'center',
  },
  toolRow: { paddingHorizontal: 10, gap: 7, alignItems: 'center' },
  toolBtn: {
    alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#131d2c',
    borderWidth: 1.5, borderColor: '#1c2a3c',
    minWidth: 64, gap: 3,
  },
  toolIcon: { fontSize: 20, lineHeight: 24 },
  toolName: { fontSize: 9, fontWeight: '600', color: '#4a6080', letterSpacing: 0.3 },

  hintWrap: {
    position: 'absolute', bottom: 10,
    left: 0, right: 0, alignItems: 'center',
  },
  hintTxt: {
    fontSize: 10, color: 'rgba(100,130,160,0.6)',
    backgroundColor: 'rgba(9,9,16,0.75)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, overflow: 'hidden',
  },
});