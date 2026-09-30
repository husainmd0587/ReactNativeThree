/**
 * CAD Studio — modify operations.
 *
 * All of these take the normalized shape model and return *new shapes* (or
 * a patch to apply), never mutate in place. The drawing reducer applies
 * whatever comes back, which is what makes undo a single "swap the shapes
 * array" operation rather than a per-command inverse.
 */

import {
  closestOnSegment,
  closestPair,
  makeArc,
  makeCircle,
  makeLine,
  makePolyline,
  mirrorShape,
  offsetPolyline,
  offsetSegment,
  ringOf,
  rotateShape,
  scaleShape,
  segmentsOf,
  transformShape,
  translateShape,
} from './geometry';
import {add, angleTo, cross, dist, dot, mul, norm, perp, sub} from './vec';

// ── Translation / duplication ───────────────────────────────────────────────

export const translate = (shape, delta) => translateShape(shape, delta);

export const translateMany = (shapes, delta) =>
  shapes.map(s => translateShape(s, delta));

/** Duplicate a set of shapes with fresh ids, offset from the originals. */
export function copyShapes(shapes, delta) {
  return shapes.map(s => {
    const moved = translateShape(s, delta);
    return {...moved, id: undefined, layerId: s.layerId};
  });
}

// ── Rotation ────────────────────────────────────────────────────────────────

export const rotate = (shape, origin, rad) => rotateShape(shape, origin, rad);
export const rotateMany = (shapes, origin, rad) =>
  shapes.map(s => rotateShape(s, origin, rad));

/** Rotate by degrees, the unit the command line speaks. */
export const rotateDeg = (shape, origin, deg) =>
  rotate(shape, origin, (deg * Math.PI) / 180);

/** Rotate copies `count` times about `center`, first copy at `startDeg`. */
export function polarCopies(shape, center, startRad, stepRad, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(rotateShape(shape, center, startRad + stepRad * i));
  }
  return out;
}

// ── Scaling ─────────────────────────────────────────────────────────────────

export const scale = (shape, origin, factor) =>
  scaleShape(shape, origin, factor);

/** Scale about a base point, keeping the base point fixed. */
export const scaleAbout = (shapes, base, factor) =>
  shapes.map(s => scaleShape(s, base, factor));

// ── Mirroring ───────────────────────────────────────────────────────────────

export const mirror = (shape, a, b) => mirrorShape(shape, a, b);

/**
 * MIRROR's second mode: erase the source objects (AutoCAD's "No" answer to
 * "Delete source objects?"). The command layer decides whether to keep the
 * originals; this just returns the reflected set.
 */
export function mirrorWithDelete(shapes, a, b) {
  return shapes.map(s => mirrorShape(s, a, b));
}

// ── Offset ──────────────────────────────────────────────────────────────────

/**
 * OFFSET a shape by `d` (positive = to the left of travel direction, the
 * AutoCAD convention for a left-to-right polyline). Returns new shapes, or
 * [] when the entity type can't be offset.
 */
export function offsetShape(shape, d) {
  switch (shape.type) {
    case 'line': {
      const {a, b} = offsetSegment(shape.points[0], shape.points[1], d);
      return [makeLine(a, b)];
    }

    case 'polyline': {
      const out = [];
      if (shape.closed) {
        // Offsetting a closed ring: push every edge out and re-intersect.
        const ring = ringOf(shape, 0.6);
        const off = offsetPolyline([...ring, ring[0]], d);
        // Drop the duplicate closing point produced by the sweep.
        out.push(makePolyline(off.slice(0, -1), true));
      } else {
        out.push(makePolyline(offsetPolyline(shape.points, d), false));
      }
      return out;
    }

    case 'circle':
      return [makeCircle(shape.points[0], Math.max(0.01, shape.radius + d))];

    case 'arc': {
      const c = shape.points[0];
      const r = dist(c, shape.points[1]) + d;
      if (r <= 0.01) return [];
      const p0 = norm(sub(shape.points[1], c));
      const p1 = norm(sub(shape.points[2], c));
      return [
        makeArc(c, add(c, mul(p0, r)), add(c, mul(p1, r)), shape.ccw !== false),
      ];
    }

    case 'ellipse': {
      // A true ellipse offset is another ellipse only for the parallel case,
      // which never holds — so approximate by scaling about the centre.
      const e = offsetEllipseByScale(shape, d);
      return e ? [e] : [];
    }

    case 'spline':
      // Offsetting a spline: offset each of its sampled chords, then rebuild.
      return offsetSpline(shape, d);

    default:
      return [];
  }
}

