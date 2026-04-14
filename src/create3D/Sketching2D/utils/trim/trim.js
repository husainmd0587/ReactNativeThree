import {  lineLineIntersect, lineCircleIntersect, lineArcIntersect,  circleCircleIntersect, angleToT,} from './intersect';

const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

function rectToLines(seg) {
  const { topLeft: tl, bottomRight: br } = seg;
  return [
    { type: 'line', startPoint: tl,                    endPoint: { x: br.x, y: tl.y } },
    { type: 'line', startPoint: { x: br.x, y: tl.y },  endPoint: br                   },
    { type: 'line', startPoint: br,                    endPoint: { x: tl.x, y: br.y } },
    { type: 'line', startPoint: { x: tl.x, y: br.y },  endPoint: tl                   },
  ];
}

function getIntersectionTs(seg, other) {
  const segs   = seg.type   === 'rectangle' ? rectToLines(seg)   : [seg];
  const others = other.type === 'rectangle' ? rectToLines(other) : [other];
  const ts = [];
  for (const s of segs)
    for (const o of others)
      ts.push(..._intersectPair(s, o));
  return ts;
}

function _intersectPair(seg, other) {
  if (seg.type === 'line') {
    if (other.type === 'line')   return lineLineIntersect(seg, other);
    if (other.type === 'arc')    return lineArcIntersect(seg, other);
    if (other.type === 'circle') return lineCircleIntersect(seg, other);
  }
  if (seg.type === 'arc' || seg.type === 'circle') {
    let pts = [];
    if (other.type === 'line') {
      pts = lineCircleIntersect(other, seg).map(t => ({
        x: other.startPoint.x + t * (other.endPoint.x - other.startPoint.x),
        y: other.startPoint.y + t * (other.endPoint.y - other.startPoint.y),
      }));
    } else if (other.type === 'arc' || other.type === 'circle') {
      pts = circleCircleIntersect(seg, other);
    }
    return pts.map(pt => {
      const angle = Math.atan2(pt.y - seg.center.y, pt.x - seg.center.x);
      if (seg.type === 'circle') return norm(angle) / TAU;
      return angleToT(angle, seg.startAngle, seg.endAngle, seg.clockwise);
    }).filter(t => t >= 0 && t <= 1);
  }
  return [];
}

function dedupTs(ts, eps = 0.005) {
  const sorted = [...ts].sort((a, b) => a - b);
  return sorted.filter((t, i) => i === 0 || t - sorted[i - 1] > eps);
}

function tapTOnSegment(seg, tapX, tapY) {
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-9) return 0;
    const t = ((tapX - seg.startPoint.x) * dx + (tapY - seg.startPoint.y) * dy) / lenSq;
    return Math.max(0, Math.min(1, t));
  }
  if (seg.type === 'arc') {
    const angle = Math.atan2(tapY - seg.center.y, tapX - seg.center.x);
    return angleToT(angle, seg.startAngle, seg.endAngle, seg.clockwise);
  }
  if (seg.type === 'circle') {
    const angle = Math.atan2(tapY - seg.center.y, tapX - seg.center.x);
    return norm(angle) / TAU;
  }
  return 0.5;
}

function distPointToLine(px, py, seg) {
  const dx = seg.endPoint.x - seg.startPoint.x;
  const dy = seg.endPoint.y - seg.startPoint.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - seg.startPoint.x, py - seg.startPoint.y);
  let t = ((px - seg.startPoint.x) * dx + (py - seg.startPoint.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (seg.startPoint.x + t * dx), py - (seg.startPoint.y + t * dy));
}

function trimSegment(seg, tLow, tHigh) {
  const EPS = 0.005;

  if (seg.type === 'line') {
    const lerp = (a, b, t) => a + (b - a) * t;
    const result = [];
    if (tLow > EPS) {
      result.push({
        type: 'line',
        startPoint: seg.startPoint,
        endPoint: {
          x: lerp(seg.startPoint.x, seg.endPoint.x, tLow),
          y: lerp(seg.startPoint.y, seg.endPoint.y, tLow),
        },
      });
    }
    if (tHigh < 1 - EPS) {
      result.push({
        type: 'line',
        startPoint: {
          x: lerp(seg.startPoint.x, seg.endPoint.x, tHigh),
          y: lerp(seg.startPoint.y, seg.endPoint.y, tHigh),
        },
        endPoint: seg.endPoint,
      });
    }
    return result;
  }

  if (seg.type === 'arc') {
    const sweep = seg.clockwise
      ? ((seg.endAngle - seg.startAngle + TAU) % TAU)
      : -((seg.startAngle - seg.endAngle + TAU) % TAU);
    const angleAt = (t) => seg.startAngle + t * sweep;
    const result = [];
    if (tLow > EPS)
      result.push({ ...seg, endAngle: angleAt(tLow) });
    if (tHigh < 1 - EPS)
      result.push({ ...seg, startAngle: angleAt(tHigh) });
    return result;
  }

  if (seg.type === 'circle') {
    const trimStart = tLow  * TAU;
    const trimEnd   = tHigh * TAU;
    const result = [];
    if (tLow > EPS || tHigh < 1 - EPS) {
      result.push({
        ...seg,
        type:       'arc',
        startAngle: trimEnd,
        endAngle:   trimStart,
        clockwise:  true,
        startPoint: {
          x: seg.center.x + seg.radius * Math.cos(trimEnd),
          y: seg.center.y + seg.radius * Math.sin(trimEnd),
        },
        endPoint: {
          x: seg.center.x + seg.radius * Math.cos(trimStart),
          y: seg.center.y + seg.radius * Math.sin(trimStart),
        },
      });
    }
    return result;
  }

  return [seg];
}

