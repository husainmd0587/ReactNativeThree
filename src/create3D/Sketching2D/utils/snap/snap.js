// utils/snap.js
import {   getActiveGridSize,
  snapToGrid,
  resolveSnap, } from "../../components/grid";


const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// ─────────────────────────────────────────────────────────────────────────────
// SNAP TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const SNAP_TYPES = {
  ENDPOINT:     'endpoint',
  MIDPOINT:     'midpoint',
  CENTER:       'center',
  INTERSECTION: 'intersection',
  PERPENDICULAR:'perpendicular',
  TANGENT:      'tangent',
  NEAREST:      'nearest',
};

// Snap marker colors per type
export const SNAP_COLORS = {
  endpoint:      '#ff4444',   // red square
  midpoint:      '#ff9900',   // orange triangle
  center:        '#ffff00',   // yellow circle
  intersection:  '#00ffff',   // cyan X
  perpendicular: '#00ff88',   // green L
  tangent:       '#aa44ff',   // purple T
  nearest:       '#ffffff',   // white dot
};

// Snap marker shapes per type
export const SNAP_SHAPES = {
  endpoint:      'square',
  midpoint:      'triangle',
  center:        'circle',
  intersection:  'cross',
  perpendicular: 'L',
  tangent:       'T',
  nearest:       'dot',
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SNAP SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SNAP_SETTINGS = {
  enabled:       true,
  radius:        20,           // snap radius in world units
  endpoint:      true,
  midpoint:      true,
  center:        true,
  intersection:  true,
  perpendicular: true,
  tangent:       true,
  nearest:       true,
};

// ─────────────────────────────────────────────────────────────────────────────
// SNAP CANDIDATE COLLECTORS
// ─────────────────────────────────────────────────────────────────────────────

function collectEndpoints(seg) {
  const pts = [];
  if (seg.type === 'line') {
    pts.push({ x: seg.startPoint.x, y: seg.startPoint.y });
    pts.push({ x: seg.endPoint.x,   y: seg.endPoint.y   });
  }
  if (seg.type === 'arc') {
    pts.push({
      x: seg.center.x + seg.radius * Math.cos(seg.startAngle),
      y: seg.center.y + seg.radius * Math.sin(seg.startAngle),
    });
    pts.push({
      x: seg.center.x + seg.radius * Math.cos(seg.endAngle),
      y: seg.center.y + seg.radius * Math.sin(seg.endAngle),
    });
  }
  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    pts.push(tl);
    pts.push({ x: br.x, y: tl.y });
    pts.push(br);
    pts.push({ x: tl.x, y: br.y });
  }
  return pts.map(p => ({ ...p, type: SNAP_TYPES.ENDPOINT }));
}

function collectMidpoints(seg) {
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  if (seg.type === 'line') {
    return [{
      ...mid(seg.startPoint, seg.endPoint),
      type: SNAP_TYPES.MIDPOINT,
    }];
  }

  if (seg.type === 'arc') {
    // Midpoint = midangle of the arc sweep
    const s = norm(seg.startAngle);
    const e = norm(seg.endAngle);
    let midAngle;
    if (seg.clockwise) {
      const sweep = s <= e ? e - s : TAU - s + e;
      midAngle = s + sweep / 2;
    } else {
      const sweep = s >= e ? s - e : TAU - e + s;
      midAngle = s - sweep / 2;
    }
    return [{
      x: seg.center.x + seg.radius * Math.cos(midAngle),
      y: seg.center.y + seg.radius * Math.sin(midAngle),
      type: SNAP_TYPES.MIDPOINT,
    }];
  }

  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    const tr = { x: br.x, y: tl.y };
    const bl = { x: tl.x, y: br.y };
    return [
      { ...mid(tl, tr), type: SNAP_TYPES.MIDPOINT },  // top
      { ...mid(tr, br), type: SNAP_TYPES.MIDPOINT },  // right
      { ...mid(br, bl), type: SNAP_TYPES.MIDPOINT },  // bottom
      { ...mid(bl, tl), type: SNAP_TYPES.MIDPOINT },  // left
    ];
  }

  return [];
}

function collectCenters(seg) {
  if (seg.type === 'arc' || seg.type === 'circle') {
    return [{ x: seg.center.x, y: seg.center.y, type: SNAP_TYPES.CENTER }];
  }
  if (seg.type === 'rectangle') {
    return [{
      x: (seg.topLeft.x + seg.bottomRight.x) / 2,
      y: (seg.topLeft.y + seg.bottomRight.y) / 2,
      type: SNAP_TYPES.CENTER,
    }];
  }
  return [];
}

