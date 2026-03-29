import { Skia } from "@shopify/react-native-skia";
import { useState, useMemo } from "react";

const EPS = 0.0001;
const toRad=angle => (angle * Math.PI) / 180;
// From two points → m and c
function lineFromPoints(p1, p2) {
  if (p2.x === p1.x) return null; // vertical line — handle separately if needed
  const m = (p2.y - p1.y) / (p2.x - p1.x);
  const c = p1.y - m * p1.x;
  return { m, c, lineY: (x) => m * x + c };
}

function isBetween(a, b, c) {
  return c >= Math.min(a, b) - EPS && c <= Math.max(a, b) + EPS;
}

function isOnArc(p, cx, cy, startAngle, endAngle) {
  const TWO_PI = Math.PI * 2;
  const EPS = 1e-6;

  const normalize = (a) => (a % TWO_PI + TWO_PI) % TWO_PI;

  // 🔥 FIX: invert Y
  const angle = normalize(Math.atan2(-(p.y - cy), (p.x - cx)));
  const start = normalize(startAngle);
  const end = normalize(endAngle);

  if (start <= end) {
    return angle >= start - EPS && angle <= end + EPS;
  } else {
    return angle >= start - EPS || angle <= end + EPS;
  }
}
export function getIntersection(p1, p2, p3, p4) {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom =
    (x1 - x2) * (y3 - y4) -
    (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.000001) {
    return null;
  }

  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) -
     (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;

  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) -
     (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

  if (
    isBetween(x1, x2, px) &&
    isBetween(y1, y2, py) &&
    isBetween(x3, x4, px) &&
    isBetween(y3, y4, py)
  ) {
    return { x: px, y: py };
  }

  return null;
}

