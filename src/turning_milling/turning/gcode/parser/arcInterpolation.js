// src/cnc/motion/arcInterpolator.js

/**
 * Arc Interpolation Engine
 * Handles G2 (CW) and G3 (CCW) circular motion
 * Supports I/J/K offset mode and R radius mode
 * Plane-aware (G17/G18/G19)
 */

export  default class ArcInterpolator {
  constructor() {
    this.tolerance = 0.1; // degrees - angular resolution
    this.maxRadius = 10000; // mm - sanity check
  }

  /**
   * Interpolate arc motion
   * @param {Object} start - Starting position
   * @param {Object} end - Ending position
   * @param {Object} arcParams - Arc parameters {I, J, K, R}
   * @param {string} plane - Plane selection ('G17', 'G18', 'G19')
   * @param {boolean} isClockwise - True for G2, false for G3
   * @param {number} feedRate - Feed rate
   * @returns {Object} Arc segment data
   */
  interpolate(start, end, arcParams, plane, isClockwise, feedRate) {
    const segment = {
      type: isClockwise ? 'ARC_CW' : 'ARC_CCW',
      start: { ...start },
      end: { ...end },
      feedRate: feedRate,
      plane: plane,
      center: null,
      radius: 0,
      startAngle: 0,
      endAngle: 0,
      arcLength: 0,
      duration: 0,
      points: [],
      error: null
    };

    // Determine plane axes
    const axes = this.getPlaneAxes(plane);
    if (!axes) {
      segment.error = 'Invalid plane selection';
      return segment;
    }

    // Calculate center point
    const centerCalc = this.calculateCenter(
      start,
      end,
      arcParams,
      axes,
      isClockwise
    );

    if (centerCalc.error) {
      segment.error = centerCalc.error;
      return segment;
    }

    segment.center = centerCalc.center;
    segment.radius = centerCalc.radius;
    segment.startAngle = centerCalc.startAngle;
    segment.endAngle = centerCalc.endAngle;

    // Calculate arc length
    let arcAngle = segment.endAngle - segment.startAngle;
    
    // Normalize angle based on direction
    if (isClockwise) {
      if (arcAngle > 0) arcAngle -= 2 * Math.PI;
    } else {
      if (arcAngle < 0) arcAngle += 2 * Math.PI;
    }

    segment.arcLength = Math.abs(arcAngle) * segment.radius;

    // Calculate duration
    if (feedRate > 0) {
      segment.duration = segment.arcLength / (feedRate / 60);
    }

    // Generate interpolated points
    const numPoints = Math.max(
      3,
      Math.ceil(Math.abs(arcAngle * 180 / Math.PI) / this.tolerance)
    );

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const angle = segment.startAngle + arcAngle * t;
      
      const point = {
        t: t,
        time: segment.duration * t
      };

      // Calculate position in plane
      const primary = segment.center[axes.primary] + 
                     segment.radius * Math.cos(angle);
      const secondary = segment.center[axes.secondary] + 
                       segment.radius * Math.sin(angle);

      // Interpolate perpendicular axis linearly
      const perp = start[axes.perpendicular] + 
                   (end[axes.perpendicular] - start[axes.perpendicular]) * t;

      point[axes.primary] = primary;
      point[axes.secondary] = secondary;
      point[axes.perpendicular] = perp;

      segment.points.push(point);
    }

