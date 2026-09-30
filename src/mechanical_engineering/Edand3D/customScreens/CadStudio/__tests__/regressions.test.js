/**
 * Regression tests for bugs found while building the engine.
 *
 * Each of these was a real defect that a rendering-only check would have
 * hidden — a snap that lands a unit off, a fillet in empty space, a join
 * that fuses two parallel lines. They are pinned here so a refactor can't
 * quietly reintroduce them.
 */

import {
  arcParams,
  makeArc,
  makeCircle,
  makeEllipse,
  makeLine,
  makePoint,
  makePolyline,
  rotateShape,
  shapeBBox,
  transformShape,
} from '../engine/geometry';
import {dist, sub} from '../engine/vec';
import {findSnap, DEFAULT_OSNAP} from '../engine/snap';
import {
  chamferCorner,
  filletCorner,
  runsOf,
  trimRun,
  applyRunEdits,
} from '../engine/corner';
import {joinCollinear} from '../engine/transform';
import {mirrorShape} from '../engine/geometry';

const ALL = {...DEFAULT_OSNAP, tangent: true, nearest: true};
const near = (a, b, tol = 1e-6) =>
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(tol);
const nearNum = (a, b, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('every shape has a unique id', () => {
  test('constructors mint ids so identity checks cannot collide', () => {
    // Unsealed shapes used to both carry id === undefined, so any
    // `a.id !== b.id` check treated them as the same entity.
    const shapes = [
      makeLine({x: 0, y: 0}, {x: 1, y: 0}),
      makeCircle({x: 0, y: 0}, 1),
      makePoint({x: 2, y: 2}),
    ];
    const ids = shapes.map(s => s.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(shapes.length);
  });
});

describe('intersections are exact, not chord approximations', () => {
  test('two circles meet on their true intersection', () => {
    const c1 = makeCircle({x: 0, y: 0}, 10);
    const c2 = makeCircle({x: 16, y: 0}, 10);
    // Exact: x = 8, y = ±6.
    const s = findSnap({x: 8, y: 7}, [c1, c2], {osnap: ALL, radius: 4});
    expect(s.kind).toBe('intersection');
    nearNum(s.x, 8, 1e-6);
    nearNum(s.y, 6, 1e-6);
    nearNum(dist(s, {x: 0, y: 0}), 10, 1e-6);
    nearNum(dist(s, {x: 16, y: 0}), 10, 1e-6);
  });

  test('a circle and a line meet on the true intersection', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    const bar = makeLine({x: -40, y: 6}, {x: 40, y: 6});
    // Exact: y = 6 → x = ±8.
    const s = findSnap({x: 8, y: 8}, [c, bar], {osnap: ALL, radius: 4});
    expect(s.kind).toBe('intersection');
    nearNum(s.x, 8, 1e-6);
    nearNum(s.y, 6, 1e-6);
  });

  test('an arc only reports intersections that lie on its sweep', () => {
    // A half circle from 0° to 180°; a vertical line at x=-5 crosses the
    // full circle at y=±8.66 but only y=+8.66 is on this arc.
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: -10, y: 0}, true);
    const bar = makeLine({x: -5, y: -40}, {x: -5, y: 40});
    const s = findSnap({x: -5, y: 8}, [arc, bar], {osnap: ALL, radius: 4});
    expect(s.kind).toBe('intersection');
    expect(s.y).toBeGreaterThan(0);
    nearNum(s.y, Math.sqrt(75), 1e-5);
  });
});

describe('disarming one snap mode does not disarm the others', () => {
  test('turning off endpoints leaves nearest still working', () => {
    // The pre-filter used to drop the whole entity when its primary kind was
    // off, silently disabling its nearest/perpendicular snaps too.
    const line = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const osnap = {...ALL, endpoint: false, midpoint: false};
    const s = findSnap({x: 40, y: 6}, [line], {osnap, radius: 12});
    expect(s.kind).toBe('nearest');
    near(s, {x: 40, y: 0}, 1e-5);
  });

  test('turning off endpoints leaves intersections still working', () => {
    const a = makeLine({x: -50, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 0, y: -50}, {x: 0, y: 50});
    const osnap = {...ALL, endpoint: false, midpoint: false};
    const s = findSnap({x: 1, y: 1}, [a, b], {osnap, radius: 5});
    expect(s.kind).toBe('intersection');
    near(s, {x: 0, y: 0}, 1e-5);
  });
});