function isOnSegment(p, p1, p2) {
  return (
    p.x >= Math.min(p1.x, p2.x) &&
    p.x <= Math.max(p1.x, p2.x) &&
    p.y >= Math.min(p1.y, p2.y) &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

export function circleLineIntersection(h, k, r, p1, p2) {
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;

  // Convert 2 points → line Ax + By + C = 0
  const A = y2 - y1;
  const B = x1 - x2;
  const C = x2 * y1 - x1 * y2;

  const denom = A * A + B * B;

  // Closest point to center
  const t = (A * h + B * k + C) / denom;
  const x0 = h - A * t;
  const y0 = k - B * t;

  const d2 = ((A * h + B * k + C) ** 2) / denom;
  const r2 = r * r;

  if (d2 > r2) return [];

  if (Math.abs(d2 - r2) < 1e-6) {
    // tangent
    const p = { x: x0, y: y0 };
    return isOnSegment(p, p1, p2) ? [p] : [];
  }

  const mult = Math.sqrt((r2 - d2) / denom);

  const ax = -B * mult;
  const ay = A * mult;

  const pA = { x: x0 + ax, y: y0 + ay };
  const pB = { x: x0 - ax, y: y0 - ay };

  // ✅ FILTER CORRECTLY HERE
  const result = [];

  if (isOnSegment(pA, p1, p2)) result.push(pA);
  if (isOnSegment(pB, p1, p2)) result.push(pB);

  return result;
}

export function arcLineIntersectionPoint(
  cx, cy, r,
  startAngle, endAngle,   // in radians
  p1, p2
) {
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;

  // Line → Ax + By + C = 0
  const A = y2 - y1;
  const B = x1 - x2;
  const C = x2 * y1 - x1 * y2;

  const denom = A * A + B * B;

  // Closest point to center
  const t = (A * cx + B * cy + C) / denom;
  const x0 = cx - A * t;
  const y0 = cy - B * t;

  const d2 = ((A * cx + B * cy + C) ** 2) / denom;
  const r2 = r * r;

  if (d2 > r2) return [];

  let points = [];

  if (Math.abs(d2 - r2) < 1e-6) {
    points = [{ x: x0, y: y0 }];
  } else {
    const mult = Math.sqrt((r2 - d2) / denom);

    const ax = -B * mult;
    const ay = A * mult;

   points = [
      { x: x0 + ax, y: y0 + ay },
      { x: x0 - ax, y: y0 - ay }
    ];
  }

  // 🔥 FILTER: segment + arc
  return points.filter(p =>
    isOnSegment(p, p1, p2) && isOnArc(p, cx, cy, startAngle, endAngle)
  );
}
const toDeg = (rad) => rad * 180 / Math.PI;
const toScreenY = (y) => -y;
export function buildPath(entities) {
  const path = Skia.Path.Make();
  let currentPoint = null;
  entities.forEach((e, index) => {
    if (e.type === "line") {
      const x1 = e.p1.x;
      const y1 = toScreenY(e.p1.y);

      const x2 = e.p2.x;
      const y2 = toScreenY(e.p2.y);

      if (index === 0) path.moveTo(x1, y1);
      else path.lineTo(x1, y1);
      path.lineTo(x2, y2);
     currentPoint = { x: e.p2.x, y: e.p2.y };
    }

if (e.type === "arc") {
  let startRad = e.startAngle;
  const endRad = e.endAngle;

  // 🔥 AUTO FIX: align start with last point
  if (currentPoint) {
    const dx = currentPoint.x - e.cx;
    const dy = currentPoint.y - e.cy;
    startRad = Math.atan2(dy, dx);
  }

  const rect = {
    x: e.cx ,
    y: toScreenY(e.cy + e.r),
    width: e.r * 2,
    height: e.r * 2
  };

  let sweep = endRad - startRad;

  if (e.clockwise && sweep > 0) sweep -= Math.PI * 2;
  if (!e.clockwise && sweep < 0) sweep += Math.PI * 2;

  path.addArc(rect, toDeg(startRad), toDeg(sweep));
  // update current point (arc end)
  const endX = e.cx + e.r * Math.cos(endRad);
  const endY = e.cy + e.r * Math.sin(endRad);
  currentPoint = { x: endX, y: endY };
 }}
);
  return path;
}


// Compute natural cubic spline coefficients for n+1 points
function computeSplineCoefficients(knots) {
  const n = knots.length - 1; // number of segments
  if (n < 1) return [];

  const h = knots.map((p, i) => i < n ? knots[i + 1].x - p.x : 0);
  const alpha = Array(n + 1).fill(0);

  for (let i = 1; i < n; i++) {
    alpha[i] =
      (3 / h[i]) * (knots[i + 1].y - knots[i].y) -
      (3 / h[i - 1]) * (knots[i].y - knots[i - 1].y);
  }

  // Thomas algorithm (tridiagonal solver) for natural spline
  const l = Array(n + 1).fill(1);
  const mu = Array(n + 1).fill(0);
  const z = Array(n + 1).fill(0);

  for (let i = 1; i < n; i++) {
    l[i] = 2 * (knots[i + 1].x - knots[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  const b = Array(n).fill(0);
  const c = Array(n + 1).fill(0);
  const d = Array(n).fill(0);

  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (knots[j + 1].y - knots[j].y) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Return segments: each has {x0, a, b, c, d}
  return knots.slice(0, n).map((p, i) => ({
    x0: p.x,
    a: p.y,
    b: b[i],
    c: c[i],
    d: d[i],
    xEnd: knots[i + 1].x,
  }));
}

// Evaluate spline at x given segments
function evalSpline(segments, x) {
  const seg = segments.find((s) => x >= s.x0 && x <= s.xEnd) ?? segments[segments.length - 1];
  const t = x - seg.x0;
  return seg.a + seg.b * t + seg.c * t ** 2 + seg.d * t ** 3;
}

// Generate dense points along the spline
function generateSplinePoints(segments, step = 0.05) {
  if (segments.length === 0) return [];
  const points = [];
  const xStart = segments[0].x0;
  const xEnd = segments[segments.length - 1].xEnd;

  for (let x = xStart; x <= xEnd + 1e-9; x += step) {
    points.push({ x, y: evalSpline(segments, x) });
  }
  return points;
}

function findIntersections(segments, lineY, step = 0.001) {
  const intersections = [];

  for (const seg of segments) {
    const { x0, xEnd, a, b, c, d } = seg;

    // f(x) = spline(x) - line(x)
    // root of f = intersection point
    const f = (x) => {
      const t = x - x0;
      const splineY = a + b * t + c * t ** 2 + d * t ** 3;
      return splineY - lineY(x);
    };

    // Scan across segment in small steps
    // to detect sign changes (each = one root)
    for (let x = x0; x < xEnd - step; x += step) {
      const x1 = x;
      const x2 = Math.min(x + step, xEnd);

      if (f(x1) * f(x2) < 0) {
        // Sign changed → root exists between x1 and x2
        const rootX = bisect(f, x1, x2);
        if (rootX !== null) {
          const rootY = lineY(rootX); // or evalSpline(segments, rootX)
          intersections.push({ x: rootX, y: rootY });
        }
      }
    }
  }

  return intersections;
}
export function SplineChart() {
  const [knots, setKnots] = useState([  { x: 0, y: 1 },]);
  const [linePoints, setLinePoints] = useState({
    p1: { x: 10, y: 2 },
    p2: { x: 15, y: 3 },
  });

  const { splinePath, linePath, intersections } = useMemo(() => {
    const segments = computeSplineCoefficients(knots);
    const points = generateSplinePoints(segments);
    const scaleX = 1, scaleY = 1;

    const sp = Skia.Path.Make();
    if (points.length > 0) {
      sp.moveTo(points[0].x * scaleX, points[0].y * scaleY);
      points.forEach(pt => sp.lineTo(pt.x * scaleX, pt.y * scaleY));
    }

    const lp = Skia.Path.Make();
    const { p1, p2 } = linePoints;
    lp.moveTo(p1.x * scaleX, p1.y * scaleY);
    lp.lineTo(p2.x * scaleX, p2.y * scaleY);

    const line = lineFromPoints(p1, p2);
    const hits = line ? findIntersections(segments, line.lineY) : [];

    return { splinePath: sp, linePath: lp, intersections: hits };
  }, [knots, linePoints]);

  const addPoints = (newKnots) => {
    setKnots(prev => {
      const merged = [...prev, ...newKnots];
      const deduped = Object.values(
        merged.reduce((acc, p) => { acc[p.x] = p; return acc; }, {})
      );
      return deduped.sort((a, b) => a.x - b.x);
    });
  };

  const updateLinePoint = (which, point) => {
    setLinePoints(prev => ({ ...prev, [which]: point }));
  };

  // ✅ addPoints was missing here
  return { splinePath, linePath, intersections, addPoints, updateLinePoint };
}
// Find root of f(x) = 0 in [a, b] using bisection
function bisect(f, a, b, tol = 1e-6, maxIter = 50) {
  let fa = f(a), fb = f(b);
  if (fa * fb > 0) return null; // no sign change = no root here

  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return mid;
    fa * fm < 0 ? (b = mid) : (a = mid);
  }
  return (a + b) / 2;
}

export const createGrid = (minor = 20, major = 100, extent = 1000) => {
  const minorPath = Skia.Path.Make();
  const majorPath = Skia.Path.Make();
  const bgRect = Skia.Path.Make();
  const xAxisPath = Skia.Path.Make();
  const yAxisPath = Skia.Path.Make();
  xAxisPath.moveTo(-extent, 0);
  xAxisPath.lineTo(extent, 0);
  yAxisPath.moveTo(0, -extent);
  yAxisPath.lineTo(0, extent);

  for (let x = -extent; x <= extent; x += minor) {
    const isMajor = x % major === 0;
    if(isMajor){
      majorPath.moveTo(x, -extent) ;majorPath.lineTo(x, extent)
    }else{
      minorPath.moveTo(x, -extent) ;minorPath.lineTo(x, extent)}
  }

  for (let y = -extent; y <= extent; y += minor) {
    const isMajor = y % major === 0;
    if(isMajor){
      majorPath.moveTo(-extent, -y) ;majorPath.lineTo(extent, -y)
    }else{
      minorPath.moveTo(-extent, -y) ;minorPath.lineTo(extent, -y)}
  }

  bgRect.addRect({
  x: -extent,
  y: -extent,
  width: extent*2,
  height: extent*2
});
  return { minorPath, majorPath, xAxisPath, yAxisPath ,bgRect};
};
import { Path } from "@shopify/react-native-skia";

export const Grid = ({
  minor = 20,
  major = 100,
  extent = 1000,
  minorColor = "#999",
  majorColor = "#999",
  axisXColor = "red",
  axisYColor = "blue",
  bgRectColor = "#ccc",
  minorWidth = .5,
  majorWidth = 1,
  axisWidth = 1,
  minorOpacity = 0.3,
  majorOpacity = 0.6,

}) => {
  const { minorPath, majorPath, xAxisPath, yAxisPath ,bgRect} = useMemo(() =>
    createGrid(minor, major, extent), [minor, major, extent]
  );

  return (
    <>
    <Path   path={bgRect} color={bgRectColor} style="fill" />
      <Path path={minorPath} color={minorColor} style="stroke" strokeWidth={minorWidth} opacity={minorOpacity} />
      <Path path={majorPath} color={majorColor} style="stroke" strokeWidth={majorWidth} opacity={majorOpacity} />
      <Path path={xAxisPath} color={axisXColor} style="stroke" strokeWidth={axisWidth} />
      <Path path={yAxisPath} color={axisYColor} style="stroke" strokeWidth={axisWidth} />  
    </>
  );
};

