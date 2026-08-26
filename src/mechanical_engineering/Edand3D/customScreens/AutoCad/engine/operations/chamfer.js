import { getCornerGeometry } from './corner';

// Trims both lines back from their (possibly notional/extended) corner by
// distancePx, and returns the new bevel line connecting the two cut
// points. Callers add the bevel as a new line shape and update both
// original lines to their trimmed points — see screens/CommandPractice.jsx.
export function applyChamfer(line1Points, line2Points, distancePx) {
  const geo = getCornerGeometry(line1Points, line2Points);
  if (!geo) return null;
  const {
    corner, unitA, unitB, farA, farB, distA1, distA2, distB1, distB2,
  } = geo;

  const chamferA = { x: corner.x + unitA.x * distancePx, y: corner.y + unitA.y * distancePx };
  const chamferB = { x: corner.x + unitB.x * distancePx, y: corner.y + unitB.y * distancePx };

  return {
    line1Points: distA1 < distA2 ? [chamferA, farA] : [farA, chamferA],
    line2Points: distB1 < distB2 ? [chamferB, farB] : [farB, chamferB],
    chamferLinePoints: [chamferA, chamferB],
  };
}
