// ═══════════════════════════════════════════════════════════════════
// USAGE EXAMPLE & INTEGRATION
// ═══════════════════════════════════════════════════════════════════

export class CNCSImulationManager {
  /**
   * Complete integration point for CNC simulation
   * Combines parser, interpreter, passes, and geometry
   */
  constructor(config = {}) {
    this.config = {
      machineType: 'LATHE',
      maxX: 300,
      maxY: 300,
      maxZ: 300,
      resolution: 32,
      stockProfile: null,
      toolDatabase: {},
      ...config
    };
  }

  /**
   * Full pipeline: G-code → Passes → Geometry
   * 
   * Usage:
   *   const manager = new CNCSImulationManager();
   *   const result = manager.simulate(gcodeText);
   *   
   *   // Access results
   *   result.passes.total          // Number of passes
   *   result.geometry.total        // Number of geometries
   *   result.getGeometry(5)        // Get geometry after pass 5
   *   result.exportForCSG()        // Export for Three.js/JSCAD
   */
  simulate(gcodeText, stockProfile = null) {
    // Import these from your existing interpreter
    const { Interpreter } = require('./src/cnc/core/interpreter.js');

    // Create base interpreter
    const baseInterpreter = new Interpreter(this.config);

    // Create enhanced interpreter
    const enhancedInterpreter = new EnhancedInterpreter(baseInterpreter, this.config);

    // Run complete pipeline
    return enhancedInterpreter.run(gcodeText, stockProfile || this.config.stockProfile);
  }

  /**
   * Visualize passes summary
   */
  reportPasses(result) {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log(  '║           CNC PASSES REPORT               ║');
    console.log(  '╚═══════════════════════════════════════════╝\n');

    console.log(`Total Passes: ${result.passes.total}`);
    console.log(`Total Time: ${result.totalTime.toFixed(2)}s\n`);

    const byType = result.passes.summary.byType;
    Object.entries(byType).forEach(([type, passes]) => {
      console.log(`${type}: ${passes.length} pass(es)`);
      passes.forEach((pass, idx) => {
        console.log(
          `  Pass ${pass.id}: ${pass.distance.toFixed(2)}mm in ${pass.duration.toFixed(2)}s ` +
          `@ ${pass.feedRate.toFixed(0)} mm/min`
        );
      });
    });

    console.log(`\nGeometry Frames: ${result.geometry.total}`);
  }

  /**
   * Export complete simulation for web viewer
   */
  exportForWeb(result) {
    return {
      version: '1.0',
      simulation: {
        totalTime: result.totalTime,
        passes: result.passes.list,
        geometryFrames: result.geometry.geometries.length
      },
      playback: {
        frames: result.geometry.geometries,
        timeline: result.geometry.timeline,
        csgOps: result.geometry.csgOperations
      },
      machineState: result.finalState
    };
  }
}

// Export all
export default {
  PassAnalyzer,
  GeometryBuilder,
  EnhancedInterpreter,
  CNCSImulationManager
};