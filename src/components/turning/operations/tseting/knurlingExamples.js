import * as THREE from 'three'
// ============================================================================
// KNURLING GEOMETRY CREATION
// ============================================================================

const createKnurledCylinderGeometry = (params = {}) => {
  const {
    radius = 14,
    length = 50,
    knurlCount = 40,
    knurlDepth = 0.5,
    segments = 64,
    heightSegments = 16
  } = params

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    segments,
    heightSegments
  )

  const positionAttribute = geometry.getAttribute('position')
  const positions = positionAttribute.array

  // Modify vertex positions for knurl pattern
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]

    // Get angle around cylinder (0 to 2π)
    const angle = Math.atan2(z, x)
    const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle

    // Get height position (normalized 0-1)
    const heightPos = (y + length / 2) / length

    // Create knurl pattern using multiple sine waves
    const knurlPhase1 = Math.sin(normalizedAngle * knurlCount)
    const knurlPhase2 = Math.sin(heightPos * knurlCount * 2)
    const knurlPattern = (knurlPhase1 + knurlPhase2) * 0.5

    // Apply depth modulation
    const radiusModulation = knurlPattern * knurlDepth
    const currentRadius = Math.sqrt(x * x + z * z)
    
    if (currentRadius > 0.1) { // Skip center axis
      const newRadius = currentRadius + radiusModulation
      const scale = newRadius / currentRadius
      
      positions[i] *= scale     // x
      positions[i + 2] *= scale // z
    }
  }

  positionAttribute.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

const createKnurledCylinderWithDisplacement = (params = {}) => {
  const {
    radius = 14,
    length = 50,
    knurlCount = 40,
    knurlDepth = 0.5,
    segments = 64,
    heightSegments = 16
  } = params

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    segments,
    heightSegments
  )

  // Create knurl displacement texture
  const textureSize = 512
  const canvas = document.createElement('canvas')
  canvas.width = textureSize
  canvas.height = textureSize
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const uAngle = (x / textureSize) * Math.PI * 2
      const vHeight = y / textureSize

      const knurl1 = Math.sin(uAngle * knurlCount)
      const knurl2 = Math.sin(vHeight * knurlCount * 2)
      const pattern = (knurl1 + knurl2) * 0.5

      const value = Math.floor((pattern + 1) * 127.5)
      ctx.fillStyle = `rgb(${value},${value},${value})`
      ctx.fillRect(x, y, 1, 1)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  const material = new THREE.MeshStandardMaterial({
    color: 0x888888,
    displacementMap: texture,
    displacementScale: knurlDepth,
    roughness: 0.6,
    metalness: 0.2,
    normalMap: texture,
    normalScale: new THREE.Vector2(knurlDepth * 2, knurlDepth * 2)
  })

  return { geometry, material }
}

export { createKnurledCylinderGeometry, createKnurledCylinderWithDisplacement }