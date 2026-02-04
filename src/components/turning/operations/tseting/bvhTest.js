import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg'
import {createKnurledCylinderGeometry,  createKnurledCylinderWithDisplacement } from './knurlingExamples'
/**
 * TURNING OPERATIONS CSG COMPONENT
 * A flexible utility for simulating CNC turning operations with CSG modeling
 * 
 * Supports operations:
 * - Face Turning (facing)
 * - OD Turning (outer diameter)
 * - ID Turning (inner diameter / boring)
 * - Center Drilling
 * - Off-Center Drilling
 * - Taper Turning
 * - Grooving (external/internal)
 * - Threading
 * - Knurling
 * - Chamfering
 * - Parting/Cut-off
 */

// ============================================================================
// OPERATION TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} StockProfile
 * @property {'cylinder' | 'lathe' | 'box'} type - Stock geometry type
 * @property {number} outerDiameter - Outer diameter in mm
 * @property {number} innerDiameter - Inner diameter in mm (0 for solid)
 * @property {number} length - Length along Z-axis in mm
 * @property {Array<{x: number, y: number}>} [lathePoints] - For lathe type only
 * @property {number} [segments] - Resolution (default: 64)
 * @property {Object} [material] - Stock material properties
 * @property {number} [material.color] - Hex color (default: 0x888888)
 * @property {number} [material.roughness] - 0-1 (default: 0.6)
 * @property {number} [material.metalness] - 0-1 (default: 0.2)
 */

/**
 * @typedef {Object} ToolGeometry
 * @property {'box' | 'cylinder' | 'cone' | 'sphere' | 'custom'} type
 * @property {Object} dimensions - Dimensions based on type
 * @property {number} [dimensions.width] - For box
 * @property {number} [dimensions.height] - For box
 * @property {number} [dimensions.depth] - For box
 * @property {number} [dimensions.widthSegments] - For box/sphere (default: 1/12)
 * @property {number} [dimensions.heightSegments] - For box/cylinder/cone/sphere (default: 1/8)
 * @property {number} [dimensions.depthSegments] - For box (default: 1)
 * @property {number} [dimensions.radialSegments] - For cylinder/cone (default: 12)
 * @property {number} [dimensions.radius] - For cylinder/cone/sphere
 * @property {number} [dimensions.radiusTop] - For cone
 * @property {number} [dimensions.radiusBottom] - For cone
 * @property {number} [dimensions.length] - For cylinder/cone
 * @property {THREE.BufferGeometry} [customGeometry] - For custom type
 */

/**
 * @typedef {Object} ToolTexture
 * @property {'solid' | 'checkerboard' | 'gradient' | 'grid'} type
 * @property {number} color1 - Primary color (hex)
 * @property {number} [color2] - Secondary color for patterns
 * @property {number} [size] - Texture resolution (default: 256)
 */

/**
 * @typedef {Object} Tool
 * @property {string} id - Unique tool identifier
 * @property {string} name - Tool name/description
 * @property {ToolGeometry} geometry - Tool geometry definition
 * @property {ToolTexture} [texture] - Texture configuration
 * @property {Object} [material] - Material properties
 * @property {number} [material.roughness] - 0-1
 * @property {number} [material.metalness] - 0-1
 */

/**
 * @typedef {Object} Operation
 * @property {string} id - Unique operation identifier
 * @property {string} toolId - Reference to tool ID
 * @property {'facing' | 'od_turning' | 'boring' | 'center_drill' | 'off_center_drill' | 
 *            'taper' | 'groove' | 'thread' | 'knurl' | 'chamfer' | 'parting'} type
 * @property {Object} position - Tool position {x, y, z}
 * @property {Object} [rotation] - Tool rotation in radians {x, y, z}
 * @property {Object} [parameters] - Operation-specific parameters
 * @property {'subtraction' | 'addition' | 'intersection'} [csgOperation] - Default: 'subtraction'
 * @property {boolean} [enabled] - Enable/disable operation (default: true)
 * @property {number} [order] - Execution order (lower first)
 */

// ============================================================================
// TEXTURE GENERATION UTILITIES
// ============================================================================

