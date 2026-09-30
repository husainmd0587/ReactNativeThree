/**
 * Selection tests.
 *
 * The behaviours pinned here are the ones a user notices immediately when
 * they are wrong: clicking a stacked entity grabbing the wrong one, a window
 * drag silently behaving like a crossing, a locked layer still being editable.
 */

import {
  makeArc,
  makeCircle,
  makeLine,
  makePoint,
  makePolyline,
  makeText,
} from '../engine/geometry';
import {
  addToSelection,
  boxFrom,
  clearSelection,
  expandGroups,
  groupShapes,
  invertSelection,
  nodeVertices,
  pickAt,
  pickStackAt,
  polygonSelect,
  removeFromSelection,
  selectAll,
  selectionBBox,
  selectionGrips,
  toggleSelection,
  windowSelect,
} from '../engine/selection';

const ids = shapes => shapes.map(s => s.id);
const has = (list, shape) => list.includes(shape.id);

describe('clicking picks the nearest ink', () => {
  test('a line is picked within tolerance and missed outside it', () => {
    const line = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    expect(pickAt([line], {x: 50, y: 2}, {tol: 5})?.shape.id).toBe(line.id);
    expect(pickAt([line], {x: 50, y: 2}, {tol: 1})).toBeNull();
  });

  test('picking returns the closest point on the ink, not the tap', () => {
    const line = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const hit = pickAt([line], {x: 40, y: 3}, {tol: 5});
    expect(hit.point).toEqual({x: 40, y: 0});
    expect(hit.distance).toBeCloseTo(3, 9);
  });

  test('the most recently drawn entity wins an exact tie', () => {
    const a = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const b = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    expect(pickAt([a, b], {x: 50, y: 0})?.shape.id).toBe(b.id);
  });

  test('a nearer entity beats an earlier one regardless of order', () => {
    const far = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const near = makeLine({x: 0, y: 4}, {x: 100, y: 4});
    expect(pickAt([far, near], {x: 50, y: 3}, {tol: 6})?.shape.id).toBe(
      near.id,
    );
  });

  test('a point on a line stays grabbable thanks to its tolerance bonus', () => {
    const line = makeLine({x: 0, y: 0}, {x: 100, y: 0});
    const dot = makePoint({x: 50, y: 0});
    // Without the bonus the point would tie with the line and lose by order.
    expect(pickAt([line, dot], {x: 50, y: 0})?.shape.id).toBe(dot.id);
  });

  test('locked, hidden and frozen shapes are never pickable', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    expect(pickAt([{...line, locked: true}], {x: 5, y: 0})).toBeNull();
    expect(pickAt([{...line, hidden: true}], {x: 5, y: 0})).toBeNull();
    expect(pickAt([{...line, frozen: true}], {x: 5, y: 0})).toBeNull();
  });

  test('a locked or invisible layer makes its shapes unpickable', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0}, {layerId: 'L1'});
    const layers = {L1: {locked: true, visible: true}};
    expect(pickAt([line], {x: 5, y: 0}, {layers})).toBeNull();
    expect(
      pickAt([line], {x: 5, y: 0}, {layers: {L1: {visible: false}}}),
    ).toBeNull();
    expect(
      pickAt([line], {x: 5, y: 0}, {layers: {L1: {visible: true}}})?.shape.id,
    ).toBe(line.id);
  });

  test('a shape on an unknown layer is still pickable', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0}, {layerId: 'ghost'});
    expect(pickAt([line], {x: 5, y: 0}, {layers: {other: {}}})?.shape.id).toBe(
      line.id,
    );
  });

  test('repeated clicks at one spot cycle through the stack', () => {
    // The line runs through the top of the circle, so both are grabbable at
    // the same tap, and the line's ink is the closer of the two.
    const a = makeLine({x: 0, y: 10}, {x: 100, y: 10});
    const b = makeCircle({x: 50, y: 0}, 10);
    const stack = pickStackAt([a, b], {x: 55, y: 10}, {tol: 5});
    expect(stack.map(h => h.shape.id).sort()).toEqual([a.id, b.id].sort());
    expect(stack[0].shape.id).toBe(a.id);
  });

  test('tapping the middle of a circle does not grab its ink', () => {
    // The centre is empty space; only a selected circle offers a centre grip.
    const c = makeCircle({x: 50, y: 0}, 10);
    expect(pickAt([c], {x: 50, y: 0}, {tol: 5})).toBeNull();
    expect(pickAt([c], {x: 50, y: 10}, {tol: 5})?.shape.id).toBe(c.id);
  });
});

