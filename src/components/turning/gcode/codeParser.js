
// =========================
// GCode Interpreter Core
// =========================

class GCodeInterpreter {
  constructor() {
    this.reset()
  }
  reset() {
    this.state = {
      pos: { x: 0, z: 0 },
      feed: 100,
      units: 'mm',        // G20 / G21
      distance: 'ABS',    // G90 / G91
      motion: 'G0',       // G0/G1/G2/G3
      plane: 'XZ',        // G18 (lathe)
      spindle: 'OFF',
      tool: null,
    }
    this.toolpath = []
    this.errors = []
    this.warnings = []
  }
  // --------------------
  // Tokenizer
  // --------------------
  tokenize(line) {
    const tokens = line
      .toUpperCase()
      .replace(/;.*$/, '')        // remove comments
      .replace(/\\(.*?\\)/g, '')    // remove parens comments
      .match(/[A-Z][+-]?\\d*\\.?\\d+/g)
    return (tokens || []).map(t => ({
      type: t[0],
      value: parseFloat(t.slice(1))
    }))
  }
  // --------------------
  // Main line parser
  // --------------------
  parseLine(line) {
    const tokens = this.tokenize(line)
    if (!tokens.length) return
    const modal = {}
    const motion = {}
    // parse tokens
    tokens.forEach(t => {
      const { type, value } = t
      if (type === 'G') {
        modal.g = value
      } else if (type === 'M') {
        modal.m = value
      } else {
        motion[type] = value
      }
    })
    // handle modal commands first
    if (modal.g !== undefined) this.handleG(modal.g, motion)
    if (modal.m !== undefined) this.handleM(modal.m)
    // handle motion
    if (this.state.motion === 'G0' || this.state.motion === 'G1') {
      this.handleLinear(motion)
    } else if (this.state.motion === 'G2' || this.state.motion === 'G3') {
      this.handleArc(motion, this.state.motion === 'G2')
    }
  }
  // --------------------
  // G-code modal handling
  // --------------------
  handleG(code, motion) {
    switch (code) {
      case 0: this.state.motion = 'G0'; break
      case 1: this.state.motion = 'G1'; break
      case 2: this.state.motion = 'G2'; break
      case 3: this.state.motion = 'G3'; break
      case 90: this.state.distance = 'ABS'; break
      case 91: this.state.distance = 'REL'; break
      case 20: this.state.units = 'in'; break
      case 21: this.state.units = 'mm'; break
      case 18: this.state.plane = 'XZ'; break
      default: this.errors.push(`Unsupported G${code}`)
    }
  }
  // --------------------
  // M-code handling
  // --------------------
  handleM(code) {
    switch (code) {
      case 3: this.state.spindle = 'CW'; break
      case 4: this.state.spindle = 'CCW'; break
      case 5: this.state.spindle = 'OFF'; break
      case 6: this.state.tool = 'T'; break
      default: this.errors.push(`Unsupported M${code}`)
    }
  }
  // --------------------
  // Linear move
  // --------------------
  handleLinear(motion) {
    const target = this.computeTarget(motion)
    if (!target) return
    const move = {
      type: 'LINE',
      from: { ...this.state.pos },
      to: target,
      feed: this.state.feed
    }
    this.toolpath.push(move)
    this.state.pos = target
  }
  // --------------------
  // Arc move
  // --------------------
  handleArc(motion, cw) {
    const target = this.computeTarget(motion)
    if (!target) return
    const hasIJ = ('I' in motion) || ('J' in motion)
    const hasR = 'R' in motion
    if (!hasIJ && !hasR) {
      this.errors.push('Arc requires I/J or R')
      return
    }
    // only X/Z lathe plane
    const i = motion.I || 0
    const k = motion.K || 0  // K is sometimes used for Z in lathe
    const r = motion.R
    let center
    if (hasIJ) {
      center = {
        x: this.state.pos.x + i,
        z: this.state.pos.z + k
      }
    } else {
      const dx = target.x - this.state.pos.x
      const dz = target.z - this.state.pos.z
      const chord = Math.hypot(dx, dz)
      // radius from R
      const radius = Math.abs(r)
      if (radius < chord / 2) {
        this.errors.push('Arc radius too small')
        return
      }
      // compute center using geometry
      const mid = {
        x: (this.state.pos.x + target.x) / 2,
        z: (this.state.pos.z + target.z) / 2
      }
      const h = Math.sqrt(radius * radius - (chord / 2) ** 2)
      // perpendicular direction
      const ux = -dz / chord
      const uz = dx / chord
      // choose direction based on CW/CCW
      const sign = cw ? -1 : 1
      center = {
        x: mid.x + sign * ux * h,
        z: mid.z + sign * uz * h
      }
    }
// ✅ How to use it
    this.toolpath.push({
      type: 'ARC',
      from: { ...this.state.pos },
      to: target,
      center,
      cw,
      feed: this.state.feed
    })
    this.state.pos = target
  }
  // --------------------
  // Compute target coordinate
  // --------------------
  computeTarget(motion) {
    const target = { ...this.state.pos }
    if ('X' in motion) {
      target.x = this.computeAxis(motion.X, 'x')
    }
    if ('Z' in motion) {
      target.z = this.computeAxis(motion.Z, 'z')
    }
    return target
  }
  computeAxis(value, axis) {
    if (this.state.distance === 'ABS') {
      return value
    } else {
      return this.state.pos[axis] + value
    }
  }
}