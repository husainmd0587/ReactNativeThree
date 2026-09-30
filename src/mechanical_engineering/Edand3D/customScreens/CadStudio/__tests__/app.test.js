/**
 * Tests for dimensions, the document store, and the command runner.
 *
 * These three modules are what turn the engine into an application, so the
 * cases here focus on the wiring between them rather than on geometry the
 * earlier suites already cover.
 */

import {
  dimensionText,
  labelPosition,
  measuredValue,
  makeAlignedDim,
  makeAngularDim,
  makeHorizontalDim,
  makeRadiusDim,
  makeVerticalDim,
  arrowheads,
  tickMarks,
  formatValue,
  updateDimension,
} from '../engine/dimensions';
import {makeCircle, makeLine, makePoint} from '../engine/geometry';
import {selectAll} from '../engine/selection';
import {
  addShapes,
  canRedo,
  canUndo,
  deserialiseDoc,
  initialDoc,
  mapShapes,
  removeShapes,
  serialiseDoc,
  setCurrentLayer,
  addLayer,
  removeLayer,
  patchLayer,
  toggleOsnapKind,
  visibleShapes,
  undo,
  redo,
} from '../engine/document';
import {PROMPT, findCommand, suggestCommands} from '../engine/commands';
import {
  feedCommand,
  newSession,
  parseInput,
  startCommand,
} from '../engine/commandRunner';
import {makeViewport} from '../engine/viewport';
import {applyOps} from '../engine/applyOps';

const ctx = () => {
  const doc = initialDoc();
  return {
    doc,
    view: makeViewport(400, 800, {scale: 2}),
    from: null,
    allIds: [],
  };
};

describe('dimensions report the number they measure', () => {
  test('aligned measures the true distance', () => {
    const d = makeAlignedDim({x: 0, y: 0}, {x: 30, y: 40}, {x: 0, y: 20});
    expect(measuredValue(d)).toBeCloseTo(50, 9);
    expect(dimensionText(d)).toBe('50');
  });

  test('horizontal measures only the X gap, vertical only Y', () => {
    // A deliberately non-square feature: the two must not agree.
    const p1 = {x: 0, y: 0};
    const p2 = {x: 30, y: 40};
    expect(measuredValue(makeHorizontalDim(p1, p2, {y: -10}))).toBeCloseTo(
      30,
      9,
    );
    expect(measuredValue(makeVerticalDim(p1, p2, {x: -10}))).toBeCloseTo(40, 9);
    expect(measuredValue(makeAlignedDim(p1, p2, {x: 0, y: 40}))).toBeCloseTo(
      50,
      9,
    );
  });

  test('radius and diameter are distinguished by their prefix and value', () => {
    const c = {x: 0, y: 0};
    const e = {x: 15, y: 0};
    expect(dimensionText(makeRadiusDim(c, e, {x: 25, y: 0}))).toBe('R15');
    expect(
      dimensionText(makeRadiusDim(c, e, {x: 25, y: 0}), {decimals: 1}).replace(
        'R',
        '',
      ),
    ).toBe('15');
    const d = {...makeRadiusDim(c, e, {x: 25, y: 0}), dimType: 'diameter'};
    expect(measuredValue(d)).toBeCloseTo(30, 9);
    expect(dimensionText(d)).toContain('30');
  });

  test('angular measures between the two legs, not from the X axis', () => {
    const d = makeAngularDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10});
    expect(measuredValue(d)).toBeCloseTo(90, 6);
    expect(dimensionText(d)).toBe('90°');
  });

  test('a user override replaces the measured text', () => {
    const d = makeAlignedDim({x: 0, y: 0}, {x: 30, y: 40}, {x: 0, y: 20});
    expect(dimensionText({...d, textOverride: 'CALL OUT'})).toBe('CALL OUT');
  });

  test('values are formatted without trailing zeros', () => {
    expect(formatValue(50)).toBe('50');
    expect(formatValue(50.5)).toBe('50.5');
    expect(formatValue(12.345, 2)).toBe('12.35');
    expect(formatValue(1234.567, 0)).toBe('1235');
  });

  test('the label sits on the dimension line between the ends', () => {
    const d = makeAlignedDim({x: 0, y: 0}, {x: 200, y: 0}, {x: 0, y: 20});
    const p = labelPosition(d);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });

  test('a cramped label is pushed clear of the measured span', () => {
    // Only 4 mm between the ends, far too small for the text.
    const d = makeAlignedDim({x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 20});
    const p = labelPosition(d);
    expect(p.y).toBeGreaterThan(20);
  });

  test('arrows point back at the feature from both ends', () => {
    const d = makeAlignedDim({x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 30});
    const heads = arrowheads(d);
    expect(heads.length).toBe(2);
    for (const h of heads)
      expect(Number.isFinite(h.dir.x) && Number.isFinite(h.dir.y)).toBe(true);
  });

  test('ticks cross the dimension line at its middle', () => {
    const d = makeAlignedDim({x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 30});
    const [t] = tickMarks(d);
    expect((t.a.x + t.b.x) / 2).toBeCloseTo(50, 6);
    expect((t.a.y + t.b.y) / 2).toBeCloseTo(30, 6);
  });

  test('an associated dimension follows its circle when it moves', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    const doc = {shapes: [c]};
    const d = {
      ...makeRadiusDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0}),
      assocId: c.id,
    };
    // The association is by id, and edits preserve ids, so a moved circle
    // arrives as the same id with new coordinates.
    const moved = {...c, points: [{x: 100, y: 50}]};
    const updated = updateDimension(d, [moved]);
    expect(updated.points[0].x).toBeCloseTo(100, 6);
    expect(measuredValue(updated)).toBeCloseTo(10, 6);
  });
});

