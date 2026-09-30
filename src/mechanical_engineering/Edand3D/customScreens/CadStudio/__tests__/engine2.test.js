/**
 * Tests for the CAD Studio engine: snap, tracking, modify ops, corners.
 *
 * These are the parts of a CAD app that are silently wrong when broken —
 * a fillet that lands 3mm off looks like a rendering glitch, not a maths
 * bug — so the geometry assertions below are all "is the answer where the
 * maths says it must be", not "does it look right".
 */

import {
  arcParams,
  circleCircleIntersect,
  closestOnSegment,
  lineCircleIntersect,
  makeArc,
  makeCircle,
  makeLine,
  makePoint,
  makePolyline,
  measure,
  segmentIntersect,
  segmentsOf,
  shapeBBox,
} from '../engine/geometry';
import {add, dist, fromAngle, mul, norm360, sub} from '../engine/vec';
import {findSnap, DEFAULT_OSNAP} from '../engine/snap';
import {dynamicInput, polarAnglesFor, trackPoint} from '../engine/tracking';
import {
  breakLine,
  explodeShape,
  joinCollinear,
  offsetShape,
  polarArray,
  rectangularArray,
  rotateDeg,
  scale,
  translate,
} from '../engine/transform';
import {
  chamferCorner,
  cornerFrame,
  extendRun,
  filletCorner,
  nearestRun,
  runsOf,
  trimRun,
} from '../engine/corner';

const near = (a, b, tol = 1e-6) =>
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(tol);
const nearNum = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);
const ALL = {...DEFAULT_OSNAP, tangent: true, nearest: true};

// ── Snap ────────────────────────────────────────────────────────────────────

