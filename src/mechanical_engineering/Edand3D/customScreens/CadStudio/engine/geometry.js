/**
 * CAD Studio — shape model and pure geometry.
 *
 * ── The shape model ────────────────────────────────────────────────────────
 * Every entity in a drawing is `{id, type, points, ...}` where `points` is a
 * flat array of `{x, y}` in world millimetres, Y-up. Keeping one uniform
 * array (instead of a bespoke schema per entity, as the earlier SolidCad
 * snapshot system did with startPoint/endPoint/center/radius) is what lets
 * transforms, selection, snapping, trimming and dimensioning all be written
 * once and work on every entity type.
 *
 *   line      points: [start, end]
 *   circle    points: [center]                      + radius
 *   arc       points: [center, start, end]           + ccw
 *   ellipse   points: [center, majorEnd, minorEnd]   (the two axis endpoints)
 *   polyline  points: [...]                          + closed, width
 *   spline    points: [control points...]            + closed
 *   point     points: [position]
 *   text      points: [insert]                       + text, height, rotation
 *   dimension points: [p1, p2, definitionPoint]      + dimType
 *
 * Nothing here imports React, Skia or THREE — the whole file is pure and
 * safe to call from a worklet (which is why it uses plain objects and
 * module-level functions rather than classes or THREE.Vector2).
 */

import {
  EPS,
  RAD,
  add,
  angleTo,
  clone,
  cross,
  dist,
  dot,
  fromAngle,
  len,
  lerp,
  mid,
  mul,
  norm,
  norm360,
  normTau,
  perp,
  pt,
  sub,
} from './vec';

// ── Constructors ────────────────────────────────────────────────────────────

let idSeq = 0;
export function makeId(prefix = 'e') {
  idSeq += 1;
  return `${prefix}${idSeq.toString(36)}${(Date.now() % 1e6).toString(36)}`;
}

// Every shape is born with an id. The alternative — minting ids later in
// sealShape — means two unsealed shapes both have `id === undefined`, and any
// `a.id !== b.id` identity check downstream then treats them as the same
// entity (which silently disabled every intersection snap).
export const makeLine = (a, b, extra) => ({
  type: 'line',
  id: makeId(),
  points: [a, b],
  ...extra,
});
export const makeCircle = (center, radius, extra) => ({
  type: 'circle',
  id: makeId(),
  points: [center],
  radius,
  ...extra,
});
export const makeArc = (center, start, end, ccw = true, extra) => ({
  type: 'arc',
  id: makeId(),
  points: [center, start, end],
  ccw,
  ...extra,
});
export const makeEllipse = (center, majorEnd, minorEnd, extra) => ({
  type: 'ellipse',
  id: makeId(),
  points: [center, majorEnd, minorEnd],
  ...extra,
});
export const makePolyline = (points, closed = false, extra) => ({
  type: 'polyline',
  id: makeId(),
  points: points.map(clone),
  closed,
  width: 0,
  ...extra,
});
export const makeSpline = (points, closed = false, extra) => ({
  type: 'spline',
  id: makeId(),
  points: points.map(clone),
  closed,
  ...extra,
});
export const makePoint = (p, extra) => ({
  type: 'point',
  id: makeId(),
  points: [p],
  ...extra,
});
export const makeText = (p, text, height = 5, rotation = 0, extra) => ({
  type: 'text',
  id: makeId(),
  points: [p],
  text,
  height,
  rotation,
  ...extra,
});
export const makeDimension = (
  p1,
  p2,
  defPoint,
  dimType = 'aligned',
  extra,
) => ({
  type: 'dimension',
  id: makeId(),
  points: [p1, p2, defPoint],
  dimType,
  ...extra,
});

/** Attach id + layer to a shape if it doesn't have them yet. */
export function sealShape(shape, layerId) {
  return {
    ...shape,
    id: shape.id ?? makeId(),
    layerId: shape.layerId ?? layerId,
  };
}

// ── Basic accessors ────────────────────────────────────────────────────────

export const shapeRadius = s =>
  s.type === 'circle'
    ? s.radius
    : s.type === 'arc'
    ? dist(s.points[0], s.points[1])
    : 0;

/** Arc centre (works for circle too). */
export const centerOf = s => s.points[0];

/** Arc start/end points (works for circle too — both return the centre). */
const startPtOf = s => (s.type === 'arc' ? s.points[1] : s.points[0]);
const endPtOf = s => (s.type === 'arc' ? s.points[2] : s.points[0]);