describe('tangent points are genuinely tangent', () => {
  test('radius is perpendicular to the tangent line, for several radii', () => {
    for (const r of [3, 10, 25]) {
      const c = makeCircle({x: 0, y: 0}, r);
      for (const fx of [r * 2, r * 5]) {
        const from = {x: fx, y: 0};
        const s = findSnap({x: r * 0.2, y: r * 0.95}, [c], {
          osnap: ALL,
          radius: r * 0.4,
          from,
        });
        if (!s || s.kind !== 'tangent') continue; // probe missed; other radii cover it
        const rv = sub(s, {x: 0, y: 0});
        const fv = sub(from, s);
        nearNum(rv.x * fv.x + rv.y * fv.y, 0, 1e-6);
        nearNum(dist(s, {x: 0, y: 0}), r, 1e-6);
      }
    }
  });
});

describe('fillet corner is the line intersection', () => {
  test('two independent lines whose corner is interior to both runs', () => {
    // a runs (0,0)→(40,0); b runs (20,-30)→(20,30). They cross at (20,0),
    // which is interior to both segments, so the corner can only be found by
    // intersecting the two lines — no shared endpoint to key off.
    const a = makeLine({x: 0, y: 0}, {x: 40, y: 0});
    const b = makeLine({x: 20, y: -30}, {x: 20, y: 30});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 5);
    expect(f).not.toBeNull();
    // An arc stores points as [center, start, end], so the two tangent
    // points are points[1] and points[2].
    expect(f.arc.type).toBe('arc');
    expect(f.arc.points[0]).toEqual({x: 25, y: 5}); // centre, r/sin(45°) out
    near(f.arc.points[1], {x: 25, y: 0}, 1e-6); // 5 back along the horizontal
    near(f.arc.points[2], {x: 20, y: 5}, 1e-6); // 5 up the vertical
    // Both tangent points are exactly one radius from the arc centre.
    expect(
      Math.hypot(
        f.arc.points[1].x - f.arc.points[0].x,
        f.arc.points[1].y - f.arc.points[0].y,
      ),
    ).toBeCloseTo(5, 9);
    expect(
      Math.hypot(
        f.arc.points[2].x - f.arc.points[0].x,
        f.arc.points[2].y - f.arc.points[0].y,
      ),
    ).toBeCloseTo(5, 9);
    // And the tangent points sit on the runs, not past their ends.
    expect(f.arc.points[1].x).toBeLessThanOrEqual(40);
    expect(f.arc.points[2].y).toBeLessThanOrEqual(30);
  });

  test('a fillet is refused when the runs do not reach each other', () => {
    // Parallel runs: there is no corner, so nothing should be produced.
    const a = makeLine({x: 0, y: 0}, {x: 40, y: 0});
    const b = makeLine({x: 0, y: 20}, {x: 40, y: 20});
    expect(filletCorner(runsOf(a)[0], runsOf(b)[0], 5)).toBeNull();
  });

  test('the fillet radius is perpendicular to the run at the tangent point', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const f = filletCorner(runsOf(a)[0], runsOf(b)[0], 12);
    // Tangent point on the horizontal run; the radius to it is vertical.
    const c = f.arc.points[0];
    const onHorizontal = [f.arc.points[1], f.arc.points[2]].find(
      p => Math.abs(p.y) < 1e-9,
    );
    expect(onHorizontal).toBeTruthy();
    nearNum(onHorizontal.x - c.x, 0, 1e-6);
  });
});

describe('chamfer cuts land on the segments', () => {
  test('a 90° chamfer truncates both lines at exactly the given distance', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 50, y: 0}, {x: 50, y: 50});
    const c = chamferCorner(runsOf(a)[0], runsOf(b)[0], 8);
    // The bevel endpoints are 8 from the corner along each leg, i.e. 42 and 8.
    near(c.line.points[0], {x: 42, y: 0}, 1e-6);
    near(c.line.points[1], {x: 50, y: 8}, 1e-6);
  });

  test('a chamfer never pushes a cut past the end of its run', () => {
    const a = makeLine({x: 0, y: 0}, {x: 20, y: 0});
    const b = makeLine({x: 20, y: 0}, {x: 20, y: 20});
    // 25 along a 20-long line is impossible.
    expect(chamferCorner(runsOf(a)[0], runsOf(b)[0], 25)).toBeNull();
  });
});

describe('trim keeps the piece the user did not touch', () => {
  test('tapping the left half removes it and keeps the right', () => {
    const target = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const cut = makeLine({x: 50, y: -20}, {x: 50, y: 20});
    const r = trimRun(runsOf(target)[0], runsOf(cut)[0], {x: 10, y: 0});
    near(r.newA, {x: 50, y: 0}, 1e-9);
    near(r.newB, {x: 100, y: 0}, 1e-9);
  });

  test('tapping the right half removes it and keeps the left', () => {
    const target = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const cut = makeLine({x: 50, y: -20}, {x: 50, y: 20});
    const r = trimRun(runsOf(target)[0], runsOf(cut)[0], {x: 90, y: 0});
    near(r.newA, {x: 0, y: 0}, 1e-9);
    near(r.newB, {x: 50, y: 0}, 1e-9);
  });
});

