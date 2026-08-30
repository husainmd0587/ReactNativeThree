// textures.js
import React, { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';

// textures.js - Add these texture entries
export const Textures = [

  // =========================
  // METALS
  // =========================

  {
    name: 'steel',
    image: require('../../assets/images/textures/steel.jpg'),
    color: '#b8b8b8',
    roughness: 0.45,
    metalness: 0.95,
  },

  {
    name: 'iron',
    image: require('../../assets/images/textures/iron.jpg'),
    color: '#777777',
    roughness: 0.65,
    metalness: 0.95,
  },

  {
    name: 'sheet',
    image: require('../../assets/images/textures/sheet.jpg'),
    color: '#bfc0c0',
    roughness: 0.35,
    metalness: 0.95,
  },

  {
    name: 'painted-iron',
    image: require('../../assets/images/textures/yellow.jpg'),
    color: '#d9a900',
    roughness: 0.45,
    metalness: 0.85,
  },

  {
    name: 'caste-iron',
    image: require('../../assets/images/textures/castIron.jpg'),
    color: '#55504b',
    roughness: 0.8,
    metalness: 0.9,
  },

  {
    name: 'rusted-yellow-iron',
    image: require('../../assets/images/textures/rustedYellow.jpg'),
    color: '#b68a35',
    roughness: 0.8,
    metalness: 0.65,
  },

  {
    name: 'aluminium',
    image: require('../../assets/images/textures/aluminium.jpg'),
    color: '#c4c6c8',
    roughness: 0.4,
    metalness: 0.95,
  },

  {
    name: 'copper',
    image: require('../../assets/images/textures/copper.jpg'),
    color: '#b76545',
    roughness: 0.45,
    metalness: 0.95,
  },

  {
    name: 'brass',
    image: require('../../assets/images/textures/brass.jpg'),
    color: '#c89b32',
    roughness: 0.35,
    metalness: 0.95,
  },

  {
    name: 'gold',
    image: require('../../assets/images/textures/gold.jpg'),
    color: '#d4af37',
    roughness: 0.25,
    metalness: 1.0,
  },

  {
    name: 'titanium',
    image: require('../../assets/images/textures/titanium.jpg'),
    color: '#8f9295',
    roughness: 0.4,
    metalness: 0.95,
  },

  // Knurl is normally a machined metal surface
  {
    name: 'knurl',
    image: require('../../assets/images/textures/knurl.png'),
    color: '#b8b8b8',
    roughness: 0.45,
    metalness: 0.9,
  },


  // =========================
  // WOOD / STONE / BUILDING
  // =========================

  {
    name: 'wood',
    image: require('../../assets/images/textures/woodTextures.jpg'),
    color: '#a66a3f',
    roughness: 0.8,
    metalness: 0.0,
  },

  {
    name: 'wood-dry',
    image: require('../../assets/images/textures/woodTextures2.jpg'),
    color: '#a8794d',
    roughness: 0.9,
    metalness: 0.0,
  },

  {
    name: 'marble',
    image: require('../../assets/images/textures/marbels.jpg'),
    color: '#eeeeee',
    roughness: 0.35,
    metalness: 0.0,
  },

  {
    name: 'concrete',
    image: require('../../assets/images/textures/concrete.jpg'),
    color: '#9b9b9b',
    roughness: 0.9,
    metalness: 0.0,
  },
 {
  name: 'stones',
  image: require('../../assets/images/textures/stones.jpg'),
  color: '#ffffff',
  roughness: 0.9,
  metalness: 0.0,
},

{
  name: 'stone-wall',
  image: require('../../assets/images/textures/stone-wall.jpg'),
  color: '#ffffff',
  roughness: 0.9,
  metalness: 0.0,
},
  {
    name: 'wall',
    image: require('../../assets/images/textures/wall.jpg'),
    color: '#b4774f',
    roughness: 0.85,
    metalness: 0.0,
  },
  {
    name: 'clay',
    image: require('../../assets/images/textures/clay.jpg'),
    color: '#b58f70',
    roughness: 0.95,
    metalness: 0.0,
  },

  {
    name: 'sand',
    image: require('../../assets/images/textures/sand.jpg'),
    color: '#c5ae8c',
    roughness: 1.0,
    metalness: 0.0,
  },


  // =========================
  // PLASTICS / POLYMERS
  // =========================

  {
    name: 'plastic',
    image: require('../../assets/images/textures/plastic.jpg'),
    color: '#bdbdbd',
    roughness: 0.5,
    metalness: 0.0,
  },

  {
    name: 'carbon-fiber',
    image: require('../../assets/images/textures/carbonFiber.jpg'),
    color: '#222222',
    roughness: 0.35,
    metalness: 0.0,
  },

  {
    name: 'lather',
    image: require('../../assets/images/textures/lather.jpg'),
    color: '#777777',
    roughness: 0.85,
    metalness: 0.0,
  },

  {
    name: 'nylon',
    image: require('../../assets/images/textures/nylon.jpg'),
    color: '#888888',
    roughness: 0.7,
    metalness: 0.0,
  },
{
  name: 'rubber',
  image: require('../../assets/images/textures/rubber.jpg'),
  color: '#222222',
  roughness: 0.85,
  metalness: 0.0,
},
  
{
  name: 'foam',
  image: require('../../assets/images/textures/foam.jpg'),
  color: '#ffffff',
  roughness: 0.9,
  metalness: 0.0,
},

  {
    name: 'pvc',
    image: require('../../assets/images/textures/pvc.jpg'),
    color: '#bdbdbd',
    roughness: 0.65,
    metalness: 0.0,
  },

  {
    name: 'pvc-pink',
    image: require('../../assets/images/textures/pvc2.jpg'),
    color: '#e6a5c0',
    roughness: 0.55,
    metalness: 0.0,
  },

  {
    name: 'plastic-colored',
    image: require('../../assets/images/textures/pvc.jpg'),
    color: '#c8c8c8',
    roughness: 0.55,
    metalness: 0.0,
  },

{
  name: 'scotch',
  image: require('../../assets/images/textures/scotch.jpg'),
  color: '#ffffff',
  roughness: 0.9,
  metalness: 0.0,
},


  // =========================
  // GLASS
  // =========================

  {
    name: 'glass',
    image: require('../../assets/images/textures/glass.jpg'),
    color: '#dcefff',
    roughness: 0.08,
    metalness: 0.0,
  },


  // =========================
  // OTHER
  // =========================

  {
    name: 'dotted-paint',
    image: require('../../assets/images/textures/dotted.jpg'),
    color: '#333333',
    roughness: 0.65,
    metalness: 0.0,
  },

  {
    name: 'flowers',
    image: require('../../assets/images/textures/flowers.jpg'),
    color: '#ffffff',
    roughness: 0.8,
    metalness: 0.0,
  },

  {
    name: 'pattern',
    image: require('../../assets/images/textures/pattern.jpg'),
    color: '#ffffff',
    roughness: 0.55,
    metalness: 0.0,
  },

  {
    name: 'pattern2',
    image: require('../../assets/images/textures/pattern2.jpg'),
    color: '#ffffff',
    roughness: 0.55,
    metalness: 0.0,
  },
{
  name: 'pattern3',
  image: require('../../assets/images/textures/pattern3.jpg'),
  color: '#ffffff',
  roughness: 0.55,
  metalness: 0.0,
},

{
  name: 'pattern4',
  image: require('../../assets/images/textures/pattern4.jpg'),
  color: '#ffffff',
  roughness: 0.5,
  metalness: 0.0,
},

{
  name: 'pattern5',
  image: require('../../assets/images/textures/pattern5.jpg'),
  color: '#ffffff',
  roughness: 0.45,
  metalness: 0.0,
},

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