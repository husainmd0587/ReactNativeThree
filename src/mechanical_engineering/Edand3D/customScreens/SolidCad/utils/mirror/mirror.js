// utils/mirror.js

const TAU = 2 * Math.PI;

// ─────────────────────────────────────────────────────────────────────────────
// CORE MATH
// ─────────────────────────────────────────────────────────────────────────────

// Reflect a single point across a line defined by two points
function reflectPoint(pt, lx1, ly1, lx2, ly2) {
  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return { ...pt };

  // Project pt onto mirror line, then reflect
  const t  = ((pt.x - lx1) * dx + (pt.y - ly1) * dy) / lenSq;
  const px = lx1 + t * dx;   // foot of perpendicular
  const py = ly1 + t * dy;

  return {
    x: 2 * px - pt.x,
    y: 2 * py - pt.y,
  };
}

// Reflect an angle across a line defined by its direction angle
function reflectAngle(angle, lineAngle) {
  // Mirror angle = 2*lineAngle - angle
  return 2 * lineAngle - angle;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT MIRROR
// ─────────────────────────────────────────────────────────────────────────────

export function mirrorSegment(seg, lx1, ly1, lx2, ly2) {
  const rp  = (pt) => reflectPoint(pt, lx1, ly1, lx2, ly2);
  const lineAngle = Math.atan2(ly2 - ly1, lx2 - lx1);

  // ── LINE ───────────────────────────────────────────────────────────────────
  if (seg.type === 'line') {
    return {
      ...seg,
      // Swap start/end after reflection to preserve winding direction
      startPoint: rp(seg.startPoint),
      endPoint:   rp(seg.endPoint),
    };
  }

  // ── ARC ────────────────────────────────────────────────────────────────────
  if (seg.type === 'arc') {
    const newCenter     = rp(seg.center);
    const newStartAngle = reflectAngle(seg.startAngle, lineAngle);
    const newEndAngle   = reflectAngle(seg.endAngle,   lineAngle);
    const newStartPoint = rp(seg.startPoint);
    const newEndPoint   = rp(seg.endPoint);
    const bulge = seg.bulgePoint ? rp(seg.bulgePoint) : undefined;

    return {
      ...seg,
      center:     newCenter,
      // Mirror flips winding — CW becomes CCW and vice versa
      clockwise:  !seg.clockwise,
      // Swap start/end angles so arc still runs start→end correctly
      startAngle: newEndAngle,
      endAngle:   newStartAngle,
      startPoint: newEndPoint,
      endPoint:   newStartPoint,
      ...(bulge ? { bulgePoint: bulge } : {}),
    };
  }

  // ── CIRCLE ─────────────────────────────────────────────────────────────────
  if (seg.type === 'circle') {
    return {
      ...seg,
      center: rp(seg.center),
      point1: seg.point1 ? rp(seg.point1) : undefined,
      point2: seg.point2 ? rp(seg.point2) : undefined,
    };
  }

  // ── RECTANGLE ──────────────────────────────────────────────────────────────
  if (seg.type === 'rectangle') {
    const newTL = rp(seg.topLeft);
    const newBR = rp(seg.bottomRight);
    const newC1 = rp(seg.corner1);
    const newC2 = rp(seg.corner2);

    // After reflection, topLeft/bottomRight may be swapped — normalize
    return {
      ...seg,
      topLeft:     { x: Math.min(newTL.x, newBR.x), y: Math.min(newTL.y, newBR.y) },
      bottomRight: { x: Math.max(newTL.x, newBR.x), y: Math.max(newTL.y, newBR.y) },
      corner1:     newC1,
      corner2:     newC2,
    };
  }

  return seg;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY MIRROR — append mirrored copies of selected segments
// ─────────────────────────────────────────────────────────────────────────────

export function applyMirror(shapeList, selectedIndices, lx1, ly1, lx2, ly2) {
  const mirrored = selectedIndices.map(i =>
    mirrorSegment(shapeList[i], lx1, ly1, lx2, ly2)
  );
  return [...shapeList, ...mirrored];
}