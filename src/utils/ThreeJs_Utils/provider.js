import React, { Suspense, useMemo, useEffect, useState, useCallback, useRef, createContext, useContext, memo } from 'react';
import {
  View, TouchableOpacity, Text, useWindowDimensions, StyleSheet, Animated,
  Platform, ScrollView, Alert, BackHandler, Image,
} from 'react-native';
import { Canvas, useThree, useFrame } from '@react-three/fiber/native';
import {
  PerspectiveCamera, OrthographicCamera, Vector3, DataTexture, RGBAFormat, LinearFilter, MathUtils,
  Raycaster, Vector2, Color, TextureLoader, RepeatWrapping, BufferAttribute,
} from 'three';
import useControls from 'r3f-native-orbitcontrols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tts from 'react-native-tts';
import Slider from './slider.js';
import { usePortal, usePortalKey } from '../../utils/ThreeJs_Utils/portal';
import { Textures, useTextureLoader } from '../materials/textures.js';
import bg1 from '../../assets/images/bg/nature.jpg';
import bg2 from '../../assets/images/bg/gradient.jpg';

// ─── Context for 3D scene state ────────────────────────────────────────────
const SceneContext = createContext();
export const useScene = () => useContext(SceneContext);
const canvasBackgrounds = [
  '#FFFFFF', '#E5E7EB', '#D6EAF8', '#D5F5E3', '#FDEBD0',
  '#374151', '#2F3E46', '#2C3E50', '#3E3E3E', '#1F2937',
];
const BG_IMAGES = [
  { id: 'nature', source: bg1, label: 'Nature' },
  { id: 'gradient', source: bg2, label: 'Gradient' },
];

const TAP_MOVE_THRESHOLD = 10;
const TAP_TIME_THRESHOLD = 300;

// ─── Tap overlay — blended toward this color at this alpha, same math as
// laying rgba(0,0,0,0.2) on top: result = base*(1-alpha) + overlay*alpha.
const TAP_OVERLAY_COLOR = new Color('#ff0000');
const TAP_OVERLAY_ALPHA = 0.4;
const TAP_HIDE_OPACITY = 0.08;

// ─── ISO preset — angle (degrees) applied to all three rotation axes when
// the ISO button is pressed on the live-control dock's Rotate tab.
const ISO_ANGLE = 45;



// ─── generateBoxUV — cheap, seam-tolerant UV generator for CAD/CSG
// geometry that has no authored UVs. Procedurally-built or boolean-cut
// parts (drilled holes, extrusions, machine-element assemblies) almost
// never come with UVs unless something explicitly unwrapped them — and
// without a `uv` attribute, `mat.map` is assigned but can't be sampled
// per-pixel, so only `mat.color` (a flat multiply) is visible. This is a
// one-shot box projection: for each vertex, project onto whichever of
// XY/XZ/YZ its normal is most aligned with, scaled into 0..1 by the
// mesh's own bounding box on those two axes. It's not seamless across
// curved/rounded surfaces (same trade every CAD "material preview" panel
// makes), but it's enough to make a tiled material read correctly on
// boxy parts instead of rendering as a flat color swatch.
function generateBoxUV(geometry) {
  if (!geometry?.attributes?.position) return;
  geometry.computeBoundingBox();
  if (!geometry.attributes.normal) geometry.computeVertexNormals();

  const bbox = geometry.boundingBox;
  const size = new Vector3();
  bbox.getSize(size);

  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));
    const px = pos.getX(i) - bbox.min.x;
    const py = pos.getY(i) - bbox.min.y;
    const pz = pos.getZ(i) - bbox.min.z;

    let u, v;
    if (nx >= ny && nx >= nz) {
      // facing along X — project onto YZ
      u = py / (size.y || 1);
      v = pz / (size.z || 1);
    } else if (ny >= nx && ny >= nz) {
      // facing along Y — project onto XZ
      u = px / (size.x || 1);
      v = pz / (size.z || 1);
    } else {
      // facing along Z — project onto XY
      u = px / (size.x || 1);
      v = py / (size.y || 1);
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.attributes.uv.needsUpdate = true;
}

// ─── resolveMappedPart — walks up from the hit object looking for a node
// whose `.name` exists as a key in `partsMap`. This NEVER falls back to a
// raw exporter name (mesh_0_instance_0, Cube1, etc) — if nothing in the
// chain matches something registered in `parts`, it returns null and the
// tap is treated as a miss (still highlighted, just not reported).
function resolveMappedPart(object, partsMap) {
  let node = object;
  while (node) {
    if (node.name && partsMap.has(node.name)) {
      return partsMap.get(node.name);
    }
    node = node.parent;
  }
  return null;
}



// ─── Canvas helper components ──────────────────────────────────────────────
const PIXEL_FONT = {
  X: [
    [1,1,0,0,0,1,1],
    [0,1,1,0,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
    [0,0,1,1,1,0,0],
    [0,1,1,0,1,1,0],
    [1,1,0,0,0,1,1],
  ],
  Y: [
    [1,1,0,0,0,1,1],
    [0,1,1,0,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
  ],
  Z: [
    [1,1,1,1,1,1,1],
    [0,0,0,0,1,1,0],
    [0,0,0,1,1,0,0],
    [0,0,1,1,0,0,0],
    [0,1,1,0,0,0,0],
    [1,1,0,0,0,0,0],
    [1,1,1,1,1,1,1],
  ],
};

export function makeLetterTexture(letter, hexColor) {
  const grid = PIXEL_FONT[letter];
  const GRID_H = grid.length;
  const GRID_W = grid[0].length;
  const SCALE = 12;
  const PAD = SCALE;
  const TEX_W = GRID_W * SCALE + PAD * 2;
  const TEX_H = GRID_H * SCALE + PAD * 2;
  const data = new Uint8Array(TEX_W * TEX_H * 4);

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const HALF = SCALE / 2;
  const SIGMA = SCALE * 0.40;

  for (let row = 0; row < GRID_H; row++) {
    for (let col = 0; col < GRID_W; col++) {
      if (!grid[row][col]) continue;
      const cx = PAD + col * SCALE + HALF;
      const cy = PAD + row * SCALE + HALF;
      const spread = Math.ceil(SIGMA * 2.5);
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          const pxF = Math.round(px);
          const pyF = TEX_H - 1 - Math.round(py);
          if (pxF < 0 || pxF >= TEX_W || pyF < 0 || pyF >= TEX_H) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
          const alpha = Math.round(weight * 255);
          const i = (pyF * TEX_W + pxF) * 4;
          const prev = data[i + 3];
          const next = Math.min(255, prev + alpha);
          if (next > prev) {
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = next;
          }
        }
      }
    }
  }

  const tex = new DataTexture(data, TEX_W, TEX_H, RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.flipY = false;
  return tex;
}

const AxisLabel = memo(({ text, position, color }) => {
  const texture = useMemo(() => makeLetterTexture(text, color), [text, color]);
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);
  return (
    <sprite position={position} scale={[1, 1, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} alphaTest={0.05} sizeAttenuation />
    </sprite>
  );
});

export const AxisLabels = memo(({ size = 5 }) => {
  return (
    <>
      <axesHelper args={[size]} />
      <AxisLabel text="X" position={[size + 2.5, 0, 0]} color="#ff3333" />
      <AxisLabel text="Y" position={[0, size + 2.5, 0]} color="#33cc33" />
      <AxisLabel text="Z" position={[0, 0, size + 2.5]} color="#3388ff" />
    </>
  );
});

// `brightness` is a multiplier on every light's base intensity, defaulting
// to 1 — i.e. every existing call site (`<Lightings />` with no props)
// renders identically to before. Only the new live-control dock's Light
// slider passes a non-1 value.
export const Lightings = memo(({ brightness = 1 }) => (
  <>
    <ambientLight intensity={0.5 * brightness} />
    <directionalLight position={[10, 10, 10]} intensity={15 * brightness} castShadow />
    <directionalLight position={[-10, 5, -10]} intensity={8 * brightness} />
    <directionalLight position={[0, -10, 0]} intensity={3 * brightness} />
    <pointLight position={[0, 20, 0]} intensity={2 * brightness} />
  </>
));

export const CanvaOnCreated = (state) => {
  state.gl.localClippingEnabled = true;
  const gl = state.gl.getContext();
  const original = gl.pixelStorei.bind(gl);

  // EXGL doesn't implement these unpack flags — swallow them silently
  // instead of letting them fall through to the real (warning-logging) impl.
  const UNSUPPORTED_PNAMES = new Set([
    gl.UNPACK_FLIP_Y_WEBGL,
    gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
  ]);

  gl.pixelStorei = (...args) => {
    if (UNSUPPORTED_PNAMES.has(args[0])) return;
    return original(...args);
  };
};

export const Fallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>Sorry, WebGL not supported</Text>
  </View>
);

// ─── RaycastBridge — lives inside <Canvas> purely to hand the live
// camera/scene refs out to the parent component so the tap gesture (which
// fires outside the Canvas, in RN-land) can run a Raycaster against them.
// Renders nothing, costs nothing per frame.
function RaycastBridge({ bridgeRef }) {
  const { camera, scene } = useThree();

  useEffect(() => {
    bridgeRef.current.camera = camera;
    bridgeRef.current.scene = scene;
  }, [camera, scene, bridgeRef]);

  return null;
}

// ─── TextureLibrary — lives inside <Canvas> and loads every swatch in
// `Textures` once per CanvaProvider instance, handing the ready THREE.
// Texture objects out through the same bridgeRef pattern RaycastBridge
// uses (camera/scene). Applying a material to a tapped mesh (see
// applyMaterialToMesh in CanvaProvider) is then a plain, synchronous,
// outside-of-Canvas mutation — exactly like the existing tap-highlight and
// tap-to-hide features already do.
//
// This now loads each swatch through the shared `useTextureLoader` hook
// from textures.js (so loading options — anisotropy, mipmaps, wrap mode —
// stay defined in one place) instead of a raw `new TextureLoader()` call.
// `useTextureLoader` is Suspense-based (`useLoader` under the hood), which
// throws the raw error on failure — with nothing else in place that would
// take the *entire* swatch set down together: one typo'd path or missing
// asset file would leave every swatch permanently stuck, which looks
// exactly like "material picker isn't clickable". To keep the same
// fault-isolation the old imperative loader had, each swatch gets its own
// <Suspense> + error boundary pair below (TextureSwatchLoader /
// SwatchErrorBoundary) — one bad asset only takes out that one swatch.
function TextureSwatchLoader({ def, bridgeRef, onSettle }) {
  // repeat: [1, 1] — useTextureLoader defaults to [4, 2], which the old
  // manual loader never applied. Keep repeat neutral so swapping loaders
  // doesn't silently change how any material tiles.
  const texture = useTextureLoader({ type: def.name, repeat: [1, 1] });

  const settledRef = useRef(false);
  useEffect(() => {
    if (!texture || settledRef.current) return;
    settledRef.current = true;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    bridgeRef.current.textures = { ...(bridgeRef.current.textures || {}), [def.name]: texture };
    onSettle();
  }, [texture, def.name, bridgeRef, onSettle]);

  return null;
}

class SwatchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { errored: false };
  }

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(err) {
    // Log and move on — a missing/broken texture file shouldn't take the
    // rest of the material picker down with it.
    this.props.onSettle();
  }

  render() {
    if (this.state.errored) return null;
    return this.props.children;
  }
}

