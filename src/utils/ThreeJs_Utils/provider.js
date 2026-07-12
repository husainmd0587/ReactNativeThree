
import React, { Suspense, useMemo, useEffect, useState, useCallback, useRef, createContext, useContext, memo } from 'react';
import {
  View, TouchableOpacity, Text, useWindowDimensions, StyleSheet, Animated,
  Platform, ScrollView, Alert,
} from 'react-native';
import { Canvas, useThree, useFrame } from '@react-three/fiber/native';
import {
  PerspectiveCamera, OrthographicCamera, Vector3, DataTexture, RGBAFormat, LinearFilter, MathUtils,
} from 'three';
import useControls from 'r3f-native-orbitcontrols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AnimatedReanimated, { useSharedValue, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { updateGesture } from '../store/slices/gestureSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Context for 3D scene state ────────────────────────────────────────────
const SceneContext = createContext();
export const useScene = () => useContext(SceneContext);
const canvasBackgrounds = [
  '#FFFFFF', '#E5E7EB', '#D6EAF8', '#D5F5E3', '#FDEBD0',
  '#374151', '#2F3E46', '#2C3E50', '#3E3E3E', '#1F2937',
];



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

export const Lightings = memo(() => (
  <>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 10]} intensity={15} castShadow />
    <directionalLight position={[-10, 5, -10]} intensity={8} />
    <directionalLight position={[0, -10, 0]} intensity={3} />
    <pointLight position={[0, 20, 0]} intensity={2} />
  </>
));

export const CanvaOnCreated = (state) => {
  state.gl.localClippingEnabled = true;
  const gl = state.gl.getContext();
  const original = gl.pixelStorei.bind(gl);
  gl.pixelStorei = (...args) => {
    if (args[0] === gl.UNPACK_FLIP_Y_WEBGL) return;
    return original(...args);
  };
};

export const Fallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>Sorry, WebGL not supported</Text>
  </View>
);

// ─── useGestureBridge ──────────────────────────────────────────────────────
export function useGestureBridge() {
  const dispatch = useDispatch();
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const pinchScale = useSharedValue(1);
  const pinchActive = useSharedValue(false);
  const lastSent = useSharedValue(0);
  const lastTranslation = useRef({ x: 0, y: 0 });

  const sendToRedux = useCallback((dx, dy) => {
    dispatch(updateGesture({ x: dx, y: dy }));
  }, [dispatch]);

  const onPanChange = useCallback((e) => {
    'worklet';
    const nextX = e.translationX ?? 0;
    const nextY = e.translationY ?? 0;
    const dx = nextX - lastTranslation.current.x;
    const dy = nextY - lastTranslation.current.y;
    lastTranslation.current = { x: nextX, y: nextY };
    vx.value += dx;
    vy.value += dy;
    const now = Date.now();
    if (now - lastSent.value > 50) {
      lastSent.value = now;
      runOnJS(sendToRedux)(dx, dy);
    }
  }, [lastSent, vx, vy, sendToRedux]);

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
    sendToRedux,
  };
}

// ─── OrbitGestureProvider ──────────────────────────────────────────────────
export function OrbitGestureProvider({
  children,
  enabled = true,
  onPanChange,
  onPanEnd,
  onPinchStart,
  onPinchChange,
  onPinchEnd,
}) {
  const composed = useMemo(() => {
    const pan = Gesture.Pan()
      .onChange(onPanChange)
      .onEnd(onPanEnd);
    const pinch = Gesture.Pinch()
      .onStart(onPinchStart)
      .onChange(onPinchChange)
      .onEnd(onPinchEnd);
    return Gesture.Simultaneous(pan, pinch);
  }, [onPanChange, onPanEnd, onPinchStart, onPinchChange, onPinchEnd]);

  if (!enabled) return <>{children}</>;

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
            const newZoom = MathUtils.clamp(camera.zoom * deltaRatio, 0.1, 5.0);
            camera.zoom = newZoom;
            camera.updateProjectionMatrix();
            emitZoom(newZoom);
          } else {
            spherical.current.radius = MathUtils.clamp(
              spherical.current.radius / deltaRatio,
              10,
              500
            );
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
const ZoomController = memo(({ onZoomIn, onZoomOut, zoomLevel, onReset }) => {
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
      <View style={S.zoomBar}>
        <View style={[S.zoomBarFill, { width: `${Math.min(zoomLevel * 100, 100)}%` }]} />
      </View>
    </View>
  );
});

