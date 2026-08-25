import { distance, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

export function computePolylineGeometry(points) {
  let totalPx = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalPx += distance(points[i - 1], points[i]);
  }
  return {
    type: 'polyline',
    segments: points.length - 1,
    totalLengthMm: round(pxToMm(totalPx), 1),
  };
}
