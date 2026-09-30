/**
 * 2D vector / point helpers.
 *
 * Everything in CAD Studio is 2D and measured in millimetres with a Y-up
 * world (so angles behave like a compass, matching AutoCAD). Points are
 * plain `{x, y}` objects — never THREE.Vector2 — because these functions
 * run inside Skia worklets, which cannot cross into a class-based module
 * the way they can with plain objects and module-level functions.
 */

export const EPS = 1e-9;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const pt = (x, y) => ({x, y});
export const clone = p => ({x: p.x, y: p.y});

export const add = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
export const sub = (a, b) => ({x: a.x - b.x, y: a.y - b.y});
export const mul = (a, s) => ({x: a.x * s, y: a.y * s});
export const dot = (a, b) => a.x * b.x + a.y * b.y;

/** 2D cross product (z component of the 3D cross). Sign gives turn direction. */
export const cross = (a, b) => a.x * b.y - a.y * b.x;

export const len = a => Math.hypot(a.x, a.y);
export const lenSq = a => a.x * a.x + a.y * a.y;

export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const distSq = (a, b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2;

export const norm = a => {
  const l = Math.hypot(a.x, a.y);
  return l < EPS ? {x: 0, y: 0} : {x: a.x / l, y: a.y / l};
};

/** Left-hand perpendicular of a vector (90° CCW). */
export const perp = a => ({x: -a.y, y: a.x});

/** Unit vector at an angle given in radians. */
export const fromAngle = (rad, r = 1) => ({
  x: Math.cos(rad) * r,
  y: Math.sin(rad) * r,
});

/** Angle of the vector a→b in radians, in (-PI, PI]. */
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/** Normalize an angle in degrees to [0, 360). */
export const norm360 = deg => ((deg % 360) + 360) % 360;

/** Normalize an angle in radians to [0, 2*PI). */
export const normTau = rad =>
  ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/** Smallest signed difference between two angles in degrees, in (-180, 180]. */
export function angleDeltaDeg(from, to) {
  let d = norm360(to) - norm360(from);
  if (d > 180) d -= 360;
  return d;
}

/** Shortest angular distance between two angles in degrees, in [0, 180]. */
export function angleDistDeg(a, b) {
  return Math.abs(angleDeltaDeg(a, b));
}

export const lerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const mid = (a, b) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});

/** Constrain a number to a range. Returns `lo` when the range is inverted. */
export const clamp = (v, lo, hi) =>
  hi < lo ? lo : Math.min(Math.max(v, lo), hi);

/** Round to `n` decimals, avoiding float dust like 33.300000000000004. */
export const round = (v, n = 4) => {
  const f = 10 ** n;
  return Math.round(v * f) / f;
};

export const roundPt = (p, n = 4) => ({x: round(p.x, n), y: round(p.y, n)});

/** True when two points are within `tol` of each other. */
export const samePt = (a, b, tol = 1e-7) =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
