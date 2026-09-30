/**
 * Viewport tests.
 *
 * The invariant that matters is round-tripping: screen → world → screen must
 * return the original pixel, and zoom must not slide the drawing under the
 * user's fingers. Everything else follows from that.
 */

import {
  MAX_SCALE,
  MIN_SCALE,
  gestureTransform,
  makeViewport,
  gridLines,
  gridStep,
  panByScreen,
  panByWorld,
  pxToWorld,
  screenDeltaToWorld,
  toScreen,
  toWorld,
  visibleWorldBox,
  worldDeltaToScreen,
  worldToPx,
  zoomAtCentre,
  zoomAtScreen,
  zoomIn,
  zoomOut,
  zoomToFit,
} from '../engine/viewport';

const W = 400;
const H = 800;
const view = () => makeViewport(W, H, {centre: {x: 0, y: 0}, scale: 2});
const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('world and screen map onto each other', () => {
  test('the world centre lands at the middle of the canvas', () => {
    const s = toScreen(view(), {x: 0, y: 0});
    close(s.x, W / 2);
    close(s.y, H / 2);
  });

  test('world Y is up while screen Y is down', () => {
    const s = toScreen(view(), {x: 0, y: 10});
    close(s.y, H / 2 - 20);
  });

  test('screen to world and back returns the original pixel', () => {
    const v = view();
    for (const p of [
      {x: 0, y: 0},
      {x: 137, y: 42},
      {x: W, y: H},
      {x: -50, y: 900},
    ]) {
      const back = toScreen(v, toWorld(v, p));
      close(back.x, p.x, 1e-9);
      close(back.y, p.y, 1e-9);
    }
  });

  test('scale is pixels per millimetre', () => {
    const v = makeViewport(W, H, {scale: 4});
    const a = toScreen(v, {x: 0, y: 0});
    const b = toScreen(v, {x: 10, y: 0});
    close(b.x - a.x, 40);
  });

  test('an off-centre camera still round-trips', () => {
    const v = makeViewport(W, H, {
      centre: {x: 1234.5, y: -678.25},
      scale: 0.37,
    });
    const back = toScreen(v, toWorld(v, {x: 11, y: 22}));
    close(back.x, 11, 1e-6);
    close(back.y, 22, 1e-6);
  });

  test('deltas convert without picking up the camera offset', () => {
    const v = makeViewport(W, H, {centre: {x: 999, y: 999}, scale: 5});
    const w = screenDeltaToWorld(v, {x: 50, y: 50});
    close(w.x, 10);
    close(w.y, -10);
    const s = worldDeltaToScreen(v, {x: 10, y: -10});
    close(s.x, 50);
    close(s.y, 50);
  });
});

describe('panning', () => {
  test('dragging right moves the drawing right, so the camera moves left', () => {
    const panned = panByScreen(view(), 40, 0);
    close(panned.centre.x, -20);
    close(panned.centre.y, 0);
  });

  test('dragging down moves the drawing down, so the camera moves up', () => {
    const panned = panByScreen(view(), 0, 40);
    close(panned.centre.y, 20);
  });

  test('panning by world units is the same as panning by pixels', () => {
    // A 40 px drag left at scale 2 is a 20 mm world move: right 20, and
    // up 20 because screen Y is inverted.
    const byScreen = panByScreen(view(), 40, -40);
    const byWorld = panByWorld(view(), -20, -20);
    close(byWorld.centre.x, byScreen.centre.x);
    close(byWorld.centre.y, byScreen.centre.y);
  });

  test('panning does not change the zoom', () => {
    expect(panByScreen(view(), 10, 10).scale).toBe(view().scale);
  });
});

