
import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import CanvaProvider from '../../../../provider'
import * as THREE from 'three';

// ─── Constants ──────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CARVE_MAP_SIZE = 512;        // GPU texture resolution
const MATERIAL_SEGMENTS = 128;    // mesh subdivision
const MAX_CARVE_DEPTH = 0.55;     // max displacement in local units
const INITIAL_CARVE_VALUE = 0.0;  // 0 = uncut, 1 = fully removed

const TOOL_TYPES = {
  MILL:    { label: 'End Mill',     radius: 0.04, depth: 0.08, icon: '⚙️' },
  LATHE:   { label: 'Lathe',        radius: 0.07, depth: 0.05, icon: '🔄' },
  DRILL:   { label: 'Drill',        radius: 0.025, depth: 0.15, icon: '🔩' },
  GRINDER: { label: 'Grinder',      radius: 0.10, depth: 0.03, icon: '💨' },
};

const MATERIALS = {
  STEEL:    { label: 'Steel',    color: '#8ab4d4', roughness: 0.3, metalness: 0.9 },
  ALUMINUM: { label: 'Aluminum', color: '#c8d8e8', roughness: 0.2, metalness: 0.85 },
  WOOD:     { label: 'Wood',     color: '#c8a97a', roughness: 0.85, metalness: 0.0 },
  PLASTIC:  { label: 'Plastic',  color: '#6eb5a0', roughness: 0.55, metalness: 0.0 },
};

// ─── Carve-Pass Shader ───────────────────────────────────────────────────────
// Reads current carve texture, paints a circular stamp at toolUV, outputs updated depth.

const carveVertGLSL = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const carveFragGLSL = /* glsl */`
  uniform sampler2D uCarveMap;   // current carve state [0..1]
  uniform vec2  uToolUV;         // tool centre in UV space
  uniform float uToolRadius;     // normalised UV radius
  uniform float uCarveAmount;    // how much to carve this frame [0..1]
  uniform int   uToolType;       // 0=mill 1=lathe 2=drill 3=grinder
  uniform float uTime;

  varying vec2 vUv;

  float sdCircle(vec2 p, float r) { return length(p) - r; }

  void main() {
    float current = texture2D(uCarveMap, vUv).r;

    vec2  delta = vUv - uToolUV;
    float dist  = length(delta);
    float r     = uToolRadius;

    float stamp = 0.0;

    if (uToolType == 0) {
      // End mill — flat bottom cylinder
      float edge = smoothstep(r, r * 0.7, dist);
      stamp = edge * uCarveAmount;
    } else if (uToolType == 1) {
      // Lathe — gaussian bell
      float g = exp(-dist * dist / (r * r * 0.5));
      stamp = g * uCarveAmount;
    } else if (uToolType == 2) {
      // Drill — sharp centre peak
      float peak = exp(-dist * dist / (r * r * 0.15));
      stamp = peak * uCarveAmount * 1.5;
    } else {
      // Grinder — noisy wide brush
      float noise = fract(sin(dot(vUv * 200.0 + uTime, vec2(127.1, 311.7))) * 43758.5);
      float soft  = smoothstep(r, r * 0.3, dist) * (0.6 + 0.4 * noise);
      stamp = soft * uCarveAmount;
    }

    float updated = min(1.0, current + stamp);
    gl_FragColor = vec4(updated, updated, updated, 1.0);
  }
`;

// ─── Display-Pass Shaders ────────────────────────────────────────────────────
// Displaces vertices downward from carve map, shades with metallic/diffuse model.

