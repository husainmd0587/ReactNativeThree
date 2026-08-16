import React, { useState, useRef, useCallback, useMemo, useEffect, forwardRef, useImperativeHandle,memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, StatusBar, Platform,
  Animated, Modal,ImageBackground
} from 'react-native';
import {
  GestureDetector, Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import {
  Canvas as SkiaCanvas,
  Path, Skia, Group, Line, Circle,
  LinearGradient,
  ImageShader,
  Shader,
  useImage,
  vec,
  Text as SkiaText,
  matchFont,
} from '@shopify/react-native-skia';

import {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useFrame as useR3FFrame,Canvas } from '@react-three/fiber/native';
import useControls from 'r3f-native-orbitcontrols';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTextureLoader, Textures } from '../../../utils/materials/textures';
import CanvaPovider,{Lightings} from '../../../utils/ThreeJs_Utils/provider';
import {Scene} from '../../../utils/components/glbPreview'
import usetextureLoader from '../../../utils/materials/textures'
import {degToRad} from '../../../utils/common'
import * as THREE from 'three';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Layout Constants ──
const HEADER_H = Platform.OS === 'ios' ? 96 : 58;
const TOOLBAR_H = 108;
const MAGAZINE_H = 150; // Height reserved for magazine
const CONTROL_STRIP_H = 44; // Height reserved for the accuracy/stats control strip
const CANVAS_H = SH - HEADER_H - TOOLBAR_H - MAGAZINE_H - CONTROL_STRIP_H;
const CANVAS_W = SW;

// ── Drawing space ─────────────────────────────────────────────
const PROFILE_SEGS = 60;
const STOCK_RADIUS = Math.min(CANVAS_H * 0.32, 100);
const AXIS_Y = CANVAS_H * 0.45;
const STOCK_LEFT = 65;
const STOCK_RIGHT = CANVAS_W - 10;
const STOCK_WIDTH = STOCK_RIGHT - STOCK_LEFT;

// ── Chuck end-caps ──
// Small rotating 3-jaw chucks bracketing the stock -- "[]==[]" -- so
// the flat 2D profile still reads as the side view of a cylinder held
// on a lathe, not a flat strip. They live in the margin already
// reserved by STOCK_LEFT/STOCK_RIGHT, so no cutting-coordinate
// constants need to change.
const CHUCK_RADIUS = Math.min(30, STOCK_LEFT);
const CHUCK_CENTER_L = STOCK_LEFT / 2;
const CHUCK_CENTER_R = STOCK_RIGHT + (CANVAS_W - STOCK_RIGHT) / 2;

// ── Real-world scale ─────────────────────────────────────────
// Purely for HUD readouts (diameter callipers, thin-wall warning) --
// the simulation itself still works in px. We treat the stock's full
// starting radius as representing a real blank of this diameter.
const REAL_STOCK_DIAMETER_MM = 100;
const PX_TO_MM = REAL_STOCK_DIAMETER_MM / (STOCK_RADIUS * 2);
const MIN_SAFE_RADIUS = STOCK_RADIUS * 0.12; // below this, wall is "thin" / at risk

// ── Spindle speed ──────────────────────────────────────────────
const BASE_RPM = 1200; // reference speed the base spin/rotation rates were tuned at
const MIN_RPM = 200;
const MAX_RPM = 3000;
const RPM_STEP = 100;

// ── Persisted parts (AsyncStorage) ──
const SAVED_PARTS_KEY = '@pottery_studio/saved_parts';

// ── Cutting accuracy tuning ──────────────────────────────────
// Single place to retune the feel of catches, chatter, and wear
// without hunting through the gesture/cut pipeline below.
const CATCH_BASE_CHANCE = 0.006; // scaled by risk factors, then capped per-frame
const CATCH_PROB_CAP = 0.035;
const CATCH_LOCKOUT_MS = 220;    // brief "recoil" pause after a catch
const WEAR_RATE = 0.00003;       // wear gained per px of cutting contact
const WEAR_DEPTH_PENALTY = 0.55; // fully worn tool cuts up to 55% less
const WEAR_CATCH_RISK = 1.6;     // dull edges are more likely to skid/catch



// ── Tools ──────────────────────────────────────────────
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

// ── Handle → tip offset ────────────────────────────────────────
const TOOL_REACH = 10;
const TOOL_LENGTH = 50;
const DEBUG_SHOW_TIP = true;

function fingerToTip(fx, fy) {
  'worklet';
  const dx = CANVAS_W / 2 - fx;
  const dy = AXIS_Y - fy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const rawX = fx + (dx / len) * TOOL_REACH;
  const rawY = fy + (dy / len) * TOOL_REACH;
  const tx = rawX < STOCK_LEFT ? STOCK_LEFT : rawX > STOCK_RIGHT ? STOCK_RIGHT : rawX;
  return { tx, ty: rawY };
}

const toolLabelFont = matchFont({
  fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
  fontSize: 7,
  fontStyle: 'normal',
  fontWeight: 'normal',
});

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

function footprintRemoval(before, after, seg, half) {
  let total = 0;
  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;
    const d = before[s] - after[s];
    if (d > 0) total += d;
  }
  return total;
}

function smooth(profile, str = 0.4) {
  const o = profile.slice();
  for (let i = 1; i < profile.length - 1; i++)
    o[i] = profile[i] * (1 - str) + (profile[i - 1] + profile[i + 1]) / 2 * str;
  return o;
}

