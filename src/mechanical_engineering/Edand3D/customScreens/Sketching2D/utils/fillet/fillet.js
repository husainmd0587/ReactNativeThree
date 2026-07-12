// utils/fillet.js
// ─── keep-side helper: which end of the segment is the tap on? ───────────────
function keepSideFromTap(tapX, tapY, seg, trimT) {
  // midpoint of the "start" portion [0..trimT]
  const midStart = lerpLine(seg, trimT / 2);
  // midpoint of the "end" portion [trimT..1]
  const midEnd   = lerpLine(seg, (trimT + 1) / 2);

  const dStart = Math.hypot(tapX - midStart.x, tapY - midStart.y);
  const dEnd   = Math.hypot(tapX - midEnd.x,   tapY - midEnd.y);

  return dStart < dEnd ? 'start' : 'end';
}
const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Find intersection point of two INFINITE lines (not bounded to segment)
function infiniteLineIntersect(a, b) {
  const dx1 = a.endPoint.x - a.startPoint.x;
  const dy1 = a.endPoint.y - a.startPoint.y;
  const dx2 = b.endPoint.x - b.startPoint.x;
  const dy2 = b.endPoint.y - b.startPoint.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null;  // parallel
  const dx3 = b.startPoint.x - a.startPoint.x;
  const dy3 = b.startPoint.y - a.startPoint.y;
  const t = (dx3 * dy2 - dy3 * dx2) / denom;
  return {
    x: a.startPoint.x + t * dx1,
    y: a.startPoint.y + t * dy1,
    t,  // t on line a
  };
}

// Unit direction vector of a line segment
function lineDir(seg) {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len, len };
}

// Distance from point to infinite line
function distPointToInfiniteLine(px, py, seg) {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Infinity;
  return Math.abs((py - seg.startPoint.y) * dx - (px - seg.startPoint.x) * dy) / len;
}

// Project point onto line, return t [0..1]
function projectPointOnLine(px, py, seg) {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return 0;
  return ((px - seg.startPoint.x) * dx + (py - seg.startPoint.y) * dy) / lenSq;
}

