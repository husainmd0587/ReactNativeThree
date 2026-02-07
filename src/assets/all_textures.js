import { useLoader } from '@react-three/fiber/native'
import * as THREE from 'three'

export function useTextureLoader() {
  const texture = useLoader(
    THREE.TextureLoader,
    require('./textures2.jpg')
  )

  texture.flipY = false
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  texture.needsUpdate = true

  return texture
}
//knurl texture 
export function useKnurlTextureLoader() {
  const texture = useLoader(
    THREE.TextureLoader,
     require('./knurl.png')
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