/**
 * Arc parameter set, in degrees. Also valid for circles, where start and
 * end coincide and the sweep is a full turn.
 */
export function arcParams(s) {
  const c = s.points[0];
  if (s.type === 'circle')
    return {
      center: c,
      r: s.radius,
      startDeg: 0,
      endDeg: 360,
      ccw: true,
      sweepDeg: 360,
    };
  if (s.type !== 'arc') return null;
  const r = dist(c, s.points[1]);
  const startDeg = norm360(angleTo(c, s.points[1]) * (180 / Math.PI));
  const endDeg = norm360(angleTo(c, s.points[2]) * (180 / Math.PI));
  const ccw = s.ccw !== false;
  const sweepDeg = ccw
    ? norm360(endDeg - startDeg)
    : norm360(startDeg - endDeg);
  return {center: c, r, startDeg, endDeg, ccw, sweepDeg};
}

/** Point on a circle/arc at a given angle in degrees. */
export function pointOnArc(s, deg) {
  const p = arcParams(s);
  return add(p.center, fromAngle(deg * (Math.PI / 180), p.r));
}

/** Is a given angle (deg) inside the arc's sweep? Circles always contain it. */
export function angleOnArc(s, deg) {
  if (s.type === 'circle') return true;
  const p = arcParams(s);
  const a = norm360(deg);
  if (p.ccw) {
    return p.sweepDeg >= 359.999
      ? true
      : norm360(a - p.startDeg) <= p.sweepDeg + 1e-6;
  }
  return p.sweepDeg >= 359.999
    ? true
    : norm360(p.startDeg - a) <= p.sweepDeg + 1e-6;
}

/** Angle (deg) of the arc's midpoint, honouring direction. */
export function arcMidAngle(s) {
  const p = arcParams(s);
  return p.ccw
    ? norm360(p.startDeg + p.sweepDeg / 2)
    : norm360(p.startDeg - p.sweepDeg / 2);
}

// ── Arc from three points ───────────────────────────────────────────────────

/**
 * Build the arc that starts at `a`, passes through `b` and ends at `c` —
 * the "3 point" arc, the default mode of AutoCAD's ARC command.
 * Returns null when the three points are collinear (no circle through them).
 */
export function arcFrom3Points(a, b, c) {
  const ax = a.x,
    ay = a.y,
    bx = b.x,
    by = b.y,
    cx = c.x,
    cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;

  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;

  const center = {
    x: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
    y: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d,
  };
  const r = dist(center, a);

  const startDeg = norm360(angleTo(center, a) * (180 / Math.PI));
  const midDeg = norm360(angleTo(center, b) * (180 / Math.PI));
  const endDeg = norm360(angleTo(center, c) * (180 / Math.PI));

  // CCW when the middle point sits on the counter-clockwise sweep from a to c.
  const fwd = norm360(midDeg - startDeg);
  const span = norm360(endDeg - startDeg);
  const ccw = span === 0 ? true : fwd <= span + 1e-6;

  return {center, r, startDeg, endDeg, ccw};
}

// ── Flattening to polyline segments ─────────────────────────────────────────

/**
 * Flatten any shape into a list of straight segments `{a, b}`. This is the
 * common denominator used by hit-testing, selection windows, trimming and
 * anything else that only cares about "where is the ink". Curved entities
 * are sampled to a tolerance derived from `tol` (world mm).
 */
