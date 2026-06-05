export default class StateMachine {
  constructor(config = {}) {
    this.config = {
      machineType: config.machineType || 'MILL', // 'MILL' or 'LATHE'
      maxX: config.maxX || 300,
      maxY: config.maxY || 300,
      maxZ: config.maxZ || 300,
      maxSpindle: config.maxSpindle || 6000,
      maxFeed: config.maxFeed || 10000,
      ...config
    };

    this.reset();
  }

  reset() {
    // Modal Group 1: Motion
    this.motion = {
      mode: 'G0', // G0, G1, G2, G3, G33, G70-G76
      lastMode: 'G0'
    };

    // Modal Group 2: Plane selection
    this.plane = {
      mode: 'G17', // G17 (XY), G18 (XZ), G19 (YZ)
      primary: 'X',
      secondary: 'Y',
      perpendicular: 'Z'
    };

    // Modal Group 3: Absolute/Incremental
    this.positioning = {
      mode: 'G90', // G90 (absolute), G91 (incremental)
      isAbsolute: true
    };

    // Modal Group 5: Feed rate mode
    this.feedMode = {
      mode: 'G94', // G94 (per minute), G95 (per revolution)
      isPerMinute: true
    };

    // Modal Group 6: Units
    this.units = {
      mode: 'G21', // G20 (inches), G21 (mm)
      isMetric: true,
      multiplier: 1.0
    };

    // Modal Group 7: Cutter radius compensation
    this.compensation = {
      mode: 'G40', // G40 (off), G41 (left), G42 (right)
      active: false,
      side: null,
      radius: 0
    };

    // Modal Group 8: Tool length compensation
    this.toolOffset = {
      mode: 'G49', // G43 (on), G49 (off)
      active: false,
      offset: 0
    };

    // Modal Group 10: Return mode in canned cycles
    this.returnMode = {
      mode: 'G98', // G98 (initial point), G99 (R point)
      toInitial: true
    };

    // Modal Group 12: Work coordinate system
    this.workOffset = {
      mode: 'G54', // G54-G59
      offset: { X: 0, Y: 0, Z: 0 }
    };

    // Current position (machine coordinates)
    this.position = {
      X: 0,
      Y: 0,
      Z: 0,
      A: 0,
      B: 0,
      C: 0
    };

    // Current target (commanded position)
    this.target = {
      X: 0,
      Y: 0,
      Z: 0,
      A: 0,
      B: 0,
      C: 0
    };

    // Spindle state
    this.spindle = {
      active: false,
      direction: 0, // 0=off, 1=CW (M3), -1=CCW (M4)
      speed: 0,
      commandedSpeed: 0
    };

    // Coolant state
    this.coolant = {
      flood: false,  // M8
      mist: false    // M7
    };

    // Feed rate
    this.feed = {
      rate: 0,
      commanded: 0,
      active: false
    };

    // Tool state
    this.tool = {
      number: 0,
      diameter: 0,
      length: 0,
      noseRadius: 0, // For lathe tools
      orientation: 0 // Tool orientation (lathe)
    };

    // Program state
    this.program = {
      running: false,
      paused: false,
      stopped: false,
      optionalStop: false
    };

    // Lathe-specific state
    if (this.config.machineType === 'LATHE') {
      this.lathe = {
        diameterMode: true, // X values are diameter
        stockProfile: [],
        currentStock: [],
        maxDiameter: 100,
        maxLength: 200
      };
    }
  }

  /**
   * Update modal state based on G-code
   * @param {number} code - G or M code number
   * @param {string} type - 'G' or 'M'
   */
  updateModal(code, type = 'G') {
    if (type === 'G') {
      this.updateGCode(code);
    } else if (type === 'M') {
      this.updateMCode(code);
    }
  }

  updateGCode(code) {
    // Modal Group 1: Motion modes
    if ([0, 1, 2, 3, 33, 70, 71, 72, 73, 74, 75, 76].includes(code)) {
      this.motion.lastMode = this.motion.mode;
      this.motion.mode = `G${code}`;
    }

    // Modal Group 2: Plane selection
    if (code === 17) {
      this.plane.mode = 'G17';
      this.plane.primary = 'X';
      this.plane.secondary = 'Y';
      this.plane.perpendicular = 'Z';
    } else if (code === 18) {
      this.plane.mode = 'G18';
      this.plane.primary = 'Z';
      this.plane.secondary = 'X';
      this.plane.perpendicular = 'Y';
    } else if (code === 19) {
      this.plane.mode = 'G19';
      this.plane.primary = 'Y';
      this.plane.secondary = 'Z';
      this.plane.perpendicular = 'X';
    }

    // Modal Group 3: Absolute/Incremental
    if (code === 90) {
      this.positioning.mode = 'G90';
      this.positioning.isAbsolute = true;
    } else if (code === 91) {
      this.positioning.mode = 'G91';
      this.positioning.isAbsolute = false;
    }

    // Modal Group 5: Feed rate mode
    if (code === 94) {
      this.feedMode.mode = 'G94';
      this.feedMode.isPerMinute = true;
    } else if (code === 95) {
      this.feedMode.mode = 'G95';
      this.feedMode.isPerMinute = false;
    }

    // Modal Group 6: Units
    if (code === 20) {
      this.units.mode = 'G20';
      this.units.isMetric = false;
      this.units.multiplier = 25.4; // Convert inches to mm internally
    } else if (code === 21) {
      this.units.mode = 'G21';
      this.units.isMetric = true;
      this.units.multiplier = 1.0;
    }

    // Modal Group 7: Cutter compensation
    if (code === 40) {
      this.compensation.mode = 'G40';
      this.compensation.active = false;
      this.compensation.side = null;
    } else if (code === 41) {
      this.compensation.mode = 'G41';
      this.compensation.active = true;
      this.compensation.side = 'LEFT';
    } else if (code === 42) {
      this.compensation.mode = 'G42';
      this.compensation.active = true;
      this.compensation.side = 'RIGHT';
    }

    // Modal Group 8: Tool length offset
    if (code === 43) {
      this.toolOffset.mode = 'G43';
      this.toolOffset.active = true;
    } else if (code === 49) {
      this.toolOffset.mode = 'G49';
      this.toolOffset.active = false;
    }

    // Modal Group 10: Return mode
    if (code === 98) {
      this.returnMode.mode = 'G98';
      this.returnMode.toInitial = true;
    } else if (code === 99) {
      this.returnMode.mode = 'G99';
      this.returnMode.toInitial = false;
    }

    // Work coordinate systems
    if (code >= 54 && code <= 59) {
      this.workOffset.mode = `G${code}`;
      // In production, load actual offsets from machine config
    }
  }

  updateMCode(code) {
    // Spindle control
    if (code === 3) {
      this.spindle.active = true;
      this.spindle.direction = 1; // CW
    } else if (code === 4) {
      this.spindle.active = true;
      this.spindle.direction = -1; // CCW
    } else if (code === 5) {
      this.spindle.active = false;
      this.spindle.direction = 0;
    }

    // Coolant control
    if (code === 7) {
      this.coolant.mist = true;
    } else if (code === 8) {
      this.coolant.flood = true;
    } else if (code === 9) {
      this.coolant.mist = false;
      this.coolant.flood = false;
    }

    // Program control
    if (code === 0) {
      this.program.paused = true; // Mandatory stop
    } else if (code === 1) {
      if (this.program.optionalStop) {
        this.program.paused = true;
      }
    } else if (code === 2 || code === 30) {
      this.program.stopped = true; // Program end
    }
  }

  /**
   * Update position with new coordinates
   * @param {Object} coords - New coordinate values
   */
  updatePosition(coords) {
    Object.keys(coords).forEach(axis => {
      if (this.position.hasOwnProperty(axis)) {
        if (this.positioning.isAbsolute) {
          this.position[axis] = coords[axis] * this.units.multiplier;
        } else {
          this.position[axis] += coords[axis] * this.units.multiplier;
        }
      }
    });
  }

  /**
   * Get current modal state summary
   * @returns {Object} Current state
   */
  getState() {
    return {
      motion: this.motion.mode,
      plane: this.plane.mode,
      positioning: this.positioning.mode,
      units: this.units.mode,
      feedMode: this.feedMode.mode,
      compensation: this.compensation.mode,
      position: { ...this.position },
      spindle: {
        active: this.spindle.active,
        speed: this.spindle.speed,
        direction: this.spindle.direction
      },
      feed: this.feed.rate,
      tool: this.tool.number
    };
  }

  /**
   * Clone current state (for trajectory planning)
   * @returns {Object} Cloned state
   */
  clone() {
    return JSON.parse(JSON.stringify(this.getState()));
  }
}