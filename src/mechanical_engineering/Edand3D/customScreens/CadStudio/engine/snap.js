/**
 * CAD Studio — object snap (OSNAP).
 *
 * A snap solver takes a raw world point and returns the nearest *meaningful*
 * point on nearby geometry, tagged with what kind of snap it is so the
 * canvas can draw the right marker. This is the single biggest difference
 * between "a drawing app" and "AutoCAD": on a phone, where your fingertip
 * covers the thing you are aiming at, you need the geometry to pull the
 * point onto it for you.
 *
 * Design notes
 * ─────────────
 * • Priority beats proximity. In AutoCAD an endpoint 8 units away wins over
 *   a "nearest" 1 unit away, because those are different kinds of promise.
 *   We rank by kind first, then by distance within that kind.
 * • The pick radius is passed in *world* units by the caller (screen px
 *   divided by zoom), so a fixed number of finger-widths means the same
 *   physical size at every zoom level.
 * • Pairwise intersection is O(n²). We only consider shapes whose bounding
 *   box is already within the pick radius, which keeps a busy drawing
 *   responsive, and we bail out entirely past a shape-count ceiling.
 */

import {
  arcMidAngle,
  arcParams,
  circleCircleIntersect,
  closestOnSegment,
  ellipseParams,
  lineCircleIntersect,
  pointOnArc,
  segmentIntersect,
  segmentsOf,
  shapeBBox,
} from './geometry';
import {add, angleTo, dist, fromAngle, norm360, sub} from './vec';

export const SNAP_KINDS = [
  'endpoint',
  'intersection',
  'node',
  'midpoint',
  'quadrant',
  'center',
  'perpendicular',
  'tangent',
  'nearest',
  'insert',
];

/** Lower index = wins ties. Mirrors AutoCAD's marker hierarchy. */
const PRIORITY = {
  endpoint: 0,
  intersection: 1,
  node: 2,
  midpoint: 3,
  quadrant: 4,
  center: 5,
  perpendicular: 6,
  tangent: 7,
  insert: 8,
  nearest: 9,
};

export const SNAP_LABELS = {
  endpoint: 'Endpoint',
  intersection: 'Intersection',
  node: 'Node',
  midpoint: 'Midpoint',
  quadrant: 'Quadrant',
  center: 'Center',
  perpendicular: 'Perpendicular',
  tangent: 'Tangent',
  nearest: 'Nearest',
  insert: 'Insert',
  grid: 'Grid',
  ortho: 'Ortho',
  polar: 'Polar',
  free: 'Cursor',
};

export const DEFAULT_OSNAP = {
  endpoint: true,
  midpoint: true,
  center: true,
  quadrant: true,
  intersection: true,
  perpendicular: true,
  tangent: false,
  nearest: false,
  node: true,
  insert: true,
};

/** Above this many shapes we stop looking for intersections entirely. */
const INTERSECTION_CEILING = 260;

/** Shapes whose ink is within `pad` of the pick box can contribute snaps. */
function nearBox(shape, p, pad) {
  const b = shapeBBox(shape, 1.2);
  return (
    p.x >= b.minX - pad &&
    p.x <= b.maxX + pad &&
    p.y >= b.minY - pad &&
    p.y <= b.maxY + pad
  );
}

const cand = (x, y, kind, shape, extra) => ({
  x,
  y,
  kind,
  shapeId: shape?.id,
  ...extra,
});

/**
 * All snap candidates a single shape can offer, ignoring the pick radius.
 * `from` is the current rubber-band origin, needed by perpendicular/tangent.
 */