describe('zooming stays anchored', () => {
  test('the world point under the fingers does not move', () => {
    const v = view();
    const finger = {x: 120, y: 300};
    const before = toWorld(v, finger);
    const zoomed = zoomAtScreen(v, finger, 2.5);
    const after = toWorld(zoomed, finger);
    close(after.x, before.x, 1e-9);
    close(after.y, before.y, 1e-9);
  });

  test('zooming in increases the scale by the factor', () => {
    close(zoomAtScreen(view(), {x: 0, y: 0}, 2).scale, 4);
    close(zoomAtScreen(view(), {x: 0, y: 0}, 0.5).scale, 1);
  });

  test('the scale is clamped so the canvas stays usable', () => {
    let v = view();
    for (let i = 0; i < 40; i += 1) v = zoomIn(v);
    expect(v.scale).toBe(MAX_SCALE);
    for (let i = 0; i < 80; i += 1) v = zoomOut(v);
    expect(v.scale).toBe(MIN_SCALE);
  });

  test('a clamped zoom settles the anchored point at the limit', () => {
    // Zoom in far past the limit, anchored on a finger. Once the scale can no
    // longer grow the point has to drift, but it should settle rather than
    // running away, and further input should be a no-op.
    const v = view();
    const finger = {x: 120, y: 300};
    const before = toWorld(v, finger);
    let z = v;
    for (let i = 0; i < 30; i += 1) z = zoomAtScreen(z, finger, 2);
    expect(z.scale).toBe(MAX_SCALE);
    expect(zoomAtScreen(z, finger, 2)).toBe(z);
    const after = toWorld(z, finger);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(
      200,
    );
  });

  test('zoom in and out are inverse at the centre', () => {
    const v = view();
    const back = zoomOut(zoomIn(v));
    close(back.scale, v.scale, 1e-9);
  });

  test('a factor of one changes nothing', () => {
    const v = view();
    expect(zoomAtScreen(v, {x: 10, y: 10}, 1)).toBe(v);
  });
});

describe('zoom to fit', () => {
  test('a small box grows to fill the canvas', () => {
    const v = makeViewport(W, H, {scale: 1});
    const fitted = zoomToFit(v, {minX: -10, minY: -10, maxX: 10, maxY: 10});
    expect(fitted.scale).toBeGreaterThan(1);
    close(fitted.centre.x, 0);
    close(fitted.centre.y, 0);
  });

  test('a large box shrinks to fit', () => {
    const v = makeViewport(W, H, {scale: 100});
    const fitted = zoomToFit(v, {
      minX: 0,
      y0: 0,
      minY: 0,
      maxX: 5000,
      maxY: 5000,
    });
    expect(fitted.scale).toBeLessThan(100);
  });

  test('fitting centres on the box midpoint, not the origin', () => {
    const v = makeViewport(W, H, {scale: 1});
    const fitted = zoomToFit(v, {minX: 100, minY: 200, maxX: 300, maxY: 400});
    close(fitted.centre.x, 200);
    close(fitted.centre.y, 300);
  });

  test('the fitted box leaves padding at the edges', () => {
    const v = makeViewport(W, H, {scale: 1});
    const box = {minX: 0, minY: 0, maxX: 100, maxY: 100};
    const fitted = zoomToFit(v, box);
    const shown = visibleWorldBox(fitted);
    expect(shown.minX).toBeLessThan(0);
    expect(shown.maxX).toBeGreaterThan(100);
  });

  test('a zero-size box does not divide by zero', () => {
    const v = makeViewport(W, H, {scale: 1});
    const fitted = zoomToFit(v, {minX: 5, minY: 5, maxX: 5, maxY: 5});
    expect(Number.isFinite(fitted.scale)).toBe(true);
  });
});

describe('the visible world box', () => {
  test('it covers the canvas with the world Y axis upright', () => {
    const v = view();
    const box = visibleWorldBox(v);
    close(box.minX, -W / 4);
    close(box.maxX, W / 4);
    close(box.minY, -H / 4);
    close(box.maxY, H / 4);
  });

  test('a margin grows it by that many pixels on every side', () => {
    const v = view();
    const plain = visibleWorldBox(v);
    const padded = visibleWorldBox(v, 20);
    close(padded.minX, plain.minX - 10);
    close(padded.maxY, plain.maxY + 10);
  });
});

