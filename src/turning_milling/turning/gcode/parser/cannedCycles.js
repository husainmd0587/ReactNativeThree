// src/cnc/motion/cannedCycles.js

/**
 * Canned Cycle Engine
 * Handles lathe-specific canned cycles (G70-G76)
 * Implements roughing, finishing, threading, and pecking cycles
 */

export default class CannedCycles {
  constructor(stateMachine) {
    this.state = stateMachine;
    this.linearInterp = null; // Set by interpreter
  }

  /**
   * G70 - Finishing Cycle
   * Executes finish pass using previously defined rough profile
   * @param {Object} block - Parsed G-code block
   * @param {Object} profile - Rough cutting profile from G71
   * @returns {Array} Array of motion segments
   */
  executeG70(block, profile) {
    const segments = [];
    
    if (!profile || !profile.points) {
      return {
        error: 'G70 requires prior G71 rough cycle',
        segments: []
      };
    }

    // Execute finish pass at programmed feed rate
    const finishFeed = this.state.feed.commanded;

    for (let i = 0; i < profile.points.length - 1; i++) {
      const start = profile.points[i];
      const end = profile.points[i + 1];

      segments.push({
        type: 'FINISH_PASS',
        start: start,
        end: end,
        feedRate: finishFeed,
        toolPath: this.linearInterp.interpolate(start, end, finishFeed, false)
      });
    }

    return { segments, error: null };
  }

  /**
   * G71 - Rough Turning Cycle (OD/ID)
   * Removes material in multiple passes with specified depth of cut
   * @param {Object} block - Parsed block with cycle parameters
   * @param {Array} finishProfile - Target finish profile points
   * @returns {Object} Roughing segments and finish profile
   */
  executeG71(block, finishProfile) {
    const segments = [];
    
    // Extract cycle parameters
    const depthOfCut = block.arcParams.D || 2.0; // mm per pass (radius)
    const retractDistance = block.arcParams.U || 0.5; // mm
    const finishAllowance = block.arcParams.F || 0.2; // mm
    const feedRate = this.state.feed.commanded;

    if (!finishProfile || finishProfile.length < 2) {
      return {
        error: 'G71 requires finish profile definition',
        segments: []
      };
    }

    // Get stock profile
    const stockProfile = this.getStockProfile();
    const startX = stockProfile.maxRadius;
    const currentZ = this.state.position.Z;

    // Calculate number of passes needed
    const totalDepth = startX - finishProfile[0].X + finishAllowance;
    const numPasses = Math.ceil(totalDepth / depthOfCut);

    // Generate roughing passes
    for (let pass = 0; pass < numPasses; pass++) {
      const currentDepth = startX - (pass + 1) * depthOfCut;
      const passX = Math.max(currentDepth, finishProfile[0].X + finishAllowance);

      // Rough pass - feed along Z
      segments.push({
        type: 'ROUGH_PASS',
        pass: pass + 1,
        depth: passX,
        moves: [
          // Rapid to start
          {
            start: { X: startX * 2, Z: currentZ }, // X in diameter
            end: { X: passX * 2, Z: currentZ },
            rapid: true
          },
          // Feed along profile
          {
            start: { X: passX * 2, Z: currentZ },
            end: { X: passX * 2, Z: finishProfile[finishProfile.length - 1].Z },
            rapid: false,
            feedRate: feedRate
          },
          // Retract
          {
            start: { X: passX * 2, Z: finishProfile[finishProfile.length - 1].Z },
            end: { X: (passX + retractDistance) * 2, Z: finishProfile[finishProfile.length - 1].Z },
            rapid: true
          },
          // Return to start Z
          {
            start: { X: (passX + retractDistance) * 2, Z: finishProfile[finishProfile.length - 1].Z },
            end: { X: (passX + retractDistance) * 2, Z: currentZ },
            rapid: true
          }
        ]
      });
    }

    return {
      segments,
      finishProfile: finishProfile,
      error: null
    };
  }

