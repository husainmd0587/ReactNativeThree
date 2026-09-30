import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CadCanvas from '../components/CadCanvas';
import {
  addLayer,
  canRedo,
  canUndo,
  clearSel,
  deserialiseDoc,
  initialDoc,
  layerTable,
  patchLayer,
  redo,
  serialiseDoc,
  setCurrentLayer,
  setGrid,
  setGridSnap,
  setOrtho,
  setPolar,
  toggleOsnapKind,
  undo,
  visibleShapes,
} from '../engine/document';
import {applyOps} from '../engine/applyOps';
import {
  currentPrompt,
  feedCommand,
  parseInput,
  startCommand,
} from '../engine/commandRunner';
import {suggestCommands} from '../engine/commands';
import {findSnap, SNAP_KINDS, snapReadout} from '../engine/snap';
import {trackPoint} from '../engine/tracking';
import {
  addToSelection,
  pickAt,
  selectionGrips,
  windowSelect,
} from '../engine/selection';
import {makeViewport, pxToWorld, toWorld, zoomToFit} from '../engine/viewport';
import {shapesBBox} from '../engine/geometry';
import {coordsLabel, fmtAngle, fmtDist} from '../engine/tracking';
import {sub} from '../engine/vec';
import {dimensionText} from '../engine/dimensions';

const STORAGE_KEY = 'cadstudio/doc/v1';
const PICK_PX = 10;
const SNAP_PX = 14;

/**
 * CAD Studio.
 *
 * This screen owns every decision about what a gesture means. The canvas draws
 * and forwards raw pointers; the engine modules are pure; the only stateful
 * piece is the document. Keeping the interpretation in one place is what makes
 * the same tap work as "pick an object", "place the next point of a line" and
 * "start a window" depending on what is already in progress.
 *
 * The command line is the spine: every interaction ends in either a selection
 * change or a call to the command runner, so the buttons, the keyboard and the
 * canvas all drive exactly the same code path.
 */
