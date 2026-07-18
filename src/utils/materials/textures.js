// textures.js
import React, { useEffect } from 'react';
import { useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';

// textures.js - Add these texture entries
export const Textures = [
  // Existing textures
  { name: 'steel', image: require('../../assets/images/textures/steel.jpg'), color: '#888', roughness: 0.6, metalness: 0.8 },
  { name: 'aluminium', image: require('../../assets/images/textures/aluminium.jpg'), color: '#ccc', roughness: 0.5, metalness: 0.5 },
  { name: 'copper', image: require('../../assets/images/textures/copper.jpg'), color: '#d2691e', roughness: 0.7, metalness: 0.9 },
  { name: 'brass', image: require('../../assets/images/textures/brass.jpg'), color: '#cd7f32', roughness: 0.6, metalness: 0.8 },
  { name: 'knurl', image: require('../../assets/images/textures/knurl.png'), color: '#888', roughness: 0.8, metalness: 0.2 },
  { name: 'wood', image: require('../../assets/images/textures/woodTextures.jpg'), color: '#d2691e', roughness: 0.9, metalness: 0.1 },
  { name: 'marble', image: require('../../assets/images/textures/marbels.jpg'), color: '#ccc', roughness: 0.5, metalness: 0.5 },
  { name: 'wall', image: require('../../assets/images/textures/wall.jpg'), color: '#888', roughness: 0.5, metalness: 0.5 },
  { name: 'plastic', image: require('../../assets/images/textures/plastic.jpg'), color: '#ccc', roughness: 0.5, metalness: 0.5 },
  { name: 'default', image: require('../../assets/images/textures/sheet.jpg'), color: '#888', roughness: 0.5, metalness: 0.5 },
  
  // ✅ NEW TEXTURES TO ADD (when you have the images)
  // { name: 'carbon-fiber', image: require('../../assets/images/textures/carbon-fiber.jpg'), color: '#333', roughness: 0.3, metalness: 0.1 },
  // { name: 'fiberglass', image: require('../../assets/images/textures/fiberglass.jpg'), color: '#ddd', roughness: 0.4, metalness: 0.0 },
  // { name: 'stainless-steel', image: require('../../assets/images/textures/stainless-steel.jpg'), color: '#ccc', roughness: 0.2, metalness: 0.9 },
  // { name: 'titanium', image: require('../../assets/images/textures/titanium.jpg'), color: '#a0a0a0', roughness: 0.3, metalness: 0.7 },
  // { name: 'bronze', image: require('../../assets/images/textures/bronze.jpg'), color: '#cd7f32', roughness: 0.35, metalness: 0.85 },
  // { name: 'nylon', image: require('../../assets/images/textures/nylon.jpg'), color: '#ddd', roughness: 0.4, metalness: 0.0 },
  // { name: 'pvc', image: require('../../assets/images/textures/pvc.jpg'), color: '#ccc', roughness: 0.7, metalness: 0.0 },
  // { name: 'glass', image: require('../../assets/images/textures/glass.jpg'), color: '#88ccff', roughness: 0.05, metalness: 0.0 },
];

const FALLBACK = require('../../assets/images/textures/sheet.jpg');

const getTexture = (type) => {
  if (!type) return FALLBACK;
  const found = Textures.find(t => t.name === type);
  return found ? found.image : FALLBACK;
};

// ✅ IMPROVED: Better texture loader with more options
export function useTextureLoader({ 
  type = 'default', 
  width = 512, 
  height = 512,
  flipY = true,
  repeat = [4, 2],
  wrapS = THREE.RepeatWrapping,
  wrapT = THREE.RepeatWrapping,
  anisotropy = 4,
  minFilter = THREE.LinearMipmapLinearFilter,
  magFilter = THREE.LinearFilter,
} = {}) {
  const texturePath = getTexture(type);
  const texture = useLoader(THREE.TextureLoader, texturePath);
  
  useEffect(() => {
    if (!texture) return;
    
    // Basic settings
    texture.flipY = flipY;
    texture.wrapS = wrapS;
    texture.wrapT = wrapT;
    texture.repeat.set(...repeat);
    
    // Performance & quality settings
    texture.anisotropy = anisotropy;
    texture.minFilter = minFilter;
    texture.magFilter = magFilter;
    
    // Generate mipmaps for better quality at distance
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    
    // Log for debugging (remove in production)
    // console.log(`✅ Loaded texture: ${type}`, texture);
  }, [texture, flipY, wrapS, wrapT, repeat, anisotropy, minFilter, magFilter]);
  
  return texture;
}

// ✅ IMPROVED: Knurl texture with better settings
export function useKnurlTextureLoader() {
  const texture = useLoader(
    THREE.TextureLoader,
    require('../../assets/images/textures/knurl.png')
  );

  useEffect(() => {
    if (!texture) return;
    
    texture.flipY = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  return texture;
}

// ✅ NEW: Get texture info (color, roughness, metalness)
export function getTextureInfo(type) {
  if (!type) return null;
  const found = Textures.find(t => t.name === type);
  return found || null;
}

// ✅ NEW: Get multiple textures at once
export function useMultipleTextures(textureTypes = []) {
  const textures = {};
  
  textureTypes.forEach(type => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    textures[type] = useTextureLoader({ type });
  });
  
  return textures;
}

// ✅ NEW: Preload textures for better performance
export function preloadTextures(textureTypes = []) {
  const promises = textureTypes.map(type => {
    const texturePath = getTexture(type);
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        texturePath,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  });
  
  return Promise.all(promises);
}

// Shaders (unchanged)
export function TurningMaterial({
  profileTexture,
  albedoMap,
  partLength,
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      profile: { value: profileTexture },
      albedoMap: { value: albedoMap },
      partLength: { value: partLength },
    },

    vertexShader: `
      uniform sampler2D profile;
      uniform float partLength;
      varying vec2 vUv;

      void main() {
        vUv = uv;

        vec3 p = position;

        float z01 = (p.y + partLength * 0.5) / partLength;

        float cut = texture2D(profile, vec2(z01, 0.0)).r;
        cut = smoothstep(0.0, 1.0, cut);

        float r = 1.0 - cut;
        p.x *= r;
        p.z *= r;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,

    fragmentShader: `
      precision highp float;
      uniform sampler2D albedoMap;
      varying vec2 vUv;

      void main() {
        gl_FragColor = texture2D(albedoMap, vUv);
      }
    `,

    side: THREE.DoubleSide,
  });
}

// Default export for convenience
export default {
  Textures,
  useTextureLoader,
  useKnurlTextureLoader,
  getTextureInfo,
  useMultipleTextures,
  preloadTextures,
  TurningMaterial,
};