describe('window selection follows the drag direction', () => {
  const enclosed = makeLine({x: 20, y: 20}, {x: 40, y: 40});
  const clipped = makeLine({x: 20, y: 20}, {x: 200, y: 20});
  const outside = makeLine({x: 300, y: 300}, {x: 400, y: 400});
  const all = [enclosed, clipped, outside];

  test('left to right is a strict window: only fully enclosed ink', () => {
    const got = windowSelect(all, {x: 0, y: 0}, {x: 100, y: 100});
    expect(has(got, enclosed)).toBe(true);
    expect(has(got, clipped)).toBe(false);
    expect(has(got, outside)).toBe(false);
  });

  test('right to left is a crossing: ink the box touches counts', () => {
    const got = windowSelect(all, {x: 100, y: 100}, {x: 0, y: 0});
    expect(has(got, enclosed)).toBe(true);
    expect(has(got, clipped)).toBe(true);
    expect(has(got, outside)).toBe(false);
  });

  test('a crossing still needs the geometry to actually touch the box', () => {
    // Both segments have bounding boxes that overlap the box, yet their ink
    // passes around the top-left and bottom-right corners without entering.
    // A bbox-only crossing test would wrongly report both as selected.
    const a = makeLine({x: -50, y: 90}, {x: 20, y: 150});
    const b = makeLine({x: 90, y: -50}, {x: 150, y: 20});
    const got = windowSelect([a, b], {x: 100, y: 100}, {x: 0, y: 0});
    expect(got).toEqual([]);
  });

  test('a crossing catches a circle the box only clips', () => {
    // Dragged right to left, so this is a crossing. The box corner sits 56.6
    // from the centre, inside this radius, so the ring is cut by the corner
    // without being contained by the box.
    const c = makeCircle({x: 0, y: 0}, 60);
    const got = windowSelect([c], {x: 200, y: 200}, {x: 40, y: 40});
    expect(has(got, c)).toBe(true);
  });

  test('a crossing misses a circle that falls just short of the box', () => {
    // Same crossing box, but a radius of 50 leaves a 6.6 gap to the nearest
    // corner, so nothing is touched.
    const c = makeCircle({x: 0, y: 0}, 50);
    expect(windowSelect([c], {x: 200, y: 200}, {x: 40, y: 40})).toEqual([]);
  });

  test('a crossing ignores a circle the box misses despite bbox overlap', () => {
    // A big circle whose bbox covers the box, but whose ink is nowhere near.
    const c = makeCircle({x: 0, y: 0}, 50);
    const far = windowSelect([c], {x: 200, y: 200}, {x: 400, y: 400});
    expect(far).toEqual([]);
  });

  test('a window accepts a circle that fits entirely inside', () => {
    const c = makeCircle({x: 50, y: 50}, 10);
    const got = windowSelect([c], {x: 0, y: 0}, {x: 100, y: 100});
    expect(has(got, c)).toBe(true);
  });

  test('a window rejects a circle that pokes out of the box', () => {
    const c = makeCircle({x: 50, y: 50}, 60);
    const got = windowSelect([c], {x: 0, y: 0}, {x: 100, y: 100});
    expect(got).toEqual([]);
  });

  test('an arc is judged only over its sweep', () => {
    // Upper half arc: its bbox is the top half of the ring, so it fits a box
    // covering y >= 0, and misses a box that sits low.
    const arc = makeArc({x: 0, y: 0}, {x: 10, y: 0}, {x: -10, y: 0}, true);
    expect(has(windowSelect([arc], {x: -20, y: 0}, {x: 20, y: 20}), arc)).toBe(
      true,
    );
    expect(windowSelect([arc], {x: -20, y: -20}, {x: 20, y: -1})).toEqual([]);
  });

  test('locked shapes are skipped by both drag directions', () => {
    const locked = {...enclosed, locked: true};
    expect(windowSelect([locked], {x: 0, y: 0}, {x: 100, y: 100})).toEqual([]);
    expect(windowSelect([locked], {x: 100, y: 100}, {x: 0, y: 0})).toEqual([]);
  });
});

describe('crossing polygon selection', () => {
  const square = p => [
    {x: p.x, y: p.y},
    {x: p.x + 10, y: p.y},
    {x: p.x + 10, y: p.y + 10},
    {x: p.x, y: p.y + 10},
  ];

  test('a closed lasso catches ink it touches', () => {
    const line = makeLine({x: 0, y: 5}, {x: 20, y: 5});
    const got = polygonSelect([line], square({x: 0, y: 0}));
    expect(has(got, line)).toBe(true);
  });

  test('a lasso ignores ink well outside it', () => {
    const line = makeLine({x: 100, y: 100}, {x: 120, y: 120});
    expect(polygonSelect([line], square({x: 0, y: 0}))).toEqual([]);
  });

  test('a lasso catches a small circle sitting inside it', () => {
    const c = makeCircle({x: 5, y: 5}, 2);
    expect(has(polygonSelect([c], square({x: 0, y: 0})), c)).toBe(true);
  });

  test('a lasso inside a big circle still catches the circle', () => {
    const c = makeCircle({x: 5, y: 5}, 50);
    expect(has(polygonSelect([c], square({x: 0, y: 0})), c)).toBe(true);
  });

  test('a degenerate polygon selects nothing', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    expect(
      polygonSelect(
        [line],
        [
          {x: 0, y: 0},
          {x: 5, y: 5},
        ],
      ),
    ).toEqual([]);
    expect(polygonSelect([line], [])).toEqual([]);
  });
});

