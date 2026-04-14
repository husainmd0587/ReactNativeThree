// utils/copy.js
import { translateSegment } from '../move/move';

// ── Deep clone a segment ──────────────────────────────────────────────────────
export function cloneSegment(seg) {
  return JSON.parse(JSON.stringify(seg));
}

// ── Clone multiple segments by index ─────────────────────────────────────────
export function cloneSegments(shapeList, indices) {
  return indices.map(i => cloneSegment(shapeList[i]));
}

// ── Translate cloned segments by (dx, dy) ────────────────────────────────────
export function translateClones(clones, dx, dy) {
  return clones.map(seg => translateSegment(seg, dx, dy));
}

// ── Commit one copy: append translated clones to shapeList ───────────────────
export function commitCopy(shapeList, clones, dx, dy) {
  const placed = translateClones(clones, dx, dy);
  return [...shapeList, ...placed];
}