function collectNearest(seg, px, py) {
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-9) return [];
    const t = Math.max(0, Math.min(1,
      ((px - seg.startPoint.x) * dx + (py - seg.startPoint.y) * dy) / lenSq
    ));
    return [{
      x: seg.startPoint.x + t * dx,
      y: seg.startPoint.y + t * dy,
      type: SNAP_TYPES.NEAREST,
    }];
  }

  if (seg.type === 'arc') {
    const angle = Math.atan2(py - seg.center.y, px - seg.center.x);
    const normA = norm(angle);
    const s = norm(seg.startAngle);
    const e = norm(seg.endAngle);
    // Check if angle is within arc sweep
    let inArc;
    if (seg.clockwise) {
      inArc = s <= e ? normA >= s && normA <= e : normA >= s || normA <= e;
    } else {
      inArc = s >= e ? normA <= s && normA >= e : normA <= s || normA >= e;
    }
    if (!inArc) return [];
    return [{
      x: seg.center.x + seg.radius * Math.cos(angle),
      y: seg.center.y + seg.radius * Math.sin(angle),
      type: SNAP_TYPES.NEAREST,
    }];
  }

  if (seg.type === 'circle') {
    const angle = Math.atan2(py - seg.center.y, px - seg.center.x);
    return [{
      x: seg.center.x + seg.radius * Math.cos(angle),
      y: seg.center.y + seg.radius * Math.sin(angle),
      type: SNAP_TYPES.NEAREST,
    }];
  }

  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    const edges = [
      { startPoint: tl,              endPoint: { x: br.x, y: tl.y } },
      { startPoint: { x: br.x, y: tl.y }, endPoint: br              },
      { startPoint: br,              endPoint: { x: tl.x, y: br.y } },
      { startPoint: { x: tl.x, y: br.y }, endPoint: tl              },
    ];
    let best = null, bestDist = Infinity;
    for (const e of edges) {
      const pts = collectNearest({ ...e, type: 'line' }, px, py);
      if (pts.length > 0) {
        const d = Math.hypot(pts[0].x - px, pts[0].y - py);
        if (d < bestDist) { bestDist = d; best = pts[0]; }
      }
    }
    return best ? [best] : [];
  }

  return [];
}

function collectPerpendicular(seg, fromX, fromY) {
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-9) return [];
    const t = Math.max(0, Math.min(1,
      ((fromX - seg.startPoint.x) * dx + (fromY - seg.startPoint.y) * dy) / lenSq
    ));
    return [{
      x: seg.startPoint.x + t * dx,
      y: seg.startPoint.y + t * dy,
      type: SNAP_TYPES.PERPENDICULAR,
    }];
  }

  if (seg.type === 'circle' || seg.type === 'arc') {
    // Perpendicular from external point = point on circle
    // closest to the line from center to fromPoint
    const angle = Math.atan2(fromY - seg.center.y, fromX - seg.center.x);
    if (seg.type === 'arc') {
      const normA = norm(angle);
      const s = norm(seg.startAngle);
      const e = norm(seg.endAngle);
      let inArc;
      if (seg.clockwise) {
        inArc = s <= e ? normA >= s && normA <= e : normA >= s || normA <= e;
      } else {
        inArc = s >= e ? normA <= s && normA >= e : normA <= s || normA >= e;
      }
      if (!inArc) return [];
    }
    return [{
      x: seg.center.x + seg.radius * Math.cos(angle),
      y: seg.center.y + seg.radius * Math.sin(angle),
      type: SNAP_TYPES.PERPENDICULAR,
    }];
  }

  return [];
}

