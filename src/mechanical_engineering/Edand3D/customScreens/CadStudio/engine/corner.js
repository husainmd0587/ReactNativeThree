/**
 * CAD Studio — FILLET, CHAMFER, TRIM and EXTEND.
 *
 * These four share a problem: they all need to reason about *which* two
 * straight runs meet at a corner, not just "two shapes that are near each
 * other". Everything here therefore starts by decomposing entities into
 * straight runs (`runsOf`) and then works on those.
 *
 *   FILLET   tangent arc of radius r between two runs
 *   CHAMFER  straight bevel of distance d between two runs
 *   TRIM     cut a run back to where it crosses a boundary
 *   EXTEND   push a run out until it reaches a boundary
 */

import {
  closestOnSegment,
  makeArc,
  makeLine,
  makePolyline,
  segmentsOf,
  segmentIntersect,
  shapeBBox,
} from './geometry';
import {add, cross, dist, dot, mul, norm, perp, sub} from './vec';

// ── Run extraction ──────────────────────────────────────────────────────────

/**
 * Decompose an entity into straight runs, each `{a, b, shape, segIndex}`.
 * A plain line is one run; a polyline/spline contributes one run per
 * segment; curved entities contribute the chords of their flattened ink so
 * that a fillet on a "circle" behaves like filleting an arc of it.
 */
export function runsOf(shape, tol = 0.6) {
  if (shape.type === 'line')
    return [{a: shape.points[0], b: shape.points[1], shape, segIndex: 0}];
  if (shape.type === 'polyline' || shape.type === 'spline') {
    const out = [];
    for (let i = 0; i < shape.points.length - 1; i += 1) {
      out.push({
        a: shape.points[i],
        b: shape.points[i + 1],
        shape,
        segIndex: i,
      });
    }
    if (shape.type === 'polyline' && shape.closed && shape.points.length > 2) {
      out.push({
        a: shape.points[shape.points.length - 1],
        b: shape.points[0],
        shape,
        segIndex: shape.points.length - 1,
      });
    }
    return out;
  }
  if (shape.type === 'arc' || shape.type === 'circle') {
    // The two "runs" of a circle are its two open halves, so a fillet
    // against a circle has something to bite on.
    return segmentsOf(shape, tol).map((s, segIndex) => ({
      a: s.a,
      b: s.b,
      shape,
      segIndex,
    }));
  }
  return [];
}

/** The run on `shape` closest to point `p`. */
export function nearestRun(shape, p, tol = 0.6) {
  let best = null;
  let bestD = Infinity;
  for (const r of runsOf(shape, tol)) {
    const q = closestOnSegment(p, r.a, r.b);
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = {...r, foot: q, distance: d};
    }
  }
  return best;
}

// ── Corner frame ────────────────────────────────────────────────────────────

const cloneish = p => ({x: p.x, y: p.y});

/** Intersection of two infinite lines given as point + unit direction. */
function lineLinePoint(p1, d1, p2, d2) {
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const t = cross(sub(p2, p1), d2) / denom;
  return add(p1, mul(d1, t));
}

/**
 * Build the frame every corner operation works in.
 *
 * The corner vertex is the intersection of the two runs' lines — NOT simply
 * `run1.b`. For two polylines sharing a vertex those agree, but for two
 * independent entities they don't, and using run1.b would place the fillet
 * in empty space.
 *
 * `u1`/`u2` point *away from the corner and into* each run, which is what
 * makes a single formula serve both convex and reflex corners: the tangent
 * length is always positive along those directions.
 */
export function cornerFrame(run1, run2) {
  const d1 = norm(sub(run1.b, run1.a));
  const d2 = norm(sub(run2.b, run2.a));
  if (!isFinite(d1.x) || !isFinite(d2.x)) return null;
  if (Math.hypot(d1.x, d1.y) < 1e-9 || Math.hypot(d2.x, d2.y) < 1e-9)
    return null;

  const corner = lineLinePoint(run1.a, d1, run2.a, d2) ?? mid(run1.b, run2.b);
  if (!corner) return null;

  // Outward = from the corner toward the middle of each run.
  let u1 = norm(sub(mid(run1.a, run1.b), corner));
  let u2 = norm(sub(mid(run2.a, run2.b), corner));
  if (!isFinite(u1.x) || Math.hypot(u1.x, u1.y) < 1e-9) u1 = d1;
  if (!isFinite(u2.x) || Math.hypot(u2.x, u2.y) < 1e-9) u2 = d2;

  // The working angle is always the smaller one between the outward
  // directions; a reflex 270° corner reduces to its 90° complement.
  const cos = Math.max(-1, Math.min(1, dot(u1, u2)));
  const theta = Math.acos(cos);
  if (theta < 1e-4) return null; // collinear: nothing to round off

  return {corner, u1, u2, theta, bisector: norm(add(u1, u2))};
}

