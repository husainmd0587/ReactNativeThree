/**
 * CustomGCodeParser - Single Class GCode & MCode Parser
 * No dependencies, pure JavaScript
 * Parses CNC lathe GCode/MCode and converts to commands
 */

class CustomGCodeParser {
  constructor() {
    this.reset();
    this.validGCodes = {
      0: 'rapid', 1: 'linear', 2: 'arc_cw', 3: 'arc_ccw',
      4: 'dwell', 10: 'offsets', 18: 'plane_xz', 19: 'plane_yz', 20: 'plane_xy',
      20: 'inches', 21: 'millimeters',
      28: 'home', 30: 'home_alternate', 40: 'tool_radius_off',
      41: 'tool_radius_left', 42: 'tool_radius_right',
      49: 'tool_height_cancel', 54: 'set_offset', 55: 'set_offset_dynamic',
      80: 'cancel_canned_cycle', 81: 'drilling', 82: 'drilling_peck',
      83: 'deep_drilling', 84: 'tapping', 85: 'boring',
      90: 'absolute', 91: 'incremental'
    };

    this.validMCodes = {
      0: 'stop', 1: 'optional_stop', 2: 'end', 3: 'spindle_cw',
      4: 'spindle_ccw', 5: 'spindle_off', 6: 'tool_change',
      7: 'coolant_on', 8: 'coolant_flood', 9: 'coolant_off',
      10: 'pallets_clamp', 11: 'pallets_unclamp', 13: 'spindle_orient',
      19: 'spindle_orient', 25: 'cooler_on', 26: 'cooler_off',
      30: 'program_end', 98: 'subprogram_return', 99: 'loop'
    };
  }

  reset() {
    this.state = {
      position: { x: 0, z: 0 },
      feedRate: 0,
      feedMode: 'G94', // G94 = feed per minute, G95 = feed per rev
      units: 'G21', // G21 = mm, G20 = inches
      distanceMode: 'G90', // G90 = absolute, G91 = incremental
      motionMode: 'G0', // current motion mode
      plane: 'G18', // G18 = XZ, G19 = YZ, G20 = XY
      tool: 0,
      spindle: { on: false, speed: 0, direction: 'CW' },
      coolant: { on: false, type: 'flood' },
      arcMode: 'incremental' // incremental offsets or radius
    };

    this.commands = [];
    this.errors = [];
    this.warnings = [];
    this.lineNumber = 0;
  }

  /**
   * Main parse method - parse complete GCode program
   */
  parse(gcodeText) {
    const lines = gcodeText.split('\n');
    
    lines.forEach((line, index) => {
      this.lineNumber = index + 1;
      this.parseLine(line);
    });

    return this.getReport();
  }

  /**
   * Parse single line of GCode
   */
  parseLine(line) {
    // Remove comments and trim
    const cleanLine = this.removeComments(line).trim();
    
    // Skip empty lines
    if (!cleanLine.length) return;

    // Tokenize the line
    const tokens = this.tokenize(cleanLine);
    
    if (!tokens.length) return;

    // Parse tokens
    const block = this.parseTokens(tokens);
    
    if (block) {
      // Handle G-codes first (modal)
      if (block.G !== undefined) {
        this.handleGCode(block.G, block);
      }

      // Handle M-codes
      if (block.M !== undefined) {
        this.handleMCode(block.M, block);
      }

      // Handle other parameters
      if (block.S !== undefined) {
        this.state.spindle.speed = block.S;
      }

      if (block.F !== undefined) {
        this.state.feedRate = block.F;
      }

      if (block.T !== undefined) {
        this.state.tool = block.T;
      }

      // Handle motion based on current mode
      if (['G0', 'G1', 'G2', 'G3'].includes(this.state.motionMode)) {
        this.handleMotion(block);
      }
    }
  }

  /**
   * Remove comments from line (both ; and () styles)
   */
  removeComments(line) {
    // Remove semicolon comments
    let cleaned = line.split(';')[0];
    
    // Remove parenthesis comments
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    
    return cleaned;
  }

  /**
   * Tokenize line into individual parameters
   */
  tokenize(line) {
    const tokens = [];
    const regex = /([A-Z])([+-]?\d+\.?\d*)/gi;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const letter = match[1].toUpperCase();
      const value = parseFloat(match[2]);

      tokens.push({
        letter: letter,
        value: value,
        raw: match[0]
      });
    }