export function segmentsOf(shape, tol = 0.6) {
  switch (shape.type) {
    case 'line':
      return [{a: shape.points[0], b: shape.points[1]}];
    case 'polyline': {
      const segs = [];
      const p = shape.points;
      for (let i = 0; i < p.length - 1; i += 1)
        segs.push({a: p[i], b: p[i + 1]});
      if (shape.closed && p.length > 2)
        segs.push({a: p[p.length - 1], b: p[0]});
      return segs;
    }
    case 'circle': {
      const c = shape.points[0];
      const steps = arcSteps(shape.radius, tol);
      const segs = [];
      let prev = add(c, {x: shape.radius, y: 0});
      for (let i = 1; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        const next = add(c, {
          x: Math.cos(a) * shape.radius,
          y: Math.sin(a) * shape.radius,
        });
        segs.push({a: prev, b: next});
        prev = next;
      }
      return segs;
    }
    case 'arc': {
      const p = arcParams(shape);
      const steps = Math.max(2, arcSteps(p.r * (p.sweepDeg / 360), tol));
      const segs = [];
      let prev = add(p.center, fromAngle(p.startDeg * (Math.PI / 180), p.r));
      for (let i = 1; i <= steps; i += 1) {
        const deg = p.ccw
          ? p.startDeg + (p.sweepDeg * i) / steps
          : p.startDeg - (p.sweepDeg * i) / steps;
        const next = add(p.center, fromAngle(deg * (Math.PI / 180), p.r));
        segs.push({a: prev, b: next});
        prev = next;
      }
      return segs;
    }
    case 'ellipse': {
      const {center, major, minor, rot} = ellipseParams(shape);
      const circumference =
        Math.PI *
        (3 * (major + minor) -
          Math.sqrt((3 * major + minor) * (major + 3 * minor)));
      const steps = Math.max(
        12,
        Math.min(180, Math.ceil(circumference / Math.max(tol, 0.4))),
      );
      const segs = [];
      let prev = ellipsePoint(center, major, minor, rot, 0);
      for (let i = 1; i <= steps; i += 1) {
        const next = ellipsePoint(
          center,
          major,
          minor,
          rot,
          (i / steps) * Math.PI * 2,
        );
        segs.push({a: prev, b: next});
        prev = next;
      }
      return segs;
    }
    case 'spline': {
      const samples = catmullRom(shape.points, shape.closed, 12);
      const segs = [];
      for (let i = 0; i < samples.length - 1; i += 1)
        segs.push({a: samples[i], b: samples[i + 1]});
      return segs;
    }
    case 'dimension':
      return dimensionSegments(shape);
    case 'point':
    case 'text':
      return [{a: shape.points[0], b: shape.points[0]}];
    default:
      return [];
  }
}

/** How many straight pieces approximate an arc of the given length. */
function arcSteps(arcLength, tol) {
  return Math.max(
    8,
    Math.min(240, Math.ceil(Math.abs(arcLength) / Math.max(tol, 0.35))),
  );
}

// ── Ellipse ─────────────────────────────────────────────────────────────────

/** Ellipse as centre + semi-axes + rotation, derived from its axis endpoints. */
export function ellipseParams(s) {
  const [c, majorEnd, minorEnd] = s.points;
  const major = len(sub(majorEnd, c));
  const minor = len(sub(minorEnd, c));
  const rot = Math.atan2(majorEnd.y - c.y, majorEnd.x - c.x);
  return {center: c, major, minor, rot};
}

export function ellipsePoint(center, major, minor, rot, t) {
  const x = Math.cos(t) * major;
  const y = Math.sin(t) * minor;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return {x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos};
}

// ── Splines (uniform Catmull-Rom, matches the existing AutoCad module) ─────

/**
 * Sample a Catmull-Rom spline through `pts`. Endpoints are duplicated so
 * the curve starts and ends exactly on the first/last control point, which
 * is what users expect from a drawing spline.
 */
export function catmullRom(pts, closed = false, perSegment = 12) {
  if (pts.length < 2) return pts.map(clone);
  if (pts.length === 2) return [clone(pts[0]), clone(pts[1])];

  const out = [];
  const n = pts.length;
  const at = i => {
    if (closed) return pts[((i % n) + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };

  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSegment; s += 1) {
      const t = s / perSegment;
      out.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }
  out.push(clone(closed ? pts[0] : pts[n - 1]));
  return out;
}

export function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

// ── Projections and intersections ───────────────────────────────────────────

/** Closest point to `p` on segment a→b. */
export function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < EPS) return clone(a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return add(a, mul(ab, t));
}

/** Shortest distance from a point to a segment. */
export function distToSegment(p, a, b) {
  return dist(p, closestOnSegment(p, a, b));
}

/** Infinite-line intersection. Returns null when (near) parallel. */
export function lineLineIntersect(a1, a2, b1, b2) {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-12) return null;
  const t = cross(sub(b1, a1), d2) / denom;
  return add(a1, mul(d1, t));
}

/**
 * Intersection of two finite segments. `tolerance` lets callers ask for
 * "close enough" hits, which is what snapping wants (TRIM needs the exact
 * value, OSNAP wants a small window).
 */
