/**
 * Dimensioning.
 *
 * A dimension is stored the way AutoCAD stores it: three points and a type,
 * not pre-rendered geometry. `dimensionSegments` in geometry.js turns that
 * into the leader and extension lines, and this module owns the parts that
 * depend on live values — the measured number, where the text sits, and which
 * way the arrows point.
 *
 * Deriving the value rather than storing it means a dimension stays correct
 * when its entity moves, which is the whole point of associating them.
 */

import {
  angleTo,
  dist,
  dot,
  norm,
  norm360,
  perp,
  sub,
  add,
  mul,
  mid,
  len,
  fromAngle,
  angleDeltaDeg,
} from './vec';
import {makeDimension, arcParams, shapeRadius, centerOf} from './geometry';

export const DIM_TYPES = [
  'aligned',
  'horizontal',
  'vertical',
  'angular',
  'radius',
  'diameter',
  'baseline',
  'continue',
];

export const DIM_LABELS = {
  aligned: 'Aligned',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  angular: 'Angular',
  radius: 'Radius',
  diameter: 'Diameter',
  baseline: 'Baseline',
  continue: 'Continue',
};

/**
 * The number a dimension reports.
 *
 * Horizontal and vertical deliberately measure only their own axis: that is
 * what makes them different from aligned, and users rely on it to dimension
 * a part whose features are nominally square but not exactly so.
 */
export function measuredValue(d) {
  const [p1, p2] = d.points;
  const type = d.dimType || 'aligned';
  switch (type) {
    case 'horizontal':
      return Math.abs(p2.x - p1.x);
    case 'vertical':
      return Math.abs(p2.y - p1.y);
    case 'radius':
      return dist(p1, p2);
    case 'diameter':
      return dist(p1, p2) * 2;
    case 'angular': {
      // Angular is measured between the two legs, not from the world X axis.
      if (!p2 || !d.points[2]) return 0;
      const a0 = angleTo(p1, p2);
      const a1 = angleTo(p1, d.points[2]);
      let delta = a1 - a0;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      return Math.abs((delta * 180) / Math.PI);
    }
    case 'baseline':
    case 'continue':
      return dist(p1, p2);
    default:
      return dist(p1, p2);
  }
}

/** Format a measured value with a sane number of decimals for its size. */
export function formatValue(v, decimals) {
  if (!Number.isFinite(v)) return '';
  if (decimals != null) return trimZeros(v.toFixed(decimals));
  // Sub-millimetre detail is noise on a drawing; huge extents need fewer.
  const d = Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return trimZeros(v.toFixed(d));
}

const trimZeros = s => {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
};

/**
 * The text shown on the dimension line.
 *
 * Prefix glyphs follow the usual drafting convention: a diameter is called
 * out with ⌀, a radius with R, and angular with the degree sign.
 */
export function dimensionText(d, opts = {}) {
  if (d.textOverride != null && d.textOverride !== '') return d.textOverride;
  const type = d.dimType || 'aligned';
  const v = measuredValue(d);
  const body = formatValue(v, opts.decimals);
  switch (type) {
    case 'radius':
      return `R${body}`;
    case 'diameter':
      return `⌀${body}`;
    case 'angular':
      return `${body}°`;
    default:
      return body;
  }
}

/** Approximate rendered text size, for hit-testing and for label placement. */
export function textExtent(d, opts = {}) {
  const size = d.textHeight ?? opts.textHeight ?? 3.5;
  const s = dimensionText(d, opts);
  // 0.62em per character is close enough for a monospaced-ish label box and
  // avoids pulling a font metrics table into the engine.
  return {width: s.length * size * 0.62, height: size, size};
}

/**
 * Where the text sits, in world units.
 *
 * The text is pushed to the outside of the dimension line when it would
 * otherwise sit inside the measured span, which is how AutoCAD avoids a
 * label covering the feature it is describing on tight geometry.
 */
export function labelPosition(d, opts = {}) {
  const [p1, p2, def] = d.points;
  const type = d.dimType || 'aligned';
  const {size} = textExtent(d, opts);

  if (type === 'angular') {
    const r = len(sub(p2, p1));
    const a0 = angleTo(p1, p2);
    const a1 = angleTo(p1, def);
    const mid = a0 + (a1 - a0) / 2;
    return add(p1, fromAngle(mid, r));
  }

  if (type === 'radius' || type === 'diameter') {
    // Sit just outside the arrow tip.
    return def ? add(def, mul(norm(sub(def, p1)), size * 0.4)) : mid(p1, p2);
  }

  const dir = norm(sub(p2, p1));
  if (len(dir) < 1e-9) return p1;
  const n = perp(dir);
  const offset = dot(sub(def ?? p1, p1), n);
  const q1 = add(p1, mul(n, offset));
  const q2 = add(p2, mul(n, offset));
  const anchor = mid(q1, q2);
  const span = dist(q1, q2);
  const {width} = textExtent(d, opts);
  // Only push the label out when it genuinely will not fit between the ends.
  if (span > width + size) return anchor;
  return add(
    anchor,
    mul(norm(n), Math.sign(offset || 1) * (size * 1.2 + width / 2)),
  );
}