// ── NEW: trim a rectangle by exploding it, trimming the tapped edge only ──
function applyTrimToRect(shapeList, rectIndex, tapX, tapY) {
  const rect  = shapeList[rectIndex];
  const edges = rectToLines(rect);

  // Find which edge the tap landed on (closest edge wins)
  let closestEdgeIdx = 0;
  let closestDist    = Infinity;
  edges.forEach((edge, i) => {
    const d = distPointToLine(tapX, tapY, edge);
    if (d < closestDist) { closestDist = d; closestEdgeIdx = i; }
  });

  const tappedEdge = edges[closestEdgeIdx];

  // Collect intersection t-values on the tapped edge from every other shape
  // (including the other 3 edges of the same rectangle)
  const otherEdges = edges.filter((_, i) => i !== closestEdgeIdx);
  const rawTs = [];

  // intersections with other 3 edges of the rect (corner t-values: 0 and 1 always)
  // — we skip these because corners are always at t=0/1 and dedupTs handles it

  // intersections with every other shape in the list
  shapeList.forEach((other, i) => {
    if (i === rectIndex) return;
    getIntersectionTs(tappedEdge, other).forEach(t => rawTs.push(t));
  });

  // Also intersect the tapped edge against the two adjacent rect edges
  // so corner t-values (0 and 1) act as natural boundaries — already handled
  // by tLow=0 / tHigh=1 defaults, no extra work needed.

  const tapT = tapTOnSegment(tappedEdge, tapX, tapY);
  const EPS  = 0.005;

  let tLow  = 0;
  let tHigh = 1;

  if (rawTs.length > 0) {
    const ts = dedupTs(rawTs);
    for (const t of ts) {
      if (t < tapT - EPS) tLow = t;
    }
    for (const t of ts) {
      if (t > tapT + EPS) { tHigh = t; break; }
    }
  }
  // If no intersections on this edge → delete just this edge (not whole rect)

  const trimmedEdge = trimSegment(tappedEdge, tLow, tHigh);

  // Replace the rectangle with: 3 surviving edges + trimmed pieces of tapped edge
  const survivingEdges = otherEdges;           // the 3 untouched edges
  const replacements   = [...survivingEdges, ...trimmedEdge];

  return [
    ...shapeList.slice(0, rectIndex),
    ...replacements,
    ...shapeList.slice(rectIndex + 1),
  ];
}

export function applyTrim(shapeList, tappedIndex, tapX, tapY) {
  const seg = shapeList[tappedIndex];

  // ── Rectangle: special path ───────────────────────────────────────────────
  if (seg.type === 'rectangle') {
    return applyTrimToRect(shapeList, tappedIndex, tapX, tapY);
  }

  // ── All other types ───────────────────────────────────────────────────────
  const rawTs = [];
  shapeList.forEach((other, i) => {
    if (i === tappedIndex) return;
    getIntersectionTs(seg, other).forEach(t => rawTs.push(t));
  });

  if (rawTs.length === 0) {
    return [
      ...shapeList.slice(0, tappedIndex),
      ...shapeList.slice(tappedIndex + 1),
    ];
  }

  const ts   = dedupTs(rawTs);
  const tapT = tapTOnSegment(seg, tapX, tapY);
  const EPS  = 0.005;
  let tLow   = 0;
  let tHigh  = 1;

  for (const t of ts) {
    if (t < tapT - EPS) tLow = t;
  }
  for (const t of ts) {
    if (t > tapT + EPS) { tHigh = t; break; }
  }

  const replacements = trimSegment(seg, tLow, tHigh);
  return [
    ...shapeList.slice(0, tappedIndex),
    ...replacements,
    ...shapeList.slice(tappedIndex + 1),
  ];
}