const createProceduralTexture = (config) => {
  const { type = 'solid', color1, color2, size = 256 } = config
  const data = new Uint8Array(size * size * 4)
  
  const c1 = {
    r: (color1 >> 16) & 255,
    g: (color1 >> 8) & 255,
    b: color1 & 255
  }
  
  const c2 = color2 ? {
    r: (color2 >> 16) & 255,
    g: (color2 >> 8) & 255,
    b: color2 & 255
  } : c1

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = (i * size + j) * 4
      
      let r, g, b
      
      switch (type) {
        case 'checkerboard':
          const checker = ((i >> 4) + (j >> 4)) & 1
          r = checker ? c1.r : c2.r
          g = checker ? c1.g : c2.g
          b = checker ? c1.b : c2.b
          break
          
        case 'gradient':
          const ratio = i / size
          r = Math.floor(c1.r * (1 - ratio) + c2.r * ratio)
          g = Math.floor(c1.g * (1 - ratio) + c2.g * ratio)
          b = Math.floor(c1.b * (1 - ratio) + c2.b * ratio)
          break
          
        case 'grid':
          const isGridLine = (i % 16 === 0) || (j % 16 === 0)
          r = isGridLine ? c2.r : c1.r
          g = isGridLine ? c2.g : c1.g
          b = isGridLine ? c2.b : c1.b
          break
          
        case 'solid':
        default:
          r = c1.r
          g = c1.g
          b = c1.b
      }
      
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255
    }
  }
  
  const texture = new THREE.DataTexture(data, size, size)
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// ============================================================================
// GEOMETRY CREATION UTILITIES
// ============================================================================

const createStockGeometry = (profile) => {
  const {
    type = 'cylinder',
    outerDiameter = 50,
    innerDiameter = 0,
    length = 100,
    lathePoints = [],
    segments = 64
  } = profile

  switch (type) {
    case 'cylinder':
      return new THREE.CylinderGeometry(
        outerDiameter / 2,
        outerDiameter / 2,
        length,
        segments
      )
      
    case 'lathe':
      if (lathePoints.length === 0) {
        // Default lathe profile
        const points = []
        points.push(new THREE.Vector2(innerDiameter / 2, 0))
        for (let i = 0; i < 10; i++) {
          points.push(
            new THREE.Vector2(
              Math.sin(i * 0.2) * (outerDiameter / 10) + outerDiameter / 2,
              (i + 1) * (length / 11)
            )
          )
        }
        points.push(new THREE.Vector2(innerDiameter / 2, length))
        return new THREE.LatheGeometry(points, segments)
      } else {
        const points = lathePoints.map(p => new THREE.Vector2(p.x, p.y))
        return new THREE.LatheGeometry(points, segments)
      }
      
    case 'box':
      return new THREE.BoxGeometry(outerDiameter, length, outerDiameter)
      
    default:
      return new THREE.CylinderGeometry(
        outerDiameter / 2,
        outerDiameter / 2,
        length,
        segments
      )
  }
}

