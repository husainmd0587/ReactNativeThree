/**
 * The drawing document: shapes, layers, selection, and undo history.
 *
 * This is a plain reducer with no React or Redux dependency, so the same
 * logic can be driven from a test, from a worklet, or from a React store. The
 * UI layer wraps it; it does not own it.
 *
 * Undo is implemented as immutable snapshots of the shape list rather than
 * inverse operations. For a drawing this size the memory cost is trivial, and
 * it removes an entire category of bug where an operation's inverse does not
 * exactly reproduce its forward step.
 */

import {DEFAULT_OSNAP} from './snap';
import {makeId, shapesBBox} from './geometry';
import {addToSelection, clearSelection, normaliseIds} from './selection';

export const CURRENT_LAYER = '0';

export const makeLayer = (id, name, extra = {}) => ({
  id,
  name,
  visible: true,
  locked: false,
  frozen: false,
  color: null,
  lineweight: null,
  linetype: null,
  ...extra,
});

export const initialDoc = () => ({
  shapes: [],
  layers: {[CURRENT_LAYER]: makeLayer(CURRENT_LAYER, '0')},
  currentLayer: CURRENT_LAYER,
  nextLayerNumber: 1,
  selection: [],
  osnap: {...DEFAULT_OSNAP, on: true},
  ortho: false,
  polar: false,
  grid: true,
  gridSnap: false,
  history: {past: [], future: []},
});

/** Ids are kept sorted and unique so a selection compares by identity. */
const norm = normaliseIds;

const HISTORY_LIMIT = 100;

/**
 * Wrap a shape-list change as one undoable step.
 *
 * `label` is stored purely so the UI can say what Undo will revert, which is
 * a small thing that makes a long edit session far less disorienting.
 */
const commit = (
  doc,
  shapes,
  {selection = doc.selection, label = 'edit'} = {},
) => ({
  ...doc,
  shapes,
  selection: norm(selection),
  history: {
    past: [
      ...doc.history.past,
      {shapes: doc.shapes, selection: doc.selection, label},
    ].slice(-HISTORY_LIMIT),
    future: [],
  },
});

// ── Shape edits ───────────────────────────────────────────────────────────

export const addShapes = (doc, shapes, opts = {}) => {
  if (!shapes || (Array.isArray(shapes) && !shapes.length)) return doc;
  const list = Array.isArray(shapes) ? shapes : [shapes];
  const layerId = opts.layerId ?? doc.currentLayer;
  const sealed = list.map(s => ({
    ...s,
    id: s.id ?? makeId(s.type),
    layerId: s.layerId ?? layerId,
  }));
  return commit(doc, [...doc.shapes, ...sealed], {
    selection: opts.select === false ? doc.selection : sealed.map(s => s.id),
    label: opts.label ?? 'draw',
  });
};

export const replaceShapes = (doc, shapes, opts = {}) =>
  commit(doc, shapes, {label: opts.label ?? 'modify'});

/** Remove shapes, dropping any associated dimensions left orphaned. */
export const removeShapes = (doc, ids, opts = {}) => {
  const drop = new Set(ids);
  const gone = doc.shapes.filter(s => drop.has(s.id));
  const kept = doc.shapes.filter(s => !drop.has(s.id));
  const orphanDims = kept.filter(
    s => s.type === 'dimension' && s.assocId && drop.has(s.assocId),
  );
  if (orphanDims.length) {
    const orphanIds = new Set(orphanDims.map(s => s.id));
    return commit(
      doc,
      kept.filter(s => !orphanIds.has(s.id)),
      {label: opts.label ?? 'erase'},
    );
  }
  return commit(doc, kept, {label: opts.label ?? 'erase'});
};

/**
 * Commit a precomputed shape list as one undoable step.
 *
 * Command ops are folded together before they get here, so a MIRROR — which
 * both deletes the originals and adds the reflections — undoes in a single
 * press instead of two.
 */
export const commitShapes = (doc, shapes, opts = {}) =>
  commit(doc, shapes, opts);

/** Apply a pure shape→shape transform across a set of ids. */
export const mapShapes = (doc, ids, fn, opts = {}) => {
  const want = new Set(ids);
  if (!want.size) return doc;
  return commit(
    doc,
    doc.shapes.map(s => (want.has(s.id) ? fn(s) : s)),
    {label: opts.label ?? 'modify'},
  );
};

// ── Selection ─────────────────────────────────────────────────────────────

export const setSelection = (doc, ids) => ({...doc, selection: norm(ids)});
export const selectMore = (doc, ids) => ({
  ...doc,
  selection: addToSelection(doc.selection, ids),
});
export const clearSel = doc => ({...doc, selection: clearSelection()});

// ── Layers ────────────────────────────────────────────────────────────────

export const setCurrentLayer = (doc, id) =>
  doc.layers[id] ? {...doc, currentLayer: id} : doc;

export const addLayer = (doc, name) => {
  const n = doc.nextLayerNumber;
  const id = String(n);
  const wanted = name ?? `${n}`;
  if (doc.layers[id]) return doc;
  return {
    ...doc,
    layers: {...doc.layers, [id]: makeLayer(id, wanted)},
    currentLayer: id,
    nextLayerNumber: n + 1,
  };
};

