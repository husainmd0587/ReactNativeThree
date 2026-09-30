# CAD Studio — system documentation

A mobile CAD editor for React Native. This document describes the architecture,
the contracts between layers, and the non-obvious constraints that exist because
breaking them produces runtime failures rather than type errors.

Written for an engineer or AI picking this up cold. Read section 3 before
changing anything.

---

## 1. What this is

A touch-first 2D drafting app modelled on AutoCAD's command line. You type a
command name, then answer its prompts either by tapping the canvas or by typing
coordinates. The drawing lives in a document, every edit goes through the
command layer, and the undo stack is populated by the document rather than by
the UI.

- **Not** a 3D modeller. This is 2D drafting: lines, arcs, dimensions, arrays.
- **Not** an extension of the AutoCAD practice module. They share ideas, not
  code. The AutoCAD module at `../AutoCad/` is a separate, working feature and
  must keep working untouched.

---

## 2. Layer map

```
┌──────────────────────────────────────────────────────────────┐
│ UI                                                            │
│   screens/CadStudioScreen.jsx   state, panels, input routing  │
│   components/CadCanvas.jsx      Skia draw + gesture forwarding│
│   screens/CommandReferenceScreen.jsx   generated command help  │
└────────────────────────┬─────────────────────────────────────┘
                         │  ops  (the only way state changes)
┌────────────────────────▼─────────────────────────────────────┐
│ COMMAND LAYER                                                │
│   engine/commands.js        30 command state machines         │
│   engine/commandRunner.js   session, prompts, input parsing   │
│   engine/applyOps.js        ops → document edits (one seam)   │
└────────────────────────┬─────────────────────────────────────┘
                         │  pure function calls
┌────────────────────────▼─────────────────────────────────────┐
│ ENGINE (pure JS, no React, no DOM)                            │
│   vec geometry parse transform corner                         │
│   selection snap tracking dimensions viewport document         │
│   shapeVisuals  (pure data → SVG path strings)                │
└──────────────────────────────────────────────────────────────┘
```

**The load-bearing rule: the engine never imports React, Skia, or the UI, and
the UI never reaches into the engine to mutate state.** Commands return
declarative ops; `applyOps` is the only place ops become edits. If you find
yourself wanting a command to call `setDoc` directly, the answer is a new op
kind, not a shortcut.

---

## 3. Invariants — violating these causes real failures

These are the rules the code actually depends on. They are not stylistic.

### 3.1 Every shape has an id from birth

`makeLine`/`makeCircle`/… assign `id` at construction (`geometry.js:61`).
Minting ids later in `sealShape` was tried and broke: two unsealed shapes both
report `id === undefined`, so every downstream `a.id !== b.id` identity check
treats unrelated shapes as the same entity. That silently disabled _all_
intersection snapping before it was found.

### 3.2 Command steps assign their own answers

A step receives `{answers, input, ctx, session}` and returns either
`{done, ops, ...}` or `{prompt, nextAnswers}`. The runner records **nothing** on
a step's behalf.

`commandRunner.js` deliberately does not pre-record `input` into `answers` before
calling the step. A step must be able to distinguish "this is my first answer"
from "I am already waiting for the next one" — for `LINE` those are identical
shapes of data, and pre-recording made the command terminate after one tap.

This is the single most common way to break a command. Assign the answer
yourself.

### 3.3 The runner has no switch on command names

`commandRunner.js` never names a command. Adding a command means adding one entry
to `COMMANDS` in `commands.js` and nothing else.

### 3.4 One command is one undo step

`applyOps` folds every op over a working `{shapes, selection}` pair and commits
**once** at the end. So a command that removes and creates (MIRROR, TRIM,
FILLET, ARRAY) undoes in a single press. Do not commit inside a loop over ops.

Selection ops and view ops set `changed: false` and therefore create no history
entry.

### 3.5 `selection` ops are not undoable; `add`/`remove`/`map` are

