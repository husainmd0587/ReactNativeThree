import { Skia } from '@shopify/react-native-skia';

const DIM_OFFSET = 26;
const ARROW_SIZE = 8;
const ARROW_ANGLE = 20;
const PX_PER_MM = 2; // must match engine/geometry/units.js

function rotate(vx, vy, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: vx * cos - vy * sin, y: vx * sin + vy * cos };
}

function addArrow(path, tipX, tipY, dirX, dirY) {
  const w1 = rotate(-dirX, -dirY, ARROW_ANGLE);
  const w2 = rotate(-dirX, -dirY, -ARROW_ANGLE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w1.x * ARROW_SIZE, tipY + w1.y * ARROW_SIZE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w2.x * ARROW_SIZE, tipY + w2.y * ARROW_SIZE);
}

// Duplicated on purpose from engine/operations/arc.js — this file is
// geometry-for-rendering, deliberately kept independent of the
// geometry-for-measurement layer so drawing code never has to import
// measurement code (or vice versa).
function circumcircle(p1, p2, p3) {
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
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Builds the shape path, dimension annotation path, and label text/position
// for one already-drawn shape. Runs on the JS thread (called from a
// useMemo keyed on the shapes array) — deliberately separate from the
// near-identical math in components/PracticeCanvas.jsx, which runs inside
// a UI-thread worklet for the shape currently being dragged. A worklet
// can't call a plain imported function like this one, so the two stay
// duplicated on purpose rather than sharing one implementation.
export function buildShapeVisuals(type, points) {
  const shapePath = Skia.Path.Make();
  const annotationPath = Skia.Path.Make();
  let primaryText = '';
  let primaryX = 0;
  let primaryY = 0;
  let secondaryText = '';
  let secondaryX = 0;
  let secondaryY = 0;

  if (type === 'line') {
    const [start, end] = points;
    const { x: sx, y: sy } = start;
    const { x: ex, y: ey } = end;
    shapePath.moveTo(sx, sy);
    shapePath.lineTo(ex, ey);

    const len = Math.hypot(ex - sx, ey - sy) || 1;
    const ux = (ex - sx) / len;
    const uy = (ey - sy) / len;
    const nx = -uy;
    const ny = ux;
    const d1x = sx + nx * DIM_OFFSET;
    const d1y = sy + ny * DIM_OFFSET;
    const d2x = ex + nx * DIM_OFFSET;
    const d2y = ey + ny * DIM_OFFSET;

    annotationPath.moveTo(sx, sy);
    annotationPath.lineTo(d1x, d1y);
    annotationPath.moveTo(ex, ey);
    annotationPath.lineTo(d2x, d2y);
    annotationPath.moveTo(d1x, d1y);
    annotationPath.lineTo(d2x, d2y);
    addArrow(annotationPath, d1x, d1y, -ux, -uy);
    addArrow(annotationPath, d2x, d2y, ux, uy);

    const lengthMm = Math.round((len / PX_PER_MM) * 10) / 10;
    let angle = (Math.atan2(ey - sy, ex - sx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    angle = Math.round(angle * 10) / 10;
    primaryText = `${lengthMm} mm   ${angle}°`;
    primaryX = (sx + ex) / 2 - 30;
    primaryY = (d1y + d2y) / 2 - 8;
  } else if (type === 'circle') {
    const [center, edge] = points;
    const { x: cx, y: cy } = center;
    const { x: ex, y: ey } = edge;
    const r = Math.hypot(ex - cx, ey - cy) || 1;
    shapePath.addCircle(cx, cy, r);

    const ux = (ex - cx) / r;
    const uy = (ey - cy) / r;
    annotationPath.moveTo(cx, cy);
    annotationPath.lineTo(ex, ey);
    annotationPath.moveTo(cx - 4, cy);
    annotationPath.lineTo(cx + 4, cy);
    annotationPath.moveTo(cx, cy - 4);
    annotationPath.lineTo(cx, cy + 4);
    addArrow(annotationPath, ex, ey, ux, uy);

    const radiusMm = Math.round((r / PX_PER_MM) * 10) / 10;
    primaryText = `R ${radiusMm} mm`;
    primaryX = (cx + ex) / 2 + 8;
    primaryY = (cy + ey) / 2 - 8;
  } else if (type === 'rectangle') {
    // 4 explicit corners (not a bounding box) so this renders correctly
    // at any rotation — see engine/geometry/rectangleFrame.js.
    const [c0, c1, c2, c3] = points;
    shapePath.moveTo(c0.x, c0.y);
    shapePath.lineTo(c1.x, c1.y);
    shapePath.lineTo(c2.x, c2.y);
    shapePath.lineTo(c3.x, c3.y);
    shapePath.close();

    // Dimension lines follow the rectangle's own edge directions (its
    // width edge c0->c1, height edge c1->c2) instead of assuming
    // horizontal/vertical, so they stay correctly aligned when rotated.
    const widthLen = Math.hypot(c1.x - c0.x, c1.y - c0.y) || 1;
    const wux = (c1.x - c0.x) / widthLen;
    const wuy = (c1.y - c0.y) / widthLen;
    const heightLen = Math.hypot(c2.x - c1.x, c2.y - c1.y) || 1;
    const hux = (c2.x - c1.x) / heightLen;
    const huy = (c2.y - c1.y) / heightLen;

    // Width dimension, offset outward along the height edge's direction.
    const w1x = c0.x + hux * DIM_OFFSET;
    const w1y = c0.y + huy * DIM_OFFSET;
    const w2x = c1.x + hux * DIM_OFFSET;
    const w2y = c1.y + huy * DIM_OFFSET;
    annotationPath.moveTo(c0.x, c0.y);
    annotationPath.lineTo(w1x, w1y);
    annotationPath.moveTo(c1.x, c1.y);
    annotationPath.lineTo(w2x, w2y);
    annotationPath.moveTo(w1x, w1y);
    annotationPath.lineTo(w2x, w2y);
    addArrow(annotationPath, w1x, w1y, -wux, -wuy);
    addArrow(annotationPath, w2x, w2y, wux, wuy);

    // Height dimension, offset outward along the width edge's direction.
    const h1x = c1.x + wux * DIM_OFFSET;
    const h1y = c1.y + wuy * DIM_OFFSET;
    const h2x = c2.x + wux * DIM_OFFSET;
    const h2y = c2.y + wuy * DIM_OFFSET;
    annotationPath.moveTo(c1.x, c1.y);
    annotationPath.lineTo(h1x, h1y);
    annotationPath.moveTo(c2.x, c2.y);
    annotationPath.lineTo(h2x, h2y);
    annotationPath.moveTo(h1x, h1y);
    annotationPath.lineTo(h2x, h2y);
    addArrow(annotationPath, h1x, h1y, -hux, -huy);
    addArrow(annotationPath, h2x, h2y, hux, huy);

    const widthMm = Math.round((widthLen / PX_PER_MM) * 10) / 10;
    const heightMm = Math.round((heightLen / PX_PER_MM) * 10) / 10;
    primaryText = `${widthMm} mm`;
    primaryX = (w1x + w2x) / 2 - 24;
    primaryY = (w1y + w2y) / 2 - 6;
    secondaryText = `${heightMm} mm`;
    secondaryX = (h1x + h2x) / 2 + 6;
    secondaryY = (h1y + h2y) / 2;
  } else if (type === 'arc') {
    const [p1, p2, p3] = points;
    const center = circumcircle(p1, p2, p3);
    if (!center) {
      // Degenerate (collinear) — fall back to drawing the chord so
      // something reasonable still shows instead of nothing at all.
      shapePath.moveTo(p1.x, p1.y);
      shapePath.lineTo(p3.x, p3.y);
    } else {
      const radius = Math.hypot(p1.x - center.x, p1.y - center.y);
      const startDeg = normalizeDeg((Math.atan2(p1.y - center.y, p1.x - center.x) * 180) / Math.PI);
      const midDeg = normalizeDeg((Math.atan2(p2.y - center.y, p2.x - center.x) * 180) / Math.PI);
      const endDeg = normalizeDeg((Math.atan2(p3.y - center.y, p3.x - center.x) * 180) / Math.PI);
      let sweep = normalizeDeg(endDeg - startDeg);
      const midOffset = normalizeDeg(midDeg - startDeg);
      if (midOffset > sweep) sweep = -(360 - sweep);

      shapePath.addArc(
        { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 },
        startDeg,
        sweep,
      );

      annotationPath.moveTo(center.x, center.y);
      annotationPath.lineTo(p1.x, p1.y);
      annotationPath.moveTo(center.x - 4, center.y);
      annotationPath.lineTo(center.x + 4, center.y);
      annotationPath.moveTo(center.x, center.y - 4);
      annotationPath.lineTo(center.x, center.y + 4);

      const radiusMm = Math.round((radius / PX_PER_MM) * 10) / 10;
      const sweepAbsDeg = Math.round(Math.abs(sweep) * 10) / 10;
      primaryText = `R ${radiusMm} mm   ${sweepAbsDeg}°`;
      primaryX = p2.x + 8;
      primaryY = p2.y - 8;
    }
  } else if (type === 'polyline') {
    points.forEach((pt, i) => {
      if (i === 0) shapePath.moveTo(pt.x, pt.y);
      else shapePath.lineTo(pt.x, pt.y);
    });

    let totalPx = 0;
    for (let i = 1; i < points.length; i += 1) {
      totalPx += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const totalMm = Math.round((totalPx / PX_PER_MM) * 10) / 10;
    const last = points[points.length - 1];
    primaryText = `${points.length - 1} seg   ${totalMm} mm total`;
    primaryX = last.x + 8;
    primaryY = last.y - 8;
  }

  return {
    shapePath,
    annotationPath,
    primaryText,
    primaryX,
    primaryY,
    secondaryText,
    secondaryX,
    secondaryY,
  };
}