function TextureLibrary({ bridgeRef, onReady }) {
  const remaining = useRef(Textures.length);
  const firedRef = useRef(false);

  const handleSettle = useCallback(() => {
    remaining.current -= 1;
    if (remaining.current <= 0 && !firedRef.current) {
      firedRef.current = true;
      onReady?.();
    }
  }, [onReady, bridgeRef]);

  useEffect(() => {
    if (Textures.length === 0) {
      bridgeRef.current.textures = {};
      onReady?.();
    }
    // Only needs to run once — Textures is a module-level constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (Textures.length === 0) return null;

  return (
    <>
      {Textures.map((t) => (
        <SwatchErrorBoundary key={t.name} name={t.name} onSettle={handleSettle}>
          <Suspense fallback={null}>
            <TextureSwatchLoader def={t} bridgeRef={bridgeRef} onSettle={handleSettle} />
          </Suspense>
        </SwatchErrorBoundary>
      ))}
    </>
  );
}

// ─── useGestureBridge ──────────────────────────────────────────────────────
export function useGestureBridge() {
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const pinchScale = useSharedValue(1);
  const pinchActive = useSharedValue(false);
  const lastTranslation = useRef({ x: 0, y: 0 });

  const onPanChange = useCallback((e) => {
    'worklet';
    const nextX = e.translationX ?? 0;
    const nextY = e.translationY ?? 0;
    const dx = nextX - lastTranslation.current.x;
    const dy = nextY - lastTranslation.current.y;
    lastTranslation.current = { x: nextX, y: nextY };
    vx.value += dx;
    vy.value += dy;
  }, [vx, vy]);

  const onPanEnd = useCallback(() => {
    'worklet';
    lastTranslation.current = { x: 0, y: 0 };
  }, []);

  const onPinchStart = useCallback(() => {
    'worklet';
    pinchScale.value = 1;
    pinchActive.value = true;
  }, [pinchScale, pinchActive]);

  const onPinchChange = useCallback((e) => {
    'worklet';
    pinchScale.value = e.scale;
  }, [pinchScale]);

  const onPinchEnd = useCallback(() => {
    'worklet';
    pinchActive.value = false;
  }, [pinchActive]);

  return {
    vx, vy, pinchScale, pinchActive,
    onPanChange, onPanEnd,
    onPinchStart, onPinchChange, onPinchEnd,
  };
}

// ─── OrbitGestureProvider ──────────────────────────────────────────────────
// `onTap` is always wired in (independent of `enabled`) so tap-to-pick works
// whether the scene is being orbited via the custom pan/pinch bridge, via
// drei's OrbitControls (whose own touch handlers live outside this tree),
// or via the live-control slider dock — the Tap recognizer's
// maxDistance/maxDuration make it fail out fast on any real drag, so it
// never competes with any orbit path.
export function OrbitGestureProvider({
  children,
  enabled = true,
  onPanChange,
  onPanEnd,
  onPinchStart,
  onPinchChange,
  onPinchEnd,
  onTap,
}) {
  const composed = useMemo(() => {
    const gestures = [];

    if (onTap) {
      const tap = Gesture.Tap()
        .maxDuration(TAP_TIME_THRESHOLD)
        .maxDistance(TAP_MOVE_THRESHOLD)
        .onEnd((e, success) => {
          'worklet';
          if (success) runOnJS(onTap)(e.x, e.y);
        });
      gestures.push(tap);
    }

    if (enabled) {
      const pan = Gesture.Pan()
        .onChange(onPanChange)
        .onEnd(onPanEnd);
      const pinch = Gesture.Pinch()
        .onStart(onPinchStart)
        .onChange(onPinchChange)
        .onEnd(onPinchEnd);
      gestures.push(pan, pinch);
    }

    if (gestures.length === 0) return null;
    return gestures.length === 1 ? gestures[0] : Gesture.Simultaneous(...gestures);
  }, [enabled, onPanChange, onPanEnd, onPinchStart, onPinchChange, onPinchEnd, onTap]);

  if (!composed) return <>{children}</>;

  return (
    <GestureDetector gesture={composed}>
      <AnimatedReanimated.View style={{ flex: 1 }}>
        {children}
      </AnimatedReanimated.View>
    </GestureDetector>
  );
}

// ─── CameraOrbitController ──────────────────────────────────────────────────
export function CameraOrbitController({ vx, vy, pinchScale, pinchActive, enabled, orthographic, onZoomChange }) {
  const { camera } = useThree();
  const spherical = useRef(null);
  const lastPinchScale = useRef(1);
  const lastPinchActiveFlag = useRef(false);
  const lastZoomEmit = useRef(0);

  useEffect(() => {
    const radius = camera.position.length() || 1;
    spherical.current = {
      theta: Math.atan2(camera.position.x, camera.position.z),
      phi: Math.acos(MathUtils.clamp(camera.position.y / radius, -1, 1)),
      radius,
    };
    lastPinchScale.current = 1;
    lastPinchActiveFlag.current = false;
  }, [camera]);

  useFrame(() => {
    if (!enabled || !spherical.current) return;
    let dirty = false;

    if (pinchScale && pinchActive) {
      const active = pinchActive.value;
      const justStarted = active && !lastPinchActiveFlag.current;
      lastPinchActiveFlag.current = active;

      if (justStarted) {
        lastPinchScale.current = pinchScale.value;
      } else if (active) {
        const currentScale = pinchScale.value;
        if (currentScale !== lastPinchScale.current) {
          const deltaRatio = currentScale / lastPinchScale.current;
          lastPinchScale.current = currentScale;

          if (orthographic) {
            const newZoom = camera.zoom * deltaRatio;
            camera.zoom = newZoom;
            camera.updateProjectionMatrix();
            emitZoom(newZoom);
          } else {
            spherical.current.radius = spherical.current.radius / deltaRatio;
            dirty = true;
          }
        }
      }
    }

    if (vx && vy) {
      const dx = vx.value;
      const dy = vy.value;
      if (Math.abs(dx) >= 0.01 || Math.abs(dy) >= 0.01) {
        const ROTATE_SPEED = 0.006;
        spherical.current.theta -= dx * ROTATE_SPEED;
        spherical.current.phi = MathUtils.clamp(
          spherical.current.phi - dy * ROTATE_SPEED,
          0.05,
          Math.PI - 0.05
        );
        vx.value *= 0.85;
        vy.value *= 0.85;
        dirty = true;
      }
    }

    if (dirty) {
      const { theta, phi, radius } = spherical.current;
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(0, 0, 0);

      if (!orthographic) {
        const defaultRadius = 100;
        emitZoom(MathUtils.clamp(defaultRadius / radius, 0.1, 5.0));
      }
    }

    function emitZoom(value) {
      const now = Date.now();
      if (onZoomChange && now - lastZoomEmit.current > 100) {
        lastZoomEmit.current = now;
        onZoomChange(value);
      }
    }
  });

  return null;
}

// Rotation/pan slider math previously lived in a SliderCameraRig component
// mounted inside <Canvas> via useFrame — that ran every single frame and
// unconditionally overwrote camera.position, which silently defeated any
// gesture-driven orbit happening the same frame. It's been replaced by
// applySliderCamera (see CanvaProvider) — a plain function using cameraRef
// directly, fired only when a slider value actually changes (the same
// one-shot pattern changePlane/handleZoomIn/Out already use), so it never
// competes with the frame loop.

// ─── Professional View Presets ─────────────────────────────────────────────
const VIEW_PRESETS = [
  { id: 'front',  label: 'Front',  icon: '◤',  pos: [0, 0, 100] },
  { id: 'back',   label: 'Back',   icon: '◥',  pos: [0, 0, -100] },
  { id: 'right',  label: 'Right',  icon: '▶',  pos: [100, 0, 0] },
  { id: 'left',   label: 'Left',   icon: '◀',  pos: [-100, 0, 0] },
  { id: 'top',    label: 'Top',    icon: '▲',  pos: [0, 100, 0] },
  { id: 'bottom', label: 'Bottom', icon: '▼',  pos: [0, -100, 0] },
  { id: 'iso',    label: 'Iso',    icon: '◈',  pos: [70, 70, 70] },
];

// ─── Zoom Controller ──────────────────────────────────────────────────────
const ZoomController = memo(({ onZoomIn, onZoomOut, zoomLevel, onReset, onZoomSet }) => {
  return (
    <View style={S.zoomContainer}>
      <View style={S.zoomHeader}>
        <Text style={S.zoomLabel}>Zoom</Text>
        <Text style={S.zoomLevel}>{Math.round(zoomLevel * 100)}%</Text>
      </View>
      <View style={S.zoomControls}>
        <TouchableOpacity style={S.zoomBtn} onPress={onZoomOut} activeOpacity={0.7}>
          <Text style={S.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.zoomResetBtn} onPress={onReset} activeOpacity={0.7}>
          <Text style={S.zoomResetText}>⟲</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.zoomBtn} onPress={onZoomIn} activeOpacity={0.7}>
          <Text style={S.zoomBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Slider
        horizontal
        value={zoomLevel}
        onValueChange={onZoomSet}
        minimumValue={0.1}
        maximumValue={5}
        step={0.05}
        length={220}
        formatLabel={(v) => `${Math.round(v * 100)}%`}
        {...SLIDER_TOKENS}
      />
    </View>
  );
});

// ─── FAB Components ──────────────────────────────────────────────────────
const ProFAB = memo(({ onPress, isOpen, bottomOffset = 0 }) => {
  return (
    <View style={[S.fabContainer, bottomOffset ? { bottom: 24 + bottomOffset } : null]}>
      <TouchableOpacity
        style={[S.fab, isOpen && S.fabActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={S.fabIcon}>{isOpen ? '✕' : '⚙'}</Text>
        <Text style={S.fabLabel}>{isOpen ? 'Close' : 'Tools'}</Text>
      </TouchableOpacity>
    </View>
  );
});

const ProToggleItem = memo(({ icon, label, value, onChange }) => {
  const thumbX = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120
    }).start();
  }, [value, thumbX]);

  const translateX = thumbX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18]
  });

  return (
    <TouchableOpacity style={S.toggleItem} onPress={onChange} activeOpacity={0.7}>
      <View style={S.toggleItemLeft}>
        <Text style={S.toggleItemIcon}>{icon}</Text>
        <Text style={S.toggleItemLabel}>{label}</Text>
      </View>
      <View style={[S.toggleItemTrack, value && { backgroundColor: ACCENT }]}>
        <Animated.View style={[S.toggleItemThumb, { transform: [{ translateX }] }]} />
      </View>
    </TouchableOpacity>
  );
});

