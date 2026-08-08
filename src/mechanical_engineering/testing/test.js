import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  PanResponder,
  Image,
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Raycaster, Vector2, Color } from 'three';
import Slider from './testing2'; // Your slider component

import bg1 from '../../assets/images/bg/nature.jpg';
import bg2 from '../../assets/images/bg/gradient.jpg';


const ACCENT = '#6366F1';
const SURFACE = 'rgba(20, 20, 24, 0.85)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

// One shared token set so every slider in the dock looks identical —
// no more per-slider drift in thumbSize/track thickness/colors.
const SLIDER_TOKENS = {
  trackThickness: 4,
  thumbSize: 20,
  minimumTrackTintColor: ACCENT,
  maximumTrackTintColor: 'rgba(255,255,255,0.14)',
  thumbTintColor: '#EEF0FF',
};

const LIGHT_SLIDER_TOKENS = {
  ...SLIDER_TOKENS,
  minimumTrackTintColor: '#FFFFFF',
  maximumTrackTintColor: 'rgba(255,255,255,0.18)',
  thumbTintColor: '#FFFFFF',
};

// ─── Tap-vs-drag thresholds — a touch is only treated as a "pick" if it
// moved less than this many px and released within this many ms.
const TAP_MOVE_THRESHOLD = 10;
const TAP_TIME_THRESHOLD = 300;

// ─── Tap overlay — blended toward this color at this alpha, same math as
// laying rgba(0,0,0,0.2) on top: result = base*(1-alpha) + overlay*alpha.
// Since overlay is black, that simplifies to base*(1-alpha), but Color.lerp
// keeps this general in case you want a non-#ff0000 tint later.
const TAP_OVERLAY_COLOR = new Color('#ff0000');
const TAP_OVERLAY_ALPHA = 0.4;

// ─── ISO preset — angle (degrees) applied to all three rotation axes
// when the ISO button is pressed in the rotate tab.
const ISO_ANGLE = 45;

// ─── Gesture rotation — degrees of rotation per px of finger travel on
// the touchpad (single-finger orbit) and the clamp both slider + gesture
// input are kept within.
const GESTURE_SENSITIVITY = 0.35;
const ROTATION_LIMIT = 180;
const clampRotation = (v) => Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, v));

// ─── Pinch-to-zoom — zoom units (same scale as the Zoom slider, -15..15)
// per px of change in the distance between two fingers.
const ZOOM_GESTURE_SENSITIVITY = 0.06;
const ZOOM_LIMIT = 15;
const clampZoom = (v) => Math.max(-ZOOM_LIMIT, Math.min(ZOOM_LIMIT, v));

// ─── Background presets ────────────────────────────────────────────────────
// Color = null falls back to the brightness-derived gray from the Light tab.
const BG_COLORS = [
  '#000000',
  '#FFFFFF',
  '#0B0B10',
  '#1A1A2E',
  '#EAEAEA',
  '#6366F1',
  '#0EA5E9',
  '#22C55E',
];

const BG_IMAGES = [
  { id: 'nature', source: bg1, label: 'Nature' },
  { id: 'gradient', source: bg2, label: 'Gradient' },
];

// ─── resolveMappedPart — walks up from the hit object looking for a node
// whose `.name` exists as a key in `partsMap`. Unlike the old approach,
// this NEVER falls back to a raw exporter name (mesh_0_instance_0, Cube1,
// etc) — if nothing in the chain matches something you registered in
// `parts`, it returns null and the tap is treated as a miss.
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

// ─── pixelStorei patch — EXGL doesn't implement these unpack flags,
// swallow them silently instead of letting them fall through to the
// real (warning-logging) implementation. UNPACK_ALIGNMENT fires once
// per texture upload, which is what floods the log after a GLB loads.
const handleCanvasCreated = (state) => {
  const gl = state.gl.getContext();
  const original = gl.pixelStorei.bind(gl);

  const UNSUPPORTED_PNAMES = new Set([
    gl.UNPACK_FLIP_Y_WEBGL,
    gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
    gl.UNPACK_ALIGNMENT,
  ]);

  gl.pixelStorei = (...args) => {
    if (UNSUPPORTED_PNAMES.has(args[0])) return;
    return original(...args);
  };
};