describe('the document holds shapes, layers and history', () => {
  test('adding a shape selects it and stamps the current layer', () => {
    const doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].layerId).toBe('0');
    expect(doc.selection).toEqual([doc.shapes[0].id]);
  });

  test('undo and redo walk back and forth through edits', () => {
    let doc = initialDoc();
    doc = addShapes(doc, makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    expect(canUndo(doc)).toBe(true);
    doc = addShapes(doc, makeLine({x: 0, y: 1}, {x: 1, y: 1}));
    expect(doc.shapes).toHaveLength(2);

    doc = undo(doc);
    expect(doc.shapes).toHaveLength(1);
    doc = undo(doc);
    expect(doc.shapes).toHaveLength(0);
    expect(canUndo(doc)).toBe(false);
    expect(canRedo(doc)).toBe(true);

    doc = redo(doc);
    expect(doc.shapes).toHaveLength(1);
    expect(doc.selection).toHaveLength(1);
  });

  test('a new edit discards the redo branch', () => {
    let doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    doc = undo(doc);
    expect(canRedo(doc)).toBe(true);
    doc = addShapes(doc, makePoint({x: 5, y: 5}));
    expect(canRedo(doc)).toBe(false);
    expect(doc.shapes).toHaveLength(1);
  });

  test('undo restores selection but never selects a shape that is gone', () => {
    let doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    doc = addShapes(doc, makeLine({x: 0, y: 1}, {x: 1, y: 1}));
    doc = undo(doc);
    expect(doc.selection).toEqual([doc.shapes[0].id]);
  });

  test('erasing removes only what was asked', () => {
    let doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    doc = addShapes(doc, makeLine({x: 0, y: 1}, {x: 1, y: 1}));
    const survivor = doc.shapes[1].id;
    doc = removeShapes(doc, [doc.shapes[0].id]);
    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].id).toBe(survivor);
    // The survivor was selected when it was added, and erasing something else
    // has no business clearing it.
    expect(doc.selection).toEqual([survivor]);
  });

  test('erasing a shape also removes dimensions associated with it', () => {
    const c = makeCircle({x: 0, y: 0}, 10);
    let doc = addShapes(initialDoc(), c);
    doc = addShapes(doc, {
      ...makeRadiusDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0}),
      assocId: c.id,
    });
    expect(doc.shapes).toHaveLength(2);
    doc = removeShapes(doc, [c.id]);
    expect(doc.shapes).toHaveLength(0);
  });

  test('mapShapes transforms only the named ids', () => {
    const a = makeLine({x: 0, y: 0}, {x: 1, y: 0});
    const b = makeLine({x: 0, y: 5}, {x: 1, y: 5});
    let doc = addShapes(initialDoc(), [a, b], {select: false});
    doc = mapShapes(doc, [a.id], s => ({
      ...s,
      points: s.points.map(p => ({x: p.x + 10, y: p.y})),
    }));
    expect(doc.shapes.find(s => s.id === a.id).points[0].x).toBe(10);
    expect(doc.shapes.find(s => s.id === b.id).points[0].x).toBe(0);
  });

  test('layers can be added, switched, patched and removed', () => {
    let doc = initialDoc();
    doc = addLayer(doc, 'walls');
    expect(Object.keys(doc.layers)).toEqual(['0', '1']);
    expect(doc.currentLayer).toBe('1');
    doc = setCurrentLayer(doc, '0');
    expect(doc.currentLayer).toBe('0');
    doc = patchLayer(doc, '1', {locked: true});
    expect(doc.layers['1'].locked).toBe(true);
  });

  test('removing a layer reassigns its shapes to layer 0 rather than deleting them', () => {
    let doc = addLayer(initialDoc(), 'temp');
    doc = addShapes(doc, makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    expect(doc.shapes[0].layerId).toBe('1');
    doc = removeLayer(doc, '1');
    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].layerId).toBe('0');
    expect(doc.currentLayer).toBe('0');
  });

  test('layer 0 cannot be removed', () => {
    const doc = initialDoc();
    expect(removeLayer(doc, '0')).toBe(doc);
  });

  test('hidden layers and hidden shapes are not drawn', () => {
    let doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 1, y: 0}));
    expect(visibleShapes(doc)).toHaveLength(1);
    doc = patchLayer(doc, '0', {visible: false});
    expect(visibleShapes(doc)).toHaveLength(0);
  });

  test('an osnap mode toggles independently', () => {
    let doc = initialDoc();
    const before = doc.osnap.endpoint;
    doc = toggleOsnapKind(doc, 'endpoint');
    expect(doc.osnap.endpoint).toBe(!before);
    expect(doc.osnap.midpoint).toBe(true);
  });

  test('select all skips locked shapes', () => {
    const a = makeLine({x: 0, y: 0}, {x: 1, y: 0});
    let doc = addShapes(
      initialDoc(),
      [a, {...makeLine({x: 0, y: 1}, {x: 1, y: 1}), locked: true}],
      {select: false},
    );
    expect(selectAll(doc.shapes)).toEqual([a.id]);
  });

  test('a document survives a save and load round trip', () => {
    let doc = addShapes(initialDoc(), makeCircle({x: 5, y: 5}, 3));
    doc = patchLayer(doc, '0', {visible: false});
    const back = deserialiseDoc(JSON.parse(JSON.stringify(serialiseDoc(doc))));
    expect(back.shapes).toHaveLength(1);
    expect(back.layers['0'].visible).toBe(false);
    expect(back.currentLayer).toBe('0');
  });

  test('loading rubbish yields a usable empty document', () => {
    for (const bad of [null, undefined, 42, 'nope', {}]) {
      const doc = deserialiseDoc(bad);
      expect(doc.shapes).toEqual([]);
      expect(doc.layers['0']).toBeTruthy();
    }
  });
});

