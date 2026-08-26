import { getCornerGeometry } from './corner';

// Trims both lines back to their tangent points with a rounding arc of
// radius radiusPx, and returns the 3 points that define that arc (all on
// the curve, same convention as the Arc command itself). Callers add the
// arc as a new shape and update both original lines to their trimmed
// points — see screens/CommandPractice.jsx.
export function applyFillet(line1Points, line2Points, radiusPx) {
  const geo = getCornerGeometry(line1Points, line2Points);
  if (!geo) return null;
  const {
    corner, unitA, unitB, farA, farB, distA1, distA2, distB1, distB2,
  } = geo;

  const dot = Math.max(-1, Math.min(1, unitA.x * unitB.x + unitA.y * unitB.y));
  const angle = Math.acos(dot);
  const halfAngle = angle / 2;
  // Too straight (lines nearly parallel/collinear) or too sharp (nearly
  // doubling back on themselves) — no well-defined fillet either way.
  if (halfAngle < 0.02 || halfAngle > Math.PI / 2 - 0.02) return null;

  const tangentLength = radiusPx / Math.tan(halfAngle);
  const tangentA = { x: corner.x + unitA.x * tangentLength, y: corner.y + unitA.y * tangentLength };
  const tangentB = { x: corner.x + unitB.x * tangentLength, y: corner.y + unitB.y * tangentLength };

  let bisX = unitA.x + unitB.x;
  let bisY = unitA.y + unitB.y;
  const bisLen = Math.hypot(bisX, bisY) || 1;
  bisX /= bisLen;
  bisY /= bisLen;

  const centerDist = radiusPx / Math.sin(halfAngle);
  const arcCenter = { x: corner.x + bisX * centerDist, y: corner.y + bisY * centerDist };

  // The point on the arc closest to the original (sharp) corner — the
  // "bulge" point, and the correct middle point for our 3-point arc.
  const toCornerX = corner.x - arcCenter.x;
  const toCornerY = corner.y - arcCenter.y;
  const toCornerLen = Math.hypot(toCornerX, toCornerY) || 1;
  const midPoint = {
    x: arcCenter.x + (toCornerX / toCornerLen) * radiusPx,
    y: arcCenter.y + (toCornerY / toCornerLen) * radiusPx,
  };

  return {
    line1Points: distA1 < distA2 ? [tangentA, farA] : [farA, tangentA],
    line2Points: distB1 < distB2 ? [tangentB, farB] : [farB, tangentB],
    arcPoints: [tangentA, midPoint, tangentB],
  };
}
