// ═══════════════════════════════════════════════════════════════════
// ENHANCED INTERPRETER
// ═══════════════════════════════════════════════════════════════════

/**
 * Enhanced Interpreter with Passes & Geometry
 * Extends original Interpreter with pass tracking and geometry building
 */
export class EnhancedInterpreter {
  constructor(baseInterpreter, config = {}) {
    this.interpreter = baseInterpreter;
    this.config = config;

    // Initialize pass analysis system
    this.passAnalyzer = new PassAnalyzer(config);
    this.geometryBuilder = new GeometryBuilder(config);

    // Results
    this.passes = [];
    this.geometrySequence = null;
  }

  /**
   * Run complete interpretation with pass & geometry analysis
   * @param {string} gcodeText - G-code program
   * @param {Object} stockProfile - Initial stock definition
   * @returns {Object} Complete analysis result
   */
  run(gcodeText, stockProfile = null) {
    // 1. Parse and execute G-code
    this.interpreter.load(gcodeText);
    const executionResult = this.interpreter.run();

    // 2. Analyze timeline into passes
    this.passes = this.passAnalyzer.analyze(
      executionResult.timeline,
      executionResult.finalState
    );

    // 3. Build geometry sequence
    this.geometrySequence = this.geometryBuilder.buildGeometrySequence(
      this.passes,
      stockProfile
    );

    // 4. Compile final result
    return this._compileResult(executionResult);
  }

  /**
   * Compile final result with all information
   * @private
   */
  _compileResult(executionResult) {
    return {
      // Original execution data
      timeline: executionResult.timeline,
      errors: executionResult.errors,
      warnings: executionResult.warnings,
      totalTime: executionResult.totalTime,
      finalState: executionResult.finalState,

      // NEW: Pass analysis
      passes: {
        total: this.passes.length,
        list: this.passes,
        summary: this.passAnalyzer.getSummary()
      },

      // NEW: Geometry sequence
      geometry: {
        total: this.geometrySequence.totalGeometries,
        geometries: this.geometrySequence.geometries,
        csgOperations: this.geometrySequence.csgOperations,
        timeline: this.geometrySequence.timeline
      },

      // Convenient accessors
      getPass: (idx) => this.passes[idx],
      getGeometry: (idx) => this.geometrySequence.geometries[idx],
      exportForCSG: () => this.geometryBuilder.exportForCSG(),

      // Playback control
      playback: {
        getTotalFrames: () => this.geometrySequence.totalGeometries,
        getFrameAtTime: (time) => this._getGeometryAtTime(time),
        getAllFrames: () => this.geometrySequence.geometries
      }
    };
  }

  /**
   * Get geometry at specific simulation time
   * @private
   */
  _getGeometryAtTime(time) {
    let passIndex = 0;
    let accTime = 0;

    for (let i = 0; i < this.passes.length; i++) {
      accTime += this.passes[i].duration;
      if (accTime >= time) {
        passIndex = i + 1; // +1 because index 0 is stock
        break;
      }
    }

    return this.geometrySequence.geometries[passIndex];
  }
}