describe('findSnap', () => {
  const line = makeLine({x: 0, y: 0}, {x: 100, y: 0});
  const circle = makeCircle({x: 50, y: 50}, 25);

  test('finds a line endpoint within the radius', () => {
    const s = findSnap({x: 2, y: 1}, [line], {osnap: ALL, radius: 8});
    expect(s.kind).toBe('endpoint');
    near(s, {x: 0, y: 0});
  });

  test('returns null outside the radius', () => {
    expect(
      findSnap({x: 40, y: 40}, [line], {osnap: ALL, radius: 8}),
    ).toBeNull();
  });

  test('finds midpoint, center and quadrants', () => {
    expect(findSnap({x: 50, y: 1}, [line], {osnap: ALL, radius: 5}).kind).toBe(
      'midpoint',
    );
    expect(
      findSnap({x: 50, y: 52}, [circle], {osnap: ALL, radius: 5}).kind,
    ).toBe('center');
    const q = findSnap({x: 50, y: 75}, [circle], {osnap: ALL, radius: 5});
    expect(q.kind).toBe('quadrant');
    near(q, {x: 50, y: 75});
  });

  test('arm priority beats proximity: endpoint wins over a nearer midpoint', () => {
    // Short line so the endpoint (0,0) is inside the radius, but the midpoint
    // (5,0) is closer to the cursor than the endpoint is.
    const short = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const s = findSnap({x: 3.5, y: 0.1}, [short], {osnap: ALL, radius: 5});
    expect(s.kind).toBe('endpoint');
    near(s, {x: 0, y: 0});
  });

  test('honours a disarmed snap mode', () => {
    // Disable both endpoint and nearest: nothing on this line may snap.
    const osnap = {...ALL, endpoint: false, nearest: false};
    expect(findSnap({x: 2, y: 1}, [line], {osnap, radius: 8})).toBeNull();
  });

  test('finds the intersection of two crossing lines', () => {
    const other = makeLine({x: 50, y: -20}, {x: 50, y: 20});
    const s = findSnap({x: 51, y: 1}, [line, other], {osnap: ALL, radius: 6});
    expect(s.kind).toBe('intersection');
    near(s, {x: 50, y: 0}, 1e-5);
  });

  test('finds a line/circle intersection', () => {
    // Circle (0,0) r25 crossed by the vertical line x=0. The line's own
    // endpoints are kept well outside the pick radius so this can only be
    // the intersection.
    const c = makeCircle({x: 0, y: 0}, 25);
    const bar = makeLine({x: 0, y: -60}, {x: 0, y: 60});
    const s = findSnap({x: 0, y: 24}, [c, bar], {osnap: ALL, radius: 6});
    expect(s.kind).toBe('intersection');
    near(s, {x: 0, y: 25}, 1e-5);
  });

  test('a circle/line intersection is exact, not snapped to a flattened chord', () => {
    // A chord of this circle is ~1.2 long at the default tolerance, so a
    // chord-based intersection would be visibly off the true crossing.
    // The bar's endpoints are far outside the pick radius.
    const c = makeCircle({x: 0, y: 0}, 25);
    const bar = makeLine({x: -60, y: 12}, {x: 60, y: 12});
    const trueX = Math.sqrt(625 - 144); // ≈21.93
    const s = findSnap({x: trueX, y: 14}, [c, bar], {osnap: ALL, radius: 4});
    expect(s.kind).toBe('intersection');
    // Must lie exactly on the circle: y = 12 → x = ±sqrt(625-144).
    nearNum(s.x, trueX, 1e-6);
    nearNum(s.y, 12, 1e-6);
  });

  test('finds a circle/circle intersection', () => {
    // r25 circles 40 apart meet at x=70, y=50±15.
    const c2 = makeCircle({x: 90, y: 50}, 25);
    const s = findSnap({x: 70, y: 64}, [circle, c2], {osnap: ALL, radius: 6});
    expect(s.kind).toBe('intersection');
    nearNum(dist(s, {x: 50, y: 50}), 25, 1e-5);
    nearNum(dist(s, {x: 90, y: 50}), 25, 1e-5);
  });

  test('ignores shapes the caller asked to skip', () => {
    const s = findSnap({x: 2, y: 1}, [line], {
      osnap: ALL,
      radius: 8,
      ignoreIds: new Set([line.id]),
    });
    expect(s).toBeNull();
  });

  test('perpendicular snap lands a true right angle on the segment', () => {
    const from = {x: 30, y: 20};
    // The foot of the perpendicular is (30,0); probe just beside it.
    const s = findSnap({x: 31, y: 1}, [line], {osnap: ALL, radius: 6, from});
    expect(s.kind).toBe('perpendicular');
    near(s, {x: 30, y: 0}, 1e-5);
    // The foot is genuinely perpendicular: the foot-to-origin vector has no
    // component along the line's direction (the line runs along +x).
    expect(sub(s, from).x).toBeCloseTo(0, 6);
  });

  test('perpendicular snap does not fire on the infinite extension', () => {
    // Foot would be at x=200, far off the 0..100 segment.
    const from = {x: 200, y: 20};
    const s = findSnap({x: 200, y: 1}, [line], {osnap: ALL, radius: 3, from});
    expect(s?.kind).not.toBe('perpendicular');
  });

  test('tangent snap from an external point touches the circle', () => {
    const from = {x: 100, y: 50};
    // d=50, r=25 → the tangent points are at ±60° from the centre→from axis.
    const s = findSnap({x: 62, y: 71}, [circle], {osnap: ALL, radius: 8, from});
    expect(s.kind).toBe('tangent');
    nearNum(dist(s, {x: 50, y: 50}), 25, 1e-5);
    // The radius is perpendicular to the tangent line from `from`.
    const rv = sub(s, {x: 50, y: 50});
    const fv = sub(from, s);
    expect(rv.x * fv.x + rv.y * fv.y).toBeCloseTo(0, 6);
  });

  test('no tangent exists from inside the circle', () => {
    const from = {x: 50, y: 50};
    const s = findSnap({x: 60, y: 60}, [circle], {osnap: ALL, radius: 8, from});
    expect(s?.kind).not.toBe('tangent');
  });

  test('node snap on a polyline vertex', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 50, y: 0},
      {x: 50, y: 50},
    ]);
    const s = findSnap({x: 51, y: 51}, [pl], {osnap: ALL, radius: 5});
    expect(s.kind).toBe('node');
    near(s, {x: 50, y: 50});
  });

  test('nearest snap projects onto the ink', () => {
    const osnap = {...ALL, endpoint: false, midpoint: false, nearest: true};
    const s = findSnap({x: 40, y: 7}, [line], {osnap, radius: 12});
    expect(s.kind).toBe('nearest');
    near(s, {x: 40, y: 0}, 1e-5);
  });

  test('point entities snap as insert points', () => {
    const p = makePoint({x: 12, y: 34});
    const s = findSnap({x: 13, y: 33}, [p], {osnap: ALL, radius: 5});
    expect(s.kind).toBe('insert');
    near(s, {x: 12, y: 34});
  });

  test('hidden shapes never produce snaps', () => {
    const hidden = {...line, hidden: true};
    expect(
      findSnap({x: 2, y: 1}, [hidden], {osnap: ALL, radius: 8}),
    ).toBeNull();
  });

  test('a snapped result carries a human label for the readout', () => {
    const s = findSnap({x: 2, y: 1}, [line], {osnap: ALL, radius: 8});
    expect(s.label).toBe('Endpoint');
  });
});

