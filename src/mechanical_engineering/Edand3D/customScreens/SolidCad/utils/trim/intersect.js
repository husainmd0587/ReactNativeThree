
export function lineLineIntersect(a, b) {
  // a: {startPoint, endPoint}  b: {startPoint, endPoint}
  const dx1 = a.endPoint.x - a.startPoint.x;
  const dy1 = a.endPoint.y - a.startPoint.y;
  const dx2 = b.endPoint.x - b.startPoint.x;
  const dy2 = b.endPoint.y - b.startPoint.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return [];
  const dx3 = b.startPoint.x - a.startPoint.x;
  const dy3 = b.startPoint.y - a.startPoint.y;
  const t = (dx3 * dy2 - dy3 * dx2) / denom;
  const u = (dx3 * dy1 - dy3 * dx1) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return [t];
  return [];
}

export function lineCircleIntersect(line, circle) {
  // Returns t values on the line [0..1]
  const dx = line.endPoint.x - line.startPoint.x;
  const dy = line.endPoint.y - line.startPoint.y;
  const fx = line.startPoint.x - circle.center.x;
  const fy = line.startPoint.y - circle.center.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.radius * circle.radius;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  return [t1, t2].filter(t => t >= 0 && t <= 1);
}

export function lineArcIntersect(line, arc) {
  const candidates = lineCircleIntersect(line, {
    center: arc.center,
    radius: arc.radius,
  });

  const TAU = 2 * Math.PI;
  const norm = (a) => ((a % TAU) + TAU) % TAU;

  const inArcAngle = (px, py) => {
    const angle = norm(Math.atan2(py - arc.center.y, px - arc.center.x));
    const s = norm(arc.startAngle);
    const e = norm(arc.endAngle);

    if (arc.clockwise) {
      // CW: angle sweeps from s → e in the increasing direction
      if (s <= e) return angle >= s && angle <= e;
      else        return angle >= s || angle <= e;   // wraps past 0
    } else {
      // CCW: angle sweeps from s → e in the decreasing direction
      if (s >= e) return angle <= s && angle >= e;
      else        return angle <= s || angle >= e;   // wraps past 0
    }
  };

  return candidates.filter(t => {
    const px = line.startPoint.x + t * (line.endPoint.x - line.startPoint.x);
    const py = line.startPoint.y + t * (line.endPoint.y - line.startPoint.y);
    return inArcAngle(px, py);
  });
}

export function circleCircleIntersect(c1, c2) {
  // Returns points (not t), used for arc/circle trimming separately
  const dx = c2.center.x - c1.center.x;
  const dy = c2.center.y - c1.center.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > c1.radius + c2.radius || d < Math.abs(c1.radius - c2.radius)) return [];
  const a = (c1.radius ** 2 - c2.radius ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, c1.radius ** 2 - a ** 2));
  const mx = c1.center.x + (a * dx) / d;
  const my = c1.center.y + (a * dy) / d;
  if (h < 1e-9) return [{ x: mx, y: my }];
  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d },
  ];
}

// Convert a point on a circle/arc to an angle-based t [0..1]
export function angleToT(angle, startAngle, endAngle, clockwise) {
  const TAU = 2 * Math.PI;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const s = norm(startAngle), e = norm(endAngle), a = norm(angle);
  let sweep;
  if (clockwise) {
    sweep = s <= e ? e - s : TAU - s + e;
    const offset = s <= a ? a - s : TAU - s + a;
    return Math.max(0, Math.min(1, offset / sweep));
  } else {
    sweep = s >= e ? s - e : TAU - e + s;
    const offset = s >= a ? s - a : TAU - a + s;
    return Math.max(0, Math.min(1, offset / sweep));
  }
}

