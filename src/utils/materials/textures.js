import React,{useEffect} from 'react';
import { useLoader } from '@react-three/fiber/native'
import * as THREE from 'three'

export const Textures = [
  { name: 'steel',     image: require('../../assets/images/textures/steel.jpg') ,color:'#888',roughness:0.6,metalness:0.8},
  { name: 'aluminium', image: require('../../assets/images/textures/aluminium.jpg') ,color:'#ccc',roughness:0.5,metalness:0.5},
  { name: 'copper',    image: require('../../assets/images/textures/copper.jpg') ,color:'#d2691e',roughness:0.7,metalness:0.9},
  { name: 'brass',     image: require('../../assets/images/textures/brass.jpg') ,color:'#cd7f32',roughness:0.6,metalness:0.8},
  { name: 'knurl',     image: require('../../assets/images/textures/knurl.png') ,color:'#888',roughness:0.8,metalness:0.2},
  { name: 'wood',      image: require('../../assets/images/textures/woodTextures.jpg') ,color:'#d2691e',roughness:0.9,metalness:0.1},
  { name: 'marble',    image: require('../../assets/images/textures/marbels.jpg') ,color:'#ccc',roughness:0.5,metalness:0.5},
  { name: 'wall',      image: require('../../assets/images/textures/wall.jpg') ,color:'#888',roughness:0.5,metalness:0.5},
  { name: 'plastic',   image: require('../../assets/images/textures/plastic.jpg') ,color:'#ccc',roughness:0.5,metalness:0.5},
  { name: 'default',   image: require('../../assets/images/textures/sheet.jpg') ,color:'#888',roughness:0.5,metalness:0.5},
];

const FALLBACK = require('../../assets/images/textures/sheet.jpg');

const getTexture = (type) => {
  if (!type) return FALLBACK;
  const found = Textures.find(t => t.name === type);
  return found ? found.image : FALLBACK;
};

export function useTextureLoader({type='default', width = 512, height = 512,flipY = true, repeat=[4,2]}) {
  const texturePath = getTexture(type); // always a valid require()  
  const texture = useLoader(THREE.TextureLoader, texturePath); 
  useEffect(() => {
    texture.flipY = flipY;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    const repeatX = Math.max(10, Math.round(width / 50));
    const repeatY = Math.max(10, Math.round(height / 50));
    texture.repeat.set(...repeat);
    texture.needsUpdate = true;
  }, [texture, width, height]);
  return texture;
}

//knurl texture
export function useKnurlTextureLoader() {
  const texture = useLoader(
    THREE.TextureLoader,
     require('../../assets/images/textures/knurl.png')
  )

  texture.flipY = true
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1) /// mean how many time texture repeat in U and V axis
  texture.needsUpdate = true 
  return texture
}

//shaders 

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

        // Y → 0..1
        float z01 = (p.y + partLength * 0.5) / partLength;

        // 🚨 UnsignedByte is ALREADY 0..1
        float cut = texture2D(profile, vec2(z01, 0.0)).r;

        // smooth banding
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
  })
}
