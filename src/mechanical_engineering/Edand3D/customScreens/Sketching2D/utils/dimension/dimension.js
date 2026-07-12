// utils/dimension.js

const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const DIM_TYPES = {
  LINEAR:    'linear',      // horizontal or vertical distance
  ALIGNED:   'aligned',     // parallel to the measured line
  RADIAL:    'radial',      // radius of arc/circle
  DIAMETER:  'diameter',    // diameter of circle
  ANGULAR:   'angular',     // angle between two lines
  ORDINATE:  'ordinate',    // X or Y distance from origin
  ARC_LEN:   'arc_length',  // arc length along arc
};

export const DIM_SUBTYPES = {
  linear:    ['horizontal', 'vertical'],
  ordinate:  ['x', 'y'],
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DETECT dimension type from a tapped segment
// ─────────────────────────────────────────────────────────────────────────────

export function autoDetectDimType(seg) {
  if (seg.type === 'circle')  return DIM_TYPES.DIAMETER;
  if (seg.type === 'arc')     return DIM_TYPES.RADIAL;
  if (seg.type === 'line')    return DIM_TYPES.ALIGNED;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT MATH
// ─────────────────────────────────────────────────────────────────────────────

export function measureLinear(pt1, pt2, subtype = 'horizontal') {
  if (subtype === 'horizontal') return Math.abs(pt2.x - pt1.x);
  if (subtype === 'vertical')   return Math.abs(pt2.y - pt1.y);
  return Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);
}

export function measureAligned(pt1, pt2) {
  return Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);
}

export function measureRadial(seg) {
  return seg.radius;
}

export function measureDiameter(seg) {
  return seg.radius * 2;
}