const mid = (a, b) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});

/** Is `p` actually on the segment, within `tol`? */
function onRun(run, p, tol = 1e-6) {
  const q = closestOnSegment(p, run.a, run.b);
  return dist(p, q) <= tol;
}

/** Rewrite a run's endpoint nearest to `p` to be `p`. */
function editFor(run, p) {
  const dA = dist(p, run.a);
  const dB = dist(p, run.b);
  return dB <= dA
    ? {shape: run.shape, segIndex: run.segIndex, newA: run.a, newB: cloneish(p)}
    : {
        shape: run.shape,
        segIndex: run.segIndex,
        newA: cloneish(p),
        newB: run.b,
      };
}

// ── Fillet ──────────────────────────────────────────────────────────────────

/**
 * Tangent arc of radius `r` rounding the corner between two runs.
 *
 * The arc is tangent to both runs, so it meets them exactly where the maths
 * puts it — no visible kink, which is the whole point of a fillet.
 *
 * @returns {arc, edits}, or null when the corner is degenerate, the two runs
 *          are collinear, or r is too large for the fillet to fit on both
 *          runs (AutoCAD reports "Radius too large" for that case).
 */
export function filletCorner(run1, run2, r) {
  if (!(r > 0)) return null;

  const frame = cornerFrame(run1, run2);
  if (!frame) return null;
  const {corner, u1, u2, theta, bisector} = frame;

  const half = theta / 2;
  const t = r / Math.tan(half); // tangent length; equals r at 90°
  if (!Number.isFinite(t) || t <= 1e-9) return null;

  // Two candidate centres sit on the bisector; only the one whose tangent
  // points fall on the actual runs is real.
  const dCentre = r / Math.sin(half);
  const centre = add(corner, mul(bisector, dCentre));
  const p1 = add(corner, mul(u1, t));
  const p2 = add(corner, mul(u2, t));

  if (!onRun(run1, p1, 1e-6) || !onRun(run2, p2, 1e-6)) return null;

  // Travel p1 → p2; the cross product of the radii gives the turn direction
  // directly, with no angle-wrapping guesswork.
  const ccw = cross(sub(p1, centre), sub(p2, centre)) > 0;
  const arc = makeArc(centre, p1, p2, ccw, {filletRadius: r});

  return {arc, edits: [editFor(run1, p1), editFor(run2, p2)]};
}

// ── Chamfer ─────────────────────────────────────────────────────────────────

/**
 * Straight bevel: `d1` measured back along run1, `d2` along run2 (AutoCAD's
 * two-distance chamfer; equal when only one distance is given).
 *
 * The bevel endpoints are fixed by those two distances, so unlike a fillet
 * there is no circle to solve for — but the same corner frame is needed to
 * know which way "back along the run" points.
 */
export function chamferCorner(run1, run2, d1, d2 = null) {
  const k1 = d1;
  const k2 = d2 == null ? d1 : d2;
  if (!(k1 > 0) || !(k2 > 0)) return null;

  const frame = cornerFrame(run1, run2);
  if (!frame) return null;
  const {corner, u1, u2} = frame;

  // u1/u2 point *away from the corner and into* each run, so the cut lands
  // `k` units along the run — not off its far end, which is what negating
  // them here would do.
  const p1 = add(corner, mul(u1, k1));
  const p2 = add(corner, mul(u2, k2));

  if (!onRun(run1, p1, 1e-6) || !onRun(run2, p2, 1e-6)) return null;

  const bevel = makeLine(p1, p2);
  return {line: bevel, edits: [editFor(run1, p1), editFor(run2, p2)]};
}

// ── Trim ────────────────────────────────────────────────────────────────────

/**
 * TRIM a run back to where it crosses a boundary.
 *
 * AutoCAD's rule: tapping a piece of line removes *that piece*, leaving the
 * rest. So the side that survives is decided by which side of the crossing
 * the tap point falls on — not by comparing endpoint distances, which is
 * ambiguous whenever the crossing sits near the middle of the run.
 *
 * @returns {point, newA, newB, removed} or null when they never cross
 */
