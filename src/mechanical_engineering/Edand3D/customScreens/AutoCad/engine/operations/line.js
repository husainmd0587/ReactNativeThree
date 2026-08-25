import { distance, angleDeg, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

export function computeLineGeometry(points) {
  const [start, end] = points;
  return {
    type: 'line',
    lengthMm: round(pxToMm(distance(start, end)), 1),
    angleDeg: round(angleDeg(start, end), 1),
  };
}