describe('selection set algebra', () => {
  const a = makeLine({x: 0, y: 0}, {x: 1, y: 0});
  const b = makeLine({x: 0, y: 1}, {x: 1, y: 1});
  const c = makeLine({x: 0, y: 2}, {x: 1, y: 2});

  test('ids are unique and sorted so identity comparison is meaningful', () => {
    const sel = addToSelection([c.id, a.id], [a.id, b.id]);
    expect(sel).toEqual([a.id, b.id, c.id].sort());
    expect(sel).toEqual(addToSelection([a.id, b.id, c.id], []));
  });

  test('toggling adds then removes', () => {
    let sel = toggleSelection([], [a.id]);
    expect(sel).toEqual([a.id]);
    sel = toggleSelection(sel, [a.id]);
    expect(sel).toEqual([]);
    // A toggle spanning several ids flips each independently.
    expect(toggleSelection([a.id, b.id], [b.id, c.id])).toEqual(
      [a.id, c.id].sort(),
    );
  });

  test('removal and clearing are exact', () => {
    expect(removeFromSelection([a.id, b.id, c.id], [b.id])).toEqual(
      [a.id, c.id].sort(),
    );
    expect(clearSelection()).toEqual([]);
  });

  test('select all skips locked entities', () => {
    const locked = {...b, locked: true};
    const all = selectAll([a, locked, c]);
    expect(all).toEqual([a.id, c.id].sort());
  });

  test('inverting selects exactly what was not selected', () => {
    const all = ids([a, b, c]);
    const inv = invertSelection([a, b, c], [b.id]);
    expect(inv).toEqual([a.id, c.id].sort());
    expect(addToSelection(inv, [b.id]).sort()).toEqual(all.sort());
  });

  test('the selection box covers every selected shape', () => {
    const box = selectionBBox([a, b, c], [a.id, c.id]);
    expect(box).toEqual({minX: 0, minY: 0, maxX: 1, maxY: 2});
    expect(selectionBBox([a, b, c], [])).toBeNull();
  });

  test('boxFrom normalises corner order', () => {
    expect(boxFrom({x: 10, y: 20}, {x: 0, y: 5})).toEqual({
      minX: 0,
      minY: 5,
      maxX: 10,
      maxY: 20,
    });
  });
});

describe('grips and nodes', () => {
  test('grips are reported per shape and carry a position', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const grips = selectionGrips([line], [line.id]);
    expect(grips.length).toBeGreaterThan(0);
    for (const g of grips) expect(g.shapeId).toBe(line.id);
    expect(grips.some(g => g.point.x === 0)).toBe(true);
    expect(grips.some(g => g.point.x === 10)).toBe(true);
  });

  test('a circle exposes centre and quadrant grips', () => {
    const c = makeCircle({x: 5, y: 5}, 10);
    const grips = selectionGrips([c], [c.id]);
    const pts = grips.map(g => g.point);
    expect(pts.some(p => p.x === 5 && p.y === 5)).toBe(true);
    expect(pts.some(p => p.x === 15 && p.y === 5)).toBe(true);
    expect(pts.some(p => p.x === 5 && p.y === 15)).toBe(true);
  });

  test('node editing lists polyline vertices in order', () => {
    const pl = makePolyline([
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 10},
    ]);
    const nodes = nodeVertices([pl], [pl.id]);
    expect(nodes.map(n => n.index)).toEqual([0, 1, 2]);
    expect(nodes[2].atEnd).toBe(true);
    expect(nodes[0].atEnd).toBe(false);
  });

  test('a line exposes its two endpoints and is not node editable', () => {
    const line = makeLine({x: 0, y: 0}, {x: 10, y: 0});
    const nodes = nodeVertices([line], [line.id]);
    expect(nodes).toHaveLength(2);
  });

  test('a circle has no node vertices', () => {
    const c = makeCircle({x: 0, y: 0}, 5);
    expect(nodeVertices([c], [c.id])).toEqual([]);
  });
});

describe('groups behave as one unit', () => {
  const a = makeLine({x: 0, y: 0}, {x: 1, y: 0});
  const b = makeLine({x: 0, y: 1}, {x: 1, y: 1});
  const c = makeLine({x: 0, y: 2}, {x: 1, y: 2});

  test('grouping tags members without disturbing their ids', () => {
    const grouped = groupShapes([a, b, c], [a.id, b.id], 'g1');
    expect(grouped[0].groupId).toBe('g1');
    expect(grouped[0].id).toBe(a.id);
    expect(grouped[2].groupId).toBeUndefined();
  });

  test('picking one member pulls in the whole group', () => {
    const grouped = groupShapes([a, b, c], [a.id, b.id], 'g1');
    expect(expandGroups(grouped, [a.id])).toEqual([a.id, b.id].sort());
    expect(expandGroups(grouped, [c.id])).toEqual([c.id]);
  });
});