function candidatesOf(shape, from) {
  const out = [];
  const P = shape.points;

  switch (shape.type) {
    case 'line':
      if (shape.points.length >= 2) {
        out.push(cand(P[0].x, P[0].y, 'endpoint', shape));
        out.push(cand(P[1].x, P[1].y, 'endpoint', shape));
        out.push(
          cand((P[0].x + P[1].x) / 2, (P[0].y + P[1].y) / 2, 'midpoint', shape),
        );
      }
      break;

    case 'polyline':
    case 'spline': {
      const n = P.length;
      for (let i = 0; i < n; i += 1) {
        out.push(cand(P[i].x, P[i].y, 'node', shape, {vertex: i}));
        if (i < n - 1) {
          out.push(
            cand(
              (P[i].x + P[i + 1].x) / 2,
              (P[i].y + P[i + 1].y) / 2,
              'midpoint',
              shape,
              {segment: i},
            ),
          );
        }
      }
      if (shape.type === 'spline' && shape.closed && n > 2) {
        out.push(
          cand(
            (P[n - 1].x + P[0].x) / 2,
            (P[n - 1].y + P[0].y) / 2,
            'midpoint',
            shape,
          ),
        );
      }
      break;
    }

    case 'circle': {
      const c = P[0];
      const r = shape.radius;
      out.push(cand(c.x, c.y, 'center', shape));
      for (let q = 0; q < 4; q += 1) {
        const p = add(c, fromAngle(q * (Math.PI / 2), r));
        out.push(cand(p.x, p.y, 'quadrant', shape, {quadrant: q}));
      }
      break;
    }

    case 'arc': {
      const ap = arcParams(shape);
      out.push(cand(ap.center.x, ap.center.y, 'center', shape));
      out.push(cand(P[1].x, P[1].y, 'endpoint', shape));
      out.push(cand(P[2].x, P[2].y, 'endpoint', shape));
      const mid = pointOnArc(shape, arcMidAngle(shape));
      out.push(cand(mid.x, mid.y, 'midpoint', shape));
      for (let q = 0; q < 4; q += 1) {
        const p = add(ap.center, fromAngle(q * (Math.PI / 2), ap.r));
        out.push(cand(p.x, p.y, 'quadrant', shape, {quadrant: q}));
      }
      break;
    }

    case 'ellipse': {
      const {center, major, minor, rot} = ellipseParams(shape);
      out.push(cand(center.x, center.y, 'center', shape));
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      for (let q = 0; q < 4; q += 1) {
        const lx = q % 2 === 0 ? major : 0;
        const ly = q % 2 === 0 ? 0 : minor;
        const p = {
          x: center.x + lx * cos - ly * sin,
          y: center.y + lx * sin + ly * cos,
        };
        out.push(cand(p.x, p.y, 'quadrant', shape, {quadrant: q}));
      }
      break;
    }

    case 'point':
      out.push(cand(P[0].x, P[0].y, 'insert', shape));
      break;

    case 'text':
      out.push(cand(P[0].x, P[0].y, 'insert', shape));
      break;

    case 'dimension': {
      for (let i = 0; i < P.length; i += 1)
        out.push(cand(P[i].x, P[i].y, 'node', shape, {vertex: i}));
      break;
    }

    default:
      break;
  }

  return out;
}

/** Foot of the perpendicular dropped from `from` onto each straight run. */
function perpendicularCandidates(shape, from) {
  if (from == null) return [];
  const out = [];
  for (const s of segmentsOf(shape, 1)) {
    const q = closestOnSegment(from, s.a, s.b);
    const d = sub(s.b, s.a);
    const rel = sub(q, from);
    const l2 = d.x * d.x + d.y * d.y;
    if (l2 < 1e-9) continue;
    const t = (rel.x * d.x + rel.y * d.y) / l2;
    // Only a genuine foot counts: AutoCAD's perpendicular snap only fires
    // where the right angle actually lands on the segment, not on its
    // infinite extension.
    if (t < -1e-6 || t > 1 + 1e-6) continue;
    out.push(
      cand(q.x, q.y, 'perpendicular', shape, {from: {x: from.x, y: from.y}}),
    );
  }
  return out;
}

/** Tangent points visible from an external point (circles and arcs only). */
function tangentCandidates(shape, from) {
  if (from == null) return [];
  if (shape.type !== 'circle' && shape.type !== 'arc') return [];
  const ap =
    shape.type === 'circle'
      ? {center: shape.points[0], r: shape.radius}
      : arcParams(shape);
  const d = dist(ap.center, from);
  if (d <= ap.r) return []; // inside: no tangent exists
  const base = angleTo(ap.center, from);
  // In the right triangle C-T-F the right angle is at the tangent point, so
  // cos(angle at C) = r/d and the tangent point lies at base ± acos(r/d).
  const half = Math.acos(Math.max(-1, Math.min(1, ap.r / d)));
  const out = [];
  for (const sign of [1, -1]) {
    const deg = norm360((base + sign * half) * (180 / Math.PI));
    if (shape.type === 'arc') {
      const p = arcParams(shape);
      const within = p.ccw
        ? norm360(deg - p.startDeg) <= p.sweepDeg + 1e-6
        : norm360(p.startDeg - deg) <= p.sweepDeg + 1e-6;
      if (!within) continue;
    }
    const q = add(ap.center, fromAngle(deg * (Math.PI / 180), ap.r));
    out.push(cand(q.x, q.y, 'tangent', shape));
  }
  return out;
}