Selecting is not an edit. `doc.selection` is also never serialised into history
as an independent step.

### 3.6 Engine modules are plain functions, except where marked `'worklet'`

Only `gestureTransform` (in `viewport.js`) carries a `'worklet'` directive,
because the canvas calls it from a `useDerivedValue`, which Reanimated runs on
the UI thread. Everything else is a normal function.

### 3.7 Anything a gesture handler calls must be reached with `runOnJS`

Gesture callbacks are worklets. They run on the UI thread and can only touch
shared values or other worklets. A React prop (a `useCallback` handler) lives on
the JS thread and **must** be invoked as `runOnJS(onSomething)(...)`. Calling it
directly throws, at runtime, on the device only:

```
ReanimatedError: Tried to synchronously call a non-worklet function on the UI thread
```

This is not caught by Jest, by the bundler, or by any static check.

---

## 4. Units, coordinates, and the two spaces

- **World space** is millimetres, `{x, y}`, **Y-up**. This is the only space
  geometry and the document live in.
- **Screen space** is device pixels, **Y-down**. Camera transforms flip Y.
- Everything the user perceives as a distance is stored in millimetres. Pixel
  tolerances are converted at the call site via `pxToWorld(view, px)`.

Constants that matter:

| Constant                  | Value      | Where                                     |
| ------------------------- | ---------- | ----------------------------------------- |
| Pick radius               | 10 px      | `PICK_PX`, `CadStudioScreen.jsx:56`       |
| Snap radius               | 14 px      | `SNAP_PX`, `CadStudioScreen.jsx:57`       |
| Grid snap pitch           | 10 mm      | `doc.gridSize` fallback                   |
| Zoom limits               | 0.02 – 400 | `MIN_SCALE`/`MAX_SCALE`, `viewport.js:23` |
| History depth             | 100        | `HISTORY_LIMIT`, `document.js`            |
| Intersection snap ceiling | 260 shapes | `INTERSECTION_CEILING`, `snap.js:96`      |

`shapesBBox([])` deliberately returns `{minX: 0, minY: 0, maxX: 100, maxY: 100}`
so that zooming to an empty document lands somewhere sane instead of dividing by
zero.

---

## 5. Shape data model

Plain objects, always with `type`, `id`, `points`, and (once in the document)
`layerId`.

| `type`      | `points`                       | Extra fields                              |
| ----------- | ------------------------------ | ----------------------------------------- |
| `line`      | `[a, b]`                       | —                                         |
| `polyline`  | `[…]`                          | `closed`, `width`                         |
| `spline`    | `[…]`                          | `closed` (Catmull-Rom through the points) |
| `circle`    | `[center]`                     | `radius`                                  |
| `arc`       | `[center, start, end]`         | `ccw` (default `true`)                    |
| `ellipse`   | `[center, majorEnd, minorEnd]` | —                                         |
| `point`     | `[p]`                          | —                                         |
| `text`      | `[p]`                          | `text`, `height` (5 mm), `rotation`       |
| `dimension` | `[p1, p2, defPoint]`           | `dimType`, `assocId`                      |

`assocId` links a dimension to the shape it measures. `applyOps` drops orphaned
dimensions and re-points the rest after every command — deleting a circle
deletes its diameter dimension, automatically.

---

## 6. Document model

`initialDoc()` (`document.js:32`):

```js
{
  shapes: [],                          // the drawing
  layers: {'0': makeLayer('0', '0')},   // id → {visible, locked, frozen, color, …}
  currentLayer: '0',
  nextLayerNumber: 1,
  selection: [],                       // sorted, unique ids
  osnap: {...DEFAULT_OSNAP, on: true},
  ortho: false, polar: false,
  grid: true, gridSnap: false,
  history: {past: [], future: []},     // {shapes, selection, label}
}
```

Key functions:

| Function                                                         | Purpose                                        |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| `addShapes` / `removeShapes` / `replaceShapes`                   | shape-list edits, each one undoable            |
| `commitShapes(doc, shapes, opts)`                                | wrap a multi-shape change as **one** undo step |
| `mapShapes(doc, ids, fn, opts)`                                  | transform shapes in place, one undo step       |
| `setSelection` / `selectMore` / `clearSel`                       | selection, **not** undoable                    |
| `addLayer` / `patchLayer` / `removeLayer` / `layerTable`         | layer management                               |
| `setOrtho` / `setPolar` / `setGrid` / `setGridSnap` / `setOsnap` | mode flags                                     |
| `undo` / `redo` / `canUndo` / `canRedo` / `undoLabel`            | history                                        |
| `visibleShapes(doc)`                                             | respects layer visible/locked/frozen           |
| `serialiseDoc` / `deserialiseDoc`                                | AsyncStorage round-trip                        |
| `docExtents(doc)`                                                | bounding box for zoom-to-extents               |

`undoLabel` exists purely so the UI can say what Undo will revert. Cheap, and it
makes a long session much less disorienting.

---

## 7. The command system

### 7.1 Shape of a command

```js
cmd(name, aliases, prompts, step);
```

Declared with the small builders in `commands.js:78`:
`P()` point, `N()` number, `D()` distance, `A()` angle, `S()` selection,
`T()` text, `YESNO()` confirm.

A step returns one of:

| Return                                         | Meaning                                                     |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `{done: true, ops}`                            | finished                                                    |
| `{done: true, ops, repeat: true, nextAnswers}` | finished, but keep running from `nextAnswers` (LINE, PLINE) |
| `{prompt, nextAnswers}`                        | ask again                                                   |
| `{done: true, ops, message}`                   | finished, with a status message                             |

`skipped(input)` (`input == null || input === ''`) is how "user pressed Enter" is
spotted. Use it for every optional prompt.

### 7.2 The 30 commands

| Command         | Aliases                         | Purpose                                                                        |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `LINE`          | `L`                             | chain of segments, repeats from the last point                                 |
| `PLINE`         | `PL` `POLYLINE`                 | multi-point polyline; collects until `C` (close), `U` (undo a point), or Enter |
| `CIRCLE`        | `C`                             | centre + radius                                                                |
| `ARC`           | `A`                             | 3-point arc                                                                    |
| `RECTANG`       | `REC` `RECT`                    | two corners                                                                    |
| `TEXT`          | `T` `DT`                        | point + string + height                                                        |
| `ERASE`         | `E` `DEL`                       | remove selection                                                               |
| `MOVE`          | `M`                             | base + destination                                                             |
| `COPY`          | `CP` `CO`                       | base + destination                                                             |
| `ROTATE`        | `RO`                            | base + angle                                                                   |
| `SCALE`         | `SC`                            | base + factor                                                                  |
| `MIRROR`        | `MI`                            | axis, optional delete-original                                                 |
| `JOIN`          | `J`                             | merge collinear runs                                                           |
| `TRIM`          | `TR`                            | cut with a cutting edge                                                        |
| `FILLET`        | `F`                             | round a corner (CHAMFER shares the code path)                                  |
| `EXPLODE`       | `X`                             | polyline/spline → lines + arcs                                                 |
| `BREAK`         | `BR`                            | split at a point                                                               |
| `OFFSET`        | `O`                             | parallel copy at a distance                                                    |
| `ARRAYRECT`     | `AR`                            | rows × cols rectangular array                                                  |
| `ARRAYPOLAR`    | `AP`                            | polar array about a centre                                                     |
| `DIMLINEAR`     | `DIMALIGNED` `DALI` `DAL` `DLI` | aligned/linear dimension                                                       |
| `DIMHORIZONTAL` | `DIMH` `DH`                     | horizontal dimension                                                           |
| `DIMVERTICAL`   | `DIMV` `DV`                     | vertical dimension                                                             |
| `DIMANGULAR`    | `DAN`                           | angular dimension                                                              |
| `DIMRADIUS`     | `DRA` `DIMRAD`                  | radius dimension                                                               |
| `DIMDIAMETER`   | `DDI` `DIMDIA`                  | diameter dimension                                                             |
| `ZOOMEXTENTS`   | `ZE`                            | fit the drawing (asks nothing)                                                 |
| `SELECTALL`     | `SA`                            | (asks nothing)                                                                 |
| `UNSELECT`      | `US`                            | clear selection                                                                |
| `LIST`          | `LI` `LS`                       | report selection as a message                                                  |

