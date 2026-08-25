import { circumcircle, normalizeDeg } from '../operations/arc';

// Plain JS (not a worklet) — only called on tap, not per drag frame, so
// there's no performance reason to push this onto the UI thread.

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function distanceToShape(point, shape) {
  const pts = shape.points;

  if (shape.type === 'line') {
    return distanceToSegment(point, pts[0], pts[1]);
  }
  if (shape.type === 'circle') {
    const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const d = Math.hypot(point.x - pts[0].x, point.y - pts[0].y);
    return Math.abs(d - r);
  }
  if (shape.type === 'rectangle') {
    const [c0, c1, c2, c3] = pts;
    const edges = [[c0, c1], [c1, c2], [c2, c3], [c3, c0]];
    return Math.min(...edges.map(([a, b]) => distanceToSegment(point, a, b)));
  }
  if (shape.type === 'polyline') {
    let best = Infinity;
    for (let i = 1; i < pts.length; i += 1) {
      best = Math.min(best, distanceToSegment(point, pts[i - 1], pts[i]));
    }
    return best;
  }
  if (shape.type === 'arc') {
    const [p1, p2, p3] = pts;
    const center = circumcircle(p1, p2, p3);
    if (!center) return distanceToSegment(point, p1, p3); // degenerate, treat as a chord

    const radius = Math.hypot(p1.x - center.x, p1.y - center.y);
    const startDeg = normalizeDeg((Math.atan2(p1.y - center.y, p1.x - center.x) * 180) / Math.PI);
    const midDeg = normalizeDeg((Math.atan2(p2.y - center.y, p2.x - center.x) * 180) / Math.PI);
    let sweep = normalizeDeg(
      normalizeDeg((Math.atan2(p3.y - center.y, p3.x - center.x) * 180) / Math.PI) - startDeg,
    );
    const midOffset = normalizeDeg(midDeg - startDeg);
    if (midOffset > sweep) sweep = -(360 - sweep);

    const pointDeg = normalizeDeg((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI);
    let offset = normalizeDeg(pointDeg - startDeg);
    if (sweep < 0) offset -= 360;
    const withinSweep = sweep >= 0 ? (offset >= 0 && offset <= sweep) : (offset <= 0 && offset >= sweep);

    if (withinSweep) {
      return Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius);
    }
    return Math.min(
      Math.hypot(point.x - p1.x, point.y - p1.y),
      Math.hypot(point.x - p3.x, point.y - p3.y),
    );
  }
  return Infinity;
}

export function findNearestShape(point, shapes, threshold = 16) {
  let best = null;
  let bestDist = threshold;
  for (const shape of shapes) {
    const d = distanceToShape(point, shape);
    if (d <= bestDist) {
      bestDist = d;
      best = shape;
    }
  }
  return best;
}
