// A rectangle is stored as 4 explicit corners (not 2, and not a bounding
// box) specifically so it can represent ANY orientation, not just
// axis-aligned. Two corners can only ever describe an axis-aligned box —
// rotating a 2-corner rectangle and then re-deriving "left/top/right/
// bottom" from min/max silently collapses the rotation back to a bounding
// box, which is a real, wrong result, not a rendering simplification.
//
// This "local frame" (center + orientation unit vectors u/v + width/
// height) is what makes editing width, editing height, and offsetting
// all trivial regardless of the rectangle's current rotation: convert to
// the frame, change one number, convert back.

export function getRectangleFrame(points) {
  const [p0, p1, p2, p3] = points;
  const widthVec = { x: p1.x - p0.x, y: p1.y - p0.y };
  const heightVec = { x: p3.x - p0.x, y: p3.y - p0.y };
  const width = Math.hypot(widthVec.x, widthVec.y) || 1;
  const height = Math.hypot(heightVec.x, heightVec.y) || 1;
  const u = { x: widthVec.x / width, y: widthVec.y / width };
  const v = { x: heightVec.x / height, y: heightVec.y / height };
  const center = {
    x: (p0.x + p1.x + p2.x + p3.x) / 4,
    y: (p0.y + p1.y + p2.y + p3.y) / 4,
  };
  const angleDeg = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  return { center, u, v, width, height, angleDeg };
}

export function buildRectangleCorners(center, u, v, width, height) {
  const hw = width / 2;
  const hh = height / 2;
  return [
    { x: center.x - u.x * hw - v.x * hh, y: center.y - u.y * hw - v.y * hh },
    { x: center.x + u.x * hw - v.x * hh, y: center.y + u.y * hw - v.y * hh },
    { x: center.x + u.x * hw + v.x * hh, y: center.y + u.y * hw + v.y * hh },
    { x: center.x - u.x * hw + v.x * hh, y: center.y - u.y * hw + v.y * hh },
  ];
}

// Turns the 2 corners a drag produces into 4 explicit corners — new
// rectangles are always created axis-aligned (angle 0), same as real
// AutoCAD's basic RECTANG command.
export function rectangleFromDragCorners(corner1, corner2) {
  return [
    { x: corner1.x, y: corner1.y },
    { x: corner2.x, y: corner1.y },
    { x: corner2.x, y: corner2.y },
    { x: corner1.x, y: corner2.y },
  ];
}
