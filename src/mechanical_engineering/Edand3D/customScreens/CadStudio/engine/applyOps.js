/**
 * Operation executor — the seam between the command line and the document.
 *
 * Commands are pure: a step returns a list of ops and never touches state.
 * This module is the only place those ops become real edits, which buys two
 * things the alternative does not:
 *
 *  - One command is one undo step. A MIRROR both deletes and creates, and the
 *    whole fold is committed once at the end rather than after each op.
 *  - There is exactly one place where "what an edit means" is written down, so
 *    the canvas, the command line and the tests cannot drift apart.
 */

import {makeId} from './geometry';
import {updateDimension} from './dimensions';
import {commitShapes, setSelection} from './document';
import {normaliseIds} from './selection';

/** Stamp a shape the way the document requires: an id and a layer. */
const seal = (shape, layerId) => ({
  ...shape,
  id: shape.id ?? makeId(shape.type),
  layerId: shape.layerId ?? layerId,
});

/**
 * Fold one op over a working `{shapes, selection}` pair.
 *
 * Nothing here commits, so ops are free to build on each other — a later op
 * sees the shapes an earlier one produced.
 */
function fold(state, op, doc) {
  switch (op.kind) {
    case 'add': {
      const list = (Array.isArray(op.shapes) ? op.shapes : [op.shapes]).filter(
        Boolean,
      );
      if (!list.length) return state;
      const sealed = list.map(s => seal(s, doc.currentLayer));
      const ids = sealed.map(s => s.id);
      return {
        shapes: [...state.shapes, ...sealed],
        // `select: false` is how a command adds geometry without stealing the
        // selection, which a multi-pass command like ARRAY needs.
        selection:
          op.select === false
            ? state.selection
            : normaliseIds([
                ...state.selection,
                ...(op.select ?? true ? ids : []),
              ]),
        changed: true,
      };
    }

    case 'remove': {
      const drop = new Set(op.ids);
      if (!drop.size) return state;
      return {
        shapes: state.shapes.filter(s => !drop.has(s.id)),
        selection: normaliseIds(state.selection.filter(id => !drop.has(id))),
        changed: true,
      };
    }

    case 'map': {
      const want = new Set(op.ids);
      if (!want.size) return state;
      return {
        shapes: state.shapes.map(s => (want.has(s.id) ? op.fn(s) : s)),
        selection: state.selection,
        changed: true,
      };
    }

    case 'replacePair': {
      const drop = new Set(op.remove);
      const kept = state.shapes.filter(s => !drop.has(s.id));
      const list = (op.shapes ?? []).map(s => seal(s, doc.currentLayer));
      const ids = list.map(s => s.id);
      return {
        shapes: [...kept, ...list],
        selection: op.select
          ? ids
          : normaliseIds(state.selection.filter(id => !drop.has(id))),
        changed: true,
      };
    }

    case 'setShapes': {
      const list = (op.shapes ?? []).map(s =>
        seal(s, s.layerId ?? doc.currentLayer),
      );
      const ids = new Set(list.map(s => s.id));
      return {
        shapes: list,
        selection: op.select
          ? op.select
          : normaliseIds(state.selection.filter(id => ids.has(id))),
        changed: true,
      };
    }

    case 'selection':
      return {...state, selection: normaliseIds(op.ids)};

    default:
      return state;
  }
}

/** Drop dimensions whose subject was removed, and re-point the rest. */
function reconcileDimensions(shapes) {
  const byId = new Map(shapes.map(s => [s.id, s]));
  return shapes
    .filter(s => s.type !== 'dimension' || !s.assocId || byId.has(s.assocId))
    .map(s =>
      s.type === 'dimension' && s.assocId ? updateDimension(s, shapes) : s,
    );
}

/**
 * Apply a command's ops.
 *
 * @param doc   the document to edit
 * @param view  the current viewport, which `view` ops may replace
 * @param ops   the ops a command step returned
 * @returns {doc, view, changed}
 */
export function applyOps(doc, view, ops) {
  if (!ops || !ops.length) return {doc, view, changed: false};

  let state = {shapes: doc.shapes, selection: doc.selection, changed: false};
  let nextView = view;

  for (const op of ops) {
    if (op.kind === 'view') {
      nextView = op.view;
      continue;
    }
    state = fold(state, op, doc);
  }

  // A dimension measures a shape, so once geometry moves the dimension has to
  // move with it or the drawing starts lying about its own size.
  if (state.changed) state.shapes = reconcileDimensions(state.shapes);

  if (!state.changed) {
    // Selection and view ops are not undoable, which is what makes panning
    // and clicking cheap.
    return {
      doc: setSelection(doc, state.selection),
      view: nextView,
      changed: false,
    };
  }

  const label = ops.find(o => o.label)?.label ?? 'edit';
  return {
    doc: commitShapes(doc, state.shapes, {selection: state.selection, label}),
    view: nextView,
    changed: true,
  };
}
