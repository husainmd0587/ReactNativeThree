// All shapes are just { type, points } — which is what makes Move,
// Rotate, Scale, and Mirror generic across every shape type: they're pure
// transforms of a points array, with no need to know whether the points
// mean "line endpoints" or "rectangle corners" or "arc's 3 defining
// points". Offset is the one exception — a rectangle's offset and a
// circle's offset mean genuinely different things geometrically, so it's
// handled per type below.

import { getRectangleFrame, buildRectangleCorners } from '../geometry/rectangleFrame';

function centroidOf(type, points) {
  // Circle's "center" is points[0] exactly, not an average of its two
  // defining points (center + edge) — using the average would put the
  // pivot somewhere between the center and the edge, which is wrong.
  if (type === 'circle') return points[0];
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function applyMove(shape, dragStart, dragEnd) {
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  return shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

// Pivots about the shape's own centroid (or true center for a circle) —
// there's no separate "pick a base point" step; drag start defines the
// starting angle from that pivot, drag end defines the ending angle, and
// the shape rotates by the swept angle between them.
export function applyRotate(shape, dragStart, dragEnd) {
  const pivot = centroidOf(shape.type, shape.points);
  const angleStart = Math.atan2(dragStart.y - pivot.y, dragStart.x - pivot.x);
  const angleEnd = Math.atan2(dragEnd.y - pivot.y, dragEnd.x - pivot.x);
  const delta = angleEnd - angleStart;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return shape.points.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
  });
}

// Same pivot convention as Rotate. Scale factor is the ratio of
// drag-end's distance from the pivot to drag-start's distance from it —
// drag outward to grow, drag inward to shrink.
export function applyScale(shape, dragStart, dragEnd) {
  const pivot = centroidOf(shape.type, shape.points);
  const distStart = Math.hypot(dragStart.x - pivot.x, dragStart.y - pivot.y) || 1;
  const distEnd = Math.hypot(dragEnd.x - pivot.x, dragEnd.y - pivot.y) || 1;
  const factor = distEnd / distStart;
  return shape.points.map((p) => ({
    x: pivot.x + (p.x - pivot.x) * factor,
    y: pivot.y + (p.y - pivot.y) * factor,
  }));
}

// The drag itself defines the mirror line (start -> end), and every point
// is reflected across it — standard point-reflection-across-a-line
// formula. Always produces a new shape (see MODIFY_APPLIERS/
// REPLACES_IN_PLACE in screens/CommandPractice.jsx) — same as AutoCAD's
// MIRROR command defaulting to keeping the source object.
export function applyMirror(shape, dragStart, dragEnd) {
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return shape.points;
  return shape.points.map((p) => {
    const px = p.x - dragStart.x;
    const py = p.y - dragStart.y;
    const t = (px * dx + py * dy) / lenSq;
    const projX = t * dx;
    const projY = t * dy;
    return { x: dragStart.x + 2 * projX - px, y: dragStart.y + 2 * projY - py };
  });
}

// Offset distance = drag length; sign (grow vs shrink) comes from whether
// the drag is moving away from or toward the shape's pivot. Always
// produces a new (parallel) shape — same AutoCAD OFFSET default.
export function applyOffset(shape, dragStart, dragEnd) {
  const distancePx = Math.hypot(dragEnd.x - dragStart.x, dragEnd.y - dragStart.y);
  const pivot = centroidOf(shape.type, shape.points);
  const movingAway = (
    (dragEnd.x - pivot.x) * (dragEnd.x - dragStart.x)
    + (dragEnd.y - pivot.y) * (dragEnd.y - dragStart.y)
  ) >= 0;
  const signedDistance = movingAway ? distancePx : -distancePx;

  if (shape.type === 'line') {
    const [a, b] = shape.points;
    const ldx = b.x - a.x;
    const ldy = b.y - a.y;
    const len = Math.hypot(ldx, ldy) || 1;
    const nx = -ldy / len;
    const ny = ldx / len;
    return [
      { x: a.x + nx * signedDistance, y: a.y + ny * signedDistance },
      { x: b.x + nx * signedDistance, y: b.y + ny * signedDistance },
    ];
  }
  if (shape.type === 'circle') {
    const [center, edge] = shape.points;
    const r = Math.hypot(edge.x - center.x, edge.y - center.y) || 1;
    const newR = Math.max(4, r + signedDistance);
    const scale = newR / r;
    return [center, { x: center.x + (edge.x - center.x) * scale, y: center.y + (edge.y - center.y) * scale }];
  }
  if (shape.type === 'rectangle') {
    // Local frame handles this correctly regardless of the rectangle's
    // current rotation — see engine/geometry/rectangleFrame.js.
    const frame = getRectangleFrame(shape.points);
    const newWidth = Math.max(4, frame.width + signedDistance * 2);
    const newHeight = Math.max(4, frame.height + signedDistance * 2);
    return buildRectangleCorners(frame.center, frame.u, frame.v, newWidth, newHeight);
  }

  // Arc/Polyline: a correct offset needs per-segment perpendicular
  // offsetting with proper join handling at each vertex — real
  // AutoCAD-grade OFFSET geometry, not a one-line generalization of the
  // above. Falling back to a plain translate outward so Offset still does
  // *something* reasonable for these two rather than nothing, but this is
  // a known simplification, not a real offset.
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  const len = Math.hypot(dx, dy) || 1;
  return shape.points.map((p) => ({
    x: p.x + (dx / len) * signedDistance,
    y: p.y + (dy / len) * signedDistance,
  }));
}

// Rectangular array: repeated Move copies laid out on a grid. The drag
// defines the spacing between adjacent copies (its x/y components are the
// column spacing and row spacing respectively) — rows/columns count comes
// from the caller (see components/ArrayControls.jsx). The original stays
// exactly where it is; this returns only the NEW copies' point arrays,
// one per grid cell except (row 0, col 0).
export function applyRectangularArray(shape, dragStart, dragEnd, rows, cols) {
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  const copies = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === 0 && col === 0) continue;
      const offsetX = col * dx;
      const offsetY = row * dy;
      copies.push(shape.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })));
    }
  }
  return copies;
}

// Polar array: repeated Rotate copies spaced evenly around a center
// point. The drag's start point is the center (its end point isn't used —
// AutoCAD's own ARRAYPOLAR only asks for a center point too, not a
// direction). Always a full circle; count comes from the caller (see
// components/ArrayControls.jsx). Returns only the NEW copies' point
// arrays — the original stays exactly where it is, same as Rectangular
// Array.
export function applyPolarArray(shape, center, count) {
  const copies = [];
  const angleStep = (2 * Math.PI) / count;
  for (let i = 1; i < count; i += 1) {
    const angle = angleStep * i;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    copies.push(shape.points.map((p) => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
    }));
  }
  return copies;
}