// Small random per-segment perturbation used to simulate tool chatter
// (spindle/feed resonance) -- distinct from a catch: low-amplitude,
// applied across a short span rather than a single deep gouge.
function jitterProfile(profile, centerSeg, halfWidth, intensity) {
  if (intensity <= 0) return profile;
  const next = Float32Array.from(profile);
  for (let di = -halfWidth; di <= halfWidth; di++) {
    const s = centerSeg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;
    const j = (Math.random() - 0.5) * 2 * intensity;
    next[s] = Math.max(1.5, next[s] + j);
  }
  return next;
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

function PotteryMesh({ profile, mat, autoRotate, rpm }) {
  const ref = useRef();
  // `mat.id` is passed through so the texture actually tracks the
  // selected material -- verify the exact param key against
  // utils/materials/textures.js if your Textures entries are keyed
  // differently (e.g. `name` instead of `type`).
  const texture = useTextureLoader({ type: mat.id });

  useR3FFrame((_, dt) => {
    if (autoRotate && ref.current) {
      // Rotation speed now tracks spindle RPM instead of a fixed rate.
      ref.current.rotation.y += dt * (rpm / BASE_RPM);
    }
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
    map: texture ?? null,
    roughness: mat.roughness,
    metalness: mat.metalness,
    side: THREE.DoubleSide,
  }), [mat, texture]);

  useEffect(() => { return () => material.dispose(); }, [material]);

  return (
    <group ref={ref} position={[0, -WORLD_H / 2, 0]}>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

function Scene3D({ profile, mat, autoRotate, rpm }) {
  return (
    <>
      <color attach="background" args={['#0a0a18']} />
      <ambientLight intensity={0.35} color="#ffe8d0" />
      <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow color="#ffffff" />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color="#a0c8ff" />
      <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffd0a0" distance={10} />
      <pointLight position={[0, -1, 4]} intensity={0.3} color="#ffffff" distance={6} />
      <PotteryMesh profile={profile} mat={mat} autoRotate={autoRotate} rpm={rpm} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -WORLD_H / 2, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#141428" roughness={1} />
      </mesh>
    </>
  );
}

// ── 2D canvas ─────────────────────────────────────────────────
const SPIN_TEXTURE_CONFIG = {
  MATERIAL: 'wood',
  TILE_SIZE: 96,
  WRAP_HEIGHT: 160,
  SPEED: 22,
  DIRECTION: 1,
  CLOCK_RATE: 5, // base rate at BASE_RPM -- scaled live by rpm/BASE_RPM
  MIN_BRIGHTNESS: 0.35,
  MAX_BRIGHTNESS: 1.0,
};

const CYLINDER_SHADER_SKSL = `
uniform shader image;
uniform float axisY;
uniform float radius;
uniform float phase;
uniform float direction;
uniform float wrapHeight;
uniform float minBrightness;
uniform float maxBrightness;

half4 main(vec2 pos) {
  float dy = pos.y - axisY;
  float t = clamp(dy / radius, -1.0, 1.0);
  float phi = acos(t);

  float twoPi = 6.28318530718;
  float matAngle = phi + direction * phase;
  float v = mod(matAngle, twoPi) / twoPi * wrapHeight;

  float facing = sin(phi);
  float brightness = mix(minBrightness, maxBrightness, facing);

  half4 texColor = image.eval(vec2(pos.x, v));
  return half4(texColor.rgb * brightness, texColor.a);
}
`;

const cylinderEffect = Skia.RuntimeEffect.Make(CYLINDER_SHADER_SKSL);

// ── Isolated HUD overlay ──────────────────────────────────────
// The diameter callipers and catch-flash used to be plain useState
// inside DrawingCanvas. Every update (hover ~16x/sec, catch flashes)
// re-ran DrawingCanvas's whole render function, which reconciles a
// 100+ element Skia tree -- on top of the profile/wear state updates
// already firing during a cut, this saturated the JS thread and made
// gesture input feel like it was hanging. Moving this state into its
// own tiny component, updated imperatively via a ref instead of
// props, means a hover tick only re-renders this small overlay --
// never the canvas -- while the canvas itself only re-renders when
// `profile`/`tool`/etc. actually change.
const CutHUD = forwardRef(function CutHUD(_props, ref) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [flash, setFlash] = useState(false);

  useImperativeHandle(ref, () => ({
    setHover: (info) => setHoverInfo(info),
    triggerFlash: () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
    },
  }), []);

  return (
    <>
      {flash && <View pointerEvents="none" style={styles.catchFlash} />}
      {hoverInfo && (
        <View pointerEvents="none" style={styles.hoverBadge}>
          <Text style={[styles.hoverBadgeText, hoverInfo.thin && styles.hoverBadgeTextWarn]}>
            ⌀ {hoverInfo.mm.toFixed(1)}mm{hoverInfo.thin ? '  ⚠ thin wall' : ''}
          </Text>
        </View>
      )}
    </>
  );
});


const RotatingPulley = memo(function RotatingPulley({
  position = [0, 0, 0],
  rotation = [0, 0, 0],

  radius = 0.8,
  thickness = 0.2,

  speed = 4,
  direction = 1,

  color = '#aa6e6e',
  texture = null,
  rpmRef = null,
}) {
  const pulleyRef = useRef(null);

  useR3FFrame((_, delta) => {
    if (!pulleyRef.current) return;

    // Rotation speed now tracks the same RPM control that drives the
    // stock's spin -- read live via a ref (not a prop) so this stays
    // in sync without needing this frozen preview to re-render.
    const rpmFactor = (rpmRef?.current ?? BASE_RPM) / BASE_RPM;
    pulleyRef.current.rotation.y += delta * speed * rpmFactor * direction;
  });

  return (
    <group
      position={position}
      rotation={rotation}
    >
      {/* Animation wrapper */}
      <group ref={pulleyRef}>

        <mesh>
          <cylinderGeometry
            args={[
              radius,
              radius,
              thickness,
              24,
            ]}
          />

          <meshStandardMaterial
            color={color}
            roughness={0.85}
            metalness={0.05}
            map={texture}
          />
        </mesh>

      </group>
    </group>
  );
});

