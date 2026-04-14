// utils/scale.js

// ─────────────────────────────────────────────────────────────────────────────
// CORE MATH
// ─────────────────────────────────────────────────────────────────────────────

// Scale a point relative to a base point by factor f
function scalePoint(pt, bx, by, f) {
  return {
    x: bx + (pt.x - bx) * f,
    y: by + (pt.y - by) * f,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT SCALE
// ─────────────────────────────────────────────────────────────────────────────

export function scaleSegment(seg, bx, by, factor) {
  const sp = (pt) => scalePoint(pt, bx, by, factor);
  const f  = factor;

  // ── LINE ───────────────────────────────────────────────────────────────────
  if (seg.type === 'line') {
    return {
      ...seg,
      startPoint: sp(seg.startPoint),
      endPoint:   sp(seg.endPoint),
    };
  }

  // ── ARC ────────────────────────────────────────────────────────────────────
  if (seg.type === 'arc') {
    return {
      ...seg,
      center:     sp(seg.center),
      radius:     seg.radius * Math.abs(f),   // radius scales by |f|
      startPoint: sp(seg.startPoint),
      endPoint:   sp(seg.endPoint),
      // angles unchanged — only position + radius change
      ...(seg.bulgePoint ? { bulgePoint: sp(seg.bulgePoint) } : {}),
    };
  }

  // ── CIRCLE ─────────────────────────────────────────────────────────────────
  if (seg.type === 'circle') {
    return {
      ...seg,
      center: sp(seg.center),
      radius: seg.radius * Math.abs(f),
      ...(seg.point1 ? { point1: sp(seg.point1) } : {}),
      ...(seg.point2 ? { point2: sp(seg.point2) } : {}),
    };
  }

  // ── RECTANGLE ──────────────────────────────────────────────────────────────
  if (seg.type === 'rectangle') {
    const newTL = sp(seg.topLeft);
    const newBR = sp(seg.bottomRight);
    const newC1 = sp(seg.corner1);
    const newC2 = sp(seg.corner2);
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
// APPLY SCALE — replace selected segments with scaled versions
// ─────────────────────────────────────────────────────────────────────────────

export function applyScale(shapeList, selectedIndices, bx, by, factor) {
  return shapeList.map((seg, i) =>
    selectedIndices.includes(i)
      ? scaleSegment(seg, bx, by, factor)
      : seg
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE SCALE FACTOR
// Distance from base to current drag / distance from base to ref drag
// ─────────────────────────────────────────────────────────────────────────────

export function computeScaleFactor(bx, by, refX, refY, curX, curY) {
  const refDist = Math.hypot(refX - bx, refY - by);
  const curDist = Math.hypot(curX - bx, curY - by);
  if (refDist < 1e-9) return 1;
  return curDist / refDist;
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAP FACTOR — snap to nearest clean factor
// ─────────────────────────────────────────────────────────────────────────────

const SNAP_FACTORS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

export function snapFactor(factor, tolerance = 0.08) {
  for (const f of SNAP_FACTORS) {
    if (Math.abs(factor - f) < tolerance) return f;
  }
  return factor;
}

export function formatFactor(f) {
  return `${Math.round(f * 100) / 100}×`;
}