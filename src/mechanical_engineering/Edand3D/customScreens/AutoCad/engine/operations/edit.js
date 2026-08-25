import { mmToPx } from '../geometry/units';
import { getRectangleFrame, buildRectangleCorners } from '../geometry/rectangleFrame';
import { circumcircle } from './arc';
import { computeArcGeometry } from './arc';

// Turns an edited property value back into the points array the shape is
// built from. The first point (line's start / circle's center /
// rectangle's first corner) always stays fixed — same convention AutoCAD
// uses when you edit a dimension after the fact.

export function applyLineEdit(points, { lengthMm, angleDeg }) {
  const [start] = points;
  const rad = (angleDeg * Math.PI) / 180;
  const lenPx = mmToPx(lengthMm);
  return [
    start,
    { x: start.x + lenPx * Math.cos(rad), y: start.y + lenPx * Math.sin(rad) },
  ];
}

export function applyCircleEdit(points, { radiusMm }) {
  const [center, edge] = points;
  const dx = edge.x - center.x;
  const dy = edge.y - center.y;
  const angle = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);
  const rPx = mmToPx(radiusMm);
  return [
    center,
    { x: center.x + rPx * Math.cos(angle), y: center.y + rPx * Math.sin(angle) },
  ];
}

export function applyRectangleEdit(points, { widthMm, heightMm, angleDeg }) {
  const frame = getRectangleFrame(points);
  const rad = (angleDeg * Math.PI) / 180;
  const u = { x: Math.cos(rad), y: Math.sin(rad) };
  const v = { x: -u.y, y: u.x };
  return buildRectangleCorners(frame.center, u, v, mmToPx(widthMm), mmToPx(heightMm));
}

// Arc has no single fixed point the way the other three do — it's defined
// by 3 points that all lie on the curve. Editing keeps the circle's center
// and the start point's angle fixed:
//   - Radius: scales all 3 points radially from the center (same sweep).
//   - Included angle: rotates the end point to the new sweep and moves
//     the middle point to the new midpoint angle, keeping direction
//     (clockwise/counterclockwise) the same as before the edit.
export function applyArcEdit(points, { radiusMm, sweepDeg }) {
  const center = circumcircle(points[0], points[1], points[2]);
  if (!center) return points; // degenerate arc, nothing sensible to edit

  const currentGeometry = computeArcGeometry(points);
  const direction = currentGeometry.sweepDeg < 0 ? -1 : 1;
  const startAngleRad = Math.atan2(points[0].y - center.y, points[0].x - center.x);
  const newRadiusPx = mmToPx(radiusMm);
  const newSweepRad = ((Math.abs(sweepDeg) * Math.PI) / 180) * direction;
  const midAngleRad = startAngleRad + newSweepRad / 2;
  const endAngleRad = startAngleRad + newSweepRad;

  const pointAt = (angle) => ({
    x: center.x + newRadiusPx * Math.cos(angle),
    y: center.y + newRadiusPx * Math.sin(angle),
  });
  return [pointAt(startAngleRad), pointAt(midAngleRad), pointAt(endAngleRad)];
}

// Polyline has no single fixed point + one number either (N points, one
// total length) — editing total length scales every point after the
// first proportionally out from the first point, preserving the drawn
// shape and just resizing it, the same way an AutoCAD SCALE command
// applied to just this entity would.
export function applyPolylineEdit(points, { totalLengthMm }) {
  let totalPx = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalPx += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  if (totalPx === 0) return points;

  const factor = mmToPx(totalLengthMm) / totalPx;
  const origin = points[0];
  return points.map((p, i) => (
    i === 0
      ? p
      : { x: origin.x + (p.x - origin.x) * factor, y: origin.y + (p.y - origin.y) * factor }
  ));
}