// ─── Bridge — lives inside <Canvas> purely to hand the live camera/scene
// refs out to the parent component. Renders nothing, costs nothing per frame.
function RaycastBridge({ bridgeRef }) {
  const { camera, scene } = useThree();

  useEffect(() => {
    bridgeRef.current.camera = camera;
    bridgeRef.current.scene = scene;
  }, [camera, scene, bridgeRef]);

  return null;
}

// ─── Segmented control — inline 2/3-way axis picker, replaces the old
// full-screen Modal + FlatList for something this small.
const SegmentedControl = ({ options, value, onChange }) => (
  <View style={dock.segmented}>
    {options.map((o) => (
      <TouchableOpacity
        key={o}
        onPress={() => onChange(o)}
        style={[dock.segment, value === o && dock.segmentActive]}
        activeOpacity={0.8}
      >
        <Text style={[dock.segmentText, value === o && dock.segmentTextActive]}>{o}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Background picker — segmented Color/Image switch, then either a row
// of color swatches or a horizontally-scrolling strip of image thumbnails.
const BackgroundPicker = ({ bgMode, setBgMode, bgColor, setBgColor, bgImage, setBgImage }) => (
  <View style={{ width: '100%' }}>
    <SegmentedControl options={['Color', 'Image']} value={bgMode} onChange={setBgMode} />

    {bgMode === 'Color' ? (
      <View style={dock.swatchRow}>
        {BG_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setBgColor(c)}
            activeOpacity={0.8}
            style={[
              dock.swatch,
              { backgroundColor: c },
              bgColor === c && dock.swatchActive,
            ]}
          />
        ))}
      </View>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={dock.imageRow}
      >
        {BG_IMAGES.map((img) => (
          <TouchableOpacity
            key={img.id}
            onPress={() => setBgImage(img.source)}
            activeOpacity={0.8}
            style={[dock.imageThumbWrap, bgImage === img.source && dock.imageThumbActive]}
          >
            <Image source={img.source} style={dock.imageThumb} resizeMode="cover" />
            <Text style={dock.imageThumbLabel} numberOfLines={1}>
              {img.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>
);

// ─── Control dock — one surface, one slider visible at a time, switched
// via a compact tab bar. Replaces the old 4-corners-of-the-screen layout.
const TABS = [
  { id: 'zoom', icon: '⤢', label: 'Zoom' },
  { id: 'rotate', icon: '↻', label: 'Rotate' },
  { id: 'pan', icon: '✥', label: 'Pan' },
  { id: 'light', icon: '☀', label: 'Light' },
  { id: 'background', icon: '🎨', label: 'BG' },
];

const ControlDock = ({
  zoom, setZoom,
  rotationX, setRotationX,
  rotationY, setRotationY,
  rotationZ, setRotationZ,
  panH, setPanH,
  panV, setPanV,
  brightness, setBrightness,
  bgMode, setBgMode, bgColor, setBgColor, bgImage, setBgImage,
  activeTab, onSwitchTab,
  rotateMode, setRotateMode,
  onLayout,
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
  const setRotValue = { X: setRotationX, Y: setRotationY, Z: setRotationZ }[rotAxis];
  const panValue = panAxis === 'H' ? panH : panV;
  const setPanValue = panAxis === 'H' ? setPanH : setPanV;

  // ISO preset — snaps all three rotation axes to ISO_ANGLE at once.
  // Doesn't touch rotAxis/the active slider selection, just the values.
  const applyIsoPreset = () => {
    setRotationX(ISO_ANGLE);
    setRotationY(ISO_ANGLE);
    setRotationZ(ISO_ANGLE);
  };

  // Reset — zeroes all three rotation axes.
  const applyResetPreset = () => {
    setRotationX(0);
    setRotationY(0);
    setRotationZ(0);
  };

  return (
    <View style={dock.container} onLayout={onLayout}>
      <Animated.View style={[dock.sliderArea, { opacity: fade }]}>
        {activeTab === 'rotate' && (
          <>
            <View style={dock.rotateHeader}>
              {rotateMode === 'slider' ? (
                <SegmentedControl options={['X', 'Y', 'Z']} value={rotAxis} onChange={setRotAxis} />
              ) : (
                <TouchableOpacity
                  onPress={() => setRotateMode('slider')}
                  style={dock.modeButton}
                  activeOpacity={0.8}
                >
                  <Text style={dock.modeButtonText}>🎚 Slider</Text>
                </TouchableOpacity>
              )}
              <View style={dock.presetGroup}>
                {rotateMode === 'slider' && (
                  <TouchableOpacity
                    onPress={() => setRotateMode('gesture')}
                    style={dock.modeButton}
                    activeOpacity={0.8}
                  >
                    <Text style={dock.modeButtonText}>✋ Gesture</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={applyIsoPreset}
                  style={dock.isoButton}
                  activeOpacity={0.8}
                >
                  <Text style={dock.isoButtonText}>ISO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyResetPreset}
                  style={dock.resetButton}
                  activeOpacity={0.8}
                >
                  <Text style={dock.resetButtonText}>⟲</Text>
                </TouchableOpacity>
              </View>
            </View>

            {rotateMode === 'slider' ? (
              <Slider
                horizontal
                value={rotValue}
                onValueChange={setRotValue}
                minimumValue={-180}
                maximumValue={180}
                step={1}
                showLabel
                labelPosition="top"
                formatLabel={(v) => `${Math.round(v)}°`}
                {...SLIDER_TOKENS}
              />
            ) : (
              <>
                <View style={dock.readoutRow}>
                  <View style={dock.readoutItem}>
                    <Text style={dock.readoutLabel}>X</Text>
                    <Text style={dock.readoutValue}>{Math.round(rotationX)}°</Text>
                  </View>
                  <View style={dock.readoutItem}>
                    <Text style={dock.readoutLabel}>Y</Text>
                    <Text style={dock.readoutValue}>{Math.round(rotationY)}°</Text>
                  </View>
                  <View style={dock.readoutItem}>
                    <Text style={dock.readoutLabel}>Z</Text>
                    <Text style={dock.readoutValue}>{Math.round(rotationZ)}°</Text>
                  </View>
                </View>
                <Text style={dock.gesturePadHint} numberOfLines={1}>
                  drag to orbit · pinch to zoom · twist to roll
                </Text>
              </>
            )}
          </>
        )}

        {activeTab === 'pan' && (
          <>
            <SegmentedControl
              options={['H', 'V']}
              value={panAxis}
              onChange={setPanAxis}
            />
            <Slider
              horizontal
              value={panValue}
              onValueChange={setPanValue}
              minimumValue={-5}
              maximumValue={5}
              step={0.05}
              length={220}
              showLabel
              labelPosition="top"
              formatLabel={(v) => v.toFixed(1)}
              {...SLIDER_TOKENS}
            />
          </>
        )}

        {activeTab === 'zoom' && (
          <Slider
            horizontal
            value={zoom}
            onValueChange={setZoom}
            minimumValue={-15}
            maximumValue={15}
            step={0.1}
            length={220}
            showLabel
            labelPosition="top"
            formatLabel={(v) => `${v.toFixed(1)}x`}
            {...SLIDER_TOKENS}
          />
        )}

        {activeTab === 'light' && (
          <Slider
            horizontal
            value={brightness}
            onValueChange={setBrightness}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            length={220}
            showLabel
            labelPosition="top"
            formatLabel={(v) => `${Math.round(v * 100)}%`}
            {...LIGHT_SLIDER_TOKENS}
          />
        )}

        {activeTab === 'background' && (
          <BackgroundPicker
            bgMode={bgMode}
            setBgMode={setBgMode}
            bgColor={bgColor}
            setBgColor={setBgColor}
            bgImage={bgImage}
            setBgImage={setBgImage}
          />
        )}
      </Animated.View>

      <ScrollView  horizontal contentContainerStyle={dock.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => switchTab(t.id)}
            style={[dock.tab, activeTab === t.id && dock.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[dock.tabIcon, activeTab === t.id && dock.tabIconActive]}>
              {t.icon}
            </Text>
            <Text style={[dock.tabLabel, activeTab === t.id && dock.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Camera rig that updates based on slider values ────────────────────────
function SliderCameraRig({
  rotationX,
  rotationY,
  rotationZ,
  zoom,
  panH,
  panV,
  baseDistance = 9,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
}) {
  const { camera } = useThree();

  useFrame(() => {
    const zoomFactor = 1 + zoom / 15;
    const distance = baseDistance / Math.max(0.1, zoomFactor);

    const theta = (rotationY * Math.PI) / 180;
    const phi = (rotationX * Math.PI) / 180;

    const finalTargetX = targetX + panH;
    const finalTargetY = targetY + panV;

    camera.position.x = finalTargetX + distance * Math.sin(theta) * Math.cos(phi);
    camera.position.y = finalTargetY + distance * Math.sin(phi);
    camera.position.z = targetZ + distance * Math.cos(theta) * Math.cos(phi);

    camera.lookAt(finalTargetX, finalTargetY, targetZ);

    // Roll: lookAt() fully overwrites orientation from position→target,
    // so Z has to be applied *after* it, as a rotation around the
    // camera's own forward axis — not folded into theta/phi like X/Y.
    camera.rotateZ((rotationZ * Math.PI) / 180);
  });

  return null;
}

// ─── Main CanvasProvider component ──────────────────────────────────────────
export default function CanvasProvider({
  children,
  title,
  onClose,
  cameraFov = 45,
  style,
  defaultZoom = 0,
  baseDistance = 9,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
  onPartPress, // (partEntry, intersection) — fired on a single confirmed tap that hit a mapped part
  parts = [{ mesh: 'mesh_0_instance_0', customName: 'Part A', details: 'this is details' }]
}) {
  // Rotation state (in degrees)
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);
  const [zoom, setZoom] = useState(defaultZoom);
  const [panH, setPanH] = useState(0);
  const [panV, setPanV] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);
  const [activeTab, setActiveTab] = useState('zoom');
  const [rotateMode, setRotateMode] = useState('gesture'); // 'slider' | 'gesture'

  // Background state — 'Color' uses bgColor (falls back to the
  // brightness-derived gray when null), 'Image' renders bgImage full-bleed
  // behind the canvas.
  const [bgMode, setBgMode] = useState('Color'); // 'Color' | 'Image'
  const [bgColor, setBgColor] = useState(null);
  const [bgImage, setBgImage] = useState(null);

  // Full-screen orbit-drag is only "live" when the dock is open, the Rotate
  // tab is active, and gesture mode is selected — every other time this
  // overlay must be pointerEvents="none" so it never steals taps meant for
  // the tap-to-pick layer, the dock's own sliders/buttons, or any modal.
  const isRotateGestureActive = controlsVisible && activeTab === 'rotate' && rotateMode === 'gesture';

  // Live refs — the PanResponder below is created once (useRef) so it would
  // otherwise close over stale rotationX/Y/Z from mount. Keep refs synced
  // on every render instead of re-creating the responder.
  const rotXRef = useRef(rotationX);
  const rotYRef = useRef(rotationY);
  const rotZRef = useRef(rotationZ);
  const zoomRef = useRef(zoom);
  rotXRef.current = rotationX;
  rotYRef.current = rotationY;
  rotZRef.current = rotationZ;
  zoomRef.current = zoom;

  // Snapshot of rotation/zoom + two-finger angle & distance, rebaselined
  // every time the touch count changes (0->1, 1->2, 2->1) — not just once
  // at Grant. Without this, adding/removing a finger mid-gesture compares
  // against a stale baseline and produces one huge fake delta (zoom/roll
  // jumping to its clamp limit, which looks like a "reset").
  const gestureStartRef = useRef({ x: 0, y: 0, z: 0, zoom: 0, twistAngle: 0, pinchDistance: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const lastTouchCountRef = useRef(0);

  // onStartShouldSetPanResponder is only re-read by RN at the moment a touch
  // begins, not on every render — so gating it needs a ref (kept in sync
  // below) rather than reading isRotateGestureActive directly from closure.
  const isRotateGestureActiveRef = useRef(isRotateGestureActive);
  isRotateGestureActiveRef.current = isRotateGestureActive;

  const rebaselineGesture = (touches) => {
    gestureStartRef.current.x = rotXRef.current;
    gestureStartRef.current.y = rotYRef.current;
    gestureStartRef.current.z = rotZRef.current;
    gestureStartRef.current.zoom = zoomRef.current;
    if (touches.length === 2) {
      const [a, b] = touches;
      gestureStartRef.current.twistAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
      gestureStartRef.current.pinchDistance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
    } else if (touches.length === 1) {
      dragOriginRef.current = { x: touches[0].pageX, y: touches[0].pageY };
    }
    lastTouchCountRef.current = touches.length;
  };

  const fullScreenGestureResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isRotateGestureActiveRef.current,
      onMoveShouldSetPanResponder: () => isRotateGestureActiveRef.current,
      // Don't let a ScrollView/TouchableOpacity ancestor (e.g. the dock's
      // tab bar) steal the responder mid-drag — that would end the
      // gesture early and the next touch would start a fresh Grant,
      // which looks identical to "it reset".
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        lastTouchCountRef.current = 0; // force a rebaseline on the first move
        rebaselineGesture(evt.nativeEvent.touches);
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        // Finger count just changed (e.g. second finger landed for a
        // pinch, or one lifted back to a single-finger drag) — rebaseline
        // instead of applying a delta against stale numbers this frame.
        if (touches.length !== lastTouchCountRef.current) {
          rebaselineGesture(touches);
          return;
        }

        if (touches.length === 2) {
          // Two-finger: twist -> roll (Z), pinch distance -> zoom. Both
          // read the same two touch points, so they apply simultaneously —
          // pinch-out while twisting rotates and zooms at once.
          const [a, b] = touches;
          const angleNow = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          const deltaDeg = ((angleNow - gestureStartRef.current.twistAngle) * 180) / Math.PI;
          setRotationZ(clampRotation(gestureStartRef.current.z + deltaDeg));

          const distanceNow = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          const deltaDistance = distanceNow - gestureStartRef.current.pinchDistance;
          setZoom(clampZoom(gestureStartRef.current.zoom + deltaDistance * ZOOM_GESTURE_SENSITIVITY));
        } else if (touches.length === 1) {
          // Single-finger drag -> orbit. Horizontal = yaw (Y), vertical =
          // pitch (X, inverted so dragging up tilts up). Measured from raw
          // touch coordinates (not PanResponder's gestureState.dx/dy),
          // since that accumulates from Grant across the whole gesture and
          // would jump on a 2-finger-back-to-1-finger transition.
          const dx = touches[0].pageX - dragOriginRef.current.x;
          const dy = touches[0].pageY - dragOriginRef.current.y;
          setRotationY(clampRotation(gestureStartRef.current.y + dx * GESTURE_SENSITIVITY));
          setRotationX(clampRotation(gestureStartRef.current.x - dy * GESTURE_SENSITIVITY));
        }
      },
    })
  ).current;

  const whiteLevel = Math.round(brightness * 255);
  const brightnessColor = `rgb(${whiteLevel}, ${whiteLevel}, ${whiteLevel})`;
  const resolvedBackgroundColor = bgColor || brightnessColor;
  const toggleBottomOffset = controlsVisible ? dockHeight + 20 : 20;

  // ── Parts lookup — raw GLB node name -> your own { mesh, customName, details } ──
  const partsMap = useRef(new Map()).current;
  useEffect(() => {
    partsMap.clear();
    parts.forEach((p) => {
      if (p && p.mesh) partsMap.set(p.mesh, p);
    });
  }, [parts, partsMap]);

  // ── Raycast picking plumbing ──────────────────────────────────────────
  const raycaster = useRef(new Raycaster()).current;
  const pointerNDC = useRef(new Vector2()).current;
  const bridgeRef = useRef({ camera: null, scene: null });
  const canvasLayout = useRef({ width: 0, height: 0 });
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const onPartPressRef = useRef(onPartPress);
  useEffect(() => {
    onPartPressRef.current = onPartPress;
  });

  // ── Selection highlight (red) state ───────────────────────────────────
  // Tracks the currently-highlighted mesh so we can restore its original
  // color before highlighting a new one (or on deselect / unmount).
  const selectedRef = useRef({
    mesh: null,
    originalColor: null,
    originalEmissive: null,
  });

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

    // Tint toward TAP_OVERLAY_COLOR at TAP_OVERLAY_ALPHA — the original
    // color/texture stays visible underneath, just darkened, instead of
    // being replaced outright.
    mesh.material.color.lerp(TAP_OVERLAY_COLOR, TAP_OVERLAY_ALPHA);
  }, []);

  // Clear any highlight on unmount so a stale mesh reference never lingers.
  useEffect(() => {
    return () => clearHighlight();
  }, [clearHighlight]);

  const handlePick = useCallback((locationX, locationY) => {
    const { width, height } = canvasLayout.current;
    const { camera, scene } = bridgeRef.current;
    if (!camera || !scene || !width || !height) return;

    pointerNDC.x = (locationX / width) * 2 - 1;
    pointerNDC.y = -(locationY / height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    // Always clear the previous selection's color first — an empty-space
    // tap (or a tap on something with no mapped part) should deselect too.
    clearHighlight();

    if (hits.length > 0 && hits[0].object.isMesh) {
      const hitMesh = hits[0].object;

      // Highlight fires on any mesh hit, mapped or not — same as before.
      applyHighlight(hitMesh);

      // Debug trace of the raw node chain — always logged on tap, regardless
      // of whether it resolves to something in `parts`.
      let node = hitMesh;
      while (node) {
        console.log('  ->', node.name || '(unnamed)', node.type);
        node = node.parent;
      }

      const match = resolveMappedPart(hitMesh, partsMap);

      if (match) {
        console.log('Part tapped:', match.customName);
        onPartPressRef.current?.(match, hits[0]);
      } else {
        console.log('Part tapped: (not in parts map) ->', hitMesh.name || '(unnamed)');
      }
    }
  }, [raycaster, pointerNDC, clearHighlight, applyHighlight, partsMap]);

  // Only a true tap (small movement, quick release) triggers a raycast —
  // a drag/swipe used for camera control is ignored entirely, so this
  // never fires mid-gesture.
  const touchResponders = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e) => {
      touchStartRef.current = {
        x: e.nativeEvent.locationX,
        y: e.nativeEvent.locationY,
        time: Date.now(),
      };
    },
    onResponderRelease: (e) => {
      const { x, y, time } = touchStartRef.current;
      const dx = e.nativeEvent.locationX - x;
      const dy = e.nativeEvent.locationY - y;
      const moved = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - time;

      if (moved < TAP_MOVE_THRESHOLD && elapsed < TAP_TIME_THRESHOLD) {
        handlePick(e.nativeEvent.locationX, e.nativeEvent.locationY);
      }
    },
  };

  return (
    <View
      style={[
        styles.container,
        bgMode !== 'Image' && { backgroundColor: resolvedBackgroundColor },
        style,
      ]}
    >
      {bgMode === 'Image' && bgImage && (
        <Image source={bgImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}

      <View style={styles.canvasContainer} pointerEvents="none">
        <Canvas
          camera={{
            position: [0, 0, baseDistance],
            fov: cameraFov,
          }}
          onCreated={handleCanvasCreated}
        >
          {/* Default lights */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, 2, -5]} intensity={0.4} />

          <RaycastBridge bridgeRef={bridgeRef} />

          <SliderCameraRig
            rotationX={rotationX}
            rotationY={rotationY}
            rotationZ={rotationZ}
            zoom={zoom}
            panH={panH}
            panV={panV}
            baseDistance={baseDistance}
            targetX={targetX}
            targetY={targetY}
            targetZ={targetZ}
          />

          {children}
        </Canvas>
      </View>

      <View
        style={StyleSheet.absoluteFillObject}
        onLayout={(e) => {
          canvasLayout.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
        {...touchResponders}
      />

      {/* Full-screen orbit-drag layer — sits above tap-to-pick so a drag
          orbits instead of firing a pick, but ONLY while gesture mode is
          selected on the Rotate tab. pointerEvents="none" the rest of the
          time is what lets taps fall through to the layer above, and lets
          the dock's sliders/buttons and any modal keep working normally. */}
      <View
        style={StyleSheet.absoluteFillObject}
        pointerEvents={isRotateGestureActive ? 'auto' : 'none'}
        {...fullScreenGestureResponder.panHandlers}
      />

      {(title || onClose) && (
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.topBarContent}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {title}
            </Text>

            {onClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Floating controls toggle — always visible, bottom-right,
          rides up above the dock when it's open. */}
      <TouchableOpacity
        style={[
          styles.toggleButtonFloating,
          { bottom: toggleBottomOffset },
          !controlsVisible && styles.toggleButtonOff,
        ]}
        onPress={() => setControlsVisible((v) => !v)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.toggleButtonText}>{controlsVisible ? '✕' : '⚙️'}</Text>
      </TouchableOpacity>

      {/* Single control dock — replaces the old 4 scattered sliders */}
      {controlsVisible && (
        <ControlDock
          zoom={zoom}
          setZoom={setZoom}
          rotationX={rotationX}
          setRotationX={setRotationX}
          rotationY={rotationY}
          setRotationY={setRotationY}
          rotationZ={rotationZ}
          setRotationZ={setRotationZ}
          panH={panH}
          setPanH={setPanH}
          panV={panV}
          setPanV={setPanV}
          brightness={brightness}
          setBrightness={setBrightness}
          bgMode={bgMode}
          setBgMode={setBgMode}
          bgColor={bgColor}
          setBgColor={setBgColor}
          bgImage={bgImage}
          setBgImage={setBgImage}
          activeTab={activeTab}
          onSwitchTab={setActiveTab}
          rotateMode={rotateMode}
          setRotateMode={setRotateMode}
          onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(10, 10, 12, 0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    flex: 1,
    color: '#F5F5F7',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonText: {
    color: '#EDEDF0',
    fontSize: 15,
    fontWeight: '600',
  },

  // Floating controls toggle (bottom-right, independent of topBar)
  toggleButtonFloating: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.50)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  toggleButtonOff: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(0,25,200,0.5)',
  },
  toggleButtonText: {
    color: '#fd0b0b',
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── Control dock styles ────────────────────────────────────────────────────
const dock = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(20, 20, 24, 0.4)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  sliderArea: {
    alignItems: 'center',
    minHeight: 28,
    justifyContent: 'center',
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
    backgroundColor: 'rgba(99,102,241,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.7)',
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
  modeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  modeButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 6,
  },
  readoutItem: {
    alignItems: 'center',
  },
  readoutLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 1,
  },
  readoutValue: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  gesturePadHint: {
    fontSize: 9,
    lineHeight: 15,
    maxHeight: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
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
  tabBar: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  tab: {
    alignItems: 'center',
    gap: 1,
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(99,102,241,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.7)',
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