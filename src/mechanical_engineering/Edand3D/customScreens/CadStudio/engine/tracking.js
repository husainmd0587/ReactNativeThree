/**
 * CAD Studio — direction tracking (ORTHO / POLAR) and the dynamic input
 * readout that AutoCAD shows next to the cursor.
 *
 * The order of authority, exactly as AutoCAD resolves it:
 *
 *   1. A typed value (distance or angle) is absolute — tracking is skipped
 *      entirely. Handled by the command layer, not here.
 *   2. An object snap, if one was found. Tracking is skipped for the same
 *      reason: the user aimed at something specific.
 *   3. ORTHO locks the direction to 0/90/180/270.
 *   4. POLAR locks the direction to the nearest increment (5°/15°/22.5°/45°/90°).
 *   5. Grid snap quantises the resulting point.
 *
 * The caller receives the guides it should draw (dashed tracking lines back
 * to the origin, plus an infinite extension when tracking is engaged) and a
 * formatted label for the dynamic input readout.
 */

import {DEG, add, angleTo, dist, fromAngle, norm360} from './vec';

export const POLAR_INCREMENTS = [5, 10, 15, 18, 22.5, 30, 45, 90];

/** Guide types the canvas knows how to draw. */
export const GUIDE = {
  POLAR: 'polar',
  ORTHO: 'ortho',
  PERP: 'perpendicular',
  EXT: 'extension',
  RADIUS: 'radius',
  DELTA_X: 'deltaX',
  DELTA_Y: 'deltaY',
};

const ORTHO_ANGLES = [0, 90, 180, 270];

/**
 * Angle of a vector snapped to the nearest of `candidates` degrees, but only
 * if it is within `tolerance` degrees. Returns null otherwise, so the caller
 * can fall back to free tracking.
 */
function lockAngle(angleDeg, candidates, tolerance) {
  let best = null;
  let bestDelta = Infinity;
  for (const a of candidates) {
    let d = Math.abs(norm360(angleDeg) - norm360(a));
    if (d > 180) d = 360 - d;
    if (d < bestDelta) {
      bestDelta = d;
      best = a;
    }
  }
  return bestDelta <= tolerance ? best : null;
}

/** Format a distance the way the dynamic input shows it. */
export function fmtDist(mm, decimals = 2) {
  if (!Number.isFinite(mm)) return '';
  const v = Number(mm.toFixed(decimals));
  return String(v);
}

export function fmtAngle(deg, decimals = 1) {
  if (!Number.isFinite(deg)) return '';
  return `${Number(norm360(deg).toFixed(decimals))}°`;
}

/**
 * Resolve a tracking-constrained point.
 *
 * @param from      rubber-band origin in world units (null when free)
 * @param raw       raw world point under the finger
 * @param opts.ortho        lock to axes
 * @param opts.polar        lock to increments
 * @param opts.polarInc     polar increment in degrees
 * @param opts.polarTol     tolerance in degrees (default 3)
 * @param opts.gridSize     grid spacing in world units
 * @param opts.gridSnap     quantise to the grid
 * @param opts.snap         an object-snap result, if any — suppresses tracking
 * @param opts.constrain    {kind: 'distance'|'angle', value} for live numeric locks
 * @returns {point, guides, kind, distance, angleDeg, label}
 */