function collectTangent(seg, fromX, fromY) {
  if (seg.type === 'circle' || seg.type === 'arc') {
    const dx  = fromX - seg.center.x;
    const dy  = fromY - seg.center.y;
    const d   = Math.hypot(dx, dy);
    if (d <= seg.radius) return [];   // inside circle — no tangent

    const angle     = Math.atan2(dy, dx);
    const halfAngle = Math.acos(seg.radius / d);

    const candidates = [
      angle + halfAngle - Math.PI / 2,
      angle - halfAngle + Math.PI / 2,
    ].map(a => ({
      x:    seg.center.x + seg.radius * Math.cos(a),
      y:    seg.center.y + seg.radius * Math.sin(a),
      type: SNAP_TYPES.TANGENT,
    }));

    if (seg.type === 'arc') {
      return candidates.filter(pt => {
        const a = norm(Math.atan2(pt.y - seg.center.y, pt.x - seg.center.x));
        const s = norm(seg.startAngle);
        const e = norm(seg.endAngle);
        if (seg.clockwise) {
          return s <= e ? a >= s && a <= e : a >= s || a <= e;
        } else {
          return s >= e ? a <= s && a >= e : a <= s || a >= e;
        }
      });
    }
    return candidates;
  }
  return [];
}

function collectIntersections(seg, allSegs, selfIdx) {
  // Import inline to avoid circular deps
  const results = [];
  allSegs.forEach((other, i) => {
    if (i === selfIdx) return;
    const pts = getIntersectionPoints(seg, other);
    pts.forEach(pt => results.push({ ...pt, type: SNAP_TYPES.INTERSECTION }));
  });
  return results;
}

// Get raw intersection points between two segments (returns {x,y}[])
function getIntersectionPoints(a, b) {
  const rectEdges = (seg) => {
    const { topLeft: tl, bottomRight: br } = seg;
    return [
      { type:'line', startPoint: tl,                   endPoint: { x:br.x, y:tl.y } },
      { type:'line', startPoint: { x:br.x, y:tl.y },   endPoint: br                  },
      { type:'line', startPoint: br,                   endPoint: { x:tl.x, y:br.y } },
      { type:'line', startPoint: { x:tl.x, y:br.y },   endPoint: tl                  },
    ];
  };

  const as = a.type === 'rectangle' ? rectEdges(a) : [a];
  const bs = b.type === 'rectangle' ? rectEdges(b) : [b];
  const pts = [];

  for (const sa of as) {
    for (const sb of bs) {
      pts.push(..._pairIntersect(sa, sb));
    }
  }
  return pts;
}