    return tokens;
  }

  /**
   * Parse tokens into block object
   */
  parseTokens(tokens) {
    const block = {};

    tokens.forEach(token => {
      const { letter, value } = token;

      switch (letter) {
        case 'G':
          block.G = Math.floor(value);
          break;
        case 'M':
          block.M = Math.floor(value);
          break;
        case 'X':
          block.X = value;
          break;
        case 'Z':
          block.Z = value;
          break;
        case 'I':
          block.I = value;
          break;
        case 'K':
          block.K = value;
          break;
        case 'R':
          block.R = value;
          break;
        case 'F':
          block.F = value;
          break;
        case 'S':
          block.S = value;
          break;
        case 'T':
          block.T = Math.floor(value);
          break;
        case 'N':
          block.N = Math.floor(value); // Line number
          break;
        case 'P':
          block.P = value; // Dwell time or parameter
          break;
        case 'L':
          block.L = Math.floor(value); // Loop count
          break;
        case 'H':
          block.H = Math.floor(value); // Offset number
          break;
        case 'D':
          block.D = Math.floor(value); // Tool diameter
          break;
      }
    });

    return block;
  }

  /**
   * Handle G-codes (modal commands)
   */
  handleGCode(code, block) {
    // Check if valid G-code
    if (!this.validGCodes[code]) {
      this.warnings.push(`Line ${this.lineNumber}: Unknown G${code}`);
      return;
    }

    const action = this.validGCodes[code];

    switch (code) {
      // Motion modes
      case 0:
        this.state.motionMode = 'G0';
        break;
      case 1:
        this.state.motionMode = 'G1';
        break;
      case 2:
        this.state.motionMode = 'G2';
        break;
      case 3:
        this.state.motionMode = 'G3';
        break;

      // Plane selection
      case 18:
        this.state.plane = 'G18'; // XZ plane for lathe
        break;
      case 19:
        this.state.plane = 'G19'; // YZ plane
        break;
      case 20:
        if (this.state.units === 'G21') {
          this.state.units = 'G20'; // Inches
        } else {
          this.state.plane = 'G20'; // XY plane
        }
        break;

      // Unit selection
      case 20:
        this.state.units = 'G20'; // Inches
        break;
      case 21:
        this.state.units = 'G21'; // Millimeters
        break;

      // Distance modes
      case 90:
        this.state.distanceMode = 'G90'; // Absolute
        break;
      case 91:
        this.state.distanceMode = 'G91'; // Incremental
        break;

      // Home position
      case 28:
      case 30:
        this.commands.push({
          type: 'HOME',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: this.validGCodes[code],
          position: { ...this.state.position }
        });
        this.state.position = { x: 0, z: 0 };
        break;

      // Dwell
      case 4:
        const dwellTime = block.P || block.X || 1;
        this.commands.push({
          type: 'DWELL',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: 'Dwell',
          time: dwellTime,
          unit: 'seconds'
        });
        break;

      // Tool length offset
      case 49:
        this.commands.push({
          type: 'TOOL_OFFSET_CANCEL',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: 'Tool height offset cancel'
        });
        break;

      // Tool radius compensation
      case 40:
        this.commands.push({
          type: 'TOOL_RADIUS_OFF',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: 'Tool radius compensation off'
        });
        break;
      case 41:
        this.commands.push({
          type: 'TOOL_RADIUS_LEFT',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: 'Tool radius compensation left'
        });
        break;
      case 42:
        this.commands.push({
          type: 'TOOL_RADIUS_RIGHT',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: 'Tool radius compensation right'
        });
        break;

      // Offset selection
      case 54:
      case 55:
        const offsetNum = code === 54 ? 1 : 2;
        this.commands.push({
          type: 'SET_OFFSET',
          lineNumber: this.lineNumber,
          code: `G${code}`,
          description: `Work offset ${offsetNum}`,
          offset: offsetNum
        });
        break;
    }
  }

  /**
   * Handle M-codes (machine functions)
   */
  handleMCode(code, block) {
    // Check if valid M-code
    if (!this.validMCodes[code]) {
      this.warnings.push(`Line ${this.lineNumber}: Unknown M${code}`);
      return;
    }

    const action = this.validMCodes[code];

    switch (code) {
      // Spindle control
      case 3:
        this.state.spindle.on = true;
        this.state.spindle.direction = 'CW';
        this.commands.push({
          type: 'SPINDLE',
          lineNumber: this.lineNumber,
          code: 'M3',
          description: 'Spindle ON (CW)',
          speed: this.state.spindle.speed,
          direction: 'CW'
        });
        break;

      case 4:
        this.state.spindle.on = true;
        this.state.spindle.direction = 'CCW';
        this.commands.push({
          type: 'SPINDLE',
          lineNumber: this.lineNumber,
          code: 'M4',
          description: 'Spindle ON (CCW)',
          speed: this.state.spindle.speed,
          direction: 'CCW'
        });
        break;

      case 5:
        this.state.spindle.on = false;
        this.commands.push({
          type: 'SPINDLE_OFF',
          lineNumber: this.lineNumber,
          code: 'M5',
          description: 'Spindle OFF'
        });
        break;

      // Tool change
      case 6:
        this.commands.push({
          type: 'TOOL_CHANGE',
          lineNumber: this.lineNumber,
          code: 'M6',
          description: 'Tool change',
          tool: this.state.tool
        });
        break;

      // Coolant control
      case 7:
      case 8:
        this.state.coolant.on = true;
        this.state.coolant.type = code === 7 ? 'mist' : 'flood';
        this.commands.push({
          type: 'COOLANT',
          lineNumber: this.lineNumber,
          code: `M${code}`,
          description: code === 7 ? 'Coolant ON (mist)' : 'Coolant ON (flood)',
          type_mode: this.state.coolant.type
        });
        break;

      case 9:
        this.state.coolant.on = false;
        this.commands.push({
          type: 'COOLANT_OFF',
          lineNumber: this.lineNumber,
          code: 'M9',
          description: 'Coolant OFF'
        });
        break;

      // Program control
      case 0:
        this.commands.push({
          type: 'PROGRAM_STOP',
          lineNumber: this.lineNumber,
          code: 'M0',
          description: 'Program stop'
        });
        break;

      case 1:
        this.commands.push({
          type: 'OPTIONAL_STOP',
          lineNumber: this.lineNumber,
          code: 'M1',
          description: 'Optional stop'
        });
        break;

      case 2:
      case 30:
        this.commands.push({
          type: 'PROGRAM_END',
          lineNumber: this.lineNumber,
          code: `M${code}`,
          description: 'Program end'
        });
        break;

      // Spindle orient
      case 19:
        const angle = block.P || 0;
        this.commands.push({
          type: 'SPINDLE_ORIENT',
          lineNumber: this.lineNumber,
          code: 'M19',
          description: 'Spindle orient',
          angle: angle
        });
        break;
    }
  }

  /**
   * Handle motion commands (G0, G1, G2, G3)
   */
  handleMotion(block) {
    // Check if there's actual motion
    if (block.X === undefined && block.Z === undefined) {
      return;
    }

    // Calculate target position
    const target = this.calculateTarget(block);

    switch (this.state.motionMode) {
      case 'G0':
        this.handleRapidMotion(target, block);
        break;
      case 'G1':
        this.handleLinearMotion(target, block);
        break;
      case 'G2':
        this.handleArcMotion(target, block, true); // CW
        break;
      case 'G3':
        this.handleArcMotion(target, block, false); // CCW
        break;
    }

    // Update position
    this.state.position = target;
  }

  /**
   * Calculate target position (absolute or incremental)
   */
  calculateTarget(block) {
    let x = this.state.position.x;
    let z = this.state.position.z;

    if (block.X !== undefined) {
      if (this.state.distanceMode === 'G90') {
        x = block.X; // Absolute
      } else {
        x = this.state.position.x + block.X; // Incremental
      }
    }

    if (block.Z !== undefined) {
      if (this.state.distanceMode === 'G90') {
        z = block.Z; // Absolute
      } else {
        z = this.state.position.z + block.Z; // Incremental
      }
    }

    return { x, z };
  }

  /**
   * Handle rapid motion (G0)
   */
  handleRapidMotion(target, block) {
    const distance = this.calculateDistance(this.state.position, target);

    this.commands.push({
      type: 'RAPID',
      lineNumber: this.lineNumber,
      code: 'G0',
      description: 'Rapid positioning',
      from: { ...this.state.position },
      to: target,
      distance: distance,
      feedRate: 'RAPID',
      units: this.state.units === 'G21' ? 'mm' : 'in'
    });
  }

  /**
   * Handle linear motion (G1)
   */
  handleLinearMotion(target, block) {
    const distance = this.calculateDistance(this.state.position, target);
    const feedRate = this.state.feedRate;

    this.commands.push({
      type: 'LINEAR',
      lineNumber: this.lineNumber,
      code: 'G1',
      description: 'Linear motion',
      from: { ...this.state.position },
      to: target,
      distance: distance,
      feedRate: feedRate,
      feedMode: this.state.feedMode,
      units: this.state.units === 'G21' ? 'mm' : 'in'
    });
  }

  /**
   * Handle arc motion (G2 = CW, G3 = CCW)
   */
  handleArcMotion(target, block, clockwise) {
    // Check for arc center specification
    const hasOffsets = (block.I !== undefined) || (block.K !== undefined);
    const hasRadius = block.R !== undefined;

    if (!hasOffsets && !hasRadius) {
      this.errors.push(`Line ${this.lineNumber}: Arc requires I/K offsets or R radius`);
      return;
    }

    let center = null;

    if (hasOffsets) {
      // Calculate center from offsets
      const i = block.I || 0;
      const k = block.K || 0;
      center = {
        x: this.state.position.x + i,
        z: this.state.position.z + k
      };
    } else if (hasRadius) {
      // Calculate center from radius
      center = this.calculateArcCenter(this.state.position, target, block.R, clockwise);
    }

    // Validate arc if center calculated
    if (center && !this.validateArc(this.state.position, target, center)) {
      this.errors.push(`Line ${this.lineNumber}: Invalid arc geometry`);
      return;
    }

    const distance = this.calculateArcLength(this.state.position, target, center);

    this.commands.push({
      type: 'ARC',
      lineNumber: this.lineNumber,
      code: clockwise ? 'G2' : 'G3',
      description: clockwise ? 'Arc (clockwise)' : 'Arc (counter-clockwise)',
      from: { ...this.state.position },
      to: target,
      center: center,
      radius: block.R,
      offsets: hasOffsets ? { i: block.I || 0, k: block.K || 0 } : null,
      clockwise: clockwise,
      distance: distance,
      feedRate: this.state.feedRate,
      feedMode: this.state.feedMode,
      units: this.state.units === 'G21' ? 'mm' : 'in'
    });
  }

  /**
   * Calculate arc center from radius
   */
  calculateArcCenter(start, end, radius, clockwise) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const chord = Math.sqrt(dx * dx + dz * dz);

    // Check if radius is valid
    if (Math.abs(radius) < chord / 2) {
      return null; // Invalid radius
    }

    // Midpoint of chord
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;

    // Height from chord midpoint to arc center
    const h = Math.sqrt(radius * radius - (chord / 2) * (chord / 2));

    // Perpendicular direction
    const perpX = -dz / chord;
    const perpZ = dx / chord;

    // Direction multiplier (CW or CCW)
    const direction = clockwise ? -1 : 1;

    const centerX = midX + direction * perpX * h;
    const centerZ = midZ + direction * perpZ * h;

    return { x: centerX, z: centerZ };
  }

  /**
   * Validate arc geometry
   */
  validateArc(start, end, center) {
    const radiusStart = Math.sqrt(
      (start.x - center.x) ** 2 + (start.z - center.z) ** 2
    );
    const radiusEnd = Math.sqrt(
      (end.x - center.x) ** 2 + (end.z - center.z) ** 2
    );

    const tolerance = 0.01;
    return Math.abs(radiusStart - radiusEnd) < tolerance;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
  }

  /**
   * Calculate arc length
   */
  calculateArcLength(start, end, center) {
    if (!center) return 0;

    const v1x = start.x - center.x;
    const v1z = start.z - center.z;
    const v2x = end.x - center.x;
    const v2z = end.z - center.z;

    const radius = Math.sqrt(v1x * v1x + v1z * v1z);
    const dotProduct = v1x * v2x + v1z * v2z;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct / (radius * radius))));

    return radius * angle;
  }

  /**
   * Get analysis report
   */
  getReport() {
    const stats = this.calculateStats();

    return {
      success: this.errors.length === 0,
      lineNumber: this.lineNumber,
      commands: this.commands,
      errors: this.errors,
      warnings: this.warnings,
      state: this.state,
      stats: stats
    };
  }

  /**
   * Calculate statistics
   */
  calculateStats() {
    let totalDistance = 0;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let rapidDistance = 0;
    let feedDistance = 0;
    let arcDistance = 0;
    let motionCommands = 0;

    this.commands.forEach(cmd => {
      if (['RAPID', 'LINEAR', 'ARC'].includes(cmd.type)) {
        totalDistance += cmd.distance;
        motionCommands++;

        if (cmd.to) {
          minX = Math.min(minX, cmd.to.x);
          maxX = Math.max(maxX, cmd.to.x);
          minZ = Math.min(minZ, cmd.to.z);
          maxZ = Math.max(maxZ, cmd.to.z);
        }

        if (cmd.type === 'RAPID') rapidDistance += cmd.distance;
        else if (cmd.type === 'LINEAR') feedDistance += cmd.distance;
        else if (cmd.type === 'ARC') arcDistance += cmd.distance;
      }
    });

    return {
      totalCommands: this.commands.length,
      motionCommands: motionCommands,
      totalLines: this.lineNumber,
      totalDistance: totalDistance,
      rapidDistance: rapidDistance,
      feedDistance: feedDistance,
      arcDistance: arcDistance,
      bounds: {
        x: { min: minX === Infinity ? 0 : minX, max: maxX === -Infinity ? 0 : maxX },
        z: { min: minZ === Infinity ? 0 : minZ, max: maxZ === -Infinity ? 0 : maxZ },
        width: (maxX === -Infinity ? 0 : maxX) - (minX === Infinity ? 0 : minX),
        height: (maxZ === -Infinity ? 0 : maxZ) - (minZ === Infinity ? 0 : minZ)
      }
    };
  }

  /**
   * Get toolpath only (motion commands)
   */
  getToolpath() {
    return this.commands.filter(cmd => 
      ['RAPID', 'LINEAR', 'ARC'].includes(cmd.type)
    );
  }

  /**
   * Get spindle events
   */
  getSpindleEvents() {
    return this.commands.filter(cmd => 
      cmd.type === 'SPINDLE' || cmd.type === 'SPINDLE_OFF'
    );
  }

  /**
   * Get tool changes
   */
  getToolChanges() {
    return this.commands.filter(cmd => cmd.type === 'TOOL_CHANGE');
  }

  /**
   * Get all commands of specific type
   */
  getCommandsByType(type) {
    return this.commands.filter(cmd => cmd.type === type);
  }

  /**
   * Export as JSON
   */
  toJSON() {
    return {
      commands: this.commands,
      state: this.state,
      stats: this.calculateStats(),
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Export as formatted text
   */
  toString() {
    let output = '';
    output += `=== GCode Parse Report ===\n`;
    output += `Total Lines: ${this.lineNumber}\n`;
    output += `Total Commands: ${this.commands.length}\n`;
    output += `Errors: ${this.errors.length}\n`;
    output += `Warnings: ${this.warnings.length}\n\n`;

    const stats = this.calculateStats();
    output += `=== Statistics ===\n`;
    output += `Motion Commands: ${stats.motionCommands}\n`;
    output += `Total Distance: ${stats.totalDistance.toFixed(2)} units\n`;
    output += `Rapid Distance: ${stats.rapidDistance.toFixed(2)}\n`;
    output += `Feed Distance: ${stats.feedDistance.toFixed(2)}\n`;
    output += `Arc Distance: ${stats.arcDistance.toFixed(2)}\n`;
    output += `Bounds X: [${stats.bounds.x.min.toFixed(2)}, ${stats.bounds.x.max.toFixed(2)}]\n`;
    output += `Bounds Z: [${stats.bounds.z.min.toFixed(2)}, ${stats.bounds.z.max.toFixed(2)}]\n\n`;

    if (this.errors.length > 0) {
      output += `=== Errors ===\n`;
      this.errors.forEach(err => {
        output += `${err}\n`;
      });
      output += '\n';
    }

    if (this.warnings.length > 0) {
      output += `=== Warnings ===\n`;
      this.warnings.forEach(warn => {
        output += `${warn}\n`;
      });
      output += '\n';
    }

    output += `=== Commands ===\n`;
    this.commands.forEach(cmd => {
      output += `[${cmd.lineNumber}] ${cmd.code}: ${cmd.description}\n`;
    });

    return output;
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomGCodeParser;
}
export default CustomGCodeParser;