function offsetEllipseByScale(shape, d) {
  const c = shape.points[0];
  const majorEnd = shape.points[1];
  const minorEnd = shape.points[2];
  const R = dist(c, majorEnd);
  if (R < 1e-6) return null;
  const factor = (R + d) / R;
  if (factor <= 0) return null;
  const rot = angleTo(c, majorEnd);
  const newR = R + d;
  const minorR = dist(c, minorEnd) * factor;
  return {
    ...shape,
    points: [
      c,
      add(c, fromAngle(rot, newR)),
      add(c, fromAngle(rot + Math.PI / 2, minorR)),
    ],
  };
}

function offsetSpline(shape, d) {
  const segs = segmentsOf(shape, 0.5);
  if (!segs.length) return [];
  const moved = segs.map(s => offsetSegment(s.a, s.b, d));
  // Re-fit a smooth curve through the offset chord midpoints.
  const pts = moved.map(s => ({
    x: (s.a.x + s.b.x) / 2,
    y: (s.a.y + s.b.y) / 2,
  }));
  if (pts.length < 2) return [];
  return [{...shape, points: pts}];
}

// ── Arrays ──────────────────────────────────────────────────────────────────

/**
 * RECTANGULAR array: `rows` x `cols` copies with the given cell spacing.
 * Total copies = rows*cols. Returns new shapes.
 */
export function rectangularArray(shape, cellX, cellY, rows, cols) {
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r === 0 && c === 0) continue; // original occupies (0,0)
      const moved = translateShape(shape, {x: cellX * c, y: cellY * r});
      out.push(moved);
    }
  }
  return out;
}

/**
 * POLAR array: `count` copies evenly distributed about `center`, with the
 * given included angle between neighbours (360/count if omitted).
 */
export function polarArray(shape, center, count, includedDeg = null) {
  const step =
    ((includedDeg == null ? 360 / count : includedDeg) * Math.PI) / 180;
  const out = [];
  for (let i = 1; i < count; i += 1)
    out.push(rotateShape(shape, center, step * i));
  return out;
}

// ── Join / explode / break ──────────────────────────────────────────────────

/**
 * JOIN collinear, touching, same-type entities end to end. Tolerant: it
 * merges any run of collinear segments that overlap or abut.
 *
 * Works in the segment's own 1D frame — project every point onto the run's
 * direction, take the union of the intervals — which handles overlaps,
 * abuts and reversed order without any special cases.
 *
 * @returns null when nothing merged, else {removed: id[], created: shape[]}
 */
