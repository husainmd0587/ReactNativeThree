import { distance, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

export const POLYGON_MIN_SIDES = 3;
export const POLYGON_MAX_SIDES = 12;
export const POLYGON_DEFAULT_SIDES = 6;

// Regular polygon: `sides` equal-length edges, `points` = [center, edge]
// where edge is a vertex on the circumcircle. First vertex always points
// along the drag direction (center -> edge), exactly how dragging out a
// Circle gives you its radius.
export function polygonVertices(center, edge, sides) {
  const r = distance(center, edge);
  const startAngle = Math.atan2(edge.y - center.y, edge.x - center.x);
  return Array.from({ length: sides }, (_, i) => {
    const a = startAngle + (i * 2 * Math.PI) / sides;
    return { x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) };
  });
}

export function computePolygonGeometry(points, sides) {
  const [center, edge] = points;
  const vertices = polygonVertices(center, edge, sides);
  const radiusPx = distance(center, edge);
  return {
    type: 'polygon',
    center,
    vertices,
    radiusPx,
    sides,
    radiusMm: round(pxToMm(radiusPx), 1),
  };
}