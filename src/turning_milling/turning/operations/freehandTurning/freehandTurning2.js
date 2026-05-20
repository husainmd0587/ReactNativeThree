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
  Path as SkiaPath,
  Skia,
  Group,
  Line,
  Circle as SkiaCircle,
  Oval,
  LinearGradient,
  vec,
  Paint,
  BlurMask,
} from '@shopify/react-native-skia';

import Animated, {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  useAnimatedProps,
  Easing,
  useAnimatedStyle,
  useWorkletCallback,
} from 'react-native-reanimated';

import { Canvas as R3FCanvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────────────────────
const PROFILE_SEGS = 80;

const TOOLS = [
  { id: "roughing", name: "Roughing",   icon: "▬", color: "#e67e22", width: 24, depth: 9,   shape: "round"  },
  { id: "gouge",    name: "Bowl Gouge", icon: "◡", color: "#3498db", width: 14, depth: 5,   shape: "round"  },
  { id: "skew",     name: "Skew",       icon: "◇", color: "#9b59b6", width: 8,  depth: 3.5, shape: "flat"   },
  { id: "parting",  name: "Parting",    icon: "|", color: "#e74c3c", width: 3,  depth: 10,  shape: "narrow" },
  { id: "scraper",  name: "Scraper",    icon: "▱", color: "#1abc9c", width: 22, depth: 1.2, shape: "flat"   },
  { id: "spindle",  name: "Spindle",    icon: "⟨", color: "#f39c12", width: 5,  depth: 6,   shape: "point"  },
  { id: "bead",     name: "Bead",       icon: "◉", color: "#ff6b9d", width: 6,  depth: 4,   shape: "round"  },
];

const MATERIALS = [
  { id: "clay",    label: "Clay",    color: "#c8956c", roughness: 0.88, metalness: 0.00 },
  { id: "ceramic", label: "Ceramic", color: "#e8ddd0", roughness: 0.30, metalness: 0.05 },
  { id: "glazed",  label: "Glazed",  color: "#5b8fa8", roughness: 0.08, metalness: 0.15 },
  { id: "wood",    label: "Wood",    color: "#8B5E3C", roughness: 0.95, metalness: 0.00 },
  { id: "bronze",  label: "Bronze",  color: "#cd7f32", roughness: 0.35, metalness: 0.80 },
];

function clamp(v, lo, hi) {
  'worklet';
  return Math.max(lo, Math.min(hi, v));
}

function makeProfile(stockRadius) {
  'worklet';
  return new Array(PROFILE_SEGS).fill(stockRadius);
}

function xToSeg(x, stockLeft, stockWidth) {
  'worklet';
  return clamp(Math.floor(((x - stockLeft) / stockWidth) * PROFILE_SEGS), 0, PROFILE_SEGS - 1);
}

function applyTool(profile, cx, cy, tool, { axisY, stockLeft, stockRight, stockWidth }) {
  'worklet';
  const dist = Math.abs(cy - axisY);
  if (dist < 2 || cx < stockLeft || cx > stockRight) return profile;
  const next = profile.slice();
  const seg  = xToSeg(cx, stockLeft, stockWidth);
  const half = Math.floor(tool.width / 2);
  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;
    const t = di / (half + 1);
    let w = 1;
    if      (tool.shape === "round")  w = Math.sqrt(Math.max(0, 1 - t * t));
    else if (tool.shape === "point")  w = Math.max(0, 1 - Math.abs(t));
    else if (tool.shape === "narrow") w = Math.abs(t) < 0.4 ? 1 : 0;
    if (dist < next[s])
      next[s] = Math.max(2, next[s] - (next[s] - dist) * w * (tool.depth / 10));
  }
  return next;
}

function smooth(profile, str = 0.4) {
  'worklet';
  const o = profile.slice();
  for (let i = 1; i < profile.length - 1; i++)
    o[i] = profile[i] * (1 - str) + (profile[i - 1] + profile[i + 1]) / 2 * str;
  return o;
}