const displayVertGLSL = /* glsl */`
  uniform sampler2D uCarveMap;
  uniform float     uMaxDepth;
  uniform float     uTime;

  varying vec2  vUv;
  varying float vDepth;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  // Finite-difference normal from carve map
  vec3 carveNormal(vec2 uv, float texel) {
    float h0 = texture2D(uCarveMap, uv).r;
    float hx = texture2D(uCarveMap, uv + vec2(texel, 0.0)).r;
    float hy = texture2D(uCarveMap, uv + vec2(0.0, texel)).r;
    vec3 dx = vec3(texel * 2.0, 0.0, (hx - h0) * uMaxDepth);
    vec3 dy = vec3(0.0, texel * 2.0, (hy - h0) * uMaxDepth);
    return normalize(cross(dx, dy));
  }

  void main() {
    vUv   = uv;
    float d = texture2D(uCarveMap, uv).r;
    vDepth = d;

    float texel = 1.0 / 512.0;
    vNormal = carveNormal(uv, texel);

    vec3 displaced = position - normal * d * uMaxDepth;
    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const displayFragGLSL = /* glsl */`
  uniform vec3  uBaseColor;
  uniform float uRoughness;
  uniform float uMetalness;
  uniform float uTime;
  uniform vec3  uLightPos;
  uniform vec3  uCameraPos;

  varying vec2  vUv;
  varying float vDepth;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  // Simple PBR-ish lighting (no IBL, good for mobile)
  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  float ggxD(float NdotH, float alpha) {
    float a2 = alpha * alpha;
    float d  = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
    return a2 / (3.14159 * d * d);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vWorldPos);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);

    vec3 F0  = mix(vec3(0.04), uBaseColor, uMetalness);
    vec3 F   = fresnelSchlick(NdotV, F0);
    float D  = ggxD(NdotH, uRoughness * uRoughness);

    vec3 spec    = F * D * 0.25;
    vec3 diffuse = (1.0 - F) * (1.0 - uMetalness) * uBaseColor / 3.14159;

    // Cut cavity darkening + tool mark highlights
    float cavityAO  = 1.0 - vDepth * 0.7;
    float rimLight  = pow(1.0 - NdotV, 3.0) * 0.4;

    // Micro-scratch iridescence on metal
    float scratchAngle = fract(vUv.x * 80.0 + vUv.y * 40.0);
    float iridescence  = uMetalness * sin(scratchAngle * 6.28 + uTime * 0.5) * 0.06 * vDepth;

    vec3 ambient = uBaseColor * 0.12 * cavityAO;
    vec3 colour  = ambient
                 + (diffuse + spec) * NdotL * cavityAO * 2.2
                 + vec3(rimLight)
                 + vec3(iridescence);

    // Warm depth tint for freshly-cut material
    vec3 cutTint = mix(vec3(1.0), vec3(1.1, 0.85, 0.6), vDepth * 0.4);
    colour *= cutTint;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

// ─── GPU Carve System ────────────────────────────────────────────────────────

function useCarveGPU() {
  const { gl } = useThree();

  const rtA = useMemo(() => new THREE.WebGLRenderTarget(CARVE_MAP_SIZE, CARVE_MAP_SIZE, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  }), []);

  const rtB = useMemo(() => rtA.clone(), [rtA]);

  // Ping-pong refs
  const pingRef = useRef(rtA);
  const pongRef = useRef(rtB);

  const carveScene  = useMemo(() => new THREE.Scene(), []);
  const carveCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  const carveUniforms = useMemo(() => ({
    uCarveMap:    { value: null },
    uToolUV:      { value: new THREE.Vector2(0.5, 0.5) },
    uToolRadius:  { value: 0.06 },
    uCarveAmount: { value: 0.0 },
    uToolType:    { value: 0 },
    uTime:        { value: 0 },
  }), []);

  const carveMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: carveVertGLSL,
    fragmentShader: carveFragGLSL,
    uniforms: carveUniforms,
  }), [carveUniforms]);

  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), carveMat);
    carveScene.add(quad);

    // Initialise both RTs to black (uncut)
    const initMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const initMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMat);
    const tmpScene = new THREE.Scene();
    tmpScene.add(initMesh);
    gl.setRenderTarget(rtA); gl.render(tmpScene, carveCamera);
    gl.setRenderTarget(rtB); gl.render(tmpScene, carveCamera);
    gl.setRenderTarget(null);
    initMat.dispose(); initMesh.geometry.dispose();

    return () => {
      rtA.dispose(); rtB.dispose();
      carveMat.dispose();
    };
  }, [gl, rtA, rtB, carveMat, carveScene, carveCamera]);

  const carve = useCallback((toolUV, toolRadius, carveAmount, toolType, time) => {
    carveUniforms.uCarveMap.value    = pingRef.current.texture;
    carveUniforms.uToolUV.value.set(toolUV.x, toolUV.y);
    carveUniforms.uToolRadius.value  = toolRadius;
    carveUniforms.uCarveAmount.value = carveAmount;
    carveUniforms.uToolType.value    = toolType;
    carveUniforms.uTime.value        = time;

    gl.setRenderTarget(pongRef.current);
    gl.render(carveScene, carveCamera);
    gl.setRenderTarget(null);

    // Swap ping-pong
    const tmp = pingRef.current;
    pingRef.current = pongRef.current;
    pongRef.current = tmp;
  }, [gl, carveScene, carveCamera, carveUniforms]);

  const reset = useCallback(() => {
    const initMat   = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const initMesh  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMat);
    const tmpScene  = new THREE.Scene();
    tmpScene.add(initMesh);
    gl.setRenderTarget(rtA); gl.render(tmpScene, carveCamera);
    gl.setRenderTarget(rtB); gl.render(tmpScene, carveCamera);
    gl.setRenderTarget(null);
    initMat.dispose(); initMesh.geometry.dispose();
    pingRef.current = rtA;
    pongRef.current = rtB;
  }, [gl, rtA, rtB, carveCamera]);

  return { carveTexture: pingRef, carve, reset };
}

