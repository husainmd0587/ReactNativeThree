// utils/ortho.js

// ─────────────────────────────────────────────────────────────────────────────
// ORTHO CONSTRAINT
// ─────────────────────────────────────────────────────────────────────────────


export function applyOrtho(fromX, fromY, toX, toY, mode = 'ortho') {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (mode === 'ortho') {
    // Lock to nearest 90° axis — whichever delta is larger wins
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal
      return { x: toX, y: fromY, axis: 'horizontal' };
    } else {
      // Vertical
      return { x: fromX, y: toY, axis: 'vertical' };
    }
  }

  if (mode === 'polar') {
    // Lock to nearest 45° increment
    const angle  = Math.atan2(dy, dx);
    const dist   = Math.hypot(dx, dy);
    const snap   = Math.PI / 4;                        // 45°
    const locked = Math.round(angle / snap) * snap;
    const axis   = getAxisName(locked);
    return {
      x:    fromX + dist * Math.cos(locked),
      y:    fromY + dist * Math.sin(locked),
      axis,
    };
  }

  return { x: toX, y: toY, axis: null };
}

function getAxisName(angle) {
  const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  if (deg === 0   || deg === 180) return 'horizontal';
  if (deg === 90  || deg === 270) return 'vertical';
  if (deg === 45  || deg === 225) return 'diagonal-45';
  if (deg === 135 || deg === 315) return 'diagonal-135';
  return 'locked';
}

/**
 * Format axis label shown in UI
 */
export function formatAxis(axis) {
  switch (axis) {
    case 'horizontal':   return '← →  Horizontal';
    case 'vertical':     return '↑ ↓  Vertical';
    case 'diagonal-45':  return '↗ ↙  45°';
    case 'diagonal-135': return '↖ ↘  135°';
    default:             return '';
  }
}

/**
 * Compute angle in degrees from fromPoint to toPoint (for display)
 */
export function computeAngleDeg(fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
}

/**
 * Compute distance between two points (for display)
 */
export function computeDist(fromX, fromY, toX, toY) {
  return Math.hypot(toX - fromX, toY - fromY);
}

// Add to utils/ortho.js

// ─────────────────────────────────────────────────────────────────────────────
// POLAR TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export const POLAR_INCREMENTS = [5, 10, 15, 18, 22.5, 30, 45, 90];

// All angles in a full 360° for a given increment
export function getPolarAngles(incrementDeg) {
  const angles = [];
  for (let a = 0; a < 360; a += incrementDeg) {
    angles.push(a);
  }
  return angles;
}

/**
 * Find nearest polar angle to the current drag direction.
 * Returns null if not within snapTolerance degrees of any polar angle.
 *
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @param {number} incrementDeg   e.g. 15, 30, 45, 90
 * @param {number} snapTolerance  degrees within which snapping activates
 * @returns {{ x, y, angleDeg, dist, snapped } | null}
 */
export function applyPolarTracking(
  fromX, fromY, toX, toY,
  incrementDeg = 15,
  snapTolerance = 5
) {
  const dx       = toX - fromX;
  const dy       = toY - fromY;
  const dist     = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = ((angleRad * 180 / Math.PI) % 360 + 360) % 360;

  // Find nearest polar angle
  const angles      = getPolarAngles(incrementDeg);
  let nearestAngle  = null;
  let nearestDelta  = Infinity;

  for (const a of angles) {
    // Angular distance (handle wrap-around)
    let delta = Math.abs(angleDeg - a);
    if (delta > 180) delta = 360 - delta;
    if (delta < nearestDelta) {
      nearestDelta  = delta;
      nearestAngle  = a;
    }
  }

  const isSnapping = nearestDelta <= snapTolerance;

  if (!isSnapping) {
    // Not near any polar angle — return raw point + current angle for display
    return {
      x:        toX,
      y:        toY,
      angleDeg: Math.round(angleDeg * 10) / 10,
      dist:     Math.round(dist * 10) / 10,
      snapped:  false,
      trackedAngle: null,
    };
  }

  // Snap to nearest polar angle
  const snapRad = nearestAngle * (Math.PI / 180);
  return {
    x:            fromX + dist * Math.cos(snapRad),
    y:            fromY + dist * Math.sin(snapRad),
    angleDeg:     nearestAngle,
    dist:         Math.round(dist * 10) / 10,
    snapped:      true,
    trackedAngle: nearestAngle,
  };
}

/**
 * Format polar angle display string
 * e.g. "45.0°  |  128.5 u"
 */
export function formatPolarReadout(angleDeg, dist, snapped) {
  const angleStr = `${angleDeg}°`;
  const distStr  = `${dist} u`;
  return { angleStr, distStr, snapped };
}