describe('the grid picks round spacings', () => {
  test('spacing lands near the requested pixel size', () => {
    const v = makeViewport(W, H, {scale: 1});
    close(worldToPx(v, gridStep(v, 24)), 20, 6);
    const v2 = makeViewport(W, H, {scale: 8});
    close(worldToPx(v2, gridStep(v2, 24)), 20, 6);
  });

  test('spacing is always a 1/2/5 multiple of a power of ten', () => {
    for (const scale of [0.05, 0.3, 1, 2.5, 12, 60, 200]) {
      const v = makeViewport(W, H, {scale});
      const step = gridStep(v, 24);
      const mantissa = step / 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5, 10].some(m => Math.abs(mantissa - m) < 1e-9)).toBe(true);
    }
  });

  test('grid lines cover the visible area and land on multiples of the step', () => {
    const v = view();
    const g = gridLines(v);
    expect(g.minor.vertical.length).toBeGreaterThan(1);
    expect(g.minor.horizontal.length).toBeGreaterThan(1);
    for (const x of g.minor.vertical)
      close(x / g.step, Math.round(x / g.step), 1e-6);
    const box = visibleWorldBox(v);
    // The first and last lines sit on or inside the edges, never beyond.
    expect(g.minor.vertical[0]).toBeGreaterThanOrEqual(box.minX);
    expect(g.minor.vertical[g.minor.vertical.length - 1]).toBeLessThanOrEqual(
      box.maxX,
    );
    expect(g.minor.horizontal[0]).toBeGreaterThanOrEqual(box.minY);
    expect(
      g.minor.horizontal[g.minor.horizontal.length - 1],
    ).toBeLessThanOrEqual(box.maxY);
  });

  test('the major tier is a subset of the minor tier at a coarser step', () => {
    const g = gridLines(view());
    expect(g.majorStep).toBeGreaterThan(g.step);
    for (const list of [g.major.vertical, g.major.horizontal]) {
      for (const v of list) {
        close(v / g.majorStep, Math.round(v / g.majorStep), 1e-6);
        expect(
          g.minor.vertical.includes(v) || g.minor.horizontal.includes(v),
        ).toBe(true);
      }
    }
    // Zero is always a major line, since it is the axis the user orients by.
    expect(g.major.vertical).toContain(0);
    expect(g.major.horizontal).toContain(0);
  });

  test('zooming in makes the grid finer in world units', () => {
    const coarse = gridStep(makeViewport(W, H, {scale: 1}), 24);
    const fine = gridStep(makeViewport(W, H, {scale: 50}), 24);
    expect(fine).toBeLessThan(coarse);
  });
});

describe('pixel tolerances scale with zoom', () => {
  test('the same pixel radius is a smaller distance when zoomed in', () => {
    const wide = makeViewport(W, H, {scale: 1});
    const tight = makeViewport(W, H, {scale: 10});
    close(pxToWorld(wide, 10), 10);
    close(pxToWorld(tight, 10), 1);
  });

  test('world and pixel distances convert both ways', () => {
    const v = makeViewport(W, H, {scale: 3.5});
    close(worldToPx(v, pxToWorld(v, 17)), 17);
  });
});

describe('the live gesture transform', () => {
  /** Apply a transform list to a point the way Skia concatenates the entries. */
  const apply = (entries, p) => {
    let q = {...p};
    for (const entry of entries) {
      const [key, value] = Object.entries(entry)[0];
      if (key === 'scale') q = {x: q.x * value, y: q.y * value};
      else if (key === 'translateX') q = {...q, x: q.x + value};
      else q = {...q, y: q.y + value};
    }
    return q;
  };

  /**
   * Every entry has to be a number. Skia unwraps a shared value only when the
   * prop itself is the shared value, so a shared value left inside one of
   * these entries reaches Skia's matrix maths untouched and it throws
   * "Expected number, we got object" — a blank canvas with no other symptom.
   */
  test('carries numbers only, never shared values', () => {
    const entries = gestureTransform(12, -7, 200, 340, 1.75);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const keys = Object.keys(entry);
      expect(keys).toHaveLength(1);
      expect(typeof entry[keys[0]]).toBe('number');
      expect(Number.isFinite(entry[keys[0]])).toBe(true);
    }
  });

  test('an unscaled gesture is a plain translation', () => {
    const moved = apply(gestureTransform(30, 40, 200, 340, 1), {x: 20, y: 20});
    expect(moved.x).toBeCloseTo(50, 6);
    expect(moved.y).toBeCloseTo(60, 6);
  });

  test('the pixel between the fingers does not move', () => {
    // Pinching has to hold the focal pixel still, otherwise the drawing slides
    // out from under the fingers. The focal offset is applied either side of
    // the scale, and in that order.
    for (const factor of [0.5, 1.25, 3]) {
      const focal = {x: 200, y: 340};
      const held = apply(
        gestureTransform(0, 0, focal.x, focal.y, factor),
        focal,
      );
      expect(held.x).toBeCloseTo(focal.x, 6);
      expect(held.y).toBeCloseTo(focal.y, 6);
    }
  });

  test('a distant point scales away from the focal point', () => {
    const focal = {x: 0, y: 0};
    const far = {x: 100, y: 50};
    const grown = apply(gestureTransform(0, 0, focal.x, focal.y, 2), far);
    expect(grown.x).toBeCloseTo(200, 6);
    expect(grown.y).toBeCloseTo(100, 6);
  });
});