export function trackPoint(from, raw, opts = {}) {
  const {
    ortho,
    polar,
    polarInc = 15,
    polarTol = 3,
    gridSize = 10,
    gridSnap = false,
    snap = null,
    constrain = null,
  } = opts;

  // ── A snap or an explicit constraint wins outright ────────────────────────
  if (snap) {
    const d = from ? dist(from, snap) : null;
    const a = from ? norm360(angleTo(from, snap) * (180 / Math.PI)) : null;
    return {
      point: {x: snap.x, y: snap.y},
      guides: snap.guides ?? [],
      kind: 'snap',
      snapKind: snap.kind,
      distance: d,
      angleDeg: a,
      label: snap.label,
    };
  }

  let point = {x: raw.x, y: raw.y};
  const guides = [];
  let kind = 'free';

  if (constrain) {
    // Live numeric lock: the user has typed a distance or an angle, and the
    // preview must honour it as the finger keeps moving.
    const v = constrain.value;
    if (constrain.kind === 'distance' && from) {
      const dir = norm360(angleTo(from, point) * (180 / Math.PI));
      point = add(from, fromAngle(dir * DEG, v));
      guides.push({a: from, b: point, kind: GUIDE.DELTA_X});
    } else if (constrain.kind === 'angle' && from) {
      const d = dist(from, point);
      point = add(from, fromAngle(v * DEG, d));
      guides.push({a: from, b: point, kind: GUIDE.ORTHO});
    }
    kind = 'locked';
  } else if (from) {
    const rawAngle = angleTo(from, point) * (180 / Math.PI);
    const d = dist(from, point);
    const tiny = d < 1e-9;

    if (!tiny && (polar || ortho)) {
      const candidates = polar ? polarAnglesFor(polarInc) : ORTHO_ANGLES;
      const locked = lockAngle(
        rawAngle,
        candidates,
        polar ? polarTol : orthoToleranceFor(d, opts.orthoTol),
      );
      if (locked !== null) {
        point = add(from, fromAngle(locked * DEG, d));
        guides.push({
          a: from,
          b: point,
          kind: polar ? GUIDE.POLAR : GUIDE.ORTHO,
        });
        kind = polar ? 'polar' : 'ortho';
      }
    }

    if (gridSnap && gridSize > 0) {
      const gx = Math.round(point.x / gridSize) * gridSize;
      const gy = Math.round(point.y / gridSize) * gridSize;
      point = {x: gx, y: gy};
      if (kind === 'free') kind = 'grid';
    }
  } else if (gridSnap && gridSize > 0) {
    point = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
    kind = 'grid';
  }

  const d = from ? dist(from, point) : null;
  const a = from ? norm360(angleTo(from, point) * (180 / Math.PI)) : null;

  return {
    point,
    guides,
    kind,
    distance: d,
    angleDeg: a,
    label:
      kind === 'ortho'
        ? 'Ortho'
        : kind === 'polar'
        ? 'Polar'
        : kind === 'grid'
        ? 'Grid'
        : 'Cursor',
  };
}

/** All polar angles for an increment, as degrees. */
export function polarAnglesFor(increment) {
  const inc = increment > 0 ? increment : 15;
  const out = [];
  for (let a = 0; a < 360 - 1e-9; a += inc) out.push(Number(a.toFixed(4)));
  return out;
}

/**
 * ORTHO in AutoCAD is deliberately harder to trigger than POLAR — you have
 * to be within about 6° OR within 3.5° of the axis, so it doesn't fight
 * you. We widen the window for very short drags (below ~10 units the
 * angular error explodes from a couple of pixels of finger wobble).
 */
function orthoToleranceFor(d, override) {
  if (typeof override === 'number') return override;
  if (d < 1) return 0;
  if (d < 10) return 12;
  if (d < 40) return 8;
  return 6;
}

/**
 * The dynamic-input string AutoCAD shows while rubber-banding:
 * "Polar: 45°  Distance: 120.5"
 */
export function dynamicInput(
  result,
  {showDistance = true, showAngle = true, decimals = 2} = {},
) {
  if (!result) return '';
  const bits = [];
  if (showAngle && result.angleDeg != null)
    bits.push(fmtAngle(result.angleDeg, 1));
  if (showDistance && result.distance != null)
    bits.push(fmtDist(result.distance, decimals));
  return bits.join('   ');
}

/** Label for the status bar coordinate readout. */
export const coordsLabel = (p, decimals = 2) =>
  p ? `${fmtDist(p.x, decimals)}, ${fmtDist(p.y, decimals)}` : '—';

/** The sub-vector from a to b, formatted as ΔX, ΔY (AutoCAD's dynamic input). */
export function deltaLabel(a, b, decimals = 2) {
  if (!a || !b) return '';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `ΔX ${fmtDist(dx, decimals)}  ΔY ${fmtDist(dy, decimals)}`;
}

export {norm360};
