/**
 * Rendering geometry: shapes and viewport furniture as SVG path strings.
 *
 * Skia can build a path straight from an SVG string, so this module produces
 * those strings and the canvas component stays a thin declarative layer with
 * no maths in it.
 *
 * Two things are deliberate here:
 *
 *  - It is plain JavaScript, not a worklet. The drawing is a document in React
 *    state, and rebuilding a few hundred path strings when the document
 *    changes is cheaper than keeping a second copy of the drawing inside
 *    shared values and keeping the two in step. Panning and zooming — the
 *    gestures that run at 60 Hz — are handled in the canvas component against
 *    a camera held in a shared value, so they never re-run this.
 *  - It never looks at the document. One shape in, one set of paths out, which
 *    is what makes it testable without a renderer.
 */

import {
  arcParams,
  catmullRom,
  centerOf,
  dimensionSegments,
  ellipseParams,
  ellipsePoint,
  shapeRadius,
} from './geometry';
import {
  arrowheads,
  dimensionText,
  labelPosition,
  textExtent,
  tickMarks,
} from './dimensions';
import {toScreen} from './viewport';

/** Screen coordinates are floats; two decimals is well under a pixel. */
const f = n => Math.round(n * 100) / 100;

const moveTo = p => `M${f(p.x)} ${f(p.y)}`;
const lineTo = p => `L${f(p.x)} ${f(p.y)}`;

/** A polyline path through world points, projected to screen as it goes. */
function polyPath(view, points, close) {
  if (!points.length) return '';
  let d = moveTo(project(view, points[0]));
  for (let i = 1; i < points.length; i += 1)
    d += lineTo(project(view, points[i]));
  return close ? `${d}Z` : d;
}

/**
 * Project a world point to screen space.
 *
 * The finite check matters: one malformed point would otherwise throw part
 * way through a render pass and blank the whole canvas, which is a much worse
 * failure than a dot in the wrong place.
 */
const project = (view, p) => {
  const s = toScreen(view, {x: p?.x ?? 0, y: p?.y ?? 0});
  return {
    x: Number.isFinite(s.x) ? s.x : 0,
    y: Number.isFinite(s.y) ? s.y : 0,
  };
};

/**
 * An arc as a single SVG arc command.
 *
 * `toScreen` flips Y, so a counter-clockwise arc in world space runs
 * clockwise on screen, which is sweep flag 1. Deriving the flag from the
 * shape's own `ccw` field rather than from angle arithmetic avoids the
 * wrap-around bugs that plague arcs crossing 0°.
 */
function arcPath(view, centre, start, end, r, ccw, largeArc) {
  const c = project(view, centre);
  const a = project(view, start);
  const b = project(view, end);
  if (![c, a, b].every(p => Number.isFinite(p.x))) return '';
  const sweep = ccw ? 1 : 0;
  return (
    `${moveTo(a)}A${f(r * view.scale)} ${f(r * view.scale)} 0 ${
      largeArc ? 1 : 0
    } ${sweep} ` + `${f(b.x)} ${f(b.y)}`
  );
}

/**
 * A solid arrowhead as two barbs from the tip.
 *
 * `arrowheads` reports a tip and the direction the point faces; the renderer
 * turns that into geometry, which keeps the engine free of anything about
 * how ink is drawn.
 */
function barbPath(view, head) {
  const tip = project(view, head.tip);
  const L = (head.size ?? 2.5) * view.scale;
  const {x: dx, y: dy} = head.dir;
  // A 30° half-angle reads as a sharp tip at any zoom.
  const spread = Math.tan((30 * Math.PI) / 180) * L;
  const px = -dy * spread;
  const py = dx * spread;
  return (
    `${moveTo(tip)}L${f(tip.x + dx * L + px)} ${f(tip.y + dy * L + py)}` +
    `${moveTo(tip)}L${f(tip.x + dx * L - px)} ${f(tip.y + dy * L - py)}`
  );
}

/** Text positioned for Skia, which draws from the text's own left baseline. */
function textDraw(view, p, text, size, colour) {
  const s = project(view, p);
  return {x: s.x, y: s.y, text, size: Math.max(6, size * view.scale), colour};
}

/**
 * The paths and labels one shape needs.
 *
 * @returns {{paths: string[], texts: object[], closed: boolean}}
 */
