import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar, Platform,
  Image, Animated,
} from 'react-native';
import {
  GestureDetector, Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import {
  Canvas as SkiaCanvas,
  Path, Skia, Group, Line, Circle, Oval,
  LinearGradient,
  vec,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';

import {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { useFrame as useR3FFrame } from '@react-three/fiber/native';
import useControls from 'r3f-native-orbitcontrols';
import { useTextureLoader } from '../../../utils/materials/textures';
import CanvaPovider from '../../../utils/ThreeJs_Utils/provider';
import * as THREE from 'three';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Updated Layout Constants ──
const HEADER_H = Platform.OS === 'ios' ? 96 : 58;
const TOOLBAR_H = 108;
const MAGAZINE_H = 150; // Height reserved for magazine
const CANVAS_H = SH - HEADER_H - TOOLBAR_H - MAGAZINE_H; // Reduced height
const CANVAS_W = SW;

// ── Updated Drawing space ─────────────────────────────────────────────
const PROFILE_SEGS = 60; // Reduced from 80 for smaller geometry
const STOCK_RADIUS = Math.min(CANVAS_H * 0.32, 100); // Reduced from 0.38
const AXIS_Y = CANVAS_H * 0.45; // Moved up slightly
const STOCK_LEFT = 40; // Increased padding
const STOCK_RIGHT = CANVAS_W - 40; // Increased padding
const STOCK_WIDTH = STOCK_RIGHT - STOCK_LEFT;

// ── Updated Tools with smaller sizes ──────────────────────────
const TOOLS = [
  { id: 'roughing', name: 'Roughing', icon: '⚡', color: '#e67e22', width: 16, depth: 6, shape: 'round' },
  { id: 'gouge', name: 'Bowl Gouge', icon: '🔄', color: '#3498db', width: 10, depth: 3.5, shape: 'round' },
  { id: 'skew', name: 'Skew', icon: '💠', color: '#9b59b6', width: 6, depth: 2.5, shape: 'flat' },
  { id: 'parting', name: 'Parting', icon: '✂️', color: '#e74c3c', width: 2, depth: 7, shape: 'narrow' },
  { id: 'scraper', name: 'Scraper', icon: '🔲', color: '#1abc9c', width: 16, depth: 0.8, shape: 'flat' },
  { id: 'spindle', name: 'Spindle', icon: '📏', color: '#f39c12', width: 4, depth: 4, shape: 'point' },
  { id: 'bead', name: 'Bead', icon: '⚪', color: '#ff6b9d', width: 4, depth: 3, shape: 'round' },
];

const MATERIALS = [
  { id: 'clay', label: 'Clay', color: '#c8956c', roughness: 0.88, metalness: 0.00 },
  { id: 'ceramic', label: 'Ceramic', color: '#e8ddd0', roughness: 0.30, metalness: 0.05 },
  { id: 'glazed', label: 'Glazed', color: '#5b8fa8', roughness: 0.08, metalness: 0.15 },
  { id: 'wood', label: 'Wood', color: '#8B5E3C', roughness: 0.95, metalness: 0.00 },
  { id: 'bronze', label: 'Bronze', color: '#cd7f32', roughness: 0.35, metalness: 0.80 },
];

// ── Profile helpers ───────────────────────────────────────────
const makeProfile = () => new Float32Array(PROFILE_SEGS).fill(STOCK_RADIUS);

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

  const next = Float32Array.from(profile);
  const seg = xToSeg(cx);
  const half = Math.floor(tool.width / 2);

  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;

    const t = di / (half + 1);
    let w = 1;
    if (tool.shape === 'round') w = Math.sqrt(Math.max(0, 1 - t * t));
    else if (tool.shape === 'point') w = Math.max(0, 1 - Math.abs(t));
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
    o[i] = profile[i] * (1 - str) + (profile[i - 1] + profile[i + 1]) / 2 * str;
  return o;
}

// ── Skia path builders ────────────────────────────────────────
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

  useEffect(() => { return () => geo.dispose(); }, [geo]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(mat.color),
    map: texture,
    roughness: mat.roughness,
    metalness: mat.metalness,
    side: THREE.DoubleSide,
  }), [mat]);

  useEffect(() => { return () => material.dispose(); }, [material]);

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
      <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow color="#ffffff" />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color="#a0c8ff" />
      <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffd0a0" distance={10} />
      <pointLight position={[0, -1, 4]} intensity={0.3} color="#ffffff" distance={6} />
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
  // ── Rotation effect ──
  const angleRef = useSharedValue(0);

  useEffect(() => {
    let last = performance.now();
    const tick = (ts) => {
      const dt = (ts - last) / 1000;
      last = ts;
      angleRef.value += dt * 5;
      rafId = requestAnimationFrame(tick);
    };
    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const gradStart = useDerivedValue(() => {
    const centerX = CANVAS_W / 2;
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    const amplitude = STOCK_RADIUS * 0.9;
    const normalizedAngle = (angleRef.value / (2 * Math.PI)) % 1;
    const t = normalizedAngle * 2 - 1;
    const dy = amplitude * t;
    return vec(centerX, (AXIS_Y - halfLen) + dy);
  });

  const gradEnd = useDerivedValue(() => {
    const centerX = CANVAS_W / 2;
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    const amplitude = STOCK_RADIUS * 0.9;
    const normalizedAngle = (angleRef.value / (2 * Math.PI)) % 1;
    const t = normalizedAngle * 2 - 1;
    const dy = amplitude * t;
    return vec(centerX, (AXIS_Y + halfLen) + dy);
  });

  // ── Cursor state ──
  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const TOOL_LENGTH = 100;

  const toolBodyTransform = useDerivedValue(() => [
    { translateX: cursorX.value },
    { translateY: cursorY.value },
  ]);

  const fingerTransform = useDerivedValue(() => [
    { translateX: cursorX.value },
    { translateY: cursorY.value },
  ]);

  const pendingPoint = useRef(null);
  const rafRef = useRef(null);
  const isProcessing = useRef(false);
  const lastReactUpdate = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const toolRef = useRef(tool);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  const updatePendingPoint = useCallback((x, y) => {
    pendingPoint.current = { x, y };
  }, []);

  const processCut = useCallback(() => {
    if (!isProcessing.current) {
      rafRef.current = null;
      return;
    }

    const point = pendingPoint.current;
    if (!point) {
      rafRef.current = requestAnimationFrame(processCut);
      return;
    }

    pendingPoint.current = null;
    if (point) {
      const currentTool = toolRef.current;
      let next = applyTool(profileRef.current, point.x, point.y, currentTool);
      if (currentTool.id === 'scraper') next = smooth(next, 0.35);
      profileRef.current = next;

      const now = Date.now();
      if (now - lastReactUpdate.current > 80) {
        lastReactUpdate.current = now;
        onProfile([...next]);
      }
    }

    rafRef.current = requestAnimationFrame(processCut);
  }, [onProfile]);

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
    .onBegin((e) => {
      'worklet';
      cursorX.value = e.x;
      cursorY.value = e.y;
      runOnJS(startProcessing)();
      runOnJS(updatePendingPoint)(e.x, e.y);
    })
    .onUpdate((e) => {
      'worklet';
      cursorX.value = e.x;
      cursorY.value = e.y;
      runOnJS(updatePendingPoint)(e.x, e.y);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(stopProcessing)();
      runOnJS(syncReactState)();
    });

  // ── Enhanced tool cursor builder ──
  const buildToolCursor = useCallback(() => {
    const halfW = tool.width / 2;
    const p = Skia.Path.Make();

    switch (tool.id) {
      case 'roughing':
        p.moveTo(-halfW * 1.2, 0);
        p.quadTo(-halfW * 1.4, -halfW * 0.4, -halfW * 0.8, -halfW * 0.8);
        p.quadTo(-halfW * 0.3, -halfW * 1.1, 0, -halfW * 1.2);
        p.quadTo(halfW * 0.3, -halfW * 1.1, halfW * 0.8, -halfW * 0.8);
        p.quadTo(halfW * 1.4, -halfW * 0.4, halfW * 1.2, 0);
        p.close();
        break;

      case 'gouge':
        p.moveTo(-halfW * 0.9, 0);
        p.quadTo(-halfW * 1.1, -halfW * 0.3, -halfW * 0.8, -halfW * 0.7);
        p.quadTo(-halfW * 0.4, -halfW * 1.1, 0, -halfW * 1.3);
        p.quadTo(halfW * 0.4, -halfW * 1.1, halfW * 0.8, -halfW * 0.7);
        p.quadTo(halfW * 1.1, -halfW * 0.3, halfW * 0.9, 0);
        p.close();
        break;

      case 'skew':
        p.moveTo(0, -halfW * 1.4);
        p.lineTo(halfW * 1.8, 0);
        p.lineTo(0, halfW * 1.4);
        p.lineTo(-halfW * 1.8, 0);
        p.close();
        break;

      case 'parting':
        p.moveTo(0, 0);
        p.lineTo(halfW * 0.3, -halfW * 0.3);
        p.lineTo(halfW * 0.6, -halfW * 0.8);
        p.lineTo(halfW * 0.7, -halfW * 1.8);
        p.lineTo(-halfW * 0.7, -halfW * 1.8);
        p.lineTo(-halfW * 0.6, -halfW * 0.8);
        p.lineTo(-halfW * 0.3, -halfW * 0.3);
        p.close();
        break;

      case 'scraper':
        const w = halfW * 1.4;
        p.moveTo(-w, 0);
        p.quadTo(-w, -halfW * 0.2, -w * 0.9, -halfW * 0.5);
        p.lineTo(w * 0.9, -halfW * 0.5);
        p.quadTo(w, -halfW * 0.2, w, 0);
        p.close();
        break;

      case 'spindle':
        p.moveTo(-halfW * 0.7, 0);
        p.quadTo(-halfW * 0.8, -halfW * 0.4, -halfW * 0.5, -halfW * 0.8);
        p.quadTo(-halfW * 0.2, -halfW * 1.0, 0, -halfW * 1.1);
        p.quadTo(halfW * 0.2, -halfW * 1.0, halfW * 0.5, -halfW * 0.8);
        p.quadTo(halfW * 0.8, -halfW * 0.4, halfW * 0.7, 0);
        p.close();
        break;

      case 'bead':
        p.moveTo(-halfW * 1.1, 0);
        p.quadTo(-halfW * 1.2, -halfW * 0.4, -halfW * 0.8, -halfW * 0.9);
        p.quadTo(-halfW * 0.4, -halfW * 1.3, 0, -halfW * 1.4);
        p.quadTo(halfW * 0.4, -halfW * 1.3, halfW * 0.8, -halfW * 0.9);
        p.quadTo(halfW * 1.2, -halfW * 0.4, halfW * 1.1, 0);
        p.close();
        break;

      default:
        p.addRect({ x: -halfW, y: -halfW * 2, width: halfW * 2, height: halfW * 2 });
        break;
    }

    return p;
  }, [tool]);

  const buildToolHandle = useCallback(() => {
    const halfW = tool.width / 2;
    const p = Skia.Path.Make();
    const handleLength = TOOL_LENGTH;

    p.moveTo(-halfW * 0.3, -halfW * 0.5);
    p.quadTo(-halfW * 0.2, -handleLength * 0.2, -halfW * 0.35, -handleLength);
    p.lineTo(halfW * 0.35, -handleLength);
    p.quadTo(halfW * 0.2, -handleLength * 0.2, halfW * 0.3, -halfW * 0.5);
    p.close();

    return p;
  }, [tool]);

  const buildToolFerrule = useCallback(() => {
    const halfW = tool.width / 2;
    const p = Skia.Path.Make();
    const ferruleY = -halfW * 0.8;
    const ferruleH = halfW * 0.6;

    p.addRect({
      x: -halfW * 0.4,
      y: ferruleY - ferruleH,
      width: halfW * 0.8,
      height: ferruleH
    });

    return p;
  }, [tool]);

  const buildToolShadow = useCallback(() => {
    const halfW = tool.width / 2;
    const p = Skia.Path.Make();
    const handleLength = TOOL_LENGTH;

    p.moveTo(-halfW * 0.35, -halfW * 0.3);
    p.quadTo(-halfW * 0.25, -handleLength * 0.2, -halfW * 0.4, -handleLength + 5);
    p.lineTo(halfW * 0.4, -handleLength + 5);
    p.quadTo(halfW * 0.25, -handleLength * 0.2, halfW * 0.35, -halfW * 0.3);
    p.close();

    return p;
  }, [tool]);

  // ── Paths ─────────────────────────────────────────────────────
  const fp = useMemo(() => fillPath(profile), [profile]);

  const rings = useMemo(() => {
    const out = [];
    for (let i = 4; i < PROFILE_SEGS - 4; i += 8) {
      const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      const ry = profile[i];
      out.push({ x, ry, segIdx: i });
    }
    return out;
  }, [profile]);

  const toolCursorPath = useMemo(() => buildToolCursor(), [buildToolCursor]);
  const toolHandlePath = useMemo(() => buildToolHandle(), [buildToolHandle]);
  const toolShadowPath = useMemo(() => buildToolShadow(), [buildToolShadow]);
  const toolFerrulePath = useMemo(() => buildToolFerrule(), [buildToolFerrule]);

  const axisLines = useMemo(() => Array.from({ length: 8 }), []);
  const depthLines = useMemo(() => Array.from({ length: 10 }), []);

  const cuttingIndicator = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addCircle(cursorX.value, cursorY.value, tool.width / 2 + 4);
    return p;
  });

  return (
    <GestureDetector gesture={gesture}>
      <SkiaCanvas style={{ width: CANVAS_W, height: CANVAS_H }}>
        {/* Lathe bed rails */}
        <Line p1={vec(STOCK_LEFT - 6, AXIS_Y - 2)} p2={vec(STOCK_RIGHT + 6, AXIS_Y - 2)}
          strokeWidth={4} color="#1e3a5f" />
        <Line p1={vec(STOCK_LEFT - 6, AXIS_Y + 2)} p2={vec(STOCK_RIGHT + 6, AXIS_Y + 2)}
          strokeWidth={4} color="#1e3a5f" />
        <Line p1={vec(STOCK_LEFT - 6, AXIS_Y - 2)} p2={vec(STOCK_RIGHT + 6, AXIS_Y - 2)}
          strokeWidth={1.5} color="#3b6fa0" />
        <Line p1={vec(STOCK_LEFT - 6, AXIS_Y + 2)} p2={vec(STOCK_RIGHT + 6, AXIS_Y + 2)}
          strokeWidth={1.5} color="#3b6fa0" />

        {/* Center axis dashes */}
        {axisLines.map((_, i) => (
          <Line key={i}
            p1={vec(STOCK_LEFT + i * (STOCK_WIDTH / 8), AXIS_Y)}
            p2={vec(STOCK_LEFT + (i + 0.42) * (STOCK_WIDTH / 8), AXIS_Y)}
            strokeWidth={0.8} color="rgba(59,130,246,0.3)" />
        ))}

        <Path path={fp} style="fill">
          <LinearGradient
            start={gradStart}
            end={gradEnd}
            colors={[
              '#2a0e04',
              '#6a2c10',
              '#b86030',
              '#ecb898',
              '#fad0b0',
              '#d08858',
              '#7a3a18',
              '#2a0e04',
            ]}
            mode="clamp"
          />
        </Path>

        {/* Cutting area indicator */}
        <Path
          path={cuttingIndicator}
          style="fill"
          color={tool.color + '10'}
        />
        <Path
          path={cuttingIndicator}
          style="stroke"
          strokeWidth={1}
          color={tool.color + '30'}
        />

        {/* Cross-section depth lines */}
        {depthLines.map((_, i) => {
          const idx = Math.floor((i / 10) * PROFILE_SEGS);
          const x = STOCK_LEFT + (idx / PROFILE_SEGS) * STOCK_WIDTH;
          const r = profile[idx];
          return (
            <Line key={i}
              p1={vec(x, AXIS_Y - r)}
              p2={vec(x, AXIS_Y + r)}
              strokeWidth={0.3} color="rgba(140,60,20,0.12)" />
          );
        })}

        {/* Cross-section rings */}
        <Group opacity={0.22}>
          {rings.map((r, i) => (
            <Oval
              key={i}
              x={r.x - r.ry * 0.12}
              y={AXIS_Y - r.ry}
              width={r.ry * 0.24}
              height={r.ry * 2}
              color="#ffcc88"
              style="stroke"
              strokeWidth={0.7}
            />
          ))}
        </Group>

        <Circle cx={CANVAS_W / 2} cy={AXIS_Y} r={2.5} color="#3b82f6" />
        {Array.from({ length: 4 }).map((_, i) => {
          const x = STOCK_LEFT + (i / 3) * STOCK_WIDTH;
          return (
            <Line key={i}
              p1={vec(x, AXIS_Y - 8)}
              p2={vec(x, AXIS_Y - 3)}
              strokeWidth={1} color="rgba(70,110,160,0.45)" />
          );
        })}

        {/* ── TOOL BODY ── */}
        <Group opacity={1} transform={toolBodyTransform}>
          {/* Shadow */}
          <Path
            path={toolShadowPath}
            style="fill"
            color="rgba(0,0,0,0.4)"
            transform={[{ translateX: 3 }, { translateY: 3 }]}
          />

          {/* Ferrule */}
          <Path
            path={toolFerrulePath}
            style="fill"
            color="#8899aa"
            transform={[{ translateX: 1 }, { translateY: 1 }]}
          />
          <Path
            path={toolFerrulePath}
            style="fill"
            color="#aabbcc"
          />
          <Path
            path={toolFerrulePath}
            style="stroke"
            strokeWidth={0.5}
            color="#667788"
          />

          {/* Tool Handle */}
          <Path
            path={toolHandlePath}
            style="fill"
            color={tool.color + '90'}
            transform={[{ translateX: 1.5 }, { translateY: 1.5 }]}
          />
          <Path
            path={toolHandlePath}
            style="fill"
            color={tool.color + '70'}
          />

          {/* Handle wood grain */}
          {Array.from({ length: 4 }).map((_, i) => {
            const yPos = -TOOL_LENGTH * 0.2 * (i + 1);
            const line = Skia.Path.Make();
            const widthFactor = 0.15 + (i * 0.02);
            line.moveTo(-tool.width * widthFactor, yPos);
            line.quadTo(0, yPos + 2, tool.width * widthFactor, yPos);
            return (
              <Path
                key={i}
                path={line}
                style="stroke"
                strokeWidth={0.4}
                color="rgba(255,255,255,0.1)"
              />
            );
          })}

          {/* Handle highlight */}
          <Path
            path={toolHandlePath}
            style="fill"
            color="#ffffff"
            opacity={0.08}
            transform={[{ translateX: -1 }, { translateY: -1 }]}
          />

          {/* Tool body glow */}
          <Path
            path={toolCursorPath}
            style="fill"
            color={tool.color + '15'}
            transform={[{ translateX: 0 }, { translateY: 0 }]}
          />

          {/* Tool body - main color */}
          <Path
            path={toolCursorPath}
            style="fill"
            color={tool.color + 'DD'}
          />

          {/* Tool body - metallic highlight */}
          <Path
            path={toolCursorPath}
            style="fill"
            color={tool.color + '60'}
            transform={[{ translateX: -1 }, { translateY: -1 }]}
          />

          {/* Tool outline */}
          <Path
            path={toolCursorPath}
            style="stroke"
            strokeWidth={1}
            color="#ffffff"
            opacity={0.3}
          />

          {/* Cutting edge glow */}
          <Path
            path={toolCursorPath}
            style="stroke"
            strokeWidth={2}
            color={tool.color}
            opacity={0.4}
          />

          {/* Secondary cutting edge highlight */}
          <Path
            path={toolCursorPath}
            style="stroke"
            strokeWidth={0.6}
            color="#ffffff"
            opacity={0.2}
          />

          {/* Tool name on handle */}
          <SkiaText
            x={0}
            y={-TOOL_LENGTH + 12}
            text={tool.name}
            color="rgba(255,255,255,0.12)"
            fontSize={7}
            textAlign="center"
          />
        </Group>

        {/* ── CUTTING TIP INDICATOR ── */}
        <Group transform={fingerTransform}>
          <Circle cx={0} cy={0} r={tool.width / 2 + 6} color={tool.color + '15'} />
          <Circle cx={0} cy={0} r={tool.width / 2 + 3} color={tool.color + '25'} />
          <Circle
            cx={0}
            cy={0}
            r={tool.width / 2 + 1}
            color={tool.color}
            style="stroke"
            strokeWidth={1.2}
            opacity={0.5}
          />
          <Circle
            cx={0}
            cy={0}
            r={tool.width / 2}
            color={tool.color}
            style="stroke"
            strokeWidth={1.5}
            opacity={0.7}
          />
          <Circle cx={0} cy={0} r={2} color="#ffffff" opacity={0.9} />
          <Circle cx={0} cy={0} r={1.2} color={tool.color} opacity={0.8} />

          {/* Precision crosshair */}
          <Line
            p1={vec(-tool.width / 2 - 3, 0)}
            p2={vec(tool.width / 2 + 3, 0)}
            strokeWidth={0.4}
            color="rgba(255,255,255,0.15)"
          />
          <Line
            p1={vec(0, -tool.width / 2 - 3)}
            p2={vec(0, tool.width / 2 + 3)}
            strokeWidth={0.4}
            color="rgba(255,255,255,0.15)"
          />

          <Circle cx={0} cy={0} r={8} color="rgba(255,255,255,0.04)" />
          <Circle cx={0} cy={0} r={5} color="rgba(255,255,255,0.06)" />
        </Group>
      </SkiaCanvas>
    </GestureDetector>
  );
}