export function measureAngular(lineA, lineB) {
  const dirA = Math.atan2(
    lineA.endPoint.y - lineA.startPoint.y,
    lineA.endPoint.x - lineA.startPoint.x
  );
  const dirB = Math.atan2(
    lineB.endPoint.y - lineB.startPoint.y,
    lineB.endPoint.x - lineB.startPoint.x
  );
  let angle = Math.abs(dirA - dirB) * 180 / Math.PI;
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export function measureArcLength(seg) {
  const s = norm(seg.startAngle);
  const e = norm(seg.endAngle);
  let sweep;
  if (seg.clockwise) {
    sweep = s <= e ? e - s : TAU - s + e;
  } else {
    sweep = s >= e ? s - e : TAU - e + s;
  }
  return seg.radius * sweep;
}

export function measureOrdinate(pt, subtype = 'x') {
  return subtype === 'x' ? pt.x : pt.y;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT measurement value to string
// ─────────────────────────────────────────────────────────────────────────────

export function formatDimValue(value, type, decimals = 1) {
  const v = Math.round(value * 10 ** decimals) / 10 ** decimals;
  switch (type) {
    case DIM_TYPES.DIAMETER:  return `⌀${v}`;
    case DIM_TYPES.RADIAL:    return `R${v}`;
    case DIM_TYPES.ANGULAR:   return `${v}°`;
    case DIM_TYPES.ARC_LEN:   return `⌒${v}`;
    default:                  return `${v}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION GEOMETRY — compute all drawing data for each dim type
// Returns { lines[], arcs[], textPt, textAngle, textValue }
// ─────────────────────────────────────────────────────────────────────────────

const ARROW_SIZE  = 6;
const EXT_OFFSET  = 4;   // extension line offset from geometry
const DIM_OFFSET  = 24;  // default offset from geometry to dim line

// Helper: arrow head paths at a point in a direction
function arrowAt(px, py, angleDeg) {
  const rad  = angleDeg * Math.PI / 180;
  const size = ARROW_SIZE;
  return [
    { x: px + size * Math.cos(rad + 2.8), y: py + size * Math.sin(rad + 2.8) },
    { x: px, y: py },
    { x: px + size * Math.cos(rad - 2.8), y: py + size * Math.sin(rad - 2.8) },
  ];
}

// ── LINEAR ───────────────────────────────────────────────────────────────────
export function computeLinearDim(pt1, pt2, offset, subtype = 'horizontal') {
  let p1, p2, dimPt1, dimPt2;

  if (subtype === 'horizontal') {
    // Project both points to same Y (pt1.y + offset)
    const dimY = Math.min(pt1.y, pt2.y) - offset;
    p1     = { x: pt1.x, y: pt1.y };
    p2     = { x: pt2.x, y: pt2.y };
    dimPt1 = { x: pt1.x, y: dimY };
    dimPt2 = { x: pt2.x, y: dimY };
    const midX = (dimPt1.x + dimPt2.x) / 2;
    return {
      extLines: [
        [{ x: p1.x, y: p1.y - EXT_OFFSET }, dimPt1],
        [{ x: p2.x, y: p2.y - EXT_OFFSET }, dimPt2],
      ],
      dimLine:  [dimPt1, dimPt2],
      textPt:   { x: midX, y: dimY - 8 },
      textAngle: 0,
      arrows:   [arrowAt(dimPt1.x, dimPt1.y, 0), arrowAt(dimPt2.x, dimPt2.y, 180)],
      value:    measureLinear(pt1, pt2, 'horizontal'),
    };
  }

  if (subtype === 'vertical') {
    const dimX = Math.min(pt1.x, pt2.x) - offset;
    p1     = { x: pt1.x, y: pt1.y };
    p2     = { x: pt2.x, y: pt2.y };
    dimPt1 = { x: dimX, y: pt1.y };
    dimPt2 = { x: dimX, y: pt2.y };
    const midY = (dimPt1.y + dimPt2.y) / 2;
    return {
      extLines: [
        [{ x: p1.x - EXT_OFFSET, y: p1.y }, dimPt1],
        [{ x: p2.x - EXT_OFFSET, y: p2.y }, dimPt2],
      ],
      dimLine:  [dimPt1, dimPt2],
      textPt:   { x: dimX - 8, y: midY },
      textAngle: -90,
      arrows:   [arrowAt(dimPt1.x, dimPt1.y, 90), arrowAt(dimPt2.x, dimPt2.y, 270)],
      value:    measureLinear(pt1, pt2, 'vertical'),
    };
  }
}

// ── ALIGNED ──────────────────────────────────────────────────────────────────
export function computeAlignedDim(pt1, pt2, offset) {
  const dx     = pt2.x - pt1.x;
  const dy     = pt2.y - pt1.y;
  const len    = Math.hypot(dx, dy);
  if (len < 1e-9) return null;

  const ux     = dx / len;
  const uy     = dy / len;
  // Perpendicular (left of direction)
  const nx     = -uy;
  const ny     =  ux;
  const angleDeg = Math.atan2(uy, ux) * 180 / Math.PI;

  const dimPt1 = { x: pt1.x + nx * offset, y: pt1.y + ny * offset };
  const dimPt2 = { x: pt2.x + nx * offset, y: pt2.y + ny * offset };
  const midX   = (dimPt1.x + dimPt2.x) / 2;
  const midY   = (dimPt1.y + dimPt2.y) / 2;

  return {
    extLines: [
      [{ x: pt1.x + nx * EXT_OFFSET, y: pt1.y + ny * EXT_OFFSET }, dimPt1],
      [{ x: pt2.x + nx * EXT_OFFSET, y: pt2.y + ny * EXT_OFFSET }, dimPt2],
    ],
    dimLine:  [dimPt1, dimPt2],
    textPt:   { x: midX + nx * 8, y: midY + ny * 8 },
    textAngle: angleDeg,
    arrows:   [
      arrowAt(dimPt1.x, dimPt1.y, angleDeg),
      arrowAt(dimPt2.x, dimPt2.y, angleDeg + 180),
    ],
    value:    len,
  };
}

// ── RADIAL ───────────────────────────────────────────────────────────────────
export function computeRadialDim(seg, tapX, tapY) {
  const angle   = Math.atan2(tapY - seg.center.y, tapX - seg.center.x);
  const edgePt  = {
    x: seg.center.x + seg.radius * Math.cos(angle),
    y: seg.center.y + seg.radius * Math.sin(angle),
  };
  // Clamp so leader is always visible even on tiny circles
  const leaderDist = Math.max(seg.radius + DIM_OFFSET, seg.radius * 1.3);
  const leaderEnd  = {
    x: seg.center.x + leaderDist * Math.cos(angle),
    y: seg.center.y + leaderDist * Math.sin(angle),
  };
  const angleDeg = angle * 180 / Math.PI;

  return {
    extLines:  [],
    dimLine:   [seg.center, edgePt],
    leaderEnd,
    textPt:    leaderEnd,
    textAngle: 0,
    arrows:    [arrowAt(edgePt.x, edgePt.y, angleDeg)],
    value:     seg.radius,
    type:      DIM_TYPES.RADIAL,
  };
}

// ── DIAMETER ─────────────────────────────────────────────────────────────────
export function computeDiameterDim(seg, tapX, tapY) {
  const angle  = Math.atan2(tapY - seg.center.y, tapX - seg.center.x);
  const pt1    = {
    x: seg.center.x + seg.radius * Math.cos(angle),
    y: seg.center.y + seg.radius * Math.sin(angle),
  };
  const pt2    = {
    x: seg.center.x + seg.radius * Math.cos(angle + Math.PI),
    y: seg.center.y + seg.radius * Math.sin(angle + Math.PI),
  };
  const midX   = (pt1.x + pt2.x) / 2;
  const midY   = (pt1.y + pt2.y) / 2;
  const angleDeg = angle * 180 / Math.PI;

  return {
    extLines: [],
    dimLine:  [pt1, pt2],
    textPt:   { x: midX, y: midY - 10 },
    textAngle: angleDeg,
    arrows:   [
      arrowAt(pt1.x, pt1.y, angleDeg + 180),
      arrowAt(pt2.x, pt2.y, angleDeg),
    ],
    value:    seg.radius * 2,
    type:     DIM_TYPES.DIAMETER,
  };
}

// ── ANGULAR ──────────────────────────────────────────────────────────────────
export function computeAngularDim(lineA, lineB, tapX, tapY) {
  // Find intersection of the two lines (infinite)
  const dx1 = lineA.endPoint.x - lineA.startPoint.x;
  const dy1 = lineA.endPoint.y - lineA.startPoint.y;
  const dx2 = lineB.endPoint.x - lineB.startPoint.x;
  const dy2 = lineB.endPoint.y - lineB.startPoint.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null;

  const dx3 = lineB.startPoint.x - lineA.startPoint.x;
  const dy3 = lineB.startPoint.y - lineA.startPoint.y;
  const t   = (dx3 * dy2 - dy3 * dx2) / denom;
  const vertex = {
    x: lineA.startPoint.x + t * dx1,
    y: lineA.startPoint.y + t * dy1,
  };

  const angleA   = Math.atan2(dy1, dx1);
  const angleB   = Math.atan2(dy2, dx2);
  let   sweep    = angleB - angleA;
  if (sweep < 0) sweep += TAU;
  if (sweep > Math.PI) sweep = TAU - sweep;

  const arcR     = Math.hypot(tapX - vertex.x, tapY - vertex.y);
  const midAngle = angleA + sweep / 2;
  const textPt   = {
    x: vertex.x + (arcR + 12) * Math.cos(midAngle),
    y: vertex.y + (arcR + 12) * Math.sin(midAngle),
  };

  return {
    extLines:  [],
    dimLine:   null,
    vertex,
    arcR,
    startAngle: angleA,
    endAngle:   angleB,
    clockwise:  true,
    textPt,
    textAngle:  0,
    arrows:    [
      arrowAt(
        vertex.x + arcR * Math.cos(angleA),
        vertex.y + arcR * Math.sin(angleA),
        (angleA + Math.PI / 2) * 180 / Math.PI
      ),
      arrowAt(
        vertex.x + arcR * Math.cos(angleB),
        vertex.y + arcR * Math.sin(angleB),
        (angleB - Math.PI / 2) * 180 / Math.PI
      ),
    ],
    value:     sweep * 180 / Math.PI,
    type:      DIM_TYPES.ANGULAR,
  };
}

// ── ORDINATE ─────────────────────────────────────────────────────────────────
export function computeOrdinateDim(pt, offset, subtype = 'x') {
  const isX    = subtype === 'x';
  const origin = { x: 0, y: 0 };
  const leaderStart = pt;
  const leaderEnd   = isX
    ? { x: pt.x + offset, y: pt.y }
    : { x: pt.x, y: pt.y + offset };

  return {
    extLines: [],
    dimLine:  [leaderStart, leaderEnd],
    textPt:   leaderEnd,
    textAngle: 0,
    arrows:   [],
    value:    isX ? pt.x : pt.y,
    type:     DIM_TYPES.ORDINATE,
  };
}

// ── ARC LENGTH ───────────────────────────────────────────────────────────────
export function computeArcLengthDim(seg, offset) {
  const s     = norm(seg.startAngle);
  const e     = norm(seg.endAngle);
  let sweep;
  if (seg.clockwise) {
    sweep = s <= e ? e - s : TAU - s + e;
  } else {
    sweep = s >= e ? s - e : TAU - e + s;
  }

  const midAngle = s + (seg.clockwise ? 1 : -1) * sweep / 2;
  const outerR   = seg.radius + offset;

  const pt1 = {
    x: seg.center.x + seg.radius * Math.cos(s),
    y: seg.center.y + seg.radius * Math.sin(s),
  };
  const pt2 = {
    x: seg.center.x + seg.radius * Math.cos(e),
    y: seg.center.y + seg.radius * Math.sin(e),
  };
  const dimPt1 = {
    x: seg.center.x + outerR * Math.cos(s),
    y: seg.center.y + outerR * Math.sin(s),
  };
  const dimPt2 = {
    x: seg.center.x + outerR * Math.cos(e),
    y: seg.center.y + outerR * Math.sin(e),
  };
  const textPt = {
    x: seg.center.x + (outerR + 10) * Math.cos(midAngle),
    y: seg.center.y + (outerR + 10) * Math.sin(midAngle),
  };

  return {
    extLines:  [[pt1, dimPt1], [pt2, dimPt2]],
    dimLine:   null,
    dimArc:    { center: seg.center, radius: outerR, startAngle: s, endAngle: e, clockwise: seg.clockwise },
    textPt,
    textAngle: 0,
    arrows:    [
      arrowAt(dimPt1.x, dimPt1.y, (s + (seg.clockwise ? 1 : -1) * Math.PI / 2) * 180 / Math.PI),
      arrowAt(dimPt2.x, dimPt2.y, (e - (seg.clockwise ? 1 : -1) * Math.PI / 2) * 180 / Math.PI),
    ],
    value:     seg.radius * sweep,
    type:      DIM_TYPES.ARC_LEN,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL DIM BUILDER — given a dim record, return geometry
// ─────────────────────────────────────────────────────────────────────────────

export function buildDimGeometry(dim) {
  switch (dim.dimType) {
    case DIM_TYPES.LINEAR:
      return computeLinearDim(dim.pt1, dim.pt2, dim.offset ?? DIM_OFFSET, dim.subtype ?? 'horizontal');
    case DIM_TYPES.ALIGNED:
      return computeAlignedDim(dim.pt1, dim.pt2, dim.offset ?? DIM_OFFSET);
    case DIM_TYPES.RADIAL:
      return computeRadialDim(dim.seg, dim.tapX, dim.tapY);
    case DIM_TYPES.DIAMETER:
      return computeDiameterDim(dim.seg, dim.tapX, dim.tapY);
    case DIM_TYPES.ANGULAR:
      return computeAngularDim(dim.segA, dim.segB, dim.tapX, dim.tapY);
    case DIM_TYPES.ORDINATE:
      return computeOrdinateDim(dim.pt1, dim.offset ?? DIM_OFFSET, dim.subtype ?? 'x');
    case DIM_TYPES.ARC_LEN:
      return computeArcLengthDim(dim.seg, dim.offset ?? DIM_OFFSET);
    default:
      return null;
  }
}