function hexToRgb(h) {
  'worklet';
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

// ─────────────────────────────────────────────────────────────
//  useLayout — Dimensions + layout computation
// ─────────────────────────────────────────────────────────────
function useLayout() {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    function compute() {
      const { width: W, height: H } = Dimensions.get('window');
      const STOCK_RADIUS = Math.min(H * 0.38, 140);
      setLayout({
        W, H,
        STOCK_RADIUS,
        AXIS_Y:      H * 0.50,
        STOCK_LEFT:  28,
        STOCK_RIGHT: W - 28,
        STOCK_WIDTH: W - 56,
      });
    }
    compute();
    const sub = Dimensions.addEventListener('change', compute);
    return () => sub?.remove();
  }, []);

  return layout;
}

// ─────────────────────────────────────────────────────────────
//  DrawingCanvas — Skia-based 2D lathe editor
// ─────────────────────────────────────────────────────────────
function DrawingCanvas({ profile, onProfile, tool, layout }) {
  const angleRef   = useSharedValue(0);
  const spinRef    = useSharedValue(true);
  const profileRef = useSharedValue([...profile]);
  const isCutting  = useSharedValue(false);
  const cursorX    = useSharedValue(0);
  const cursorY    = useSharedValue(0);
  const cursorVis  = useSharedValue(false);

  const { W, H, STOCK_RADIUS, AXIS_Y, STOCK_LEFT, STOCK_RIGHT, STOCK_WIDTH } = layout;

  // Sync profile prop to shared value
  useEffect(() => {
    profileRef.value = [...profile];
  }, [profile]);

  // Animation loop for rotation
  useEffect(() => {
    let last = performance.now();
    const tick = (ts) => {
      const dt = (ts - last) / 1000;
      last = ts;
      if (spinRef.value) {
        angleRef.value += dt * 3;
      }
      rafId = requestAnimationFrame(tick);
    };
    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Build stock path ────────────────────────────────────
  const stockPath = useDerivedValue(() => {
    const prof = profileRef.value;
    const rotFactor = Math.sin(angleRef.value);

    let d = `M ${STOCK_LEFT} ${AXIS_Y - prof[0]}`;
    for (let i = 0; i < PROFILE_SEGS; i++) {
      d += ` L ${STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH} ${AXIS_Y - prof[i]}`;
    }
    d += ` L ${STOCK_RIGHT} ${AXIS_Y - prof[PROFILE_SEGS - 1]}`;
    d += ` L ${STOCK_RIGHT} ${AXIS_Y + prof[PROFILE_SEGS - 1]}`;
    for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
      d += ` L ${STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH} ${AXIS_Y + prof[i]}`;
    }
    d += ` L ${STOCK_LEFT} ${AXIS_Y + prof[0]} Z`;

    return Skia.Path.MakeFromSVGString(d);
  });

  // ── Build outline path ──────────────────────────────────
  const outlinePath = useDerivedValue(() => {
    const prof = profileRef.value;
    let d = '';
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      d += (i === 0 ? 'M' : 'L') + ` ${x} ${AXIS_Y - prof[i]}`;
    }
    for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
      const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      d += ` L ${x} ${AXIS_Y + prof[i]}`;
    }
    d += ' Z';
    return Skia.Path.MakeFromSVGString(d);
  });

  // ── Build highlight streak path ─────────────────────────
  const streakPath = useDerivedValue(() => {
    const prof = profileRef.value;
    const rotFactor = Math.sin(angleRef.value);
    let d = '';
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH + rotFactor * 22;
      const y = AXIS_Y - prof[i] * 0.72;
      d += (i === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    }
    return Skia.Path.MakeFromSVGString(d);
  });

  // ── Build depth lines ───────────────────────────────────
  const depthLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i < 15; i++) {
      const idx = Math.floor((i / 15) * PROFILE_SEGS);
      const x = STOCK_LEFT + (idx / PROFILE_SEGS) * STOCK_WIDTH;
      lines.push({ x1: x, y1: AXIS_Y - 200, x2: x, y2: AXIS_Y + 200, key: i });
    }
    return lines;
  }, [STOCK_LEFT, STOCK_WIDTH, AXIS_Y]);

  // ── Build rotation rings ────────────────────────────────
  const ringData = useMemo(() => {
    const rings = [];
    for (let i = 6, ri = 0; i < PROFILE_SEGS - 6; i += 12, ri++) {
      rings.push({ idx: i, phase: (ri / 6) * Math.PI, key: ri });
    }
    return rings;
  }, []);

  // ── Gesture: Pan for cutting ────────────────────────────
  const gesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin((e) => {
        'worklet';
        spinRef.value = false;
        cursorVis.value = true;
        cursorX.value = e.x;
        cursorY.value = e.y;
        isCutting.value = true;

        const next = applyTool(
          profileRef.value,
          e.x, e.y,
          tool,
          { axisY: AXIS_Y, stockLeft: STOCK_LEFT, stockRight: STOCK_RIGHT, stockWidth: STOCK_WIDTH }
        );
        const final = tool.id === "scraper" ? smooth(next, 0.35) : next;
        profileRef.value = final;
        runOnJS(onProfile)([...final]);
      })
      .onUpdate((e) => {
        'worklet';
        cursorX.value = e.x;
        cursorY.value = e.y;
        if (!isCutting.value) return;

        const next = applyTool(
          profileRef.value,
          e.x, e.y,
          tool,
          { axisY: AXIS_Y, stockLeft: STOCK_LEFT, stockRight: STOCK_RIGHT, stockWidth: STOCK_WIDTH }
        );
        const final = tool.id === "scraper" ? smooth(next, 0.35) : next;
        profileRef.value = final;
        runOnJS(onProfile)([...final]);
      })
      .onEnd(() => {
        'worklet';
        isCutting.value = false;
        spinRef.value = true;
        cursorVis.value = false;
        runOnJS(onProfile)([...profileRef.value]);
      })
      .onFinalize(() => {
        'worklet';
        isCutting.value = false;
        spinRef.value = true;
        cursorVis.value = false;
      });
  }, [tool, AXIS_Y, STOCK_LEFT, STOCK_RIGHT, STOCK_WIDTH, onProfile]);

  // ── Tool cursor shape ───────────────────────────────────
  const cursorPath = useDerivedValue(() => {
    const half = tool.width / 2;
    let d = '';
    if (tool.shape === "round" || tool.shape === "bead") {
      d = `M ${-half} 0 Q 0 ${-half * 1.5} ${half} 0 Z`;
    } else if (tool.shape === "flat") {
      d = `M ${-half} -4 L ${half} -4 L ${half} 4 L ${-half} 4 Z`;
    } else if (tool.shape === "point") {
      d = `M 0 ${-half} L ${half} ${half} L ${-half} ${half} Z`;
    } else if (tool.shape === "narrow") {
      d = `M -1 -10 L 1 -10 L 1 10 L -1 10 Z`;
    } else {
      d = `M ${-half} -4 L ${half} -4 L ${half} 4 L ${-half} 4 Z`;
    }
    return Skia.Path.MakeFromSVGString(d);
  });

  // Gradient positions
  const gradStart = useDerivedValue(() => {
    return vec(W * (0.2 + Math.sin(angleRef.value) * 0.25), AXIS_Y - STOCK_RADIUS);
  });
  const gradEnd = useDerivedValue(() => {
    return vec(W * (0.55 + Math.sin(angleRef.value) * 0.2), AXIS_Y + STOCK_RADIUS);
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        <SkiaCanvas style={{ flex: 1, backgroundColor: "#0c1018" }}>
          {/* Background fill */}
          <SkiaPath path={Skia.Path.MakeFromSVGString(`M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`)} color="#0c1018" />

          {/* Rails */}
          <Line p1={vec(STOCK_LEFT - 8, AXIS_Y - 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y - 3)} color="#1e3a5f" strokeWidth={5} />
          <Line p1={vec(STOCK_LEFT - 8, AXIS_Y + 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y + 3)} color="#1e3a5f" strokeWidth={5} />
          <Line p1={vec(STOCK_LEFT - 8, AXIS_Y - 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y - 3)} color="#3b6fa0" strokeWidth={2} />
          <Line p1={vec(STOCK_LEFT - 8, AXIS_Y + 3)} p2={vec(STOCK_RIGHT + 8, AXIS_Y + 3)} color="#3b6fa0" strokeWidth={2} />

          {/* Axis dashes */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Line
              key={`dash-${i}`}
              p1={vec(STOCK_LEFT + i * (STOCK_WIDTH / 12), AXIS_Y)}
              p2={vec(STOCK_LEFT + (i + 0.42) * (STOCK_WIDTH / 12), AXIS_Y)}
              color="rgba(59,130,246,0.3)"
              strokeWidth={1}
            />
          ))}

          {/* Stock fill with gradient */}
          <SkiaPath path={stockPath} style="fill">
            <LinearGradient
              start={gradStart}
              end={gradEnd}
              colors={["#3a1a08", "#7a3818", "#ecb898", "#ffd8b8", "#c07848", "#3a1a08"]}
              positions={[0, 0.2, 0.45, 0.6, 0.8, 1]}
            />
          </SkiaPath>

          {/* Depth lines */}
          {depthLines.map((line) => (
            <Line
              key={line.key}
              p1={vec(line.x1, line.y1)}
              p2={vec(line.x2, line.y2)}
              color="rgba(140,60,20,0.15)"
              strokeWidth={0.35}
            />
          ))}

          {/* Rotation rings */}
          {ringData.map((ring) => {
            const rx = useDerivedValue(() => {
              const prof = profileRef.value;
              const ry = prof[ring.idx];
              const animRx = Math.abs(Math.sin(angleRef.value * 2 + ring.phase)) * ry * 0.13;
              return animRx < 0.5 ? 0 : animRx;
            });
            const x = STOCK_LEFT + (ring.idx / PROFILE_SEGS) * STOCK_WIDTH;
            const ry = profile[ring.idx];
            return rx.value > 0 ? (
              <Oval
                key={ring.key}
                x={x - rx.value}
                y={AXIS_Y - ry}
                width={rx.value * 2}
                height={ry * 2}
                color="rgba(255,204,136,0.22)"
                style="stroke"
                strokeWidth={0.8}
              />
            ) : null;
          })}

          {/* Highlight streak */}
          <SkiaPath path={streakPath} color="rgba(255,230,190,0.30)" style="stroke" strokeWidth={2.5} />

          {/* Outline */}
          <SkiaPath path={outlinePath} color="#5c2a10" style="stroke" strokeWidth={2.5} />

          {/* OD guides */}
          <Line p1={vec(STOCK_LEFT, AXIS_Y - STOCK_RADIUS)} p2={vec(STOCK_RIGHT, AXIS_Y - STOCK_RADIUS)} color="rgba(255,70,70,0.18)" strokeWidth={1} />
          <Line p1={vec(STOCK_LEFT, AXIS_Y + STOCK_RADIUS)} p2={vec(STOCK_RIGHT, AXIS_Y + STOCK_RADIUS)} color="rgba(255,70,70,0.18)" strokeWidth={1} />

          {/* End caps */}
          <Line p1={vec(STOCK_LEFT, AXIS_Y - profile[0])} p2={vec(STOCK_LEFT, AXIS_Y + profile[0])} color="#5c2a10" strokeWidth={3} />
          <Line p1={vec(STOCK_RIGHT, AXIS_Y - profile[PROFILE_SEGS - 1])} p2={vec(STOCK_RIGHT, AXIS_Y + profile[PROFILE_SEGS - 1])} color="#5c2a10" strokeWidth={3} />

          {/* Axis dot */}
          <SkiaCircle cx={W / 2} cy={AXIS_Y} r={3} color="#3b82f6" />

          {/* Ruler ticks */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = STOCK_LEFT + (i / 5) * STOCK_WIDTH;
            return (
              <Line key={`tick-${i}`} p1={vec(x, AXIS_Y - 10)} p2={vec(x, AXIS_Y - 4)} color="rgba(70,110,160,0.45)" strokeWidth={1} />
            );
          })}

          {/* Tool cursor */}
          {cursorVis.value && (
            <Group transform={[{ translateX: cursorX.value }, { translateY: cursorY.value }]}>
              <SkiaPath path={cursorPath} color={tool.color + "40"} style="fill" transform={[{ translateX: 2 }, { translateY: 2 }]} />
              <SkiaPath path={cursorPath} color={tool.color + "CC"} style="fill" />
              <SkiaPath path={cursorPath} color="#ffffff" style="stroke" strokeWidth={1.5} />
              <SkiaCircle cx={0} cy={0} r={2} color="#ffffff" />
              <SkiaCircle cx={0} cy={0} r={tool.width / 2} color={tool.color} style="stroke" strokeWidth={1} opacity={0.5} />
            </Group>
          )}
        </SkiaCanvas>
      </View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────
