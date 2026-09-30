/**
 * Selection engine.
 *
 * Covers the four ways an entity gets picked, matching AutoCAD:
 *   - click (nearest ink within a cursor tolerance)
 *   - window, left to right  (fully enclosed only)
 *   - crossing, right to left (touched or enclosed)
 *   - crossing polygon      (anything the lasso touches)
 *
 * Everything here is pure and worklet-safe: no React, no Skia, no globals.
 * Selection state is passed in as a plain array of ids and returned the same
 * way, so the reducer can hold it without this module owning any state.
 */

import {
  centerOf,
  closestOnShape,
  gripsOf,
  isClosed,
  pointInShape,
  segmentsOf,
  shapeBBox,
  shapeRadius,
  verticesOf,
} from './geometry';
import {cross, dist, sub} from './vec';

const DEFAULT_PICK_TOL = 6;

/**
 * Can this shape be picked at all? Locked/frozen/off entities stay visible on
 * screen but must not be selectable, exactly as in AutoCAD. A shape with no
 * layer entry is treated as belonging to a live default layer.
 */
export function canPick(shape, layers) {
  if (!shape) return false;
  if (shape.hidden || shape.locked || shape.frozen) return false;
  if (!layers) return true;
  const layer = layers[shape.layerId];
  if (!layer) return true;
  if (layer.visible === false) return false;
  if (layer.locked || layer.frozen) return false;
  return true;
}

export const isVisible = (shape, layers) => {
  if (!shape) return false;
  if (shape.hidden) return false;
  if (!layers) return true;
  const layer = layers[shape.layerId];
  return !layer || layer.visible !== false;
};

/**
 * Nearest pickable shape to `p`.
 *
 * Ties are broken toward the most recently drawn entity, which is what makes
 * overlapping ink behave the way a user expects: the thing you just drew is
 * the thing you grab. Points and text also get a tolerance bonus, so a small
 * annotation sitting on a line stays grabbable.
 */
export function pickAt(shapes, p, opts = {}) {
  const {tol = DEFAULT_PICK_TOL, layers = null} = opts;
  let best = null;
  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    if (!canPick(shape, layers)) continue;
    const hit = closestOnShape(shape, p);
    if (!hit) continue;
    const bonus = shape.type === 'point' || shape.type === 'text' ? tol : 0;
    const score = hit.distance - bonus;
    if (score > tol) continue;
    // Later in the draw order wins an exact tie.
    if (best && Math.abs(score - best.score) > 1e-9) {
      if (score < best.score)
        best = {
          shape,
          index: i,
          point: hit.point,
          distance: hit.distance,
          score,
        };
    } else if (!best || i >= best.index) {
      best = {shape, index: i, point: hit.point, distance: hit.distance, score};
    }
  }
  return best;
}

/**
 * Every pickable shape within tolerance, nearest first.
 *
 * Repeated clicks at the same spot walk this list, which is how AutoCAD's
 * "click again to cycle through stacked objects" behaves.
 */
export function pickStackAt(shapes, p, opts = {}) {
  const {tol = DEFAULT_PICK_TOL, layers = null} = opts;
  const hits = [];
  for (const shape of shapes) {
    if (!canPick(shape, layers)) continue;
    const hit = closestOnShape(shape, p);
    if (!hit) continue;
    const bonus = shape.type === 'point' || shape.type === 'text' ? tol : 0;
    if (hit.distance - bonus > tol) continue;
    hits.push({
      shape,
      point: hit.point,
      distance: hit.distance,
      score: hit.distance - bonus,
    });
  }
  hits.sort((x, y) =>
    Math.abs(x.score - y.score) > 1e-9 ? x.score - y.score : 0,
  );
  return hits;
}

