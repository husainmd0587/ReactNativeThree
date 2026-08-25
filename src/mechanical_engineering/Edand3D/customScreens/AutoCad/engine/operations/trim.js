// Scoped to line-on-line trimming — the same case the original spec used
// as its own example ("Trim the horizontal line at the vertical
// boundary"). Trimming against a circle/rectangle/arc/polyline boundary,
// or trimming a curved object, needs real curve-intersection math per
// shape-type pair — a genuinely bigger feature, not a quick
// generalization of this.

// Where two line SEGMENTS actually cross (both intersection parameters
// within [0,1]) — returns null if they're parallel or don't actually
// cross within both segments' extents.
function lineIntersection(a1, a2, b1, b2) {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null; // parallel (or the same line)

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a1.x + t * d1x, y: a1.y + t * d1y, u };
}

// cuttingEdge and objectToTrim are both { points: [p1, p2] } lines.
// tapPoint is where the student tapped on objectToTrim to say which side
// to remove — the side tapPoint is on gets cut back to the intersection;
// the other side is kept, same as real AutoCAD's TRIM. Returns null if
// there's no valid intersection to trim at.
export function applyTrim(cuttingEdge, objectToTrim, tapPoint) {
  const [a1, a2] = cuttingEdge.points;
  const [b1, b2] = objectToTrim.points;
  const intersection = lineIntersection(a1, a2, b1, b2);
  if (!intersection) return null;

  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const lenSq = d2x * d2x + d2y * d2y || 1;
  const tapParam = ((tapPoint.x - b1.x) * d2x + (tapPoint.y - b1.y) * d2y) / lenSq;

  const cut = { x: intersection.x, y: intersection.y };
  const result = tapParam < intersection.u ? [cut, b2] : [b1, cut];

  // If the trim would leave nothing (e.g. the object was already trimmed
  // back to this same intersection), don't produce a zero-length line —
  // just decline the trim instead of silently collapsing the shape.
  const resultLength = Math.hypot(result[1].x - result[0].x, result[1].y - result[0].y);
  if (resultLength < 2) return null;

  return result;
}