/** Closest point on the shape's ink. */
function nearestCandidate(shape, p) {
  if (shape.type === 'point' || shape.type === 'text') return null;
  let best = null;
  let bestD = Infinity;
  for (const s of segmentsOf(shape, 1.2)) {
    const q = closestOnSegment(p, s.a, s.b);
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best ? cand(best.x, best.y, 'nearest', shape) : null;
}

/**
 * Intersections between *polyline-ink* shapes only.
 *
 * Circles and arcs are deliberately excluded: they are flattened into chords
 * for rendering, but intersecting those chords puts the snap point up to a
 * full chord-length away from the true crossing. Curves are solved
 * analytically in `curveIntersections` instead.
 */
function intersectionCandidates(nearby, p, pad) {
  const out = [];
  const edges = [];
  for (const s of nearby) {
    if (s.type === 'text' || s.type === 'circle' || s.type === 'arc') continue;
    const segs = segmentsOf(s, 1.2);
    for (const seg of segs) edges.push({seg, shape: s});
  }
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const a = edges[i];
      const b = edges[j];
      if (a.shape.id === b.shape.id) continue;
      // Cheap bbox reject before the exact test.
      if (
        Math.min(a.seg.a.x, a.seg.b.x) > Math.max(b.seg.a.x, b.seg.b.x) + pad ||
        Math.max(a.seg.a.x, a.seg.b.x) < Math.min(b.seg.a.x, b.seg.b.x) - pad ||
        Math.min(a.seg.a.y, a.seg.b.y) > Math.max(b.seg.a.y, b.seg.b.y) + pad ||
        Math.max(a.seg.a.y, a.seg.b.y) < Math.min(b.seg.a.y, b.seg.b.y) - pad
      ) {
        continue;
      }
      const hit = segmentIntersect(
        a.seg.a,
        a.seg.b,
        b.seg.a,
        b.seg.b,
        pad * 0.25,
      );
      if (hit)
        out.push(
          cand(hit.point.x, hit.point.y, 'intersection', a.shape, {
            other: b.shape.id,
          }),
        );
    }
  }
  return out;
}

/** Line/circle hits that a segment-only pass would miss (a full circle has no segments after flattening bounds). */
function curveIntersections(nearby, pad) {
  const out = [];
  for (let i = 0; i < nearby.length; i += 1) {
    for (let j = i + 1; j < nearby.length; j += 1) {
      const a = nearby[i];
      const b = nearby[j];
      if (a.id === b.id) continue;
      const aCurve = a.type === 'circle' || a.type === 'arc';
      const bCurve = b.type === 'circle' || b.type === 'arc';
      if (aCurve && bCurve) {
        const pa =
          a.type === 'circle'
            ? {center: a.points[0], r: a.radius}
            : arcParams(a);
        const pb =
          b.type === 'circle'
            ? {center: b.points[0], r: b.radius}
            : arcParams(b);
        for (const q of circleCircleIntersect(
          pa.center,
          pa.r,
          pb.center,
          pb.r,
        )) {
          if (a.type === 'arc' && !angleInArc(a, q)) continue;
          if (b.type === 'arc' && !angleInArc(b, q)) continue;
          out.push(cand(q.x, q.y, 'intersection', a, {other: b.id}));
        }
      } else if (aCurve !== bCurve) {
        const curve = aCurve ? a : b;
        const line = aCurve ? b : a;
        const pc =
          curve.type === 'circle'
            ? {center: curve.points[0], r: curve.radius}
            : arcParams(curve);
        for (const q of lineCircleIntersect(
          line.points[0],
          line.points[1],
          pc.center,
          pc.r,
        )) {
          if (curve.type === 'arc' && !angleInArc(curve, q)) continue;
          out.push(cand(q.x, q.y, 'intersection', curve, {other: line.id}));
        }
      }
    }
  }
  return out;
}