// CORRECT — move it INSIDE getAllIntersectionsPoints, use topLeft/bottomRight
const getRectEdges = (rect) => {
  const { topLeft, bottomRight } = rect;  // ← matches your actual shape data
  const tl = { x: topLeft.x,     y: topLeft.y     };
  const tr = { x: bottomRight.x, y: topLeft.y     };
  const br = { x: bottomRight.x, y: bottomRight.y };
  const bl = { x: topLeft.x,     y: bottomRight.y };
  return [
    { type: 'line', startPoint: tl, endPoint: tr },
    { type: 'line', startPoint: tr, endPoint: br },
    { type: 'line', startPoint: br, endPoint: bl },
    { type: 'line', startPoint: bl, endPoint: tl },
  ];
};
//for testing usecase get intersection points
export function getAllIntersectionsPoints(shapes) {
  if (shapes.length < 2) return [];

  const intersections = [];

  const getPoint = (shape, t) => {
    if (shape.type === 'line') {
      return {
        x: shape.startPoint.x + t * (shape.endPoint.x - shape.startPoint.x),
        y: shape.startPoint.y + t * (shape.endPoint.y - shape.startPoint.y),
      };
    }
    if (shape.type === 'circle') {
      const angle = shape.startAngle + t * 2 * Math.PI;
      return {
        x: shape.center.x + shape.radius * Math.cos(angle),
        y: shape.center.y + shape.radius * Math.sin(angle),
      };
    }
    if (shape.type === 'arc') {
      const TAU = 2 * Math.PI;
      const norm = (a) => ((a % TAU) + TAU) % TAU;
      const s = norm(shape.startAngle);
      const e = norm(shape.endAngle);
      let sweep;
      if (shape.clockwise) {
        sweep = s <= e ? e - s : TAU - s + e;
      } else {
        sweep = s >= e ? s - e : TAU - e + s;
      }
      const angle = shape.clockwise
        ? s + t * sweep
        : s - t * sweep;
      return {
        x: shape.center.x + shape.radius * Math.cos(angle),
        y: shape.center.y + shape.radius * Math.sin(angle),
      };
    }
  };

  const getIntersectionTs = (a, b) => {
    // line x line
    if (a.type === 'line' && b.type === 'line') {
      const ts = lineLineIntersect(a, b);
      return ts.map(t => ({ tA: t, point: getPoint(a, t) }));
    }

    // line x circle
    if (a.type === 'line' && b.type === 'circle') {
      const ts = lineCircleIntersect(a, b);
      return ts.map(t => ({ tA: t, point: getPoint(a, t) }));
    }
    if (a.type === 'circle' && b.type === 'line') {
      const ts = lineCircleIntersect(b, a);
      return ts.map(t => ({ tA: t, point: getPoint(b, t) }));
    }

    // line x arc
    if (a.type === 'line' && b.type === 'arc') {
      const ts = lineArcIntersect(a, b);
      return ts.map(t => ({ tA: t, point: getPoint(a, t) }));
    }
    if (a.type === 'arc' && b.type === 'line') {
      const ts = lineArcIntersect(b, a);
      return ts.map(t => ({ tA: t, point: getPoint(b, t) }));
    }

    // circle x circle  |  circle x arc  |  arc x arc
    if (
      (a.type === 'circle' || a.type === 'arc') &&
      (b.type === 'circle' || b.type === 'arc')
    ) {
      const points = circleCircleIntersect(a, b);

      return points
        .filter(pt => {
          // For arcs, verify the point actually lies on the arc sweep
          const inA = a.type === 'circle' || isPointOnArc(pt, a);
          const inB = b.type === 'circle' || isPointOnArc(pt, b);
          return inA && inB;
        })
        .map(pt => {
          const tA = a.type === 'circle'
            ? angleToT(Math.atan2(pt.y - a.center.y, pt.x - a.center.x), a.startAngle ?? 0, a.endAngle ?? (2 * Math.PI), a.clockwise ?? true)
            : angleToT(Math.atan2(pt.y - a.center.y, pt.x - a.center.x), a.startAngle, a.endAngle, a.clockwise);
          return { tA, point: pt };
        });
    }
   // rectangle x any
    // rectangle × any  (recursively decomposes into 4 edges)
    if (a.type === 'rectangle' || b.type === 'rectangle') {
      const [rectShape, otherShape] = a.type === 'rectangle' ? [a, b] : [b, a];
      const edges = getRectEdges(rectShape);
      const results = [];
      for (const edge of edges) {
        const hits = getIntersectionTs(edge, otherShape);
        for (const { tA, point } of hits) {
          results.push({ tA, point });
        }
      }
      return results;
    }
    return [];
  };

  // Helper: check if a point lies within an arc's angular sweep
  const isPointOnArc = (pt, arc) => {
    const TAU = 2 * Math.PI;
    const norm = (a) => ((a % TAU) + TAU) % TAU;
    const angle = norm(Math.atan2(pt.y - arc.center.y, pt.x - arc.center.x));
    const s = norm(arc.startAngle);
    const e = norm(arc.endAngle);
    if (arc.clockwise) {
      return s <= e ? angle >= s && angle <= e : angle >= s || angle <= e;
    } else {
      return s >= e ? angle <= s && angle >= e : angle <= s || angle >= e;
    }
  };

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const results = getIntersectionTs(shapes[i], shapes[j]);
      for (const { tA, point } of results) {
        intersections.push({
          point,
          tA,
          shape1Index: i,
          shape2Index: j,
        });
      }
    }
  }

  return intersections;
}