// ── Tracking ────────────────────────────────────────────────────────────────

describe('trackPoint', () => {
  const from = {x: 0, y: 0};

  test('free tracking passes the point through', () => {
    const r = trackPoint(from, {x: 37, y: 11}, {});
    near(r.point, {x: 37, y: 11});
    expect(r.kind).toBe('free');
  });

  test('ortho locks to the x axis, preserving the dragged distance', () => {
    const raw = {x: 100, y: 4};
    const r = trackPoint(from, raw, {ortho: true});
    nearNum(r.point.y, 0, 1e-9);
    // Locking the *direction* is what AutoCAD does: the length you dragged
    // is kept and the angle is snapped, so x becomes hypot(100,4).
    nearNum(r.point.x, Math.hypot(100, 4), 1e-6);
    nearNum(r.angleDeg, 0, 1e-6);
    expect(r.kind).toBe('ortho');
  });

  test('ortho ignores a drag that is nowhere near an axis', () => {
    const r = trackPoint(from, {x: 100, y: 60}, {ortho: true});
    near(r.point, {x: 100, y: 60}, 1e-6);
  });

  test('polar locks to the nearest increment', () => {
    // Raw direction is 14.57°, nearest 15° multiple is 15°.
    const r = trackPoint(
      from,
      {x: 100, y: 26},
      {polar: true, polarInc: 15, polarTol: 3},
    );
    nearNum(r.angleDeg, 15, 1e-6);
    nearNum(r.distance, Math.hypot(100, 26), 1e-6);
    expect(r.kind).toBe('polar');
  });

  test('polar tolerance leaves a far-off drag free', () => {
    const r = trackPoint(
      from,
      {x: 100, y: 40},
      {polar: true, polarInc: 15, polarTol: 3},
    );
    expect(r.kind).toBe('free');
  });

  test('grid snap quantises to the cell', () => {
    const r = trackPoint(from, {x: 13, y: 27}, {gridSize: 10, gridSnap: true});
    near(r.point, {x: 10, y: 30});
    expect(r.kind).toBe('grid');
  });

  test('an object snap suppresses tracking', () => {
    const snap = {x: 50, y: 1, kind: 'endpoint', label: 'Endpoint'};
    const r = trackPoint(from, {x: 100, y: 4}, {ortho: true, snap});
    near(r.point, snap);
    expect(r.kind).toBe('snap');
    expect(r.snapKind).toBe('endpoint');
  });

  test('a live distance constraint locks the length while the finger moves', () => {
    const r = trackPoint(
      from,
      {x: 100, y: 40},
      {constrain: {kind: 'distance', value: 50}},
    );
    nearNum(r.distance, 50, 1e-6);
  });

  test('a live angle constraint locks the direction', () => {
    const r = trackPoint(
      from,
      {x: 100, y: 40},
      {constrain: {kind: 'angle', value: 90}},
    );
    nearNum(r.angleDeg, 90, 1e-6);
  });

  test('guides are emitted for the canvas to draw', () => {
    const r = trackPoint(from, {x: 100, y: 2}, {ortho: true});
    expect(r.guides.length).toBe(1);
    expect(r.guides[0].kind).toBe('ortho');
  });

  test('polarAnglesFor covers the circle', () => {
    expect(polarAnglesFor(15)).toHaveLength(24);
    expect(polarAnglesFor(90)).toEqual([0, 90, 180, 270]);
  });

  test('dynamicInput renders the readout', () => {
    const r = trackPoint(from, {x: 100, y: 0}, {ortho: true});
    // AutoCAD's dynamic input shows the angle and distance while rubber-banding.
    expect(dynamicInput(r)).toBe('0°   100');
  });
});