function angleInArc(arc, p) {
  const a = arcParams(arc);
  const deg = norm360(angleTo(a.center, p) * (180 / Math.PI));
  return a.ccw
    ? norm360(deg - a.startDeg) <= a.sweepDeg + 1e-6
    : norm360(a.startDeg - deg) <= a.sweepDeg + 1e-6;
}

/**
 * Resolve a snap for a world point.
 *
 * @param world     {x, y} raw pointer position in world units
 * @param shapes    the drawing entities (already filtered to visible layers)
 * @param opts.osnap          {kind: bool} — which snap kinds are armed
 * @param opts.radius         pick radius in WORLD units
 * @param opts.from           rubber-band origin, enables perpendicular/tangent
 * @param opts.ignoreIds      Set of shape ids to skip (e.g. the shape being dragged)
 * @returns null, or {x, y, kind, shapeId, guides?, label?}
 */
export function findSnap(world, shapes, opts = {}) {
  const osnap = opts.osnap ?? DEFAULT_OSNAP;
  const radius = opts.radius ?? 8;
  const from = opts.from ?? null;
  const ignore = opts.ignoreIds ?? null;

  // Note we do NOT pre-filter by a shape's "primary" snap kind here. Doing so
  // would drop the whole entity, taking its nearest/perpendicular/intersection
  // snaps with it. Gating happens per candidate instead, below.
  const usable = shapes.filter(
    s => (!ignore || !ignore.has(s.id)) && !s.hidden,
  );
  if (!usable.length) return null;

  const pad = radius;
  const nearby = usable.filter(s => nearBox(s, world, pad + pad));

  const pool = [];
  for (const s of nearby) {
    for (const c of candidatesOf(s, from)) {
      if (osnap[c.kind] === false) continue;
      if (dist(world, c) <= radius) pool.push(c);
    }
    if (osnap.perpendicular) {
      for (const c of perpendicularCandidates(s, from)) {
        if (dist(world, c) <= radius) pool.push(c);
      }
    }
    if (osnap.tangent) {
      for (const c of tangentCandidates(s, from)) {
        if (dist(world, c) <= radius) pool.push(c);
      }
    }
    if (osnap.nearest) {
      const c = nearestCandidate(s, world);
      if (c && dist(world, c) <= radius) pool.push(c);
    }
  }

  if (osnap.intersection && usable.length <= INTERSECTION_CEILING) {
    for (const c of intersectionCandidates(nearby, world, pad)) {
      if (dist(world, c) <= radius) pool.push(c);
    }
    for (const c of curveIntersections(nearby, pad)) {
      if (dist(world, c) <= radius) pool.push(c);
    }
  }

  if (!pool.length) return null;
  return pickBest(pool, world);
}

/** Rank by kind, then by distance. */
function pickBest(pool, world) {
  let best = null;
  let bestRank = Infinity;
  let bestD = Infinity;
  for (const c of pool) {
    const rank = PRIORITY[c.kind] ?? 99;
    const d = dist(world, c);
    if (rank < bestRank || (rank === bestRank && d < bestD)) {
      bestRank = rank;
      bestD = d;
      best = c;
    }
  }
  if (!best) return null;

  const result = {
    x: best.x,
    y: best.y,
    kind: best.kind,
    shapeId: best.shapeId,
    label: SNAP_LABELS[best.kind] || best.kind,
  };

  // Perpendicular gets a right-angle symbol drawn at the foot, which needs
  // the originating point handed to the canvas.
  if (best.kind === 'perpendicular' && best.from)
    result.guides = [{a: best.from, b: best, kind: 'perpendicular'}];
  if (
    best.kind === 'endpoint' ||
    best.kind === 'node' ||
    best.kind === 'quadrant' ||
    best.kind === 'center' ||
    best.kind === 'midpoint'
  ) {
    result.guides = [
      {a: {x: best.x, y: best.y}, b: {x: best.x, y: best.y}, kind: 'none'},
    ];
  }
  return result;
}

/**
 * Convenience: the measurement a snap should report in the dynamic input,
 * e.g. after snapping to an endpoint AutoCAD still shows the length/angle
 * from the rubber-band origin to that endpoint.
 */
export function snapReadout(snap) {
  return snap ? snap.label : null;
}