    return segment;
  }

  /**
   * Calculate arc center from parameters
   * @param {Object} start - Start position
   * @param {Object} end - End position
   * @param {Object} arcParams - {I, J, K, R}
   * @param {Object} axes - Plane axes definition
   * @param {boolean} isClockwise - Arc direction
   * @returns {Object} Center calculation result
   */
  calculateCenter(start, end, arcParams, axes, isClockwise) {
    const result = {
      center: {},
      radius: 0,
      startAngle: 0,
      endAngle: 0,
      error: null
    };

    // Mode 1: I/J/K offset mode (preferred)
    if (arcParams.I !== undefined || arcParams.J !== undefined || arcParams.K !== undefined) {
      const offsetMap = { I: 'X', J: 'Y', K: 'Z' };
      
      // Calculate center from offsets
      result.center.X = start.X + (arcParams.I || 0);
      result.center.Y = start.Y + (arcParams.J || 0);
      result.center.Z = start.Z + (arcParams.K || 0);

      // Calculate radius from start to center
      const dx = result.center[axes.primary] - start[axes.primary];
      const dy = result.center[axes.secondary] - start[axes.secondary];
      result.radius = Math.sqrt(dx * dx + dy * dy);

      // Verify endpoint is on arc (within tolerance)
      const dx2 = result.center[axes.primary] - end[axes.primary];
      const dy2 = result.center[axes.secondary] - end[axes.secondary];
      const endRadius = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      if (Math.abs(endRadius - result.radius) > 0.01) {
        result.error = `Arc endpoint radius mismatch: ${result.radius.toFixed(3)} vs ${endRadius.toFixed(3)}`;
        return result;
      }
    }
    // Mode 2: R radius mode
    else if (arcParams.R !== undefined) {
      const radius = Math.abs(arcParams.R);
      
      // Calculate chord length
      const dx = end[axes.primary] - start[axes.primary];
      const dy = end[axes.secondary] - start[axes.secondary];
      const chordLength = Math.sqrt(dx * dx + dy * dy);

      // Check if arc is possible
      if (chordLength > 2 * radius) {
        result.error = `Arc radius ${radius} too small for chord length ${chordLength.toFixed(3)}`;
        return result;
      }

      // Calculate center (two possible solutions)
      const midX = (start[axes.primary] + end[axes.primary]) / 2;
      const midY = (start[axes.secondary] + end[axes.secondary]) / 2;

      const d = Math.sqrt(radius * radius - (chordLength / 2) ** 2);
      const perpX = -dy / chordLength;
      const perpY = dx / chordLength;

      // Choose solution based on R sign and direction
      // Negative R: arc > 180°, Positive R: arc < 180°
      const sign = (arcParams.R > 0) === isClockwise ? 1 : -1;

      result.center[axes.primary] = midX + sign * d * perpX;
      result.center[axes.secondary] = midY + sign * d * perpY;
      result.center[axes.perpendicular] = start[axes.perpendicular];
      result.radius = radius;
    }
    else {
      result.error = 'Arc missing I/J/K or R parameter';
      return result;
    }

    // Validate radius
    if (result.radius > this.maxRadius) {
      result.error = `Arc radius ${result.radius} exceeds maximum ${this.maxRadius}`;
      return result;
    }

    // Calculate angles
    result.startAngle = Math.atan2(
      start[axes.secondary] - result.center[axes.secondary],
      start[axes.primary] - result.center[axes.primary]
    );

    result.endAngle = Math.atan2(
      end[axes.secondary] - result.center[axes.secondary],
      end[axes.primary] - result.center[axes.primary]
    );

    return result;
  }

  /**
   * Get primary, secondary, and perpendicular axes for plane
   * @param {string} plane - Plane code ('G17', 'G18', 'G19')
   * @returns {Object} Axes definition
   */
  getPlaneAxes(plane) {
    const planes = {
      'G17': { primary: 'X', secondary: 'Y', perpendicular: 'Z' }, // XY plane
      'G18': { primary: 'Z', secondary: 'X', perpendicular: 'Y' }, // ZX plane
      'G19': { primary: 'Y', secondary: 'Z', perpendicular: 'X' }  // YZ plane
    };
    return planes[plane] || null;
  }

  /**
   * Calculate position at specific time along arc
   * @param {Object} segment - Arc segment
   * @param {number} time - Time in seconds
   * @returns {Object} Position
   */
  getPositionAtTime(segment, time) {
    if (time <= 0) return { ...segment.start };
    if (time >= segment.duration) return { ...segment.end };

    const t = time / segment.duration;
    
    // Find closest point in precomputed array (for efficiency)
    const idx = Math.floor(t * (segment.points.length - 1));
    return { ...segment.points[idx] };
  }
}