const createToolGeometry = (toolGeometry) => {
  const { type, dimensions, customGeometry } = toolGeometry
  
  switch (type) {
    case 'box':
      // Low segment defaults improve CSG performance
      const widthSegments = dimensions.widthSegments || 1
      const heightSegments = dimensions.heightSegments || 1
      const depthSegments = dimensions.depthSegments || 1
      return new THREE.BoxGeometry(
        dimensions.width || 10,
        dimensions.height || 10,
        dimensions.depth || 10,
        widthSegments,
        heightSegments,
        depthSegments
      )
      
    case 'cylinder':
      const radialSegments = dimensions.radialSegments || 12
      const cylinderHeightSegments = dimensions.heightSegments || 1
      return new THREE.CylinderGeometry(
        dimensions.radius || 5,
        dimensions.radius || 5,
        dimensions.length || 10,
        radialSegments,
        cylinderHeightSegments
      )
      
    case 'cone':
      const coneRadialSegments = dimensions.radialSegments || 12
      const coneHeightSegments = dimensions.heightSegments || 1
      return new THREE.CylinderGeometry(
        dimensions.radiusTop || 0,
        dimensions.radiusBottom || 5,
        dimensions.length || 10,
        coneRadialSegments,
        coneHeightSegments
      )
      
    case 'sphere':
      const sphereWidthSegments = dimensions.widthSegments || 12
      const sphereHeightSegments = dimensions.heightSegments || 8
      return new THREE.SphereGeometry(   
        dimensions.radius || 5,
        sphereWidthSegments,
        sphereHeightSegments
      )
      
    case 'custom':
      return customGeometry || new THREE.BoxGeometry(10, 10, 10)
      
    default:
      return new THREE.BoxGeometry(10, 10, 10)
  }
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================
function TurningOperationCSG({
  // Stock configuration
  stockProfile = {
    type: 'cylinder',
    outerDiameter: 50,
    innerDiameter: 0,
    length: 100,
    segments: 64,
    material: { color: 0x888888, roughness: 0.6, metalness: 0.2 }
  },
  
  // Tools array
  tools = [],
  
  // Operations array
  operations = [],
  
  // Visual settings
  autoRotate = true,
  rotationSpeed = 0.005,
  
  // CSG settings
  preserveMaterials = true,
  enableLOD = true,
  csgBatchSize = 5,
  
  // Callbacks
  onComplete = null,
  onProgress = null,
  useDisplacementMap = false,
  
  ...props
}) {
  const { scene } = useThree()
  const meshRef = useRef()
  const toolsMapRef = useRef(new Map())
  const evaluatorRef = useRef(null)
  const isProcessingRef = useRef(false)

  // OPTIMIZATION 1: Memoize stock geometry
  const stockGeometryMemo = useMemo(() => {
    return createStockGeometry(stockProfile)
  }, [stockProfile.outerDiameter, stockProfile.length, stockProfile.segments])

  // OPTIMIZATION 2: Memoize tools map
  const toolsMapMemo = useMemo(() => {
    const toolsMap = new Map()
    
    tools.forEach(tool => {
      const geometry = createToolGeometry(tool.geometry)
      const brush = new Brush(geometry)
      
      let material
      if (tool.texture) {
        const texture = createProceduralTexture(tool.texture)
        material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: tool.material?.roughness || 0.5,
          metalness: tool.material?.metalness || 0.3,
        })
      } else {
        material = new THREE.MeshStandardMaterial({
          color: tool.color || 0x666666,
          roughness: tool.material?.roughness || 0.5,
          metalness: tool.material?.metalness || 0.3,
        })
      }
      
      brush.material = material
      toolsMap.set(tool.id, { brush, tool })
    })
    
    return toolsMap
  }, [tools])

  // OPTIMIZATION 3: Memoize sorted operations
  const sortedOpsMemo = useMemo(() => {
    return [...operations]
      .filter(op => op.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [operations])

  // OPTIMIZATION 4: Batch CSG operations
  const executeBatchedCSG = useCallback((sortedOps, toolsMap, stockGeometry) => {
    if (isProcessingRef.current) return null
    isProcessingRef.current = true

    const evaluator = evaluatorRef.current || new Evaluator()
    evaluator.attributes = ['position', 'normal', 'uv']
    evaluator.useGroups = preserveMaterials
    evaluatorRef.current = evaluator

    const stockMaterial = new THREE.MeshStandardMaterial({
      color: stockProfile.material?.color || 0x888888,
      roughness: stockProfile.material?.roughness || 0.6,
      metalness: stockProfile.material?.metalness || 0.2,
    })

    let currentStock = new Brush(stockGeometry.clone())
    currentStock.material = stockMaterial
    currentStock.updateMatrixWorld()

    let processedCount = 0

    const processBatch = () => {
      const batchEnd = Math.min(processedCount + csgBatchSize, sortedOps.length)

      for (let i = processedCount; i < batchEnd; i++) {
        const operation = sortedOps[i]
        
        // Skip knurling operations in CSG
        if (operation.type === 'knurl') continue
        
        const toolData = toolsMap.get(operation.toolId)

        if (!toolData) {
          console.warn(`Tool ${operation.toolId} not found`)
          continue
        }

        const toolBrush = toolData.brush.clone()
        
        if (operation.position) {
          toolBrush.position.set(
            operation.position.x || 0,
            operation.position.y || 0,
            operation.position.z || 0
          )
        }
        
        if (operation.rotation) {
          toolBrush.rotation.set(
            operation.rotation.x || 0,
            operation.rotation.y || 0,
            operation.rotation.z || 0
          )
        }
        
        if (operation.scale) {
          toolBrush.scale.set(
            operation.scale.x || 1,
            operation.scale.y || 1,
            operation.scale.z || 1
          )
        }
        
        toolBrush.updateMatrixWorld()

        let csgOp = SUBTRACTION
        if (operation.csgOperation === 'addition') csgOp = ADDITION
        else if (operation.csgOperation === 'intersection') csgOp = INTERSECTION

        currentStock = evaluator.evaluate(currentStock, toolBrush, csgOp)
        currentStock.updateMatrixWorld()

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: sortedOps.length,
            operation: operation
          })
        }
      }

      processedCount = batchEnd

      if (processedCount < sortedOps.length) {
        requestAnimationFrame(processBatch)
      } else {
        finalizeGeometry(currentStock)
      }
    }

    processBatch()
    return currentStock
  }, [preserveMaterials, stockProfile.material, onProgress, csgBatchSize])

  const finalizeGeometry = useCallback((mesh) => {
    mesh.geometry.computeVertexNormals()
    mesh.geometry.computeBoundingSphere()
    mesh.geometry.computeBoundingBox()

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(mat => mat.needsUpdate = true)
    } else {
      mesh.material.needsUpdate = true
    }

    scene.add(mesh)
    meshRef.current = mesh
    isProcessingRef.current = false

    if (onComplete) onComplete(mesh)
  }, [scene, onComplete])

  // OPTIMIZATION 5: Main effect with knurling support
  useEffect(() => {
    if (sortedOpsMemo.length === 0) return

    const hasKnurling = sortedOpsMemo.some(op => op.type === 'knurl')
    const nonKnurlOps = sortedOpsMemo.filter(op => op.type !== 'knurl')

    // CASE 1: Only knurling
    if (hasKnurling && nonKnurlOps.length === 0) {
      const knurlParams = sortedOpsMemo[0].parameters || {}

      let mesh
      if (useDisplacementMap) {
        const { geometry, material } = createKnurledCylinderWithDisplacement({
          radius: stockProfile.outerDiameter / 2,
          length: stockProfile.length,
          knurlCount: knurlParams.knurlCount || 40,
          knurlDepth: knurlParams.knurlDepth || 1.5,
          segments: stockProfile.segments,
          heightSegments: 16
        })
        mesh = new THREE.Mesh(geometry, material)
      } else {
        const geometry = createKnurledCylinderGeometry({
          radius: stockProfile.outerDiameter / 2,
          length: stockProfile.length,
          knurlCount: knurlParams.knurlCount || 40,
          knurlDepth: knurlParams.knurlDepth || 1.5,
          segments: stockProfile.segments,
          heightSegments: 16
        })
        const material = new THREE.MeshStandardMaterial({
          color: stockProfile.material?.color || 0x888888,
          roughness: stockProfile.material?.roughness || 0.6,
          metalness: stockProfile.material?.metalness || 0.2,
        })
        mesh = new THREE.Mesh(geometry, material)
      }

      scene.add(mesh)
      meshRef.current = mesh
      if (onComplete) onComplete(mesh)

      return () => {
        if (meshRef.current && scene) {
          scene.remove(meshRef.current)
          meshRef.current.geometry?.dispose()
          meshRef.current.material?.dispose()
        }
      }
    }

    // CASE 2: Mixed operations or CSG only
    if (nonKnurlOps.length > 0) {
      const resultMesh = executeBatchedCSG(nonKnurlOps, toolsMapMemo, stockGeometryMemo)

      // If also has knurling, apply geometry modification
      if (hasKnurling && resultMesh) {
        const knurlParams = sortedOpsMemo.find(op => op.type === 'knurl').parameters || {}
        
        const positionAttribute = resultMesh.geometry.getAttribute('position')
        const positions = positionAttribute.array

        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i]
          const y = positions[i + 1]
          const z = positions[i + 2]

          const angle = Math.atan2(z, x)
          const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle
          const heightPos = (y + stockProfile.length / 2) / stockProfile.length

          const knurlPhase1 = Math.sin(normalizedAngle * (knurlParams.knurlCount || 40))
          const knurlPhase2 = Math.sin(heightPos * (knurlParams.knurlCount || 40) * 2)
          const knurlPattern = (knurlPhase1 + knurlPhase2) * 0.5

          const radiusModulation = knurlPattern * (knurlParams.knurlDepth || 1.5)
          const currentRadius = Math.sqrt(x * x + z * z)
          
          if (currentRadius > 0.1) {
            const newRadius = currentRadius + radiusModulation
            const scale = newRadius / currentRadius
            
            positions[i] *= scale
            positions[i + 2] *= scale
          }
        }

        positionAttribute.needsUpdate = true
        resultMesh.geometry.computeVertexNormals()
      }
    } else if (!hasKnurling) {
      // No operations at all
      return
    }

    return () => {
      if (meshRef.current && scene) {
        scene.remove(meshRef.current)
        meshRef.current.geometry?.dispose()
        
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach(mat => {
            mat.map?.dispose()
            mat.dispose()
          })
        } else {
          meshRef.current.material?.map?.dispose()
          meshRef.current.material?.dispose()
        }
      }

      toolsMapMemo.forEach(({ brush }) => {
        brush.geometry?.dispose()
        brush.material?.map?.dispose()
        brush.material?.dispose()
      })
    }
  }, [sortedOpsMemo, toolsMapMemo, stockGeometryMemo, scene, executeBatchedCSG, stockProfile, onComplete, useDisplacementMap])

  // OPTIMIZATION 6: Efficient frame update
  useFrame(() => {
    if (autoRotate && meshRef.current && !isProcessingRef.current) {
      meshRef.current.rotation.y += rotationSpeed
    }
  })

  return null
}

