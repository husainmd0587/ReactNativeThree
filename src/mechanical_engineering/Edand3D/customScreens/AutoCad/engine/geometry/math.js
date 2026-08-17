// Small, dependency-free geometry math. Kept separate from any rendering or
// gesture code so it can be unit-tested and reused by every command.

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Angle of the vector a->b in degrees, normalized to [0, 360).
export function angleDeg(a, b) {
  const rad = Math.atan2(b.y - a.y, b.x - a.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// Shortest distance between two angles (handles the 0/360 wraparound).
export function angleDiff(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function withinTolerance(actual, target, tolerance) {
  return Math.abs(actual - target) <= tolerance;
}
