/**
 * Viewport: the mapping between screen pixels and world millimetres.
 *
 * The model is a single world point (the camera centre) plus a scale, which
 * is enough for an unbounded drawing area and avoids the accumulation drift
 * that repeated scale-about-the-origin transforms would introduce.
 *
 *   screen = (world - centre) * scale + size / 2
 *
 * The Y axis is flipped on the way out because the world is Y-up while screen
 * space is Y-down. Doing that in one place keeps every other module — hit
 * testing, snap, tracking — working purely in world millimetres.
 */

import {clamp, dist} from './vec';

export const DEFAULT_VIEW = {
  centre: {x: 0, y: 0},
  scale: 3, // screen pixels per world millimetre
};

/** Keep scale inside a usable band so the canvas can never be unusable. */
export const MIN_SCALE = 0.02; // ~50 mm per pixel
export const MAX_SCALE = 400; // sub-micron zoom

export const makeViewport = (width, height, overrides = {}) => ({
  width,
  height,
  centre: {...(overrides.centre ?? DEFAULT_VIEW.centre)},
  scale: overrides.scale ?? DEFAULT_VIEW.scale,
});

export const clampScale = scale => clamp(scale, MIN_SCALE, MAX_SCALE);

/** World millimetres → screen pixels. */
export function toScreen(view, p) {
  return {
    x: (p.x - view.centre.x) * view.scale + view.width / 2,
    y: -(p.y - view.centre.y) * view.scale + view.height / 2,
  };
}

/** Screen pixels → world millimetres. */
export function toWorld(view, s) {
  return {
    x: (s.x - view.width / 2) / view.scale + view.centre.x,
    y: -(s.y - view.height / 2) / view.scale + view.centre.y,
  };
}

/** A screen-space delta expressed as a world-space delta. */
export const screenDeltaToWorld = (view, d) => ({
  x: d.x / view.scale,
  y: -d.y / view.scale,
});

/** A world-space delta expressed as a screen-space delta. */
export const worldDeltaToScreen = (view, d) => ({
  x: d.x * view.scale,
  y: -d.y * view.scale,
});

/** Millimetres per pixel at the current zoom. */
export const mmPerPixel = view => 1 / view.scale;

// ---------------------------------------------------------------------------
// Camera moves
// ---------------------------------------------------------------------------

/** Pan by a screen-space drag, keeping the world point under the finger fixed. */
export function panByScreen(view, dx, dy) {
  return {
    ...view,
    centre: {
      x: view.centre.x - dx / view.scale,
      y: view.centre.y + dy / view.scale,
    },
  };
}

/** Pan by a world-space delta. */
export function panByWorld(view, dx, dy) {
  return {...view, centre: {x: view.centre.x + dx, y: view.centre.y + dy}};
}

/**
 * Zoom about a screen point, so the world position under the fingers stays
 * put. This is the behaviour that makes pinch-zoom feel anchored rather than
 * drifting toward the canvas centre.
 */
export function zoomAtScreen(view, screenPt, factor) {
  const before = toWorld(view, screenPt);
  const scale = clampScale(view.scale * factor);
  const applied = scale / view.scale;
  if (Math.abs(applied - 1) < 1e-12) return view;
  // Solve for the centre that keeps `before` under `screenPt` at the new scale.
  const centre = {
    x: before.x - (screenPt.x - view.width / 2) / scale,
    y: before.y + (screenPt.y - view.height / 2) / scale,
  };
  return {...view, scale, centre};
}

/** Zoom about the canvas centre. */
export const zoomAtCentre = (view, factor) =>
  zoomAtScreen(view, {x: view.width / 2, y: view.height / 2}, factor);

export const zoomIn = view => zoomAtCentre(view, 1.25);
export const zoomOut = view => zoomAtCentre(view, 1 / 1.25);

/**
 * Zoom until a world-space span fills the smaller screen dimension.
 * Used by Zoom Extents, so the same helper serves fitting one shape or all.
 */
export function zoomToFit(view, box, padding = 0.06) {
  const w = Math.max(box.maxX - box.minX, 1e-6);
  const h = Math.max(box.maxY - box.minY, 1e-6);
  const usable = Math.min(view.width, view.height) * (1 - padding * 2);
  const scale = clampScale(Math.min(usable / w, usable / h));
  return {
    ...view,
    scale,
    centre: {x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2},
  };
}

