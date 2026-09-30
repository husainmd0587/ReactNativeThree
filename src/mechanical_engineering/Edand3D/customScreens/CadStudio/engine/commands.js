/**
 * Command registry.
 *
 * A command is a small state machine driven one prompt at a time. Two rules
 * keep the set of thirty commands honest:
 *
 *  1. A step reads `input` plus the answers it has already confirmed, and
 *     assigns the new answer itself. Nothing outside the step can record on
 *     its behalf, because only the step knows whether the input it is looking
 *     at is the first answer or the one after it.
 *  2. A step returns a plain result — `{done, ops}`, or `{prompt}` for the
 *     next question. It never touches the document.
 *
 * Ops are the vocabulary the UI applies:
 *   {kind: 'add',        shapes, select?, label?}
 *   {kind: 'remove',     ids, label?}
 *   {kind: 'map',        ids, fn, label?}          fn: shape -> shape
 *   {kind: 'replacePair',remove, shapes, select?}  swap a set of ids for new shapes
 *   {kind: 'setShapes',  shapes, select?, label?}  whole-shape-list replacement
 *   {kind: 'selection',  ids}
 *   {kind: 'view',       view}
 */

import {
  arcFrom3Points,
  distToShape,
  makeCircle,
  makeLine,
  makePolyline,
  makeText,
  mirrorShape,
  rotateShape,
  scaleShape,
  shapesBBox,
  translateShape,
} from './geometry';
import {dist} from './vec';
import {
  applyRunEdits,
  filletCorner,
  nearestRun,
  runsOf,
  trimRun,
} from './corner';
import {
  breakLine,
  copyShapes,
  explodeShape,
  joinCollinear,
  offsetShape,
  polarArray,
  rectangularArray,
} from './transform';
import {clearSelection, selectAll, shapesOf} from './selection';
import {
  dimensionForShape,
  makeAlignedDim,
  makeAngularDim,
  makeHorizontalDim,
  makeVerticalDim,
} from './dimensions';
import {zoomToFit} from './viewport';

/** Prompt kinds the UI knows how to render. */
export const PROMPT = {
  POINT: 'point',
  DISTANCE: 'distance',
  RADIUS: 'radius',
  ANGLE: 'angle',
  SELECTION: 'selection',
  TEXT: 'text',
  NUMBER: 'number',
  CONFIRM: 'confirm',
  NONE: 'none',
};

const cmd = (name, aliases, prompts, step) => ({name, aliases, prompts, step});

const P = (key, text, extra = {}) => ({
  kind: PROMPT.POINT,
  key,
  text,
  ...extra,
});
const N = (key, text, extra = {}) => ({
  kind: PROMPT.NUMBER,
  key,
  text,
  ...extra,
});
const D = (key, text, extra = {}) => ({
  kind: PROMPT.DISTANCE,
  key,
  text,
  ...extra,
});
const A = (key, text, extra = {}) => ({
  kind: PROMPT.ANGLE,
  key,
  text,
  ...extra,
});
const S = (key, text, extra = {}) => ({
  kind: PROMPT.SELECTION,
  key,
  text,
  ...extra,
});
const T = (key, text) => ({kind: PROMPT.TEXT, key, text});
const YESNO = (key, text) => ({kind: PROMPT.CONFIRM, key, text});

const isPoint = v =>
  v != null && typeof v === 'object' && typeof v.x === 'number';
const isIds = v => Array.isArray(v) && v.length > 0;
/** How far a tap may miss a curve and still count as hitting it, in mm. */
const pickTol = ctx => ctx.pickTol ?? 3;
/** Skip a step whose prompt is optional and the user just pressed return. */
const skipped = input => input == null || input === '';

// ══ Drawing ═══════════════════════════════════════════════════════════════

/**
 * LINE. Each finished segment seeds the next, which is what lets a tapped run
 * of segments form a chain without the user re-picking the shared corner.
 */
const line = cmd(
  'LINE',
  ['L'],
  [P('pts', 'Specify first point:')],
  ({answers, input}) => {
    if (skipped(input)) return {done: true, ops: []};
    const pts = [...(answers.pts ?? []), input];
    if (pts.length < 2) {
      return {prompt: P('pts', 'Specify next point:'), nextAnswers: {pts}};
    }
    return {
      done: true,
      ops: [{kind: 'add', shapes: [makeLine(pts[0], pts[1])], label: 'line'}],
      repeat: true,
      nextAnswers: {pts: [pts[1]]},
    };
  },
);