// ─── Material Block Mesh ─────────────────────────────────────────────────────

function MaterialBlock({ carveTexture, activeTool, activeMaterial, toolRef, isCarving }) {
  const meshRef = useRef();
  const { camera } = useThree();

  const displayUniforms = useMemo(() => ({
    uCarveMap:   { value: null },
    uMaxDepth:   { value: MAX_CARVE_DEPTH },
    uBaseColor:  { value: new THREE.Color(activeMaterial.color) },
    uRoughness:  { value: activeMaterial.roughness },
    uMetalness:  { value: activeMaterial.metalness },
    uTime:       { value: 0 },
    uLightPos:   { value: new THREE.Vector3(2, 3, 2) },
    uCameraPos:  { value: new THREE.Vector3(0, 0, 3) },
  }), [activeMaterial]);

  const displayMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: displayVertGLSL,
    fragmentShader: displayFragGLSL,
    uniforms: displayUniforms,
    side: THREE.FrontSide,
  }), [displayUniforms]);

  useEffect(() => {
    displayUniforms.uBaseColor.value.set(activeMaterial.color);
    displayUniforms.uRoughness.value = activeMaterial.roughness;
    displayUniforms.uMetalness.value = activeMaterial.metalness;
  }, [activeMaterial, displayUniforms]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    displayUniforms.uCarveMap.value = carveTexture.current.texture;
    displayUniforms.uTime.value     = clock.getElapsedTime();
    displayUniforms.uCameraPos.value.copy(camera.position);

    // Gentle rotation when idle
    if (!isCarving) {
      meshRef.current.rotation.y += 0.003;
    }
  });

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1.8, 0.4, 1.8, MATERIAL_SEGMENTS, 4, MATERIAL_SEGMENTS);
    // Only top face should be carved — UV layout maps top face to full [0,1] space
    // Three.js BoxGeometry face order: px, nx, py, ny, pz, nz
    // We remap top-face (py) UVs, leave others for side display
    return g;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} material={displayMat} castShadow receiveShadow />
  );
}

// ─── Tool Visualiser ─────────────────────────────────────────────────────────

function ToolMarker({ toolRef, activeTool }) {
  const markerRef = useRef();

  useFrame(() => {
    if (!markerRef.current || !toolRef.current) return;
    markerRef.current.position.copy(toolRef.current);
    markerRef.current.visible = toolRef.current.visible ?? true;
  });

  const r = activeTool.radius * 9;  // scale to world
  return (
    <group ref={markerRef}>
      {/* Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, r * 0.08, 8, 32]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.9} />
      </mesh>
      {/* Centre dot */}
      <mesh>
        <sphereGeometry args={[r * 0.15, 8, 8]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
      {/* Depth indicator shaft */}
      <mesh position={[0, -activeTool.depth * 3, 0]}>
        <cylinderGeometry args={[r * 0.3, r * 0.1, activeTool.depth * 6, 12]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ─── Particle Chips ──────────────────────────────────────────────────────────

function ChipParticles({ isCarving, activeMaterialColor }) {
  const points = useRef();
  const count = 120;

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count).fill(0);
    return { positions: pos, velocities: vel, lifetimes: life };
  }, []);

  const posAttr = useMemo(() => new THREE.BufferAttribute(positions, 3), [positions]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      if (isCarving && Math.random() < 0.15) {
        // Spawn at random surface point
        positions[i * 3 + 0] = (Math.random() - 0.5) * 1.4;
        positions[i * 3 + 1] = 0.18;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
        velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.04;
        velocities[i * 3 + 1] = 0.03 + Math.random() * 0.05;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
        lifetimes[i] = 1.0;
      }
      if (lifetimes[i] > 0) {
        positions[i * 3 + 0] += velocities[i * 3 + 0];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];
        velocities[i * 3 + 1] -= 0.003; // gravity
        lifetimes[i] -= 0.03;
      } else {
        positions[i * 3] = 0; positions[i * 3 + 1] = -10; positions[i * 3 + 2] = 0;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" {...posAttr} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={activeMaterialColor}
        size={0.018}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Grid & Environment ───────────────────────────────────────────────────────

function WorkBench() {
  return (
    <group>
      {/* Grid floor */}
      <gridHelper args={[10, 20, '#1a3a5c', '#0d1f2e']} position={[0, -0.35, 0]} />
      {/* Base platform */}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.35, 2.6]} />
        <meshStandardMaterial color="#0d1f2e" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* Ambient rim strips */}
      <mesh position={[0, -0.36, 0]}>
        <boxGeometry args={[2.62, 0.02, 2.62]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} color="#b0d0ff" />
      <directionalLight position={[3, 5, 3]} intensity={1.6} color="#ffffff" castShadow />
      <pointLight position={[-2, 2, -2]} intensity={0.8} color="#ff8844" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#44aaff" />
    </>
  );
}

