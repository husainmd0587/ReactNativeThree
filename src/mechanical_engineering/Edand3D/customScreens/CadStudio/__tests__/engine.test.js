import {
  arcFrom3Points,
  arcParams,
  catmullRom,
  circleCircleIntersect,
  closestOnSegment,
  distToSegment,
  ellipseParams,
  lineCircleIntersect,
  lineLineIntersect,
  makeArc,
  makeCircle,
  measure,
  mirrorShape,
  pointInShape,
  ringOf,
  rotateShape,
  scaleShape,
  segmentsOf,
  segmentIntersect,
  signedArea,
  translateShape,
} from '../engine/geometry';
import {
  parseAngle,
  parseNumber,
  parsePoint,
  splitCommand,
  tokenize,
} from '../engine/parse';

describe('parse — AutoCAD coordinate grammar', () => {
  it('parses plain numbers with unit suffixes', () => {
    expect(parseNumber('50')).toBe(50);
    expect(parseNumber('2.5')).toBe(2.5);
    expect(parseNumber('-7')).toBe(-7);
    expect(parseNumber('1in')).toBeCloseTo(25.4, 6);
    expect(parseNumber('3"')).toBeCloseTo(76.2, 6);
    expect(parseNumber('10cm')).toBe(100);
    expect(parseNumber('2m')).toBe(2000);
    expect(parseNumber('abc')).toBeNull();
  });

  it('parses absolute cartesian points', () => {
    expect(parsePoint('50,60')).toEqual({x: 50, y: 60});
    expect(parsePoint('#10, -5')).toEqual({x: 10, y: -5});
    expect(parsePoint('1in,2in')).toEqual({x: 25.4, y: 50.8});
  });

  it('parses relative points against a base', () => {
    expect(parsePoint('@100,50', {x: 10, y: 20})).toEqual({x: 110, y: 70});
  });

  it('parses polar points, absolute and relative', () => {
    const abs = parsePoint('100<45');
    expect(abs.x).toBeCloseTo(70.7107, 3);
    expect(abs.y).toBeCloseTo(70.7107, 3);

    const rel = parsePoint('@100<0', {x: 5, y: 5});
    expect(rel.x).toBeCloseTo(105, 6);
    expect(rel.y).toBeCloseTo(5, 6);
  });

  it('treats a bare number at a point prompt as direct distance', () => {
    // Moving right from (0,0) with the previous point at (-10,0).
    expect(parsePoint('25', {x: 0, y: 0}, {x: -10, y: 0})).toEqual({
      x: 25,
      y: 0,
    });
    // Up from (0,0) with the previous point at (0,-10).
    expect(parsePoint('25', {x: 0, y: 0}, {x: 0, y: -10})).toEqual({
      x: 0,
      y: 25,
    });
  });

  it('keeps direction for a bare @distance', () => {
    expect(parsePoint('@10', {x: 0, y: 0}, {x: -10, y: 0})).toEqual({
      x: 10,
      y: 0,
    });
  });

  it('reads a bare angle as direction at the same distance', () => {
    // Distance carried over from the previous segment (|(0,0)->(10,0)| = 10),
    // re-aimed at 90°: the new point sits 10 directly above the last one.
    const p = parsePoint('<90', {x: 10, y: 0}, {x: 0, y: 0});
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(10, 6);
  });

  it('normalises angles into 0-360', () => {
    expect(parseAngle('-90')).toBe(270);
    expect(parseAngle('45deg')).toBe(45);
    expect(parseAngle('450')).toBe(90);
  });

  it('tokenises and splits command lines, honouring quotes', () => {
    expect(tokenize('  RECTANG   10,10  50,50 ')).toEqual([
      'RECTANG',
      '10,10',
      '50,50',
    ]);
    expect(tokenize('MTEXT "10 M3" 5')).toEqual(['MTEXT', '10 M3', '5']);
    const {name, args} = splitCommand('circle 50,50 25');
    expect(name).toBe('CIRCLE');
    expect(args).toEqual(['50,50', '25']);
  });
});