// ─── FAB Components ──────────────────────────────────────────────────────
const ProFAB = memo(({ onPress, isOpen }) => {
  return (
    <View style={S.fabContainer}>
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
  orthographic,
  onToggleOrthographic,
  measurements,
  onToggleMeasurements,
  snapToGrid,
  onToggleSnapGrid,
  backgroundColor,
  onBackgroundColorChange,
  transparency,
  onToggleTransparency,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
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
              <ProToggleItem
                icon="⟳"
                label="Auto Rotate"
                value={autoRotate}
                onChange={onToggleAutoRotate}
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
              <Text style={S.colorPickerLabel}>Background Color</Text>
              <View style={S.colorOptions}>
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
              </View>
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
function AutoRotateController({ enabled }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled) return;
    const radius = camera.position.length();
    const angle = Date.now() * 0.0005;
    camera.position.x = radius * Math.sin(angle) * 0.7;
    camera.position.z = radius * Math.cos(angle) * 0.7;
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
  renderMode: 'Shaded',
  wireframe: false,
  shadows: true,
  autoRotate: false,
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
    console.error('Error saving settings:', error);
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
    console.error('Error loading settings:', error);
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
    console.error('Canvas Error:', error, errorInfo);
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
  const [zoomLevel, setZoomLevel]         = useState(1.0);
  const [messages, setMessages]           = useState('drag to rotate');
  const [renderMode, setRenderMode]           = useState('Shaded');
  const [wireframe, setWireframe]             = useState(false);
  const [shadows, setShadows]                 = useState(true);
  const [autoRotate, setAutoRotate]           = useState(false);
  const [orthographic, setOrthographic]       = useState(false);
  const [measurements, setMeasurements]       = useState(false);
  const [snapToGrid, setSnapToGrid]           = useState(false);
  const [transparency, setTransparency]       = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
 
  const [containerSize, setContainerSize] = useState({ width: windowWidth, height: windowHeight });
  const handleLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setContainerSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    }
  }, []);

  const [OrbitControls, events] = useControls();

  const settingsKey = useMemo(() => `${SETTINGS_KEY_PREFIX}_${instanceId}`, [instanceId]);
  const settingsRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const cameraRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    isInitialLoad.current = true;
    loadSettings(settingsKey).then(settings => {
      setCustomGesture(settings.customGesture || false);
      setActiveView(settings.activeView || 'iso');
      setShowGrid(settings.showGrid || false);
      setGridSize(settings.gridSize || 100);
      setAxesVisible(settings.axesVisible !== undefined ? settings.axesVisible : true);
      setBackgroundColor(settings.backgroundColor || '#1a1b1e');
      setRenderMode(settings.renderMode || 'Shaded');
      setWireframe(settings.wireframe || false);
      setShadows(settings.shadows !== undefined ? settings.shadows : true);
      setAutoRotate(settings.autoRotate || false);
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
      renderMode,
      wireframe,
      shadows,
      autoRotate,
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
    backgroundColor, renderMode, wireframe, shadows, autoRotate,
    orthographic, measurements, snapToGrid, transparency, zoomLevel,
    debouncedSave
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const panelWidth = useMemo(() => Math.min(containerSize.width * 0.8, 340), [containerSize.width]);

  const camera = useMemo(() => {
    const aspect = containerSize.width / containerSize.height;
    const cam = orthographic
      ? new OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 0.1, 1000)
      : new PerspectiveCamera(60, aspect, 0.1, 1000);
    cam.position.set(...initialCamPosition);
    cam.lookAt(0, 0, 0);
    cameraRef.current = cam;
    return cam;
  }, [containerSize.width, containerSize.height, orthographic, initialCamPosition]);

  // ─── Zoom Functions ─────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    if (!cameraRef.current) return;
    const newZoom = Math.min(zoomLevel * 1.15, 5.0);

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
    const newZoom = Math.max(zoomLevel * 0.85, 0.1);

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
          <OrbitGestureProvider
            enabled={customGesture}
            onPanChange={gesture.onPanChange}
            onPanEnd={gesture.onPanEnd}
            onPinchStart={gesture.onPinchStart}
            onPinchChange={gesture.onPinchChange}
            onPinchEnd={gesture.onPinchEnd}
          >
            <View style={StyleSheet.absoluteFill} {...canvasEvents}>
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
                  <CameraOrbitController
                    vx={gesture?.vx}
                    vy={gesture?.vy}
                    pinchScale={gesture?.pinchScale}
                    pinchActive={gesture?.pinchActive}
                    enabled={customGesture}
                    orthographic={orthographic}
                    onZoomChange={handleGestureZoomChange}
                  />
                  <AutoRotateController enabled={autoRotate} />
                  {children}
                </Suspense>

                <color attach="background" args={[backgroundColor]} />
                <Lightings />

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
                <Text style={S.statusText}>⟳</Text>
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

          {panelOpen && (
            <TouchableOpacity
              style={S.backdrop}
              activeOpacity={1}
              onPress={closePanel}
            />
          )}

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
            orthographic={orthographic}
            onToggleOrthographic={toggleOrthographic}
            measurements={measurements}
            onToggleMeasurements={toggleMeasurements}
            snapToGrid={snapToGrid}
            onToggleSnapGrid={toggleSnapGrid}
            backgroundColor={backgroundColor}
            onBackgroundColorChange={setBackgroundColor}
            transparency={transparency}
            onToggleTransparency={toggleTransparency}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onScreenshot={handleScreenshot}
            onResetToDefault={handleResetView}
            onClearMeasurements={handleClearMeasurements}
            onMeasureToolPress={handleMeasureToolPress}
          />

          <ProFAB onPress={togglePanel} isOpen={panelOpen} />
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
    zIndex: 14,
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
    zIndex: 20,
    elevation: 12,
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