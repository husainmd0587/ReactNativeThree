// The inverse of Trim, reusing the same line-line intersection idea —
// scoped to line-on-line for the same reason Trim is: a curved or
// rectangle/arc/polyline boundary needs real per-shape-type intersection
// math, not a generalization of this.

export function applyExtend(boundary, objectToExtend, tapPoint) {
  const [a1, a2] = boundary.points;
  const [b1, b2] = objectToExtend.points;

  // Whichever endpoint is nearer the tap is the one that moves.
  const distB1 = Math.hypot(tapPoint.x - b1.x, tapPoint.y - b1.y);
  const distB2 = Math.hypot(tapPoint.x - b2.x, tapPoint.y - b2.y);
  const extendingB1 = distB1 < distB2;

  // Intersect the INFINITE line through b1->b2 with the boundary's own
  // actual segment (s must land in [0,1] — the extension has to reach a
  // real point on the boundary, not its imaginary extension).
  const d1x = b2.x - b1.x;
  const d1y = b2.y - b1.y;
  const d2x = a2.x - a1.x;
  const d2y = a2.y - a1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null; // parallel, can never meet

  const t = ((a1.x - b1.x) * d2y - (a1.y - b1.y) * d2x) / denom; // param along b1->b2 (can be outside [0,1])
  const s = ((a1.x - b1.x) * d1y - (a1.y - b1.y) * d1x) / denom; // param along the boundary segment
  if (s < 0 || s > 1) return null;

  // The intersection has to actually be beyond the end being extended —
  // otherwise the line is either already past the boundary or pointing
  // the wrong way entirely.
  if (extendingB1 && t >= 0) return null;
  if (!extendingB1 && t <= 1) return null;

  const newPoint = { x: b1.x + t * d1x, y: b1.y + t * d1y };
  return extendingB1 ? [newPoint, b2] : [b1, newPoint];
}
