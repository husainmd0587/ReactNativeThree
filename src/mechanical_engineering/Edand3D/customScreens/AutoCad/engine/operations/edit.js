import { mmToPx } from '../geometry/units';

// Turns an edited property value back into the two pixel points the canvas
// draws from. The start point (first corner/center) always stays fixed —
// same convention AutoCAD uses when you edit a dimension after the fact.

export function applyLineEdit(points, { lengthMm, angleDeg }) {
  const rad = (angleDeg * Math.PI) / 180;
  const lenPx = mmToPx(lengthMm);
  return {
    start: points.start,
    end: {
      x: points.start.x + lenPx * Math.cos(rad),
      y: points.start.y + lenPx * Math.sin(rad),
    },
  };
}

export function applyCircleEdit(points, { radiusMm }) {
  const dx = points.end.x - points.start.x;
  const dy = points.end.y - points.start.y;
  const angle = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);
  const rPx = mmToPx(radiusMm);
  return {
    start: points.start,
    end: {
      x: points.start.x + rPx * Math.cos(angle),
      y: points.start.y + rPx * Math.sin(angle),
    },
  };
}

export function applyRectangleEdit(points, { widthMm, heightMm }) {
  const signX = Math.sign(points.end.x - points.start.x) || 1;
  const signY = Math.sign(points.end.y - points.start.y) || 1;
  return {
    start: points.start,
    end: {
      x: points.start.x + signX * mmToPx(widthMm),
      y: points.start.y + signY * mmToPx(heightMm),
    },
  };
}
