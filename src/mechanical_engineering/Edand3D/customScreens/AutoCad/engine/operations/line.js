import { distance, angleDeg, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

// Converts the two points the student actually drew into measured geometry.
export function computeLineGeometry(startPx, endPx) {
  return {
    type: 'line',
    lengthMm: round(pxToMm(distance(startPx, endPx)), 1),
    angleDeg: round(angleDeg(startPx, endPx), 1),
  };
}