const VBelt = memo(function VBelt({
  center = [0, -1, 0],
  width = 0.10,
  height = 3.68,
  speed = 0.5,
  color = '#888686',
  rpmRef = null,
}) {
  const beltRef = useRef(null);

  const loadedTexture = useTextureLoader({
    flipY: false,
    type: 'wall',
    repeat: [1, 1],
  });

  const texture = useMemo(() => {
    if (!loadedTexture) return null;

    const cloned = loadedTexture.clone();

    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.needsUpdate = true;

    return cloned;
  }, [loadedTexture]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  useR3FFrame((_, delta) => {
    if (!texture) return;

    const rpmFactor =
      (rpmRef?.current ?? BASE_RPM) / BASE_RPM;

    texture.offset.y -= delta * speed * rpmFactor;
  });

  if (!texture) return null;
 
  return (
    <mesh ref={beltRef} position={center} >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
});

const GearBox= memo(function GearBox({
  position = [0, 0, 0],
  rotation = [0, 10, 0],
  size = 0.5,
  color = '#fafafa'
}) {
  const texture = useTextureLoader({flipY: true, type: 'default', repeat : [1, 1]})
  return (
    <group
      position={position}
      rotation={degToRad(rotation)}
    >
      <mesh>
        <boxGeometry

          args={[
            size/1.5,
            size,
            size
          ]}
        />
        <meshStandardMaterial 
        color={color}   
        map={texture}
        metalness={0.5}
        />
      </mesh>
  
    </group>
  );
});

// =========================================================
// Motor + Pulley System
// =========================================================
function MoterAndPulley({ rpmRef }) {
  const texture = useTextureLoader({
    type: 'wall',
    flipY: false,
    repeat: [1, 1],
  });
const AllPos={
  motor:[-0.18, -1.4, 0],  //this is moter
  pulley1:[-1.25, 0.9, 0],  //this is pulley1 that is connected to Stock
  pulley2:[-1.1, 0.9, 0],   //this connected  to pullye1 and stock
  pulley3:[-1.23, -1.5, 0], //this connected to motor
  beltCenter:[-1.22, -0.098, 0],  //this is belt
  gearBox:[-0.8, -1.5, 0],  //this is gear box 
  pulley4:[-1.1, -1.5, 0]
}


  return (
    <group>

      {/* =================================================
          MOTOR GLB
          ================================================= */}
      <Scene
        modelUrl="https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/turning%26milling/mannualTurning/electricMoter.glb"
        soundUrl="https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/turning%26milling/mannualTurning/electricMotor2.mp3"
        soundPlayWithoutAnimation={true}
        modelConfig={{
          position: AllPos.motor,
          scale: [0.5, 0.5, 0.5],
          rotation: degToRad([0, -75, 0]),
        }}
      />
  

  <RotatingPulley
  position={AllPos.pulley1}
  rotation={degToRad([0, 18, 90])}
  radius={0.8}
  thickness={0.2}
  speed={4}
  direction={-1}
  color="#aa6e6e"
  texture={texture}
  rpmRef={rpmRef}
/>
  {/* center pully */}
  <RotatingPulley
  position={AllPos.pulley2}
  rotation={degToRad([0, 10, 90])}
  radius={0.3}
  thickness={0.29}
  speed={4}
  direction={-1}
  color="#aa6e6e"
  texture={texture}
  rpmRef={rpmRef}
/>

<RotatingPulley
  position={AllPos.pulley3}
  rotation={degToRad([0, 18, 90])}
  radius={0.4}
  thickness={0.2}
  speed={4}
  direction={-1}
  color="#aa6e6e"
  texture={texture}
  rpmRef={rpmRef}
/>
<VBelt center={AllPos.beltCenter} rpmRef={rpmRef} />
   <GearBox position={AllPos.gearBox} rpmRef={rpmRef} />
  <RotatingPulley
  position={AllPos.pulley4}
  rotation={degToRad([0, 18, 90])}
  radius={0.1}
  thickness={0.25}
  speed={4}
  direction={-1}
  color="#aa6e6e"
  texture={texture}
  rpmRef={rpmRef}
/>
    </group>
  );
}


// =========================================================
// Frozen Motor Preview
// =========================================================
const MotorPreview = React.memo(
  function MotorPreview({ rpmRef }) {
    return (
      <ImageBackground
        source={{
          uri:
            'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/turning%26milling/mannualTurning/carpentryWorkshop.jpg',
        }}
        resizeMode="cover"
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
        }}
      >
        {/* <View style={{position:'absolute',top:STOCK_RADIUS-20,width:SW,height:STOCK_RADIUS*2.2,
          backgroundColor:'rgba(255, 255, 255,0.3)'}}>

        </View> */}
        <Canvas
          style={{
            width: '100%',
            height: '100%',
          }}
          camera={{
            position: [0, 0, 5],
            fov: 50,
          }}
        >

          {/* Optional lighting */}
          <ambientLight intensity={1} />

          <directionalLight
            position={[5, 5, 5]}
            intensity={2}
          />

          {/* Motor + rotating pulleys */}
          <MoterAndPulley rpmRef={rpmRef} />

        </Canvas>

      </ImageBackground>
    );
  },

  // Keep the entire preview isolated from parent re-renders. Live RPM
  // changes still reach it via `rpmRef` (a stable ref object mutated
  // in place, read every frame inside each useR3FFrame above) rather
  // than through props/re-renders, so this memo staying "always equal"
  // doesn't break the sync.
  () => true
);

// chips helper ==========================================
// ── Chip particle system ──
// chips helper ==========================================
// ── Chip particle system ──
const CHIP_POOL_SIZE = 50;
const CHIP_GRAVITY = 520;          // px/s² -- stronger fall for a punchier arc
const CHIP_MAX_LIFE = 800;         // ms, randomized per chip
const CHIP_MIN_REMOVAL = 0.05;     // ignore near-zero radius changes -- hovering/edge-grazing shouldn't spawn chips

function chipStyleForMaterial(mat) {
  switch (mat.id) {
    case 'wood':    return { kind: 'shaving', color: mat.color, size: [16, 34] };
    case 'clay':    return { kind: 'blob',    color: mat.color, size: [5, 10] };
    case 'ceramic':
    case 'glazed':  return { kind: 'chip',    color: mat.color, size: [4, 9]  };
    case 'bronze':  return { kind: 'spark',   color: '#ffd27a', size: [3, 6]  };
    default:        return { kind: 'blob',    color: mat.color, size: [4, 8]  };
  }
}

function makeChipPool(n) {
  return Array.from({ length: n }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0,
    life: 0, maxLife: 1, size: 3, kind: 'blob', color: '#fff',
  }));
}

function ChipParticle({ chipSnapshot, index }) {
  const transform = useDerivedValue(() => {
    const c = chipSnapshot.value[index];
    return [{ translateX: c.x }, { translateY: c.y }, { rotate: c.rot }];
  });
  const opacity = useDerivedValue(() => chipSnapshot.value[index].opacity);
  const color = useDerivedValue(() => chipSnapshot.value[index].color);

  // Geometry rebuilt per-frame from live size/kind -- cheap since each
  // path is 3-6 points, and it's only rebuilt for active particles.
  const path = useDerivedValue(() => {
    const c = chipSnapshot.value[index];
    const s = c.size / 2;
    const p = Skia.Path.Make();

    switch (c.kind) {
      case 'shaving': {
        // Curled wood ribbon -- a tapered S-curve instead of a straight sliver
        p.moveTo(-s * 1.6, 0);
        p.quadTo(-s * 0.4, -s * 0.9, s * 0.6, -s * 0.3);
        p.quadTo(s * 1.3, 0.1, s * 1.6, s * 0.6);
        p.quadTo(s * 0.9, s * 0.35, s * 0.3, s * 0.5);
        p.quadTo(-s * 0.6, s * 0.7, -s * 1.6, 0);
        p.close();
        break;
      }
      case 'chip': {
        // Angular ceramic/glazed fragment -- irregular quad
        p.moveTo(-s, -s * 0.6);
        p.lineTo(s * 0.8, -s);
        p.lineTo(s, s * 0.5);
        p.lineTo(-s * 0.6, s * 0.9);
        p.close();
        break;
      }
      case 'spark': {
        // Small bright diamond -- reads as a metal spark, not a dot
        p.moveTo(0, -s);
        p.lineTo(s * 0.55, 0);
        p.lineTo(0, s);
        p.lineTo(-s * 0.55, 0);
        p.close();
        break;
      }
      case 'blob':
      default: {
        // Soft clay/ceramic crumb -- irregular rounded triangle, not a perfect circle
        p.moveTo(0, -s);
        p.quadTo(s, -s * 0.5, s * 0.7, s * 0.6);
        p.quadTo(0, s * 1.1, -s * 0.7, s * 0.6);
        p.quadTo(-s, -s * 0.5, 0, -s);
        p.close();
        break;
      }
    }
    return p;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path} style="fill" color={color} />
    </Group>
  );
}

const ChipLayer = memo(function ChipLayer({ chipSnapshot }) {
  return (
    <>
      {Array.from({ length: CHIP_POOL_SIZE }).map((_, i) => (
        <ChipParticle key={i} chipSnapshot={chipSnapshot} index={i} />
      ))}
    </>
  );
});