const ProStepper = memo(({ icon, label, value, min, max, step, onChange }) => {
  return (
    <View style={S.stepperGroup}>
      <View style={S.stepperLabel}>
        <Text style={S.stepperIcon}>{icon}</Text>
        <Text style={S.stepperTitle}>{label}</Text>
      </View>
      <View style={S.stepperControls}>
        <TouchableOpacity
          style={S.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}
          activeOpacity={0.6}
        >
          <Text style={S.stepBtnTxt}>−</Text>
        </TouchableOpacity>
        <Text style={S.stepValue}>{value}</Text>
        <TouchableOpacity
          style={S.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}
          activeOpacity={0.6}
        >
          <Text style={S.stepBtnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const InfoRow = memo(({ label, value }) => {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoValue}>{value}</Text>
    </View>
  );
});

// ─── Auto Rotate control — toggle + inline axis radio group + speed slider.
// Row 1: "Auto Rotate" label | toggle switch | boxed radio group (X/Y/Z/XYZ).
// Row 2 (only while enabled): a slider controlling rotation speed.
const AUTO_ROTATE_AXES = ['X', 'Y', 'Z', 'XYZ'];

const AutoRotateControl = memo(({
  icon = '⟳',
  label = 'Auto Rotate',
  enabled,
  onToggle,
  axis,
  onAxisChange,
  speed,
  onSpeedChange,
}) => {
  const thumbX = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [enabled, thumbX]);

  const translateX = thumbX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  return (
    <View style={S.autoRotateGroup}>
      <View style={S.autoRotateRow}>
        <View style={S.toggleItemLeft}>
          <Text style={S.toggleItemIcon}>{icon}</Text>
          <Text style={S.toggleItemLabel}>{label}</Text>
        </View>

        <View style={S.autoRotateRight}>
          <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
            <View style={[S.toggleItemTrack, enabled && { backgroundColor: ACCENT }]}>
              <Animated.View style={[S.toggleItemThumb, { transform: [{ translateX }] }]} />
            </View>
          </TouchableOpacity>

          <View style={[S.axisRadioBox, !enabled && S.axisRadioBoxDisabled]}>
            {AUTO_ROTATE_AXES.map((a) => {
              const active = enabled && axis === a;
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => enabled && onAxisChange(a)}
                  disabled={!enabled}
                  style={S.axisRadioItem}
                  activeOpacity={0.7}
                >
                  <View style={[S.axisRadioDot, active && S.axisRadioDotActive]}>
                    {active && <View style={S.axisRadioDotInner} />}
                  </View>
                  <Text style={[S.axisRadioLabel, active && S.axisRadioLabelActive]}>{a}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {enabled && (
        <View style={S.autoRotateSpeedRow}>
          <Text style={S.autoRotateSpeedLabel}>Speed</Text>
          <Slider
            horizontal
            value={speed}
            onValueChange={onSpeedChange}
            minimumValue={0.1}
            maximumValue={3}
            step={0.05}
            length={180}
            formatLabel={(v) => `${v.toFixed(1)}x`}
            {...SLIDER_TOKENS}
          />
        </View>
      )}
    </View>
  );
});

// ─── Background mode switch — Color vs Image ──────────────────────────────
const BgModeSegmented = memo(({ value, onChange }) => (
  <View style={S.segmented}>
    {['Color', 'Image'].map((o) => (
      <TouchableOpacity
        key={o}
        onPress={() => onChange(o)}
        style={[S.segment, value === o && S.segmentActive]}
        activeOpacity={0.8}
      >
        <Text style={[S.segmentText, value === o && S.segmentTextActive]}>{o}</Text>
      </TouchableOpacity>
    ))}
  </View>
));

// ─── Backdrop — fades in/out with `visible` instead of appearing/
// disappearing instantly, matching the panel's own slide timing closely
// enough that both feel like one motion. Stays mounted permanently in the
// portal (see CanvaProvider) so this animation always has time to play,
// including on close.
const Backdrop = memo(({ visible, onPress }) => {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      style={[S.backdrop, { opacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onPress}
      />
    </Animated.View>
  );
});

// ─── Advanced Vertical Panel ──────────────────────────────────────────────
const AdvancedVerticalPanel = memo(({
  visible,
  panelWidth,
  activeView,
  onViewChange,
  customGesture,
  onToggleGesture,
  showGrid,
  onShowGrid,
  gridSize,
  onGridSizeChange,
  axesVisible,
  onToggleAxes,
  camPos,
  onClose,
  renderMode,
  onRenderModeChange,
  wireframe,
  onToggleWireframe,
  shadows,
  onToggleShadows,
  autoRotate,
  onToggleAutoRotate,
  autoRotateAxis,
  onAutoRotateAxisChange,
  autoRotateSpeed,
  onAutoRotateSpeedChange,
  orthographic,
  onToggleOrthographic,
  liveControlsEnabled,
  onToggleLiveControls,
  tapToHideEnabled,
  onToggleTapToHide,
  selectedPartLabel,
  selectedTextureName,
  onApplyTexture,
  textureLibraryReady,
  measurements,
  onToggleMeasurements,
  snapToGrid,
  onToggleSnapGrid,
  backgroundColor,
  onBackgroundColorChange,
  bgMode,
  onBgModeChange,
  bgImageId,
  onBgImageChange,
  transparency,
  onToggleTransparency,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomSet,
  onScreenshot,
  onResetToDefault,
  onClearMeasurements,
  onMeasureToolPress,
}) => {
  const [activeTab, setActiveTab] = useState('view');
  const translateX = useRef(new Animated.Value(panelWidth)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : panelWidth,
      useNativeDriver: true,
      friction: 20,
      tension: 150,
    }).start();
  }, [visible, panelWidth, translateX]);

  const TABS = useMemo(() => [
    { id: 'view', label: 'View', icon: '◈' },
    { id: 'display', label: 'Display', icon: '◐' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'info', label: 'Info', icon: 'ⓘ' },
  ], []);

  return (
    <Animated.View
      style={[
        S.verticalPanel,
        {
          width: panelWidth,
          transform: [{ translateX }],
        }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={S.panelHeader}>
        <Text style={S.panelTitle}>3D Controls</Text>
        <TouchableOpacity style={S.panelClose} onPress={onClose} activeOpacity={0.7}>
          <Text style={S.panelCloseTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={S.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[S.tab, activeTab === tab.id && S.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[S.tabIcon, activeTab === tab.id && { color: ACCENT }]}>
              {tab.icon}
            </Text>
            <Text style={[S.tabLabel, activeTab === tab.id && { color: ACCENT }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={S.panelScroll}
        contentContainerStyle={S.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'view' && (
          <>
            <View style={S.viewPresetsGrid}>
              {VIEW_PRESETS.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[S.viewPresetBtn, activeView === v.id && S.viewPresetActive]}
                  onPress={() => onViewChange(v.pos, v.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[S.viewPresetIcon, activeView === v.id && { color: ACCENT }]}>
                    {v.icon}
                  </Text>
                  <Text style={[S.viewPresetLabel, activeView === v.id && { color: ACCENT }]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={S.panelDivider} />

            <View style={S.section}>
              <Text style={S.sectionTitle}>Camera Settings</Text>
              <ProToggleItem
                icon="◧"
                label="Orthographic"
                value={orthographic}
                onChange={onToggleOrthographic}
              />
              <AutoRotateControl
                icon="⟳"
                label="Auto Rotate"
                enabled={autoRotate}
                onToggle={onToggleAutoRotate}
                axis={autoRotateAxis}
                onAxisChange={onAutoRotateAxisChange}
                speed={autoRotateSpeed}
                onSpeedChange={onAutoRotateSpeedChange}
              />
              <ProToggleItem
                icon="🎚"
                label="Live Slider Controls"
                value={liveControlsEnabled}
                onChange={onToggleLiveControls}
              />
              <ProToggleItem
                icon="👁"
                label="Tap to Hide/Show Part"
                value={tapToHideEnabled}
                onChange={onToggleTapToHide}
              />
            </View>
          </>
        )}

        {activeTab === 'display' && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Rendering</Text>

            <View style={S.renderModeGroup}>
              <Text style={S.renderModeLabel}>Render Mode</Text>
              <View style={S.renderModeOptions}>
                {['Solid', 'Shaded', 'Wireframe', 'X-Ray'].map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[S.renderModeBtn, renderMode === mode && S.renderModeActive]}
                    onPress={() => onRenderModeChange(mode)}
                  >
                    <Text style={[S.renderModeText, renderMode === mode && { color: ACCENT }]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={S.panelDivider} />

            <ProToggleItem
              icon="◐"
              label="Wireframe Overlay"
              value={wireframe}
              onChange={onToggleWireframe}
            />
            <ProToggleItem
              icon="☀"
              label="Shadows"
              value={shadows}
              onChange={onToggleShadows}
            />
            <ProToggleItem
              icon="▣"
              label="Transparency"
              value={transparency}
              onChange={onToggleTransparency}
            />

            <View style={S.panelDivider} />

            <View style={S.colorPickerGroup}>
              <Text style={S.colorPickerLabel}>Background</Text>
              <BgModeSegmented value={bgMode} onChange={onBgModeChange} />

              {bgMode === 'Color' ? (
                   <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[S.colorOptions, { marginTop: 10 }]}   >
                  {canvasBackgrounds.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        S.colorOption,
                        { backgroundColor: color },
                        backgroundColor === color && S.colorOptionActive
                      ]}
                      onPress={() => onBackgroundColorChange(color)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={S.imageRow}
                >
                  {BG_IMAGES.map(img => (
                    <TouchableOpacity
                      key={img.id}
                      onPress={() => onBgImageChange(img.id)}
                      activeOpacity={0.8}
                      style={[S.imageThumbWrap, bgImageId === img.id && S.imageThumbActive]}
                    >
                      <Image source={img.source} style={S.imageThumb} resizeMode="cover" />
                      <Text style={S.imageThumbLabel} numberOfLines={1}>
                        {img.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={S.panelDivider} />

            <View style={S.colorPickerGroup}>
              <Text style={S.colorPickerLabel}>
                Part Material{selectedPartLabel ? ` — ${selectedPartLabel}` : ' — Whole Model'}
              </Text>
              <Text style={S.materialHint}>
                {selectedPartLabel
                  ? 'Applies to the selected part only'
                  : 'No part selected — applies to the whole model. Tap a part first to target just that part.'}
              </Text>
              {!textureLibraryReady && (
                <Text style={S.materialHint}>Loading materials… (color/finish still apply now)</Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[S.imageRow, { marginTop: 10 }]}
              >
                {Textures.map((t) => (
                  <TouchableOpacity
                    key={t.name}
                    onPress={() => onApplyTexture(t.name)}
                    activeOpacity={0.8}
                    style={[
                      S.imageThumbWrap,
                      selectedTextureName === t.name && S.imageThumbActive,
                    ]}
                  >
                    <Image source={t.image} style={S.imageThumb} resizeMode="cover" />
                    <Text style={S.imageThumbLabel} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={S.panelDivider} />

            <ProToggleItem
              icon="✦"
              label="Grid"
              value={showGrid}
              onChange={onShowGrid}
            />
            <ProToggleItem
              icon="✎"
              label="Axis Labels"
              value={axesVisible}
              onChange={onToggleAxes}
            />
            <ProToggleItem
              icon="✋"
              label="Custom Gesture"
              value={customGesture}
              onChange={onToggleGesture}
            />

            <View style={S.panelDivider} />
            <ZoomController
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              zoomLevel={zoomLevel}
              onReset={onZoomReset}
              onZoomSet={onZoomSet}
            />
          </View>
        )}

        {activeTab === 'tools' && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Measurement Tools</Text>

            <ProToggleItem
              icon="📐"
              label="Measurements"
              value={measurements}
              onChange={onToggleMeasurements}
            />

            <View style={S.measurementControls}>
              <TouchableOpacity style={S.measureBtn} onPress={() => onMeasureToolPress('Distance')}>
                <Text style={S.measureBtnText}>📏 Distance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.measureBtn} onPress={() => onMeasureToolPress('Angle')}>
                <Text style={S.measureBtnText}>📐 Angle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.measureBtn} onPress={() => onMeasureToolPress('Volume')}>
                <Text style={S.measureBtnText}>📦 Volume</Text>
              </TouchableOpacity>
            </View>

            <View style={S.panelDivider} />

            <Text style={S.sectionTitle}>Grid Settings</Text>

            <ProStepper
              icon="↔"
              label="Grid Size"
              value={gridSize}
              min={20}
              max={200}
              step={20}
              onChange={onGridSizeChange}
            />

            <ProToggleItem
              icon="▦"
              label="Snap to Grid"
              value={snapToGrid}
              onChange={onToggleSnapGrid}
            />

            <View style={S.panelDivider} />

            <TouchableOpacity style={S.actionBtn} onPress={onScreenshot}>
              <Text style={S.actionBtnText}>📸 Capture Screenshot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actionBtn} onPress={onResetToDefault}>
              <Text style={S.actionBtnText}>🔄 Reset to Default</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.actionBtn, S.actionBtnDanger]} onPress={onClearMeasurements}>
              <Text style={[S.actionBtnText, { color: '#ff3b30' }]}>🗑 Clear Measurements</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'info' && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Scene Information</Text>

            <InfoRow label="Camera Position" value={`X ${camPos[0].toFixed(1)}  Y ${camPos[1].toFixed(1)}  Z ${camPos[2].toFixed(1)}`} />
            <InfoRow label="Camera Mode" value={orthographic ? 'Orthographic' : 'Perspective'} />
            <InfoRow label="Render Mode" value={renderMode} />
            <InfoRow label="Grid Size" value={`${gridSize} units`} />
            <InfoRow label="Zoom Level" value={`${Math.round(zoomLevel * 100)}%`} />
            <InfoRow label="Polygons" value="0" />
            <InfoRow label="Vertices" value="0" />
            <InfoRow label="FPS" value="60" />

            <View style={S.panelDivider} />

            <View style={S.performanceInfo}>
              <Text style={S.performanceLabel}>Performance</Text>
              <View style={S.performanceBar}>
                <View style={[S.performanceFill, { width: '75%' }]} />
              </View>
              <Text style={S.performanceText}>75% - Good</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
});

// ─── Live Control Dock ─────────────────────────────────────────────────────
// Bottom slider surface for Zoom/Rotate/Pan/Light/Background — ported from
// the pre-drawer version of this provider. Only rendered while "Live
// Slider Controls" is toggled on in the drawer's View tab. Camera control
// while this is open is fully handed to SliderCameraRig (see the gating
// around CameraOrbitController/OrbitControls/AutoRotateController/
// OrbitGestureProvider in CanvaProvider below), so this never fights the
// existing gesture-based orbit for the same camera.position.
const DOCK_TABS = [
  { id: 'view', icon: '◈', label: 'View' },
  { id: 'zoom', icon: '⤢', label: 'Zoom' },
  { id: 'rotate', icon: '↻', label: 'Rotate' },
  { id: 'pan', icon: '✥', label: 'Pan' },
  { id: 'light', icon: '☀', label: 'Light' },
  { id: 'background', icon: '🎨', label: 'BG' },
  { id: 'material', icon: '🧱', label: 'Material' },
];

const DockSegmented = memo(({ options, value, onChange }) => (
  <View style={dockS.segmented}>
    {options.map((o) => (
      <TouchableOpacity
        key={o}
        onPress={() => onChange(o)}
        style={[dockS.segment, value === o && dockS.segmentActive]}
        activeOpacity={0.8}
      >
        <Text style={[dockS.segmentText, value === o && dockS.segmentTextActive]}>{o}</Text>
      </TouchableOpacity>
    ))}
  </View>
));

const LiveControlDock = memo(({
  activeView, onViewChange,
  zoomLevel, onZoomSet,
  rotationX, onRotationXChange,
  rotationY, onRotationYChange,
  rotationZ, onRotationZChange,
  panH, onPanHChange,
  panV, onPanVChange,
  brightness, onBrightnessChange,
  bgMode, onBgModeChange,
  backgroundColor, onBackgroundColorChange,
  bgImageId, onBgImageChange,
  selectedPartLabel, selectedTextureName, onApplyTexture, textureLibraryReady,
  activeTab, onSwitchTab,
  onLayout,
  onClose,
}) => {
  const [rotAxis, setRotAxis] = useState('X');
  const [panAxis, setPanAxis] = useState('H');
  const fade = useRef(new Animated.Value(1)).current;

  const switchTab = (id) => {
    if (id === activeTab) return;
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    onSwitchTab(id);
  };

  const rotValue = { X: rotationX, Y: rotationY, Z: rotationZ }[rotAxis];
  const setRotValue = { X: onRotationXChange, Y: onRotationYChange, Z: onRotationZChange }[rotAxis];
  const panValue = panAxis === 'H' ? panH : panV;
  const setPanValue = panAxis === 'H' ? onPanHChange : onPanVChange;

  // ISO preset — snaps all three rotation axes to ISO_ANGLE at once.
  const applyIsoPreset = () => {
    onRotationXChange(ISO_ANGLE);
    onRotationYChange(ISO_ANGLE);
    onRotationZChange(ISO_ANGLE);
  };

  // Reset — zeroes all three rotation axes.
  const applyResetPreset = () => {
    onRotationXChange(0);
    onRotationYChange(0);
    onRotationZChange(0);
  };

  return (
    <View style={dockS.container} onLayout={onLayout}>
      {onClose && (
        <TouchableOpacity style={dockS.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={dockS.closeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
      <Animated.View style={[dockS.sliderArea, { opacity: fade }]}>
        {activeTab === 'view' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={dockS.viewRow}
          >
            {VIEW_PRESETS.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => onViewChange(v.pos, v.id)}
                style={[dockS.viewBtn, activeView === v.id && dockS.viewBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[dockS.viewIcon, activeView === v.id && dockS.viewIconActive]}>
                  {v.icon}
                </Text>
                <Text style={[dockS.viewLabel, activeView === v.id && dockS.viewLabelActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {activeTab === 'rotate' && (
          <>
            <View style={dockS.rotateHeader}>
              <DockSegmented options={['X', 'Y', 'Z']} value={rotAxis} onChange={setRotAxis} />
              <View style={dockS.presetGroup}>
                <TouchableOpacity onPress={applyIsoPreset} style={dockS.isoButton} activeOpacity={0.8}>
                  <Text style={dockS.isoButtonText}>ISO</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={applyResetPreset} style={dockS.resetButton} activeOpacity={0.8}>
                  <Text style={dockS.resetButtonText}>⟲</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Slider
              horizontal
              value={rotValue}
              onValueChange={setRotValue}
              minimumValue={-180}
              maximumValue={180}
              step={1}
              length={220}
              formatLabel={(v) => `${Math.round(v)}°`}
              {...SLIDER_TOKENS}
            />
          </>
        )}

        {activeTab === 'pan' && (
          <>
            <DockSegmented options={['H', 'V']} value={panAxis} onChange={setPanAxis} />
            <Slider
              horizontal
              value={panValue}
              onValueChange={setPanValue}
              minimumValue={-5}
              maximumValue={5}
              step={0.05}
              length={220}
              formatLabel={(v) => v.toFixed(1)}
              {...SLIDER_TOKENS}
            />
          </>
        )}

        {activeTab === 'zoom' && (
          <Slider
            horizontal
            value={zoomLevel}
            onValueChange={onZoomSet}
            minimumValue={0.1}
            maximumValue={5}
            step={0.05}
            length={220}
            formatLabel={(v) => `${Math.round(v * 100)}%`}
            {...SLIDER_TOKENS}
          />
        )}

        {activeTab === 'light' && (
          <Slider
            horizontal
            value={brightness}
            onValueChange={onBrightnessChange}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            length={220}
            formatLabel={(v) => `${Math.round(v * 100)}%`}
            {...LIGHT_SLIDER_TOKENS}
          />
        )}

        {activeTab === 'background' && (
          <View style={{ width: '100%' }}>
            <BgModeSegmented value={bgMode} onChange={onBgModeChange} />

            {bgMode === 'Color' ? (
              <ScrollView horizontal contentContainerStyle={dockS.swatchRow}>
                {canvasBackgrounds.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => onBackgroundColorChange(c)}
                    activeOpacity={0.8}
                    style={[
                      dockS.swatch,
                      { backgroundColor: c },
                      backgroundColor === c && dockS.swatchActive,
                    ]}
                  />
                ))}
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={dockS.imageRow}
              >
                {BG_IMAGES.map((img) => (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => onBgImageChange(img.id)}
                    activeOpacity={0.8}
                    style={[dockS.imageThumbWrap, bgImageId === img.id && dockS.imageThumbActive]}
                  >
                    <Image source={img.source} style={dockS.imageThumb} resizeMode="cover" />
                    <Text style={dockS.imageThumbLabel} numberOfLines={1}>
                      {img.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {activeTab === 'material' && (
          <View style={{ width: '100%' }}>
            <Text style={dockS.materialHint}>
              {selectedPartLabel
                ? `Selected: ${selectedPartLabel}`
                : 'No part selected — applies to whole model'}
              {!textureLibraryReady ? ' (loading…)' : ''}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={dockS.imageRow}
            >
              {Textures.map((t) => (
                <TouchableOpacity
                  key={t.name}
                  onPress={() => onApplyTexture(t.name)}
                  activeOpacity={0.8}
                  style={[
                    dockS.imageThumbWrap,
                    selectedTextureName === t.name && dockS.imageThumbActive,
                  ]}
                >
                  <Image source={t.image} style={dockS.imageThumb} resizeMode="cover" />
                  <Text style={dockS.imageThumbLabel} numberOfLines={1}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dockS.tabBar}>
        {DOCK_TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => switchTab(t.id)}
            style={[dockS.tab, activeTab === t.id && dockS.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[dockS.tabIcon, activeTab === t.id && dockS.tabIconActive]}>
              {t.icon}
            </Text>
            <Text style={[dockS.tabLabel, activeTab === t.id && dockS.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

// ─── Camera Position Tracker ──────────────────────────────────────────────
function CameraPositionTracker({ onChange, active }) {
  const { camera } = useThree();
  const last = useRef([0, 0, 0]);
  const lastUpdate = useRef(0);

  useFrame(() => {
    if (!active) return;
    const now = Date.now();
    if (now - lastUpdate.current < 150) return;
    const { x, y, z } = camera.position;
    if (last.current[0] !== x || last.current[1] !== y || last.current[2] !== z) {
      last.current = [x, y, z];
      lastUpdate.current = now;
      onChange([x, y, z]);
    }
  });

  return null;
}

// ─── Auto Rotate Controller ──────────────────────────────────────────────
// `axis` selects which axis (or axes, for 'XYZ') the camera orbits around;
// `speed` is a multiplier on the base angular rate (matches the live
// control dock's convention of 1x == the original hardcoded behavior).
const AUTO_ROTATE_BASE_RATE = 0.0005;

function AutoRotateController({ enabled, axis = 'Y', speed = 1 }) {
  const { camera } = useThree();
  const radiusRef = useRef(null);

  useEffect(() => {
    if (enabled) radiusRef.current = camera.position.length();
  }, [enabled, camera]);

  useFrame(() => {
    if (!enabled) return;
    const radius = radiusRef.current || camera.position.length();
    const angle = Date.now() * AUTO_ROTATE_BASE_RATE * speed;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    if (axis === 'Y') {
      camera.position.x = radius * sin * 0.7;
      camera.position.z = radius * cos * 0.7;
    } else if (axis === 'X') {
      camera.position.y = radius * sin * 0.7;
      camera.position.z = radius * cos * 0.7;
    } else if (axis === 'Z') {
      camera.position.x = radius * sin * 0.7;
      camera.position.y = radius * cos * 0.7;
    } else {
      // XYZ — tumbles around all three axes at once, each with a slightly
      // different phase so the motion doesn't look like a single flat orbit.
      camera.position.x = radius * Math.sin(angle) * 0.6;
      camera.position.y = radius * Math.sin(angle * 0.8 + 1.0) * 0.6;
      camera.position.z = radius * Math.cos(angle * 1.2 + 0.5) * 0.6;
    }

    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Settings Manager ──────────────────────────────────────────────────────
const SETTINGS_KEY_PREFIX = '@canvas_settings';

const defaultSettings = {
  customGesture: false,
  activeView: 'iso',
  showGrid: false,
  gridSize: 100,
  axesVisible: true,
  backgroundColor: '#1a1b1e',
  bgMode: 'Color',
  bgImageId: null,
  renderMode: 'Shaded',
  wireframe: false,
  shadows: true,
  autoRotate: false,
  autoRotateAxis: 'Y',
  autoRotateSpeed: 1,
  orthographic: false,
  measurements: false,
  snapToGrid: false,
  transparency: false,
  zoomLevel: 1.0,
};

async function saveSettings(key, settings) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
  }
}

async function loadSettings(key) {
  try {
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultSettings;
  } catch (error) {
    return defaultSettings;
  }
}

// ─── Error Boundary ──────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1b1e' }}>
          <Text style={{ color: '#ff3b30', fontSize: 16, marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ color: '#7a8299', fontSize: 12 }}>{this.state.error?.message || 'Unknown error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_CAM_POSITION = [0, 0, 100];

// ─── Main Provider ────────────────────────────────────────────────────────────
const CanvaProvider = ({
  children,
  style = { flex: 1 },
  camPosition,
  fullPreview = false,
  instanceId = 'default',
  parts = [],
  onPartPress,
}) => {
  const initialCamPosition = useRef(camPosition || DEFAULT_CAM_POSITION).current;
  const [customGesture, setCustomGesture] = useState(false);
  const [activeView, setActiveView]       = useState('iso');
  const [camPos, setCamPos]               = useState(initialCamPosition);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [showGrid, setShowGrid]           = useState(false);
  const [gridSize, setGridSize]           = useState(100);
  const [axesVisible, setAxesVisible]     = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#1a1b1e');
  const [bgMode, setBgMode]               = useState('Color');
  const [bgImageId, setBgImageId]         = useState(null);
  const bgImage = useMemo(
    () => BG_IMAGES.find(img => img.id === bgImageId)?.source || null,
    [bgImageId]
  );
  const [zoomLevel, setZoomLevel]         = useState(1.0);
  const [messages, setMessages]           = useState('drag to rotate');
  const [renderMode, setRenderMode]           = useState('Shaded');
  const [wireframe, setWireframe]             = useState(false);
  const [shadows, setShadows]                 = useState(true);
  const [autoRotate, setAutoRotate]           = useState(false);
  const [autoRotateAxis, setAutoRotateAxis]   = useState('Y');
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1);
  const [orthographic, setOrthographic]       = useState(false);
  const [measurements, setMeasurements]       = useState(false);
  const [snapToGrid, setSnapToGrid]           = useState(false);
  const [transparency, setTransparency]       = useState(false);

  // ── Live Slider Controls ────────────────────────────────────────────
  // A second, independent way to drive the camera + a couple of scene
  // settings — all by dragging sliders in a bottom dock instead of touch
  // gestures. Off by default; toggled from the drawer's View tab. While
  // on, SliderCameraRig owns camera.position every frame (see the Canvas
  // JSX below), so CameraOrbitController / drei's OrbitControls /
  // AutoRotateController are all gated off for the duration — nothing
  // fights over the same camera.
  const [liveControlsEnabled, setLiveControlsEnabled] = useState(false);
  const [dockTab, setDockTab]             = useState('zoom');
  const [sliderRotationX, setSliderRotationX] = useState(0);
  const [sliderRotationY, setSliderRotationY] = useState(0);
  const [sliderRotationZ, setSliderRotationZ] = useState(0);
  const [panH, setPanH]                   = useState(0);
  const [panV, setPanV]                   = useState(0);
  // 0.5 is the "neutral" point — see brightnessMultiplier below, where
  // 0.5 maps back to a 1x multiplier, matching the scene's default
  // lighting exactly until the user actually touches the Light slider.
  const [brightness, setBrightness]       = useState(0.5);
  const [dockHeight, setDockHeight]       = useState(0);

  const toggleLiveControls = useCallback(() => setLiveControlsEnabled(v => !v), []);

  // ── Tap to Hide/Show Part ────────────────────────────────────────────
  // A second tap mode, independent of tap-to-pick highlighting/TTS above.
  // While on, tapping a mapped part toggles that part's visibility
  // (show <-> hidden) instead of just highlighting + speaking it. Off by
  // default; toggled from the drawer's View tab, right after Live Slider
  // Controls. Not persisted to AsyncStorage — same as liveControlsEnabled,
  // it's an interaction mode rather than a saved visual setting.
  const [tapToHideEnabled, setTapToHideEnabled] = useState(false);
  const hiddenMeshesRef = useRef(new Map()); // mesh -> { opacity, transparent } (original values)

  const toggleTapToHide = useCallback(() => setTapToHideEnabled(v => !v), []);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [containerSize, setContainerSize] = useState({ width: windowWidth, height: windowHeight });

  // Ignore sub-pixel layout jitter — a drawer opening/closing (or, before
  // that fix, a Modal opening/closing) shifts safe-area/insets by a
  // fraction of a px, which used to retrigger everything below.
  const handleLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setContainerSize(prev => (
        Math.abs(prev.width - w) < 1 && Math.abs(prev.height - h) < 1 ? prev : { width: w, height: h }
      ));
    }
  }, []);

  const [OrbitControls, events] = useControls();

  const settingsKey = useMemo(() => `${SETTINGS_KEY_PREFIX}_${instanceId}`, [instanceId]);
  const settingsRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const cameraRef = useRef(null);
  const isInitialLoad = useRef(true);

  const { addPortal, removePortal } = usePortal();
  const portalKey = usePortalKey('canva-drawer');

  // ── Raycast picking plumbing ──────────────────────────────────────────
  const raycaster = useRef(new Raycaster()).current;
  const pointerNDC = useRef(new Vector2()).current;
  const bridgeRef = useRef({ camera: null, scene: null });
  const containerSizeRef = useRef(containerSize);
  useEffect(() => {
    containerSizeRef.current = containerSize;
  }, [containerSize]);

  const onPartPressRef = useRef(onPartPress);
  useEffect(() => {
    onPartPressRef.current = onPartPress;
  }, [onPartPress]);

  // ── Parts lookup — raw GLB node name -> your own { mesh, customName, details } ──
  const partsMap = useRef(new Map()).current;
  useEffect(() => {
    partsMap.clear();
    parts.forEach((p) => {
      if (p && p.mesh) partsMap.set(p.mesh, p);
    });
  }, [parts, partsMap]);

  // ── Tap-to-speak (TTS) ──────────────────────────────────────────────────
  // Speaks a part's name out loud whenever it's tapped/picked (see
  // handlePick below). Initialized once per CanvaProvider instance; any
  // in-flight utterance is stopped before starting a new one so rapid taps
  // don't queue up and talk over each other.
  useEffect(() => {
    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);
      })
      .catch(() => {
        // TTS engine not ready/available on this device — fail silently,
        // tap-to-pick and highlighting still work without it.
      });

    return () => {
      Tts.stop();
    };
  }, []);

  const speakPartName = useCallback((name) => {
    if (!name) return;
    Tts.stop();
    Tts.speak(name);
  }, []);

  // ── Selection highlight (red) state ───────────────────────────────────
  // Tracks the currently-highlighted mesh so we can restore its original
  // color before highlighting a new one (or on deselect / unmount). This
  // same "currently selected mesh" also doubles as the target for the
  // part-material picker below — whatever's highlighted is what a texture
  // swatch tap applies to.
  const selectedRef = useRef({
    mesh: null,
    originalColor: null,
    originalEmissive: null,
  });

  // UI-facing mirrors of selectedRef, for the Display tab / Live Control
  // Dock's Material picker to show "Selected: <part>" and highlight the
  // part's current swatch. selectedRef itself stays a plain ref (mutated
  // outside React's render cycle from handlePick), so these are the only
  // pieces of that selection state that actually trigger a re-render.
  const [selectedPartLabel, setSelectedPartLabel] = useState(null);
  const [selectedTextureName, setSelectedTextureName] = useState(null);
  const [textureLibraryReady, setTextureLibraryReady] = useState(false);

  // Tracks the last texture applied with NO part selected (i.e. a
  // "whole model" apply) — used only so the catch-up effect can finish
  // the job across every mesh if the map wasn't loaded yet at apply-time.
  // Cleared whenever a scoped (single-part) apply happens instead.
  const wholeModelPendingTextureRef = useRef(null);

  const clearHighlight = useCallback(() => {
    const sel = selectedRef.current;
    if (sel.mesh && sel.mesh.material) {
      if (sel.originalColor) sel.mesh.material.color.copy(sel.originalColor);
      if (sel.originalEmissive) sel.mesh.material.emissive.copy(sel.originalEmissive);
    }
    selectedRef.current = { mesh: null, originalColor: null, originalEmissive: null };
  }, []);

  const applyHighlight = useCallback((mesh) => {
    if (!mesh || !mesh.isMesh || !mesh.material) return;
    if (!mesh.userData.__ownMaterial) {
      mesh.material = mesh.material.clone();
      mesh.userData.__ownMaterial = true;
    }

    selectedRef.current = {
      mesh,
      originalColor: mesh.material.color.clone(),
      originalEmissive: mesh.material.emissive ? mesh.material.emissive.clone() : null,
    };

    mesh.material.color.lerp(TAP_OVERLAY_COLOR, TAP_OVERLAY_ALPHA);
  }, []);

  // Clear any highlight on unmount so a stale mesh reference never lingers.
  useEffect(() => {
    return () => clearHighlight();
  }, [clearHighlight]);

  // ── Part-material picker ────────────────────────────────────────────
  // Applies a Textures[] entry (map + color + roughness + metalness) to
  // whatever mesh is currently selected (selectedRef.current.mesh, kept in
  // sync by applyHighlight/clearHighlight above). This runs as a plain,
  // synchronous mutation outside the Canvas render tree — same pattern as
  // applyHighlight and toggleHideTransparent — so no extra Suspense-aware
  // component is needed per material change; the only Suspense-gated work
  // is the one-time swatch load in <TextureLibrary>.
  //
  // Order of precedence with SceneModel's `materialConfig` prop: that prop
  // is applied first, at load time, by the consumer (Model3DPreview /
  // SceneModel) — this picker only ever runs afterward, in response to a
  // user tap, and only touches the single tapped mesh. It never overrides
  // meshes the user hasn't picked a material for.
  const applyMaterialToMesh = useCallback((mesh, textureDef, texture) => {
    if (!mesh || !mesh.isMesh || !mesh.material || !textureDef) {
      return;
    }

    const hadUv = !!mesh.geometry?.attributes?.uv;
    if (!hadUv && mesh.geometry) {
      // CAD/CSG geometry (drilled holes, boolean cuts, procedural
      // extrusions) almost never ships with UVs. Without one, `mat.map`
      // assigns but can't be sampled per-pixel — only `mat.color` (a flat
      // multiply) shows, which looks visually identical to "nothing
      // happened." Generate a cheap box-projected UV once so the texture
      // pattern actually renders instead of just its fallback color.
      generateBoxUV(mesh.geometry);
    }

    if (!mesh.userData.__ownMaterial) {
      mesh.material = mesh.material.clone();
      mesh.userData.__ownMaterial = true;
    }

    const mat = mesh.material;
    if (texture) mat.map = texture;
    if (textureDef.color) mat.color.set(textureDef.color);
    if (textureDef.metalness !== undefined) mat.metalness = textureDef.metalness;
    if (textureDef.roughness !== undefined) mat.roughness = textureDef.roughness;
    mat.needsUpdate = true;

    mesh.userData.__textureName = textureDef.name;

    // Keep the highlight's "original color" snapshot in sync — if this
    // mesh is the currently highlighted selection, a later clearHighlight()
    // should restore to the NEW material's color (minus the red tap tint),
    // not whatever color it had before this material change.
    if (selectedRef.current.mesh === mesh) {
      selectedRef.current.originalColor = mat.color.clone();
    }
  }, []);

  const handleApplyTexture = useCallback((name) => {
    const textureDef = Textures.find((t) => t.name === name);
    if (!textureDef) {
      return;
    }
    const texture = bridgeRef.current.textures?.[name] || null;
    if (!texture) {
    }

    const mesh = selectedRef.current.mesh;
    if (mesh) {
      // A specific part is selected — only that part gets the new material.
      wholeModelPendingTextureRef.current = null;
      applyMaterialToMesh(mesh, textureDef, texture);
      setSelectedTextureName(name);
      return;
    }

    // Nothing selected — apply to every mesh in the model instead of doing
    // nothing. Tapping a part first still scopes the change to just that
    // part; skipping selection is now a deliberate "color the whole model"
    // shortcut rather than a dead end.
    const scene = bridgeRef.current.scene;
    if (!scene) {
      return;
    }
    let count = 0;
    scene.traverse((obj) => {
      if (obj.isMesh) {
        applyMaterialToMesh(obj, textureDef, texture);
        count += 1;
      }
    });
    wholeModelPendingTextureRef.current = name;
    setSelectedTextureName(name);
  }, [applyMaterialToMesh]);

  // Catch-up: if a swatch was applied before TextureLibrary finished
  // loading (texture was still null at apply-time), color/roughness/
  // metalness already applied immediately, but the map didn't. Once
  // loading settles, re-apply — for whichever mesh was selected, or for
  // the whole model if the last apply was a no-selection ("whole model")
  // one — so the map shows up without needing a second tap.
  useEffect(() => {
    if (!textureLibraryReady) return;

    const mesh = selectedRef.current.mesh;
    const pendingName = mesh?.userData?.__textureName;
    if (mesh && pendingName) {
      const texture = bridgeRef.current.textures?.[pendingName];
      if (texture && mesh.material?.map !== texture) {
        const textureDef = Textures.find((t) => t.name === pendingName);
        if (textureDef) applyMaterialToMesh(mesh, textureDef, texture);
      }
      return;
    }

    const wholeModelName = wholeModelPendingTextureRef.current;
    if (!wholeModelName) return;
    const texture = bridgeRef.current.textures?.[wholeModelName];
    const scene = bridgeRef.current.scene;
    if (!texture || !scene) return;
    const textureDef = Textures.find((t) => t.name === wholeModelName);
    if (!textureDef) return;
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material?.map !== texture) {
        applyMaterialToMesh(obj, textureDef, texture);
      }
    });
  }, [textureLibraryReady, applyMaterialToMesh]);

  // ── Tap-to-hide/transparent toggle ──────────────────────────────────
  // Dims a mesh to TAP_HIDE_OPACITY (or restores it) whenever it's tapped
  // while "Tap to Hide/Show Part" is enabled. Uses opacity instead of
  // mesh.visible = false so the part stays raycast-hittable — see the
  // TAP_HIDE_OPACITY comment above for why.
  const toggleHideTransparent = useCallback((mesh) => {
    if (!mesh || !mesh.isMesh || !mesh.material) return false;
    if (!mesh.userData.__ownMaterial) {
      mesh.material = mesh.material.clone();
      mesh.userData.__ownMaterial = true;
    }

    const hiddenMap = hiddenMeshesRef.current;

    if (hiddenMap.has(mesh)) {
      const original = hiddenMap.get(mesh);
      mesh.material.opacity = original.opacity;
      mesh.material.transparent = original.transparent;
      hiddenMap.delete(mesh);
      return false; // now shown
    }

    hiddenMap.set(mesh, {
      opacity: mesh.material.opacity,
      transparent: mesh.material.transparent,
    });
    mesh.material.transparent = true;
    mesh.material.opacity = TAP_HIDE_OPACITY;
    return true; // now hidden
  }, []);

  // Restore any dimmed parts on unmount so a stale material reference
  // never lingers past this CanvaProvider instance.
  useEffect(() => {
    return () => {
      hiddenMeshesRef.current.forEach((original, mesh) => {
        if (mesh.material) {
          mesh.material.opacity = original.opacity;
          mesh.material.transparent = original.transparent;
        }
      });
      hiddenMeshesRef.current.clear();
    };
  }, []);

  // ── handlePick — the actual tap-to-pick raycast. Fed screen-space
  // (x, y) local to the gesture-handler view, which wraps the same View
  // the Canvas fills — so containerSize doubles as the raycast viewport.
  // Wired up below via OrbitGestureProvider's onTap so it fires on any
  // confirmed tap (not a drag), regardless of which orbit mode is active.
  const handlePick = useCallback((locationX, locationY) => {
    const { width, height } = containerSizeRef.current;
    const { camera, scene } = bridgeRef.current;
    if (!camera || !scene || !width || !height) return;

    pointerNDC.x = (locationX / width) * 2 - 1;
    pointerNDC.y = -(locationY / height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    // Always clear the previous selection's color first — a tap on empty
    // space (or on something with no mapped part) should deselect too.
    clearHighlight();
    setSelectedPartLabel(null);
    setSelectedTextureName(null);

    if (hits.length > 0 && hits[0].object.isMesh) {
      const hitMesh = hits[0].object;
      const match = resolveMappedPart(hitMesh, partsMap);

      if (tapToHideEnabled) {
        // Tap-to-hide mode: toggle visibility/transparency instead of the
        // usual highlight-and-speak selection behavior.
        const nowHidden = toggleHideTransparent(hitMesh);
        if (match) {
          const name = match.customName || match.name || match.mesh;
          speakPartName(nowHidden ? `${name} hidden` : `${name} shown`);
          onPartPressRef.current?.(match, hits[0], { hidden: nowHidden });
        }
        return;
      }

      // Highlight fires on any mesh hit, mapped or not.
      applyHighlight(hitMesh);
      setSelectedPartLabel(match?.customName || match?.name || hitMesh.name || 'Part');
      setSelectedTextureName(hitMesh.userData.__textureName || null);

      if (match) {
        speakPartName(match.customName || match.name || match.mesh);
        onPartPressRef.current?.(match, hits[0]);
      }
    }
  }, [raycaster, pointerNDC, clearHighlight, applyHighlight, partsMap, speakPartName, tapToHideEnabled, toggleHideTransparent]);

  useEffect(() => {
    isInitialLoad.current = true;
    loadSettings(settingsKey).then(settings => {
      setCustomGesture(settings.customGesture || false);
      setActiveView(settings.activeView || 'iso');
      setShowGrid(settings.showGrid || false);
      setGridSize(settings.gridSize || 100);
      setAxesVisible(settings.axesVisible !== undefined ? settings.axesVisible : true);
      setBackgroundColor(settings.backgroundColor || '#1a1b1e');
      setBgMode(settings.bgMode || 'Color');
      setBgImageId(settings.bgImageId ?? null);
      setRenderMode(settings.renderMode || 'Shaded');
      setWireframe(settings.wireframe || false);
      setShadows(settings.shadows !== undefined ? settings.shadows : true);
      setAutoRotate(settings.autoRotate || false);
      setAutoRotateAxis(settings.autoRotateAxis || 'Y');
      setAutoRotateSpeed(settings.autoRotateSpeed || 1);
      setOrthographic(settings.orthographic || false);
      setMeasurements(settings.measurements || false);
      setSnapToGrid(settings.snapToGrid || false);
      setTransparency(settings.transparency || false);
      setZoomLevel(settings.zoomLevel || 1.0);
      isInitialLoad.current = false;
    });
    setTimeout(() => {
      setMessages('');
    }, 5000);
  }, [settingsKey]);

  const debouncedSave = useCallback((settings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(settingsKey, settings);
    }, 500);
  }, [settingsKey]);

  useEffect(() => {
    if (isInitialLoad.current) return;

    const settings = {
      customGesture,
      activeView,
      showGrid,
      gridSize,
      axesVisible,
      backgroundColor,
      bgMode,
      bgImageId,
      renderMode,
      wireframe,
      shadows,
      autoRotate,
      autoRotateAxis,
      autoRotateSpeed,
      orthographic,
      measurements,
      snapToGrid,
      transparency,
      zoomLevel,
    };

    const settingsString = JSON.stringify(settings);
    if (settingsRef.current !== settingsString) {
      settingsRef.current = settingsString;
      debouncedSave(settings);
    }
  }, [
    customGesture, activeView, showGrid, gridSize, axesVisible,
    backgroundColor, bgMode, bgImageId, renderMode, wireframe, shadows, autoRotate,
    autoRotateAxis, autoRotateSpeed,
    orthographic, measurements, snapToGrid, transparency, zoomLevel,
    debouncedSave
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const panelWidth = useMemo(() => Math.min(containerSize.width * 0.8, 340), [containerSize.width]);

  // Rebuild only when the camera TYPE changes (perspective <-> orthographic)
  // — that's the only case that genuinely needs a new Three.js object.
  // Previously this useMemo also rebuilt on every containerSize change and
  // re-ran `cam.position.set(...initialCamPosition)` each time — silently
  // snapping the camera back to its default view (and handing
  // <Canvas camera={...}> a brand-new object) any time layout fired, e.g.
  // when the drawer opened/closed and insets shifted underneath it. THAT
  // was the blink/reset, not a genuine 3D re-render.
  const camera = useMemo(() => {
    const aspect = containerSize.width / containerSize.height || 1;
    const cam = orthographic
      ? new OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 0.1, 1000)
      : new PerspectiveCamera(60, aspect, 0.1, 1000);
    cam.position.set(...initialCamPosition);
    cam.lookAt(0, 0, 0);
    cameraRef.current = cam;
    return cam;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orthographic]);

  // Keep the frustum in sync with size on the SAME camera instance — no
  // identity swap, no position reset, no flicker.
  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const aspect = containerSize.width / containerSize.height || 1;
    if (orthographic) {
      cam.left = -50 * aspect;
      cam.right = 50 * aspect;
      cam.top = 50;
      cam.bottom = -50;
    } else {
      cam.aspect = aspect;
    }
    cam.updateProjectionMatrix();
  }, [containerSize.width, containerSize.height, orthographic]);

  // Base orbit distance for the live-control dock's Rotate/Pan sliders —
  // derived once from the same initialCamPosition every other reset/zoom
  // formula in this file already anchors to (see handleZoomReset,
  // handleResetView).
  const sliderBaseDistance = useMemo(
    () => new Vector3(...initialCamPosition).length() || 100,
    [initialCamPosition]
  );

  // 0.5 (the default) maps to 1x — identical to the scene's baked-in
  // lighting whenever Live Controls hasn't been touched. Range is 0x–2x.
  const brightnessMultiplier = liveControlsEnabled ? brightness * 2 : 1;

  // Applies the Rotate/Pan slider values to the camera as a ONE-SHOT
  // update via cameraRef — the exact same pattern changePlane and
  // handleZoomIn/Out already use. This fires only from the effect below,
  // only when a rotation/pan slider value actually changes — it does NOT
  // run on every frame, so it never fights gesture-driven orbit (drei's
  // OrbitControls / CameraOrbitController) for camera.position. Between
  // slider touches, gestures work exactly as if Live Controls were off.
  const applySliderCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const distance = sliderBaseDistance / Math.max(0.1, zoomLevel);

    const theta = (sliderRotationY * Math.PI) / 180;
    const phi = (sliderRotationX * Math.PI) / 180;
    const targetX = panH;
    const targetY = panV;

    cameraRef.current.position.set(
      targetX + distance * Math.sin(theta) * Math.cos(phi),
      targetY + distance * Math.sin(phi),
      distance * Math.cos(theta) * Math.cos(phi)
    );
    cameraRef.current.lookAt(targetX, targetY, 0);

    // Roll: lookAt() fully overwrites orientation from position→target, so
    // Z has to be applied *after* it, as a rotation around the camera's
    // own forward axis — not folded into theta/phi like X/Y.
    cameraRef.current.rotateZ((sliderRotationZ * Math.PI) / 180);

    setCamPos([
      cameraRef.current.position.x,
      cameraRef.current.position.y,
      cameraRef.current.position.z,
    ]);
  }, [sliderBaseDistance, zoomLevel, sliderRotationX, sliderRotationY, sliderRotationZ, panH, panV]);

  // Only fires while Live Controls is on, and only in response to an
  // actual Rotate/Pan slider change — never continuously.
  useEffect(() => {
    if (!liveControlsEnabled) return;
    applySliderCamera();
  }, [liveControlsEnabled, sliderRotationX, sliderRotationY, sliderRotationZ, panH, panV, applySliderCamera]);

  // ─── Zoom Functions ─────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    if (!cameraRef.current) return;
    const newZoom = zoomLevel * 1.15;

    if (orthographic) {
      cameraRef.current.zoom = newZoom;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(newZoom);
      return;
    }

    const currentPos = cameraRef.current.position.clone();
    const direction = currentPos.clone().normalize();
    const distance = currentPos.length();
    const newDistance = Math.max(distance * 0.85, 10);
    const newPos = direction.multiplyScalar(newDistance);

    cameraRef.current.position.copy(newPos);
    cameraRef.current.lookAt(0, 0, 0);

    setZoomLevel(newZoom);
    setCamPos([newPos.x, newPos.y, newPos.z]);
  }, [zoomLevel, orthographic]);

  const handleZoomOut = useCallback(() => {
    if (!cameraRef.current) return;
    const newZoom = zoomLevel * 0.85;

    if (orthographic) {
      cameraRef.current.zoom = newZoom;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(newZoom);
      return;
    }

    const currentPos = cameraRef.current.position.clone();
    const direction = currentPos.clone().normalize();
    const distance = currentPos.length();
    const newDistance = Math.min(distance * 1.15, 500);
    const newPos = direction.multiplyScalar(newDistance);

    cameraRef.current.position.copy(newPos);
    cameraRef.current.lookAt(0, 0, 0);

    setZoomLevel(newZoom);
    setCamPos([newPos.x, newPos.y, newPos.z]);
  }, [zoomLevel, orthographic]);

  // Absolute-value zoom, driven by any Slider (drawer's Zoom tab, or the
  // live-control dock's Zoom tab) — unlike handleZoomIn/Out (which apply a
  // fixed ±15% step), this jumps straight to whatever value was dragged to.
  // Always moves the camera directly, same as before Live Controls existed
  // — it's a one-shot update, so it never competes with gesture-driven
  // orbit either way.
  const handleZoomSet = useCallback((value) => {
    if (!cameraRef.current) return;
    const clamped = Math.max(0.1, Math.min(5, value));

    if (orthographic) {
      cameraRef.current.zoom = clamped;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(clamped);
      return;
    }

    const currentPos = cameraRef.current.position.clone();
    const direction = currentPos.clone().normalize();
    const distance = currentPos.length();
    const ratio = clamped / (zoomLevel || 1);
    const newDistance = Math.max(10, Math.min(500, distance / ratio));
    const newPos = direction.multiplyScalar(newDistance);

    cameraRef.current.position.copy(newPos);
    cameraRef.current.lookAt(0, 0, 0);

    setZoomLevel(clamped);
    setCamPos([newPos.x, newPos.y, newPos.z]);
  }, [zoomLevel, orthographic]);

  const handleZoomReset = useCallback(() => {
    if (!cameraRef.current) return;

    if (orthographic) {
      cameraRef.current.zoom = 1.0;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(1.0);
      return;
    }

    const defaultDistance = new Vector3(...initialCamPosition).length();
    const direction = cameraRef.current.position.clone().normalize();
    const newPos = direction.multiplyScalar(defaultDistance);

    cameraRef.current.position.copy(newPos);
    cameraRef.current.lookAt(0, 0, 0);

    setZoomLevel(1.0);
    setCamPos([newPos.x, newPos.y, newPos.z]);
  }, [initialCamPosition, orthographic]);

  const handleGestureZoomChange = useCallback((newZoom) => {
    setZoomLevel(newZoom);
  }, []);

  const changePlane = useCallback((pos, id) => {
    if (!cameraRef.current) return;
    const distance = cameraRef.current.position.length();
    const dir = new Vector3(...pos).normalize();
    const newPos = dir.multiplyScalar(distance);

    cameraRef.current.position.copy(newPos);

    if (id === 'top' || id === 'bottom') {
      cameraRef.current.up.set(0, 0, -1);
    } else {
      cameraRef.current.up.set(0, 1, 0);
    }

    cameraRef.current.lookAt(0, 0, 0);

    setActiveView(id);
    setCamPos([newPos.x, newPos.y, newPos.z]);
    setZoomLevel(1.0);
    if (orthographic) {
      cameraRef.current.zoom = 1.0;
      cameraRef.current.updateProjectionMatrix();
    }
    setPanelOpen(false);
  }, [orthographic]);

  const toggleGesture        = useCallback(() => setCustomGesture(g => !g), []);
  const togglePanel          = useCallback(() => setPanelOpen(p => !p), []);
  const toggleGrid           = useCallback(() => setShowGrid(g => !g), []);
  const toggleAxes           = useCallback(() => setAxesVisible(a => !a), []);
  const closePanel           = useCallback(() => setPanelOpen(false), []);
  const toggleWireframe      = useCallback(() => setWireframe(w => !w), []);
  const toggleShadows        = useCallback(() => setShadows(s => !s), []);
  const toggleAutoRotate     = useCallback(() => setAutoRotate(a => !a), []);
  const toggleOrthographic   = useCallback(() => setOrthographic(o => !o), []);
  const toggleMeasurements   = useCallback(() => setMeasurements(m => !m), []);
  const toggleSnapGrid       = useCallback(() => setSnapToGrid(s => !s), []);
  const toggleTransparency   = useCallback(() => setTransparency(t => !t), []);

  // Android hardware back button closes the panel — this used to come free
  // from <Modal onRequestClose={...}>; now that the drawer is a plain view
  // (portaled to the app root, see below) it needs its own listener.
  useEffect(() => {
    if (Platform.OS !== 'android' || !panelOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPanelOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [panelOpen]);

  const handleScreenshot = useCallback(() => {
    Alert.alert('Screenshot', 'Screenshot captured!');
  }, []);

  const handleMeasureToolPress = useCallback((tool) => {
    Alert.alert('Coming soon', `${tool} measurement isn't implemented yet.`);
  }, []);

  const handleClearMeasurements = useCallback(() => {
    setMeasurements(false);
  }, []);

  const handleResetView = useCallback(() => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(...initialCamPosition);
    cameraRef.current.lookAt(0, 0, 0);
    if (orthographic) {
      cameraRef.current.zoom = 1.0;
      cameraRef.current.updateProjectionMatrix();
    }
    setCamPos(initialCamPosition);
    setActiveView('iso');
    setZoomLevel(1.0);
  }, [initialCamPosition, orthographic]);

  const handleRenderModeChange = useCallback((mode) => {
    setRenderMode(mode);
    setWireframe(mode === 'Wireframe');
  }, []);

  const gesture = useGestureBridge();
  const canvasEvents = !customGesture && !panelOpen ? events : {};

  // ── Portal registration ─────────────────────────────────────────────
  // The drawer (backdrop + AdvancedVerticalPanel) is pushed into the
  // app-root PortalProvider instead of rendered inline below. This escapes
  // this component's own stacking context entirely, so it paints above any
  // screen-level header (including native stack headers), no matter how
  // deeply this CanvaProvider instance is nested in the navigator.
  useEffect(() => {
    // Always (re)register — never remove based on panelOpen. Removing here
    // would unmount AdvancedVerticalPanel/Backdrop mid-close, before their
    // own Animated.spring/Animated.timing get a chance to run, which is
    // exactly what caused the "instant close" instead of an animated one.
    // `visible={panelOpen}` alone drives both animations; the portal node
    // itself only ever comes down when this CanvaProvider instance unmounts
    // (see the separate cleanup effect below).
    addPortal(
      portalKey,
      <>
        <Backdrop visible={panelOpen} onPress={closePanel} />
        <AdvancedVerticalPanel
          visible={panelOpen}
          panelWidth={panelWidth}
          activeView={activeView}
          onViewChange={changePlane}
          customGesture={customGesture}
          onToggleGesture={toggleGesture}
          showGrid={showGrid}
          onShowGrid={toggleGrid}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
          axesVisible={axesVisible}
          onToggleAxes={toggleAxes}
          camPos={camPos}
          onClose={closePanel}
          renderMode={renderMode}
          onRenderModeChange={handleRenderModeChange}
          wireframe={wireframe}
          onToggleWireframe={toggleWireframe}
          shadows={shadows}
          onToggleShadows={toggleShadows}
          autoRotate={autoRotate}
          onToggleAutoRotate={toggleAutoRotate}
          autoRotateAxis={autoRotateAxis}
          onAutoRotateAxisChange={setAutoRotateAxis}
          autoRotateSpeed={autoRotateSpeed}
          onAutoRotateSpeedChange={setAutoRotateSpeed}
          orthographic={orthographic}
          onToggleOrthographic={toggleOrthographic}
          liveControlsEnabled={liveControlsEnabled}
          onToggleLiveControls={toggleLiveControls}
          tapToHideEnabled={tapToHideEnabled}
          onToggleTapToHide={toggleTapToHide}
          selectedPartLabel={selectedPartLabel}
          selectedTextureName={selectedTextureName}
          onApplyTexture={handleApplyTexture}
          textureLibraryReady={textureLibraryReady}
          measurements={measurements}
          onToggleMeasurements={toggleMeasurements}
          snapToGrid={snapToGrid}
          onToggleSnapGrid={toggleSnapGrid}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          bgMode={bgMode}
          onBgModeChange={setBgMode}
          bgImageId={bgImageId}
          onBgImageChange={setBgImageId}
          transparency={transparency}
          onToggleTransparency={toggleTransparency}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onZoomSet={handleZoomSet}
          onScreenshot={handleScreenshot}
          onResetToDefault={handleResetView}
          onClearMeasurements={handleClearMeasurements}
          onMeasureToolPress={handleMeasureToolPress}
        />
      </>
    );
    // No cleanup here on purpose — this effect re-runs on every prop change
    // (including fast-changing ones like camPos while orbiting with the
    // panel open). A removePortal() cleanup would fire on EVERY one of
    // those re-runs, not just on unmount, remounting Backdrop and
    // AdvancedVerticalPanel each time and resetting their Animated.Value
    // refs. addPortal() already replaces the existing entry for this same
    // key, so nothing needs to be torn down first. The dedicated unmount
    // effect below is the only place that calls removePortal.
  }, [
    panelOpen, panelWidth, activeView, customGesture, showGrid, gridSize,
    axesVisible, camPos, renderMode, wireframe, shadows, autoRotate,
    autoRotateAxis, autoRotateSpeed,
    orthographic, liveControlsEnabled, tapToHideEnabled, selectedPartLabel, selectedTextureName, textureLibraryReady, measurements, snapToGrid, backgroundColor, bgMode,
    bgImageId, transparency, zoomLevel, portalKey, addPortal, removePortal,
    changePlane, closePanel, toggleGesture, toggleGrid, toggleAxes,
    handleRenderModeChange, toggleWireframe, toggleShadows, toggleAutoRotate,
    toggleOrthographic, toggleLiveControls, toggleTapToHide, handleApplyTexture, toggleMeasurements, toggleSnapGrid, toggleTransparency,
    handleZoomIn, handleZoomOut, handleZoomReset, handleZoomSet,
    handleScreenshot, handleResetView, handleClearMeasurements,
    handleMeasureToolPress,
  ]);

  // Unmount safety net — if this CanvaProvider instance unmounts while the
  // panel is still open (e.g. user navigates away without closing it), make
  // sure the portaled drawer doesn't survive as an orphaned node at the
  // app root.
  useEffect(() => {
    return () => removePortal(portalKey);
  }, [portalKey, removePortal]);

  return (
    <SceneContext.Provider value={useMemo(() => ({
      renderMode,
      wireframe,
      shadows,
      transparency,
      measurements,
      snapToGrid,
      zoomLevel,
    }), [renderMode, wireframe, shadows, transparency, measurements, snapToGrid, zoomLevel])}>
      <ErrorBoundary>
        <View style={[S.root, style]} onLayout={handleLayout}>
          {bgMode === 'Image' && bgImage && (
            <Image source={bgImage} 
            style={{position: 'absolute', top: 0, left: 0,width:windowWidth,height:windowHeight}} resizeMode="cover" />
          )}

          <OrbitGestureProvider
            enabled={customGesture}
            onPanChange={gesture.onPanChange}
            onPanEnd={gesture.onPanEnd}
            onPinchStart={gesture.onPinchStart}
            onPinchChange={gesture.onPinchChange}
            onPinchEnd={gesture.onPinchEnd}
            onTap={handlePick}
          >
            <View style={StyleSheet.absoluteFill} {...canvasEvents} >
              <View  style={{flex: 1}} pointerEvents={customGesture ? 'auto' : 'none'}>
                   <Canvas
                camera={camera}
                shadows={shadows}
                dpr={[1, 2]}
                gl={{
                  physicallyCorrectLights: true,
                  antialias: true,
                  alpha: true,
                  stencil: true,
                  depth: true,
                  powerPreference: 'high-performance',
                }}
                onCreated={CanvaOnCreated}
                fallback={Fallback}
              >
                <Suspense fallback={null}>
                  <RaycastBridge bridgeRef={bridgeRef} />
                  <CameraOrbitController
                    vx={gesture?.vx}
                    vy={gesture?.vy}
                    pinchScale={gesture?.pinchScale}
                    pinchActive={gesture?.pinchActive}
                    enabled={customGesture}
                    orthographic={orthographic}
                    onZoomChange={handleGestureZoomChange}
                  />
                  <AutoRotateController enabled={autoRotate} axis={autoRotateAxis} speed={autoRotateSpeed} />
                  {children}
                </Suspense>

                {/* Each swatch now loads via useTextureLoader, wrapped in
                    its own Suspense + error boundary (see TextureLibrary
                    above) — no Suspense needed at this call site, and
                    loading can never gate/hide the model above. */}
                <TextureLibrary bridgeRef={bridgeRef} onReady={() => setTextureLibraryReady(true)} />

                {bgMode !== 'Image' && <color attach="background" args={[backgroundColor]} />}
                <Lightings brightness={brightnessMultiplier} />

                {!customGesture && <OrbitControls enabled={!panelOpen} />}

                <CameraPositionTracker onChange={setCamPos} active={panelOpen} />

                {showGrid && (
                  <gridHelper
                    args={[gridSize, Math.max(4, Math.round(gridSize * 0.8)), '#4a5a6a', '#2a3a4a']}
                    position={[0, 0, 0]}
                  />
                )}

                {axesVisible && <AxisLabels size={gridSize * 0.15} />}
              </Canvas>
              </View>
          
            </View>
          </OrbitGestureProvider>

          <View style={S.gridOverlay} pointerEvents="none">
            <View style={S.gridH} />
            <View style={S.gridV} />
          </View>

          <View style={S.statusBar} pointerEvents="none">
            <View style={S.statusIndicator}>
              <Text style={S.statusDot}>●</Text>
              <Text style={S.statusText}>{renderMode}</Text>
            </View>
            {orthographic && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>Ortho</Text>
              </View>
            )}
            {autoRotate && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>⟳ {autoRotateAxis}</Text>
              </View>
            )}
            {liveControlsEnabled && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>🎚 Live</Text>
              </View>
            )}
            {tapToHideEnabled && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>👁 Tap-Hide</Text>
              </View>
            )}
            {showGrid && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>Grid</Text>
              </View>
            )}
            {Math.abs(zoomLevel - 1.0) > 0.01 && (
              <View style={S.statusIndicator}>
                <Text style={S.statusText}>{Math.round(zoomLevel * 100)}%</Text>
              </View>
            )}
            {
              messages && messages.length > 0 && (
                <View style={S.statusIndicator}>
                  <Text style={S.statusText}>{messages}</Text>
                </View>
              )
            }
          </View>

          {/* Backdrop + AdvancedVerticalPanel are no longer rendered here —
              they're pushed through the PortalProvider (see the portal
              registration effect above) so they paint above any screen
              header, including native stack headers, regardless of how
              deeply this CanvaProvider is nested. */}

          {liveControlsEnabled && (
            <LiveControlDock
              activeView={activeView}
              onViewChange={changePlane}
              zoomLevel={zoomLevel}
              onZoomSet={handleZoomSet}
              rotationX={sliderRotationX}
              onRotationXChange={setSliderRotationX}
              rotationY={sliderRotationY}
              onRotationYChange={setSliderRotationY}
              rotationZ={sliderRotationZ}
              onRotationZChange={setSliderRotationZ}
              panH={panH}
              onPanHChange={setPanH}
              panV={panV}
              onPanVChange={setPanV}
              brightness={brightness}
              onBrightnessChange={setBrightness}
              bgMode={bgMode}
              onBgModeChange={setBgMode}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              bgImageId={bgImageId}
              onBgImageChange={setBgImageId}
              selectedPartLabel={selectedPartLabel}
              selectedTextureName={selectedTextureName}
              onApplyTexture={handleApplyTexture}
              textureLibraryReady={textureLibraryReady}
              activeTab={dockTab}
              onSwitchTab={setDockTab}
              onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
              onClose={() => setLiveControlsEnabled(false)}
            />
          )}

          <ProFAB
            onPress={togglePanel}
            isOpen={panelOpen}
            bottomOffset={liveControlsEnabled ? dockHeight + 16 : 0}
          />
        </View>
      </ErrorBoundary>
    </SceneContext.Provider>
  );
};

export default CanvaProvider;

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = '#0066cc';
const BG = '#1a1b1e';
const BORDER_SOFT = '#3a3b3e';
const MUTED = '#7a8299';
const TEXT = '#f0f2f5';
const SURFACE = 'rgba(30, 31, 34, 0.98)';
const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

// One shared token set so every slider in the file (drawer's Zoom slider,
// the live-control dock's sliders) matches the same look.
const SLIDER_TOKENS = {
  trackThickness: 4,
  thumbSize: 20,
  minimumTrackTintColor: ACCENT,
  maximumTrackTintColor: 'rgba(255,255,255,0.14)',
  thumbTintColor: '#EEF0FF',
};

// Distinct token set for the Light slider — white fill instead of ACCENT,
// so it doesn't read as "this also controls zoom/rotation".
const LIGHT_SLIDER_TOKENS = {
  ...SLIDER_TOKENS,
  minimumTrackTintColor: '#FFFFFF',
  maximumTrackTintColor: 'rgba(255,255,255,0.18)',
  thumbTintColor: '#FFFFFF',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },

  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridH: {
    position: 'absolute',
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,170,255,0.04)',
  },
  gridV: {
    position: 'absolute',
    height: '100%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,170,255,0.04)',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
     backgroundColor: 'rgba(0,0,0,0.5)',
  zIndex: 999999,
  elevation: 500,
  },

  statusBar: {
    position: 'absolute',
    top: 2,
    left: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 1,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    fontSize: 8,
    color: '#00ff88',
  },
  statusText: {
    fontSize: 8,
    color: '#fff',
    fontFamily: MONO,
    fontWeight: '600',
  },

  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    zIndex: 21,
  },
fab: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: 'rgba(0, 55, 204, 0.15)',
  borderWidth: 1,
  borderColor: MUTED,
  alignItems: 'center',
  justifyContent: 'center',
},
  fabActive: {
    backgroundColor: 'rgba(255, 59, 48,0.5)',
  },
  fabIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  fabLabel: {
    fontSize: 8,
    color: '#fff',
    marginBottom: -5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

verticalPanel: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  backgroundColor: SURFACE,
  borderTopLeftRadius: 24,
  borderBottomLeftRadius: 24,
  borderWidth: 1,
  borderColor: BORDER_SOFT,
  borderRightWidth: 0,
  overflow: 'hidden',
  elevation: 500,
  zIndex: 999999,
  shadowColor: '#000',
  shadowOffset: { width: -4, height: 0 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
},
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
    backgroundColor: 'rgba(30,31,34,0.95)',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.2,
  },
  panelClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  panelCloseTxt: {
    fontSize: 16,
    color: MUTED,
    fontWeight: '700',
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
    backgroundColor: 'rgba(30,31,34,0.95)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  tabIcon: {
    fontSize: 14,
    color: MUTED,
  },
  tabLabel: {
    fontSize: 9,
    color: MUTED,
    fontWeight: '600',
  },

  viewPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  viewPresetBtn: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  viewPresetActive: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}20`,
  },
  viewPresetIcon: {
    fontSize: 18,
    color: MUTED,
  },
  viewPresetLabel: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
    fontWeight: '600',
  },

  panelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_SOFT,
    marginVertical: 10,
  },

  section: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  renderModeGroup: {
    marginBottom: 2,
  },
  renderModeLabel: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 6,
    fontWeight: '500',
  },
  renderModeOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  renderModeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  renderModeActive: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}20`,
  },
  renderModeText: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
  },

  colorPickerGroup: {
    marginVertical: 2,
  },
  colorPickerLabel: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 6,
    fontWeight: '500',
  },
  materialHint: {
    fontSize: 10,
    color: MUTED,
    fontStyle: 'italic',
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: ACCENT,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: 1,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5,
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  segmentTextActive: {
    color: '#fff',
  },

  imageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: 10,
  },
  imageThumbWrap: {
    alignItems: 'center',
    gap: 3,
    padding: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageThumbActive: {
    borderColor: ACCENT,
  },
  imageThumbDisabled: {
    opacity: 0.35,
  },
  imageThumb: {
    width: 64,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  imageThumbLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: MUTED,
  },

  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleItemIcon: {
    fontSize: 12,
    fontFamily: MONO,
    color: MUTED,
    width: 20,
    textAlign: 'center',
  },
  toggleItemLabel: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '500',
  },
  toggleItemTrack: {
    width: 34,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  toggleItemThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // ─── Auto Rotate control ──────────────────────────────────────────────
  autoRotateGroup: {
    paddingVertical: 8,
  },
  autoRotateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoRotateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  axisRadioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  axisRadioBoxDisabled: {
    opacity: 0.4,
  },
  axisRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  axisRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisRadioDotActive: {
    borderColor: ACCENT,
  },
  axisRadioDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  axisRadioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    fontFamily: MONO,
  },
  axisRadioLabelActive: {
    color: ACCENT,
  },
  autoRotateSpeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 30,
  },
  autoRotateSpeedLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },

  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stepperLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperIcon: {
    fontSize: 12,
    fontFamily: MONO,
    color: MUTED,
    width: 20,
    textAlign: 'center',
  },
  stepperTitle: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '500',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  stepBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 12,
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: MONO,
    color: ACCENT,
  },

  zoomContainer: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  zoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  zoomLabel: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '600',
  },
  zoomLevel: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '700',
    fontFamily: MONO,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  zoomBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
  },
  zoomResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACCENT}20`,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  zoomResetText: {
    fontSize: 16,
    color: ACCENT,
  },
  zoomBar: {
    marginTop: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  zoomBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ACCENT,
  },

  measurementControls: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 6,
  },
  measureBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  measureBtnText: {
    fontSize: 11,
    color: TEXT,
    fontWeight: '500',
  },

  actionBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    marginVertical: 3,
  },
  actionBtnDanger: {
    borderColor: '#ff3b3040',
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  actionBtnText: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '500',
  },

  infoRow: {
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 1,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: MONO,
    color: TEXT,
    fontWeight: '600',
  },

  performanceInfo: {
    marginTop: 2,
  },
  performanceLabel: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 4,
    fontWeight: '600',
  },
  performanceBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  performanceFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#00ff88',
  },
  performanceText: {
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
  },
});

// ─── Live Control Dock styles ───────────────────────────────────────────────
const dockS = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(20, 20, 24, 0.85)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 21,
  },
  closeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 10,
  },
  sliderArea: {
    alignItems: 'center',
    minHeight: 28,
    justifyContent: 'center',
  },
  viewRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  viewBtn: {
    width: 52,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  viewBtnActive: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}20`,
  },
  viewIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  viewIconActive: {
    color: ACCENT,
  },
  viewLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  viewLabelActive: {
    color: ACCENT,
  },
  rotateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: 1,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  segmentTextActive: {
    color: '#fff',
  },
  presetGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  isoButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${ACCENT}29`,
    borderWidth: 1,
    borderColor: `${ACCENT}b3`,
  },
  isoButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.2,
  },
  resetButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchActive: {
    borderColor: ACCENT,
    borderWidth: 3,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: 6,
  },
  imageThumbWrap: {
    alignItems: 'center',
    gap: 3,
    padding: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageThumbActive: {
    borderColor: ACCENT,
  },
  imageThumbDisabled: {
    opacity: 0.35,
  },
  imageThumb: {
    width: 52,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  imageThumbLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  materialHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_SOFT,
  },
  tab: {
    alignItems: 'center',
    gap: 1,
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: `${ACCENT}29`,
    borderWidth: 1,
    borderColor: `${ACCENT}b3`,
  },
  tabIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  tabIconActive: {
    color: ACCENT,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabLabelActive: {
    color: ACCENT,
  },
});