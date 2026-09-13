import { distance, round } from '../geometry/math';
import { pxToMm } from '../geometry/units';

// A spline passes through its control points with a smooth curve — unlike
// a Polyline, which uses straight segments between them. We use a
// Catmull-Rom spline (one uniform, non-clamped), which interpolates every
// control point exactly and stays well-behaved for the small, hand-placed
// point counts a practice canvas produces. The math here is duplicated
// inside components/PracticeCanvas.jsx (as a worklet) on purpose for the
// same reason every other preview function is — a worklet can't call a
// plain imported function, so the live rubber-band and this committed
// geometry keep separate copies.

export function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (
      (2 * p1.x)
      + (-p0.x + p2.x) * t
      + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
      + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      (2 * p1.y)
      + (-p0.y + p2.y) * t
      + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
      + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

// The polyline that approximates the smooth curve through `points` —
// highest-fidelity at the two ends (every control point is an exact curve
// point) and progressively less dense between interior ones. ~48 samples
// per segment is far past any visible difference on a phone screen.
export function buildSplinePath(points, samplesPerSegment = 48) {
  const path = [];
  if (points.length < 2) return path;
  if (points.length === 2) {
    for (let i = 0; i <= samplesPerSegment; i += 1) {
      const t = i / samplesPerSegment;
      path.push({
        x: points[0].x + (points[1].x - points[0].x) * t,
        y: points[0].y + (points[1].y - points[0].y) * t,
      });
    }
    return path;
  }

  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];
    // The interior straight-line segments only get half the density —
    // the difference is invisible and it keeps the point array light.
    const n = (i === 1 || i === points.length - 1)
      ? samplesPerSegment
      : Math.max(8, Math.floor(samplesPerSegment / 2));
    for (let s = 0; s <= n; s += 1) {
      if (s === n && i !== points.length - 1) continue; // last pt comes from next segment
      const t = s / n;
      path.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }
  return path;
}

// True curve length — summed along the same sampled path used to draw the
// spline, so the Properties readout matches the visible curve (not the
// straight-line chord distance between control points).
export function computeSplineGeometry(points) {
  const path = buildSplinePath(points);
  let totalPx = 0;
  for (let i = 1; i < path.length; i += 1) {
    totalPx += distance(path[i - 1], path[i]);
  }
  return {
    type: 'spline',
    controlPoints: points.length,
    totalLengthPx: totalPx,
    totalLengthMm: round(pxToMm(totalPx), 1),
  };
}