/** PLINE. Accumulates points until the user closes, undoes, or returns. */
const polyline = cmd(
  'PLINE',
  ['PL', 'POLYLINE'],
  [P('pts', 'Specify start point:')],
  ({answers, input}) => {
    const pts = answers.pts ?? [];

    // C and U are typed as plain words, so they arrive as strings.
    if (typeof input === 'string') {
      const word = input.trim().toUpperCase();
      if (word === 'C') return finishPline(pts, true);
      if (word === 'U') {
        if (pts.length < 2)
          return {done: true, ops: [], message: 'Nothing to undo.'};
        return {
          prompt: P('pts', 'Specify next point or [Close]:'),
          nextAnswers: {pts: pts.slice(0, -1)},
        };
      }
      return {done: true, ops: [], message: `Unknown option: ${word}`};
    }
    if (skipped(input)) return finishPline(pts, false); // return ends the line
    return {
      prompt: P('pts', 'Specify next point or [Close]:'),
      nextAnswers: {pts: [...pts, input]},
    };
  },
);

const finishPline = (pts, closed) =>
  pts.length < 2
    ? {done: true, ops: [], message: 'Need at least two points.'}
    : {
        done: true,
        ops: [
          {kind: 'add', shapes: [makePolyline(pts, closed)], label: 'pline'},
        ],
        repeat: true,
        nextAnswers: {pts: [pts[pts.length - 1]]},
      };

/** CIRCLE. A number is a radius; a second point is a radius by measurement. */
const circle = cmd(
  'CIRCLE',
  ['C'],
  [P('centre', 'Specify centre point:'), D('radius', 'Specify radius:')],
  ({answers, input}) => {
    if (answers.centre == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.centre = input;
      return {prompt: D('radius', 'Specify radius:')};
    }
    const r =
      typeof input === 'number'
        ? input
        : isPoint(input)
        ? dist(answers.centre, input)
        : null;
    if (!(r > 1e-9))
      return {
        done: true,
        ops: [],
        message: 'A circle needs a positive radius.',
      };
    return {
      done: true,
      ops: [
        {kind: 'add', shapes: [makeCircle(answers.centre, r)], label: 'circle'},
      ],
      repeat: true,
    };
  },
);