export default function CadStudioScreen() {
  const [doc, setDoc] = useState(initialDoc);
  const [view, setView] = useState(() => makeViewport(360, 480, {scale: 3}));
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState('Pick a command, or tap to select.');
  const [typed, setTyped] = useState('');
  const [snap, setSnap] = useState(null);
  const [band, setBand] = useState(null);
  const [panel, setPanel] = useState(null);
  const [layout, setLayout] = useState({width: 360, height: 480});
  const [rubber, setRubber] = useState(null);
  // The point under the finger, kept in state so the status line can render
  // it; a ref would not trigger a re-render.
  const [cursor, setCursor] = useState(null);

  const inputRef = useRef(null);
  // Where the last point came from, for ORTHO, POLAR and relative input.
  const fromRef = useRef(null);
  const dragRef = useRef(null);

  const prompt = currentPrompt(session);
  const drawing = visibleShapes(doc);
  const picks = selectionGrips(doc.shapes, doc.selection, {
    tol: pxToWorld(view, PICK_PX),
  });

  // Keep the camera the right size for whatever the layout gives us.
  useEffect(() => {
    setView(v => ({...v, width: layout.width, height: layout.height}));
  }, [layout.width, layout.height]);

  // Load whatever was last drawn. A bad or absent payload leaves the empty
  // document in place rather than blocking the screen.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!alive || !raw) return;
        setDoc(deserialiseDoc(JSON.parse(raw)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Save after the drawing settles. Debounced because a single command can
  // produce several commits, and the screen is not worth a write per frame.
  useEffect(() => {
    const t = setTimeout(() => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serialiseDoc(doc)),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [doc]);

  const ctx = useCallback(
    () => ({
      doc,
      view,
      from: fromRef.current,
      allIds: doc.shapes.filter(s => !s.hidden).map(s => s.id),
      pickTol: pxToWorld(view, PICK_PX),
    }),
    [doc, view],
  );

  /** Run one input through the command, then apply whatever it produced. */
  const submitInput = useCallback(
    input => {
      if (session) {
        const r = feedCommand(session, input, ctx());
        setSession(r.session);
        if (r.message) setMessage(r.message);
        if (r.ops.length) {
          const out = applyOps(doc, view, r.ops);
          setDoc(out.doc);
          setView(out.view);
        }
        return;
      }

      // No command running: the text is a command name.
      const name = String(input).trim();
      if (!name) return;
      const start = startCommand(name, ctx());
      setSession(start.session);
      if (start.message) {
        setMessage(start.message);
        return;
      }
      if (start.ops.length) {
        const out = applyOps(doc, view, start.ops);
        setDoc(out.doc);
        setView(out.view);
      }
      setMessage(start.session ? promptText(start.session) : `${name}: done.`);
    },
    [ctx, doc, session, view],
  );

  /** Resolve a screen pixel into the point a command should receive. */
  const resolve = useCallback(
    screen => {
      const raw = toWorld(view, screen);
      const found = findSnap(raw, drawing, {
        osnap: doc.osnap,
        radius: pxToWorld(view, SNAP_PX),
        from: fromRef.current,
        ignoreIds: new Set(doc.selection),
      });
      setSnap(found);
      if (found) {
        const snapPoint = {x: found.x, y: found.y};
        setCursor(snapPoint);
        return snapPoint;
      }

      const tracked = trackPoint(fromRef.current, raw, {
        ortho: doc.ortho,
        polar: doc.polar,
        gridSize: doc.gridSize ?? 10,
        gridSnap: doc.gridSnap,
        snap: null,
      });
      setCursor(tracked.point);
      return tracked.point;
    },
    [
      view,
      drawing,
      doc.osnap,
      doc.ortho,
      doc.polar,
      doc.gridSnap,
      doc.gridSize,
      doc.selection,
    ],
  );

  const onTap = useCallback(
    screen => {
      const world = resolve(screen);
      if (session) {
        fromRef.current = world;
        submitInput(world);
        return;
      }
      // Nothing running: this is a pick.
      const hit = pickAt(drawing, world, {
        tol: pxToWorld(view, PICK_PX),
        layers: doc.layers,
      });
      if (hit) {
        setDoc(d => ({...d, selection: addToSelection(d.selection, [hit])}));
        setMessage(describe(hit));
        return;
      }
      setDoc(d => clearSel(d));
      setMessage('Nothing there. Tap a command to start drawing.');
    },
    [resolve, session, submitInput, drawing, view, doc.layers],
  );

  const onLongPress = useCallback(
    screen => {
      const world = resolve(screen);
      const hit = pickAt(drawing, world, {
        tol: pxToWorld(view, PICK_PX),
        layers: doc.layers,
      });
      if (hit)
        setDoc(d => ({...d, selection: addToSelection(d.selection, [hit])}));
    },
    [resolve, drawing, view, doc.layers],
  );

  /**
   * One finger means different things in different states, and this is the
   * only place that decides which.
   */
  const onDragStart = useCallback(
    screen => {
      const world = resolve(screen);
      if (session) {
        // Dragging out a command's next point: the rubber band previews it.
        dragRef.current = {mode: 'point', start: world};
        setRubber({minX: world.x, maxX: world.x, minY: world.y, maxY: world.y});
        return;
      }
      dragRef.current = {mode: 'window', start: world};
      setBand(null);
    },
    [resolve, session],
  );

  const onDragUpdate = useCallback(
    screen => {
      const drag = dragRef.current;
      if (!drag) return;
      const world = resolve(screen);
      if (drag.mode === 'point') {
        setRubber({
          minX: Math.min(drag.start.x, world.x),
          maxX: Math.max(drag.start.x, world.x),
          minY: Math.min(drag.start.y, world.y),
          maxY: Math.max(drag.start.y, world.y),
        });
        return;
      }
      setBand({
        minX: Math.min(drag.start.x, world.x),
        maxX: Math.max(drag.start.x, world.x),
        minY: Math.min(drag.start.y, world.y),
        maxY: Math.max(drag.start.y, world.y),
      });
    },
    [resolve],
  );

  const onDragEnd = useCallback(
    screen => {
      const drag = dragRef.current;
      dragRef.current = null;
      const world = resolve(screen);
      setRubber(null);
      setBand(null);
      if (!drag) return;

      if (drag.mode === 'point') {
        fromRef.current = world;
        submitInput(world);
        return;
      }
      // A window: left to right selects only what is fully inside, right to
      // left also catches what it crosses.
      const ids = windowSelect(drawing, drag.start, world, {
        layers: doc.layers,
        tol: pxToWorld(view, PICK_PX),
      });
      setDoc(d => ({...d, selection: ids}));
      setMessage(
        ids.length
          ? `${ids.length} object(s) selected.`
          : 'Nothing in that window.',
      );
    },
    [resolve, submitInput, drawing, view, doc.layers],
  );

  const onCommitText = useCallback(() => {
    const value = typed;
    setTyped('');
    Keyboard.dismiss();
    if (!value.trim()) return;
    // With a command waiting for a point, typed coordinates feed that prompt;
    // otherwise the text is the command itself.
    if (session) {
      const parsed = parseInput(value, prompt, {
        from: fromRef.current,
        allIds: doc.shapes.map(s => s.id),
      });
      if (parsed == null) {
        setMessage(`Cannot read "${value}".`);
        return;
      }
      fromRef.current =
        typeof parsed === 'object' && parsed.x != null
          ? parsed
          : fromRef.current;
      submitInput(parsed);
      return;
    }
    submitInput(value);
  }, [typed, session, prompt, doc.shapes, submitInput]);

  const zoomExtents = useCallback(() => {
    if (!doc.shapes.length) {
      setMessage('Nothing to zoom to.');
      return;
    }
    setView(v => zoomToFit(v, shapesBBox(doc.shapes)));
  }, [doc.shapes]);

  const hints = useMemo(() => suggestCommands(typed), [typed]);
  // Layers come back keyed by id; numeric order keeps layer 0 at the front,
  // which is how every CAD layer list is read.
  const layers = useMemo(
    () =>
      Object.values(layerTable(doc)).sort(
        (a, b) => Number(a.id) - Number(b.id),
      ),
    [doc],
  );
  const readout = snapReadout(snap);

  // AutoCAD's dynamic input: distance and angle are measured from the last
  // placed point, and both are blank until there is one to measure from.
  const offset =
    fromRef.current && cursor ? sub(cursor, fromRef.current) : null;
  const distance = offset ? fmtDist(Math.hypot(offset.x, offset.y)) : '';
  const bearing = offset
    ? fmtAngle((Math.atan2(offset.y, offset.x) * 180) / Math.PI)
    : '';

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={e => setLayout(e.nativeEvent.layout)}>
        <CadCanvas
          width={layout.width}
          height={layout.height}
          view={view}
          shapes={drawing}
          selection={doc.selection}
          grips={picks.length ? picks : []}
          snapMarker={snap ? {x: snap.x, y: snap.y} : null}
          rubberBand={rubber || band}
          showGrid={doc.grid}
          onTap={onTap}
          onLongPress={onLongPress}
          onDragStart={onDragStart}
          onDragUpdate={onDragUpdate}
          onDragEnd={onDragEnd}
          onCamera={setView}
        />

        <View style={styles.status} pointerEvents="none">
          <Text style={styles.statusText}>{message}</Text>
          <Text style={styles.statusSub}>
            {readout ? `${readout}   ` : ''}
            {coordsLabel(cursor, 2)}
            {offset ? `   d ${distance}   ${bearing}°` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.commandBar}>
        {hints.length ? (
          <View style={styles.hints}>
            {hints.map(h => (
              <Pressable
                key={h}
                onPress={() => {
                  setTyped(`${h} `);
                  inputRef.current?.focus();
                }}
                style={styles.hint}>
                <Text style={styles.hintText}>{h}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <Text style={styles.promptMark}>{session ? '›' : '⌘'}</Text>
          <TextInput
            ref={inputRef}
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={onCommitText}
            placeholder={
              session ? promptText(session) : 'Type a command, e.g. LINE'
            }
            placeholderTextColor="#5c6b80"
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
          />
        </View>
      </View>

      <View style={styles.toolbar}>
        <Tool
          label="Undo"
          disabled={!canUndo(doc)}
          onPress={() => setDoc(undo)}
        />
        <Tool
          label="Redo"
          disabled={!canRedo(doc)}
          onPress={() => setDoc(redo)}
        />
        <Tool label="Extents" onPress={zoomExtents} />
        <Tool label="Deselect" onPress={() => setDoc(clearSel)} />
        <Tool
          label={panel === 'osnap' ? 'OSNAP ●' : 'OSNAP'}
          on={panel === 'osnap'}
          onPress={() => setPanel(p => (p === 'osnap' ? null : 'osnap'))}
        />
        <Tool
          label={panel === 'layers' ? 'Layers ●' : 'Layers'}
          on={panel === 'layers'}
          onPress={() => setPanel(p => (p === 'layers' ? null : 'layers'))}
        />
      </View>

      <View style={styles.toggles}>
        <Toggle
          label="ORTHO"
          on={doc.ortho}
          onPress={() => setDoc(d => setOrtho(d, !d.ortho))}
        />
        <Toggle
          label="POLAR"
          on={doc.polar}
          onPress={() => setDoc(d => setPolar(d, !d.polar))}
        />
        <Toggle
          label="GRID"
          on={doc.grid}
          onPress={() => setDoc(d => setGrid(d, !d.grid))}
        />
        <Toggle
          label="SNAP"
          on={doc.gridSnap}
          onPress={() => setDoc(d => setGridSnap(d, !d.gridSnap))}
        />
      </View>

      {panel === 'osnap' ? (
        <View style={styles.panel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.panelRow}>
            {SNAP_KINDS.map(kind => (
              <Toggle
                key={kind}
                label={kind}
                on={doc.osnap[kind] !== false}
                onPress={() => setDoc(d => toggleOsnapKind(d, kind))}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {panel === 'layers' ? (
        <View style={styles.panel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.panelRow}>
            {layers.map(layer => (
              <Pressable
                key={layer.id}
                onPress={() => setDoc(d => setCurrentLayer(d, layer.id))}
                onLongPress={() =>
                  setDoc(d =>
                    patchLayer(d, layer.id, {visible: !layer.visible}),
                  )
                }
                style={[
                  styles.layer,
                  doc.currentLayer === layer.id && styles.layerOn,
                ]}>
                <Text style={styles.layerName}>
                  {layer.id} · {layer.name}
                </Text>
                <Text style={styles.layerState}>
                  {layer.visible ? '' : 'hidden'}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setDoc(d => addLayer(d))}
              style={styles.layer}>
              <Text style={styles.layerName}>+ New</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/** One-line description of a picked shape, for the status line. */
function describe(shape) {
  if (shape.type === 'dimension') return `${dimensionText(shape)}`;
  if (shape.type === 'circle') return `Circle r${shape.radius}`;
  if (shape.type === 'arc') return 'Arc';
  if (shape.type === 'text') return `Text "${shape.text}"`;
  return shape.type;
}

const promptText = s => currentPrompt(s)?.text ?? '';

function Tool({label, onPress, disabled, on}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.tool, on && styles.toolOn, disabled && styles.toolOff]}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

function Toggle({label, on, onPress}) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, on && styles.toggleOn]}>
      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0b1017'},
  canvasWrap: {flex: 1},
  status: {
    position: 'absolute',
    left: 10,
    top: 10,
    right: 10,
  },
  statusText: {color: '#dbe6f5', fontSize: 12},
  statusSub: {color: '#7d8ea6', fontSize: 11, marginTop: 2},
  commandBar: {
    borderTopWidth: 1,
    borderTopColor: '#1b2432',
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  inputRow: {flexDirection: 'row', alignItems: 'center'},
  promptMark: {color: '#4cc2ff', fontSize: 16, marginRight: 8},
  input: {flex: 1, color: '#e8eef7', fontSize: 15, paddingVertical: 8},
  hints: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4},
  hint: {
    backgroundColor: '#16202c',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  hintText: {color: '#9fd0f5', fontSize: 11},
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 6,
  },
  tool: {
    backgroundColor: '#16202c',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toolOn: {backgroundColor: '#1d3a52'},
  toolOff: {opacity: 0.35},
  toolText: {color: '#cfe0f2', fontSize: 12},
  toggles: {flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6, gap: 6},
  toggle: {
    borderWidth: 1,
    borderColor: '#243040',
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  toggleOn: {backgroundColor: '#12324a', borderColor: '#2f6d94'},
  toggleText: {color: '#8fa3ba', fontSize: 11},
  toggleTextOn: {color: '#8fd3ff'},
  panel: {borderTopWidth: 1, borderTopColor: '#1b2432', paddingVertical: 8},
  panelRow: {paddingHorizontal: 8, gap: 6},
  layer: {
    backgroundColor: '#16202c',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  layerOn: {backgroundColor: '#12324a'},
  layerName: {color: '#cfe0f2', fontSize: 12},
  layerState: {color: '#7d8ea6', fontSize: 10},
});