export function segmentIntersect(a1, a2, b1, b2, tolerance = 0) {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-12) return null;
  const t = cross(sub(b1, a1), d2) / denom;
  const u = cross(sub(b1, a1), d1) / denom;
  const eps = tolerance / Math.max(len(d1), len(d2), 1);
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return {point: add(a1, mul(d1, Math.max(0, Math.min(1, t)))), t, u};
}

/** Intersections of an infinite line with a circle. */
export function lineCircleIntersect(p1, p2, center, radius) {
  const d = sub(p2, p1);
  const f = sub(p1, center);
  const A = dot(d, d);
  if (A < EPS) return [];
  const B = 2 * dot(f, d);
  const C = dot(f, f) - radius * radius;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const out = [];
  for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
    if (t >= -1e-9 && t <= 1 + 1e-9)
      out.push(add(p1, mul(d, Math.max(0, Math.min(1, t)))));
  }
  return out;
}

/** Intersections of two circles. */
export function circleCircleIntersect(c1, r1, c2, r2) {
  const d = dist(c1, c2);
  if (d < EPS || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  const h = hSq > 0 ? Math.sqrt(hSq) : 0;
  const base = add(c1, mul(norm(sub(c2, c1)), a));
  if (h < 1e-9) return [base];
  const off = mul(perp(norm(sub(c2, c1))), h);
  return [add(base, off), sub(base, off)];
}

/** Foot of the perpendicular dropped from `p` onto the line a→b. */
export function perpendicularFoot(p, a, b) {
  return closestOnSegment(p, a, b);
}

/** Angle (degrees, 0–360) of the interior corner at `b` formed by a→b→c. */
export function cornerAngleDeg(a, b, c) {
  const v1 = norm(sub(a, b));
  const v2 = norm(sub(c, b));
  if (len(v1) < EPS || len(v2) < EPS) return 0;
  const ang =
    Math.acos(Math.max(-1, Math.min(1, dot(v1, v2)))) * (180 / Math.PI);
  return ang;
}

// ── Dimensions ──────────────────────────────────────────────────────────────

/**
 * Straight segments approximating a dimension entity, for hit-testing and
 * selection. The full visual (arrows, text, extension lines) is built by
 * engine/dimension.js — this is just the "where is the ink" approximation,
 * and it lives here so geometry.js stays dependency-free.
 */
export function dimensionSegments(d) {
  const [p1, p2, def] = d.points;
  const type = d.dimType || 'aligned';

  if (type === 'radius' || type === 'diameter') {
    const edge = p2;
    const c = p1;
    const segs = [{a: c, b: edge}];
    if (def) segs.push({a: edge, b: def});
    return segs;
  }

  if (type === 'angular') {
    const segs = [];
    if (p2) segs.push({a: p1, b: p2});
    if (def) segs.push({a: p1, b: def});
    // The dimension arc between the two ray ends.
    const r = Math.min(len(sub(p2, p1)), len(sub(def, p1)));
    if (r > 1e-6) {
      const a0 = angleTo(p1, p2);
      let a1 = angleTo(p1, def);
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
      const steps = 16;
      let prev = add(p1, fromAngle(a0, r));
      for (let i = 1; i <= steps; i += 1) {
        const next = add(p1, fromAngle(a0 + ((a1 - a0) * i) / steps, r));
        segs.push({a: prev, b: next});
        prev = next;
      }
    }
    return segs;
  }

  // linear / aligned
  const dir = norm(sub(p2, p1));
  if (len(dir) < EPS) return [{a: p1, b: p2}];
  const n = perp(dir);
  const t1 = dot(sub(def, p1), n);
  const t2 = dot(sub(def, p2), n);
  const q1 = add(p1, mul(n, t1));
  const q2 = add(p2, mul(n, t2));
  return [
    {a: p1, b: q1},
    {a: p2, b: q2},
    {a: q1, b: q2},
  ];
}

// ── Bounding boxes, centroids, area ─────────────────────────────────────────

/**
 * Axis-aligned bounding box.
 *
 * Curved entities are handled analytically rather than from their flattened
 * chords. Chords cut *inside* the curve, so a box built that way is
 * slightly too small — harmless for hit-testing, but wrong for zoom-to-fit
 * and for the viewport cull test, which is why the exact extremes are
 * computed here.
 */
export function shapeBBox(shape, tol = 0.6) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const eat = p => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };

  if (shape.type === 'circle') {
    const c = shape.points[0];
    const r = shape.radius;
    return {minX: c.x - r, minY: c.y - r, maxX: c.x + r, maxY: c.y + r};
  }

  if (shape.type === 'arc') {
    const a = arcParams(shape);
    // The extremes are the cardinal points, but only those actually inside
    // the swept range count.
    for (const deg of [0, 90, 180, 270]) {
      if (angleInSweep(a, deg)) eat(add(a.center, fromAngle(deg / RAD, a.r)));
    }
    eat(shape.points[1]);
    eat(shape.points[2]);
    return {minX, minY, maxX, maxY};
  }

  if (shape.type === 'ellipse') {
    // The AABB of a rotated ellipse is NOT bounded by its four axis ends.
    // The extremes in a world direction are given by the support function
    // h(w) = sqrt((a·u·w)² + (b·v·w)²), where u/v are the unit semi-axis
    // directions; the axis endpoints only touch that bound when rot is a
    // multiple of 90°. Using them under-reports the box for any rotation.
    const e = ellipseParams(shape);
    const c = Math.cos(e.rot);
    const s = Math.sin(e.rot);
    const hx = Math.hypot(e.major * c, e.minor * s);
    const hy = Math.hypot(e.major * s, e.minor * c);
    return {
      minX: e.center.x - hx,
      minY: e.center.y - hy,
      maxX: e.center.x + hx,
      maxY: e.center.y + hy,
    };
  }

  for (const p of shape.points) eat(p);
  for (const s of segmentsOf(shape, tol)) {
    eat(s.a);
    eat(s.b);
  }
  if (!Number.isFinite(minX)) return {minX: 0, minY: 0, maxX: 0, maxY: 0};
  return {minX, minY, maxX, maxY};
}