// ── Fillet / chamfer ────────────────────────────────────────────────────────

describe('filletCorner', () => {
  test('90° corner of two lines, radius equals the leg length', () => {
    // Two independent lines meeting at (50,0).
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const r1 = runsOf(a)[0];
    const r2 = runsOf(b)[0];
    const f = filletCorner(r1, r2, 10);
    expect(f).not.toBeNull();

    const ap = arcParams(f.arc);
    // Centre is on the bisector 10/sin(45°) from the corner.
    expect(Math.hypot(ap.center.x - 50, ap.center.y - 0)).toBeCloseTo(
      10 / Math.sin(Math.PI / 4),
      6,
    );
    // Both tangent points are exactly `r` from the centre.
    nearNum(dist(ap.center, f.arc.points[1]), 10, 1e-6);
    nearNum(dist(ap.center, f.arc.points[2]), 10, 1e-6);
    // Both tangent points are 10 back along the lines from the corner.
    near(f.arc.points[1], {x: 40, y: 0}, 1e-6);
    near(f.arc.points[2], {x: 50, y: 10}, 1e-6);
  });

  test('the fillet is genuinely tangent: radius meets the line at 90°', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 10);
    const ap = arcParams(f.arc);
    // Radius to the first tangent point is vertical, the line is horizontal.
    const rv = sub(f.arc.points[1], ap.center);
    nearNum(rv.x, 0, 1e-6);
    expect(Math.abs(rv.y)).toBeCloseTo(10, 6);
  });

  test('arc sweep direction follows the corner turn', () => {
    // Corner turning CCW from +x to +y: the fillet arc is a quarter turn.
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 10);
    expect(measure(f.arc).sweepDeg).toBeCloseTo(90, 3);
    expect(f.arc.ccw).toBe(true);
  });

  test('a clockwise corner produces a clockwise fillet arc', () => {
    // Mirror of the above: travel +x then turn down to -y.
    const a = makeLine({x: 0, y: 50}, {x: 50, y: 50});
    const b = makeLine({x: 50, y: 50}, {x: 50, y: 0});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 10);
    expect(f).not.toBeNull();
    expect(f.arc.ccw).toBe(false);
    expect(measure(f.arc).sweepDeg).toBeCloseTo(90, 3);
  });

  test('refuses a radius that cannot fit on the runs', () => {
    const a = makeLine({x: 0, y: 0}, {x: 20, y: 0});
    const b = makeLine({x: 20, y: 0}, {x: 20, y: 20});
    expect(filletCorner(runsOf(a)[0], runsOf(b)[0], 500)).toBeNull();
  });

  test('refuses collinear runs', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 100, y: 0});
    expect(filletCorner(runsOf(a)[0], runsOf(b)[0], 10)).toBeNull();
  });

  test('cornerFrame uses the line intersection, not run1.b', () => {
    // run1 stops at (40,0); run2 crosses x=40 at y=0 but starts elsewhere.
    const a = makeLine({x: 0, y: 0}, {x: 40, y: 0});
    const b = makeLine({x: 40, y: 0}, {x: 40, y: 30});
    const f = cornerFrame(runsOf(a)[0], runsOf(b)[0]);
    near(f.corner, {x: 40, y: 0}, 1e-9);
  });

  test('an obtuse corner uses tan(θ/2) for the tangent length', () => {
    // Corner at (50,0) where run1 runs back along -x and run2 leaves at 135°.
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 0, y: 50});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 10);
    expect(f).not.toBeNull();
    // The two outward directions are u1=(-1,0) and u2=(-0.707,0.707),
    // so θ = 45° and the tangent length is r/tan(22.5°).
    const theta = Math.PI / 4;
    const expectedT = 10 / Math.tan(theta / 2);
    nearNum(dist(f.arc.points[1], {x: 50, y: 0}), expectedT, 1e-6);
    // And the arc really is tangent at both ends.
    const ap = arcParams(f.arc);
    nearNum(dist(ap.center, f.arc.points[1]), 10, 1e-6);
    nearNum(dist(ap.center, f.arc.points[2]), 10, 1e-6);
  });
});