// ─── Scene Root ───────────────────────────────────────────────────────────────

function Scene({ toolEventRef, activeTool, activeMaterial, onReset }) {
  const toolRef  = useRef(new THREE.Vector3(0, 0.3, 0));
  const { carveTexture, carve, reset: resetCarve } = useCarveGPU();
  const { camera, size } = useThree();
  const raycaster  = useMemo(() => new THREE.Raycaster(), []);
  const hitPlane   = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  ), []);
  hitPlane.rotation.x = -Math.PI / 2;
  hitPlane.position.y = 0.2;

  const isCarvingRef = useRef(false);
  const [isCarving, setIsCarving] = useState(false);

  // Expose event API to parent
  useEffect(() => {
    toolEventRef.current = {
      onPointerMove: (normX, normY) => {
        const ndc = new THREE.Vector2(normX * 2 - 1, -(normY * 2 - 1));
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(hitPlane);
        if (hits.length > 0) {
          toolRef.current.copy(hits[0].point);
          toolRef.current.y = 0.22;
        }
      },
      onPointerDown: () => { isCarvingRef.current = true; setIsCarving(true); },
      onPointerUp:   () => { isCarvingRef.current = false; setIsCarving(false); },
    };
  }, [camera, raycaster, hitPlane, toolEventRef]);

  const toolTypeIndex = useMemo(
    () => Object.keys(TOOL_TYPES).indexOf(activeTool),
    [activeTool]
  );
  const toolDef = TOOL_TYPES[activeTool];

  useFrame(({ clock }) => {
    if (!isCarvingRef.current) return;

    // Map world position to UV
    const worldX = toolRef.current.x;
    const worldZ = toolRef.current.z;
    const uvX = THREE.MathUtils.clamp((worldX / 1.8) * 0.5 + 0.5, 0, 1);
    const uvY = THREE.MathUtils.clamp((worldZ / 1.8) * 0.5 + 0.5, 0, 1);

    carve(
      { x: uvX, y: uvY },
      toolDef.radius,
      toolDef.depth * 0.12,
      toolTypeIndex,
      clock.getElapsedTime()
    );
  });

  const handleReset = useCallback(() => {
    resetCarve();
    if (onReset) onReset();
  }, [resetCarve, onReset]);

  useEffect(() => {
    if (toolEventRef.current) toolEventRef.current.reset = handleReset;
  }, [handleReset, toolEventRef]);

  return (
    <>
      <Lights />
      <WorkBench />
      <MaterialBlock
        carveTexture={carveTexture}
        activeTool={toolDef}
        activeMaterial={MATERIALS[activeMaterial]}
        toolRef={toolRef}
        isCarving={isCarving}
      />
      <ToolMarker toolRef={toolRef} activeTool={toolDef} />
      <ChipParticles isCarving={isCarving} activeMaterialColor={MATERIALS[activeMaterial].color} />
    </>
  );
}

// ─── UI Overlay ───────────────────────────────────────────────────────────────

function ToolButton({ id, tool, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toolBtn, active && styles.toolBtnActive]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <Text style={styles.toolIcon}>{tool.icon}</Text>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{tool.label}</Text>
    </TouchableOpacity>
  );
}