// ── Magazine Components ──────────────────────────────────────

function MagazineToggleButton({ isOpen, onPress, tool }) {
  return (
    <TouchableOpacity
      style={[
        styles.magazineToggle,
        isOpen && styles.magazineToggleOpen
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.toggleContent}>
        <Text style={styles.toggleIcon}>🛠️</Text>
        <Text style={styles.toggleLabel}>Tool Magazine</Text>
        <View style={styles.toggleBadge}>
          <Text style={styles.toggleBadgeText}>{tool.name}</Text>
        </View>
        <Text style={[
          styles.toggleArrow,
          isOpen && styles.toggleArrowOpen
        ]}>▼</Text>
      </View>
    </TouchableOpacity>
  );
}

function MagazineCloseButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.magazineCloseBtn} onPress={onPress}>
      <Text style={styles.magazineCloseText}>✕</Text>
    </TouchableOpacity>
  );
}



function getToolDescription(toolId) {
  const descriptions = {
    'roughing': '⚡ Heavy material removal',
    'gouge': '🔄 Deep bowl carving',
    'skew': '💠 Precision flat cuts',
    'parting': '✂️ Cutting off pieces',
    'scraper': '🔲 Smoothing surfaces',
    'spindle': '📏 Detailed spindle work',
    'bead': '⚪ Bead & detail forming'
  };
  return descriptions[toolId] || 'Selected';
}