A command with an **empty `prompts` array runs its step immediately** in
`startCommand`, so the UI never has to invent an input to get a result.

### 7.3 The op vocabulary

The entire language the UI understands. Declared in the header of
`commands.js:1` and implemented in `applyOps.js:30`.

| Op            | Fields                    | Effect                                                             |
| ------------- | ------------------------- | ------------------------------------------------------------------ |
| `add`         | `shapes, select?, label?` | append shapes; `select: false` adds without stealing the selection |
| `remove`      | `ids, label?`             | remove by id                                                       |
| `map`         | `ids, fn, label?`         | `fn: shape → shape`, in place                                      |
| `replacePair` | `remove, shapes, select?` | swap a set of ids for new shapes (TRIM, FILLET)                    |
| `setShapes`   | `shapes, select?, label?` | replace the whole shape list (JOIN, EXPLODE)                       |
| `selection`   | `ids`                     | selection only, not undoable                                       |
| `view`        | `view`                    | camera only, not undoable                                          |

Ops fold in order, so a later op sees what an earlier one produced.

### 7.4 The runner

```js
let s = startCommand('LINE', ctx).session;
let s2 = feedCommand(s, {x: 0, y: 0}, ctx); // asks for the next point
let r = feedCommand(s2, {x: 50, y: 0}, ctx); // r.ops holds the line
```

- `startCommand(name, ctx, answers?)` → `{session, ops, message}`
- `feedCommand(session, input, ctx)` → `{session, ops, message}`
- `parseInput(text, prompt, ctx)` → typed answer, or `null`
- `currentPrompt(session)`, `isActive(session)`, `cancelCommand()`
- `newSession(command, answers?)`

`ctx` is built by the screen (`CadStudioScreen.jsx:130`):

```js
{
  doc, view, from, allIds, pickTol;
}
```

`parseInput` handles the AutoCAD conveniences:

- `ALL` at a selection prompt → every pickable id.
- `W` / `C` at a selection prompt → `{dragMode}`, which asks the canvas for a
  window or crossing drag.
- A **bare number at a point prompt** is a distance from the previous point along
  the current rubber-band direction. Resolving this in `parseInput` keeps every
  command working with plain absolute points.

A step that throws is caught by `feedCommand`; the session ends with a message
rather than wedging the command line with no way back to a prompt.

---

## 8. Engine reference

