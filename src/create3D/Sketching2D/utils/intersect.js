
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