export function trimRun(targetRun, boundaryRun, tapPoint, tol = 1e-6) {
  const hits = crossings(targetRun, boundaryRun, tol);
  if (!hits.length) return null;

  // Walk the run from a to b, and take the first crossing that lies beyond
  // the tap. That is the far edge of the piece the user actually touched.
  const dir = norm(sub(targetRun.b, targetRun.a));
  const len = dist(targetRun.a, targetRun.b);
  if (len < 1e-9) return null;

  const tTap = dot(sub(tapPoint, targetRun.a), dir);
  let chosen = null;
  for (const h of hits) {
    const t = dot(sub(h, targetRun.a), dir);
    if (t < tTap - 1e-9) continue; // the tap is on the far side of this cut
    if (chosen === null || t < chosen.t) chosen = {point: h, t};
  }
  // Nothing beyond the tap: the piece under the finger runs back toward a, so
  // the last crossing before the tap is its far edge.
  if (chosen === null) {
    let bestT = -Infinity;
    for (const h of hits) {
      const t = dot(sub(h, targetRun.a), dir);
      if (t <= tTap + 1e-9 && t > bestT) bestT = t;
    }
    if (!Number.isFinite(bestT)) return null;
    chosen = {point: hits[0], t: bestT};
  }

  const {point, t} = chosen;
  // The doomed piece is the span between the tap and the crossing. Whichever
  // end of the run it is nearer to is the end that gets cut off.
  const removeA = (tTap + t) / 2 < len / 2;

  // Returned in the same `{shape, segIndex, newA, newB}` form as the other
  // corner operations, so the caller can pass it straight to applyRunEdits.
  return {
    shape: targetRun.shape,
    segIndex: targetRun.segIndex,
    point,
    newA: removeA ? point : targetRun.a,
    newB: removeA ? targetRun.b : point,
    removed: removeA ? 'a' : 'b',
  };
}

/** Every crossing point between two straight runs. */
export function crossings(runA, runB, tol = 1e-6) {
  const hit = segmentIntersect(runA.a, runA.b, runB.a, runB.b, tol);
  return hit ? [hit.point] : [];
}

/** Crossings between a run and every run of a whole entity. */
export function crossingsWithShape(targetRun, boundaryShape, tol = 1e-6) {
  const out = [];
  for (const r of runsOf(boundaryShape, tol)) {
    const hit = segmentIntersect(targetRun.a, targetRun.b, r.a, r.b, tol);
    if (hit) out.push({point: hit.point, boundary: r});
  }
  return out;
}

// ── Extend ──────────────────────────────────────────────────────────────────

/**
 * Push `targetRun` out from the end nearest `tapPoint` until it meets
 * `boundaryShape`. Returns the new endpoint, or null when nothing is hit.
 */
export function extendRun(targetRun, boundaryShape, tapPoint, tol = 1e-6) {
  // Which end is being extended? The one nearer the tap.
  const extendB = dist(targetRun.b, tapPoint) <= dist(targetRun.a, tapPoint);
  const anchor = extendB ? targetRun.a : targetRun.b;
  const dir = extendB
    ? norm(sub(targetRun.b, targetRun.a))
    : norm(sub(targetRun.a, targetRun.b));

  // A ray from the anchor along dir; find the first boundary crossing
  // strictly beyond the current end.
  const far = add(anchor, mul(dir, 1e7));
  let bestT = Infinity;
  for (const r of runsOf(boundaryShape, tol)) {
    const hit = segmentIntersect(anchor, far, r.a, r.b, tol);
    if (!hit) continue;
    const t = dot(sub(hit.point, anchor), dir);
    if (t <= 0.5) continue; // behind us, or already at the end
    if (t < bestT) bestT = t;
  }
  if (!Number.isFinite(bestT)) return null;

  const newPoint = add(anchor, mul(dir, bestT));
  return {
    newA: extendB ? anchor : newPoint,
    newB: extendB ? newPoint : anchor,
  };
}

// ── Applying run edits back onto shapes ─────────────────────────────────────

/**
 * Apply a set of `{shape, segIndex, newA, newB}` edits produced by fillet /
 * chamfer / trim / extend, producing the next shapes array.
 *
 * Edits to the same polyline are merged into one rewritten polyline so a
 * fillet at a corner doesn't duplicate the entity.
 */
