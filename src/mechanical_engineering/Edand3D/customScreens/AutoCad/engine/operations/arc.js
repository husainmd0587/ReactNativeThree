import { round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

// Center of the circle passing through all three points, or null if the
// points are (near-)collinear and no such circle exists.
export function circumcircle(p1, p2, p3) {
  const ax = p1.x; const ay = p1.y;
  const bx = p2.x; const by = p2.y;
  const cx = p3.x; const cy = p3.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-6) return null;

  const ax2ay2 = ax * ax + ay * ay;
  const bx2by2 = bx * bx + by * by;
  const cx2cy2 = cx * cx + cy * cy;
  const ux = (ax2ay2 * (by - cy) + bx2by2 * (cy - ay) + cx2cy2 * (ay - by)) / d;
  const uy = (ax2ay2 * (cx - bx) + bx2by2 * (ax - cx) + cx2cy2 * (bx - ax)) / d;
  return { x: ux, y: uy };
}

export function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// A 3-point arc: all three points lie ON the arc, in the order drawn —
// same convention as AutoCAD's default ARC command (Start, Second point,
// End point).
export function computeArcGeometry(points) {
  const [p1, p2, p3] = points;
  const center = circumcircle(p1, p2, p3);
  if (!center) {
    // Collinear points — no valid arc. Report zeros rather than crashing;
    // the canvas falls back to drawing the chord as a straight line.
    return { type: 'arc', invalid: true, radiusMm: 0, sweepDeg: 0 };
  }

  const radiusPx = Math.hypot(p1.x - center.x, p1.y - center.y);
  const startDeg = normalizeDeg((Math.atan2(p1.y - center.y, p1.x - center.x) * 180) / Math.PI);
  const midDeg = normalizeDeg((Math.atan2(p2.y - center.y, p2.x - center.x) * 180) / Math.PI);
  const endDeg = normalizeDeg((Math.atan2(p3.y - center.y, p3.x - center.x) * 180) / Math.PI);

  // Sweep going from start toward end in the increasing-angle direction;
  // if the second point isn't on that stretch, the arc actually goes the
  // other way around.
  let sweep = normalizeDeg(endDeg - startDeg);
  const midOffset = normalizeDeg(midDeg - startDeg);
  if (midOffset > sweep) sweep = -(360 - sweep);

  return {
    type: 'arc',
    center,
    radiusMm: round(pxToMm(radiusPx), 1),
    startDeg: round(startDeg, 1),
    sweepDeg: round(sweep, 1),
  };
}
