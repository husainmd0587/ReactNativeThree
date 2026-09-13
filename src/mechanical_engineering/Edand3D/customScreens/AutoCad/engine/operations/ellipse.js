import { distance, angleDeg, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

// The ellipse's minor axis is a fixed ratio of its major axis — the same
// "set the major axis, the minor follows" idea as a real AutoCAD ELLIPSE
// drawn by center + end of major axis. Stored the same way Circle is
// (center + one edge point), so the drag gesture is identical: touch the
// center, drag out to set the major axis direction and radius.
export const ELLIPSE_MINOR_RATIO = 0.6;

// The ellipse's half-height along the maybe-rotated Y axis (for drawing/
// hit-testing): length along the major axis is the drag distance, the
// minor axis is that times ELLIPSE_MINOR_RATIO.
export function ellipseRadii(center, edge) {
  const major = distance(center, edge);
  const minor = major * ELLIPSE_MINOR_RATIO;
  return { major, minor };
}

export function computeEllipseGeometry(points) {
  const [center, edge] = points;
  const { major, minor } = ellipseRadii(center, edge);
  return {
    type: 'ellipse',
    center,
    majorRadiusPx: major,
    minorRadiusPx: minor,
    majorAxisAngleDeg: round(angleDeg(center, edge), 1),
    majorRadiusMm: round(pxToMm(major), 1),
    minorRadiusMm: round(pxToMm(minor), 1),
  };
}