export function applyRunEdits(shapes, edits, additions = []) {
  // Group edits by shape id.
  const byShape = new Map();
  for (const e of edits) {
    const id = e.shape.id;
    if (!byShape.has(id)) byShape.set(id, []);
    byShape.get(id).push(e);
  }

  const out = [];
  for (const s of shapes) {
    const group = byShape.get(s.id);
    if (!group) {
      out.push(s);
      continue;
    }
    byShape.delete(s.id);

    if (s.type === 'polyline' || s.type === 'spline') {
      out.push(rewritePolyline(s, group));
    } else {
      // Plain line / arc / circle: a single edit replaces both endpoints.
      const e = group[0];
      out.push({
        ...s,
        points: [
          {x: e.newA.x, y: e.newA.y},
          {x: e.newB.x, y: e.newB.y},
        ],
      });
    }
  }

  return [...out, ...additions];
}

/**
 * Rebuild a polyline/spline from per-segment edits.
 *
 * The key subtlety is that a corner operation does not *move* the shared
 * vertex between two segments — it *splits* it. Filleting the corner of
 * [(0,0),(50,0),(50,50)] has to produce four vertices, not three, with the
 * two cut points either side of the arc. An implementation that tries to
 * overwrite the shared vertex will accept the first edit and silently drop
 * the second, because by then the vertex no longer matches the original.
 *
 * So we resolve each segment's endpoints first, then rebuild the vertex list
 * and insert an extra vertex wherever consecutive segments disagree.
 */
function rewritePolyline(shape, group) {
  const n = shape.points.length;
  const segCount = shape.closed ? n : n - 1;

  // Resolved endpoints per segment, defaulting to the original vertices.
  const segs = [];
  for (let i = 0; i < segCount; i += 1) {
    segs.push({
      a: {x: shape.points[i].x, y: shape.points[i].y},
      b: (() => {
        const j = (i + 1) % n;
        return {x: shape.points[j].x, y: shape.points[j].y};
      })(),
    });
  }
  for (const e of group) {
    const i = e.segIndex;
    if (i < 0 || i >= segCount) continue;
    segs[i].a = {x: e.newA.x, y: e.newA.y};
    segs[i].b = {x: e.newB.x, y: e.newB.y};
  }

  if (!segCount)
    return {...shape, points: shape.points.map(p => ({x: p.x, y: p.y}))};

  const pts = [];
  const push = p => {
    const last = pts[pts.length - 1];
    if (last && sameish(last, p)) return; // collapse duplicates
    pts.push({x: p.x, y: p.y});
  };

  push(segs[0].a);
  for (let i = 0; i < segCount; i += 1) {
    push(segs[i].b);
    // Where this segment ends and the next begins should be one shared
    // vertex. When a corner edit has moved them apart, the next segment's
    // own start becomes an additional vertex, so the corner is split into
    // the two points the arc is tangent at. Order matters: this segment's
    // end comes first, then the next segment's start.
    if (i + 1 < segCount && !sameish(segs[i].b, segs[i + 1].a))
      push(segs[i + 1].a);
  }

  return {...shape, points: pts};
}

function sameish(a, b) {
  return Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4;
}

// ── Closed-polyline corner detection (used by multi-segment fillet) ─────────

/**
 * Find the corner vertex of a polyline nearest `p` where two segments meet
 * at a real angle (not a collinear continuation). Returns the vertex index
 * and the two adjacent runs.
 */
export function findCornerVertex(shape, p) {
  if (shape.type !== 'polyline' || shape.points.length < 3) return null;
  const pts = shape.points;
  const runs = runsOf(shape);
  let best = null;

  for (let i = 0; i < pts.length; i += 1) {
    const prevIdx = (i - 1 + pts.length) % pts.length;
    const nextIdx = (i + 1) % pts.length;
    // Only closed polylines have true interior corners.
    if (!shape.closed) break;
    const a = pts[prevIdx];
    const b = pts[i];
    const c = pts[nextIdx];
    const ang = Math.acos(
      Math.max(-1, Math.min(1, dot(norm(sub(a, b)), norm(sub(c, b))))),
    );
    if (ang > Math.PI - 1e-3) continue; // collinear, not a corner
    const d = dist(p, b);
    if (!best || d < best.distance) {
      // The two runs meeting at vertex i: run ending at i, and run starting at i.
      const inRun = runs.find(
        r => r.segIndex === (i - 1 + runs.length) % runs.length,
      );
      const outRun = runs.find(r => r.segIndex === i);
      if (inRun && outRun) best = {vertexIndex: i, inRun, outRun, distance: d};
    }
  }
  return best;
}

export {makePolyline, shapeBBox};
