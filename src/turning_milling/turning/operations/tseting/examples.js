import React from 'react'
import TurningOperationCSG, {
  createFacingOperation,
  createODTurningOperation,
  createBoringOperation,
  createGroovingOperation,
  createTaperOperation,
  createDrillingOperation,
  createKnurlOperation
} from  './bvhTest'
import { threadingPresets } from './presetHelper'
// ============================================================================
// EXAMPLE 1: BASIC CYLINDRICAL TURNING
// ============================================================================

export function Example1_BasicCylindricalTurning() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 50,
    innerDiameter: 0,
    length: 100,
    segments: 64,
    material: {
      color: 0x999999,
      roughness: 0.5,
      metalness: 0.3
    }
  }

  const tools = [
    {
      id: 'facing_tool',
      name: 'Facing Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 60, height: 5, depth: 60 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0xFF6B6B,
        color2: 0xCC5555
      }
    },
    {
      id: 'turning_tool',
      name: 'OD Turning Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 10, height: 10, depth: 120 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0x4ECDC4,
        color2: 0x3EADA3
      }
    }
  ]

  const operations = [
    createFacingOperation('facing_tool', 50, { order: 1 }),
    createFacingOperation('facing_tool', -50, { order: 2 }),
    createODTurningOperation('turning_tool', 20, { order: 3 })
  ]
  
  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
      rotationSpeed={0.005}
    />
  )  
} 

// ============================================================================
// EXAMPLE 2: COMPLEX SHAFT WITH MULTIPLE FEATURES
// ============================================================================

export function Example2_ComplexShaft() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 60,
    innerDiameter: 0,
    length: 150,
    segments: 32,
    material: {
      color: 0xAAAAAA,
      roughness: 0.4,
      metalness: 0.5
    }
  }

  const tools = [
    {
      id: 'center_drill',
      name: 'Center Drill',
      geometry: {
        type: 'cone',
        dimensions: { radiusTop: 0, radiusBottom: 3, length: 15 }
      },
      texture: {
        type: 'solid',
        color1: 0xFFD93D
      }
    },
    {
      id: 'boring_tool',
      name: 'Boring Bar',
      geometry: {
        type: 'cylinder',
        dimensions: { radius: 10, length: 100 }
      },
      texture: {
        type: 'gradient',
        color1: 0xFF6B9D,
        color2: 0xCC5585
      }
    },
    {
      id: 'od_tool',
      name: 'Turning Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 15, height: 15, depth: 160 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0x4ECDC4,
        color2: 0x3EADA3
      }
    },
    {
      id: 'groove_tool',
      name: 'Grooving Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 3, height: 20, depth: 3 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0xFFA07A,
        color2: 0xDD8855
      }
    }
  ]

  const operations = [
    // Center drilling
    createDrillingOperation('center_drill', { x: 0, y: 75, z: 0 }, { order: 1 }),
    createDrillingOperation('center_drill', { x: 0, y: -75, z: 0 }, { 
      order: 2,
      rotation: { x: Math.PI, y: 0, z: 0 }
    }),
    
    // Boring operation
    createBoringOperation('boring_tool', 20, 100, { order: 3 }),
    
    // OD turning in steps
    createODTurningOperation('od_tool', 25, { 
      order: 4,
      position: { x: 25, y: 30, z: 0 }
    }),
    createODTurningOperation('od_tool', 22, { 
      order: 5,
      position: { x: 22, y: -20, z: 0 }
    }),
    
    // Grooving
    createGroovingOperation('groove_tool', { x: 18, y: 40, z: 0 }, 3, 5, { order: 6 }),
    createGroovingOperation('groove_tool', { x: 18, y: 0, z: 0 }, 3, 5, { order: 7 }),
    createGroovingOperation('groove_tool', { x: 18, y: -40, z: 0 }, 3, 5, { order: 8 })
  ]

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
      rotationSpeed={0.003}
      onProgress={(progress) => {
        console.log(`Operation ${progress.current}/${progress.total}:`, progress.operation.type)
      }}
      onComplete={(mesh) => {
        console.log('Turning complete!', mesh)
      }}
    />
  )
}

// ============================================================================
// EXAMPLE 3: TAPERED PART
// ============================================================================

export function Example3_TaperedPart() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 40,
    innerDiameter: 0,
    length: 120,
    segments: 32
  }

  const tools = [
    {
      id: 'taper_tool',
      name: 'Taper Tool',
      geometry: {
        type: 'cone',
        dimensions: { radiusTop: 8, radiusBottom: 15, length: 80 }
      },
      texture: {
        type: 'gradient',
        color1: 0x95E1D3,
        color2: 0x6DC5B9
      }
    },
    {
      id: 'facing_tool',
      name: 'Facing Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 50, height: 5, depth: 50 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0xFF6B6B,
        color2: 0xCC5555
      }
    }
  ]

  const operations = [
    createFacingOperation('facing_tool', 60, { order: 1 }),
    createTaperOperation('taper_tool', { x: 15, y: 20, z: 0 }, 0.1, 80, { order: 2 }),
    createTaperOperation('taper_tool', { x: -15, y: 20, z: 0 }, -0.1, 80, { order: 3 })
  ]

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
    />
  )
}