/** ARC by three points, the variant that needs no centre and no angles. */
const threePointArc = cmd(
  'ARC',
  ['A'],
  [
    P('p1', 'Specify start point:'),
    P('p2', 'Specify second point:'),
    P('p3', 'Specify end point:'),
  ],
  ({answers, input}) => {
    if (answers.p1 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p1 = input;
      return {prompt: P('p2', 'Specify second point:')};
    }
    if (answers.p2 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p2 = input;
      return {prompt: P('p3', 'Specify end point:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    const arc = arcFrom3Points(answers.p1, answers.p2, input);
    if (!arc)
      return {
        done: true,
        ops: [],
        message: 'Those three points do not define an arc.',
      };
    return {done: true, ops: [{kind: 'add', shapes: [arc], label: 'arc'}]};
  },
);

/** RECTANG as one closed polyline, so it stays a single selectable object. */
const rectangle = cmd(
  'RECTANG',
  ['REC', 'RECT'],
  [
    P('p1', 'Specify first corner point:'),
    P('p2', 'Specify opposite corner point:'),
  ],
  ({answers, input}) => {
    if (answers.p1 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p1 = input;
      return {prompt: P('p2', 'Specify opposite corner point:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    const {x: x0, y: y0} = answers.p1;
    const {x: x1, y: y1} = input;
    const box = {
      minX: Math.min(x0, x1),
      minY: Math.min(y0, y1),
      maxX: Math.max(x0, x1),
      maxY: Math.max(y0, y1),
    };
    return {
      done: true,
      ops: [
        {
          kind: 'add',
          shapes: [
            makePolyline(
              [
                {x: box.minX, y: box.minY},
                {x: box.maxX, y: box.minY},
                {x: box.maxX, y: box.maxY},
                {x: box.minX, y: box.maxY},
              ],
              true,
            ),
          ],
          label: 'rectang',
        },
      ],
      repeat: true,
    };
  },
);

/** TEXT. Height and rotation are optional, so a bare return accepts a default. */
const textCmd = cmd(
  'TEXT',
  ['T', 'DT'],
  [
    P('at', 'Specify start point:'),
    N('height', 'Specify height <5>:'),
    A('rotation', 'Specify rotation <0>:'),
    T('text', 'Enter text:'),
  ],
  ({answers, input}) => {
    if (answers.at == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.at = input;
      return {prompt: N('height', 'Specify height <5>:')};
    }
    if (answers.height == null) {
      answers.height = skipped(input) ? 5 : input;
      return {prompt: A('rotation', 'Specify rotation <0>:')};
    }
    if (answers.rotation == null) {
      answers.rotation = skipped(input) ? 0 : input;
      return {prompt: T('text', 'Enter text:')};
    }
    if (skipped(input)) return {done: true, ops: []};
    const shape = makeText(
      answers.at,
      String(input),
      answers.height,
      (answers.rotation * Math.PI) / 180,
    );
    return {done: true, ops: [{kind: 'add', shapes: [shape], label: 'text'}]};
  },
);

// ══ Modify ════════════════════════════════════════════════════════════════

const erase = cmd(
  'ERASE',
  ['E', 'DEL'],
  [S('ids', 'Select objects:')],
  ({answers, ctx, input}) => {
    const ids = answers.ids ?? (isIds(input) ? input : ctx.doc.selection);
    if (!ids.length) return {done: true, ops: []};
    return {done: true, ops: [{kind: 'remove', ids, label: 'erase'}]};
  },
);

/**
 * Shared body for MOVE / COPY: pick objects, then a base and a destination.
 * Only the resulting op differs, so the prompt flow lives in one place.
 */
const displaceStep =
  build =>
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: P('base', 'Specify base point:')};
    }
    if (answers.base == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.base = input;
      return {prompt: P('dest', 'Specify second point:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    const delta = {x: input.x - answers.base.x, y: input.y - answers.base.y};
    return build(shapesOf(ctx.doc.shapes, answers.ids), delta);
  };

const moveCmd = cmd(
  'MOVE',
  ['M'],
  [
    S('ids', 'Select objects:'),
    P('base', 'Specify base point:'),
    P('dest', 'Specify second point:'),
  ],
  displaceStep((picked, delta) => ({
    done: true,
    ops: [
      {
        kind: 'map',
        ids: picked.map(s => s.id),
        fn: s => translateShape(s, delta),
        label: 'move',
      },
    ],
  })),
);

const copyCmd = cmd(
  'COPY',
  ['CP', 'CO'],
  [
    S('ids', 'Select objects:'),
    P('base', 'Specify base point:'),
    P('dest', 'Specify second point:'),
  ],
  displaceStep((picked, delta) => ({
    done: true,
    ops: [
      {
        kind: 'add',
        shapes: copyShapes(picked, delta),
        select: true,
        label: 'copy',
      },
    ],
  })),
);

/** Shared body for ROTATE / SCALE: pick, pivot, then a single number. */
const aboutStep =
  (kind, prompt, build) =>
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {
        prompt: P(
          'base',
          kind === 'rotate' ? 'Specify base point:' : 'Specify base point:',
        ),
      };
    }
    if (answers.base == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.base = input;
      return {prompt};
    }
    if (typeof input !== 'number' || input === 0) return {done: true, ops: []};
    return build(shapesOf(ctx.doc.shapes, answers.ids), answers.base, input);
  };

const rotateCmd = cmd(
  'ROTATE',
  ['RO'],
  [
    S('ids', 'Select objects:'),
    P('base', 'Specify base point:'),
    A('deg', 'Specify rotation angle:'),
  ],
  aboutStep(
    'rotate',
    A('deg', 'Specify rotation angle:'),
    (picked, base, deg) => ({
      done: true,
      ops: [
        {
          kind: 'map',
          ids: picked.map(s => s.id),
          fn: s => rotateShape(s, base, (deg * Math.PI) / 180),
          label: 'rotate',
        },
      ],
    }),
  ),
);

const scaleCmd = cmd(
  'SCALE',
  ['SC'],
  [
    S('ids', 'Select objects:'),
    P('base', 'Specify base point:'),
    N('factor', 'Specify scale factor:'),
  ],
  aboutStep(
    'scale',
    N('factor', 'Specify scale factor:'),
    (picked, base, factor) => ({
      done: true,
      ops: [
        {
          kind: 'map',
          ids: picked.map(s => s.id),
          fn: s => scaleShape(s, base, factor),
          label: 'scale',
        },
      ],
    }),
  ),
);

const mirrorCmd = cmd(
  'MIRROR',
  ['MI'],
  [
    S('ids', 'Select objects:'),
    P('p1', 'Specify first point of mirror line:'),
    P('p2', 'Specify second point:'),
    YESNO('erase', 'Delete source objects? <N>:'),
  ],
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: P('p1', 'Specify first point of mirror line:')};
    }
    if (answers.p1 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p1 = input;
      return {prompt: P('p2', 'Specify second point:')};
    }
    if (answers.p2 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p2 = input;
      return {prompt: YESNO('erase', 'Delete source objects? <N>:')};
    }
    if (answers.erase == null) answers.erase = input === true;

    const picked = shapesOf(ctx.doc.shapes, answers.ids);
    const copies = picked.map(s => mirrorShape(s, answers.p1, answers.p2));
    const ops = [];
    if (answers.erase)
      ops.push({kind: 'remove', ids: answers.ids, label: 'mirror'});
    ops.push({kind: 'add', shapes: copies, select: true, label: 'mirror'});
    return {done: true, ops};
  },
);

const joinCmd = cmd(
  'JOIN',
  ['J'],
  [S('ids', 'Select objects to join:')],
  ({answers, input, ctx}) => {
    const ids = answers.ids ?? input;
    if (!isIds(ids) || ids.length < 2)
      return {done: true, ops: [], message: 'Select at least two objects.'};
    const result = joinCollinear(shapesOf(ctx.doc.shapes, ids));
    if (!result) return {done: true, ops: [], message: 'Nothing to join.'};
    return {
      done: true,
      ops: [
        {
          kind: 'replacePair',
          remove: result.removed,
          shapes: result.created,
          select: result.created.map(s => s.id),
          label: 'join',
        },
      ],
    };
  },
);

/**
 * TRIM. Cutting edges first, then a tap on the piece to delete. The tap is
 * what decides which side survives, so it has to be a real point rather than
 * just an object id.
 */
const trimCmd = cmd(
  'TRIM',
  ['TR'],
  [S('edgeIds', 'Select cutting edges:'), P('tap', 'Select object to trim:')],
  ({answers, input, ctx}) => {
    if (answers.edgeIds == null) {
      if (!isIds(input))
        return {done: true, ops: [], message: 'Select cutting edges first.'};
      answers.edgeIds = input;
      return {prompt: P('tap', 'Select object to trim:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};

    const edges = shapesOf(ctx.doc.shapes, answers.edgeIds).flatMap(s =>
      runsOf(s),
    );
    if (!edges.length)
      return {
        done: true,
        ops: [],
        message: 'Those cutting edges have no straight parts.',
      };

    // Find the run the finger actually landed on, ignoring the edges.
    const edgeSet = new Set(answers.edgeIds);
    let target = null;
    for (const shape of ctx.doc.shapes) {
      if (edgeSet.has(shape.id)) continue;
      const run = nearestRun(shape, input, pickTol(ctx));
      if (run && (!target || run.distance < target.distance)) target = run;
    }
    if (!target)
      return {
        done: true,
        ops: [],
        message: 'Nothing under the finger to trim.',
      };

    let cut = null;
    for (const edge of edges) {
      const t = trimRun(target, edge, input);
      if (t) {
        cut = t;
        break;
      }
    }
    if (!cut)
      return {done: true, ops: [], message: 'Those objects do not cross.'};

    return {
      done: true,
      ops: [
        {
          kind: 'setShapes',
          shapes: applyRunEdits(ctx.doc.shapes, [cut]),
          label: 'trim',
        },
      ],
      repeat: true,
    };
  },
);

/** FILLET across two entities, using the document's remembered radius. */
const filletCmd = cmd(
  'FILLET',
  ['F'],
  [S('ids1', 'Select first object:'), S('ids2', 'Select second object:')],
  ({answers, input, ctx}) => {
    if (answers.ids1 == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids1 = input;
      return {prompt: S('ids2', 'Select second object:')};
    }
    if (answers.ids2 == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids2 = input;
    }

    const runs1 = shapesOf(ctx.doc.shapes, answers.ids1).flatMap(s =>
      runsOf(s),
    );
    const runs2 = shapesOf(ctx.doc.shapes, answers.ids2).flatMap(s =>
      runsOf(s),
    );
    const r = ctx.doc.filletRadius ?? 5;

    let made = null;
    outer: for (const a of runs1) {
      for (const b of runs2) {
        const f = filletCorner(a, b, r);
        if (f) {
          made = f;
          break outer;
        }
      }
    }
    if (!made)
      return {
        done: true,
        ops: [],
        message: `Cannot fillet these at radius ${r}.`,
      };

    return {
      done: true,
      ops: [
        {
          kind: 'setShapes',
          shapes: applyRunEdits(ctx.doc.shapes, made.edits, [made.arc]),
          label: 'fillet',
        },
      ],
      repeat: true,
    };
  },
);

const explodeCmd = cmd(
  'EXPLODE',
  ['X'],
  [S('ids', 'Select objects:')],
  ({answers, input, ctx}) => {
    const ids = answers.ids ?? input ?? ctx.doc.selection;
    if (!ids.length) return {done: true, ops: []};
    const picked = shapesOf(ctx.doc.shapes, ids);
    const pieces = picked.flatMap(explodeShape);
    // explodeShape returns the input untouched for types it cannot split, so
    // comparing the new ids is how we tell a real explode from a no-op.
    const changed =
      pieces.length !== picked.length ||
      pieces.some((p, i) => p.id !== picked[i]?.id);
    if (!changed) return {done: true, ops: [], message: 'Nothing to explode.'};
    return {
      done: true,
      ops: [
        {kind: 'replacePair', remove: ids, shapes: pieces, label: 'explode'},
      ],
    };
  },
);

const breakCmd = cmd(
  'BREAK',
  ['BR'],
  [S('ids', 'Select objects:'), P('at', 'Specify break point:')],
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: P('at', 'Specify break point:')};
    }
    if (answers.at == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.at = input;
    }
    const picked = shapesOf(ctx.doc.shapes, answers.ids);
    const pieces = [];
    const split = [];
    for (const s of picked) {
      const halves = breakLine(s, answers.at);
      if (halves) {
        pieces.push(...halves);
        split.push(s.id);
      } else {
        pieces.push(s);
      }
    }
    if (!split.length)
      return {done: true, ops: [], message: 'No line there to break.'};
    return {
      done: true,
      ops: [
        {kind: 'replacePair', remove: split, shapes: pieces, label: 'break'},
      ],
    };
  },
);

/**
 * OFFSET. `offsetShape` only knows the signed distance, so the through point
 * is used to choose the side: build both and keep the copy nearer the finger.
 */
const offsetCmd = cmd(
  'OFFSET',
  ['O'],
  [
    D('distance', 'Specify offset distance:'),
    S('ids', 'Select object to offset:'),
    P('through', 'Specify through point:'),
  ],
  ({answers, input, ctx}) => {
    if (answers.distance == null) {
      if (typeof input !== 'number') return {done: true, ops: []};
      answers.distance = input;
      return {prompt: S('ids', 'Select object to offset:')};
    }
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: P('through', 'Specify through point:')};
    }
    if (answers.through == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.through = input;
    }

    const tol = pickTol(ctx);
    const made = [];
    for (const s of shapesOf(ctx.doc.shapes, answers.ids)) {
      const left = offsetShape(s, answers.distance);
      const right = offsetShape(s, -answers.distance);
      if (!left.length && !right.length) continue;
      const dLeft = left.length
        ? distToShape(left[0], answers.through)
        : Infinity;
      const dRight = right.length
        ? distToShape(right[0], answers.through)
        : Infinity;
      const pick = Math.min(dLeft, dRight);
      if (!(pick < tol + 1e-6)) continue; // the finger picked neither side
      made.push(...(dLeft <= dRight ? left : right));
    }
    if (!made.length)
      return {done: true, ops: [], message: 'No offset lands there.'};
    return {
      done: true,
      ops: [{kind: 'add', shapes: made, label: 'offset'}],
      repeat: true,
    };
  },
);