| Module             | Owns                                                      | Notable exports                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vec.js`           | 2D vector maths, angles                                   | `pt` `add` `sub` `dist` `norm` `perp` `fromAngle` `angleTo` `norm360` `angleDeltaDeg` `lerp` `mid` `clamp` `samePt`                                                                                                                              |
| `parse.js`         | text → numbers/points, units                              | `UNITS` `toMm` `parseNumber` `parseAngle` `parsePoint` `parseDistance` `parseFactor` `looksLikePoint` `tokenize` `splitCommand` `fmtDeg`                                                                                                         |
| `geometry.js`      | shape constructors, arcs, bounds, intersections, distance | `make*` `sealShape` `arcFrom3Points` `segmentsOf` `shapeBBox` `shapesBBox` `distToShape` `closestOnShape` `pointInShape` `measure` `gripsOf` `moveGrip` `transformShape` `offsetPolyline` `catmullRom`                                           |
| `transform.js`     | edit operations producing new shapes                      | `copyShapes` `rotateMany` `scaleAbout` `mirrorWithDelete` `offsetShape` `rectangularArray(shape, cellX, cellY, rows, cols)` `polarArray(shape, center, count, includedDeg = null)` `joinCollinear(shapes, tol = 0.6)` `explodeShape` `breakLine` |
| `corner.js`        | run-based editing                                         | `runsOf` `nearestRun` `cornerFrame` `filletCorner` `chamferCorner` `trimRun` `crossingsWithShape` `extendRun` `applyRunEdits` `findCornerVertex`                                                                                                 |
| `selection.js`     | picking, windows, grips, selection algebra                | `pickAt` `pickStackAt` `windowSelect(shapes, a, b, opts)` `polygonSelect` `normaliseIds` `addToSelection` `toggleSelection` `selectAll` `invertSelection` `selectionGrips` `gripAt` `nodeVertices` `nodeAt` `groupShapes` `expandGroups`         |
| `snap.js`          | object snap                                               | `SNAP_KINDS` `SNAP_LABELS` `DEFAULT_OSNAP` `findSnap` `snapReadout`                                                                                                                                                                              |
| `tracking.js`      | ORTHO / POLAR / GRID / dynamic input                      | `trackPoint(from, raw, opts)` `POLAR_INCREMENTS` `dynamicInput` `coordsLabel` `deltaLabel` `fmtDist` `fmtAngle`                                                                                                                                  |
| `dimensions.js`    | dimension maths and builders                              | `DIM_TYPES` `makeAlignedDim` `makeHorizontalDim` `makeVerticalDim` `makeAngularDim` `makeRadiusDim` `makeDiameterDim` `dimensionForShape` `updateDimension` `measuredValue` `dimensionText` `labelPosition` `arrowheads` `tickMarks`             |
| `viewport.js`      | camera                                                    | `makeViewport` `toScreen` `toWorld` `zoomAtScreen` `zoomToFit` `visibleWorldBox` `gridLines` `gridStep` `pxToWorld` `worldToPx` `gestureTransform`                                                                                               |
| `document.js`      | document, layers, history, persistence                    | see section 6                                                                                                                                                                                                                                    |
| `shapeVisuals.js`  | shape + furniture → SVG path strings                      | `shapeVisuals` `gripVisuals` `boxVisuals` `axisVisuals` `labelScreenExtent`                                                                                                                                                                      |
| `applyOps.js`      | the op → edit seam                                        | `applyOps(doc, view, ops)`                                                                                                                                                                                                                       |
| `commandRunner.js` | session and input parsing                                 | see 7.4                                                                                                                                                                                                                                          |
| `commands.js`      | the registry                                              | `COMMANDS` `PROMPT` `findCommand` `commandNames` `suggestCommands`                                                                                                                                                                               |

### 8.1 `windowSelect` drag direction

The one AutoCAD behaviour people rely on without thinking (`selection.js:233`):

- **left → right**: strict window. Anything the box merely clips is ignored.
- **right → left**: crossing. Anything the box touches is caught.

### 8.2 OSNAP

Ten kinds, with a priority order that decides ties (`snap.js:38`) — lower index
wins, mirroring AutoCAD's marker hierarchy:

`endpoint`(0) `intersection`(1) `node`(2) `midpoint`(3) `quadrant`(4)
`center`(5) `perpendicular`(6) `tangent`(7) `insert`(8) `nearest`(9)

On by default: everything except `tangent` and `nearest`.

`findSnap(raw, shapes, opts)` → `{kind, point, label, …}` or `null`.
`SNAP_KINDS` also covers the three non-object snaps: `grid`, `ortho`, `polar`.

---

## 9. Rendering pipeline

There is no retained scene graph. A shape becomes SVG path **strings**, handed
to Skia, which parses them natively.

```
shape ──shapeVisuals()──> {paths: string[], texts: [{x, y, text, size, colour}], colour, width}
                                                     │
                                     <Path path={…} style="stroke" strokeWidth={…} />