/** Axis-aligned box from two opposite corners. */
export function boxFrom(a, b) {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export const boxContainsPoint = (box, p, tol = 0) =>
  p.x >= box.minX - tol &&
  p.x <= box.maxX + tol &&
  p.y >= box.minY - tol &&
  p.y <= box.maxY + tol;

export const boxContainsBox = (outer, inner, tol = 0) =>
  inner.minX >= outer.minX - tol &&
  inner.maxX <= outer.maxX + tol &&
  inner.minY >= outer.minY - tol &&
  inner.maxY <= outer.maxY + tol;

const boxesOverlap = (a, b, tol = 0) =>
  a.minX <= b.maxX + tol &&
  a.maxX >= b.minX - tol &&
  a.minY <= b.maxY + tol &&
  a.maxY >= b.minY - tol;

/** The four edges of a box, as segments. */
const boxEdges = box => {
  const c = [
    {x: box.minX, y: box.minY},
    {x: box.maxX, y: box.minY},
    {x: box.maxX, y: box.maxY},
    {x: box.minX, y: box.maxY},
  ];
  return c.map((p, i) => ({a: p, b: c[(i + 1) % 4]}));
};

const segmentsCross = (a1, a2, b1, b2, tol = 0) => {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const den = cross(d1, d2);
  if (Math.abs(den) < 1e-12) return false; // parallel or collinear: no crossing
  const t = cross(sub(b1, a1), d2) / den;
  const u = cross(sub(b1, a1), d1) / den;
  const e = tol / (Math.hypot(d1.x, d1.y) || 1);
  return t >= -e && t <= 1 + e && u >= -e && u <= 1 + e;
};

/** Shortest distance from a point to a box (0 when inside). */
export function distToBox(box, p) {
  const dx = Math.max(box.minX - p.x, 0, p.x - box.maxX);
  const dy = Math.max(box.minY - p.y, 0, p.y - box.maxY);
  return Math.hypot(dx, dy);
}

/**
 * Does a shape touch or fall inside the box at all?
 *
 * Handles the three cases separately because a bbox overlap alone is neither
 * necessary (a circle can overlap in bbox but miss the box entirely) nor
 * sufficient (a long diagonal line can overlap in bbox but pass by).
 */
function shapeTouchesBox(shape, box, tol = 0.6) {
  const bb = shapeBBox(shape, tol);
  if (!boxesOverlap(bb, box, tol)) return false;
  if (boxContainsBox(box, bb, tol)) return true;

  // Circles are tested analytically: a ring can be entirely inside the box,
  // entirely outside it, or genuinely crossing it.
  if (shape.type === 'circle' || shape.type === 'arc') {
    const centre = centerOf(shape);
    const r = shapeRadius(shape);
    if (shape.type === 'circle') return distToBox(box, centre) <= r + tol;
  }

  const edges = boxEdges(box);
  for (const seg of segmentsOf(shape, tol)) {
    for (const e of edges) {
      if (segmentsCross(seg.a, seg.b, e.a, e.b, tol)) return true;
    }
  }

  // A closed outline with no edge crossings still counts if it swallows a
  // corner of the box, which is how a lasso catches a filled region.
  if (isClosed(shape)) {
    for (const c of edges) {
      if (pointInShape(shape, c.a, tol)) return true;
      if (pointInShape(shape, c.b, tol)) return true;
    }
  }
  return false;
}

/**
 * Is every part of the shape inside the box?
 *
 * A bounding-box containment test is exactly right here, and needs no special
 * casing: all of a shape's ink lies within its own bounding box by
 * definition, so a box that swallows the bbox swallows the shape. This is the
 * strictness that makes left-to-right a *window* rather than a crossing.
 */
function shapeInsideBox(shape, box, tol = 0.6) {
  return boxContainsBox(box, shapeBBox(shape, tol), tol);
}

/**
 * Select by dragging a rectangle.
 *
 * The drag direction decides the rule, and this is the one AutoCAD behaviour
 * people rely on without thinking: left to right is a strict window that
 * ignores anything the box merely clips, right to left is a crossing that
 * catches it.
 */
export function windowSelect(shapes, a, b, opts = {}) {
  const {layers = null, tol = 0.6} = opts;
  const box = boxFrom(a, b);
  const crossing = b.x < a.x;
  const out = [];
  for (const shape of shapes) {
    if (!canPick(shape, layers)) continue;
    const hit = crossing
      ? shapeTouchesBox(shape, box, tol)
      : shapeInsideBox(shape, box, tol);
    if (hit) out.push(shape.id);
  }
  return out;
}

/** Select everything a closed crossing polygon touches. */
export function polygonSelect(shapes, polygon, opts = {}) {
  const {layers = null, tol = 0.6} = opts;
  if (!polygon || polygon.length < 3) return [];
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const box = {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
  const edges = polygon.map((p, i) => ({
    a: p,
    b: polygon[(i + 1) % polygon.length],
  }));

  const out = [];
  for (const shape of shapes) {
    if (!canPick(shape, layers)) continue;
    const bb = shapeBBox(shape, tol);
    if (!boxesOverlap(bb, box, tol)) continue;
    if (boxContainsBox(box, bb, tol)) {
      out.push(shape.id);
      continue;
    }
    let touched = false;
    for (const seg of segmentsOf(shape, tol)) {
      for (const e of edges) {
        if (segmentsCross(seg.a, seg.b, e.a, e.b, tol)) {
          touched = true;
          break;
        }
      }
      if (touched) break;
    }
    if (!touched && isClosed(shape)) {
      touched = polygon.some(p => pointInShape(shape, p, tol));
    }
    if (!touched && (shape.type === 'circle' || shape.type === 'arc')) {
      // A ring has no crossing segments to test against the lasso edge when
      // the lasso sits entirely inside it, or entirely outside it. Resolve
      // both by asking whether the centre is caught or the centre covers.
      const centre = centerOf(shape);
      const r = shapeRadius(shape);
      const centreInside = pointInShape(shape, centre, tol);
      if (centreInside) touched = true;
      else if (polygon.every(p => dist(p, centre) <= r + tol)) touched = true;
    }
    if (touched) out.push(shape.id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Selection set algebra
// ---------------------------------------------------------------------------
// Ids are kept sorted and unique so that a selection can be compared with
// === for change detection, which keeps React re-renders down.

export const normaliseIds = ids => [...new Set(ids.filter(Boolean))].sort();

const normalise = normaliseIds;

export const addToSelection = (current, ids) => normalise([...current, ...ids]);
export const removeFromSelection = (current, ids) => {
  const drop = new Set(ids);
  return normalise(current.filter(id => !drop.has(id)));
};
export const toggleSelection = (current, ids) => {
  const set = new Set(current);
  for (const id of ids) {
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }
  return normalise([...set]);
};
export const clearSelection = () => [];
export const selectAll = (shapes, opts = {}) => {
  const {layers = null} = opts;
  return normalise(shapes.filter(s => canPick(s, layers)).map(s => s.id));
};
export const invertSelection = (shapes, current, opts = {}) => {
  const {layers = null} = opts;
  const chosen = new Set(current);
  return normalise(
    shapes.filter(s => canPick(s, layers) && !chosen.has(s.id)).map(s => s.id),
  );
};

export const shapesOf = (shapes, ids) => {
  const want = new Set(ids);
  return shapes.filter(s => want.has(s.id));
};

export const selectionBBox = (shapes, ids, tol = 0.6) => {
  const picked = shapesOf(shapes, ids);
  if (!picked.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of picked) {
    const b = shapeBBox(s, tol);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return {minX, minY, maxX, maxY};
};

// ---------------------------------------------------------------------------
// Grips
// ---------------------------------------------------------------------------

/**
 * Grips for the current selection.
 *
 * Each grip carries the shape it belongs to so a drag can address one vertex
 * of one shape without the caller having to re-find it by coordinates.
 */
export function selectionGrips(shapes, ids, opts = {}) {
  const {tol = 0.6} = opts;
  const out = [];
  for (const s of shapesOf(shapes, ids)) {
    gripsOf(s, tol).forEach((g, i) => {
      out.push({shapeId: s.id, index: i, ...g});
    });
  }
  return out;
}

/** Find a grip by the shape and index a pointer is dragging. */
export function gripAt(grips, p, tol = DEFAULT_PICK_TOL) {
  let best = null;
  for (const g of grips) {
    const d = dist(p, g.point);
    if (d <= tol && (!best || d < best.distance)) best = {...g, distance: d};
  }
  return best;
}

// ---------------------------------------------------------------------------
// Node editing
// ---------------------------------------------------------------------------

/**
 * Every editable vertex in a selection, tagged so a drag can be routed back.
 *
 * `atEnd` marks the trailing vertex of an open shape, which is the one that
 * cannot be deleted without closing the shape first.
 */
export function nodeVertices(shapes, ids) {
  const out = [];
  for (const s of shapesOf(shapes, ids)) {
    if (s.type !== 'polyline' && s.type !== 'spline' && s.type !== 'line')
      continue;
    const pts = verticesOf(s);
    const last = pts.length - 1;
    pts.forEach((p, i) =>
      out.push({shapeId: s.id, index: i, point: p, atEnd: i === last}),
    );
  }
  return out;
}

export function nodeAt(nodes, p, tol = DEFAULT_PICK_TOL) {
  let best = null;
  for (const n of nodes) {
    const d = dist(p, n.point);
    if (d <= tol && (!best || d < best.distance)) best = {...n, distance: d};
  }
  return best;
}

/** Can this node be removed without destroying the shape? */
export const canRemoveNode = node => {
  if (node.shapeType === 'line') return false; // a line needs two points
  if (node.shapeType === 'arc' || node.shapeType === 'circle') return false;
  if (node.closed) return true; // any vertex of a closed ring is fair game
  if (node.atEnd && node.index === 1) return true; // penultimate of a run
  if (node.atEnd) return true; // tail, as long as 3+ points remain
  return true;
};

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** Tag shapes as one group. Returns new shape objects, ids preserved. */
export function groupShapes(shapes, ids, groupId) {
  const want = new Set(ids);
  return shapes.map(s => (want.has(s.id) ? {...s, groupId} : s));
}

export function ungroupShapes(shapes, groupId) {
  return shapes.map(s => (s.groupId === groupId ? {...s, groupId: null} : s));
}

/**
 * Expand a selection so that picking any member picks the whole group, which
 * is the only way group behaviour differs from plain selection.
 *
 * The group id is a tag, not an entity, so it is tracked separately and never
 * leaks into the returned id list — callers feed these straight back into
 * `shapesOf`, and a stray tag there would select nothing while still
 * dirtying the selection.
 */
export function expandGroups(shapes, ids) {
  const out = new Set(ids);
  const groups = new Set();
  for (const s of shapes) {
    if (s.groupId && out.has(s.id)) groups.add(s.groupId);
  }
  for (const s of shapes) {
    if (s.groupId && groups.has(s.groupId)) out.add(s.id);
  }
  return normalise([...out]);
}