const arrayRectCmd = cmd(
  'ARRAYRECT',
  ['AR'],
  [
    S('ids', 'Select objects:'),
    N('rows', 'Enter number of rows:'),
    N('cols', 'Enter number of columns:'),
    D('cellY', 'Enter spacing between rows:'),
    D('cellX', 'Enter spacing between columns:'),
  ],
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: N('rows', 'Enter number of rows:')};
    }
    if (answers.rows == null) {
      if (typeof input !== 'number') return {done: true, ops: []};
      answers.rows = Math.round(input);
      return {prompt: N('cols', 'Enter number of columns:')};
    }
    if (answers.cols == null) {
      if (typeof input !== 'number') return {done: true, ops: []};
      answers.cols = Math.round(input);
      return {prompt: D('cellY', 'Enter spacing between rows:')};
    }
    if (answers.cellY == null) {
      if (typeof input !== 'number') return {done: true, ops: []};
      answers.cellY = input;
      return {prompt: D('cellX', 'Enter spacing between columns:')};
    }
    if (typeof input !== 'number') return {done: true, ops: []};
    answers.cellX = input;

    if (answers.rows < 1 || answers.cols < 1) {
      return {
        done: true,
        ops: [],
        message: 'Rows and columns must be at least 1.',
      };
    }
    const made = shapesOf(ctx.doc.shapes, answers.ids).flatMap(s =>
      rectangularArray(
        s,
        answers.cellX,
        answers.cellY,
        answers.rows,
        answers.cols,
      ),
    );
    if (!made.length)
      return {done: true, ops: [], message: 'That produces no copies.'};
    return {done: true, ops: [{kind: 'add', shapes: made, label: 'array'}]};
  },
);

