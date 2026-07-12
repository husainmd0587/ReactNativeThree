// utils/extend.js
import {
  lineLineIntersect,
  lineCircleIntersect,
  lineArcIntersect,
  circleCircleIntersect,
  angleToT,
} from '../trim/intersect'

const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// ── Find which endpoint of a segment the tap is near ─────────────────────────

export function hitTestEndpoint(px, py, seg, threshold = 12) {
  if (seg.type === 'line') {
    if (Math.hypot(px - seg.startPoint.x, py - seg.startPoint.y) <= threshold)
      return 'start';
    if (Math.hypot(px - seg.endPoint.x, py - seg.endPoint.y) <= threshold)
      return 'end';
  }
  if (seg.type === 'arc') {
    const sx = seg.center.x + seg.radius * Math.cos(seg.startAngle);
    const sy = seg.center.y + seg.radius * Math.sin(seg.startAngle);
    const ex = seg.center.x + seg.radius * Math.cos(seg.endAngle);
    const ey = seg.center.y + seg.radius * Math.sin(seg.endAngle);
    if (Math.hypot(px - sx, py - sy) <= threshold) return 'start';
    if (Math.hypot(px - ex, py - ey) <= threshold) return 'end';
  }

  return null;
}

// ── Build an extended version of `seg` projected from one end ────────────────
// Returns a temporary "ray" line from the endpoint in the natural direction
function buildExtendRay(seg, endpoint, rayLength = 100000) {
  if (seg.type === 'line') {
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;
    const ux = dx / len;
    const uy = dy / len;

    if (endpoint === 'end') {
      return {
        type: 'line',
        startPoint: seg.endPoint,
        endPoint: {
          x: seg.endPoint.x + ux * rayLength,
          y: seg.endPoint.y + uy * rayLength,
        },
        _dir: { x: ux, y: uy },
      };
    } else {
      // extend from start — ray goes in reverse direction
      return {
        type: 'line',
        startPoint: seg.startPoint,
        endPoint: {
          x: seg.startPoint.x - ux * rayLength,
          y: seg.startPoint.y - uy * rayLength,
        },
        _dir: { x: -ux, y: -uy },
      };
    }
  }

  if (seg.type === 'arc') {
    // Arc extends along its own circle — build a full-circle ray
    // The "ray" is just the underlying full circle, intersect will find hits
    return {
      type: 'circle',
      center: seg.center,
      radius: seg.radius,
      _arcSeg: seg,
      _endpoint: endpoint,
    };
  }

  return null;
}

// ── Intersect a ray against a boundary shape ──────────────────────────────────
// Returns array of { t, point } — t is distance along the ray from origin
function intersectRayWithShape(ray, boundary) {
  if (!ray) return [];

  const rectToLines = (seg) => {
    const { topLeft: tl, bottomRight: br } = seg;
    return [
      { type: 'line', startPoint: tl,                   endPoint: { x: br.x, y: tl.y } },
      { type: 'line', startPoint: { x: br.x, y: tl.y }, endPoint: br                   },
      { type: 'line', startPoint: br,                   endPoint: { x: tl.x, y: br.y } },
      { type: 'line', startPoint: { x: tl.x, y: br.y }, endPoint: tl                   },
    ];
  };

  const boundaries = boundary.type === 'rectangle'
    ? rectToLines(boundary)
    : [boundary];

  const hits = [];

  for (const b of boundaries) {
    if (ray.type === 'line') {
      let ts = [];
      if (b.type === 'line')   ts = lineLineIntersect(ray, b);
      if (b.type === 'arc')    ts = lineArcIntersect(ray, b);
      if (b.type === 'circle') ts = lineCircleIntersect(ray, b);

      for (const t of ts) {
        if (t < 1e-4) continue;   // skip origin itself
        hits.push({
          t,
          point: {
            x: ray.startPoint.x + t * (ray.endPoint.x - ray.startPoint.x),
            y: ray.startPoint.y + t * (ray.endPoint.y - ray.startPoint.y),
          },
        });
      }
    }

    if (ray.type === 'circle') {
      // Arc extending along its circle
      let pts = [];
      if (b.type === 'line') {
        const ts = lineCircleIntersect(b, ray);
        pts = ts.map(t => ({
          x: b.startPoint.x + t * (b.endPoint.x - b.startPoint.x),
          y: b.startPoint.y + t * (b.endPoint.y - b.startPoint.y),
        }));
      } else if (b.type === 'arc' || b.type === 'circle') {
        pts = circleCircleIntersect(ray, b);
      }

      const arc     = ray._arcSeg;
      const fromEnd = ray._endpoint === 'end';
      const refAngle = fromEnd ? arc.endAngle : arc.startAngle;

      for (const pt of pts) {
        const angle = Math.atan2(pt.y - ray.center.y, pt.x - ray.center.x);
        // t = angular distance from the arc endpoint in the extend direction
        let delta = fromEnd
          ? norm(angle - norm(refAngle))
          : norm(norm(refAngle) - angle);
        if (delta < 1e-4) continue;  // skip the arc's own endpoints
        hits.push({ t: delta, point: pt });
      }
    }
  }

  return hits;
}

// ── Apply extend: stretch `seg` from `endpoint` to nearest boundary hit ───────
export function applyExtend(shapeList, segIndex, endpoint) {
  const seg = shapeList[segIndex];
  const ray = buildExtendRay(seg, endpoint);
  if (!ray) return shapeList;

  // Collect all hits against every other shape
  const allHits = [];
  shapeList.forEach((other, i) => {
    if (i === segIndex) return;
    const hits = intersectRayWithShape(ray, other);
    hits.forEach(h => allHits.push(h));
  });

  if (allHits.length === 0) return shapeList;   // nothing to extend to

  // Pick the closest hit (smallest t = nearest boundary)
  allHits.sort((a, b) => a.t - b.t);
  const nearest = allHits[0];

  // Build the extended segment
  const extended = extendSegTo(seg, endpoint, nearest.point);
  if (!extended) return shapeList;

  return [
    ...shapeList.slice(0, segIndex),
    extended,
    ...shapeList.slice(segIndex + 1),
  ];
}

// ── Produce new segment with one endpoint moved to `newPt` ───────────────────
function extendSegTo(seg, endpoint, newPt) {
  if (seg.type === 'line') {
    return endpoint === 'end'
      ? { ...seg, endPoint: newPt }
      : { ...seg, startPoint: newPt };
  }

  if (seg.type === 'arc') {
    const angle = Math.atan2(
      newPt.y - seg.center.y,
      newPt.x - seg.center.x
    );
    const newPoint = {
      x: seg.center.x + seg.radius * Math.cos(angle),
      y: seg.center.y + seg.radius * Math.sin(angle),
    };
    return endpoint === 'end'
      ? { ...seg, endAngle: angle, endPoint: newPoint }
      : { ...seg, startAngle: angle, startPoint: newPoint };
  }

  return null;
}