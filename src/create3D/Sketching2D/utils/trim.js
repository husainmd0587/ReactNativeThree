import {
  lineLineIntersect, lineCircleIntersect, lineArcIntersect,
  circleCircleIntersect, angleToT,
} from './intersect';

const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// Explode rectangle into 4 line segments
function rectToLines(seg) {
  const { topLeft: tl, bottomRight: br } = seg;
  return [
    { type:'line', startPoint: tl,                    endPoint: { x:br.x, y:tl.y } },
    { type:'line', startPoint: { x:br.x, y:tl.y },    endPoint: br                  },
    { type:'line', startPoint: br,                    endPoint: { x:tl.x, y:br.y } },
    { type:'line', startPoint: { x:tl.x, y:br.y },    endPoint: tl                  },
  ];
}

// All t-values on `seg` where it intersects `other`
function getIntersectionTs(seg, other) {
  // Expand rectangles on both sides
  const segs  = seg.type  === 'rectangle' ? rectToLines(seg)   : [seg];
  const others = other.type === 'rectangle' ? rectToLines(other) : [other];

  const ts = [];
  for (const s of segs) {
    for (const o of others) {
      ts.push(..._intersectPair(s, o));
    }
  }
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
      if (seg.type === 'circle') {
        return norm(angle) / TAU;  // t in [0..1] around full circle
      }
      return angleToT(angle, seg.startAngle, seg.endAngle, seg.clockwise);
    }).filter(t => t >= 0 && t <= 1);
  }

  return [];
}

// Deduplicate sorted t values within epsilon
function dedupTs(ts, eps = 0.005) {
  const sorted = [...ts].sort((a, b) => a - b);
  return sorted.filter((t, i) => i === 0 || t - sorted[i - 1] > eps);
}

// Compute t of a tap point on the given segment
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

  return 0.5; // fallback
}

// Produce the segments that survive trimming between tLow..tHigh
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
    // Convert circle to arc that spans the surviving portions
    const trimStart = tLow  * TAU;  // angle at tLow
    const trimEnd   = tHigh * TAU;  // angle at tHigh
    const result = [];
    if (tLow > EPS || tHigh < 1 - EPS) {
      // One arc: from tHigh angle → tLow angle (the surviving part, going CW)
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

export function applyTrim(shapeList, tappedIndex, tapX, tapY) {
  const seg = shapeList[tappedIndex];

  // Collect all intersection t values with every other segment
  const rawTs = [];
  shapeList.forEach((other, i) => {
    if (i === tappedIndex) return;
    getIntersectionTs(seg, other).forEach(t => rawTs.push(t));
  });

  if (rawTs.length === 0) return shapeList;

  const ts = dedupTs(rawTs);
  const tapT = tapTOnSegment(seg, tapX, tapY);

  // Find bracket around tap point
  let tLow  = 0;
  let tHigh = 1;
  for (const t of ts) { if (t < tapT - 0.005) tLow  = t; }
  for (const t of [...ts].reverse()) { if (t > tapT + 0.005) { tHigh = t; break; } }

  const replacements = trimSegment(seg, tLow, tHigh);
  return [
    ...shapeList.slice(0, tappedIndex),
    ...replacements,
    ...shapeList.slice(tappedIndex + 1),
  ];
}