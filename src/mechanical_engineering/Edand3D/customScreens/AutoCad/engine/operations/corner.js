// Shared by Chamfer and Fillet — both start from the same question:
// "where would these two lines meet if extended, and which end of each
// line is nearer that corner?" Kept separate from Trim/Extend's
// intersection math since those care about actual segment extents, while
// this deliberately extends both lines to their notional corner even if
// they don't currently touch.

function infiniteLineIntersection(a1, a2, b1, b2) {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null; // parallel — no corner
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  return { x: a1.x + t * d1x, y: a1.y + t * d1y };
}

export function getCornerGeometry(line1Points, line2Points) {
  const [a1, a2] = line1Points;
  const [b1, b2] = line2Points;
  const corner = infiniteLineIntersection(a1, a2, b1, b2);
  if (!corner) return null;

  const distA1 = Math.hypot(corner.x - a1.x, corner.y - a1.y);
  const distA2 = Math.hypot(corner.x - a2.x, corner.y - a2.y);
  const farA = distA1 < distA2 ? a2 : a1;
  const dirA = { x: farA.x - corner.x, y: farA.y - corner.y };
  const lenA = Math.hypot(dirA.x, dirA.y) || 1;
  const unitA = { x: dirA.x / lenA, y: dirA.y / lenA };

  const distB1 = Math.hypot(corner.x - b1.x, corner.y - b1.y);
  const distB2 = Math.hypot(corner.x - b2.x, corner.y - b2.y);
  const farB = distB1 < distB2 ? b2 : b1;
  const dirB = { x: farB.x - corner.x, y: farB.y - corner.y };
  const lenB = Math.hypot(dirB.x, dirB.y) || 1;
  const unitB = { x: dirB.x / lenB, y: dirB.y / lenB };

  return {
    corner, unitA, unitB, farA, farB, distA1, distA2, distB1, distB2,
  };
}
