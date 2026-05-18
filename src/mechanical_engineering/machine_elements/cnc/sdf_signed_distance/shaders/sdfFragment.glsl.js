export default `
precision highp float;
precision highp sampler3D;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCameraPosition;
uniform vec3 uCameraDirection;
uniform vec3 uToolPosition;
uniform float uToolRadius;
uniform float uToolLength;
uniform sampler3D uSDFTexture;
uniform vec3 uWorkpieceBoundsMin;
uniform vec3 uWorkpieceBoundsMax;
uniform float uCutDepth;
uniform float uSpindleSpeed;

varying vec2 vUv;

#define MAX_STEPS 128
#define MAX_DIST 100.0
#define SURF_DIST 0.01

// SDF primitives
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Sample SDF texture
float sampleSDF(vec3 pos) {
  vec3 texCoord = (pos - uWorkpieceBoundsMin) / (uWorkpieceBoundsMax - uWorkpieceBoundsMin);
  texCoord = clamp(texCoord, 0.0, 1.0);
  return texture(uSDFTexture, texCoord).r;
}

// Scene SDF (workpiece + tool)
float sceneSDF(vec3 p) {
  // Workpiece SDF from texture
  float workpieceDist = sampleSDF(p);
  
  // Tool SDF
  vec3 toolLocal = p - uToolPosition;
  float toolDist = sdCylinder(toolLocal, uToolLength / 2.0, uToolRadius);
  
  // Tool rotation animation based on spindle speed
  float angle = uTime * uSpindleSpeed * 0.1;
  float c = cos(angle);
  float s = sin(angle);
  vec3 rotatedTool = vec3(
    toolLocal.x * c - toolLocal.z * s,
    toolLocal.y,
    toolLocal.x * s + toolLocal.z * c
  );
  
  // Combine (union for visualization)
  return min(workpieceDist, toolDist);
}

// Calculate normal from SDF
vec3 calcNormal(vec3 p) {
  float eps = 0.01;
  vec3 h = vec3(eps, 0.0, 0.0);
  return normalize(vec3(
    sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
    sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
    sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
  ));
}

// Ray marching
float rayMarch(vec3 ro, vec3 rd) {
  float dO = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * dO;
    float dS = sceneSDF(p);
    
    dO += dS;
    
    if (dO > MAX_DIST || abs(dS) < SURF_DIST) break;
  }
  
  return dO;
}

// Lighting
vec3 getLight(vec3 p, vec3 normal, vec3 rd) {
  vec3 lightPos = vec3(10.0, 20.0, 10.0);
  vec3 lightDir = normalize(lightPos - p);
  
  // Diffuse
  float diff = max(dot(normal, lightDir), 0.0);
  
  // Specular
  vec3 halfDir = normalize(lightDir - rd);
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
  
  // Shadows (ray march towards light)
  float d = rayMarch(p + normal * SURF_DIST * 2.0, lightDir);
  float shadow = d < length(lightPos - p) ? 0.3 : 1.0;
  
  vec3 ambient = vec3(0.1, 0.1, 0.15);
  vec3 diffuse = vec3(0.7, 0.7, 0.8) * diff * shadow;
  vec3 specular = vec3(0.5, 0.5, 0.6) * spec;
  
  return ambient + diffuse + specular;
}

void main() {
  // Normalized pixel coordinates
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  
  // Camera setup
  vec3 ro = uCameraPosition;
  vec3 rd = normalize(uCameraDirection + vec3(uv.x, uv.y, 0.0));
  
  // Ray march
  float d = rayMarch(ro, rd);
  
  vec3 col = vec3(0.0);
  
  if (d < MAX_DIST) {
    vec3 p = ro + rd * d;
    vec3 normal = calcNormal(p);
    
    // Material color based on position
    vec3 materialColor = mix(
      vec3(0.75, 0.75, 0.78), // Aluminum
      vec3(0.9, 0.3, 0.2),    // Heat tint
      smoothstep(0.0, 1.0, uCutDepth)
    );
    
    // Apply lighting
    col = getLight(p, normal, rd) * materialColor;
    
    // Add temperature glow near cutting zone
    float distToTool = length(p - uToolPosition);
    float tempGlow = exp(-distToTool * 0.5) * uCutDepth;
    col += vec3(1.0, 0.3, 0.1) * tempGlow;
    
    // Add tool visualization
    float toolDist = sdCylinder(p - uToolPosition, uToolLength / 2.0, uToolRadius);
    if (toolDist < 0.0) {
      col = mix(col, vec3(0.2, 0.2, 0.3), 0.7);
    }
    
    // Fog
    float fog = 1.0 - exp(-d * 0.02);
    col = mix(col, vec3(0.5, 0.6, 0.7), fog);
  } else {
    // Sky/background
    col = vec3(0.5, 0.6, 0.7) * (1.0 - length(uv) * 0.5);
  }
  
  // Output
  gl_FragColor = vec4(col, 1.0);
  
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;