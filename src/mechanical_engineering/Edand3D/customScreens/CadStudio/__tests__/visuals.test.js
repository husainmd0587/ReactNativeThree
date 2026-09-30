/**
 * Tests for the rendering geometry.
 *
 * This module is the last stop before pixels, so the cases here are about
 * producing well-formed path strings for every shape type and about the
 * world-to-screen projection being right — a flipped Y axis here would mirror
 * the whole drawing without any error being raised.
 */

import {
  axisVisuals,
  boxVisuals,
  gripVisuals,
  shapeVisuals,
} from '../engine/shapeVisuals';
import {
  makeArc,
  makeCircle,
  makeEllipse,
  makeLine,
  makePoint,
  makePolyline,
  makeSpline,
  makeText,
  shapeBBox,
} from '../engine/geometry';
import {makeAlignedDim, makeRadiusDim} from '../engine/dimensions';
import {selectionGrips} from '../engine/selection';
import {makeViewport} from '../engine/viewport';

const view = makeViewport(400, 300, {scale: 2, centre: {x: 0, y: 0}});
const centreScreen = {x: 200, y: 150};

const allFinite = d => !/NaN|Infinity|undefined/.test(d);

describe('projecting to the screen', () => {
  test('the world origin lands in the middle of the canvas', () => {
    const v = shapeVisuals(makePoint({x: 0, y: 0}), view);
    // A point is drawn as a cross centred on its position.
    expect(v.paths[0]).toContain(`${centreScreen.x}`);
    expect(v.paths[0]).toContain(`${centreScreen.y}`);
  });

  test('world up is screen up, not down', () => {
    // A line from the origin to +10mm in Y must end above the origin on
    // screen. Getting this backwards mirrors the entire drawing.
    const {paths} = shapeVisuals(makeLine({x: 0, y: 0}, {x: 0, y: 10}), view);
    const [, endY] = paths[0].split('L')[1].trim().split(' ').map(Number);
    expect(endY).toBeLessThan(centreScreen.y);
  });

  test('scale multiplies world distance', () => {
    const {paths} = shapeVisuals(makeLine({x: 0, y: 0}, {x: 10, y: 0}), view);
    const [endX] = paths[0].split('L')[1].trim().split(' ').map(Number);
    expect(endX - centreScreen.x).toBe(20); // 10 mm at 2 px/mm
  });
});

describe('every shape type produces a drawable path', () => {
  const cases = {
    line: makeLine({x: 0, y: 0}, {x: 20, y: 10}),
    polyline: makePolyline(
      [
        {x: 0, y: 0},
        {x: 10, y: 5},
        {x: 20, y: 0},
      ],
      true,
    ),
    spline: makeSpline([
      {x: 0, y: 0},
      {x: 10, y: 10},
      {x: 20, y: 0},
    ]),
    circle: makeCircle({x: 0, y: 0}, 5),
    ellipse: makeEllipse({x: 0, y: 0}, {x: 8, y: 0}, {x: 0, y: 3}),
    point: makePoint({x: 4, y: 4}),
    dimension: makeAlignedDim({x: 0, y: 0}, {x: 30, y: 0}, {x: 0, y: 10}),
  };

  for (const [name, shape] of Object.entries(cases)) {
    test(`${name} yields finite path data`, () => {
      const v = shapeVisuals(shape, view);
      expect(v.paths.length).toBeGreaterThan(0);
      for (const p of v.paths) {
        expect(p).toMatch(/^M/);
        expect(allFinite(p)).toBe(true);
      }
    });
  }

  test('an arc uses a single arc command with the right sweep', () => {
    const ccw = shapeVisuals(
      makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, true),
      view,
    );
    expect(ccw.paths[0]).toContain('A');
    // toScreen flips Y, so world-CCW runs clockwise on screen: sweep flag 1.
    expect(ccw.paths[0]).toMatch(/A[\d.]+ [\d.]+ 0 0 1 /);
    const cw = shapeVisuals(
      makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, false),
      view,
    );
    // The large-arc flag depends on how far round the travel is, but the
    // sweep flag is purely the direction: 0 for clockwise on screen.
    expect(cw.paths[0]).toMatch(/A[\d.]+ [\d.]+ \d 1 0 /);
  });

  test('a clockwise arc from 0 to 90 degrees is the long way round', () => {
    // Clockwise from 0 to 90 is 270 degrees of travel, so the large-arc flag
    // has to be set. This is the case that catches the two arc flags being
    // swapped, which would silently draw a quarter circle as three quarters.
    const {paths} = shapeVisuals(
      makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, false),
      view,
    );
    expect(paths[0]).toMatch(/A[\d.]+ [\d.]+ 0 1 0 /);
  });

  test('a quarter circle is not flagged as a large arc', () => {
    const {paths} = shapeVisuals(
      makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}, true),
      view,
    );
    expect(paths[0]).toMatch(/A[\d.]+ [\d.]+ 0 0 1 /);
  });

  test('a sweep past 180 degrees is flagged large', () => {
    // 0 to 270 degrees counter-clockwise. Exactly 180 is the degenerate case
    // for this flag, so it cannot prove anything.
    const {paths} = shapeVisuals(
      makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: -10}, true),
      view,
    );
    expect(paths[0]).toMatch(/A[\d.]+ [\d.]+ 0 1 1 /);
  });

  test('a circle is two arcs, because one cannot close a turn', () => {
    const {paths} = shapeVisuals(makeCircle({x: 0, y: 0}, 5), view);
    expect(paths[0].match(/A/g)).toHaveLength(2);
    expect(paths[0]).toMatch(/Z$/);
  });

  test('an ellipse closes back on itself', () => {
    const {paths, closed} = shapeVisuals(
      makeEllipse({x: 0, y: 0}, {x: 8, y: 0}, {x: 0, y: 3}),
      view,
    );
    expect(closed).toBe(true);
    expect(paths[0]).toMatch(/Z$/);
  });
});