//  Scene3D — @react-three/fiber lathe geometry
// ─────────────────────────────────────────────────────────────
function LatheMesh({ profile, mat, stockRadius }) {
  const meshRef = useRef();
  const rotRef = useRef(0);
  const autoRotateRef = useRef(true);
  const dragRef = useRef({ active: false, startX: 0, startRot: 0 });

  // Build lathe geometry from profile
  const geometry = useMemo(() => {
    const points = [];
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const t = i / (PROFILE_SEGS - 1);
      const r = (profile[i] / stockRadius) * 1.5;
      const y = (t - 0.5) * 3;
      points.push(new THREE.Vector2(r, y));
    }
    const geo = new THREE.LatheGeometry(points, 48);
    geo.computeVertexNormals();
    return geo;
  }, [profile, stockRadius]);

  // Material
  const material = useMemo(() => {
    const [r, g, b] = hexToRgb(mat.color);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(`rgb(${r},${g},${b})`),
      roughness: mat.roughness,
      metalness: mat.metalness,
    });
  }, [mat]);

  // Auto-rotate
  useFrame((_, delta) => {
    if (autoRotateRef.value && meshRef.current) {
      rotRef.current += delta * 1.0;
      meshRef.current.rotation.y = rotRef.current;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={(e) => {
        autoRotateRef.value = false;
        dragRef.current = { active: true, startX: e.clientX, startRot: rotRef.current };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active || !meshRef.current) return;
        rotRef.current = dragRef.current.startRot + (e.clientX - dragRef.current.startX) * 0.013;
        meshRef.current.rotation.y = rotRef.current;
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
        autoRotateRef.value = true;
      }}
    >
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 3, -5]} intensity={0.5} />
    </mesh>
  );
}