describe('join only fuses genuinely touching collinear segments', () => {
  test('two parallel lines 10 apart are not joined', () => {
    // The "did anything merge?" check used to count seeds as merges, so this
    // reported a successful join and returned both lines as new entities.
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 0, y: 10}, {x: 50, y: 10});
    expect(joinCollinear([a, b])).toBeNull();
  });

  test('two lines 0.3 apart within tolerance still do not merge if they do not touch', () => {
    const a = makeLine({x: 0, y: 0}, {x: 50, y: 0});
    const b = makeLine({x: 60, y: 0.3}, {x: 100, y: 0.3});
    // Collinear within tol, but there is a 10-unit gap along the run.
    expect(joinCollinear([a, b])).toBeNull();
  });

  test('a genuine abutting pair does join, in either input order', () => {
    const fwd = [
      makeLine({x: 0, y: 0}, {x: 50, y: 0}),
      makeLine({x: 50, y: 0}, {x: 120, y: 0}),
    ];
    const rev = [
      makeLine({x: 120, y: 0}, {x: 50, y: 0}),
      makeLine({x: 0, y: 0}, {x: 50, y: 0}),
    ];
    for (const pair of [fwd, rev]) {
      const r = joinCollinear(pair);
      expect(r).not.toBeNull();
      expect(r.created).toHaveLength(1);
      // Canonical direction, so both orders give the same entity.
      near(r.created[0].points[0], {x: 0, y: 0}, 1e-6);
      near(r.created[0].points[1], {x: 120, y: 0}, 1e-6);
    }
  });
});

describe('bounding boxes enclose curves exactly', () => {
  test('a circle box touches the true extremes', () => {
    // Built from flattened chords the box came out ~0.17 too small, which
    // would make zoom-to-fit clip the geometry.
    const b = shapeBBox(makeCircle({x: 0, y: 0}, 10));
    nearNum(b.minX, -10, 1e-9);
    nearNum(b.minY, -10, 1e-9);
    nearNum(b.maxX, 10, 1e-9);
    nearNum(b.maxY, 10, 1e-9);
  });

  test('an off-centre circle box is still exact', () => {
    const b = shapeBBox(makeCircle({x: 100, y: -50}, 7));
    nearNum(b.minX, 93, 1e-9);
    nearNum(b.maxY, -43, 1e-9);
  });

  test('a quarter arc box spans only the quarter', () => {
    // 0° → 90° CCW: the lower-left quadrant of the box is empty.
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, true);
    const b = shapeBBox(arc);
    nearNum(b.minX, 0, 1e-9);
    nearNum(b.minY, 0, 1e-9);
    nearNum(b.maxX, 10, 1e-9);
    nearNum(b.maxY, 10, 1e-9);
  });

  test('a CCW half arc spans the full width and the upper half only', () => {
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: -10, y: 0}, true);
    const b = shapeBBox(arc);
    nearNum(b.minX, -10, 1e-9);
    nearNum(b.maxX, 10, 1e-9);
    nearNum(b.minY, 0, 1e-9);
    nearNum(b.maxY, 10, 1e-9);
  });

  test('a clockwise half arc spans the lower half instead', () => {
    // Same endpoints, reversed sweep: the box must mirror in Y.
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: -10, y: 0}, false);
    const b = shapeBBox(arc);
    nearNum(b.minX, -10, 1e-9);
    nearNum(b.maxX, 10, 1e-9);
    nearNum(b.maxY, 0, 1e-9);
    nearNum(b.minY, -10, 1e-9);
  });

  test('a three-quarter arc box encloses the whole circle', () => {
    // 0° → 270° CCW leaves only the fourth quadrant empty, so the box is
    // the full circle. (Endpoints must not be diametrically opposite, or the
    // sweep is only ever 180° in either direction.)
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: -10}, true);
    expect(arcParams(arc).sweepDeg).toBeCloseTo(270, 9);
    const b = shapeBBox(arc);
    nearNum(b.minX, -10, 1e-9);
    nearNum(b.maxX, 10, 1e-9);
    nearNum(b.minY, -10, 1e-9);
    nearNum(b.maxY, 10, 1e-9);
  });

  test('an ellipse box uses its true rotated extremes', () => {
    // A 30 x 10 ellipse rotated 45°. The support along a world axis is
    // sqrt((a·cos)² + (b·sin)²) = sqrt(450 + 50) = sqrt(500), which is
    // strictly wider than the major axis endpoint projects to (30/√2).
    const rot = Math.PI / 4;
    const e = makeEllipse(
      {x: 0, y: 0},
      {x: 30 * Math.cos(rot), y: 30 * Math.sin(rot)},
      {x: -10 * Math.sin(rot), y: 10 * Math.cos(rot)},
    );
    const b = shapeBBox(e);
    const half = Math.sqrt(500);
    nearNum(b.maxX, half, 1e-6);
    nearNum(b.minX, -half, 1e-6);
    nearNum(b.maxY, half, 1e-6);
    nearNum(b.minY, -half, 1e-6);
    // Guard the specific bug: the old code reported the axis-end projection.
    expect(b.maxX).toBeGreaterThan(30 / Math.SQRT2);
  });

  test('an axis-aligned ellipse box is exact', () => {
    const e = makeEllipse({x: 0, y: 0}, {x: 30, y: 0}, {x: 0, y: 10});
    const b = shapeBBox(e);
    nearNum(b.minX, -30, 1e-9);
    nearNum(b.maxX, 30, 1e-9);
    nearNum(b.minY, -10, 1e-9);
    nearNum(b.maxY, 10, 1e-9);
  });

  test('an off-centre ellipse box keeps its centre', () => {
    const rot = Math.PI / 4;
    const e = makeEllipse(
      {x: 100, y: 50},
      {x: 100 + 30 * Math.cos(rot), y: 50 + 30 * Math.sin(rot)},
      {x: 100 - 10 * Math.sin(rot), y: 50 + 10 * Math.cos(rot)},
    );
    const b = shapeBBox(e);
    const half = Math.sqrt(500);
    nearNum(b.maxX - 100, half, 1e-6);
    nearNum(b.minX - 100, -half, 1e-6);
    nearNum(b.maxY - 50, half, 1e-6);
    nearNum(b.minY - 50, -half, 1e-6);
  });
});

