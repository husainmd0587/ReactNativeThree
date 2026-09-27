import { Skia } from '@shopify/react-native-skia';
import {
  CANVAS_W, STOCK_AXIS_Y, STOCK_LEFT, STOCK_RIGHT, STOCK_WIDTH,
  PROFILE_SEGS, STOCK_RADIUS, GRIP_TO_TIP,
} from './constants';

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Grip anchor → cutting tip projection ─────────────────────
// The finger/touch point is the GRIP (where the hand holds the tool
// handle). The cutting tip is projected from it toward the machining
// axis by GRIP_TO_TIP px, so the pivot sits forward of the hand at its
// actual cutting position. The push direction is always normal to the
// axis (toward STOCK_AXIS_Y), i.e. radial in the lathe's cross-section.
export function fingerToTip(fx, fy) {
  'worklet';
  const dx = CANVAS_W / 2 - fx;
  const dy = STOCK_AXIS_Y - fy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const rawX = fx + (dx / len) * GRIP_TO_TIP;
  const rawY = fy + (dy / len) * GRIP_TO_TIP;
  const tx = rawX < STOCK_LEFT ? STOCK_LEFT : rawX > STOCK_RIGHT ? STOCK_RIGHT : rawX;
  return { tx, ty: rawY };
}

// ── Profile helpers ───────────────────────────────────────────
export const makeProfile = () => new Float32Array(PROFILE_SEGS).fill(STOCK_RADIUS);

export function xToSeg(x) {
  return clamp(
    Math.floor(((x - STOCK_LEFT) / STOCK_WIDTH) * PROFILE_SEGS),
    0, PROFILE_SEGS - 1
  );
}

// Maps a tool's on-screen cutting width (px) onto profile segments so
// the carved footprint roughly matches the visible tool -- the old
// `Math.floor(width / 2)` treated width as segments, making a 16px
// roughing gouge carve ~100px of stock. `narrow`/`point` shapes are
// still weighted so only their centre actually bites.
export function toolHalfSegs(tool) {
  const segPx = STOCK_WIDTH / PROFILE_SEGS;
  return Math.max(1, Math.ceil((tool.width / 2) / segPx));
}

export function applyTool(profile, cx, cy, tool) {
  const dist = Math.abs(cy - STOCK_AXIS_Y);
  if (dist < 2 || cx < STOCK_LEFT || cx > STOCK_RIGHT) return profile;

  const next = Float32Array.from(profile);
  const seg = xToSeg(cx);
  const half = toolHalfSegs(tool);

  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;

    const t = di / (half + 1);
    let w = 1;
    if (tool.shape === 'round') w = Math.sqrt(Math.max(0, 1 - t * t));
    else if (tool.shape === 'point') w = Math.max(0, 1 - Math.abs(t));
    else if (tool.shape === 'narrow') w = Math.abs(t) < 0.4 ? 1 : 0;

    if (dist < next[s]) {
      next[s] = Math.max(2, next[s] - (next[s] - dist) * w * (tool.depth / 10));
    }
  }
  return next;
}

export function footprintRemoval(before, after, seg, half) {
  let total = 0;
  for (let di = -half; di <= half; di++) {
    const s = seg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;
    const d = before[s] - after[s];
    if (d > 0) total += d;
  }
  return total;
}

export function smooth(profile, str = 0.4) {
  const o = profile.slice();
  for (let i = 1; i < profile.length - 1; i++)
    o[i] = profile[i] * (1 - str) + (profile[i - 1] + profile[i + 1]) / 2 * str;
  return o;
}

// Small random per-segment perturbation used to simulate tool chatter
// (spindle/feed resonance) -- distinct from a catch: low-amplitude,
// applied across a short span rather than a single deep gouge.
export function jitterProfile(profile, centerSeg, halfWidth, intensity) {
  if (intensity <= 0) return profile;
  const next = Float32Array.from(profile);
  for (let di = -halfWidth; di <= halfWidth; di++) {
    const s = centerSeg + di;
    if (s < 0 || s >= PROFILE_SEGS) continue;
    const j = (Math.random() - 0.5) * 2 * intensity;
    next[s] = Math.max(1.5, next[s] + j);
  }
  return next;
}

// ── Skia path builders ────────────────────────────────────────
export function fillPath(profile) {
  const p = Skia.Path.Make();
  p.moveTo(STOCK_LEFT, STOCK_AXIS_Y - profile[0]);
  for (let i = 0; i < PROFILE_SEGS; i++) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    p.lineTo(x, STOCK_AXIS_Y - profile[i]);
  }
  p.lineTo(STOCK_RIGHT, STOCK_AXIS_Y - profile[PROFILE_SEGS - 1]);
  p.lineTo(STOCK_RIGHT, STOCK_AXIS_Y + profile[PROFILE_SEGS - 1]);
  for (let i = PROFILE_SEGS - 1; i >= 0; i--) {
    const x = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
    p.lineTo(x, STOCK_AXIS_Y + profile[i]);
  }
  p.lineTo(STOCK_LEFT, STOCK_AXIS_Y + profile[0]);
  p.close();
  return p;
}

// ── Chip particle helpers ─────────────────────────────────────
export function chipStyleForMaterial(mat) {
  switch (mat.id) {
    case 'wood':
    case 'wood-dry':
    case 'walnut':
    case 'cherry':
    case 'ebony':
      return { kind: 'shaving', color: mat.color, size: [16, 34] };
    case 'clay':    return { kind: 'blob',    color: mat.color, size: [5, 10] };
    case 'ceramic':
    case 'glazed':  return { kind: 'chip',    color: mat.color, size: [4, 9]  };
    case 'bronze':  return { kind: 'spark',   color: '#ffd27a', size: [3, 6]  };
    default:        return { kind: 'blob',    color: mat.color, size: [4, 8]  };
  }
}

export function makeChipPool(n) {
  return Array.from({ length: n }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0,
    life: 0, maxLife: 1, size: 3, kind: 'blob', color: '#fff',
  }));
}

export function getToolDescription(toolId) {
  const descriptions = {
    roughing: '⚡ Fast stock removal',
    gouge: '🔄 Deep bowl & cove cuts',
    skew: '💠 Smooth planing cuts',
    parting: '✂️ Part-off to size',
    scraper: '🔲 Fine finishing cuts',
    spindle: '📏 Detail spindle turning',
    bead: '⚪ Rolling beads & coves',
  };
  return descriptions[toolId] || 'Selected';
}