/** Is `deg` inside the swept range described by `a`? */
function angleInSweep(a, deg) {
  const d = norm360(deg - a.startDeg);
  return a.ccw ? d <= a.sweepDeg + 1e-9 : d >= 360 - a.sweepDeg - 1e-9;
}

export function shapesBBox(shapes, tol = 0.6) {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const sh of shapes) {
    const b = shapeBBox(sh, tol);
    if (b.minX < box.minX) box.minX = b.minX;
    if (b.minY < box.minY) box.minY = b.minY;
    if (b.maxX > box.maxX) box.maxX = b.maxX;
    if (b.maxY > box.maxY) box.maxY = b.maxY;
  }
  if (!Number.isFinite(box.minX))
    return {minX: 0, minY: 0, maxX: 100, maxY: 100};
  return box;
}

/** Centroid of a shape's vertices (good enough for move/scale/rotate bases). */
export function centroidOf(shape) {
  const p = shape.points;
  if (!p.length) return pt(0, 0);
  if (shape.type === 'circle' || shape.type === 'arc')
    return clone(shape.points[0]);
  if (p.length === 1) return clone(p[0]);
  if (shape.type === 'ellipse') return clone(p[0]);
  let sx = 0;
  let sy = 0;
  for (const q of p) {
    sx += q.x;
    sy += q.y;
  }
  return {x: sx / p.length, y: sy / p.length};
}

/** Signed area of a closed vertex ring (shoelace). */
export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export const isClosed = s =>
  s.type === 'circle' ||
  s.type === 'dimension' ||
  s.type === 'point' ||
  s.type === 'text' ||
  !!s.closed;

// ── Measurements ────────────────────────────────────────────────────────────

/**
 * Everything AutoCAD's DIST/AREA/LIST would report for one entity, in one
 * pass — the commands then just format what they need.
 */