describe('chamferCorner', () => {
  test('90° corner with equal distances cuts a diagonal', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const c = chamferCorner(runsOf(a)[0], runsOf(b)[0], 10);
    expect(c).not.toBeNull();
    near(c.line.points[0], {x: 40, y: 0}, 1e-6);
    near(c.line.points[1], {x: 50, y: 10}, 1e-6);
    // A 10/10 chamfer on a right angle is a 45° bevel of length 10√2.
    nearNum(dist(c.line.points[0], c.line.points[1]), Math.hypot(10, 10), 1e-6);
  });

  test('two unequal distances land each end independently', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const c = chamferCorner(runsOf(a)[0], runsOf(b)[0], 5, 20);
    near(c.line.points[0], {x: 45, y: 0}, 1e-6);
    near(c.line.points[1], {x: 50, y: 20}, 1e-6);
  });

  test('refuses a distance longer than the run', () => {
    const a = makeLine({x: 0, y: 0}, {x: 20, y: 0});
    const b = makeLine({x: 20, y: 0}, {x: 20, y: 20});
    expect(chamferCorner(runsOf(a)[0], runsOf(b)[0], 100)).toBeNull();
  });
});

// ── Trim / extend ───────────────────────────────────────────────────────────

describe('trimRun', () => {
  test('cuts a run back to the crossing point', () => {
    const target = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const cut = makeLine({x: 50, y: -20}, {x: 50, y: 20});
    const r = trimRun(runsOf(target)[0], runsOf(cut)[0], {x: 10, y: 0});
    expect(r).not.toBeNull();
    near(r.point, {x: 50, y: 0}, 1e-9);
    // The kept part runs from the crossing to the far end.
    near(r.newA, {x: 50, y: 0}, 1e-9);
    near(r.newB, {x: 100, y: 0}, 1e-9);
  });

  test('returns null when the runs do not cross', () => {
    const target = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const other = makeLine({x: 50, y: 20}, {x: 50, y: 40});
    expect(
      trimRun(runsOf(target)[0], runsOf(other)[0], {x: 10, y: 0}),
    ).toBeNull();
  });
});

describe('extendRun', () => {
  test('pushes a short line out to the boundary', () => {
    const target = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const wall = makeLine({x: 80, y: -20}, {x: 80, y: 20});
    const r = extendRun(runsOf(target)[0], wall, {x: 49, y: 0});
    expect(r).not.toBeNull();
    near(r.newB, {x: 80, y: 0}, 1e-9);
    near(r.newA, {x: 0, y: 0}, 1e-9);
  });

  test('returns null when nothing is in the way', () => {
    const target = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const wall = makeLine({x: 80, y: 50}, {x: 80, y: 80});
    expect(extendRun(runsOf(target)[0], wall, {x: 49, y: 0})).toBeNull();
  });
});

describe('nearestRun', () => {
  test('picks the closest run and reports the foot', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 100, y: 0},
      {x: 100, y: 100},
    ]);
    const r = nearestRun(pl, {x: 50, y: 8});
    expect(r.segIndex).toBe(0);
    near(r.foot, {x: 50, y: 0}, 1e-9);
  });
});