function MaterialButton({ id, mat, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.matBtn, active && styles.matBtnActive]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={[styles.matSwatch, { backgroundColor: mat.color }]} />
      <Text style={[styles.matLabel, active && styles.matLabelActive]}>{mat.label}</Text>
    </TouchableOpacity>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function GpuTexturing() {
  const [activeTool, setActiveTool]         = useState('MILL');
  const [activeMaterial, setActiveMaterial] = useState('STEEL');
  const [resetKey, setResetKey]             = useState(0);
  const toolEventRef = useRef(null);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      const normX = locationX / SCREEN_W;
      const normY = locationY / SCREEN_H;
      toolEventRef.current?.onPointerMove(normX, normY);
      toolEventRef.current?.onPointerDown();
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      const normX = locationX / SCREEN_W;
      const normY = locationY / SCREEN_H;
      toolEventRef.current?.onPointerMove(normX, normY);
    },
    onPanResponderRelease: () => {
      toolEventRef.current?.onPointerUp();
    },
    onPanResponderTerminate: () => {
      toolEventRef.current?.onPointerUp();
    },
  }), []);

  const handleReset = () => setResetKey(k => k + 1);

  return (
    <View style={styles.root}>
      {/* 3D Canvas */}
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <CanvaProvider camPosition={[2,2,6]}>
          <Scene
            toolEventRef={toolEventRef}
            activeTool={activeTool}
            activeMaterial={activeMaterial}
            onReset={handleReset}
          />
        </CanvaProvider>
      </View>

      {/* HUD Header */}
      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerTitle}>GPU CARVE SIM</Text>
        <Text style={styles.headerSub}>Drag surface to cut · {MATERIAL_SEGMENTS}×{MATERIAL_SEGMENTS} mesh</Text>
      </View>

      {/* Tool Selector */}
      <View style={styles.toolBar}>
        {Object.entries(TOOL_TYPES).map(([id, tool]) => (
          <ToolButton key={id} id={id} tool={tool} active={activeTool === id} onPress={setActiveTool} />
        ))}
      </View>

      {/* Material Selector */}
      <View style={styles.matBar}>
        {Object.entries(MATERIALS).map(([id, mat]) => (
          <MaterialButton key={id} id={id} mat={mat} active={activeMaterial === id} onPress={setActiveMaterial} />
        ))}
      </View>

      {/* Reset */}
      <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
        <Text style={styles.resetLabel}>↺  RESET</Text>
      </TouchableOpacity>

      {/* Info badges */}
      <View style={styles.infoBadges} pointerEvents="none">
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>GPU TEXTURE</Text>
          <Text style={styles.badgeVal}>{CARVE_MAP_SIZE}×{CARVE_MAP_SIZE}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>PING-PONG RT</Text>
          <Text style={styles.badgeVal}>2× FBO</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>VERT DISPLACE</Text>
          <Text style={styles.badgeVal}>{MAX_CARVE_DEPTH * 100 | 0}%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050d18',
  },
  canvasContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },

  // ── Header
  header: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#00ccff',
    textShadowColor: '#0066ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    color: '#4488aa',
    marginTop: 3,
  },

  // ── Tool Bar
  toolBar: {
    position: 'absolute',
    left: 14,
    top: '30%',
    gap: 10,
  },
  toolBtn: {
    width: 72,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,20,40,0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3a5c',
    alignItems: 'center',
  },
  toolBtnActive: {
    borderColor: '#00ccff',
    backgroundColor: 'rgba(0,100,200,0.25)',
  },
  toolIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#4488aa',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  toolLabelActive: {
    color: '#00ccff',
  },

  // ── Material Bar
  matBar: {
    position: 'absolute',
    right: 14,
    top: '30%',
    gap: 10,
  },
  matBtn: {
    width: 72,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,20,40,0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3a5c',
    alignItems: 'center',
  },
  matBtnActive: {
    borderColor: '#ffaa00',
    backgroundColor: 'rgba(180,100,0,0.2)',
  },
  matSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  matLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#4488aa',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  matLabelActive: {
    color: '#ffcc44',
  },

  // ── Reset
  resetBtn: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    paddingVertical: 13,
    paddingHorizontal: 36,
    backgroundColor: 'rgba(0,20,40,0.85)',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#ff4422',
  },
  resetLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#ff5533',
  },

  // ── Info badges
  infoBadges: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(0,20,40,0.7)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1a3a5c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 7,
    letterSpacing: 1,
    color: '#4488aa',
  },
  badgeVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: '#00ccff',
    letterSpacing: 1,
  },
});