function DrawingCanvas({ profile, onProfile, onCommit, tool, mat, rpm, wear, onWear, onCatch, onChatterTick }) {
  const textureDef = useMemo(
    () => Textures.find(t => t.name === SPIN_TEXTURE_CONFIG.MATERIAL) ?? null,
    []
  );
  const texImage = useImage(textureDef?.image ?? null);
  const angleRef = useSharedValue(0);

  const matRef = useRef(mat);
  useEffect(() => { matRef.current = mat; }, [mat]);

  // ── Chip particle pool ──
  const chipPoolRef = useRef(makeChipPool(CHIP_POOL_SIZE));
  const chipCursorRef = useRef(0);
  const chipsActiveCountRef = useRef(0);
  const chipSnapshot = useSharedValue(
    Array.from({ length: CHIP_POOL_SIZE }, () => ({ x: 0, y: 0, rot: 0, opacity: 0, size: 0, kind: 'blob', color: '#fff' }))
  );
  const chipRafRef = useRef(null);
  const chipRunningRef = useRef(false);
  const lastChipFrameT = useRef(0);

  const updateChips = useCallback((dt) => {
    const pool = chipPoolRef.current;
    let anyActive = false;
    const snap = chipSnapshot.value.slice();
    const dts = dt / 1000;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        chipsActiveCountRef.current = Math.max(0, chipsActiveCountRef.current - 1);
        snap[i] = { ...snap[i], opacity: 0 };
        continue;
      }
      p.vy += CHIP_GRAVITY * dts;
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.rot += p.vr * dts;
      anyActive = true;
      const lifeRatio = p.life / p.maxLife;
      snap[i] = {
        x: p.x, y: p.y, rot: p.rot,
        opacity: Math.min(1, lifeRatio * 1.6),
        size: p.size * (0.7 + lifeRatio * 0.3),
        kind: p.kind, color: p.color,
      };
    }
    chipSnapshot.value = snap;
    return anyActive;
  }, []);

  const chipLoop = useCallback((t) => {
    const last = lastChipFrameT.current || t;
    const dt = Math.min(48, t - last);
    lastChipFrameT.current = t;
    const stillActive = updateChips(dt);
    if (stillActive || chipsActiveCountRef.current > 0) {
      chipRafRef.current = requestAnimationFrame(chipLoop);
    } else {
      chipRunningRef.current = false;
      chipRafRef.current = null;
      lastChipFrameT.current = 0;
    }
  }, [updateChips]);

  const startChipLoop = useCallback(() => {
    if (!chipRunningRef.current) {
      chipRunningRef.current = true;
      lastChipFrameT.current = 0;
      chipRafRef.current = requestAnimationFrame(chipLoop);
    }
  }, [chipLoop]);

  useEffect(() => () => { if (chipRafRef.current) cancelAnimationFrame(chipRafRef.current); }, []);

  // Spawns `count` chips at (tx, ty). `strength` (0-1+) scales how hard
  // they're flung -- driven by how much material was actually removed,
  // not just gesture speed, so a light scrape flings dust and a deep
  // roughing pass flings real debris.