  /**
   * G72 - Rough Facing Cycle
   * Removes material in facing direction (along X)
   * @param {Object} block - Cycle parameters
   * @param {Array} finishProfile - Target profile
   * @returns {Object} Facing segments
   */
  executeG72(block, finishProfile) {
    const segments = [];
    
    const depthOfCut = block.arcParams.D || 2.0;
    const retractDistance = block.arcParams.U || 0.5;
    const finishAllowance = block.arcParams.F || 0.2;
    const feedRate = this.state.feed.commanded;

    if (!finishProfile || finishProfile.length < 2) {
      return {
        error: 'G72 requires finish profile definition',
        segments: []
      };
    }

    const startZ = this.state.position.Z;
    const endZ = finishProfile[finishProfile.length - 1].Z + finishAllowance;
    const totalDepth = Math.abs(startZ - endZ);
    const numPasses = Math.ceil(totalDepth / depthOfCut);

    // Generate facing passes
    for (let pass = 0; pass < numPasses; pass++) {
      const passZ = startZ - (pass + 1) * depthOfCut;
      const targetZ = Math.max(passZ, endZ);

      segments.push({
        type: 'FACE_PASS',
        pass: pass + 1,
        depth: targetZ,
        moves: [
          // Position at start
          {
            start: { X: finishProfile[0].X * 2, Z: startZ },
            end: { X: finishProfile[0].X * 2, Z: targetZ },
            rapid: true
          },
          // Feed across face
          {
            start: { X: finishProfile[0].X * 2, Z: targetZ },
            end: { X: finishProfile[finishProfile.length - 1].X * 2, Z: targetZ },
            rapid: false,
            feedRate: feedRate
          },
          // Retract
          {
            start: { X: finishProfile[finishProfile.length - 1].X * 2, Z: targetZ },
            end: { X: finishProfile[finishProfile.length - 1].X * 2, Z: targetZ - retractDistance },
            rapid: true
          }
        ]
      });
    }

    return { segments, error: null };
  }

  /**
   * G74 - Peck Drilling Cycle (Z-axis)
   * High-speed peck drilling with chip breaking
   * @param {Object} block - Cycle parameters
   * @returns {Object} Drilling segments
   */
  executeG74(block) {
    const segments = [];
    
    const finalDepth = block.coordinates.Z || 0;
    const peckDepth = block.arcParams.Q || 5.0; // mm per peck
    const retractDistance = block.arcParams.U || 1.0;
    const dwellTime = block.dwellTime || 0;
    const feedRate = this.state.feed.commanded;

    const startZ = this.state.position.Z;
    const totalDepth = Math.abs(finalDepth - startZ);
    const numPecks = Math.ceil(totalDepth / peckDepth);

    // Generate peck cycle
    for (let peck = 0; peck < numPecks; peck++) {
      const peckZ = startZ - Math.min((peck + 1) * peckDepth, totalDepth);

      segments.push({
        type: 'PECK_DRILL',
        peck: peck + 1,
        moves: [
          // Feed to depth
          {
            start: { X: this.state.position.X, Z: peck === 0 ? startZ : (startZ - peck * peckDepth + retractDistance) },
            end: { X: this.state.position.X, Z: peckZ },
            rapid: false,
            feedRate: feedRate
          },
          // Dwell
          ...(dwellTime > 0 ? [{
            type: 'DWELL',
            duration: dwellTime
          }] : []),
          // Retract
          {
            start: { X: this.state.position.X, Z: peckZ },
            end: { X: this.state.position.X, Z: startZ },
            rapid: true
          }
        ]
      });
    }

    return { segments, error: null };
  }

  /**
   * G75 - Grooving Cycle (Peck Grooving)
   * Pecking groove cycle in X direction
   * @param {Object} block - Cycle parameters
   * @returns {Object} Grooving segments
   */
  executeG75(block) {
    const segments = [];
    
    const finalX = block.coordinates.X || 0;
    const peckDepth = block.arcParams.Q || 1.0; // mm per peck (radial)
    const retractDistance = block.arcParams.U || 0.5;
    const dwellTime = block.dwellTime || 0;
    const feedRate = this.state.feed.commanded;

    const startX = this.state.position.X;
    const totalDepth = Math.abs(finalX - startX);
    const numPecks = Math.ceil(totalDepth / (peckDepth * 2)); // Diameter

    // Generate peck grooving cycle
    for (let peck = 0; peck < numPecks; peck++) {
      const peckX = startX - Math.min((peck + 1) * peckDepth * 2, totalDepth);

      segments.push({
        type: 'PECK_GROOVE',
        peck: peck + 1,
        moves: [
          // Feed in
          {
            start: { X: peck === 0 ? startX : (startX - peck * peckDepth * 2 + retractDistance * 2), Z: this.state.position.Z },
            end: { X: peckX, Z: this.state.position.Z },
            rapid: false,
            feedRate: feedRate
          },
          // Dwell
          ...(dwellTime > 0 ? [{
            type: 'DWELL',
            duration: dwellTime
          }] : []),
          // Retract
          {
            start: { X: peckX, Z: this.state.position.Z },
            end: { X: startX, Z: this.state.position.Z },
            rapid: true
          }
        ]
      });
    }

    return { segments, error: null };
  }