describe('the command line', () => {
  const run = (name, inputs) => {
    // A command that prompts for nothing produces its ops the moment it
    // starts, so those have to be kept rather than thrown away.
    const start = startCommand(name, ctx());
    let session = start.session;
    let ops = start.ops;
    let message = start.message;
    for (const input of inputs) {
      const r = feedCommand(session, input, ctx());
      session = r.session;
      ops = ops.concat(r.ops);
      if (r.message) message = r.message;
    }
    return {ops, message, session};
  };

  test('commands resolve by name and alias, case-insensitively', () => {
    expect(findCommand('line').name).toBe('LINE');
    expect(findCommand('L').name).toBe('LINE');
    expect(findCommand('trim').name).toBe('TRIM');
    expect(findCommand('nope')).toBeNull();
  });

  test('autocomplete suggests by prefix', () => {
    expect(suggestCommands('dim')).toContain('DIMLINEAR');
    expect(suggestCommands('zzz')).toEqual([]);
  });

  test('an unknown name reports rather than throwing', () => {
    const r = startCommand('NOPE', ctx());
    expect(r.session).toBeNull();
    expect(r.message).toContain('Unknown command');
  });

  test('LINE asks for a second point then makes a line', () => {
    const r = run('LINE', [
      {x: 0, y: 0},
      {x: 100, y: 0},
    ]);
    expect(r.ops[0].kind).toBe('add');
    expect(r.ops[0].shapes[0].type).toBe('line');
    expect(r.ops[0].shapes[0].points[1]).toEqual({x: 100, y: 0});
  });

  test('LINE stays active so a run of segments can be drawn', () => {
    let session = startCommand('LINE', ctx()).session;
    let r = feedCommand(session, {x: 0, y: 0}, ctx());
    session = r.session;
    expect(session).toBeTruthy();
    r = feedCommand(session, {x: 10, y: 0}, ctx());
    expect(r.repeat).toBe(true);
    expect(r.session).toBeTruthy();
  });

  test('CIRCLE takes a centre and a radius', () => {
    const r = run('CIRCLE', [{x: 10, y: 10}, 5]);
    expect(r.ops[0].shapes[0].type).toBe('circle');
    expect(r.ops[0].shapes[0].radius).toBe(5);
  });

  test('CIRCLE accepts a second point as the radius', () => {
    const r = run('CIRCLE', [
      {x: 0, y: 0},
      {x: 0, y: 7},
    ]);
    expect(r.ops[0].shapes[0].radius).toBeCloseTo(7, 9);
  });

  test('PLINE collects points and closes on C', () => {
    const r = run('PLINE', [{x: 0, y: 0}, {x: 10, y: 0}, 'C']);
    expect(r.ops[0].shapes[0].type).toBe('polyline');
    expect(r.ops[0].shapes[0].closed).toBe(true);
  });

  test('PLINE keeps going past two points instead of ending early', () => {
    // A polyline is the one shape whose length is not known up front, so the
    // repeated step has to keep collecting. Ending as soon as a third point
    // arrives silently caps every polyline at two segments.
    const context = ctx();
    let session = startCommand('PLINE', context).session;
    for (const p of [
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 10},
      {x: 20, y: 10},
    ]) {
      const r = feedCommand(session, p, context);
      expect(r.session).not.toBeNull();
      expect(r.ops).toHaveLength(0);
      session = r.session;
    }
    const done = feedCommand(session, undefined, context);
    const poly = done.ops[0].shapes[0];
    expect(poly.points).toHaveLength(4);
    expect(poly.closed).toBe(false);
    // Enter finishes the polyline but leaves the command running, continuing
    // from the last point, exactly as LINE does. A second Enter ends it.
    expect(done.session).not.toBeNull();
    const end = feedCommand(done.session, undefined, context);
    expect(end.session).toBeNull();
  });

  test('PLINE undo drops the last point without ending the run', () => {
    const context = ctx();
    let session = startCommand('PLINE', context).session;
    for (const p of [
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 10},
    ]) {
      session = feedCommand(session, p, context).session;
    }
    const undone = feedCommand(session, 'U', context);
    expect(undone.session).not.toBeNull();
    const done = feedCommand(undone.session, undefined, context);
    expect(done.ops[0].shapes[0].points).toHaveLength(2);
  });

  test('MOVE asks for objects, a base and a destination', () => {
    const a = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const context = ctx();
    context.doc = addShapes(context.doc, a, {select: false});
    let session = startCommand('MOVE', context).session;
    let r = feedCommand(session, [a.id], context);
    session = r.session;
    r = feedCommand(session, {x: 0, y: 0}, context);
    session = r.session;
    r = feedCommand(session, {x: 5, y: 5}, context);
    expect(r.ops[0].kind).toBe('map');
    const moved = r.ops[0].fn(context.doc.shapes[0]);
    expect(moved.points[0]).toEqual({x: 5, y: 5});
  });

  test('ERASE with nothing selected does nothing', () => {
    const r = run('ERASE', [[]]);
    expect(r.ops).toEqual([]);
  });

  test('ZOOMEXTENTS reports when there is nothing to show', () => {
    const r = run('ZOOMEXTENTS', []);
    expect(r.message).toContain('Nothing to zoom to');
  });

  test('ZOOMEXTENTS returns a view change once shapes exist', () => {
    const context = ctx();
    context.doc = addShapes(context.doc, makeCircle({x: 0, y: 0}, 10));
    // ZOOMEXTENTS asks nothing, so it has already produced its view by the
    // time startCommand returns.
    const r = startCommand('ZOOMEXTENTS', context);
    expect(r.ops[0].kind).toBe('view');
    expect(r.ops[0].view.centre.x).toBeCloseTo(0, 6);
  });

  test('a command that throws ends the session instead of wedging it', () => {
    const boom = {
      name: 'BOOM',
      aliases: [],
      prompts: [],
      step: () => {
        throw new Error('kaboom');
      },
    };
    // Drive the runner with a deliberately broken definition.
    const r = feedCommand(newSession(boom), null, ctx());
    expect(r.session).toBeNull();
    expect(r.message).toContain('kaboom');
  });

  test('input shorthands are interpreted before a command sees them', () => {
    expect(parseInput('10,20', {kind: PROMPT.POINT})).toEqual({x: 10, y: 20});
    expect(
      parseInput('@5,0', {kind: PROMPT.POINT}, {from: {x: 1, y: 1}}),
    ).toEqual({x: 6, y: 1});
    expect(parseInput('100<45', {kind: PROMPT.POINT})).toBeTruthy();
    expect(parseInput('25', {kind: PROMPT.DISTANCE})).toBe(25);
    expect(parseInput('25mm', {kind: PROMPT.DISTANCE})).toBe(25);
    expect(parseInput('90', {kind: PROMPT.ANGLE})).toBe(90);
    expect(
      parseInput('ALL', {kind: PROMPT.SELECTION}, {allIds: ['a', 'b']}),
    ).toEqual(['a', 'b']);
    expect(parseInput('', {kind: PROMPT.POINT})).toBeNull();
  });

  test('a text prompt keeps its raw string', () => {
    expect(parseInput('Bracket A', {kind: PROMPT.TEXT})).toBe('Bracket A');
  });
});