export function joinCollinear(shapes, tol = 0.6) {
  const lines = shapes.filter(s => s.type === 'line');
  if (lines.length < 2) return null;

  const merged = [];
  const consumed = new Set();
  // `absorbed` is the set that actually merged into a neighbour. `consumed`
  // also contains every seed, so it cannot be used to answer "did anything
  // merge?" — that was the bug that made two parallel-but-separate lines
  // report a successful join.
  const absorbed = new Set();

  for (const seed of lines) {
    if (consumed.has(seed.id)) continue;

    let origin = seed.points[0];
    let dir = norm(sub(seed.points[1], origin));
    let lo = 0;
    let hi = dist(seed.points[0], seed.points[1]);
    consumed.add(seed.id);

    // Absorb every collinear segment whose interval touches or overlaps the
    // run. Repeat until stable, because merging one segment can bring the
    // run within range of another.
    let grew = true;
    while (grew) {
      grew = false;
      for (const other of lines) {
        if (consumed.has(other.id)) continue;
        const n = perp(dir);
        const la = other.points[0];
        const lb = other.points[1];
        // Must lie on the same infinite line, within tolerance.
        if (
          Math.abs(dot(sub(la, origin), n)) > tol ||
          Math.abs(dot(sub(lb, origin), n)) > tol
        )
          continue;

        const tA = dot(sub(la, origin), dir);
        const tB = dot(sub(lb, origin), dir);
        const tLo = Math.min(tA, tB);
        const tHi = Math.max(tA, tB);
        // The two intervals [lo,hi] and [tLo,tHi] must actually meet. Note
        // this compares the intervals' own nearest edges — comparing against
        // the union minimum would always pass, since the union min is by
        // definition ≤ hi, and would fuse lines separated by a real gap.
        if (tLo > hi + tol) continue;
        if (tHi < lo - tol) continue;

        lo = Math.min(lo, tLo);
        hi = Math.max(hi, tHi);
        consumed.add(other.id);
        absorbed.add(other.id);
        grew = true;
      }
    }

    if (hi - lo > tol) {
      // Canonical direction (a.x <= b.x) so a join produces the same entity
      // regardless of which way the source segments happened to be drawn.
      const p0 = add(origin, mul(dir, lo));
      const p1 = add(origin, mul(dir, hi));
      merged.push(p0.x <= p1.x ? makeLine(p0, p1) : makeLine(p1, p0));
    }
  }

  // Nothing actually fused: leave the caller's entities alone.
  if (!absorbed.size) return null;

  // Segments that were never touched still have to survive.
  for (const line of lines) {
    if (!consumed.has(line.id)) merged.push(line);
  }
  return {removed: [...consumed], created: merged};
}

/** EXPLODE a compound shape into its parts. Circles/arcs/text don't explode. */
export function explodeShape(shape) {
  switch (shape.type) {
    case 'polyline': {
      const out = [];
      const p = shape.points;
      for (let i = 0; i < p.length - 1; i += 1)
        out.push(makeLine(p[i], p[i + 1]));
      if (shape.closed && p.length > 2)
        out.push(makeLine(p[p.length - 1], p[0]));
      return out;
    }
    case 'spline': {
      const segs = segmentsOf(shape, 0.5);
      if (!segs.length) return [shape];
      const out = [];
      for (let i = 0; i < segs.length - 1; i += 1)
        out.push(makeLine(segs[i].a, segs[i + 1].a));
      out.push(makeLine(segs[segs.length - 1].a, segs[segs.length - 1].b));
      return out;
    }
    default:
      return [shape];
  }
}

/**
 * BREAK a line at a point: two shorter lines replacing one.
 * Returns [lineA, lineB] or null if the point isn't on the line.
 */
export function breakLine(shape, at, tol = 1e-6) {
  if (shape.type !== 'line') return null;
  const a = shape.points[0];
  const b = shape.points[1];
  const q = closestOnSegment(at, a, b);
  if (dist(q, at) > 1 + tol) return null;
  if (dist(q, a) < 1e-6 || dist(q, b) < 1e-6) return null; // at an endpoint: nothing to break
  return [makeLine(a, q), makeLine(q, b)];
}

// ── Alignment helpers (used by grips and the property bar) ──────────────────

/** Move a single grip on a shape to a new position. */
export {moveGrip} from './geometry';

/** Closest points between two shapes' ink — used to chain lines. */
export function closestBetween(a, b) {
  const sa = segmentsOf(a, 1);
  const sb = segmentsOf(b, 1);
  let best = null;
  let bestD = Infinity;
  for (const x of sa) {
    for (const y of sb) {
      const [qa, qb] = closestPair(x.a, x.b, y.a, y.b);
      const d = dist(qa, qb);
      if (d < bestD) {
        bestD = d;
        best = [qa, qb];
      }
    }
  }
  return best ? {points: best, distance: bestD} : null;
}

export {transformShape};