const spawnChips = useCallback((tx, ty, count, tool, matStyle, spindleDir, strength) => {
  const pool = chipPoolRef.current;
  const kick = 1 + clamp(strength, 0, 1) * 1.4;
  for (let i = 0; i < count; i++) {
    const idx = chipCursorRef.current;
    chipCursorRef.current = (idx + 1) % CHIP_POOL_SIZE;
    const p = pool[idx];
    if (!p.active) chipsActiveCountRef.current += 1;

    const side = ty < AXIS_Y ? -1 : 1;

    // Surface (tangential) velocity flips direction between the top
    // and bottom of a spinning cylinder -- top and bottom of a wheel
    // move opposite ways on screen even though the wheel spins one way.
    const tangentialBase = spindleDir * side * (0.6 + Math.random() * 0.6);

    // Wide random cone so chips genuinely scatter left/right, not just
    // jitter around one dominant direction. This term is now comparable
    // in magnitude to the tangential term, not a minor jitter on top of it.
    const scatter = (Math.random() - 0.5) * 2; // -1..1

    p.active = true;
    p.x = tx + (Math.random() - 0.5) * tool.width * 0.6;
    p.y = ty;
    p.vx = (tangentialBase * 140 + scatter * 130) * kick;
    p.vy = side * (-170 - Math.random() * 130) * kick;
    p.rot = Math.random() * Math.PI * 2;
    p.vr = (Math.random() - 0.5) * 14;
    p.maxLife = CHIP_MAX_LIFE * (0.6 + Math.random() * 0.8);
    p.life = p.maxLife;
    p.size = matStyle.size[0] + Math.random() * (matStyle.size[1] - matStyle.size[0]);
    p.kind = matStyle.kind;
    p.color = matStyle.color;
  }
  startChipLoop();
}, [startChipLoop]);

  useEffect(() => {
    const rate = SPIN_TEXTURE_CONFIG.CLOCK_RATE * (rpm / BASE_RPM);
    const sweep = 100000;
    const durationMs = (sweep / rate) * 1000;
    angleRef.value = withRepeat(
      withTiming(angleRef.value + sweep, { duration: durationMs, easing: Easing.linear }),
      -1,
      false
    );
  }, [rpm]);

  const cylinderUniforms = useDerivedValue(() => ({
    axisY: AXIS_Y,
    radius: STOCK_RADIUS,
    phase: angleRef.value,
    direction: SPIN_TEXTURE_CONFIG.DIRECTION,
    wrapHeight: SPIN_TEXTURE_CONFIG.WRAP_HEIGHT,
    minBrightness: SPIN_TEXTURE_CONFIG.MIN_BRIGHTNESS,
    maxBrightness: SPIN_TEXTURE_CONFIG.MAX_BRIGHTNESS,
  }));

  const gradStart = useMemo(() => {
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    return vec(CANVAS_W / 2, AXIS_Y - halfLen);
  }, []);
  const gradEnd = useMemo(() => {
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    return vec(CANVAS_W / 2, AXIS_Y + halfLen);
  }, []);

  const grainPath = useDerivedValue(() => {
    const GRAIN_SPACING = 9;
    const p = Skia.Path.Make();
    const offset = SPIN_TEXTURE_CONFIG.DIRECTION * (angleRef.value * SPIN_TEXTURE_CONFIG.SPEED) % GRAIN_SPACING;
    for (let x = STOCK_LEFT - GRAIN_SPACING + offset; x < STOCK_RIGHT + GRAIN_SPACING; x += GRAIN_SPACING) {
      p.moveTo(x, AXIS_Y - STOCK_RADIUS - 4);
      p.lineTo(x, AXIS_Y + STOCK_RADIUS + 4);
    }
    return p;
  });

  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);

  const toolBodyTransform = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    return [{ translateX: tx }, { translateY: ty }];
  });

  const tipTransform = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    return [{ translateX: tx }, { translateY: ty }];
  });

  const gripTransform = useDerivedValue(() => [
    { translateX: fingerX.value },
    { translateY: fingerY.value },
  ]);

  const pendingPoint = useRef(null);
  const rafRef = useRef(null);
  const isProcessing = useRef(false);
  const lastReactUpdate = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const toolRef = useRef(tool);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  const wearRef = useRef(wear);
  useEffect(() => { wearRef.current = wear; }, [wear]);
  const rpmRef = useRef(rpm);
  useEffect(() => { rpmRef.current = rpm; }, [rpm]);

  const lastCutSample = useRef({ x: null, y: null, t: 0 });
  const lockUntilRef = useRef(0);
  const lastWearUpdate = useRef(0);
  const lastHoverUpdate = useRef(0);
  const lastChatterTick = useRef(0);

  const hudRef = useRef(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerCatchFx = useCallback(() => {
    hudRef.current?.triggerFlash();
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

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

    const now = Date.now();
    const currentTool = toolRef.current;
    const last = lastCutSample.current;
    const dt = last.t ? Math.max(1, now - last.t) : 16;
    const dist = last.x != null ? Math.hypot(point.x - last.x, point.y - last.y) : 0;
    const velocity = dist / dt;
    lastCutSample.current = { x: point.x, y: point.y, t: now };

    const pressureNorm = clamp(velocity / 1.4, 0, 1.6);
    const pressureMul = 0.6 + pressureNorm * 0.8;

    const rpmNow = rpmRef.current;
    const rpmFactor = rpmNow / BASE_RPM;
    const wearNow = wearRef.current;
    const wearMul = 1 - wearNow * WEAR_DEPTH_PENALTY;

    const seg = xToSeg(point.x);
    const currentRadius = profileRef.current[seg] ?? STOCK_RADIUS;
    const thinFactor = currentRadius < MIN_SAFE_RADIUS * 1.6 ? 1.6 : 1.0;
    const shapeRisk = currentTool.shape === 'narrow' ? 1.5 : currentTool.shape === 'point' ? 1.2 : 1.0;
    const wearRisk = 1 + wearNow * WEAR_CATCH_RISK;

    const inLockout = now < lockUntilRef.current;

    if (!inLockout) {
      const catchRisk = shapeRisk * wearRisk * thinFactor * rpmFactor * Math.max(0, pressureNorm - 0.35);
      const catchProb = clamp(CATCH_BASE_CHANCE * catchRisk, 0, CATCH_PROB_CAP);

if (pressureNorm > 0.35 && Math.random() < catchProb) {
  const digTool = { ...currentTool, depth: currentTool.depth * 2.6 };
  const beforeProfile = profileRef.current;
  const dug = applyTool(beforeProfile, point.x, point.y, digTool);
  const half = Math.floor(currentTool.width / 2);
  const catchRemoval = footprintRemoval(beforeProfile, dug, seg, half);

  profileRef.current = dug;
  lockUntilRef.current = now + CATCH_LOCKOUT_MS;
  onCatch();
  onWear(currentTool.id, clamp(wearNow + 0.05, 0, 1));
  triggerCatchFx();
  onProfile([...dug]);

  if (catchRemoval > CHIP_MIN_REMOVAL) {
    spawnChips(
      point.x, point.y, 10, currentTool,
      chipStyleForMaterial(matRef.current), SPIN_TEXTURE_CONFIG.DIRECTION,
      1.4
    );
  }
} else {
      const toolForCut = { ...currentTool, depth: currentTool.depth * pressureMul * wearMul };
  const beforeProfile = profileRef.current;
  let next = applyTool(beforeProfile, point.x, point.y, toolForCut);

  const half = Math.floor(currentTool.width / 2);
  const removalAmount = footprintRemoval(beforeProfile, next, seg, half);

  if (removalAmount > CHIP_MIN_REMOVAL) {
    const chipCount = clamp(Math.round(removalAmount * 0.8 + pressureNorm * 2.2), 1, 9);
    spawnChips(
      point.x, point.y, chipCount, currentTool,
      chipStyleForMaterial(matRef.current), SPIN_TEXTURE_CONFIG.DIRECTION,
      clamp(removalAmount / currentTool.width, 0, 1) + pressureNorm * 0.3
    );
  }

        const chatterOn = pressureNorm > 0.65 && rpmFactor > 1.15 &&
          (currentTool.shape === 'round' || currentTool.shape === 'flat');
        if (chatterOn) {
          const intensity = 0.4 * (pressureNorm - 0.5) * (rpmFactor - 1);
          next = jitterProfile(next, seg, Math.ceil(currentTool.width / 2) + 1, intensity);
          if (now - lastChatterTick.current > 150) {
            lastChatterTick.current = now;
            onChatterTick();
          }
        }

        if (currentTool.id === 'scraper') next = smooth(next, 0.35);
        profileRef.current = next;

        if (now - lastReactUpdate.current > 80) {
          lastReactUpdate.current = now;
          onProfile([...next]);
        }
      }

      if (now - lastWearUpdate.current > 300) {
        lastWearUpdate.current = now;
        const nextWear = clamp(wearNow + dist * WEAR_RATE * (currentTool.depth / 4), 0, 1);
        onWear(currentTool.id, nextWear);
      }
    }

    if (now - lastHoverUpdate.current > 100) {
      lastHoverUpdate.current = now;
      const r = profileRef.current[seg] ?? STOCK_RADIUS;
      hudRef.current?.setHover({ mm: r * 2 * PX_TO_MM, thin: r < MIN_SAFE_RADIUS });
    }

    rafRef.current = requestAnimationFrame(processCut);
  }, [onProfile, onCatch, onChatterTick, onWear, triggerCatchFx, spawnChips]);

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
    lastCutSample.current = { x: null, y: null, t: 0 };
    hudRef.current?.setHover(null);
  }, []);

  const syncReactState = useCallback(() => {
    const now = Date.now();
    if (now - lastReactUpdate.current > 30) {
      lastReactUpdate.current = now;
      onProfile([...profileRef.current]);
    }
    onCommit([...profileRef.current]);
  }, [onProfile, onCommit]);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      fingerX.value = e.x;
      fingerY.value = e.y;
      const { tx, ty } = fingerToTip(e.x, e.y);
      runOnJS(startProcessing)();
      runOnJS(updatePendingPoint)(tx, ty - TOOL_LENGTH);
    })
    .onUpdate((e) => {
      'worklet';
      fingerX.value = e.x;
      fingerY.value = e.y;
      const { tx, ty } = fingerToTip(e.x, e.y);
      runOnJS(updatePendingPoint)(tx, ty - TOOL_LENGTH);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(stopProcessing)();
      runOnJS(syncReactState)();
    });

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

      case 'scraper': {
        const w = halfW * 1.4;
        p.moveTo(-w, 0);
        p.quadTo(-w, -halfW * 0.2, -w * 0.9, -halfW * 0.5);
        p.lineTo(w * 0.9, -halfW * 0.5);
        p.quadTo(w, -halfW * 0.2, w, 0);
        p.close();
        break;
      }

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

  const fp = useMemo(() => fillPath(profile), [profile]);

  const toolCursorPath = useMemo(() => buildToolCursor(), [buildToolCursor]);
  const toolHandlePath = useMemo(() => buildToolHandle(), [buildToolHandle]);
  const toolShadowPath = useMemo(() => buildToolShadow(), [buildToolShadow]);
  const toolFerrulePath = useMemo(() => buildToolFerrule(), [buildToolFerrule]);

  const axisLines = useMemo(() => Array.from({ length: 8 }), []);
  const depthLines = useMemo(() => Array.from({ length: 10 }), []);

  const chuckJawPath = useMemo(() => {
    const p = Skia.Path.Make();
    const r = CHUCK_RADIUS;
    p.addRRect({ rect: { x: r * 0.28, y: -r * 0.13, width: r * 0.6, height: r * 0.26 }, rx: 2, ry: 2 });
    return p;
  }, []);

  const chuckSpinTransform = useDerivedValue(() => [{ rotate: angleRef.value }]);
  const chuckOriginL = useMemo(() => vec(CHUCK_CENTER_L, AXIS_Y), []);
  const chuckOriginR = useMemo(() => vec(CHUCK_CENTER_R, AXIS_Y), []);

  const CUT_TINT_COLOR = '#faf6ed';
  const cutOverlayPaths = useMemo(() => {
    const light = Skia.Path.Make();
    const medium = Skia.Path.Make();
    const heavy = Skia.Path.Make();
    const segW = STOCK_WIDTH / PROFILE_SEGS;
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const removal = clamp((STOCK_RADIUS - profile[i]) / STOCK_RADIUS, 0, 1);
      if (removal <= 0.03) continue;
      const x0 = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      const rect = { x: x0, y: AXIS_Y - STOCK_RADIUS - 2, width: segW + 0.5, height: STOCK_RADIUS * 2 + 4 };
      if (removal > 0.35) heavy.addRect(rect);
      else if (removal > 0.15) medium.addRect(rect);
      else light.addRect(rect);
    }
    return { light, medium, heavy };
  }, [profile]);

  const dangerSegments = useMemo(() => {
    const segs = [];
    let start = null;
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const isDanger = profile[i] < MIN_SAFE_RADIUS;
      if (isDanger && start === null) start = i;
      if (!isDanger && start !== null) { segs.push([start, i - 1]); start = null; }
    }
    if (start !== null) segs.push([start, PROFILE_SEGS - 1]);
    return segs;
  }, [profile]);

  const dangerPaths = useMemo(() => dangerSegments.map(([s, e]) => {
    const x0 = STOCK_LEFT + (s / PROFILE_SEGS) * STOCK_WIDTH;
    const x1 = STOCK_LEFT + ((e + 1) / PROFILE_SEGS) * STOCK_WIDTH;
    const p = Skia.Path.Make();
    p.addRect({ x: x0, y: AXIS_Y - STOCK_RADIUS - 6, width: Math.max(1, x1 - x0), height: STOCK_RADIUS * 2 + 12 });
    return p;
  }), [dangerSegments]);

  const cuttingIndicator = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    const p = Skia.Path.Make();
    p.addCircle(tx, ty, tool.width / 2 + 4);
    return p;
  });

  const connectorPath = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    const p = Skia.Path.Make();
    p.moveTo(fingerX.value, fingerY.value);
    p.lineTo(tx, ty);
    return p;
  });

  return (
    <View style={{ width: CANVAS_W, height: CANVAS_H }}>
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <GestureDetector gesture={gesture}>
          <SkiaCanvas style={{ width: CANVAS_W, height: CANVAS_H }}>
            {texImage && cylinderEffect ? (
              <Path path={fp} style="fill">
                <Shader source={cylinderEffect} uniforms={cylinderUniforms}>
                  <ImageShader
                    image={texImage}
                    tx="mirror"
                    ty="mirror"
                    fit="cover"
                    rect={{ x: 0, y: 0, width: SPIN_TEXTURE_CONFIG.TILE_SIZE, height: SPIN_TEXTURE_CONFIG.WRAP_HEIGHT }}
                  />
                </Shader>
              </Path>
            ) : (
              <>
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
                <Group clip={fp}>
                  <Path
                    path={grainPath}
                    style="stroke"
                    strokeWidth={1}
                    color="rgba(20,8,2,0.16)"
                  />
                </Group>
              </>
            )}

            <Group clip={fp}>
              <Path path={cutOverlayPaths.light} style="fill" color={CUT_TINT_COLOR} opacity={0.14} />
              <Path path={cutOverlayPaths.medium} style="fill" color={CUT_TINT_COLOR} opacity={0.26} />
              <Path path={cutOverlayPaths.heavy} style="fill" color={CUT_TINT_COLOR} opacity={0.4} />
            </Group>

            {dangerPaths.map((p, i) => (
              <Group key={i} clip={fp}>
                <Path path={p} style="fill" color="rgba(255,40,40,0.20)" />
              </Group>
            ))}

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

            <ChipLayer chipSnapshot={chipSnapshot} />

            {/* ── TOOL BODY ── */}
            <Group opacity={1} transform={toolBodyTransform}>
              <Path
                path={toolShadowPath}
                style="fill"
                color="rgba(0,0,0,0.4)"
                transform={[{ translateX: 3 }, { translateY: 3 }]}
              />

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

              <Path
                path={toolHandlePath}
                style="fill"
                color="#ffffff"
                opacity={0.08}
                transform={[{ translateX: -1 }, { translateY: -1 }]}
              />

              <Path
                path={toolCursorPath}
                style="fill"
                color={tool.color + '15'}
                transform={[{ translateX: 0 }, { translateY: 0 }]}
              />

              <Path
                path={toolCursorPath}
                style="fill"
                color={tool.color + 'DD'}
              />

              <Path
                path={toolCursorPath}
                style="fill"
                color={tool.color + '60'}
                transform={[{ translateX: -1 }, { translateY: -1 }]}
              />

              <Path
                path={toolCursorPath}
                style="stroke"
                strokeWidth={1}
                color="#ffffff"
                opacity={0.3}
              />

              <Path
                path={toolCursorPath}
                style="stroke"
                strokeWidth={2}
                color={tool.color}
                opacity={0.4}
              />

              <Path
                path={toolCursorPath}
                style="stroke"
                strokeWidth={0.6}
                color="#ffffff"
                opacity={0.2}
              />

              {toolLabelFont && (
                <SkiaText
                  x={-tool.name.length * 1.8}
                  y={-TOOL_LENGTH + 12}
                  text={tool.name}
                  font={toolLabelFont}
                  color="rgba(255,255,255,0.12)"
                />
              )}
            </Group>

            <Path
              path={connectorPath}
              style="stroke"
              strokeWidth={1.5}
              color="rgba(255,255,255,0.35)"
            />
            <Group transform={gripTransform}>
              <Circle cx={0} cy={0} r={4} color="rgba(255,255,255,0.5)" />
              <Circle cx={0} cy={0} r={4} color="rgba(255,255,255,0.25)" style="stroke" strokeWidth={1} />
            </Group>

            {/* ── CUTTING TIP INDICATOR ── */}
            <Group transform={tipTransform}>
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

              {DEBUG_SHOW_TIP && (
                <>
                  <Circle cx={0} cy={0} r={3} color="#ff0044" />
                  <Circle cx={0} cy={0} r={6} color="#ff0044" style="stroke" strokeWidth={1.5} opacity={0.9} />
                </>
              )}
            </Group>
          </SkiaCanvas>
        </GestureDetector>
      </Animated.View>

      <CutHUD ref={hudRef} />
    </View>
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
  const mat = MATERIALS[matIdx];
  const [autoRotate, setAutoRot] = useState(true);
  const [OrbitControls, events] = useControls();
  const [showTooltip, setShowTooltip] = useState(null);

  const orbitTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // ── Spindle speed ──
  const [rpm, setRpm] = useState(BASE_RPM);
  const adjustRpm = useCallback((delta) => {
    setRpm(r => clamp(r + delta, MIN_RPM, MAX_RPM));
  }, []);

  // ── Live RPM ref for the frozen motor/pulley/belt preview ──
  // MotorPreview is memoized to never re-render (see its comment), so
  // it can't pick up rpm through props/state the normal way. A ref
  // gives it a live value to read every frame inside its own
  // useR3FFrame loops without ever needing to re-render.
  const rpmRef = useRef(rpm);
  useEffect(() => { rpmRef.current = rpm; }, [rpm]);

  // ── Tool wear, catches, finish quality ──
  const [toolWear, setToolWear] = useState({});
  const [catches, setCatches] = useState(0);
  const [finishScore, setFinishScore] = useState(100);
  const currentWear = toolWear[tool.id] || 0;

  const handleWear = useCallback((toolId, val) => {
    setToolWear(w => ({ ...w, [toolId]: val }));
  }, []);
  const handleCatch = useCallback(() => {
    setCatches(c => c + 1);
    setFinishScore(s => clamp(s - 8, 0, 100));
  }, []);
  const handleChatterTick = useCallback(() => {
    setFinishScore(s => clamp(s - 1, 0, 100));
  }, []);
  const handleSharpen = useCallback(() => {
    setToolWear(w => ({ ...w, [tool.id]: 0 }));
  }, [tool.id]);

  // ── Undo / redo history ──
  const historyRef = useRef([Array.from(makeProfile())]);
  const historyIndexRef = useRef(0);
  const [historyTick, setHistoryTick] = useState(0);

  const pushHistory = useCallback((arr) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(arr);
    if (trimmed.length > 30) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const handleCommit = useCallback((arr) => { pushHistory(arr); }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setProfile(Float32Array.from(historyRef.current[historyIndexRef.current]));
      setHistoryTick(t => t + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setProfile(Float32Array.from(historyRef.current[historyIndexRef.current]));
      setHistoryTick(t => t + 1);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // ── Saved parts -- persisted via AsyncStorage ──
  // A "part" is a complete snapshot of a finished piece: the carved
  // profile AND which material/texture it was shown with, so loading
  // one restores exactly what you saved -- not just the shape.
  const [savedParts, setSavedParts] = useState([]);
  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const hasLoadedPartsRef = useRef(false);

  // Load once on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_PARTS_KEY);
        if (raw) setSavedParts(JSON.parse(raw));
      } catch (e) {
        console.warn('Pottery Studio: failed to load saved parts', e);
      } finally {
        hasLoadedPartsRef.current = true;
      }
    })();
  }, []);

  // Persist whenever the list changes -- skip the write the initial
  // load itself triggers, so mount doesn't immediately re-write
  // storage with the exact data it just read.
  useEffect(() => {
    if (!hasLoadedPartsRef.current) return;
    AsyncStorage.setItem(SAVED_PARTS_KEY, JSON.stringify(savedParts)).catch((e) => {
      console.warn('Pottery Studio: failed to save parts', e);
    });
  }, [savedParts]);

  const savePart = useCallback(() => {
    setSavedParts(p => [...p, {
      id: Date.now(),
      name: `Part ${p.length + 1}`,
      profile: Array.from(profile),
      matId: mat.id,
      createdAt: Date.now(),
    }]);
  }, [profile, mat.id]);

  // Loading a saved part restores both the shape and the material it
  // was saved with, and switches to 3D so you immediately see the
  // finished piece -- matching how it looked when you saved it.
  const loadPart = useCallback((part) => {
    const arr = Float32Array.from(part.profile);
    setProfile(arr);
    pushHistory(Array.from(arr));
    const idx = MATERIALS.findIndex(m => m.id === part.matId);
    if (idx >= 0) setMatIdx(idx);
    setIs3D(true);
    setIsPartsOpen(false);
  }, [pushHistory]);

  const deletePart = useCallback((id) => {
    setSavedParts(p => p.filter(x => x.id !== id));
  }, []);

  // Magazine state
  const [isMagazineOpen, setIsMagazineOpen] = useState(false);
  const magazineAnim = useRef(new Animated.Value(0)).current;
  const magazineHeight = TOOLBAR_H + 40;

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

  const closeMagazine = useCallback(() => {
    Animated.spring(magazineAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsMagazineOpen(false);
  }, [magazineAnim]);

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

  const handleMagazineInteraction = useCallback(() => {
    Animated.spring(magazineAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsMagazineOpen(true);
  }, [magazineAnim]);

  const handleSmooth = useCallback(() => {
    setProfile(p => {
      const next = smooth(p, 0.5);
      pushHistory(Array.from(next));
      return next;
    });
  }, [pushHistory]);

  const handleReset = useCallback(() => {
    const fresh = makeProfile();
    setProfile(fresh);
    pushHistory(Array.from(fresh));
    setToolWear({});
    setCatches(0);
    setFinishScore(100);
  }, [pushHistory]);

  const finishColor = finishScore > 70 ? '#4ade80' : finishScore > 40 ? '#f59e0b' : '#ef4444';

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
                {is3D ? `${mat.label} · ${rpm} RPM · drag to orbit` : `${tool.name} tool active`}
              </Text>
            </View>
          </View>

          <View style={styles.hRight}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={styles.hRightScroll}>
              <View style={styles.rpmBox}>
                <TouchableOpacity onPress={() => adjustRpm(-RPM_STEP)} style={styles.rpmBtn}>
                  <Text style={styles.rpmBtnTxt}>–</Text>
                </TouchableOpacity>
                <Text style={styles.rpmVal}>{rpm}</Text>
                <TouchableOpacity onPress={() => adjustRpm(RPM_STEP)} style={styles.rpmBtn}>
                  <Text style={styles.rpmBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>

              {!is3D ? (
                <>
                  <TouchableOpacity style={styles.aBtn} onPress={handleSmooth}>
                    <Text style={styles.aTxt}>Smooth</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aBtn} onPress={handleReset}>
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

              {/* Save/browse saved parts -- 3D only. A profile alone
                  isn't a finished "part" the way it looks with its
                  material/texture applied, and that's only visible in
                  3D, so these controls stay out of the 2D header. */}
              {is3D && (
                <>
                  <TouchableOpacity style={styles.aBtn} onPress={savePart}>
                    <Text style={styles.aTxt}>💾 Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aBtn, isPartsOpen && { borderColor: '#3b82f6' }]}
                    onPress={() => setIsPartsOpen(true)}
                  >
                    <Text style={[styles.aTxt, isPartsOpen && { color: '#3b82f6' }]}>
                      📂 Parts{savedParts.length > 0 ? ` (${savedParts.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

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

        {/* Accuracy / stats control strip -- 2D only */}
        {!is3D && (
          <View style={styles.controlStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlStripRow}>
              <TouchableOpacity
                style={[styles.ctrlBtn, !canUndo && styles.ctrlBtnDisabled]}
                disabled={!canUndo}
                onPress={undo}
              >
                <Text style={styles.ctrlTxt}>↶ Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, !canRedo && styles.ctrlBtnDisabled]}
                disabled={!canRedo}
                onPress={redo}
              >
                <Text style={styles.ctrlTxt}>↷ Redo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, currentWear < 0.05 && styles.ctrlBtnDisabled]}
                disabled={currentWear < 0.05}
                onPress={handleSharpen}
              >
                <Text style={styles.ctrlTxt}>🔪 Sharpen</Text>
              </TouchableOpacity>

              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Finish</Text>
                <Text style={[styles.statVal2, { color: finishColor }]}>{Math.round(finishScore)}%</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Catches</Text>
                <Text style={styles.statVal2}>{catches}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Wear</Text>
                <Text style={styles.statVal2}>{Math.round(currentWear * 100)}%</Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Body */}
        <View style={[styles.body, { paddingBottom: is3D ? 0 : 60 }]}>
          {is3D ? (
            <View style={{ flex: 1 }}>
              
                <CanvaPovider camPosition={[0, 0, 7]}>
                  <OrbitControls enablePan={false} enableZoom target={orbitTarget} />
                  <Scene3D profile={profile} mat={mat} autoRotate={autoRotate} rpm={rpm} />
                </CanvaPovider>
            

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
              <DrawingCanvas
                profile={profile}
                onProfile={setProfile}
                onCommit={handleCommit}
                tool={tool}
                mat={mat}
                rpm={rpm}
                wear={currentWear}
                onWear={handleWear}
                onCatch={handleCatch}
                onChatterTick={handleChatterTick}
              />
              <MotorPreview rpmRef={rpmRef} />
              <View style={styles.hintWrap} pointerEvents="none">
                <Text style={styles.hintTxt}>Draw toward center ↑↓ to carve · both sides cut</Text>
              </View>
            </View>
          )}
        </View>

        {/* Saved parts modal -- 3D only (see header). Lists every saved
            part vertically with its material; tapping one loads it. */}
        <Modal
          visible={isPartsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPartsOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsPartsOpen(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🏺 Saved Parts</Text>
                <TouchableOpacity onPress={() => setIsPartsOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={savePart}>
                <Text style={styles.modalSaveTxt}>+ Save Current Part</Text>
              </TouchableOpacity>

              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {savedParts.length === 0 && (
                  <Text style={styles.partsEmptyTxt}>No saved parts yet -- carve something and tap Save.</Text>
                )}
                {savedParts.map(part => {
                  const partMat = MATERIALS.find(m => m.id === part.matId) || MATERIALS[0];
                  return (
                    <View key={part.id} style={styles.partRow}>
                      <TouchableOpacity style={styles.partRowMain} onPress={() => loadPart(part)}>
                        <View style={[styles.swatch, { backgroundColor: partMat.color, width: 16, height: 16, borderRadius: 8 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.partChipText}>{part.name}</Text>
                          <Text style={styles.partChipSub}>{partMat.label}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deletePart(part.id)} style={styles.partDeleteBtn}>
                        <Text style={styles.partDeleteTxt}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {!is3D && (
          <MagazineToggleButton
            isOpen={isMagazineOpen}
            onPress={toggleMagazine}
            tool={tool}
          />
        )}

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
  root: { flex: 1, backgroundColor: '#090910' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10, paddingHorizontal: 14,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  hRightScroll: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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

  // ── RPM stepper ──
  rpmBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#182030', borderRadius: 7,
    borderWidth: 1, borderColor: '#253050',
    paddingHorizontal: 4,
  },
  rpmBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  rpmBtnTxt: { color: '#7a9ab8', fontSize: 14, fontWeight: '700' },
  rpmVal: { color: '#e2c9a0', fontSize: 11, fontWeight: '700', minWidth: 34, textAlign: 'center' },

  // ── Accuracy control strip ──
  controlStrip: {
    height: CONTROL_STRIP_H,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
    justifyContent: 'center',
  },
  controlStripRow: {
    paddingHorizontal: 12, gap: 8, alignItems: 'center',
  },
  ctrlBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 7, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#253050',
  },
  ctrlBtnDisabled: { opacity: 0.35 },
  ctrlTxt: { color: '#7a9ab8', fontSize: 11, fontWeight: '600' },
  statChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 7, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#1e2a3c',
    alignItems: 'center', minWidth: 54,
  },
  statLabel2: { fontSize: 7, color: '#4a6080', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  statVal2: { fontSize: 11, color: '#7a9ab8', fontWeight: '700', marginTop: 1 },

  // ── Catch flash / diameter callipers ──
  catchFlash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,0,40,0.16)',
  },
  hoverBadge: {
    position: 'absolute', top: 8, alignSelf: 'center',
    backgroundColor: 'rgba(9,9,16,0.82)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#253050',
  },
  hoverBadgeText: { fontSize: 11, color: '#e2c9a0', fontWeight: '700' },
  hoverBadgeTextWarn: { color: '#ff6b6b' },

  // ── Saved parts modal (persisted via AsyncStorage) ──
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 420, maxHeight: '75%',
    backgroundColor: '#0d1220', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#253050',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#e2c9a0' },
  modalCloseBtn: { padding: 4 },
  modalCloseTxt: { color: '#7a9ab8', fontSize: 16, fontWeight: '600' },
  modalSaveBtn: {
    margin: 14, marginBottom: 8,
    paddingVertical: 10, borderRadius: 9,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1.5, borderColor: '#3b82f6',
    alignItems: 'center',
  },
  modalSaveTxt: { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
  modalList: { paddingHorizontal: 14 },
  modalListContent: { paddingBottom: 14, gap: 8 },
  partsEmptyTxt: { color: '#4a6080', fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  partRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#253050',
  },
  partRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  partChipText: { color: '#e2c9a0', fontSize: 13, fontWeight: '700' },
  partChipSub: { color: '#4a6080', fontSize: 10, fontWeight: '600', marginTop: 1 },
  partDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  partDeleteTxt: { color: '#4a6080', fontSize: 16, fontWeight: '700' },

  body: { flex: 1, overflow: 'hidden' },

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