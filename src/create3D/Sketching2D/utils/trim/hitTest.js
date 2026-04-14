// utils/hitTest.js
// Returns distance from point to segment (for finding what was tapped)

export function distPointToLine(px, py, seg) {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - seg.startPoint.x, py - seg.startPoint.y);
  let t = ((px - seg.startPoint.x) * dx + (py - seg.startPoint.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (seg.startPoint.x + t * dx), py - (seg.startPoint.y + t * dy));
}

export function distPointToArc(px, py, seg) {
  const dx = px - seg.center.x;
  const dy = py - seg.center.y;
  const dist = Math.hypot(dx, dy);
  const onCircleDist = Math.abs(dist - seg.radius);
  // Check if the closest point on circle is within the arc's angular range
  const angle = Math.atan2(dy, dx);
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const s = norm(seg.startAngle), e = norm(seg.endAngle), a = norm(angle);
  let inArc;
  if (seg.clockwise)
    inArc = s <= e ? a >= s && a <= e : a >= s || a <= e;
  else
    inArc = s >= e ? a <= s && a >= e : a <= s || a >= e;
  return inArc ? onCircleDist : Infinity;
}

export function distPointToCircle(px, py, seg) {
  const dist = Math.hypot(px - seg.center.x, py - seg.center.y);
  return Math.abs(dist - seg.radius);
}

export function distPointToRect(px, py, seg) {
  // Treat rect as 4 lines
  const { topLeft: tl, bottomRight: br } = seg;
  const edges = [
    { startPoint: tl,              endPoint: { x: br.x, y: tl.y } },
    { startPoint: { x: br.x, y: tl.y }, endPoint: br              },
    { startPoint: br,              endPoint: { x: tl.x, y: br.y } },
    { startPoint: { x: tl.x, y: br.y }, endPoint: tl              },
  ];
  return Math.min(...edges.map(e => distPointToLine(px, py, e)));
}

export function hitTestSegment(px, py, seg, threshold = 8) {
  let dist = Infinity;
  if (seg.type === 'line')      dist = distPointToLine(px, py, seg);
  if (seg.type === 'arc')       dist = distPointToArc(px, py, seg);
  if (seg.type === 'circle')    dist = distPointToCircle(px, py, seg);
  if (seg.type === 'rectangle') dist = distPointToRect(px, py, seg);
  return dist <= threshold;
}