// Lerp on a line segment
function lerpLine(seg, t) {
  return {
    x: seg.startPoint.x + t * (seg.endPoint.x - seg.startPoint.x),
    y: seg.startPoint.y + t * (seg.endPoint.y - seg.startPoint.y),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECTANGLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Explode rect into 4 named edges with corner identity
function rectToNamedEdges(seg) {
  const { topLeft: tl, bottomRight: br } = seg;
  const tr = { x: br.x, y: tl.y };
  const bl = { x: tl.x, y: br.y };
  return [
    { type:'line', startPoint: tl, endPoint: tr, _edgeName:'top'    },
    { type:'line', startPoint: tr, endPoint: br, _edgeName:'right'  },
    { type:'line', startPoint: br, endPoint: bl, _edgeName:'bottom' },
    { type:'line', startPoint: bl, endPoint: tl, _edgeName:'left'   },
  ];
}

// Find which corner of rect is nearest to tap
// Returns { cornerName, edges: [edgeA, edgeB], cornerPt }
function getNearestRectCorner(seg, tapX, tapY) {
  const { topLeft: tl, bottomRight: br } = seg;
  const tr = { x: br.x, y: tl.y };
  const bl = { x: tl.x, y: br.y };

  const corners = [
    { name: 'TL', pt: tl, edgeNames: ['left',  'top'   ] },
    { name: 'TR', pt: tr, edgeNames: ['top',   'right' ] },
    { name: 'BR', pt: br, edgeNames: ['right', 'bottom'] },
    { name: 'BL', pt: bl, edgeNames: ['bottom','left'  ] },
  ];

  const edges = rectToNamedEdges(seg);
  const edgeMap = {};
  edges.forEach(e => { edgeMap[e._edgeName] = e; });

  let nearest = null;
  let nearestDist = Infinity;
  for (const c of corners) {
    const d = Math.hypot(tapX - c.pt.x, tapY - c.pt.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = {
        cornerName: c.name,
        cornerPt:   c.pt,
        edgeA:      edgeMap[c.edgeNames[0]],
        edgeB:      edgeMap[c.edgeNames[1]],
      };
    }
  }
  return nearest;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILLET CORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute fillet arc between two lines meeting at a corner.
 * Returns { arcSeg, tA, tB, cornerPt }
 *   tA = trim t on lineA, tB = trim t on lineB
 *   arcSeg = the connecting arc
 */
function computeFillet(lineA, lineB, radius, tapAx, tapAy, tapBx, tapBy) {
  // 1. Find corner (infinite line intersection)
  const corner = infiniteLineIntersect(lineA, lineB);
  if (!corner) return null;  // parallel lines

  const dirA = lineDir(lineA);
  const dirB = lineDir(lineB);

  // 2. Determine which direction from corner each line runs
  //    (toward the tapped portion, i.e. away from corner)
  const tA_corner = projectPointOnLine(corner.x, corner.y, lineA);
  const tB_corner = projectPointOnLine(corner.x, corner.y, lineB);

  // Tap t on each line
  const tA_tap = projectPointOnLine(tapAx, tapAy, lineA);
  const tB_tap = projectPointOnLine(tapBx, tapBy, lineB);

  // Directions from corner toward tapped side
  const signA = tA_tap > tA_corner ? 1 : -1;
  const signB = tB_tap > tB_corner ? 1 : -1;

  // Unit vecs from corner outward on each line
  const uA = { x: dirA.x * signA, y: dirA.y * signA };
  const uB = { x: dirB.x * signB, y: dirB.y * signB };

  // 3. Angle bisector → fillet center lies on it
  const bisect = {
    x: uA.x + uB.x,
    y: uA.y + uB.y,
  };
  const bisectLen = Math.hypot(bisect.x, bisect.y);
  if (bisectLen < 1e-9) return null;
  const bisectUnit = { x: bisect.x / bisectLen, y: bisect.y / bisectLen };

  // 4. Distance from corner to tangent points
  const cosHalfAngle = uA.x * bisectUnit.x + uA.y * bisectUnit.y;
  if (Math.abs(cosHalfAngle) < 1e-9) return null;
  const tanDist = radius / Math.tan(Math.acos(
    Math.max(-1, Math.min(1, cosHalfAngle))
  ));

  // 5. Tangent points on each line
  const ptA = {
    x: corner.x + uA.x * tanDist,
    y: corner.y + uA.y * tanDist,
  };
  const ptB = {
    x: corner.x + uB.x * tanDist,
    y: corner.y + uB.y * tanDist,
  };

  // 6. Fillet center = corner + bisector * (radius / sin(halfAngle))
  const sinHalfAngle = Math.sqrt(Math.max(0, 1 - cosHalfAngle * cosHalfAngle));
  if (sinHalfAngle < 1e-9) return null;
  const centerDist = radius / sinHalfAngle;
  const center = {
    x: corner.x + bisectUnit.x * centerDist,
    y: corner.y + bisectUnit.y * centerDist,
  };

  // 7. Start/end angles of fillet arc
  const startAngle = Math.atan2(ptA.y - center.y, ptA.x - center.x);
  const endAngle   = Math.atan2(ptB.y - center.y, ptB.x - center.x);

  // 8. Determine CW/CCW: cross product of (ptA-center) × (ptB-center)
  const cross = (ptA.x - center.x) * (ptB.y - center.y)
              - (ptA.y - center.y) * (ptB.x - center.x);
  const clockwise = cross > 0;

  // 9. t values on original segments for trimming
  const newTA = projectPointOnLine(ptA.x, ptA.y, lineA);
  const newTB = projectPointOnLine(ptB.x, ptB.y, lineB);

  return {
    cornerPt:   corner,
    ptA, ptB,
    center,
    radius,
    startAngle,
    endAngle,
    clockwise,
    tA: newTA,   // trim lineA to this t (on the tapped side)
    tB: newTB,   // trim lineB to this t (on the tapped side)
    signA,
    signB,
    arcSeg: {
      type:       'arc',
      center,
      radius,
      startAngle,
      endAngle,
      clockwise,
      startPoint: ptA,
      endPoint:   ptB,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAMFER CORE
// ─────────────────────────────────────────────────────────────────────────────

function computeChamfer(lineA, lineB, distance, tapAx, tapAy, tapBx, tapBy) {
  const corner = infiniteLineIntersect(lineA, lineB);
  if (!corner) return null;

  const dirA = lineDir(lineA);
  const dirB = lineDir(lineB);

  const tA_corner = projectPointOnLine(corner.x, corner.y, lineA);
  const tB_corner = projectPointOnLine(corner.x, corner.y, lineB);
  const tA_tap    = projectPointOnLine(tapAx, tapAy, lineA);
  const tB_tap    = projectPointOnLine(tapBx, tapBy, lineB);

  const signA = tA_tap > tA_corner ? 1 : -1;
  const signB = tB_tap > tB_corner ? 1 : -1;

  // Chamfer cut points
  const ptA = {
    x: corner.x + dirA.x * signA * distance,
    y: corner.y + dirA.y * signA * distance,
  };
  const ptB = {
    x: corner.x + dirB.x * signB * distance,
    y: corner.y + dirB.y * signB * distance,
  };

  const tA = projectPointOnLine(ptA.x, ptA.y, lineA);
  const tB = projectPointOnLine(ptB.x, ptB.y, lineB);

  return {
    cornerPt: corner,
    ptA, ptB,
    tA, tB,
    signA, signB,
    chamferLine: {
      type:       'line',
      startPoint: ptA,
      endPoint:   ptB,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIM LINE TO T (keep one side)
// ─────────────────────────────────────────────────────────────────────────────

// keepSide: 'start' = keep [0..t], 'end' = keep [t..1]
function trimLineTo(seg, t, keepSide) {
  const pt = lerpLine(seg, t);
  if (keepSide === 'start') {
    return { ...seg, endPoint: pt };
  } else {
    return { ...seg, startPoint: pt };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY FILLET — two regular line segments
// ─────────────────────────────────────────────────────────────────────────────

export function applyFilletToLines(
  shapeList, idxA, idxB,
  tapAx, tapAy, tapBx, tapBy,
  radius
) {
  const lineA = shapeList[idxA];
  const lineB = shapeList[idxB];

  if (lineA.type !== 'line' || lineB.type !== 'line') return shapeList;

  const result = computeFillet(lineA, lineB, radius, tapAx, tapAy, tapBx, tapBy);
  if (!result) return shapeList;

  const { tA, tB,  arcSeg } = result;
  const keepA = keepSideFromTap(tapAx, tapAy, lineA, result.tA);
  const keepB = keepSideFromTap(tapBx, tapBy, lineB, result.tB);
  const trimmedA = trimLineTo(lineA, tA, keepA);
  const trimmedB = trimLineTo(lineB, tB, keepB);

  // Rebuild list: replace both lines + insert arc
  const newList = [...shapeList];
  newList[idxA] = trimmedA;
  newList[idxB] = trimmedB;
  newList.splice(Math.max(idxA, idxB) + 1, 0, arcSeg);
  return newList;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY CHAMFER — two regular line segments
// ─────────────────────────────────────────────────────────────────────────────

// In applyChamferToLines, replace keepSideFromTap with sign-based logic:
export function applyChamferToLines(
  shapeList, idxA, idxB,
  tapAx, tapAy, tapBx, tapBy,
  distance
) {
  const lineA = shapeList[idxA];
  const lineB = shapeList[idxB];

  if (lineA.type !== 'line' || lineB.type !== 'line') return shapeList;

  const result = computeChamfer(lineA, lineB, distance, tapAx, tapAy, tapBx, tapBy);
  if (!result) return shapeList;

  const { tA, tB, signA, signB, chamferLine } = result;
  if (tA < 0 || tA > 1 || tB < 0 || tB > 1) return shapeList;
  // signA > 0 means corner is in the "end" direction from startPoint
  // so the tap is on the "start" side → keep 'start'
const keepA = signA > 0 ? 'end' : 'start';
const keepB = signB > 0 ? 'end' : 'start';

  const trimmedA = trimLineTo(lineA, tA, keepA);
  const trimmedB = trimLineTo(lineB, tB, keepB);

  const newList = [...shapeList];
  newList[idxA] = trimmedA;
  newList[idxB] = trimmedB;
  newList.splice(Math.max(idxA, idxB) + 1, 0, chamferLine);
  return newList;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY FILLET/CHAMFER TO RECTANGLE CORNER
// ─────────────────────────────────────────────────────────────────────────────

function applyCornerToRect(shapeList, rectIdx, tapX, tapY, radius, mode) {
  const rect   = shapeList[rectIdx];
  const corner = getNearestRectCorner(rect, tapX, tapY);
  if (!corner) return shapeList;

  const { edgeA, edgeB } = corner;

  const tapAx = (edgeA.startPoint.x + edgeA.endPoint.x) / 2;
  const tapAy = (edgeA.startPoint.y + edgeA.endPoint.y) / 2;
  const tapBx = (edgeB.startPoint.x + edgeB.endPoint.x) / 2;
  const tapBy = (edgeB.startPoint.y + edgeB.endPoint.y) / 2;

  let result;
  if (mode === 'fillet') {
    result = computeFillet(edgeA, edgeB, radius, tapAx, tapAy, tapBx, tapBy);
  } else {
    result = computeChamfer(edgeA, edgeB, radius, tapAx, tapAy, tapBx, tapBy);
  }
  if (!result) return shapeList;
  if (result.tA < 0 || result.tA > 1 || result.tB < 0 || result.tB > 1) return shapeList;
  let keepA, keepB;
  if (mode === 'fillet') {
    keepA = keepSideFromTap(tapAx, tapAy, edgeA, result.tA);
    keepB = keepSideFromTap(tapBx, tapBy, edgeB, result.tB);
  } else {
    // chamfer: use signA/signB directly — more reliable when corner is outside segment
  keepA = result.signA > 0 ? 'end' : 'start';
  keepB = result.signB > 0 ? 'end' : 'start';
  }

  const trimmedA = trimLineTo(edgeA, result.tA, keepA);
  const trimmedB = trimLineTo(edgeB, result.tB, keepB);

  const allEdges   = rectToNamedEdges(rect);
  const otherEdges = allEdges.filter(
    e => e._edgeName !== edgeA._edgeName && e._edgeName !== edgeB._edgeName
  );

  const connector = mode === 'fillet' ? result.arcSeg : result.chamferLine;
  const replacements = [trimmedA, trimmedB, ...otherEdges, connector];

  return [
    ...shapeList.slice(0, rectIdx),
    ...replacements,
    ...shapeList.slice(rectIdx + 1),
  ];
}
export { applyCornerToRect, rectToNamedEdges, getNearestRectCorner };