export default TurningOperationCSG


// ============================================================================
// HELPER FUNCTIONS FOR CREATING OPERATIONS
// ============================================================================

/**
 * Create a facing operation
 */
export const createFacingOperation = (toolId, zPosition, params = {}) => ({
  id: `facing_${Date.now()}`,
  toolId,
  type: 'facing',
  position: { x: 0, y: zPosition, z: 0 },
  rotation: { x: Math.PI / 2, y: 0, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  ...params
})

/**
 * Create an OD turning operation
 */
export const createODTurningOperation = (toolId, xPosition, params = {}) => ({
  id: `od_turning_${Date.now()}`,
  toolId,
  type: 'od_turning',
  position: { x: xPosition, y: 0, z: 0 },
  rotation: { x: Math.PI / 2, y: 0, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  ...params
})

/**
 * Create a boring operation
 */
export const createBoringOperation = (toolId, diameter, depth, params = {}) => ({
  id: `boring_${Date.now()}`,
  toolId,
  type: 'boring',
  position: { x: 0, y: depth / 2, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  parameters: { diameter, depth },
  ...params
})

/**
 * Create a grooving operation
 */
export const createGroovingOperation = (toolId, position, width, depth, params = {}) => ({
  id: `groove_${Date.now()}`,
  toolId,
  type: 'groove',
  position,
  rotation: { x: 0, y: 0, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  parameters: { width, depth },
  ...params
})

/**
 * Create a taper turning operation
 */
export const createTaperOperation = (toolId, position, angle, length, params = {}) => ({
  id: `taper_${Date.now()}`,
  toolId,
  type: 'taper',
  position,
  rotation: { x: Math.PI / 2, y: angle, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  parameters: { angle, length },
  ...params
})

/**
 * Create a drilling operation
 */
export const createDrillingOperation = (toolId, position, params = {}) => ({
  id: `drill_${Date.now()}`,
  toolId,
  type: position.x === 0 && position.z === 0 ? 'center_drill' : 'off_center_drill',
  position,
  rotation: { x: 0, y: 0, z: 0 },
  csgOperation: 'subtraction',
  enabled: true,
  ...params
})


/**
 * Create a knurling operation - OPTIMIZED (no CSG)
 */
export const createKnurlOperation = (params = {}) => ({
  id: 'knurl_' + Date.now(),
  type: 'knurl',
  enabled: true,
  parameters: {
    knurlCount: params.knurlCount || 40,
    knurlDepth: params.knurlDepth || 1.5,
    knurlType: params.knurlType || 'axial'
  }
})

/**
 * Create radial knurling (backward compatible)
 */
export const createRadialKnurling = (params = {}) => [
  createKnurlOperation(params)
]