function Scene3D({ profile, mat, autoRotate, layout }) {
  const { W, H, STOCK_RADIUS } = layout;

  return (
    <View style={{ flex: 1 }}>
      <R3FCanvas
        style={{ flex: 1, backgroundColor: "#0a0a18" }}
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <LatheMesh profile={profile} mat={mat} stockRadius={STOCK_RADIUS} />
      </R3FCanvas>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  FreehandTurning — Main screen
// ─────────────────────────────────────────────────────────────
export default function FreehandTurning() {
  const layout = useLayout();

  const [profile,    setProfile]  = useState(null);
  const [tool,       setTool]     = useState(TOOLS[0]);
  const [is3D,       setIs3D]     = useState(false);
  const [matIdx,     setMatIdx]   = useState(0);
  const [autoRotate, setAutoRot]  = useState(true);

  // Init profile once layout is known
  useEffect(() => {
    if (layout && !profile) {
      setProfile(makeProfile(layout.STOCK_RADIUS));
    }
  }, [layout]);

  const mat = MATERIALS[matIdx];

  const handleSmooth = useCallback(() => setProfile(p => smooth(p, 0.5)), []);
  const handleReset  = useCallback(() => {
    if (layout) setProfile(makeProfile(layout.STOCK_RADIUS));
  }, [layout]);

  const subtitle = is3D ? `${mat.label} · drag to orbit` : `${tool.name} tool active`;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1220" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.hLeft}>
          <Text style={styles.logo}>🏺</Text>
          <View>
            <Text style={styles.title}>Pottery Studio</Text>
            <Text style={styles.sub}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.hRight}>
          {!is3D ? (
            <>
              <TouchableOpacity style={styles.aBtn} onPress={handleSmooth}>
                <Text style={styles.aBtnText}>Smooth</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aBtn} onPress={handleReset}>
                <Text style={styles.aBtnText}>Reset</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.aBtn, autoRotate && styles.aBtnWarn]}
              onPress={() => setAutoRot(v => !v)}
            >
              <Text style={[styles.aBtnText, autoRotate && styles.aBtnWarnText]}>
                {autoRotate ? "⟳ Spin" : "⟳ Stop"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.toggle, is3D && styles.toggleOn]}
            onPress={() => setIs3D(v => !v)}
          >
            <Text style={[styles.toggleText, is3D && styles.toggleOnText]}>
              {is3D ? "3D" : "2D"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── BODY ───────────────────────────────────────────── */}
      <View style={styles.body}>
        {layout && profile ? (
          is3D ? (
            <View style={{ flex: 1, flexDirection: "column" }}>
              <View style={{ flex: 1 }}>
                <Scene3D profile={profile} mat={mat} autoRotate={autoRotate} layout={layout} />

              {/* Material bar */}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.matBar}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center', height: 50 }}
              >
                {MATERIALS.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.matBtn,
                      i === matIdx && { borderColor: m.color },
                    ]}
                    onPress={() => setMatIdx(i)}
                  >
                    <View style={[styles.swatch, { backgroundColor: m.color }]} />
                    <Text style={{ color: i === matIdx ? m.color : "#4a6080", fontSize: 11, fontWeight: "600" }}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: "column", backgroundColor: "#0c1018" }}>
              <View style={{ flex: 1 }}>
                <DrawingCanvas
                profile={profile}
                onProfile={setProfile}
                tool={tool}
                layout={layout}
              />
              </View>
              <View style={styles.hintWrap}>
                <Text style={styles.hintTxt}>Draw toward center ↑↓ to carve · both sides cut</Text>
              </View>
            </View>
          )
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Initialising lathe…</Text>
          </View>
        )}
      </View>

      {/* ── TOOL BAR (2D only) ─────────────────────────────── */}
      {!is3D && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolBar}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 7, alignItems: 'center', height: 80 }}
        >
          {TOOLS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.toolBtn,
                tool.id === t.id && { borderColor: t.color, backgroundColor: t.color + "18" },
              ]}
              onPress={() => setTool(t)}
            >
              <Text style={[styles.toolIcon, { color: tool.id === t.id ? t.color : "#4a6080" }]}>
                {t.icon}
              </Text>
              <Text style={[styles.toolName, { color: tool.id === t.id ? t.color : "#4a6080" }]}>
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#090910",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#0d1220",
    borderBottomWidth: 1,
    borderBottomColor: "#182030",
    flexShrink: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  hLeft:  { flexDirection: "row", alignItems: "center", gap: 10 },
  hRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  logo:   { fontSize: 24 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e2c9a0",
    letterSpacing: 1,
    lineHeight: 14,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sub: { fontSize: 10, color: "#4a6080", marginTop: 2, fontStyle: "italic" },

  aBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "#182030",
    borderWidth: 1,
    borderColor: "#253050",
  },
  aBtnText: {
    color: "#7a9ab8",
    fontSize: 11,
    fontWeight: "500",
  },
  aBtnWarn: { borderColor: "#f59e0b" },
  aBtnWarnText: { color: "#f59e0b" },

  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "#182030",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  toggleText: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  toggleOn: { backgroundColor: "#3b82f6" },
  toggleOnText: { color: "#fff" },

  body: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    flexDirection: "column",
  },

  matBar: {
    height: 50,
    backgroundColor: "rgba(9,9,16,0.90)",
    borderTopWidth: 1,
    borderTopColor: "#182030",
    paddingHorizontal: 12,
  },
  matBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#141c2a",
    borderWidth: 1.5,
    borderColor: "#1e2a3c",
  },
  swatch: { width: 11, height: 11, borderRadius: 5.5 },

  toolBar: {
    height: 80,
    position:'absolute',
    bottom:0,
    backgroundColor: "#0d1220",
    borderTopWidth: 1,
    borderTopColor: "#182030",
    paddingHorizontal: 10,
  },
  toolBtn: {
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#131d2c",
    borderWidth: 1.5,
    borderColor: "#1c2a3c",
    minWidth: 64,
  },
  toolIcon: { fontSize: 20, lineHeight: 24 },
  toolName: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  hintWrap: {
    alignItems: "center",
    pointerEvents: "none",
    paddingVertical: 6,
  },
  hintTxt: {
    fontSize: 10,
    color: "rgba(100,130,160,0.6)",
    backgroundColor: "rgba(9,9,16,0.75)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    fontStyle: "italic",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#4a6080",
    fontSize: 12,
    fontStyle: "italic",
  },
});