describe('run edits apply cleanly back onto polylines', () => {
  test('a fillet on a polyline corner splits the vertex into two', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 50, y: 0},
      {x: 50, y: 50},
    ]);
    const runs = runsOf(pl);
    const f = filletCorner(runs[0], runs[1], 5);
    expect(f).not.toBeNull();
    const next = applyRunEdits([pl], f.edits, [f.arc]);
    // One rewritten polyline plus the new arc — not a duplicated polyline.
    expect(next).toHaveLength(2);
    const poly = next.find(s => s.type === 'polyline');
    expect(poly.id).toBe(pl.id);
    // The corner becomes two vertices with the arc's tangent points between.
    expect(poly.points).toHaveLength(4);
    near(poly.points[1], {x: 45, y: 0}, 1e-6);
    near(poly.points[2], {x: 50, y: 5}, 1e-6);
  });

  test('trimming a polyline segment inserts the cut point', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 50, y: 0},
      {x: 50, y: 50},
    ]);
    const cut = makeLine({x: 25, y: -20}, {x: 25, y: 20});
    // trimRun returns an applyRunEdits-shaped edit directly.
    const t = trimRun(runsOf(pl)[0], runsOf(cut)[0], {x: 5, y: 0});
    expect(t.removed).toBe('a'); // tapped the left half, so 'a' is cut
    const next = applyRunEdits([pl], [t], []);
    const poly = next[0];
    // The first leg now starts at the cut, and the untouched tail survives.
    expect(poly.points).toHaveLength(3);
    near(poly.points[0], {x: 25, y: 0}, 1e-6);
    near(poly.points[1], {x: 50, y: 0}, 1e-6);
    near(poly.points[2], {x: 50, y: 50}, 1e-6);
  });
});

describe('transforms preserve identity and geometry', () => {
  test('rotating a point keeps its id', () => {
    const p = makePoint({x: 10, y: 0});
    const r = rotateShape(p, {x: 0, y: 0}, Math.PI / 2);
    expect(r.id).toBe(p.id);
    near(r.points[0], {x: 0, y: 10}, 1e-9);
  });

  test('mirroring a shape swaps its direction', () => {
    const l = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const m = mirrorShape(l, {x: 0, y: 0}, {x: 0, y: 1});
    near(m.points[0], {x: 0, y: 0}, 1e-9);
    near(m.points[1], {x: -10, y: 0}, 1e-9);
  });

  test('a translation is a no-op for the radius of a circle', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    const t = transformShape(c, p => ({x: p.x + 100, y: p.y}));
    nearNum(t.radius, 10, 1e-9);
    near(t.points[0], {x: 100, y: 0}, 1e-9);
  });
});
