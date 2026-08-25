import { distance, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

export function computeCircleGeometry(points) {
  const [center, edge] = points;
  return {
    type: 'circle',
    radiusMm: round(pxToMm(distance(center, edge)), 1),
  };
}