// ── Modify ops ──────────────────────────────────────────────────────────────

describe('offsetShape', () => {
  test('offsets a line to the left of travel', () => {
    // AutoCAD's OFFSET puts a positive distance to the left of the direction
    // of travel. Travelling +x, left is +y.
    const l = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const [out] = offsetShape(l, 10);
    expect(out.type).toBe('line');
    near(out.points[0], {x: 0, y: 10}, 1e-6);
    near(out.points[1], {x: 100, y: 10}, 1e-6);
    // And to the right for a negative distance.
    const [right] = offsetShape(l, -10);
    near(right.points[0], {x: 0, y: -10}, 1e-6);
  });

  test('offsets a circle by changing the radius', () => {
    const c = makeCircle({x: 0, y: 0}, 25);
    const [out] = offsetShape(c, 5);
    nearNum(out.radius, 30, 1e-9);
    const [shrunk] = offsetShape(c, -5);
    nearNum(shrunk.radius, 20, 1e-9);
  });

  test('offsets an open polyline and keeps it open', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 100, y: 0},
      {x: 100, y: 100},
    ]);
    const [out] = offsetShape(pl, 10);
    expect(out.type).toBe('polyline');
    expect(out.closed).toBe(false);
    // First leg travels +x → offset to +y.
    near(out.points[0], {x: 0, y: 10}, 1e-6);
    // The corner is mitred, so it sits at (+10,+10) from the original corner.
    near(out.points[1], {x: 110, y: 10}, 1e-6);
    // Last leg travels +y → left is -x, so its far end moves to x=90.
    near(out.points[2], {x: 90, y: 100}, 1e-6);
  });

  test('refuses a non-offsettable entity', () => {
    expect(offsetShape(makePoint({x: 0, y: 0}), 5)).toEqual([]);
  });
});

describe('joinCollinear', () => {
  test('merges two abutting lines into one', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 120, y: 0});
    const r = joinCollinear([a, b]);
    expect(r).not.toBeNull();
    expect(r.created).toHaveLength(1);
    near(r.created[0].points[0], {x: 0, y: 0}, 1e-6);
    near(r.created[0].points[1], {x: 120, y: 0}, 1e-6);
  });

  test('merges an overlapping run to the union of the two spans', () => {
    const a = makeLine({x: 0, y: 0}, {x: 60, y: 0});
    const b = makeLine({x: 40, y: 0}, {x: 100, y: 0});
    const r = joinCollinear([a, b]);
    expect(r.created).toHaveLength(1);
    near(r.created[0].points[1], {x: 100, y: 0}, 1e-6);
  });

  test('handles reversed order', () => {
    const a = makeLine({x: 120, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const r = joinCollinear([a, b]);
    expect(r.created).toHaveLength(1);
    near(r.created[0].points[0], {x: 0, y: 0}, 1e-6);
    near(r.created[0].points[1], {x: 120, y: 0}, 1e-6);
  });

  test('leaves parallel but separate lines alone', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 0, y: 10}, {x: 50, y: 10});
    expect(joinCollinear([a, b])).toBeNull();
  });

  test('does not merge perpendicular lines', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    expect(joinCollinear([a, b])).toBeNull();
  });
});

describe('breakLine', () => {
  test('splits a line at an interior point', () => {
    const l = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const out = breakLine(l, {x: 40, y: 0});
    expect(out).toHaveLength(2);
    near(out[0].points[1], {x: 40, y: 0}, 1e-6);
    near(out[1].points[0], {x: 40, y: 0}, 1e-6);
  });

  test('refuses to break at an endpoint', () => {
    const l = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    expect(breakLine(l, {x: 0, y: 0})).toBeNull();
  });
});