// ============================================================================
// EXAMPLE 4: CUSTOM LATHE PROFILE
// ============================================================================

export function Example4_CustomLatheProfile() {
  // Create custom lathe points for an artistic profile
  const lathePoints = []
  lathePoints.push({ x: 0, y: 0 })
  
  for (let i = 0; i < 15; i++) {
    const angle = i * 0.4
    const radius = Math.sin(angle) * 8 + 20
    const height = i * 7
    lathePoints.push({ x: radius, y: height })
  }
  
  lathePoints.push({ x: 0, y: 105 })

  const stockProfile = {
    type: 'lathe',
    outerDiameter: 40,
    innerDiameter: 0,
    length: 105,
    lathePoints: lathePoints,
    segments: 32,
    material: {
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.2
    }
  }

  const tools = [
    {
      id: 'center_hole',
      name: 'Center Hole',
      geometry: {
        type: 'cylinder',
        dimensions: { radius: 4, length: 110 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0xFF0000,
        color2: 0xCC0000
      }
    },
    {
      id: 'detail_tool',
      name: 'Detail Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 5, height: 5, depth: 50 }
      },
      texture: {
        type: 'grid',
        color1: 0x00FF00,
        color2: 0x00CC00
      }
    }
  ]

  const operations = [
    {
      id: 'center_bore',
      toolId: 'center_hole',
      type: 'boring',
      position: { x: 0, y: 52.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      csgOperation: 'subtraction',
      enabled: true,
      order: 1
    },
    {
      id: 'detail_1',
      toolId: 'detail_tool',
      type: 'groove',
      position: { x: 15, y: 30, z: 0 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      csgOperation: 'subtraction',
      enabled: true,
      order: 2
    }
  ]

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
      rotationSpeed={0.004}
    />
  )
}

// ============================================================================
// EXAMPLE 5: THREADING AND KNURLING
// ============================================================================


export function Example5_ThreadingAndKnurling() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 35,
    innerDiameter: 0,
    length: 100,
    segments: 32
  }

  const tools = [
    {
      id: 'thread_tool',
      name: 'Threading Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 2, height: 60, depth: 2 }
      },
      texture: {
        type: 'grid',
        color1: 0xB0B0FF,
        color2: 0x8888DD
      }
    }
  ]

  // ========================================================================
  // OPTION 1: KNURLING ONLY (FASTEST - ~50-100ms) ✅ DEFAULT
  // ========================================================================
  // const operations = [
  //   createKnurlOperation({
  //     knurlCount: 40,      // Standard knurling pattern
  //     knurlDepth: 1.5      // Moderate depth
  //   })
  // ]

  // ========================================================================
  // OPTION 2: THREADING ONLY (~200-300ms)
  // ========================================================================
  // Uncomment below and comment out OPTION 1 to use
const operations = []
const preset = threadingPresets.standard

const threadRadius = stockProfile.outerDiameter / 2
const threadPitch = preset.threadPitch
const threadCount = preset.threadCount

for (let i = 0; i < threadCount; i++) {
  const angle = (i / threadCount) * Math.PI * 2
  const yPosition = -50 + (i * threadPitch)
  
  operations.push({
    id: `thread_${i}`,
    toolId: 'thread_tool',
    position: {
      x: Math.cos(angle) * threadRadius,
      y: yPosition,
      z: Math.sin(angle) * threadRadius
    },
    rotation: {
      x: Math.PI / 2,
      y: angle,
      z: 0
    },
    csgOperation: 'subtraction',
    enabled: true,
    order: i
  })
}
  // ========================================================================
  // OPTION 3: THREADING + KNURLING (BALANCED - ~300-400ms)
  // ========================================================================
  // Uncomment below and comment out OPTION 1 to use both operations
  // const operations = []
  // 
  // // Create threading first (orders 0-19)
  // for (let i = 0; i < 20; i++) {
  //   operations.push({
  //     id: `thread_${i}`,
  //     toolId: 'thread_tool',
  //     type: 'thread',
  //     position: { x: 13, y: -45 + i * 2.5, z: 0 },
  //     rotation: { x: 0, y: i * 0.3, z: 0 },
  //     csgOperation: 'subtraction',
  //     enabled: true,
  //     order: i
  //   })
  // }
  // 
  // // Add knurling LAST (always use highest order)
  // operations.push(
  //   createKnurlOperation({
  //     knurlCount: 40,
  //     knurlDepth: 1.5,
  //     order: 100  // ✓ IMPORTANT: Always last!
  //   })
  // )

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
      rotationSpeed={0.002}
      // Optional: Add callbacks
      onProgress={(progress) => {
        const percent = Math.round((progress.current / progress.total) * 100)
        console.log(`Progress: ${percent}% - ${progress.operation.type}`)
      }}
      onComplete={(mesh) => {
        console.log('✓ Rendering complete!', mesh)
      }}
    />
  )
}