export function measure(shape) {
  switch (shape.type) {
    case 'line':
      return {
        kind: 'length',
        length: dist(shape.points[0], shape.points[1]),
        closed: false,
      };

    case 'circle':
      return {
        kind: 'area',
        radius: shape.radius,
        diameter: shape.radius * 2,
        area: Math.PI * shape.radius ** 2,
        perimeter: 2 * Math.PI * shape.radius,
        closed: true,
      };

    case 'arc': {
      const p = arcParams(shape);
      const arcLen = (p.sweepDeg * Math.PI * p.r) / 180;
      const sector = (p.sweepDeg / 360) * Math.PI * p.r * p.r;
      const tri = 0.5 * p.r * p.r * Math.sin((p.sweepDeg * Math.PI) / 180);
      return {
        kind: 'area',
        radius: p.r,
        diameter: p.r * 2,
        sweepDeg: p.sweepDeg,
        length: arcLen,
        area: Math.max(0, sector - tri),
        perimeter: arcLen,
        closed: false,
      };
    }

    case 'ellipse': {
      const {major, minor} = ellipseParams(shape);
      return {
        kind: 'area',
        majorRadius: major,
        minorRadius: minor,
        majorDiameter: major * 2,
        minorDiameter: minor * 2,
        area: Math.PI * major * minor,
        perimeter:
          Math.PI *
          (3 * (major + minor) -
            Math.sqrt((3 * major + minor) * (major + 3 * minor))),
        closed: true,
      };
    }

    case 'polyline': {
      const pts = shape.points;
      if (shape.closed && pts.length > 2) {
        const ring = [...pts, pts[0]];
        let per = 0;
        for (let i = 0; i < ring.length - 1; i += 1)
          per += dist(ring[i], ring[i + 1]);
        return {
          kind: 'area',
          area: Math.abs(signedArea(pts)),
          perimeter: per,
          length: per,
          closed: true,
          vertices: pts.length,
        };
      }
      let length = 0;
      for (let i = 0; i < pts.length - 1; i += 1)
        length += dist(pts[i], pts[i + 1]);
      return {kind: 'length', length, closed: false, vertices: pts.length};
    }

    case 'spline': {
      const samples = catmullRom(shape.points, shape.closed, 16);
      let length = 0;
      for (let i = 0; i < samples.length - 1; i += 1)
        length += dist(samples[i], samples[i + 1]);
      return {
        kind: 'length',
        length,
        closed: !!shape.closed,
        controlPoints: shape.points.length,
      };
    }

    case 'dimension':
      return measureDimension(shape);

    case 'point':
      return {kind: 'point', closed: false};

    case 'text':
      return {
        kind: 'text',
        text: shape.text,
        height: shape.height,
        closed: false,
      };

    default:
      return {kind: 'length', length: 0, closed: false};
  }
}

function measureDimension(shape) {
  const [p1, p2, def] = shape.points;
  const raw = dist(p1, p2);
  const base = norm(sub(p2, p1));
  const normal = perp(base);
  const off = dot(sub(def, p1), normal);
  return {
    kind: 'dimension',
    length: raw,
    measurement: Math.abs(off) > 1e-9 ? Math.abs(off) : raw,
    actual: raw,
    angleDeg: norm360(angleTo(p1, p2) * (180 / Math.PI)),
    offset: off,
    dimType: shape.dimType,
    closed: false,
  };
}

// ── Hit testing ─────────────────────────────────────────────────────────────

/** Shortest distance from a point to a shape's ink. */
export function distToShape(shape, p, tol = 0.6) {
  if (shape.type === 'point' || shape.type === 'text')
    return dist(p, shape.points[0]);
  let best = Infinity;
  for (const s of segmentsOf(shape, tol)) {
    const d = distToSegment(p, s.a, s.b);
    if (d < best) best = d;
  }
  return best;
}