```

- `shapeVisuals.js` is plain JS, not a worklet. Rebuilding a few hundred path
  strings when the document changes is cheaper than keeping a second copy of the
  drawing in shared values and keeping the two in step.
- Pan/zoom is the exception and does **not** re-run the path builder — see 10.2.
- `project()` clamps non-finite coordinates to `0` rather than throwing mid-render
  and blanking the canvas. One bad point should cost a dot in the wrong place,
  not the whole drawing.
- Grid, axes, selection grips, rubber band and snap marker are separate props,
  not shapes.

---

## 10. Gestures

`CadCanvas` forwards raw gestures and **makes no decisions about what they mean**.
What a tap or drag does depends on whether a command is running, and only the
screen can see the document, the session and the keyboard at once.

### 10.1 Composition

```
Simultaneous(
  pan   (Pan, minPointers 2),
  zoom  (Pinch),
  drag  (Pan, maxPointers 1, minDistance 4),
  Exclusive(longPress (420 ms), tap (maxDuration 260 ms)),
)
```

One finger draws or selects. Two fingers pan and zoom. This split is deliberate
and is the interaction decision the whole UI is built around.

### 10.2 Live pan/zoom, and the three Skia/Reanimated traps

The committed camera is React state. During a gesture the ink must move at
60 Hz, so deltas live in shared values and are applied as a `Group` transform.
Getting this right took three attempts; all three failures are device-only.

**Trap 1 — shared values inside a `transform` array.**
`transform={[{translateX: tx}, …]}` fails with
`Expected number, we got object`. Skia's `extractReanimatedProps` unwraps a
shared value **only when the prop itself is the shared value**. An array whose
entries contain shared values passes straight through to `processTransform3d`,
which does raw arithmetic and hands a shared value object to a numeric slot.
The whole transform must travel as one value, already flattened to numbers:

```js
const transform = useDerivedValue(() =>
  gestureTransform(tx.value, ty.value, focalX.value, focalY.value, pinch.value),
);
<Group transform={transform}>
```

**Trap 2 — a non-worklet called from the UI thread.**
`useDerivedValue` bodies run on the UI thread. `gestureTransform` is defined in
`viewport.js`, a plain module, so Reanimated refused to call it:

```
Tried to synchronously call a non-worklet function `gestureTransform` on the UI thread
```

Fixed with a `'worklet'` directive as the first statement of the function. It
remains an ordinary function everywhere else, which is how the tests reach it.

**Trap 3 — calling a React prop from a worklet.**
Gesture callbacks are worklets. `onDragStart` and friends live on the JS thread:

```js
.onStart(e => onDragStart && onDragStart({x, y}))          // throws
.onStart(e => onDragStart && runOnJS(onDragStart)({x, y})) // correct
```

**Ordering of the transform entries is also load-bearing.** The focal point must
be translated _to_ the origin, scaled, then translated _back_:

```
{translateX: dx} {translateY: dy}
{translateX: -focalX} {translateY: -focalY}
{scale: factor}
{translateX: focalX} {translateY: focalY}
```

The opposite order compiles, runs, and silently scales about the wrong point, so
the ink flings off screen on every pinch. `viewport.test.js` asserts the focal
pixel stays put.

### 10.3 Settling

On gesture end, the canvas does not re-derive the camera from deltas. It pins
the world point under the focal pixel and asks which camera puts that same point
under that same pixel afterwards. One rule covers a drag, a pinch, and both at
once — which is why there is no per-gesture case. `clampScale` keeps the result
inside `MIN_SCALE`/`MAX_SCALE`.

---

## 11. Input routing in the screen

`resolve(screenPixel)` is the single funnel from a touch to a world point
(`CadStudioScreen.jsx:176`):

1. `toWorld(view, pixel)`
2. `findSnap(...)` — if it hits, that point wins outright
3. otherwise `trackPoint(from, raw, {ortho, polar, gridSize, gridSnap, snap: null})`
4. caches the result in `snap`/`cursor` state for the status bar and snap marker

Then, depending on state:

| Situation                       | Behaviour                                                 |
| ------------------------------- | --------------------------------------------------------- |
| Command running, tap            | feed the point to the command, set `from`                 |
| Command running, drag           | rubber-band preview, then feed the end point              |
| No command, tap                 | pick at the point; hit → select, miss → clear             |
| No command, drag                | window select (direction decides window vs crossing, 8.1) |
| Long press                      | select under the finger                                   |
| Text committed, command running | `parseInput` → feed to the prompt                         |
| Text committed, no command      | the text _is_ the command name                            |

`fromRef` holds the last accepted point (the command's "from"), and is the basis
for relative entry and for bare-number entry.

---

## 12. UI

`CadStudioScreen.jsx` — 651 lines, all state local.

State: `doc`, `view`, `session`, `message`, `typed`, `snap`, `band`, `panel`,
`layout`, `rubber`, `cursor`. Refs: `inputRef`, `fromRef`, `dragRef`.

| Region       | Contents                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- |
| Canvas       | `CadCanvas`, sized from `onLayout`                                                            |
| Status       | command message + coordinate / ΔX ΔY readout                                                  |
| Command line | text input, prompt marker (`›` running, `⌘` idle), autocomplete from `suggestCommands(typed)` |
| Toolbar      | Undo, Redo, Extents, Deselect, OSNAP, Layers                                                  |
| Toggles      | ORTHO, POLAR, GRID, SNAP                                                                      |
| OSNAP panel  | one `Toggle` per `SNAP_KINDS` entry                                                           |
| Layers panel | per-layer visible/lock/freeze state + "+ New"                                                 |

Undo/Redo are disabled from `canUndo(doc)`/`canRedo(doc)`. The OSNAP and Layers
tools show a `●` when their panel is open.

`CommandReferenceScreen.jsx` generates its content from the `COMMANDS` registry,
so a new command documents itself.

---

## 13. Persistence

AsyncStorage, key `cadstudio/doc/v1`, `STORAGE_KEY` in `CadStudioScreen.jsx:55`.

- Loaded once on mount. A missing or corrupt payload leaves the empty document
  in place rather than blocking the screen.
- Saved 400 ms after the drawing settles — a single command can produce several
  commits and the screen is not worth a write per frame.
- Serialised with `serialiseDoc`, which drops history.

---

## 14. Navigation

Registered in `src/navigation/MainStack.js` in three places:

- import (line 30)
- simulator tile, `route: 'CadStudio'` (line 559)
- `<Stack.Screen name="CadStudio" component={CadStudio} />` (line 905)

`CadStudio/index.js` is its own native stack with two screens: `CadStudioDrawing`
and `CadStudioReference`. A separate navigator from the AutoCAD module is
deliberate — nesting them would make every studio screen carry the practice
flow's navigation state.

---

## 15. Tests

```bash
npx jest src/mechanical_engineering/Edand3D/customScreens/CadStudio
```

**283 tests, 7 suites, all passing.** No renderer is mocked, because no engine
test imports a component — the engine is pure, so it is tested directly.

| Suite                 | Tests | Covers                                                                                                                                                                                                  |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.test.js`      | 30    | `parse` (AutoCAD coordinate grammar) and `geometry`: projections, intersections, arcs, transforms preserving measurements, areas, flattening, splines                                                   |
| `engine2.test.js`     | 73    | `findSnap`, `trackPoint`, `filletCorner`, `chamferCorner`, `trimRun`, `extendRun`, `nearestRun`, `offsetShape`, `joinCollinear`, `breakLine`, `explodeShape`, arrays, transforms, geometry cross-checks |
| `selection.test.js`   | 39    | nearest-ink picking, window direction, crossing polygons, selection algebra, grips and nodes, groups                                                                                                    |
| `viewport.test.js`    | 34    | world↔screen round-trips, panning, anchored zoom, zoom-to-fit, visible box, grid steps, pixel tolerances, **gestureTransform**                                                                          |
| `regressions.test.js` | 31    | named past bugs, each with a note on what broke                                                                                                                                                         |
| `visuals.test.js`     | 21    | projection, every shape type → drawable path, labels, selection furniture                                                                                                                               |
| `app.test.js`         | 50    | dimension values, document/layers/history, the command line, ops becoming edits, undo semantics                                                                                                         |

