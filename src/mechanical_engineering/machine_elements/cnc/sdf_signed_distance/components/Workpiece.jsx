import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
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
  precision highp sampler3D;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  uniform sampler3D uSDFTexture;
  uniform vec3 uWorkpieceBoundsMin;
  uniform vec3 uWorkpieceBoundsMax;
  uniform vec3 uToolPosition;
  uniform float uToolRadius;
  uniform float uCutDepth;
  uniform vec3 uCameraPosition;
  uniform float uTime;
  
  float sdCylinder(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }
  
  float sampleSDF(vec3 pos) {
    vec3 texCoord = (pos - uWorkpieceBoundsMin) / (uWorkpieceBoundsMax - uWorkpieceBoundsMin);
    texCoord = clamp(texCoord, 0.0, 1.0);
    return texture(uSDFTexture, texCoord).r;
  }
  
  vec3 calcNormal(vec3 p) {
    float eps = 0.01;
    vec3 h = vec3(eps, 0.0, 0.0);
    return normalize(vec3(
      sampleSDF(p + h.xyy) - sampleSDF(p - h.xyy),
      sampleSDF(p + h.yxy) - sampleSDF(p - h.yxy),
      sampleSDF(p + h.yyx) - sampleSDF(p - h.yyx)
    ));
  }
  
  void main() {
    float dist = sampleSDF(vWorldPosition);
    if (dist > 0.0) discard;
    
    vec3 sdfNormal = calcNormal(vWorldPosition);
    vec3 normal = mix(vNormal, sdfNormal, 0.8);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    
    // Aluminum material
    vec3 albedo = vec3(0.75, 0.75, 0.78);
    
    // Heat tint near cutting
    float tempFactor = smoothstep(0.0, 1.0, uCutDepth);
    albedo = mix(albedo, vec3(0.9, 0.3, 0.2), tempFactor * 0.3);
    
    // Lighting
    vec3 lightPos = vec3(10.0, 20.0, 10.0);
    vec3 lightDir = normalize(lightPos - vWorldPosition);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    
    vec3 ambient = vec3(0.1, 0.1, 0.12) * albedo;
    vec3 diffuse = vec3(0.7, 0.7, 0.8) * diff * albedo;
    vec3 specular = vec3(0.5, 0.5, 0.6) * spec;
    vec3 color = ambient + diffuse + specular;
    
    // Edge highlighting for cut surfaces
    float edgeDist = abs(dist);
    float edgeFactor = smoothstep(0.0, 0.05, edgeDist);
    color += vec3(0.15, 0.15, 0.2) * (1.0 - edgeFactor);
    
    // Temperature glow near tool
    float distToTool = length(vWorldPosition - uToolPosition);
    float glow = exp(-distToTool * 0.3) * uCutDepth * 0.5;
    color += vec3(1.0, 0.2, 0.05) * glow;
    
    // Fresnel
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    color += vec3(0.1, 0.1, 0.15) * fresnel;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const Workpiece = ({ dimensions, sdfTexture, toolPosition, toolRadius, toolLength, cutDepth }) => {
  const materialRef = useRef(null);
  const halfW = dimensions.width / 2;
  const halfH = dimensions.height / 2;
  const halfD = dimensions.depth / 2;

  const uniforms = useMemo(() => ({
    uSDFTexture: { value: sdfTexture },
    uWorkpieceBoundsMin: { value: new THREE.Vector3(-halfW, -halfH, -halfD) },
    uWorkpieceBoundsMax: { value: new THREE.Vector3(halfW, halfH, halfD) },
    uToolPosition: { value: new THREE.Vector3(...toolPosition) },
    uToolRadius: { value: toolRadius },
    uCutDepth: { value: cutDepth },
    uCameraPosition: { value: new THREE.Vector3() },
    uTime: { value: 0 }
  }), [sdfTexture, halfW, halfH, halfD, toolPosition, toolRadius, cutDepth]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uToolPosition.value.set(...toolPosition);
      materialRef.current.uniforms.uCutDepth.value = cutDepth;
      materialRef.current.uniforms.uCameraPosition.value.copy(state.camera.position);
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      if (sdfTexture) {
        materialRef.current.uniforms.uSDFTexture.value = sdfTexture;
      }
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth, 32, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};