export function shapeVisuals(shape, view, opts = {}) {
  const {selected = false, layerColour = '#e8eef7'} = opts;
  const colour = selected ? '#4cc2ff' : layerColour;
  const out = {paths: [], texts: [], colour, width: selected ? 2.2 : 1.4};

  switch (shape.type) {
    case 'line':
      out.paths.push(polyPath(view, shape.points, false));
      break;

    case 'polyline':
      out.paths.push(polyPath(view, shape.points, shape.closed));
      break;

    case 'spline': {
      const sampled = catmullRom(shape.points, shape.closed);
      out.paths.push(polyPath(view, sampled, shape.closed));
      break;
    }

    case 'circle': {
      const c = project(view, centerOf(shape));
      const r = f(shapeRadius(shape) * view.scale);
      // Two half arcs, because a single arc command cannot describe a full
      // turn.
      out.paths.push(
        `M${f(c.x - r)} ${f(c.y)}A${r} ${r} 0 1 0 ${f(c.x + r)} ${f(c.y)}` +
          `A${r} ${r} 0 1 0 ${f(c.x - r)} ${f(c.y)}Z`,
      );
      out.closed = true;
      break;
    }

    case 'arc': {
      const p = arcParams(shape);
      const largeArc = Math.abs(p.sweepDeg) > 180;
      out.paths.push(
        arcPath(
          view,
          p.center,
          shape.points[1],
          shape.points[2],
          p.r,
          shape.ccw,
          largeArc,
        ),
      );
      break;
    }

    case 'ellipse': {
      const p = ellipseParams(shape);
      const steps = 64;
      const pts = [];
      for (let i = 0; i <= steps; i += 1) {
        pts.push(
          ellipsePoint(
            p.center,
            p.major,
            p.minor,
            p.rot,
            (i / steps) * Math.PI * 2,
          ),
        );
      }
      out.paths.push(polyPath(view, pts, true));
      out.closed = true;
      break;
    }

    case 'point': {
      const s = project(view, shape.points[0]);
      const r = 3;
      out.paths.push(
        `M${f(s.x - r)} ${f(s.y)}L${f(s.x + r)} ${f(s.y)}` +
          `M${f(s.x)} ${f(s.y - r)}L${f(s.x)} ${f(s.y + r)}`,
      );
      break;
    }

    case 'text': {
      out.texts.push(
        textDraw(
          view,
          shape.points[0],
          shape.text ?? '',
          shape.height ?? 5,
          colour,
        ),
      );
      break;
    }

    case 'dimension': {
      for (const seg of dimensionSegments(shape)) {
        out.paths.push(polyPath(view, [seg.a, seg.b], false));
      }
      // Arrowheads and ticks are both in world millimetres, so they scale
      // with the drawing exactly as the ink does.
      for (const head of arrowheads(shape, opts.arrowSize ?? 2.5)) {
        out.paths.push(barbPath(view, head));
      }
      if (shape.style === 'architectural') {
        for (const tick of tickMarks(shape, opts.tickSize ?? 1.5)) {
          out.paths.push(polyPath(view, [tick.a, tick.b], false));
        }
      }
      const label = labelPosition(shape);
      out.texts.push(
        textDraw(
          view,
          label,
          dimensionText(shape),
          shape.textHeight ?? 2.5,
          colour,
        ),
      );
      out.closed = true;
      break;
    }

    default:
      if (shape.points?.length)
        out.paths.push(polyPath(view, shape.points, false));
  }

  return out;
}

/** How wide a dimension's label will be on screen, for hit-testing labels. */
export const labelScreenExtent = (dim, view) => {
  const e = textExtent(dim);
  return {width: e.width * view.scale, height: e.height * view.scale};
};

/** The grid, as two path strings so the two tiers can differ in weight. */
export function gridVisuals(grid) {
  const build = lines => lines.map(v => `M${f(v)} 0L${f(v)} 1`).join('');
  return {
    // Vertical lines are drawn by the canvas as full-height, so only the
    // coordinate is returned here; the canvas owns the extent.
    minorVertical: grid.minor.vertical,
    minorHorizontal: grid.minor.horizontal,
    majorVertical: grid.major.vertical,
    majorHorizontal: grid.major.horizontal,
  };
}

/** Square grip marks, sized in screen pixels so they stay grabbable. */
export function gripVisuals(grips, view, size = 4) {
  return grips.map(g => {
    const s = project(view, g.point);
    return {
      x: f(s.x),
      y: f(s.y),
      size,
      kind: g.kind,
      shapeId: g.shapeId,
      index: g.index,
    };
  });
}

/** Dashed selection boxes for a window that is being dragged. */
export const boxVisuals = (box, view) => {
  const a = project(view, {x: box.minX, y: box.maxY});
  const b = project(view, {x: box.maxX, y: box.minY});
  return {x: f(a.x), y: f(a.y), w: f(b.x - a.x), h: f(b.y - a.y)};
};

/**
 * The origin axes, drawn heavier than grid lines.
 *
 * Only the crossing point comes back: the axes run to the edge of the canvas,
 * and the canvas owns that extent.
 */
export function axisVisuals(view) {
  const o = project(view, {x: 0, y: 0});
  return {x: f(o.x), y: f(o.y)};
}