Two rules for writing new tests here:

- **Engine tests import engine modules only.** If a test needs Skia or Reanimated,
  the design is wrong — move the logic into the engine, where it is testable
  without mocks.
- **A bug fix gets a regression test** with a comment saying what broke. Several
  entries in `regressions.test.js` exist solely to keep fixed bugs fixed.

What tests cannot catch, and must be checked on a device: Skia/Reanimated
interop (section 10.2), gesture feel, and font loading.

---

## 16. Known gaps

Not yet built. Present so the next person does not go looking for them.

- **Grip and node editing is not wired to the UI.** `gripsOf`, `moveGrip`,
  `gripAt`, `nodeVertices` and `nodeAt` all exist and are tested; `selectionGrips`
  feeds the canvas, so the handles are _drawn_. But nothing routes a one-finger
  drag starting on a grip into `moveGrip` — such a drag still performs a window
  select or feeds the running command. This is the biggest functional gap.
- **No context menu on long press.** `onLongPress` only selects.
- **No `CHAMFER` command.** `chamferCorner` exists in `corner.js` and is
  engine-tested in `engine2.test.js`, but no command exposes it; FILLET shares
  its code path.
- **`CommandReferenceScreen` has no entry point in the UI.** The route exists in
  `index.js` but nothing navigates to it.