// ── Main Screen ───────────────────────────────────────────────
export default function FreehandTurning() {
  const [profile, setProfile] = useState(makeProfile);
  const [tool, setTool] = useState(TOOLS[0]);
  const [is3D, setIs3D] = useState(false);
  const [matIdx, setMatIdx] = useState(0);
  const [autoRotate, setAutoRot] = useState(true);
  const [OrbitControls] = useControls();
  const [showTooltip, setShowTooltip] = useState(null);

  // Magazine state
  const [isMagazineOpen, setIsMagazineOpen] = useState(false);
  const magazineAnim = useRef(new Animated.Value(0)).current;
  const magazineHeight = TOOLBAR_H + 40;

  // Toggle magazine with animation
  const toggleMagazine = useCallback(() => {
    const toValue = isMagazineOpen ? 0 : 1;

    Animated.spring(magazineAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    setIsMagazineOpen(!isMagazineOpen);
  }, [isMagazineOpen, magazineAnim]);

  // Close magazine
  const closeMagazine = useCallback(() => {
    Animated.spring(magazineAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsMagazineOpen(false);
  }, [magazineAnim]);

  // Auto-hide magazine after 5 seconds of inactivity
  useEffect(() => {
    let timeoutId;

    if (isMagazineOpen) {
      timeoutId = setTimeout(() => {
        if (isMagazineOpen) {
          Animated.spring(magazineAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
          setIsMagazineOpen(false);
        }
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMagazineOpen, magazineAnim]);

  // Reset auto-hide timer on interaction
  const handleMagazineInteraction = useCallback(() => {
    setIsMagazineOpen(false);
    Animated.spring(magazineAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsMagazineOpen(true);
  }, [magazineAnim]);

  const mat = MATERIALS[matIdx];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#090910" />
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.hLeft}>
            <Text style={styles.logo}>🏺</Text>
            <View>
              <Text style={styles.title}>Pottery Studio</Text>
              <Text style={styles.sub}>
                {is3D ? `${mat.label} · drag to orbit` : `${tool.name} tool active`}
              </Text>
            </View>
          </View>

          <View style={styles.hRight}>
            {!is3D ? (
              <>
                <TouchableOpacity style={styles.aBtn} onPress={() => setProfile(p => smooth(p, 0.5))}>
                  <Text style={styles.aTxt}>Smooth</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aBtn} onPress={() => setProfile(makeProfile())}>
                  <Text style={styles.aTxt}>Reset</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.aBtn, autoRotate && { borderColor: '#f59e0b' }]}
                onPress={() => setAutoRot(v => !v)}
              >
                <Text style={[styles.aTxt, autoRotate && { color: '#f59e0b' }]}>
                  {autoRotate ? '⟳ Spin' : '⟳ Stop'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.toggle, is3D && styles.toggleOn]}
              onPress={() => setIs3D(v => !v)}
            >
              <Text style={[styles.toggleTxt, is3D && styles.toggleTxtOn]}>
                {is3D ? '3D' : '2D'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <View style={[styles.body, { paddingBottom: is3D ? 0 : 80 }]}>
          {is3D ? (
            <View style={{ flex: 1 }}>
              <CanvaPovider camPosition={[0, 0, 7]}>
                <Scene3D profile={profile} mat={mat} autoRotate={autoRotate} />
              </CanvaPovider>

              {/* Material selector */}
              <View style={styles.matBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.matRow}>
                  {MATERIALS.map((m, i) => (
                    <TouchableOpacity key={m.id}
                      style={[styles.matBtn, i === matIdx && { borderColor: m.color }]}
                      onPress={() => setMatIdx(i)}>
                      <View style={[styles.swatch, { backgroundColor: m.color }]} />
                      <Text style={[styles.matTxt, i === matIdx && { color: m.color }]}>
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
              <View style={styles.hintWrap} pointerEvents="none">
                <Text style={styles.hintTxt}>Draw toward center ↑↓ to carve · both sides cut</Text>
              </View>
            </View>
          )}
        </View>

        {/* Magazine Toggle Button - Always visible */}
        {!is3D && (
          <MagazineToggleButton
            isOpen={isMagazineOpen}
            onPress={toggleMagazine}
            tool={tool}
          />
        )}

        {/* Magazine-style Tool Bar - Animated */}
        {!is3D && (
          <Animated.View
            style={[
              styles.toolBarMagazine,
              {
                transform: [{
                  translateY: magazineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [magazineHeight, 0],
                  })
                }],
                opacity: magazineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              }
            ]}
          >
            <MagazineCloseButton onPress={closeMagazine} />

            <View style={styles.magazineHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.magazineTitle}>🛠️ Tool Selection</Text>
                <View style={styles.toolCountBadge}>
                  <Text style={styles.toolCountText}>{TOOLS.length}</Text>
                </View>
              </View>
              <Text style={styles.magazineSubtitle}>Tap to select</Text>
            </View>


            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.magazineRow}
              decelerationRate="fast"
              scrollEventThrottle={16}
            >
              {TOOLS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.magazineItem,
                    tool.id === t.id && styles.magazineItemActive,
                  ]}
                  onPress={() => {
                    setTool(t);
                    setShowTooltip(t.id);
                    setTimeout(() => setShowTooltip(null), 1500);
                    handleMagazineInteraction();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.magazineIconWrap,
                    tool.id === t.id && styles.magazineIconWrapActive
                  ]}>
                    <Text style={[
                      styles.magazineIcon,
                      tool.id === t.id && styles.magazineIconActive
                    ]}>
                      {t.icon}
                    </Text>
                  </View>

                  <Text style={[
                    styles.magazineToolName,
                    tool.id === t.id && styles.magazineToolNameActive
                  ]}>
                    {t.name}
                  </Text>

                  {tool.id === t.id && (
                    <View style={[styles.magazineActiveIndicator, { backgroundColor: t.color }]} />
                  )}

                  {showTooltip === t.id && (
                    <View style={[styles.magazineTooltip, { borderColor: t.color }]}>
                      <Text style={[styles.magazineTooltipText, { color: t.color }]}>
                        {getToolDescription(t.id)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.magazineDivider} />

            <View style={styles.magazineStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Active Tool</Text>
                <Text style={[styles.statValue, { color: tool.color }]}>{tool.name}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Tool Width</Text>
                <Text style={styles.statValue}>{tool.width}mm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Profile Points</Text>
                <Text style={styles.statValue}>{PROFILE_SEGS}</Text>
              </View>
            </View>
          </Animated.View>
        )}

      </View>
    </GestureHandlerRootView>
  );
}

// ── Complete Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  // Root
  root: { flex: 1, backgroundColor: '#090910' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10, paddingHorizontal: 14,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logo: { fontSize: 24 },
  title: { fontSize: 15, fontWeight: '700', color: '#e2c9a0', letterSpacing: 0.3 },
  sub: { fontSize: 10, color: '#4a6080', marginTop: 1 },

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
  toggleOn: { backgroundColor: '#3b82f6' },
  toggleTxt: { color: '#3b82f6', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  toggleTxtOn: { color: '#fff' },

  body: { flex: 1, overflow: 'hidden' },

  // ── Magazine Toggle Button ──
  magazineToggle: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: '#0d1220',
    borderWidth: 1.5,
    borderColor: '#1a2a3f',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  magazineToggleOpen: {
    borderColor: '#3b82f6',
    backgroundColor: '#0d1a30',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2c9a0',
    letterSpacing: 0.5,
  },
  toggleBadge: {
    backgroundColor: '#1a2538',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  toggleBadgeText: {
    fontSize: 10,
    color: '#7a9ab8',
    fontWeight: '500',
  },
  toggleArrow: {
    fontSize: 14,
    color: '#4a6080',
  },
  toggleArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },

  // ── Magazine Toolbar ──
  toolBarMagazine: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    height: TOOLBAR_H + 40,
    backgroundColor: '#0d1220',
    borderTopWidth: 1.5,
    borderTopColor: '#182030',
    paddingVertical: 2,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  magazineCloseBtn: {
    position: 'absolute',
    top: 4,
    right: 12,
    padding: 4,
    zIndex: 10,
  },

  magazineCloseText: {
    color: '#4a6080',
    fontSize: 16,
    fontWeight: '300',
  },

  magazineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 2,
  },

  magazineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2c9a0',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  magazineSubtitle: {
    fontSize: 9,
    color: '#4a6080',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  magazineRow: {
    paddingHorizontal: 12,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },

  magazineItem: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: 'transparent',
    minWidth: 44,
    position: 'relative',
  },

  magazineItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  magazineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a2538',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#253050',
  },

  magazineIconWrapActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  magazineIcon: {
    fontSize: 22,
    color: '#5a7a9a',
  },

  magazineIconActive: {
    color: '#3b82f6',
  },

  magazineToolName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6a8aaa',
    letterSpacing: 0.2,
    textAlign: 'center',
    bottom: -2,
    textTransform: 'capitalize',
  },

  magazineToolNameActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  magazineActiveIndicator: {
    position: 'absolute',
    top: -2,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  magazineTooltip: {
    position: 'absolute',
    top: -38,
    backgroundColor: '#0d1220',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  magazineTooltipText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  magazineDivider: {
    height: 1,
    backgroundColor: '#182030',
    marginHorizontal: 12,
    marginVertical: 4,
  },

  magazineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#182030',
    marginTop: 4,
    backgroundColor: 'rgba(13, 18, 32, 0.5)',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statLabel: {
    fontSize: 8,
    color: '#4a6080',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },

  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a9ab8',
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#182030',
  },

  // ── 3D Material Bar ──
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

  // ── 2D Hint ──
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

  // ── Tool Count Badge ──
  toolCountBadge: {
    backgroundColor: '#1a2538',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },

  toolCountText: {
    fontSize: 9,
    color: '#4a6080',
    fontWeight: '500',
  },
});