/** The world rectangle currently on screen, optionally grown by a margin. */
export function visibleWorldBox(view, marginPx = 0) {
  const a = toWorld(view, {x: -marginPx, y: view.height + marginPx});
  const b = toWorld(view, {x: view.width + marginPx, y: -marginPx});
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

// ---------------------------------------------------------------------------
// Adaptive grid
// ---------------------------------------------------------------------------

/**
 * Choose a grid spacing that lands near `targetPx` on screen.
 *
 * The step snaps to the 1/2/5 x 10^n family so labels read as round numbers,
 * and never changes faster than a factor of two per step, which stops the
 * grid from flickering between values as a pinch settles.
 */
export function gridStep(view, targetPx = 24) {
  const raw = targetPx / view.scale;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  let mult;
  if (n < 1.5) mult = 1;
  else if (n < 3.5) mult = 2;
  else if (n < 7.5) mult = 5;
  else mult = 10;
  return mult * mag;
}

/** Format a grid coordinate for display, trimming trailing zeros. */
export function gridLabel(value, step) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const v = Number(value.toFixed(decimals));
  return String(Object.is(v, -0) ? 0 : v);
}

/**
 * Every grid line needed to cover the visible area, split into two tiers.
 *
 * The renderer draws `minor` faintly and `major` darker, so a zoomed-out view
 * stays readable without the line density becoming visual noise. Values are
 * world coordinates along each axis.
 */
export function gridLines(view, opts = {}) {
  const {targetPx = 24, majorEvery = 5} = opts;
  const step = gridStep(view, targetPx);
  const majorStep = step * majorEvery;
  const box = visibleWorldBox(view);

  const vertical = axisLines(box.minX, box.maxX, step);
  const horizontal = axisLines(box.minY, box.maxY, step);
  const onMajor = v =>
    Math.abs(v / majorStep - Math.round(v / majorStep)) < 1e-6;

  return {
    minor: {vertical, horizontal, step},
    major: {
      vertical: vertical.filter(onMajor),
      horizontal: horizontal.filter(onMajor),
    },
    step,
    majorStep,
  };
}

/** Multiples of `step` spanning [lo, hi], capped so a bad zoom cannot hang. */
function axisLines(lo, hi, step) {
  const cap = 2000;
  const out = [];
  const start = Math.floor(lo / step) * step;
  for (let i = 0; i < cap; i += 1) {
    const v = start + i * step;
    if (v > hi) break;
    out.push(v);
  }
  return out;
}

/** Axis origins, drawn heavier than ordinary grid lines. */
export function axes(view) {
  return {x: view.centre.x !== 0 ? 0 : null, y: 0};
}

// ---------------------------------------------------------------------------
// Pixel tolerances
// ---------------------------------------------------------------------------

/**
 * Convert a pixel tolerance into world units at the current zoom.
 *
 * Every user-facing "within N pixels" behaviour routes through here, so a
 * 10 px snap radius and a 10 px grab radius stay the same physical size on
 * screen no matter how far the drawing is zoomed in or out.
 */
export const pxToWorld = (view, px) => px / view.scale;
export const worldToPx = (view, mm) => mm * view.scale;

/** Distance in world units, for readability at the call site. */
export const screenDistance = (view, a, b) =>
  dist(toWorld(view, a), toWorld(view, b));

/**
 * The live gesture transform, as a list of plain numbers.
 *
 * The canvas shows a committed camera and layers a pinch and drag on top of it
 * at 60 Hz, which means the transform has to be computed off the React render
 * path and handed to Skia as a single value.
 *
 * Two details are load-bearing. Every entry must be a number: Skia unwraps a
 * shared value only when the prop *is* the shared value, so anything else
 * reaches its matrix maths untouched and it throws "Expected number, we got
 * object". And the entries stay separate rather than pre-multiplied, because
 * Skia concatenates them in order.
 *
 * The focal point is translated to the origin, scaled, then translated back, so
 * the ink grows out from between the fingers instead of out of the corner.
 *
 * The `worklet` directive is required, not decorative: the canvas builds this
 * inside a derived value, which Reanimated runs on the UI thread, and it
 * refuses to call a function that was not compiled as a worklet. It is still an
 * ordinary function everywhere else, which is how the tests reach it.
 */
export function gestureTransform(dx, dy, focalX, focalY, factor) {
  'worklet';
  return [
    {translateX: dx},
    {translateY: dy},
    {translateX: -focalX},
    {translateY: -focalY},
    {scale: factor},
    {translateX: focalX},
    {translateY: focalY},
  ];
}