const arrayPolarCmd = cmd(
  'ARRAYPOLAR',
  ['AP'],
  [
    S('ids', 'Select objects:'),
    P('centre', 'Specify center point of array:'),
    N('count', 'Enter number of items:'),
    A('total', 'Specify angle to fill <360>:'),
  ],
  ({answers, input, ctx}) => {
    if (answers.ids == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.ids = input;
      return {prompt: P('centre', 'Specify center point of array:')};
    }
    if (answers.centre == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.centre = input;
      return {prompt: N('count', 'Enter number of items:')};
    }
    if (answers.count == null) {
      if (typeof input !== 'number') return {done: true, ops: []};
      answers.count = Math.round(input);
      return {prompt: A('total', 'Specify angle to fill <360>:')};
    }
    if (answers.total == null) answers.total = skipped(input) ? null : input;

    if (answers.count < 2)
      return {done: true, ops: [], message: 'Need at least two items.'};
    const made = shapesOf(ctx.doc.shapes, answers.ids).flatMap(s =>
      polarArray(s, answers.centre, answers.count, answers.total),
    );
    if (!made.length)
      return {done: true, ops: [], message: 'That produces no copies.'};
    return {done: true, ops: [{kind: 'add', shapes: made, label: 'array'}]};
  },
);

