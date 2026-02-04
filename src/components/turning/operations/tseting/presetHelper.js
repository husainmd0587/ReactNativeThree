
// ============================================================================
// OPERATION PRESETS
// ============================================================================

/**
 * Get recommended tool geometry for operation type
 */
export const getOperationPreset = (operationType) => {
  const presets = {
    facing: {
      geometry: { type: 'box', dimensions: { width: 50, height: 5, depth: 50 } },
      texture: { type: 'checkerboard', color1: 0xFF6B6B, color2: 0xCC5555 }
    },
    od_turning: {
      geometry: { type: 'box', dimensions: { width: 10, height: 10, depth: 100 } },
      texture: { type: 'checkerboard', color1: 0x4ECDC4, color2: 0x3EADA3 }
    },
    boring: {
      geometry: { type: 'cylinder', dimensions: { radius: 8, length: 80 } },
      texture: { type: 'gradient', color1: 0xFF6B9D, color2: 0xCC5585 }
    },
    center_drill: {
      geometry: { type: 'cone', dimensions: { radiusTop: 0, radiusBottom: 3, length: 15 } },
      texture: { type: 'solid', color1: 0xFFD93D }
    },
    off_center_drill: {
      geometry: { type: 'cylinder', dimensions: { radius: 2, length: 30 } },
      texture: { type: 'grid', color1: 0x6BCF7F, color2: 0x4AAF5F }
    },
    taper: {
      geometry: { type: 'cone', dimensions: { radiusTop: 5, radiusBottom: 10, length: 50 } },
      texture: { type: 'gradient', color1: 0x95E1D3, color2: 0x6DC5B9 }
    },
    groove: {
      geometry: { type: 'box', dimensions: { width: 3, height: 15, depth: 3 } },
      texture: { type: 'checkerboard', color1: 0xFFA07A, color2: 0xDD8855 }
    },
    thread: {
      geometry: { type: 'box', dimensions: { width: 2, height: 60, depth: 2 } },
      texture: { type: 'grid', color1: 0xB0B0FF, color2: 0x8888DD }
    },
    knurl: {
      geometry: { type: 'sphere', dimensions: { radius: 4 } },
      texture: { type: 'grid', color1: 0xDDA15E, color2: 0xBC6C25 }
    },
    chamfer: {
      geometry: { type: 'cone', dimensions: { radiusTop: 2, radiusBottom: 8, length: 10 } },
      texture: { type: 'gradient', color1: 0xC9ADA7, color2: 0xA88A85 }
    },
    parting: {
      geometry: { type: 'box', dimensions: { width: 2, height: 60, depth: 2 } },
      texture: { type: 'solid', color1: 0xFF4444 }
    }
  }
  
  return presets[operationType] || presets.od_turning
}
//============================================================================
// HELPER: THREADING CONFIGURATION PRESETS
// ============================================================================

export const threadingPresets = {
  fine: {
    threadPitch: 1.5,
    threadCount: 40,
    toolWidth: 1.0,
    description: 'Fine precision threading'
  },
  standard: {
    threadPitch: 2.5,
    threadCount: 20,
    toolWidth: 1.5,
    description: 'Standard threading (recommended)'
  },
  coarse: {
    threadPitch: 4.0,
    threadCount: 10,
    toolWidth: 2.0,
    description: 'Coarse bold threading'
  },
  extraCoarse: {
    threadPitch: 5.0,
    threadCount: 8,
    toolWidth: 2.5,
    description: 'Extra coarse threading'
  }
}
