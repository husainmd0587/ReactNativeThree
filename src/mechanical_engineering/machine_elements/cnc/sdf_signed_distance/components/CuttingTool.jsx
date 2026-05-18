import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  uniform float uTime;
  uniform float uSpindleSpeed;
  uniform vec3 uLightPosition;
  uniform vec3 uCameraPosition;
  uniform float uTemperature;
  
  void main() {
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    vec3 normal = vNormal;
    
    // Tool steel with heat tint
    vec3 baseColor = vec3(0.65, 0.65, 0.7);
    float temp = uTemperature;
    vec3 hotColor = mix(vec3(0.65, 0.65, 0.7), vec3(0.9, 0.3, 0.1), smoothstep(50.0, 200.0, temp));
    hotColor = mix(hotColor, vec3(1.0, 0.8, 0.2), smoothstep(200.0, 400.0, temp));
    
    // Flute pattern
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float flute = sin(angle * 4.0 + uTime * uSpindleSpeed * 0.1) * 0.5 + 0.5;
    float fluteMask = smoothstep(0.3, 0.7, flute);
    
    vec3 color = mix(baseColor * 0.8, hotColor, fluteMask);
    
    // Lighting
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
    
    vec3 ambient = vec3(0.15, 0.15, 0.18) * color;
    vec3 diffuse = vec3(0.8, 0.8, 0.9) * diff * color;
    vec3 specular = vec3(0.9, 0.9, 1.0) * spec;
    color = ambient + diffuse + specular;
    
    // Metal fresnel
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    color += vec3(0.2, 0.2, 0.3) * fresnel;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const CuttingTool = ({ tool, position, spindleSpeed, isCutting }) => {
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpindleSpeed: { value: spindleSpeed },
    uLightPosition: { value: new THREE.Vector3(10, 20, 10) },
    uCameraPosition: { value: new THREE.Vector3() },
    uTemperature: { value: 20 }
  }), [spindleSpeed]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
      
      const targetTemp = isCutting ? 120 + Math.random() * 50 : 20;
      const currentTemp = materialRef.current.uniforms.uTemperature.value;
      materialRef.current.uniforms.uTemperature.value += (targetTemp - currentTemp) * 0.1;
    }
    
    if (meshRef.current) {
      meshRef.current.position.set(...position);
      // Tool rotation
      meshRef.current.rotation.y = state.clock.elapsedTime * spindleSpeed * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Shank */}
      <mesh position={[0, tool.length * 0.25, 0]}>
        <cylinderGeometry args={[tool.radius * 0.8, tool.radius * 0.8, tool.length * 0.5, 16]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      {/* Cutting tip */}
      <mesh position={[0, -tool.length * 0.25, 0]}>
        <cylinderGeometry args={[tool.radius, tool.radius * 0.3, tool.length * 0.5, tool.fluteCount * 2]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      {/* Holder */}
      <mesh position={[0, tool.length * 0.6, 0]}>
        <cylinderGeometry args={[tool.radius * 1.5, tool.radius * 1.2, tool.length * 0.3, 16]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
};