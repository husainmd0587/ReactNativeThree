// utils/offset.js

const TAU = 2 * Math.PI;

// ── Offset a single segment by distance d ────────────────────────────────────
// side: 'left' | 'right' relative to the segment direction
// For circles/arcs — inward shrinks radius, outward grows it

export function offsetSegment(seg, distance, side = 'left') {
  const d = side === 'left' ? distance : -distance;

  // ── LINE ───────────────────────────────────────────────────────────────────
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;

    // Normal vector (perpendicular, pointing left of direction)
    const nx = -dy / len;
    const ny =  dx / len;

    return {
      ...seg,
      startPoint: {
        x: seg.startPoint.x + nx * d,
        y: seg.startPoint.y + ny * d,
      },
      endPoint: {
        x: seg.endPoint.x + nx * d,
        y: seg.endPoint.y + ny * d,
      },
    };
  }

  // ── ARC ────────────────────────────────────────────────────────────────────
  if (seg.type === 'arc') {
    // Offset outward = larger radius, inward = smaller
    // For CW arc: left = outward, right = inward
    const newRadius = seg.clockwise
      ? seg.radius + d
      : seg.radius - d;

    if (newRadius <= 0) return null;   // collapsed inward

    return {
      ...seg,
      radius: newRadius,
      startPoint: {
        x: seg.center.x + newRadius * Math.cos(seg.startAngle),
        y: seg.center.y + newRadius * Math.sin(seg.startAngle),
      },
      endPoint: {
        x: seg.center.x + newRadius * Math.cos(seg.endAngle),
        y: seg.center.y + newRadius * Math.sin(seg.endAngle),
      },
    };
  }

  // ── CIRCLE ─────────────────────────────────────────────────────────────────
  if (seg.type === 'circle') {
    const newRadius = seg.radius + d;
    if (newRadius <= 0) return null;
    return { ...seg, radius: newRadius };
  }

  // ── RECTANGLE ──────────────────────────────────────────────────────────────
  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    // Expand outward or shrink inward
    const expand = side === 'left' ? distance : -distance;
    const newTL  = { x: tl.x - expand, y: tl.y - expand };
    const newBR  = { x: br.x + expand, y: br.y + expand };

    // Prevent inversion
    if (newBR.x <= newTL.x || newBR.y <= newTL.y) return null;

    return {
      ...seg,
      topLeft:     newTL,
      bottomRight: newBR,
      corner1:     newTL,
      corner2:     newBR,
    };
  }

  return null;
}

// ── Offset entire shapeList ────────────────────────────────────────────────────
// Returns a new list with offsetted copies ADDED (originals kept)
export function applyOffset(shapeList, distance, side = 'left') {
  const copies = [];

  for (const seg of shapeList) {
    const offsetted = offsetSegment(seg, distance, side);
    if (offsetted) copies.push(offsetted);
  }

  return [...shapeList, ...copies];
}

// ── Offset a SINGLE segment by index ──────────────────────────────────────────
export function applyOffsetSingle(shapeList, segIndex, distance, side = 'left') {
  const seg      = shapeList[segIndex];
  const offsetted = offsetSegment(seg, distance, side);
  if (!offsetted) return shapeList;
  return [...shapeList, offsetted];
}

// ── Determine offset side from tap position relative to segment ───────────────
export function getSideFromTap(seg, tapX, tapY) {
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    // Cross product of direction × (tap - start)
    const cross = dx * (tapY - seg.startPoint.y) - dy * (tapX - seg.startPoint.x);
    return cross > 0 ? 'left' : 'right';
  }

  if (seg.type === 'arc' || seg.type === 'circle') {
    const distToCenter = Math.hypot(tapX - seg.center.x, tapY - seg.center.y);
    return distToCenter > seg.radius ? 'right' : 'left';  // outside or inside
  }

  if (seg.type === 'rectangle') {
    const cx = (seg.topLeft.x + seg.bottomRight.x) / 2;
    const cy = (seg.topLeft.y + seg.bottomRight.y) / 2;
    const distToCenter = Math.hypot(tapX - cx, tapY - cy);
    const halfW = (seg.bottomRight.x - seg.topLeft.x) / 2;
    const halfH = (seg.bottomRight.y - seg.topLeft.y) / 2;
    const innerDist = Math.min(halfW, halfH);
    return distToCenter > innerDist ? 'right' : 'left';
  }

  return 'left';
}