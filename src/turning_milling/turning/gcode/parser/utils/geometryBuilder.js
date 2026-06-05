// ═══════════════════════════════════════════════════════════════════
// GEOMETRY BUILDER
// ═══════════════════════════════════════════════════════════════════

/**
 * GeometryBuilder - Converts passes into CSG-compatible geometry
 * Builds swept volumes, tool shapes, and material removal geometry
 */
export class GeometryBuilder {
  constructor(config = {}) {
    this.config = {
      machineType: config.machineType || 'LATHE',
      toolDatabase: config.toolDatabase || {},
      stockGeometry: config.stockGeometry || null,
      resolution: config.resolution || 32, // segments for curves
      ...config
    };

    this.geometries = []; // [stock, after_pass_1, after_pass_2, ...]
    this.toolShapes = {}; // Cached tool geometries
  }

  /**
   * Build geometry sequence from passes
   * Returns: [stock, geometry1, geometry2, ..., geometryN]
   * 
   * @param {Array} passes - Array of Pass objects from PassAnalyzer
   * @param {Object} stockProfile - Initial stock definition
   * @returns {Object} Geometry sequence with CSG metadata
   */
  buildGeometrySequence(passes, stockProfile) {
    this.geometries = [];

    // 1. Create initial stock geometry
    const stockGeometry = this._buildStockGeometry(stockProfile);
    this.geometries.push({
      index: 0,
      type: 'STOCK',
      geometry: stockGeometry,
      pass: null,
      cumulativeTime: 0,
      description: 'Initial stock material'
    });

    // 2. Build geometry after each pass
    let cumulativeGeometry = JSON.parse(JSON.stringify(stockGeometry));
    let cumulativeTime = 0;

    passes.forEach((pass, idx) => {
      cumulativeTime += pass.duration;

      // Generate cut volume for this pass
      const cutVolume = this._buildCutVolume(pass);

      // Apply CSG subtraction (conceptual - actual implementation uses CSG library)
      cumulativeGeometry = {
        ...cumulativeGeometry,
        cut: [...(cumulativeGeometry.cut || []), cutVolume]
      };

      this.geometries.push({
        index: idx + 1,
        type: 'AFTER_PASS',
        pass: pass,
        passNumber: idx + 1,
        passType: pass.type,
        geometry: JSON.parse(JSON.stringify(cumulativeGeometry)),
        cutVolume: cutVolume,
        cumulativeTime: cumulativeTime,
        description: `After ${pass.type.toLowerCase()} pass #${idx + 1}`
      });
    });

    return {
      totalGeometries: this.geometries.length,
      totalPasses: passes.length,
      geometries: this.geometries,
      csgOperations: this._generateCSGOperations(passes),
      timeline: this._generateTimeline(passes)
    };
  }

  /**
   * Build initial stock geometry based on profile
   * @private
   */
  _buildStockGeometry(stockProfile) {
    if (!stockProfile) {
      // Default lathe stock: cylinder
      return {
        type: 'LATHE_STOCK',
        diameter: 50,
        length: 100,
        centerline: 'Z',
        csgPrimitive: {
          type: 'CYLINDER',
          radius: 25,
          height: 100,
          segments: this.config.resolution
        }
      };
    }

    // Use provided stock profile
    if (Array.isArray(stockProfile)) {
      return {
        type: 'LATHE_STOCK',
        profile: stockProfile,
        csgPrimitive: {
          type: 'LATHE_PROFILE',
          points: stockProfile,
          revolved: true,
          segments: this.config.resolution
        }
      };
    }

    return stockProfile;
  }

  /**
   * Generate cut volume (swept volume of tool)
   * This is the material removed in one pass
   * @private
   */
  _buildCutVolume(pass) {
    if (!pass.segments || pass.segments.length === 0) {
      return { type: 'EMPTY', pass: pass.id };
    }

    const cutVolume = {
      passId: pass.id,
      passType: pass.type,
      segments: [],
      toolPath: this._extractToolPath(pass),
      metadata: {
        feedRate: pass.feedRate,
        startTime: pass.startTime,
        endTime: pass.endTime,
        distance: pass.distance
      }
    };

    // Build swept surfaces from tool motion
    pass.segments.forEach((segment, idx) => {
      const swept = this._buildSweptSurface(segment, idx, pass);
      if (swept) {
        cutVolume.segments.push(swept);
      }
    });

    return cutVolume;
  }

  /**
   * Build swept surface (tool moving along path)
   * @private
   */
  _buildSweptSurface(segment, segmentIndex, pass) {
    if (segment.type === 'RAPID') {
      return null; // No material removed during rapid
    }

    const toolShape = this._getToolShape(pass.toolNumber);

    return {
      type: 'SWEPT_SURFACE',
      toolNumber: pass.toolNumber,
      toolShape: toolShape,
      segment: {
        type: segment.type,
        start: { ...segment.start },
        end: { ...segment.end },
        distance: segment.distance,
        points: segment.points ? segment.points.slice(0, Math.min(10, segment.points.length)) : []
      },
      csgOperation: {
        type: 'SWEEP',
        profile: toolShape,
        path: this._discretizePath(segment),
        fillCaps: true
      }
    };
  }

  /**
   * Discretize motion path for CSG sweep
   * @private
   */
  _discretizePath(segment) {
    if (!segment.points) {
      return [
        { ...segment.start, t: 0 },
        { ...segment.end, t: 1 }
      ];
    }

    // Reduce points to reasonable number for CSG
    const points = segment.points;
    const maxPoints = 20;
    const step = Math.max(1, Math.floor(points.length / maxPoints));
    
    return points.filter((_, i) => i % step === 0);
  }