/** The closest point on a shape's ink to `p`, plus the owning shape. */
export function closestOnShape(shape, p, tol = 0.6) {
  if (shape.type === 'point' || shape.type === 'text')
    return {
      shape,
      point: clone(shape.points[0]),
      distance: dist(p, shape.points[0]),
    };
  let best = null;
  let bestD = Infinity;
  for (const s of segmentsOf(shape, tol)) {
    const q = closestOnSegment(p, s.a, s.b);
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return {shape, point: best ?? clone(shape.points[0]), distance: bestD};
}

/** Is the world point inside the shape's outline (crossing test)? */
export function pointInShape(shape, p, tol = 0.6) {
  if (shape.type === 'circle') return dist(p, shape.points[0]) <= shape.radius;
  if (shape.type === 'ellipse') {
    const {center, major, minor, rot} = ellipseParams(shape);
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const d = sub(p, center);
    const x = (d.x * cos - d.y * sin) / (major || 1);
    const y = (d.x * sin + d.y * cos) / (minor || 1);
    return x * x + y * y <= 1;
  }
  if (shape.type === 'text' || shape.type === 'point') return false;
  if (!isClosed(shape)) return false;
  // Winding test against the flattened outline, which is what the flat
  // segments represent for arcs/ellipses/splines.
  const segs = segmentsOf(shape, tol);
  let inside = false;
  for (let i = 0, j = segs.length - 1; i < segs.length; j = i, i += 1) {
    const a = segs[i].a;
    const b = segs[j].a;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

// ── Transforms ──────────────────────────────────────────────────────────────

/** Map every point of a shape through `fn`. Geometry-only: keeps id/layer. */
export function transformShape(shape, fn) {
  if (shape.type === 'circle') {
    const center = fn(shape.points[0]);
    const edge = fn(add(shape.points[0], {x: shape.radius, y: 0}));
    return {...shape, points: [center], radius: dist(center, edge)};
  }
  if (shape.type === 'arc') {
    const points = shape.points.map(fn);
    // The transform may have mirrored the arc, so re-derive the direction
    // from the original start/end ordering.
    const originalCCW = shape.ccw !== false;
    const center = points[0];
    const newStart = angleTo(center, points[1]) * (180 / Math.PI);
    const newEnd = angleTo(center, points[2]) * (180 / Math.PI);
    const ccw =
      norm360(newEnd - newStart) < 180 === originalCCW
        ? originalCCW
        : !originalCCW;
    return {...shape, points, ccw};
  }
  if (shape.type === 'text') {
    // Text has an orientation; carry it through the transform by tracking
    // how the local +X direction moved.
    const p0 = fn(shape.points[0]);
    const p1 = fn(add(shape.points[0], {x: 1, y: 0}));
    const turned = angleTo(p0, p1);
    return {...shape, points: [p0], rotation: (shape.rotation || 0) + turned};
  }
  return {...shape, points: shape.points.map(fn)};
}

export const translateShape = (shape, delta) =>
  transformShape(shape, p => add(p, delta));

export const rotateShape = (shape, origin, rad) =>
  transformShape(shape, p => {
    const v = sub(p, origin);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return add(origin, {x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos});
  });

export const scaleShape = (shape, origin, factor) =>
  transformShape(shape, p => add(origin, mul(sub(p, origin), factor)));

/** Mirror across the infinite line through `a` and `b`. */
export function mirrorShape(shape, a, b) {
  const dir = norm(sub(b, a));
  const n = {x: -dir.y, y: dir.x};
  return transformShape(shape, p => {
    const d = dot(sub(p, a), n);
    return sub(p, mul(n, 2 * d));
  });
}

// ── Grips (vertex editing) ──────────────────────────────────────────────────

/**
 * Editable grip points for a shape — the blue squares in AutoCAD. Which
 * points are exposed depends on the type: vertices for polylines, the two
 * ends for lines, the radius handle for circles, the two ends for arcs.
 * Returns `[]` for types with nothing to grip (already final geometry).
 */
export function gripsOf(shape) {
  switch (shape.type) {
    case 'line':
      return [
        {point: shape.points[0], kind: 'start'},
        {point: shape.points[1], kind: 'end'},
      ];
    case 'circle': {
      // Centre plus the four quadrants, matching AutoCAD. The quadrants let
      // the circle be resized from a known compass direction instead of from
      // wherever the pointer happened to land.
      const c = shape.points[0];
      const r = shape.radius;
      return [
        {point: clone(c), kind: 'center'},
        {point: add(c, {x: r, y: 0}), kind: 'quadrant', deg: 0},
        {point: add(c, {x: 0, y: r}), kind: 'quadrant', deg: 90},
        {point: add(c, {x: -r, y: 0}), kind: 'quadrant', deg: 180},
        {point: add(c, {x: 0, y: -r}), kind: 'quadrant', deg: 270},
      ];
    }
    case 'arc': {
      const p = arcParams(shape);
      return [
        {point: shape.points[1], kind: 'start'},
        {point: shape.points[2], kind: 'end'},
        {
          point: add(
            p.center,
            fromAngle(arcMidAngle(shape) * (Math.PI / 180), p.r),
          ),
          kind: 'radius',
        },
      ];
    }
    case 'ellipse':
      return shape.points
        .slice(1)
        .map((p, i) => ({point: p, kind: i === 0 ? 'major' : 'minor'}));
    case 'polyline':
    case 'spline':
      return shape.points.map((p, i) => ({point: p, kind: 'vertex', index: i}));
    case 'point':
    case 'text':
    case 'dimension':
      return [];
    default:
      return [];
  }
}

/** Move one grip to a new position, returning a new shape. */
export function moveGrip(shape, grip, target) {
  switch (shape.type) {
    case 'line': {
      const points = [...shape.points];
      points[grip.kind === 'start' ? 0 : 1] = clone(target);
      return {...shape, points};
    }
    case 'circle': {
      if (grip.kind === 'center') {
        // Translate the whole circle, keeping its radius.
        const delta = sub(target, shape.points[0]);
        return {...shape, points: [add(shape.points[0], delta)]};
      }
      // Any quadrant (or the radius handle) sets the radius from the centre.
      const r = Math.max(1e-3, dist(shape.points[0], target));
      return {...shape, radius: r};
    }
    case 'arc': {
      const p = arcParams(shape);
      const center = shape.points[0];
      if (grip.kind === 'radius') {
        // Dragging the arc's mid handle changes its radius.
        const r = Math.max(1e-3, dist(center, target));
        return makeArc(
          center,
          add(center, fromAngle(p.startDeg * (Math.PI / 180), r)),
          add(center, fromAngle(p.endDeg * (Math.PI / 180), r)),
          p.ccw,
          stripMeta(shape),
        );
      }
      const points = [...shape.points];
      points[grip.kind === 'start' ? 1 : 2] = clone(target);
      return {...shape, points};
    }
    case 'ellipse': {
      const {center} = ellipseParams(shape);
      const points = [...shape.points];
      points[grip.kind === 'major' ? 1 : 2] = add(
        center,
        norm(sub(target, center)),
      );
      return {...shape, points};
    }
    case 'polyline':
    case 'spline': {
      const points = [...shape.points];
      points[grip.index] = clone(target);
      return {...shape, points};
    }
    default:
      return shape;
  }
}

const stripMeta = s => {
  const {id, layerId, color, linetype, lineweight, ...rest} = s;
  return rest;
};

// ── Vertex helpers used by trim / offset / join ─────────────────────────────

/** All vertices of a shape as a flat array (curved types contribute theirs). */
export const verticesOf = shape => shape.points.map(clone);

/** Closed vertex ring for a shape that encloses area. */
export function ringOf(shape, tol = 0.6) {
  if (shape.type === 'circle') {
    return segmentsOf(shape, tol).map(s => s.a);
  }
  if (shape.type === 'ellipse') {
    return segmentsOf(shape, tol).map(s => s.a);
  }
  if (shape.type === 'spline') {
    return catmullRom(shape.points, true, 12);
  }
  if (shape.type === 'polyline' && shape.closed) return shape.points.map(clone);
  if (shape.type === 'polyline' && shape.points.length > 2)
    return [...shape.points, shape.points[0]];
  return shape.points.map(clone);
}

/** Perpendicular offset of a single segment by `d` (left positive). */
export function offsetSegment(a, b, d) {
  const dir = norm(sub(b, a));
  const n = {x: -dir.y * d, y: dir.x * d};
  return {a: add(a, n), b: add(b, n)};
}

/** Offset an open polyline, joining neighbours with miter (fallback bevel). */
export function offsetPolyline(points, d) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const prev = points[i - 1];
    const next = points[i + 1];
    if (!prev) {
      out.push(offsetSegment(points[i], points[i + 1], d).a);
    } else if (!next) {
      out.push(offsetSegment(points[i - 1], points[i], d).b);
    } else {
      const e1 = offsetSegment(prev, points[i], d).b;
      const e2 = offsetSegment(points[i], next, d).a;
      const m = lineLineIntersect(
        sub(points[i], prev),
        add(points[i], next),
        sub(e1, points[i]),
        add(e1, e2),
      );
      out.push(m || e1);
    }
  }
  return out;
}

/**
 * Closest pair of points, one on segment a1→a2 and one on b1→b2. This is
 * what joins two collinear lines end-to-end, and what snaps a grip onto
 * another entity.
 */
export function closestPair(a1, a2, b1, b2) {
  // Iterate once: project b's endpoints onto a, then a's result onto b.
  // Two rounds is plenty for the near-collinear cases this is used on.
  let q1 = closestOnSegment(b1, a1, a2);
  let q2 = closestOnSegment(q1, b1, b2);
  const r1 = closestOnSegment(q2, a1, a2);
  q1 = r1;
  q2 = closestOnSegment(q1, b1, b2);
  return [q1, q2];
}

export {
  lerp,
  mid,
  norm,
  dot,
  sub,
  add,
  mul,
  fromAngle,
  angleTo,
  normTau,
  dist,
  len,
  clone,
  perp,
};