describe('ops become edits', () => {
  const setup = () => ({view: makeViewport(400, 800, {scale: 2})});

  test('adding stamps the current layer and selects the result', () => {
    // addLayer makes the new layer current, which is what the test needs to
    // prove: the shape picks up whichever layer is active, not layer 0.
    const doc = addLayer(initialDoc(), 'Walls');
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const out = applyOps(doc, setup().view, [{kind: 'add', shapes: [line]}]);
    expect(out.doc.shapes).toHaveLength(1);
    expect(out.doc.shapes[0].layerId).toBe('1');
    expect(out.doc.currentLayer).toBe('1');
    expect(out.doc.selection).toEqual([out.doc.shapes[0].id]);
  });

  test('a command that deletes and creates undoes in one press', () => {
    // MIRROR emits a remove and an add; two history entries would mean two
    // undos to get back to the drawing the user started with.
    let doc = addShapes(initialDoc(), makeLine({x: 0, y: 0}, {x: 10, y: 0}));
    const id = doc.shapes[0].id;
    const before = doc.shapes.length;
    const out = applyOps(doc, setup().view, [
      {kind: 'remove', ids: [id], label: 'mirror'},
      {
        kind: 'add',
        shapes: [makeLine({x: 0, y: 0}, {x: -10, y: 0})],
        label: 'mirror',
      },
    ]);
    expect(out.doc.shapes).toHaveLength(before);
    expect(out.doc.history.past).toHaveLength(2); // the add, then the mirror
    const back = undo(out.doc);
    expect(back.shapes).toHaveLength(1);
    expect(back.shapes[0].id).toBe(id);
    expect(back.shapes[0].points[1]).toEqual({x: 10, y: 0});
  });

  test('a moved circle takes its dimension along', () => {
    const circle = makeCircle({x: 0, y: 0}, 10);
    let doc = addShapes(initialDoc(), circle);
    doc = addShapes(doc, {
      ...makeRadiusDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 30, y: 20}),
      assocId: circle.id,
    });
    const out = applyOps(doc, setup().view, [
      {
        kind: 'map',
        ids: [circle.id],
        fn: s => ({...s, points: [{x: 100, y: 50}]}),
        label: 'move',
      },
    ]);
    const dim = out.doc.shapes.find(s => s.type === 'dimension');
    expect(dim.points[0].x).toBe(100);
    expect(measuredValue(dim)).toBeCloseTo(10, 9);
  });

  test('erasing a shape takes its associated dimension with it', () => {
    const circle = makeCircle({x: 0, y: 0}, 10);
    let doc = addShapes(initialDoc(), circle);
    doc = addShapes(doc, {
      ...makeRadiusDim({x: 0, y: 0}, {x: 10, y: 0}, {x: 30, y: 20}),
      assocId: circle.id,
    });
    const out = applyOps(doc, setup().view, [
      {kind: 'remove', ids: [circle.id]},
    ]);
    expect(out.doc.shapes).toHaveLength(0);
  });

  test('a view op moves the camera without touching history', () => {
    const doc = initialDoc();
    const moved = makeViewport(400, 800, {scale: 4, centre: {x: 5, y: 5}});
    const out = applyOps(doc, setup().view, [{kind: 'view', view: moved}]);
    expect(out.view).toBe(moved);
    expect(out.changed).toBe(false);
    expect(canUndo(out.doc)).toBe(false);
  });

  test('a selection op is not undoable', () => {
    const doc = addShapes(initialDoc(), makeCircle({x: 0, y: 0}, 5));
    const depth = doc.history.past.length; // one entry, from adding the circle
    const out = applyOps(doc, setup().view, [
      {kind: 'selection', ids: [doc.shapes[0].id]},
    ]);
    expect(out.doc.selection).toEqual([doc.shapes[0].id]);
    expect(out.doc.history.past).toHaveLength(depth);
  });

  test('no ops leaves the document exactly as it was', () => {
    const doc = addShapes(initialDoc(), makeCircle({x: 0, y: 0}, 5));
    const view = setup().view;
    const out = applyOps(doc, view, []);
    expect(out.doc).toBe(doc);
    expect(out.view).toBe(view);
  });
});