export const patchLayer = (doc, id, patch) =>
  doc.layers[id]
    ? {...doc, layers: {...doc.layers, [id]: {...doc.layers[id], ...patch}}}
    : doc;

export const removeLayer = (doc, id) => {
  if (id === CURRENT_LAYER || !doc.layers[id]) return doc;
  const layers = {...doc.layers};
  delete layers[id];
  // Anything left on a deleted layer falls back to layer 0 rather than
  // disappearing, which is far less destructive than an implicit delete.
  const shapes = doc.shapes.map(s =>
    s.layerId === id ? {...s, layerId: CURRENT_LAYER} : s,
  );
  return {
    ...doc,
    layers,
    shapes,
    currentLayer: doc.currentLayer === id ? CURRENT_LAYER : doc.currentLayer,
  };
};

export const layerTable = doc => doc.layers;

// ── Settings ──────────────────────────────────────────────────────────────

const toggleFlag = (doc, key, value) => ({...doc, [key]: value ?? !doc[key]});

export const setOrtho = (doc, on) => toggleFlag(doc, 'ortho', on);
export const setPolar = (doc, on) => toggleFlag(doc, 'polar', on);
export const setGrid = (doc, on) => toggleFlag(doc, 'grid', on);
export const setGridSnap = (doc, on) => toggleFlag(doc, 'gridSnap', on);
export const setOsnap = (doc, patch) => ({
  ...doc,
  osnap: {...doc.osnap, ...patch},
});

/** Flip one snap mode, the way the OSNAP panel's toggles work. */
export const toggleOsnapKind = (doc, kind) =>
  setOsnap(doc, {[kind]: !doc.osnap[kind]});

// ── History ───────────────────────────────────────────────────────────────

export const canUndo = doc => doc.history.past.length > 0;
export const canRedo = doc => doc.history.future.length > 0;
export const undoLabel = doc =>
  doc.history.past[doc.history.past.length - 1]?.label ?? null;

/** Revert one step. Selection is restored alongside the geometry. */
export function undo(doc) {
  if (!canUndo(doc)) return doc;
  const past = doc.history.past;
  const entry = past[past.length - 1];
  return {
    ...doc,
    shapes: entry.shapes,
    selection: norm(entry.selection).filter(id =>
      entry.shapes.some(s => s.id === id),
    ),
    history: {
      past: past.slice(0, -1),
      future: [currentSnapshot(doc), ...doc.history.future].slice(
        0,
        HISTORY_LIMIT,
      ),
    },
  };
}

/** Reapply one step. */
export function redo(doc) {
  if (!canRedo(doc)) return doc;
  const [entry, ...rest] = doc.history.future;
  return {
    ...doc,
    shapes: entry.shapes,
    selection: norm(entry.selection).filter(id =>
      entry.shapes.some(s => s.id === id),
    ),
    history: {
      past: [...doc.history.past, currentSnapshot(doc)].slice(-HISTORY_LIMIT),
      future: rest,
    },
  };
}

const currentSnapshot = doc => ({
  shapes: doc.shapes,
  selection: doc.selection,
  label: 'redo',
});

export const clearHistory = doc => ({...doc, history: {past: [], future: []}});

// ── Derived views ─────────────────────────────────────────────────────────

export const visibleShapes = doc =>
  doc.shapes.filter(s => {
    if (s.hidden) return false;
    const l = doc.layers[s.layerId];
    return !l || l.visible !== false;
  });

export const docExtents = doc => shapesBBox(visibleShapes(doc));

// ── Persistence ───────────────────────────────────────────────────────────

/**
 * Serialise for AsyncStorage.
 *
 * The history is deliberately dropped: restoring a document should not
 * resurrect a hundred undo steps the user never sees, and the shape list is
 * the thing they came back for.
 */
export const serialiseDoc = doc => ({
  version: 1,
  shapes: doc.shapes,
  layers: doc.layers,
  currentLayer: doc.currentLayer,
  nextLayerNumber: doc.nextLayerNumber,
  osnap: doc.osnap,
  ortho: doc.ortho,
  polar: doc.polar,
  grid: doc.grid,
  gridSnap: doc.gridSnap,
});

/** Read back a serialised document, tolerating older or partial payloads. */
export function deserialiseDoc(raw) {
  const base = initialDoc();
  if (!raw || typeof raw !== 'object') return base;
  const layers =
    raw.layers && Object.keys(raw.layers).length ? raw.layers : base.layers;
  // Guarantee layer 0 exists: everything else assumes it is there.
  if (!layers[CURRENT_LAYER])
    layers[CURRENT_LAYER] = makeLayer(CURRENT_LAYER, '0');
  return {
    ...base,
    shapes: Array.isArray(raw.shapes) ? raw.shapes : [],
    layers,
    currentLayer: layers[raw.currentLayer] ? raw.currentLayer : CURRENT_LAYER,
    nextLayerNumber: raw.nextLayerNumber ?? 1,
    osnap: {...base.osnap, ...(raw.osnap ?? {})},
    ortho: raw.ortho ?? false,
    polar: raw.polar ?? false,
    grid: raw.grid ?? true,
    gridSnap: raw.gridSnap ?? false,
  };
}
