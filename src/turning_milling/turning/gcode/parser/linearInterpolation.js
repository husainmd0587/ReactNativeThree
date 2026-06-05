// src/cnc/motion/linearInterpolator.js

/**
 * Linear Interpolation Engine
 * Handles G0 (rapid) and G1 (linear feed) motion
 * Generates interpolated points for smooth visualization
 */

export default class LinearInterpolator {
  constructor() {
    this.tolerance = 0.1; // mm - minimum segment length
  }

  /**
   * Interpolate linear motion from start to end
   * @param {Object} start - Starting position {X, Y, Z}
   * @param {Object} end - Ending position {X, Y, Z}
   * @param {number} feedRate - Feed rate (mm/min or in/min)
   * @param {boolean} isRapid - True for G0, false for G1
   * @returns {Object} Motion segment data
   */
  interpolate(start, end, feedRate, isRapid = false) {
    const segment = {
      type: isRapid ? 'RAPID' : 'LINEAR',
      start: { ...start },
      end: { ...end },
      feedRate: isRapid ? 0 : feedRate, // Rapid has max machine speed
      distance: 0,
      duration: 0, // seconds
      points: []
    };

    // Calculate total distance
    const dx = end.X - start.X;
    const dy = end.Y - start.Y;
    const dz = end.Z - start.Z;
    
    segment.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Calculate duration based on feed rate
    if (!isRapid && feedRate > 0) {
      segment.duration = segment.distance / (feedRate / 60); // Convert feed to mm/s
    } else {
      // Rapid movement - use typical rapid rate (e.g., 10000 mm/min)
      const rapidRate = 10000;
      segment.duration = segment.distance / (rapidRate / 60);
    }

    // Generate interpolated points
    const numPoints = Math.max(2, Math.ceil(segment.distance / this.tolerance));
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      segment.points.push({
        X: start.X + dx * t,
        Y: start.Y + dy * t,
        Z: start.Z + dz * t,
        t: t,
        time: segment.duration * t
      });
    }
    return segment;
  }

  /**
   * Calculate position at specific time along segment
   * @param {Object} segment - Motion segment from interpolate()
   * @param {number} time - Time in seconds
   * @returns {Object} Position {X, Y, Z}
   */
  getPositionAtTime(segment, time) {
    if (time <= 0) return { ...segment.start };
    if (time >= segment.duration) return { ...segment.end };

    const t = time / segment.duration;
    const dx = segment.end.X - segment.start.X;
    const dy = segment.end.Y - segment.start.Y;
    const dz = segment.end.Z - segment.start.Z;

    return {
      X: segment.start.X + dx * t,
      Y: segment.start.Y + dy * t,
      Z: segment.start.Z + dz * t
    };
  }

  /**
   * Validate linear move for collisions and limits
   * @param {Object} start - Start position
   * @param {Object} end - End position
   * @param {Object} limits - Machine limits {maxX, maxY, maxZ}
   * @returns {Object} Validation result
   */
  validate(start, end, limits) {
    const errors = [];
    // Check travel limits
    ['X', 'Y', 'Z'].forEach(axis => {
      const maxKey = `max${axis}`;
      if (limits[maxKey] && Math.abs(end[axis]) > limits[maxKey]) {
        errors.push({
          type: 'OVERTRAVEL',
          axis: axis,
          value: end[axis],
          limit: limits[maxKey]
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}