import { round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

export function computeRectangleGeometry(corner1Px, corner2Px) {
  return {
    type: 'rectangle',
    widthMm: round(pxToMm(Math.abs(corner2Px.x - corner1Px.x)), 1),
    heightMm: round(pxToMm(Math.abs(corner2Px.y - corner1Px.y)), 1),
  };
}