/** Rotation for the text, kept upright rather than upside down. */
export function labelRotation(d) {
  const [p1, p2] = d.points;
  const type = d.dimType || 'aligned';
  if (type === 'angular' || type === 'radius' || type === 'diameter') return 0;
  if (type === 'vertical') return Math.PI / 2;
  const deg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  // Flip past vertical so the text is never read upside down.
  return (
    (norm360(deg) > 90 && norm360(deg) < 270 ? deg + 180 : deg) *
    (Math.PI / 180)
  );
}

/**
 * Arrowhead directions: each points back along its leader toward the feature.
 * Returned as a start/end pair per leader so the renderer can draw a solid
 * triangle without knowing anything about the dimension's type.
 */
export function arrowheads(d, arrowSize = 2.5) {
  const [p1, p2, def] = d.points;
  const type = d.dimType || 'aligned';
  const out = [];
  const tip = (at, awayFrom) => {
    const dir = norm(sub(awayFrom, at));
    if (len(dir) < 1e-9) return;
    out.push({tip: at, dir, size: arrowSize});
  };

  if (type === 'radius' || type === 'diameter') {
    tip(p2, p1);
    if (def) tip(def, p2);
    return out;
  }
  if (type === 'angular') {
    tip(p2, p1);
    if (def) tip(def, p1);
    return out;
  }
  const dir = norm(sub(p2, p1));
  if (len(dir) < 1e-9) return out;
  const n = perp(dir);
  const offset = dot(sub(def ?? p1, p1), n);
  tip(
    add(p1, mul(n, offset)),
    add(p1, mul(n, offset + Math.sign(offset || 1))),
  );
  tip(
    add(p2, mul(n, offset)),
    add(p2, mul(n, offset + Math.sign(offset || 1))),
  );
  return out;
}

/** Slash ticks through the dimension line, used instead of arrows on arch. */
export function tickMarks(d, size = 3) {
  const [p1, p2, def] = d.points;
  const type = d.dimType || 'aligned';
  const nrm = perp(norm(sub(p2, p1)));
  const offset = dot(sub(def ?? p1, p1), nrm);
  const q1 = add(p1, mul(nrm, offset));
  const q2 = add(p2, mul(nrm, offset));
  const d45 = mul(norm(add(norm(sub(q2, q1)), nrm)), size / 2);
  return [mid(q1, q2)].map(c => ({a: sub(c, d45), b: add(c, d45)}));
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Dimension between two points, measured along their connecting direction. */
export const makeAlignedDim = (p1, p2, defPoint, extra) =>
  makeDimension(p1, p2, defPoint, 'aligned', extra);

/**
 * Horizontal: measures the X gap only. The dimension line is horizontal, so
 * the witness point's Y sets its height and its X is irrelevant.
 */
export const makeHorizontalDim = (p1, p2, witness, extra) =>
  makeDimension(
    p1,
    p2,
    {x: witness?.x ?? p2.x, y: witness?.y ?? p1.y},
    'horizontal',
    extra,
  );

/** Vertical: measures the Y gap only, so the witness point's X sets it. */
export const makeVerticalDim = (p1, p2, witness, extra) =>
  makeDimension(
    p1,
    p2,
    {x: witness?.x ?? p1.x, y: witness?.y ?? p2.y},
    'vertical',
    extra,
  );

/** Angular between two rays from a shared vertex. */
export const makeAngularDim = (vertex, onRay1, onRay2, extra) =>
  makeDimension(vertex, onRay1, onRay2, 'angular', extra);

/** Radius leader from a centre (or anywhere) out to the arc or circle. */
export const makeRadiusDim = (centre, onEdge, defPoint, extra) =>
  makeDimension(centre, onEdge, defPoint, 'radius', extra);

export const makeDiameterDim = (centre, onEdge, defPoint, extra) =>
  makeDimension(centre, onEdge, defPoint, 'diameter', extra);

/** Build the dimension a user means by tapping a circular shape. */
export function dimensionForShape(shape, type, defPoint) {
  if (shape.type === 'circle') {
    const c = centerOf(shape);
    const r = shapeRadius(shape);
    const edge = add(c, {x: r, y: 0});
    return type === 'diameter'
      ? makeDiameterDim(c, edge, defPoint)
      : makeRadiusDim(c, edge, defPoint);
  }
  if (shape.type === 'arc') {
    const p = arcParams(shape);
    const midDeg = p.startDeg + p.sweepDeg / 2;
    const onArc = add(p.center, fromAngle(midDeg * (Math.PI / 180), p.r));
    return type === 'diameter'
      ? makeDiameterDim(p.center, onArc, defPoint)
      : makeRadiusDim(p.center, onArc, defPoint);
  }
  if (shape.type === 'line') {
    return makeAlignedDim(shape.points[0], shape.points[1], defPoint);
  }
  return null;
}

/**
 * Re-point a dimension after its geometry moves.
 *
 * When a dimension is associated with a shape we keep the association by
 * storing the referenced id and re-deriving the points, rather than trying to
 * follow individual vertices.
 */
export function updateDimension(d, shapes) {
  if (!d.assocId) return d;
  const target = shapes.find(s => s.id === d.assocId);
  if (!target) return d;
  if (target.type === 'line') {
    return {...d, points: [target.points[0], target.points[1], d.points[2]]};
  }
  const rebuilt = dimensionForShape(target, d.dimType, d.points[2]);
  return rebuilt ? {...d, points: rebuilt.points} : d;
}