describe('labels and annotations', () => {
  test('a linear dimension draws its line, arrows and measured value', () => {
    const v = shapeVisuals(
      makeAlignedDim({x: 0, y: 0}, {x: 30, y: 0}, {x: 0, y: 10}),
      view,
    );
    expect(v.paths.length).toBeGreaterThan(3); // two witnesses, the line, two heads
    expect(v.texts).toHaveLength(1);
    expect(v.texts[0].text).toBe('30');
  });

  test('a radius dimension is labelled R and sits by its leader', () => {
    const d = makeRadiusDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 30, y: 20});
    const v = shapeVisuals(d, view);
    expect(v.texts[0].text).toBe('R10');
  });

  test('a dimension override replaces the measured text', () => {
    const d = {
      ...makeAlignedDim({x: 0, y: 0}, {x: 30, y: 0}, {x: 0, y: 10}),
      textOverride: 'Ø30',
    };
    expect(shapeVisuals(d, view).texts[0].text).toBe('Ø30');
  });

  test('architectural dimensions add a tick at the middle', () => {
    const plain = makeAlignedDim({x: 0, y: 0}, {x: 30, y: 0}, {x: 0, y: 10});
    const ticked = {...plain, style: 'architectural'};
    expect(shapeVisuals(ticked, view).paths.length).toBeGreaterThan(
      shapeVisuals(plain, view).paths.length,
    );
  });

  test('text entities become a text draw, not a path', () => {
    const v = shapeVisuals(makeText({x: 0, y: 0}, 'Bracket A', 5), view);
    expect(v.paths).toHaveLength(0);
    expect(v.texts[0].text).toBe('Bracket A');
    expect(v.texts[0].size).toBe(10); // 5 mm tall at 2 px/mm
  });

  test('label size never collapses below something grabbable', () => {
    const tiny = shapeVisuals(makeText({x: 0, y: 0}, 'x', 0.01), view);
    expect(tiny.texts[0].size).toBeGreaterThanOrEqual(6);
  });
});

describe('selection furniture', () => {
  test('a selected shape is drawn in the highlight colour and heavier', () => {
    const shape = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const plain = shapeVisuals(shape, view);
    const picked = shapeVisuals(shape, view, {selected: true});
    expect(picked.colour).not.toBe(plain.colour);
    expect(picked.width).toBeGreaterThan(plain.width);
  });

  test('grips keep the shape they belong to', () => {
    const circle = makeCircle({x: 0, y: 0}, 5);
    const grips = selectionGrips([circle], [circle.id]);
    const marks = gripVisuals(grips, view);
    expect(marks).toHaveLength(5); // centre plus four quadrants
    for (const m of marks) {
      expect(m.shapeId).toBe(circle.id);
      expect(allFinite(String(m.x))).toBe(true);
    }
  });

  test('a selection box is a screen rectangle the right way round', () => {
    // World Y-up means the box's top-left comes from the world's max-Y corner.
    const b = boxVisuals(
      shapeBBox(makeLine({x: -10, y: 5}, {x: 10, y: 15})),
      view,
    );
    expect(b.w).toBe(40);
    expect(b.h).toBe(20);
  });

  test('axes sit where the origin is on screen', () => {
    const a = axisVisuals(view);
    expect(a.x).toBe(centreScreen.x);
    expect(a.y).toBe(centreScreen.y);
  });
});
