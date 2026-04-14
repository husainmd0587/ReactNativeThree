// utils/rotate.js

const TAU = 2 * Math.PI;

// ─────────────────────────────────────────────────────────────────────────────
// CORE MATH
// ─────────────────────────────────────────────────────────────────────────────

// Rotate a point around a base point by angle (radians)
function rotatePoint(pt, bx, by, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx  = pt.x - bx;
  const dy  = pt.y - by;
  return {
    x: bx + dx * cos - dy * sin,
    y: by + dx * sin + dy * cos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT ROTATE
// ─────────────────────────────────────────────────────────────────────────────

export function rotateSegment(seg, bx, by, angle) {
  const rp = (pt) => rotatePoint(pt, bx, by, angle);

  // ── LINE ───────────────────────────────────────────────────────────────────
  if (seg.type === 'line') {
    return {
      ...seg,
      startPoint: rp(seg.startPoint),
      endPoint:   rp(seg.endPoint),
    };
  }

  // ── ARC ────────────────────────────────────────────────────────────────────
  if (seg.type === 'arc') {
    return {
      ...seg,
      center:     rp(seg.center),
      // Rotate start/end angles — winding direction preserved
      startAngle: seg.startAngle + angle,
      endAngle:   seg.endAngle   + angle,
      startPoint: rp(seg.startPoint),
      endPoint:   rp(seg.endPoint),
      ...(seg.bulgePoint ? { bulgePoint: rp(seg.bulgePoint) } : {}),
    };
  }

  // ── CIRCLE ─────────────────────────────────────────────────────────────────
  if (seg.type === 'circle') {
    return {
      ...seg,
      center: rp(seg.center),
      ...(seg.point1 ? { point1: rp(seg.point1) } : {}),
      ...(seg.point2 ? { point2: rp(seg.point2) } : {}),
    };
  }

  // ── RECTANGLE ──────────────────────────────────────────────────────────────
  // A rotated rectangle can no longer be stored as topLeft/bottomRight —
  // convert to 4 line segments
  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    const tr = { x: br.x, y: tl.y };
    const bl = { x: tl.x, y: br.y };
    const corners = [tl, tr, br, bl].map(rp);
    return [
      { type:'line', startPoint: corners[0], endPoint: corners[1] },
      { type:'line', startPoint: corners[1], endPoint: corners[2] },
      { type:'line', startPoint: corners[2], endPoint: corners[3] },
      { type:'line', startPoint: corners[3], endPoint: corners[0] },
    ];
  }

  return seg;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY ROTATE — replace selected segments with rotated versions
// ─────────────────────────────────────────────────────────────────────────────

export function applyRotate(shapeList, selectedIndices, bx, by, angle) {
  const result = [...shapeList];

  // Collect indices that need to expand (rectangles → 4 lines)
  // Process in reverse so splice indices stay valid
  const toExpand = [];

  selectedIndices.forEach(i => {
    const rotated = rotateSegment(shapeList[i], bx, by, angle);
    if (Array.isArray(rotated)) {
      toExpand.push({ i, lines: rotated });
    } else {
      result[i] = rotated;
    }
  });

  // Replace rectangles with their 4 rotated lines (reverse order)
  toExpand.sort((a, b) => b.i - a.i);
  toExpand.forEach(({ i, lines }) => {
    result.splice(i, 1, ...lines);
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE ANGLE — from base point to two drag positions
// Returns the delta angle between reference drag and current drag
// ─────────────────────────────────────────────────────────────────────────────

export function computeRotationAngle(bx, by, refX, refY, curX, curY) {
  const refAngle = Math.atan2(refY - by, refX - bx);
  const curAngle = Math.atan2(curY - by, curX - bx);
  return curAngle - refAngle;
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAP ANGLE — snap to nearest multiple of snapDeg (default 15°)
// ─────────────────────────────────────────────────────────────────────────────

export function snapAngle(angle, snapDeg = 15) {
  const snapRad = snapDeg * (Math.PI / 180);
  return Math.round(angle / snapRad) * snapRad;
}

export function radToDeg(rad) {
  return ((rad * 180 / Math.PI) % 360 + 360) % 360;
}