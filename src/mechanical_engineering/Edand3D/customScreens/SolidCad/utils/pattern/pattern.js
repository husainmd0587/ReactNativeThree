// utils/pattern.js
import { translateSegment } from '../move/move';
import { rotateSegment }    from '../rotate/rotate';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: clone + transform helpers
// ─────────────────────────────────────────────────────────────────────────────

function cloneSeg(seg) {
  return JSON.parse(JSON.stringify(seg));
}

// Translate + optionally rotate a set of segments as a rigid body
// around a given center by `angle` radians
function transformInstance(segs, cx, cy, angle, rotateInstances) {
  return segs.flatMap(seg => {
    // 1. Rotate around pattern center
    const rotated = rotateInstances
      ? rotateSegment(seg, cx, cy, angle)
      : translateSegment(seg,
          cx + (seg.center?.x ?? seg.startPoint?.x ?? 0) - (seg.center?.x ?? seg.startPoint?.x ?? 0),
          cy + (seg.center?.y ?? seg.startPoint?.y ?? 0) - (seg.center?.y ?? seg.startPoint?.y ?? 0)
        );

    // For non-rotate mode: just translate to the offset position
    if (!rotateInstances) {
      const dx = Math.cos(angle) * 0 - Math.sin(angle) * 0; // no offset needed
      return Array.isArray(rotated) ? rotated : [rotated];
    }

    return Array.isArray(rotated) ? rotated : [rotated];
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRCULAR PATTERN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate all instances of a circular pattern.
 * Instance 0 = originals in place (no transform).
 * Instances 1..count-1 = rotated copies.
 *
 * @param {object[]} segs            selected segments (already cloned)
 * @param {number}   cx              pattern center X
 * @param {number}   cy              pattern center Y
 * @param {number}   count           total instance count (incl. original)
 * @param {number}   spanDeg         total angle span in degrees (default 360)
 * @param {boolean}  rotateInstances rotate each instance with its position
 * @returns {object[]}               flat list of all result segments
 */
export function buildCircularPattern(
  segs, cx, cy,
  count       = 4,
  spanDeg     = 360,
  rotateInstances = true
) {
  if (count < 2) return segs.map(cloneSeg);

  const spanRad   = spanDeg * Math.PI / 180;
  const full360   = Math.abs(spanDeg - 360) < 0.01;
  // For full 360, step = span/count; for partial, step = span/(count-1)
  const step      = full360 ? spanRad / count : spanRad / (count - 1);
  const result    = [];

  for (let i = 0; i < count; i++) {
    const angle = step * i;
    if (i === 0) {
      // Instance 0 = originals unchanged
      segs.forEach(s => result.push(cloneSeg(s)));
    } else {
      // Rotate each original around (cx, cy) by angle
      segs.forEach(seg => {
        const rotated = rotateInstances
          ? rotateSegment(cloneSeg(seg), cx, cy, angle)
          : (() => {
              // Translate only: offset position but keep orientation
              const origCx = getCentroid(seg).x;
              const origCy = getCentroid(seg).y;
              const newCx  = cx + (origCx - cx) * Math.cos(angle)
                               - (origCy - cy) * Math.sin(angle);
              const newCy  = cy + (origCx - cx) * Math.sin(angle)
                               + (origCy - cy) * Math.cos(angle);
              return translateSegment(cloneSeg(seg), newCx - origCx, newCy - origCy);
            })();

        if (Array.isArray(rotated)) {
          rotated.forEach(r => result.push(r));
        } else {
          result.push(rotated);
        }
      });
    }
  }

  return result;
}

// Get approximate centroid of a segment
function getCentroid(seg) {
  if (seg.type === 'line') {
    return {
      x: (seg.startPoint.x + seg.endPoint.x) / 2,
      y: (seg.startPoint.y + seg.endPoint.y) / 2,
    };
  }
  if (seg.type === 'arc' || seg.type === 'circle') {
    return { x: seg.center.x, y: seg.center.y };
  }
  if (seg.type === 'rectangle') {
    return {
      x: (seg.topLeft.x + seg.bottomRight.x) / 2,
      y: (seg.topLeft.y + seg.bottomRight.y) / 2,
    };
  }
  return { x: 0, y: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECTANGULAR PATTERN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate all instances of a rectangular pattern.
 * Instance (0,0) = originals in place.
 * All other (row, col) = translated copies.
 *
 * @param {object[]} segs       selected segments
 * @param {number}   rows       number of rows    (Y direction)
 * @param {number}   cols       number of columns (X direction)
 * @param {number}   spacingX   column spacing
 * @param {number}   spacingY   row spacing
 * @param {number}   angleRad   pattern rotation angle (default 0)
 * @returns {object[]}
 */
export function buildRectPattern(
  segs,
  rows     = 2,
  cols     = 2,
  spacingX = 50,
  spacingY = 50,
  angleRad = 0
) {
  const result = [];
  const cos    = Math.cos(angleRad);
  const sin    = Math.sin(angleRad);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Raw offset in pattern axes
      const rawDx = c * spacingX;
      const rawDy = r * spacingY;

      // Rotate offset by pattern angle
      const dx = rawDx * cos - rawDy * sin;
      const dy = rawDx * sin + rawDy * cos;

      segs.forEach(seg => {
        if (r === 0 && c === 0) {
          // Instance (0,0) = original
          result.push(cloneSeg(seg));
        } else {
          result.push(translateSegment(cloneSeg(seg), dx, dy));
        }
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW helpers — generate preview with visual grouping info
// ─────────────────────────────────────────────────────────────────────────────

export function buildCircularPreview(segs, cx, cy, count, spanDeg, rotateInstances) {
  return buildCircularPattern(segs, cx, cy, count, spanDeg, rotateInstances);
}

export function buildRectPreview(segs, rows, cols, spacingX, spacingY, angleRad) {
  return buildRectPattern(segs, rows, cols, spacingX, spacingY, angleRad);
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY — replace selected segments with full pattern result
// ─────────────────────────────────────────────────────────────────────────────

export function applyPattern(shapeList, selectedIndices, patternSegs) {
  // Remove originals, append pattern (instance 0 = original already included)
  const without = shapeList.filter((_, i) => !selectedIndices.includes(i));
  return [...without, ...patternSegs];
}