  /**
   * G76 - Threading Cycle
   * Multiple-pass threading with automatic depth calculation
   * @param {Object} block - Threading parameters
   * @returns {Object} Threading segments
   */
  executeG76(block) {
    const segments = [];
    
    // Threading parameters
    const pitch = block.arcParams.P || 1.5; // mm
    const threadDepth = block.arcParams.E || (pitch * 0.6134); // 60° thread
    const finishDepth = block.arcParams.F || 0.05; // Finish allowance
    const threadAngle = block.arcParams.A || 60; // degrees
    const startZ = this.state.position.Z;
    const endZ = block.coordinates.Z || (startZ - 50);
    const startX = this.state.position.X;
    const endX = startX - (threadDepth * 2); // Diameter

    // Calculate number of passes (depth progression)
    const passes = this.calculateThreadPasses(threadDepth, finishDepth);

    // Generate threading passes
    passes.forEach((depth, index) => {
      const passX = startX - (depth * 2); // Convert to diameter

      segments.push({
        type: 'THREAD_PASS',
        pass: index + 1,
        depth: depth,
        moves: [
          // Position at start
          {
            start: { X: startX, Z: startZ },
            end: { X: passX, Z: startZ },
            rapid: true
          },
          // Thread cut (synchronized with spindle)
          {
            start: { X: passX, Z: startZ },
            end: { X: passX, Z: endZ },
            rapid: false,
            synchronized: true,
            pitch: pitch,
            threadDepth: depth
          },
          // Retract
          {
            start: { X: passX, Z: endZ },
            end: { X: startX, Z: endZ },
            rapid: true
          },
          // Return
          {
            start: { X: startX, Z: endZ },
            end: { X: startX, Z: startZ },
            rapid: true
          }
        ]
      });
    });

    return { segments, error: null };
  }

  /**
   * Calculate threading pass depths
   * Uses constant chip load algorithm
   * @param {number} totalDepth - Total thread depth
   * @param {number} finishAllowance - Finish pass allowance
   * @returns {Array} Array of pass depths
   */
  calculateThreadPasses(totalDepth, finishAllowance) {
    const passes = [];
    let remainingDepth = totalDepth - finishAllowance;
    let currentDepth = 0;
    let passNumber = 1;

    // First pass depth (typically 0.3-0.4mm)
    const firstPassDepth = Math.min(0.3, remainingDepth * 0.4);

    while (remainingDepth > 0.01) {
      let passDepth;
      
      if (passNumber === 1) {
        passDepth = firstPassDepth;
      } else {
        // Constant chip load: depth ∝ sqrt(pass number)
        passDepth = firstPassDepth * Math.sqrt(passNumber) - currentDepth;
      }

      passDepth = Math.min(passDepth, remainingDepth);
      currentDepth += passDepth;
      passes.push(currentDepth);
      
      remainingDepth = totalDepth - finishAllowance - currentDepth;
      passNumber++;

      // Safety limit
      if (passNumber > 20) break;
    }

    // Add finish pass
    passes.push(totalDepth);

    return passes;
  }

  /**
   * Get current stock profile for material removal calculation
   * @returns {Object} Stock profile data
   */
  getStockProfile() {
    if (this.state.lathe && this.state.lathe.currentStock.length > 0) {
      return {
        maxRadius: Math.max(...this.state.lathe.currentStock.map(p => p.X)),
        profile: this.state.lathe.currentStock
      };
    }

    // Default stock profile
    return {
      maxRadius: 50,
      profile: [
        { X: 50, Z: 0 },
        { X: 50, Z: -100 }
      ]
    };
  }
}