describe('explodeShape', () => {
  test('a polyline becomes its constituent lines', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 50, y: 0},
      {x: 50, y: 50},
    ]);
    const out = explodeShape(pl);
    expect(out).toHaveLength(2);
    expect(out.every(s => s.type === 'line')).toBe(true);
  });

  test('a closed polyline also yields the closing segment', () => {
    const pl = makePolyline(
      [
        {x: 0, y: 0},
        {x: 50, y: 0},
        {x: 50, y: 50},
      ],
      true,
    );
    expect(explodeShape(pl)).toHaveLength(3);
  });

  test('a circle does not explode', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    expect(explodeShape(c)).toEqual([c]);
  });
});

describe('arrays', () => {
  test('rectangular array leaves the original in place', () => {
    const l = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const out = rectangularArray(l, 20, 20, 3, 4);
    expect(out).toHaveLength(3 * 4 - 1);
    near(out[0].points[0], {x: 20, y: 0}, 1e-9);
  });

  test('polar array of 4 puts copies at the cardinal offsets', () => {
    const p = makePoint({x: 10, y: 0});
    const out = polarArray(p, {x: 0, y: 0}, 4);
    expect(out).toHaveLength(3);
    near(out[0].points[0], {x: 0, y: 10}, 1e-9);
    near(out[1].points[0], {x: -10, y: 0}, 1e-9);
    near(out[2].points[0], {x: 0, y: -10}, 1e-9);
  });
});

describe('transforms', () => {
  test('translate moves every point', () => {
    const l = translate(makeLine({x: 0, y: 0}, {x: 10, y: 0}), {x: 5, y: 5});
    near(l.points[0], {x: 5, y: 5}, 1e-9);
  });

  test('rotateDeg 90° about the origin', () => {
    const p = rotateDeg(makePoint({x: 10, y: 0}), {x: 0, y: 0}, 90);
    near(p.points[0], {x: 0, y: 10}, 1e-9);
  });

  test('scale keeps the base point fixed', () => {
    const p = scale(makePoint({x: 10, y: 0}), {x: 0, y: 0}, 3);
    near(p.points[0], {x: 30, y: 0}, 1e-9);
  });
});

// ── Geometry regressions the engine depends on ──────────────────────────────

describe('geometry cross-checks', () => {
  test('segmentIntersect handles the endpoint-touching case', () => {
    const hit = segmentIntersect(
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 10},
      1e-6,
    );
    expect(hit).not.toBeNull();
    near(hit.point, {x: 10, y: 0}, 1e-6);
  });

  test('circleCircleIntersect returns both crossings', () => {
    const hits = circleCircleIntersect({x: 0, y: 0}, 5, {x: 8, y: 0}, 5);
    expect(hits).toHaveLength(2);
  });

  test('lineCircleIntersect returns both crossings', () => {
    const hits = lineCircleIntersect(
      {x: -10, y: 0},
      {x: 10, y: 0},
      {x: 0, y: 0},
      5,
    );
    expect(hits).toHaveLength(2);
  });

  test('closestOnSegment clamps to the endpoints', () => {
    near(
      closestOnSegment({x: -5, y: 0}, {x: 0, y: 0}, {x: 10, y: 0}),
      {x: 0, y: 0},
      1e-9,
    );
    near(
      closestOnSegment({x: 15, y: 0}, {x: 0, y: 0}, {x: 10, y: 0}),
      {x: 10, y: 0},
      1e-9,
    );
  });

  test('an arc built from 3 points keeps its endpoints', () => {
    const a = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, true);
    const ap = arcParams(a);
    nearNum(ap.sweepDeg, 90, 1e-6);
    nearNum(ap.r, 10, 1e-6);
  });

  test('segmentsOf flattens a circle into chords that stay on the radius', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    for (const s of segmentsOf(c, 0.2)) {
      // Each endpoint must be on the circle.
      nearNum(Math.hypot(s.a.x, s.a.y), 10, 0.05);
      nearNum(Math.hypot(s.b.x, s.b.y), 10, 0.05);
    }
  });

  test('shapeBBox encloses the geometry', () => {
    const b = shapeBBox(makeCircle({x: 0, y: 0}, 10));
    nearNum(b.minX, -10, 1e-6);
    nearNum(b.maxY, 10, 1e-6);
  });
});