// ============================================================================
// EXAMPLE 6: OFF-CENTER DRILLING PATTERN
// ============================================================================

export function Example6_OffCenterDrilling() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 50,
    innerDiameter: 0,
    length: 80,
    segments: 32
  }

  const tools = [
    {
      id: 'drill',
      name: 'Drill Bit',
      geometry: {
        type: 'cylinder',
        dimensions: { radius: 3, length: 40 }
      },
      texture: {
        type: 'gradient',
        color1: 0x6BCF7F,
        color2: 0x4AAF5F
      }
    }
  ]

  const operations = []
  const drillPattern = 6
  const patternRadius = 18
  
  for (let i = 0; i < drillPattern; i++) {
    const angle = (i / drillPattern) * Math.PI * 2
    operations.push({
      id: `drill_${i}`,
      toolId: 'drill',
      type: 'off_center_drill',
      position: {
        x: Math.cos(angle) * patternRadius,
        y: 20,
        z: Math.sin(angle) * patternRadius
      },
      rotation: { x: 0, y: 0, z: 0 },
      csgOperation: 'subtraction',
      enabled: true,
      order: i + 1
    })
  }

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
    />
  )
}

// ============================================================================
// EXAMPLE 7: PARTING/CUT-OFF OPERATION
// ============================================================================

export function Example7_PartingOperation() {
  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 35,
    innerDiameter: 0,
    length: 120,
    segments: 32
  }

  const tools = [
    {
      id: 'od_tool',
      name: 'Turning Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 10, height: 10, depth: 130 }
      },
      texture: {
        type: 'checkerboard',
        color1: 0x4ECDC4,
        color2: 0x3EADA3
      }
    },
    {
      id: 'parting_tool',
      name: 'Parting Tool',
      geometry: {
        type: 'box',
        dimensions: { width: 3, height: 40, depth: 3 }
      },
      texture: {
        type: 'solid',
        color1: 0xFF4444
      }
    }
  ]

  const operations = [
    createODTurningOperation('od_tool', 15, { order: 1 }),
    {
      id: 'parting',
      toolId: 'parting_tool',
      type: 'parting',
      position: { x: 15, y: 30, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      csgOperation: 'subtraction',
      enabled: true,
      order: 2
    }
  ]

  return (
    <TurningOperationCSG
      stockProfile={stockProfile}
      tools={tools}
      operations={operations}
      autoRotate={true}
    />
  )
}

// ============================================================================
// EXAMPLE 8: DYNAMIC OPERATION CONTROL
// ============================================================================

export function Example8_DynamicControl() {
  const [enabledOps, setEnabledOps] = React.useState({
    facing: true,
    turning: true,
    boring: true,
    groove: true
  })

  const stockProfile = {
    type: 'cylinder',
    outerDiameter: 45,
    innerDiameter: 0,
    length: 100,
    segments: 32
  }

  const tools = [
    {
      id: 'tool1',
      name: 'Facing Tool',
      geometry: { type: 'box', dimensions: { width: 50, height: 5, depth: 50 } },
      texture: { type: 'checkerboard', color1: 0xFF6B6B, color2: 0xCC5555 }
    },
    {
      id: 'tool2',
      name: 'Turning Tool',
      geometry: { type: 'box', dimensions: { width: 10, height: 10, depth: 110 } },
      texture: { type: 'checkerboard', color1: 0x4ECDC4, color2: 0x3EADA3 }
    },
    {
      id: 'tool3',
      name: 'Boring Tool',
      geometry: { type: 'cylinder', dimensions: { radius: 8, length: 80 } },
      texture: { type: 'gradient', color1: 0xFF6B9D, color2: 0xCC5585 }
    },
    {
      id: 'tool4',
      name: 'Grooving Tool',
      geometry: { type: 'box', dimensions: { width: 3, height: 15, depth: 3 } },
      texture: { type: 'checkerboard', color1: 0xFFA07A, color2: 0xDD8855 }
    }
  ]

  const operations = [
    { ...createFacingOperation('tool1', 50), enabled: enabledOps.facing },
    { ...createODTurningOperation('tool2', 18), enabled: enabledOps.turning },
    { ...createBoringOperation('tool3', 16, 70), enabled: enabledOps.boring },
    { ...createGroovingOperation('tool4', { x: 15, y: 20, z: 0 }, 3, 5), enabled: enabledOps.groove }
  ]

  return (
    <>
      <TurningOperationCSG
        stockProfile={stockProfile}
        tools={tools}
        operations={operations}
        autoRotate={true}
      />
      
      {/* Control panel would go here in actual implementation */}
    </>
  )
}

// Export all examples
export default {
  Example1_BasicCylindricalTurning,
  Example2_ComplexShaft,
  Example3_TaperedPart,
  Example4_CustomLatheProfile,
  Example5_ThreadingAndKnurling,
  Example6_OffCenterDrilling,
  Example7_PartingOperation,
  Example8_DynamicControl
}
