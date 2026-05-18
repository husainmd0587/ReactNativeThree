export default `
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec2 vUv;

uniform vec3 uWorkpieceBoundsMin;
uniform vec3 uWorkpieceBoundsMax;

void main() {
  vUv = uv;
  
  // Calculate world position
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  
  // Calculate local position within workpiece bounds (0-1)
  vLocalPosition = (vWorldPosition - uWorkpieceBoundsMin) / (uWorkpieceBoundsMax - uWorkpieceBoundsMin);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;