  /**
   * Get or create tool shape
   * @private
   */
  _getToolShape(toolNumber) {
    if (this.toolShapes[toolNumber]) {
      return this.toolShapes[toolNumber];
    }

    // Fetch from database or use default
    const toolDef = this.config.toolDatabase[toolNumber] || {
      type: 'TURNING',
      radius: 0.8,
      angle: 90,
      leadAngle: 5
    };

    const shape = this._createToolProfile(toolDef);
    this.toolShapes[toolNumber] = shape;
    return shape;
  }

  /**
   * Create tool profile from definition
   * @private
   */
  _createToolProfile(toolDef) {
    switch (toolDef.type) {
      case 'TURNING':
        return this._createTurningToolProfile(toolDef);
      case 'BORING':
        return this._createBoringToolProfile(toolDef);
      case 'THREADING':
        return this._createThreadingToolProfile(toolDef);
      case 'FACING':
        return this._createFacingToolProfile(toolDef);
      default:
        return this._createGenericToolProfile(toolDef);
    }
  }

  /** Create turning tool profile (chisel-like point) */
  _createTurningToolProfile(def) {
    return {
      type: 'POLYGON',
      points: [
        { x: 0, y: 0 },
        { x: def.radius, y: 0 },
        { x: def.radius * 0.7, y: def.radius * 0.3 },
        { x: 0, y: def.radius * 0.1 }
      ]
    };
  }

  /** Create boring tool profile (hole-making) */
  _createBoringToolProfile(def) {
    return {
      type: 'POLYGON',
      points: [
        { x: 0, y: 0 },
        { x: def.radius, y: 0 },
        { x: def.radius, y: -def.radius * 0.2 },
        { x: 0, y: -def.radius * 0.15 }
      ]
    };
  }

  /** Create threading tool profile (V-shaped) */
  _createThreadingToolProfile(def) {
    const angle = (def.threadAngle || 60) * Math.PI / 180 / 2;
    const depth = def.radius;
    return {
      type: 'POLYGON',
      points: [
        { x: 0, y: 0 },
        { x: depth / Math.tan(angle), y: depth },
        { x: -depth / Math.tan(angle), y: depth }
      ]
    };
  }

  /** Create facing tool profile (broad chisel) */
  _createFacingToolProfile(def) {
    return {
      type: 'POLYGON',
      points: [
        { x: 0, y: 0 },
        { x: def.radius, y: 0 },
        { x: def.radius * 0.9, y: def.radius * 0.2 },
        { x: 0, y: def.radius * 0.1 }
      ]
    };
  }

  /** Create generic tool profile (point tool) */
  _createGenericToolProfile(def) {
    return {
      type: 'CIRCLE',
      radius: def.radius || 0.8
    };
  }

  /**
   * Extract tool path from pass
   * @private
   */
  _extractToolPath(pass) {
    const path = [];
    pass.segments.forEach(segment => {
      if (segment.points && Array.isArray(segment.points)) {
        segment.points.forEach(pt => {
          path.push({ X: pt.X, Y: pt.Y, Z: pt.Z, t: pt.t });
        });
      }
    });
    return path;
  }

  /**
   * Generate CSG operation sequence (for external CSG library)
   * @private
   */
  _generateCSGOperations(passes) {
    const operations = [];

    passes.forEach((pass, idx) => {
      operations.push({
        step: idx + 1,
        operation: 'SUBTRACT',
        geometry: `cutVolume_pass_${idx + 1}`,
        from: idx === 0 ? 'stock' : `result_pass_${idx}`,
        result: `result_pass_${idx + 1}`,
        passInfo: {
          type: pass.type,
          id: pass.id,
          duration: pass.duration,
          distance: pass.distance
        }
      });
    });

    return operations;
  }

  /**
   * Generate timeline for visualization
   * @private
   */
  _generateTimeline(passes) {
    return passes.map((pass, idx) => ({
      index: idx,
      id: pass.id,
      type: pass.type,
      startTime: pass.startTime,
      endTime: pass.endTime,
      duration: pass.duration,
      geometryIndex: idx + 1, // Maps to geometry array
      description: `Pass ${idx + 1}: ${pass.type}`
    }));
  }

  /**
   * Get geometry at specific pass index
   */
  getGeometryAtPass(passIndex) {
    if (passIndex >= 0 && passIndex < this.geometries.length) {
      return this.geometries[passIndex];
    }
    return null;
  }

  /**
   * Get all geometries for playback
   */
  getAllGeometries() {
    return this.geometries;
  }

  /**
   * Export geometries for CSG library (Three.js CSGBSPnpm, JSCAD, etc.)
   */
  exportForCSG() {
    return {
      format: 'CSG_SEQUENCE',
      version: '1.0',
      totalGeometries: this.geometries.length,
      stock: this.geometries[0],
      geometries: this.geometries,
      csgScript: this._generateCSGScript()
    };
  }

  /**
   * Generate CSG script for external use
   * @private
   */
  _generateCSGScript() {
    const script = ['// Auto-generated CSG script from CNC passes'];
    
    script.push(`
let stock = createStockGeometry({
  type: 'CYLINDER',
  radius: 25,
  height: 100
});

let result = stock;
`);

    this.geometries.slice(1).forEach((geom, idx) => {
      if (geom.cutVolume) {
        script.push(`
// Pass ${geom.passNumber}: ${geom.passType}
let cutVolume_${idx} = createCutVolume(/* pass data */);
result = result.subtract(cutVolume_${idx});
geometries[${geom.index}] = result;
`);
      }
    });

    return script.join('\n');
  }
}