function _pairIntersect(a, b) {
  // Line × Line
  if (a.type === 'line' && b.type === 'line') {
    const dx1 = a.endPoint.x - a.startPoint.x, dy1 = a.endPoint.y - a.startPoint.y;
    const dx2 = b.endPoint.x - b.startPoint.x, dy2 = b.endPoint.y - b.startPoint.y;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-9) return [];
    const dx3 = b.startPoint.x - a.startPoint.x, dy3 = b.startPoint.y - a.startPoint.y;
    const t = (dx3 * dy2 - dy3 * dx2) / denom;
    const u = (dx3 * dy1 - dy3 * dx1) / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) return [];
    return [{ x: a.startPoint.x + t * dx1, y: a.startPoint.y + t * dy1 }];
  }

  // Line × Circle/Arc
  if (a.type === 'line' && (b.type === 'circle' || b.type === 'arc')) {
    const dx = a.endPoint.x - a.startPoint.x;
    const dy = a.endPoint.y - a.startPoint.y;
    const fx = a.startPoint.x - b.center.x;
    const fy = a.startPoint.y - b.center.y;
    const A = dx*dx + dy*dy;
    const B = 2*(fx*dx + fy*dy);
    const C = fx*fx + fy*fy - b.radius*b.radius;
    let disc = B*B - 4*A*C;
    if (disc < 0) return [];
    disc = Math.sqrt(disc);
    return [(-B-disc)/(2*A), (-B+disc)/(2*A)]
      .filter(t => t >= 0 && t <= 1)
      .map(t => {
        const px = a.startPoint.x + t * dx;
        const py = a.startPoint.y + t * dy;
        if (b.type === 'arc') {
          const ang = norm(Math.atan2(py - b.center.y, px - b.center.x));
          const s = norm(b.startAngle), e = norm(b.endAngle);
          const inArc = b.clockwise
            ? (s <= e ? ang >= s && ang <= e : ang >= s || ang <= e)
            : (s >= e ? ang <= s && ang >= e : ang <= s || ang >= e);
          if (!inArc) return null;
        }
        return { x: px, y: py };
      }).filter(Boolean);
  }

  // Circle/Arc × Line
  if ((a.type === 'circle' || a.type === 'arc') && b.type === 'line') {
    return _pairIntersect(b, a);
  }

  // Circle/Arc × Circle/Arc
  if ((a.type === 'circle' || a.type === 'arc') && (b.type === 'circle' || b.type === 'arc')) {
    const dx = b.center.x - a.center.x, dy = b.center.y - a.center.y;
    const d = Math.hypot(dx, dy);
    if (d > a.radius + b.radius || d < Math.abs(a.radius - b.radius)) return [];
    const A2 = (a.radius**2 - b.radius**2 + d**2) / (2*d);
    const h  = Math.sqrt(Math.max(0, a.radius**2 - A2**2));
    const mx = a.center.x + (A2*dx)/d, my = a.center.y + (A2*dy)/d;
    const pts = h < 1e-9
      ? [{ x: mx, y: my }]
      : [{ x: mx+(h*dy)/d, y: my-(h*dx)/d }, { x: mx-(h*dy)/d, y: my+(h*dx)/d }];
    return pts.filter(pt => {
      const inA = a.type === 'circle' || (() => {
        const ang = norm(Math.atan2(pt.y-a.center.y, pt.x-a.center.x));
        const s = norm(a.startAngle), e = norm(a.endAngle);
        return a.clockwise
          ? (s<=e ? ang>=s&&ang<=e : ang>=s||ang<=e)
          : (s>=e ? ang<=s&&ang>=e : ang<=s||ang>=e);
      })();
      const inB = b.type === 'circle' || (() => {
        const ang = norm(Math.atan2(pt.y-b.center.y, pt.x-b.center.x));
        const s = norm(b.startAngle), e = norm(b.endAngle);
        return b.clockwise
          ? (s<=e ? ang>=s&&ang<=e : ang>=s||ang<=e)
          : (s>=e ? ang<=s&&ang>=e : ang<=s||ang>=e);
      })();
      return inA && inB;
    });
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SNAP FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export function findSnapPoint(px, py, shapeList, settings, fromPoint = null) {
  if (!settings.enabled) return null;

  const radius = settings.radius;
  const candidates = [];

  shapeList.forEach((seg, i) => {
    if (settings.endpoint)
      collectEndpoints(seg).forEach(p => candidates.push(p));

    if (settings.midpoint)
      collectMidpoints(seg).forEach(p => candidates.push(p));

    if (settings.center)
      collectCenters(seg).forEach(p => candidates.push(p));

    if (settings.nearest)
      collectNearest(seg, px, py).forEach(p => candidates.push(p));

    if (settings.intersection)
      collectIntersections(seg, shapeList, i).forEach(p => candidates.push(p));

    if (settings.perpendicular && fromPoint)
      collectPerpendicular(seg, fromPoint.x, fromPoint.y).forEach(p => candidates.push(p));

    if (settings.tangent && fromPoint)
      collectTangent(seg, fromPoint.x, fromPoint.y).forEach(p => candidates.push(p));
  });

  // Priority order — higher priority types win ties
  const PRIORITY = {
    endpoint:      1,
    intersection:  2,
    midpoint:      3,
    center:        4,
    perpendicular: 5,
    tangent:       6,
    nearest:       7,
  };

  // Find closest candidate within radius
  let best = null;
  let bestScore = Infinity;

  candidates.forEach(pt => {
    const dist = Math.hypot(pt.x - px, pt.y - py);
    if (dist > radius) return;
    // Score = distance + small priority tiebreak
    const score = dist + (PRIORITY[pt.type] ?? 9) * 0.001;
    if (score < bestScore) {
      bestScore = score;
      best = pt;
    }
  });

  return best;   // null if nothing in range
}

export function resolveSnapPoint(
  wx, wy,
  shapeList,
  snapSettings,
  fromPoint,
  gridSnapEnabled,
  currentScale,
  GRID_MINOR = 20,
  GRID_MAJOR = 100
) {
  const osnapResult = snapSettings.enabled
    ? findSnapPoint(wx, wy, shapeList, snapSettings, fromPoint)
    : null;

  const activeGrid    = getActiveGridSize(currentScale, GRID_MINOR, GRID_MAJOR);
  const gridThreshold = activeGrid * 0.4;

  const resolved = resolveSnap(
    wx, wy,
    osnapResult,
    activeGrid,
    gridThreshold,
    gridSnapEnabled
  );

  return {
    x:           resolved.x,
    y:           resolved.y,
    snapType:    resolved.snapType,
    osnapResult,
  };
}