describe('geometry — projections and intersections', () => {
  it('projects a point onto a segment, clamping to the ends', () => {
    const on = closestOnSegment({x: 5, y: 5}, {x: 0, y: 0}, {x: 10, y: 0});
    expect(on).toEqual({x: 5, y: 0});
    const clamped = closestOnSegment(
      {x: -5, y: 0},
      {x: 0, y: 0},
      {x: 10, y: 0},
    );
    expect(clamped).toEqual({x: 0, y: 0});
  });

  it('measures distance to a segment', () => {
    expect(
      distToSegment({x: 5, y: 3}, {x: 0, y: 0}, {x: 10, y: 0}),
    ).toBeCloseTo(3, 9);
  });

  it('intersects two infinite lines', () => {
    const p = lineLineIntersect(
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 5, y: -5},
      {x: 5, y: 5},
    );
    expect(p).toEqual({x: 5, y: 0});
    expect(
      lineLineIntersect({x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}),
    ).toBeNull();
  });

  it('intersects two finite segments, with tolerance for near-misses', () => {
    const hit = segmentIntersect(
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 5, y: -5},
      {x: 5, y: 5},
    );
    expect(hit.point).toEqual({x: 5, y: 0});
    // Crossing point outside the finite segment: no hit.
    expect(
      segmentIntersect({x: 0, y: 0}, {x: 1, y: 0}, {x: 5, y: -5}, {x: 5, y: 5}),
    ).toBeNull();
  });

  it('finds line/circle and circle/circle intersections', () => {
    const lc = lineCircleIntersect(
      {x: -10, y: 0},
      {x: 10, y: 0},
      {x: 0, y: 0},
      5,
    );
    expect(lc).toHaveLength(2);
    expect(lc[0].x).toBeCloseTo(-5, 6);

    const cc = circleCircleIntersect({x: 0, y: 0}, 5, {x: 6, y: 0}, 5);
    expect(cc).toHaveLength(2);
    expect(cc[0].x).toBeCloseTo(3, 6);
    expect(circleCircleIntersect({x: 0, y: 0}, 1, {x: 10, y: 0}, 1)).toEqual(
      [],
    );
  });
});

describe('geometry — arcs', () => {
  it('builds a 3-point arc and reports its sweep', () => {
    // Start at (10,0), through (0,10), end at (-10,0) — a half circle.
    const a = arcFrom3Points({x: 10, y: 0}, {x: 0, y: 10}, {x: -10, y: 0});
    expect(a).not.toBeNull();
    expect(a.r).toBeCloseTo(10, 6);
    expect(a.startDeg).toBeCloseTo(0, 6);
    expect(a.endDeg).toBeCloseTo(180, 6);
    expect(a.ccw).toBe(true);

    const params = arcParams(
      makeArc(a.center, {x: 10, y: 0}, {x: -10, y: 0}, true),
    );
    expect(params.sweepDeg).toBeCloseTo(180, 6);
  });

  it('reverses direction for a mirrored 3-point arc', () => {
    const a = arcFrom3Points({x: 10, y: 0}, {x: 0, y: -10}, {x: -10, y: 0});
    expect(a.ccw).toBe(false);
    expect(
      arcParams(makeArc(a.center, {x: 10, y: 0}, {x: -10, y: 0}, false))
        .sweepDeg,
    ).toBeCloseTo(180, 6);
  });

  it('returns null for collinear points', () => {
    expect(arcFrom3Points({x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0})).toBeNull();
  });
});

describe('geometry — transforms preserve measurements', () => {
  const line = {
    type: 'line',
    points: [
      {x: 0, y: 0},
      {x: 30, y: 40},
    ],
  };

  it('translates and rotates', () => {
    const moved = translateShape(line, {x: 10, y: -5});
    expect(moved.points[0]).toEqual({x: 10, y: -5});
    expect(measure(moved).length).toBeCloseTo(50, 6);

    const turned = rotateShape(line, {x: 0, y: 0}, Math.PI / 2);
    expect(turned.points[1].x).toBeCloseTo(-40, 6);
    expect(turned.points[1].y).toBeCloseTo(30, 6);
    expect(measure(turned).length).toBeCloseTo(50, 6);
  });

  it('scales length and circle radius', () => {
    expect(measure(scaleShape(line, {x: 0, y: 0}, 2)).length).toBeCloseTo(
      100,
      6,
    );
    const c = makeCircle({x: 0, y: 0}, 5);
    expect(scaleShape(c, {x: 0, y: 0}, 3).radius).toBeCloseTo(15, 6);
  });

  it('mirrors across a line', () => {
    const m = mirrorShape(line, {x: 0, y: 0}, {x: 0, y: 1});
    expect(m.points[0].x).toBeCloseTo(0, 6);
    expect(m.points[1].x).toBeCloseTo(-30, 6);
  });

  it('keeps arc direction through a mirror', () => {
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, true);
    const m = mirrorShape(arc, {x: 0, y: 0}, {x: 0, y: 1});
    expect(m.points[1].x).toBeCloseTo(-10, 6);
    expect(arcParams(m).sweepDeg).toBeCloseTo(arcParams(arc).sweepDeg, 6);
  });
});

