import { distance, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

// centerPx is where the drag started, edgePx is where it ended/released.
export function computeCircleGeometry(centerPx, edgePx) {
  return {
    type: 'circle',
    radiusMm: round(pxToMm(distance(centerPx, edgePx)), 1),
  };
}
