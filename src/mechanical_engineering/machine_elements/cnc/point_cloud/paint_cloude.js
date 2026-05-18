import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ═════════════════════════════════════════════
// CRITICAL FIX: Polyfill screen.orientation
// for @react-three/fiber in React Native
// ═════════════════════════════════════════════
if (typeof global !== 'undefined') {
  if (!global.screen) global.screen = {};
  if (!global.screen.orientation) {
    global.screen.orientation = {
      angle: 0,
      type: 'portrait-primary',
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
  }
}
if (typeof window !== 'undefined' && window.screen && !window.screen.orientation) {
  window.screen.orientation = {
    angle: 0,
    type: 'portrait-primary',
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}

// ═════════════════════════════════════════════
// ERROR BOUNDARY
// ═════════════════════════════════════════════
class PointCloudErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PointCloud Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Point Cloud Error</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Something went wrong rendering the 3D scene.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ═════════════════════════════════════════════
// CAMERA CONTROLLER (Inside Canvas!)
// useFrame MUST be called from a component
// that is a child of <Canvas>
// ═════════════════════════════════════════════
function CameraController({ orbitStateRef }) {
  useFrame(() => {
    if (!orbitStateRef.current?.camera) return;
    const { camera, spherical, target } = orbitStateRef.current;
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    camera.position.copy(offset.add(target));
    camera.lookAt(target);
  });
  return null;
}

// ═════════════════════════════════════════════
// 1) LASER SIMULATION
// ═════════════════════════════════════════════
function LaserPointCloud({ count = 40000, intensity = 1.0 }) {
  const pointsRef = useRef();

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color('#ff0040');
    const c2 = new THREE.Color('#ffaa00');
    const c3 = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const radius = Math.sqrt(Math.random()) * 0.3;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (t - 0.5) * 6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const mix = Math.random();
      const c = new THREE.Color();
      if (mix < 0.3) c.copy(c3);
      else if (mix < 0.7) c.copy(c1);
      else c.copy(c2);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material;
    if (mat) {
      mat.size = (Math.sin(state.clock.elapsedTime * 10) * 0.5 + 1.5) * intensity;
    }
    pointsRef.current.rotation.y += 0.002;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ═════════════════════════════════════════════
// 2) VFX PARTICLES
// ═════════════════════════════════════════════
function VFXParticles({ count = 60000, shape = 'explosion' }) {
  const meshRef = useRef();

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#00ffff'),
      new THREE.Color('#ff00ff'),
      new THREE.Color('#ffff00'),
      new THREE.Color('#00ff00'),
      new THREE.Color('#ff4400'),
    ];

    for (let i = 0; i < count; i++) {
      if (shape === 'explosion') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 1 / 3) * 2;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        velocities[i * 3] = positions[i * 3] * (0.5 + Math.random());
        velocities[i * 3 + 1] = positions[i * 3 + 1] * (0.5 + Math.random());
        velocities[i * 3 + 2] = positions[i * 3 + 2] * (0.5 + Math.random());
      } else {
        const angle = Math.random() * Math.PI * 4;
        const radius = Math.random() * 3;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        velocities[i * 3] = -Math.sin(angle) * 0.02;
        velocities[i * 3 + 1] = Math.random() * 0.01;
        velocities[i * 3 + 2] = Math.cos(angle) * 0.02;
      }
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geometry: g, velocities };
  }, [count, shape]);

  useFrame(() => {
    if (!meshRef.current) return;
    const posArray = meshRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3] * 0.016;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * 0.016;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;
      const dist = Math.sqrt(
        posArray[i * 3] ** 2 + posArray[i * 3 + 1] ** 2 + posArray[i * 3 + 2] ** 2
      );
      if (dist > 8) {
        posArray[i * 3] = (Math.random() - 0.5) * 0.1;
        posArray[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y += 0.001;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={1.5}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ═════════════════════════════════════════════
// 3) MACHINING POINT CLOUD
// ═════════════════════════════════════════════
function MachiningPointCloud({ count = 50000, toolPath = 'spiral' }) {
  const pointsRef = useRef();

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    if (toolPath === 'spiral') {
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 20;
        const radius = t * 2;
        pos[i * 3] = Math.cos(angle) * radius;
        pos[i * 3 + 1] = Math.sin(t * Math.PI * 4) * 0.3 + (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 2] = Math.sin(angle) * radius;
      }
    } else if (toolPath === 'grid') {
      const gridSize = Math.ceil(Math.cbrt(count));
      let idx = 0;
      for (let x = 0; x < gridSize && idx < count; x++) {
        for (let y = 0; y < gridSize && idx < count; y++) {
          for (let z = 0; z < gridSize && idx < count; z++) {
            pos[idx * 3] = (x / gridSize - 0.5) * 4 + (Math.random() - 0.5) * 0.05;
            pos[idx * 3 + 1] = (y / gridSize - 0.5) * 4 + (Math.random() - 0.5) * 0.05;
            pos[idx * 3 + 2] = (z / gridSize - 0.5) * 4 + (Math.random() - 0.5) * 0.05;
            idx++;
          }
        }
      }
    } else if (toolPath === 'surface') {
      const res = Math.ceil(Math.sqrt(count));
      for (let i = 0; i < count; i++) {
        const u = (i % res) / res;
        const v = Math.floor(i / res) / res;
        pos[i * 3] = (u - 0.5) * 4;
        pos[i * 3 + 1] =
          Math.sin(u * Math.PI * 2) * Math.cos(v * Math.PI * 2) * 0.5 +
          (Math.random() - 0.5) * 0.02;
        pos[i * 3 + 2] = (v - 0.5) * 4;
      }
    }
    const cols = new Float32Array(count * 3);
    const c1 = new THREE.Color('#4488ff');
    const c2 = new THREE.Color('#ff6644');
    for (let i = 0; i < count; i++) {
      const c = c1.clone().lerp(c2, Math.random());
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [count, toolPath]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    pointsRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.15) * 0.1;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={1.8}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ═════════════════════════════════════════════
// SCENE (Everything inside Canvas goes here)
// ═════════════════════════════════════════════
function Scene({ mode, subMode, orbitStateRef }) {
  return (
    <>
      <CameraController orbitStateRef={orbitStateRef} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4488ff" />
      {mode === 'laser' && <LaserPointCloud count={40000} intensity={1.2} />}
      {mode === 'vfx' && <VFXParticles count={60000} shape={subMode} />}
      {mode === 'machining' && <MachiningPointCloud count={50000} toolPath={subMode} />}
    </>
  );
}

// ═════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════
export default function PointCloudScreen() {
  const [mode, setMode] = useState('laser');
  const [subMode, setSubMode] = useState('explosion');

  // Orbit state stored in a ref so PanResponder can update it
  // and CameraController (inside Canvas) can read it
  const orbitStateRef = useRef({
    camera: null,
    spherical: new THREE.Spherical(5, Math.PI / 2.5, 0),
    target: new THREE.Vector3(0, 0, 0),
    panStart: { x: 0, y: 0 },
  });

  // PanResponder for touch orbit controls (outside Canvas)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          orbitStateRef.current.panStart = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          };
        },
        onPanResponderMove: (evt, gestureState) => {
          const dx = gestureState.moveX - orbitStateRef.current.panStart.x;
          const dy = gestureState.moveY - orbitStateRef.current.panStart.y;
          const sph = orbitStateRef.current.spherical;
          sph.theta -= dx * 0.005;
          sph.phi -= dy * 0.005;
          sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi));
          orbitStateRef.current.panStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          };
        },
      }),
    []
  );

  const modes = [
    { key: 'laser', label: 'Laser Simulation', subs: ['beam'] },
    { key: 'vfx', label: 'Visual Effects', subs: ['explosion', 'swirl'] },
    { key: 'machining', label: 'Machining', subs: ['spiral', 'grid', 'surface'] },
  ];

  const currentMode = modes.find((m) => m.key === mode);

  return (
    <PointCloudErrorBoundary>
      <View style={styles.container}>
        <View style={styles.canvasContainer}>
          <Canvas
            style={{ flex: 1 }}
            camera={{ position: [0, 0, 5], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={(state) => {
              orbitStateRef.current.camera = state.camera;
            }}
          >
            <Scene mode={mode} subMode={subMode} orbitStateRef={orbitStateRef} />
          </Canvas>
          {/* Touch overlay for orbit controls */}
          <View
            style={StyleSheet.absoluteFill}
            {...panResponder.panHandlers}
            pointerEvents="auto"
          />
        </View>

        <View style={styles.controls}>
          <Text style={styles.title}>Point Cloud Tech System</Text>
          <Text style={styles.subtitle}>Millions of particles via Three.js</Text>

          <View style={styles.modeRow}>
            {modes.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
                onPress={() => {
                  setMode(m.key);
                  setSubMode(m.subs[0]);
                }}
              >
                <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {currentMode && currentMode.subs.length > 1 && (
            <View style={styles.subRow}>
              {currentMode.subs.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.subBtn, subMode === s && styles.subBtnActive]}
                  onPress={() => setSubMode(s)}
                >
                  <Text style={[styles.subText, subMode === s && styles.subTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
            <Text style={styles.infoTitle}>
              {mode === 'laser'
                ? 'Laser Simulation'
                : mode === 'vfx'
                ? 'Visual Effects'
                : 'Experimental Machining'}
            </Text>
            <Text style={styles.infoBody}>
              {mode === 'laser' &&
                'Simulates high-power laser beams with additive blending. Each point represents a photon interaction point. Colors shift from white-hot core to red-orange edges.'}
              {mode === 'vfx' &&
                `Particle system with ${
                  subMode === 'explosion' ? 'spherical dispersion' : 'spiral orbital motion'
                }. Uses additive blending for glow effects. Particles recycle when they exceed boundary.`}
              {mode === 'machining' &&
                `Tool path visualization using ${subMode} pattern. Point density maps to surface complexity. Colors indicate thermal gradient from cool steel (blue) to hot cutting zones (orange).`}
            </Text>
          </ScrollView>
        </View>
      </View>
    </PointCloudErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  canvasContainer: { flex: 1, minHeight: SCREEN_H * 0.55 },
  controls: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    minHeight: SCREEN_H * 0.4,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#8888aa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#333344',
  },
  modeBtnActive: {
    backgroundColor: '#3366ff',
    borderColor: '#5588ff',
  },
  modeText: {
    color: '#8888aa',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#1a1a28',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  subBtnActive: {
    backgroundColor: '#2244aa',
    borderColor: '#4466cc',
  },
  subText: {
    color: '#666688',
    fontSize: 12,
    fontWeight: '500',
  },
  subTextActive: {
    color: '#ffffff',
  },
  infoPanel: {
    maxHeight: 120,
    marginTop: 8,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoBody: {
    color: '#aaaacc',
    fontSize: 13,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    color: '#aaaacc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#3366ff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});