/**
 * CAD Studio — AutoCAD-compatible input parser.
 *
 * The whole point of a real CAD environment on a phone is that you can type
 * exact numbers, because your finger is not a drafting table. This module
 * implements AutoCAD's point-input grammar, which is small but genuinely
 * fiddly:
 *
 *   50,60        absolute point
 *   #50,60       absolute point (2D form)
 *   50,60<45     absolute polar point (distance then absolute angle)
 *   @100,50      relative point (offset from the last point)
 *   @100<45      relative polar point
 *   @100         relative distance, same direction as last point
 *   100          bare number after a point prompt = "direct distance"
 *   <45          bare angle after a point prompt = direction only
 *   10cm  5m  2"  3ft  1in  500um
 *
 * Angles are always degrees here. AutoCAD's own angle base (usually decimal
 * degrees) is a drawing setting we deliberately don't expose on mobile.
 */

import {DEG, RAD, add, dist, fromAngle, norm360} from './vec';

export const UNITS = {
  mm: 1,
  cm: 10,
  m: 1000,
  km: 1e6,
  um: 0.001,
  in: 25.4,
  '"': 25.4,
  ft: 304.8,
  mil: 0.0254,
};

/** Multiply a value in drawing units by `scale` (mm per unit). */
export const toMm = (v, scale = 1) => v * scale;

/**
 * Parse a number with an optional unit suffix. Returns null when the token
 * isn't a number at all, so callers can fall through to the next format.
 */
export function parseNumber(token, scale = 1) {
  if (typeof token === 'number') return token;
  if (typeof token !== 'string') return null;
  const t = token.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return null;

  const m = t.match(
    /^([+-]?(?:\d+\.?\d*|\.\d+))(mm|cm|km|um|in|ft|mil|"|'|m)?$/,
  );
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  return toMm(value * (UNITS[m[2]] ?? 1), scale);
}

/** Parse a bare angle ("45", "45deg", "1:30" style is not supported). */
export function parseAngle(token) {
  if (typeof token === 'number') return norm360(token);
  if (typeof token !== 'string') return null;
  const t = token.trim().toLowerCase();
  const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*(deg|°|d)?$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v)) return null;
  return norm360(v);
}

/**
 * Parse a full point token. `base` is the previous point for relative
 * (`@`) forms and for bare direct-distance input. `dirPoint` is the point
 * before `base` and defines the direction a bare `@dist` travels along.
 * Returns `{x, y}` or null.
 */
export function parsePoint(token, base = null, dirPoint = null, scale = 1) {
  if (typeof token !== 'string') return null;
  let t = token.trim();
  if (!t) return null;

  const relative = t.startsWith('@');
  if (relative) t = t.slice(1).trim();
  else if (t.startsWith('#')) t = t.slice(1).trim();

  // Polar form: <distance><angle>
  const polar = t.match(
    /^([+-]?(?:\d+\.?\d*|\.\d+)(?:mm|cm|km|um|in|ft|mil|"|'|m)?)\s*<\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:\s*deg)?)$/i,
  );
  if (polar) {
    const d = parseNumber(polar[1], scale);
    const a = parseAngle(polar[2]);
    if (d === null || a === null) return null;
    const abs = fromAngle(a * DEG, Math.abs(d));
    return relative && base ? add(base, abs) : abs;
  }

  // Cartesian form: x,y
  const cart = t.match(/^([^,]+)\s*,\s*([^,]+)$/);
  if (cart) {
    const x = parseNumber(cart[1], scale);
    const y = parseNumber(cart[2], scale);
    if (x === null || y === null) return null;
    return relative && base ? {x: base.x + x, y: base.y + y} : {x, y};
  }

  // Bare angle: "<45" — direction from the last point, same distance.
  if (t.startsWith('<')) {
    const a = parseAngle(t.slice(1));
    if (a === null) return null;
    if (!base) return null;
    const d = dirPoint ? dist(base, dirPoint) : 0;
    return add(base, fromAngle(a * DEG, d));
  }

  // Single value: relative distance along the current direction, or an
  // absolute point on one of the axes.
  const single = parseNumber(t, scale);
  if (single === null) return null;

  if (relative && base) {
    if (!dirPoint) return null;
    const dir = {x: base.x - dirPoint.x, y: base.y - dirPoint.y};
    const l = Math.hypot(dir.x, dir.y);
    if (l < 1e-9) return null;
    return {x: base.x + (dir.x / l) * single, y: base.y + (dir.y / l) * single};
  }

  if (base && !relative) {
    // AutoCAD reads a lone number at a point prompt as a direct distance
    // along the current direction.
    if (!dirPoint) return {x: single, y: 0};
    const dir = {x: base.x - dirPoint.x, y: base.y - dirPoint.y};
    const l = Math.hypot(dir.x, dir.y);
    if (l < 1e-9) return {x: single, y: 0};
    return {x: base.x + (dir.x / l) * single, y: base.y + (dir.y / l) * single};
  }

  return {x: single, y: 0};
}

/** True when a token looks like a point rather than a bare number. */
export function looksLikePoint(token) {
  if (typeof token !== 'string') return false;
  const t = token.trim();
  return (
    t.includes(',') ||
    t.includes('<') ||
    t.startsWith('@') ||
    t.startsWith('#') ||
    !!parseNumber(t, 1)
  );
}

/** Parse a distance token (plain number, with units). */
export const parseDistance = (token, scale = 1) => parseNumber(token, scale);

/** Parse a factor token for SCALE (accepts a trailing `x`). */
export function parseFactor(token) {
  if (typeof token === 'number') return token;
  if (typeof token !== 'string') return null;
  const t = token.trim().toLowerCase();
  const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*x?$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? v : null;
}

/**
 * Parse a whole command line into tokens, honouring the one quoting rule
 * that matters on a phone keyboard: double quotes wrap a whole string
 * (used by MTEXT and the FILLET radius prompt).
 */
export function tokenize(line) {
  const out = [];
  const s = String(line ?? '');
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"') {
      const end = s.indexOf('"', i + 1);
      if (end === -1) {
        out.push(s.slice(i + 1));
        break;
      }
      out.push(s.slice(i + 1, end));
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < s.length && !/\s/.test(s[j]) && s[j] !== '"') j += 1;
    out.push(s.slice(i, j));
    i = j;
  }
  return out;
}

/** Split a command line into a command name and its arguments. */
export function splitCommand(line) {
  const tokens = tokenize(line);
  if (!tokens.length) return {name: '', args: []};
  return {name: tokens[0].toUpperCase(), args: tokens.slice(1)};
}

/**
 * Format a value the way AutoCAD prints it: trailing zeros dropped,
 * thousands rarely needed at drawing scale, negative preserved.
 */
export function fmt(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '';
  const rounded = Number(value.toFixed(decimals));
  return String(rounded);
}

/** Degrees → the compact "N°" form used in readouts. */
export const fmtDeg = (deg, decimals = 1) => `${fmt(norm360(deg), decimals)}°`;

export {RAD, DEG};