// ══ Dimensions ═════════════════════════════════════════════════════════════

/** Shared body for the two-point dimension commands. */
const linearStep =
  make =>
  ({answers, input}) => {
    if (answers.p1 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p1 = input;
      return {prompt: P('p2', 'Specify second extension line origin:')};
    }
    if (answers.p2 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.p2 = input;
      return {prompt: P('def', 'Specify dimension line location:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    return {
      done: true,
      ops: [{kind: 'add', shapes: [make(answers.p1, answers.p2, input)]}],
      repeat: true,
    };
  };

const linearDims = [
  cmd(
    'DIMLINEAR',
    ['DIMALIGNED', 'DALI', 'DAL', 'DLI'],
    [],
    linearStep(makeAlignedDim),
  ),
  cmd('DIMHORIZONTAL', ['DIMH', 'DH'], [], linearStep(makeHorizontalDim)),
  cmd('DIMVERTICAL', ['DIMV', 'DV'], [], linearStep(makeVerticalDim)),
];
// The prompt list is identical apart from the wording, so build it once.
for (const d of linearDims) {
  d.prompts = [
    P('p1', 'Specify first extension line origin:'),
    P('p2', 'Specify second extension line origin:'),
    P('def', 'Specify dimension line location:'),
  ];
}

const dimAngularCmd = cmd(
  'DIMANGULAR',
  ['DAN'],
  [
    P('vertex', 'Specify arc centre point:'),
    P('on1', 'Specify first angle end point:'),
    P('def', 'Specify second angle end point:'),
  ],
  ({answers, input}) => {
    if (answers.vertex == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.vertex = input;
      return {prompt: P('on1', 'Specify first angle end point:')};
    }
    if (answers.on1 == null) {
      if (!isPoint(input)) return {done: true, ops: []};
      answers.on1 = input;
      return {prompt: P('def', 'Specify second angle end point:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    return {
      done: true,
      ops: [
        {
          kind: 'add',
          shapes: [makeAngularDim(answers.vertex, answers.on1, input)],
        },
      ],
      repeat: true,
    };
  },
);

/**
 * DIMRADIUS / DIMDIAMETER. Tap the circle or arc, then where the leader
 * should end. The association is stored so the dimension follows later edits.
 */
const radialStep =
  type =>
  ({answers, input, ctx}) => {
    if (answers.targetId == null) {
      if (!isIds(input)) return {done: true, ops: []};
      answers.targetId = input[0];
      return {prompt: P('def', 'Specify leader line endpoint:')};
    }
    if (!isPoint(input)) return {done: true, ops: []};
    const shape = ctx.doc.shapes.find(s => s.id === answers.targetId);
    if (!shape)
      return {done: true, ops: [], message: 'That object no longer exists.'};
    const dim = dimensionForShape(shape, type, input);
    if (!dim)
      return {done: true, ops: [], message: 'Select a circle or an arc.'};
    return {
      done: true,
      ops: [{kind: 'add', shapes: [{...dim, assocId: shape.id}], label: type}],
      repeat: true,
    };
  };

const dimRadiusCmd = cmd(
  'DIMRADIUS',
  ['DRA', 'DIMRAD'],
  [],
  radialStep('radius'),
);
const dimDiameterCmd = cmd(
  'DIMDIAMETER',
  ['DDI', 'DIMDIA'],
  [],
  radialStep('diameter'),
);
for (const d of [dimRadiusCmd, dimDiameterCmd]) {
  d.prompts = [
    S('targetId', 'Select arc or circle:'),
    P('def', 'Specify leader line endpoint:'),
  ];
}

// ══ View and utility ═══════════════════════════════════════════════════════

const zoomExtentsCmd = cmd('ZOOMEXTENTS', ['ZE'], [], ({ctx}) => {
  // shapesBBox([]) hands back a default 0..100 box, so the emptiness check has
  // to be on the document rather than on the result.
  if (!ctx.doc.shapes.length)
    return {done: true, ops: [], message: 'Nothing to zoom to.'};
  return {
    done: true,
    ops: [
      {kind: 'view', view: zoomToFit(ctx.view, shapesBBox(ctx.doc.shapes))},
    ],
  };
});

const selectAllCmd = cmd('SELECTALL', ['SA'], [], ({ctx}) => ({
  done: true,
  ops: [
    {
      kind: 'selection',
      ids: selectAll(ctx.doc.shapes, {layers: ctx.doc.layers}),
    },
  ],
}));

const unselectCmd = cmd('UNSELECT', ['US'], [], () => ({
  done: true,
  ops: [{kind: 'selection', ids: clearSelection()}],
}));

const listCmd = cmd('LIST', ['LI', 'LS'], [], ({ctx}) => {
  const n = ctx.doc.shapes.length;
  return {
    done: true,
    ops: [],
    message: `${n} object${n === 1 ? '' : 's'} on ${
      Object.keys(ctx.doc.layers).length
    } layer(s)`,
  };
});

export const COMMANDS = [
  line,
  polyline,
  circle,
  threePointArc,
  rectangle,
  textCmd,
  erase,
  moveCmd,
  copyCmd,
  rotateCmd,
  scaleCmd,
  mirrorCmd,
  joinCmd,
  trimCmd,
  filletCmd,
  explodeCmd,
  breakCmd,
  offsetCmd,
  arrayRectCmd,
  arrayPolarCmd,
  ...linearDims,
  dimAngularCmd,
  dimRadiusCmd,
  dimDiameterCmd,
  zoomExtentsCmd,
  selectAllCmd,
  unselectCmd,
  listCmd,
];

/** Look a command up by name or alias, case-insensitively. */
export function findCommand(token) {
  if (!token) return null;
  const t = String(token).trim().toUpperCase();
  return (
    COMMANDS.find(c => c.name === t) ??
    COMMANDS.find(c => c.aliases.some(a => a.toUpperCase() === t)) ??
    null
  );
}

/** Every name and alias, for autocomplete. */
export const commandNames = () => COMMANDS.flatMap(c => [c.name, ...c.aliases]);

/** Commands that start with the given prefix. */
export const suggestCommands = prefix => {
  const p = String(prefix ?? '')
    .trim()
    .toUpperCase();
  if (!p) return [];
  return commandNames()
    .filter(n => n.startsWith(p))
    .slice(0, 8);
};