describe('geometry — measurement and areas', () => {
  it('measures a circle', () => {
    const m = measure(makeCircle({x: 0, y: 0}, 10));
    expect(m.area).toBeCloseTo(Math.PI * 100, 6);
    expect(m.perimeter).toBeCloseTo(2 * Math.PI * 10, 6);
  });

  it('measures a closed polyline area and perimeter', () => {
    const square = {
      type: 'polyline',
      points: [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 10, y: 10},
        {x: 0, y: 10},
      ],
      closed: true,
    };
    const m = measure(square);
    expect(m.area).toBeCloseTo(100, 6);
    expect(m.perimeter).toBeCloseTo(40, 6);
  });

  it('measures an open polyline length only', () => {
    const open = {
      type: 'polyline',
      points: [
        {x: 0, y: 0},
        {x: 3, y: 4},
        {x: 3, y: 14},
      ],
    };
    const m = measure(open);
    expect(m.length).toBeCloseTo(15, 6);
    expect(m.area).toBeUndefined();
  });

  it('computes signed area with the shoelace formula', () => {
    expect(
      signedArea([
        {x: 0, y: 0},
        {x: 4, y: 0},
        {x: 4, y: 3},
        {x: 0, y: 3},
      ]),
    ).toBeCloseTo(12, 9);
  });

  it('measures an arc segment area', () => {
    const half = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: -10, y: 0}, true);
    const m = measure(half);
    expect(m.length).toBeCloseTo(Math.PI * 10, 6);
    expect(m.area).toBeCloseTo((Math.PI * 100) / 2, 6);
  });
});

describe('geometry — flattening, selection and splines', () => {
  it('closes the polyline ring when flattening', () => {
    const tri = {
      type: 'polyline',
      points: [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 0, y: 10},
      ],
      closed: true,
    };
    expect(segmentsOf(tri)).toHaveLength(3);
    expect(ringOf(tri)).toHaveLength(3);
    expect(pointInShape(tri, {x: 1, y: 1})).toBe(true);
    expect(pointInShape(tri, {x: 9, y: 9})).toBe(false);
  });

  it('samples a circle into a closed set of segments', () => {
    const segs = segmentsOf(makeCircle({x: 0, y: 0}, 20));
    expect(segs.length).toBeGreaterThan(8);
    expect(pointInShape(makeCircle({x: 0, y: 0}, 20), {x: 5, y: 5})).toBe(true);
    expect(pointInShape(makeCircle({x: 0, y: 0}, 20), {x: 50, y: 0})).toBe(
      false,
    );
  });

  it('passes through spline control points at the ends', () => {
    const samples = catmullRom(
      [
        {x: 0, y: 0},
        {x: 10, y: 20},
        {x: 20, y: 0},
      ],
      false,
      8,
    );
    expect(samples[0]).toEqual({x: 0, y: 0});
    expect(samples[samples.length - 1]).toEqual({x: 20, y: 0});
    expect(samples.length).toBe(2 * 8 + 1);
  });

  it('derives ellipse parameters from axis endpoints', () => {
    const e = {
      type: 'ellipse',
      points: [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 0, y: 4},
      ],
    };
    const p = ellipseParams(e);
    expect(p.major).toBeCloseTo(10, 9);
    expect(p.minor).toBeCloseTo(4, 9);
    expect(measure(e).area).toBeCloseTo(Math.PI * 40, 6);
  });
});
