// utils/move.js

// ── Translate a single segment by (dx, dy) ───────────────────────────────────
export function translateSegment(seg, dx, dy) {
  const pt = (p) => ({ x: p.x + dx, y: p.y + dy });

  if (seg.type === 'line') {
    return {
      ...seg,
      startPoint: pt(seg.startPoint),
      endPoint:   pt(seg.endPoint),
    };
  }

  if (seg.type === 'arc') {
    return {
      ...seg,
      center:     pt(seg.center),
      startPoint: pt(seg.startPoint),
      endPoint:   pt(seg.endPoint),
      bulgePoint: seg.bulgePoint ? pt(seg.bulgePoint) : undefined,
    };
  }

  if (seg.type === 'circle') {
    return {
      ...seg,
      center: pt(seg.center),
      point1: seg.point1 ? pt(seg.point1) : undefined,
      point2: seg.point2 ? pt(seg.point2) : undefined,
    };
  }

  if (seg.type === 'rectangle') {
    return {
      ...seg,
      topLeft:     pt(seg.topLeft),
      bottomRight: pt(seg.bottomRight),
      corner1:     pt(seg.corner1),
      corner2:     pt(seg.corner2),
    };
  }

  return seg;
}

// ── Translate multiple segments by index ─────────────────────────────────────
export function translateSegments(shapeList, selectedIndices, dx, dy) {
  return shapeList.map((seg, i) =>
    selectedIndices.includes(i) ? translateSegment(seg, dx, dy) : seg
  );
}