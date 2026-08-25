import { round } from '../geometry/math';
import { pxToMm } from '../geometry/units';
import { getRectangleFrame } from '../geometry/rectangleFrame';

// A rectangle is 4 explicit corners (see engine/geometry/rectangleFrame.js
// for why) — width/height come from adjacent-corner distances rather than
// axis-aligned min/max, which is what makes this correct for a rotated
// rectangle too, not just an axis-aligned one.
export function computeRectangleGeometry(points) {
  const frame = getRectangleFrame(points);
  let angleDeg = frame.angleDeg % 360;
  if (angleDeg < 0) angleDeg += 360;
  return {
    type: 'rectangle',
    widthMm: round(pxToMm(frame.width), 1),
    heightMm: round(pxToMm(frame.height), 1),
    angleDeg: round(angleDeg, 1),
  };
}