- **Groups are engine-only.** `groupShapes`/`ungroupShapes` have no command.
- **Typed `W`/`C` at a selection prompt** produces `{dragMode}` from
  `parseInput`, but no command step consumes it; only canvas drags work.

---

## 17. Where to make changes

| Task                       | File                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Add a command              | `engine/commands.js` — one `cmd(...)` entry. Nothing else.                                    |
| Add an op kind             | `engine/applyOps.js` (`fold`) + the header comment in `commands.js`                           |
| New shape type             | `geometry.js` (`make*`, `shapeBBox`, `distToShape`, `gripsOf`, `measure`) + `shapeVisuals.js` |
| Change snapping            | `engine/snap.js` — add to `SNAP_KINDS`, `PRIORITY`, `DEFAULT_OSNAP`                           |
| Change dimension rendering | `engine/dimensions.js`                                                                        |
| Change what ink looks like | `engine/shapeVisuals.js`                                                                      |
| New toolbar control        | `screens/CadStudioScreen.jsx`                                                                 |
| Change gestures            | `components/CadCanvas.jsx` — see 10.2 before touching it                                      |
| Persistence format         | `engine/document.js` + bump `STORAGE_KEY`                                                     |

---

## 18. Running it

```bash
# Metro on 8082 — pass the flag to the CLI, not to npm, or npm eats it:
#   npm start --port 8082  ->  "react-native start 8082" (port ignored, binds 8081)
npx react-native start --port 8082
```

Verify a change without a device by asking Metro for the bundle:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8082/index.bundle?platform=android&dev=true&minify=false"
```

HTTP 200 means the graph resolves. It does **not** mean the screen renders —
that only happens on a device.

Prettier is the formatter. ESLint is unavailable in this repo (no config).
