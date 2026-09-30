import React, {useCallback, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  worklet,
} from 'react-native-reanimated';
import {
  axisVisuals,
  boxVisuals,
  gripVisuals,
  shapeVisuals,
} from '../engine/shapeVisuals';
import {
  clampScale,
  gridLines,
  toWorld,
} from '../engine/viewport';

const FONT = require('../../../../../assets/fonts/roboto.ttf');

const INK = '#e8eef7';
const FAINT = 'rgba(150,170,200,0.20)';
const MAJOR = 'rgba(150,170,200,0.38)';
const AXIS = 'rgba(190,210,240,0.75)';
const ACCENT = '#4cc2ff';
const SNAP = '#ffd166';
const DIM_INK = '#8fd3a0';

/** One path string for a whole tier of grid lines, so it is a single node. */
const gridPath = (values, isVertical, extent) =>
  values
    .map(v =>
      isVertical ? `M${v} 0L${v} ${extent}` : `M0 ${v}L${extent} ${v}`,
    )
    .join('');

/**
 * The drawing surface.
 *
 * This component draws and forwards raw gestures; it makes no decisions about
 * what a tap means. That split is the same one the existing AutoCAD practice
 * canvas uses, and it is deliberate — picking, drafting and grip dragging all
 * live in the screen, which is the only place that can see the document, the
 * running command and the keyboard at once.
 *
 * Panning and pinching are the one exception: they run entirely against a
 * camera in shared values and never re-run the path builder, so the drawing
 * stays at 60 Hz no matter how much is on it. The camera is handed back to
 * the screen when the gesture settles.
 */
export default function CadCanvas({
  width,
  height,
  view,
  shapes,
  selection = [],
  grips = [],
  snapMarker = null,
  rubberBand = null,
  showGrid = true,
  onTap,
  onLongPress,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onCamera,
  dragEnabled = true,
}) {
  const font = useFont(FONT, 12);

  // Gesture deltas, applied as a transform on top of the committed camera.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pinch = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

/**
 * The live gesture transform, as one shared value.
 *
 * Skia only unwraps a shared value when the prop *itself* is the shared
 * value — see `extractReanimatedProps`. Handing it a plain array whose
 * entries happen to contain shared values passes those shared values
 * straight through to the matrix maths, where they land in numeric slots and
 * Skia throws "Expected number, we got object". So the whole transform has to
 * travel as a single value, already flattened to numbers.
 */
const gestureTransform = worklet((dx, dy, focalX, focalY, factor) => [
  {translateX: dx},
  {translateY: dy},
  {translateX: -focalX},
  {translateY: -focalY},
  {scale: factor},
  {translateX: focalX},
  {translateY: focalY},
]);

const transform = useDerivedValue(() =>
  gestureTransform(
    tx.value,
    ty.value,
    focalX.value,
    focalY.value,
    pinch.value,
  ),
);

  /**
   * Commit a finished gesture to React state.
   *
   * Rather than re-deriving the camera from deltas, this pins the world point
   * that was under the gesture's focal pixel and asks which camera puts that
   * same point under the focal pixel after the pan and zoom. That one rule
   * covers a drag, a pinch, and the two at once, which is why it does not
   * need a separate case for each.
   */
  const settle = useCallback(
    (dx, dy, factor, fx, fy) => {
      const scale = clampScale(view.scale * factor);
      const anchor = toWorld(view, {x: fx, y: fy});
      onCamera({
        ...view,
        scale,
        centre: {
          x: anchor.x - (fx + dx - width / 2) / scale,
          // Screen Y grows downwards while world Y grows upwards, which is
          // where the sign difference comes from.
          y: anchor.y + (fy + dy - height / 2) / scale,
        },
      });
    },
    [view, width, height, onCamera],
  );

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate(e => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(e => {
      const dx = e.translationX;
      const dy = e.translationY;
      tx.value = 0;
      ty.value = 0;
      runOnJS(settle)(dx, dy, 1, width / 2, height / 2);
    });

  const zoom = Gesture.Pinch()
    .onStart(e => {
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onUpdate(e => {
      pinch.value = e.scale;
    })
    .onEnd(e => {
      const f = e.scale;
      const fx = focalX.value;
      const fy = focalY.value;
      pinch.value = 1;
      runOnJS(settle)(tx.value, ty.value, f, fx, fy);
    });

  const tap = Gesture.Tap()
    .maxDuration(260)
    .onEnd(e => {
      if (onTap) runOnJS(onTap)({x: e.x, y: e.y});
    });

  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(e => {
      if (onLongPress) runOnJS(onLongPress)({x: e.x, y: e.y});
    });

  // A one-finger drag is reported raw. What it means — finishing a line,
  // window-selecting, nothing at all — depends on what the screen is doing,
  // so the decision is not made here.
  //
  // Every handler below is a React prop, so it lives on the JS thread and has
  // to be handed back to it with runOnJS. Calling one directly from a worklet
  // fails at runtime with "Tried to synchronously call a non-worklet function".
  const drag = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .enabled(dragEnabled)
    .onStart(e => onDragStart && runOnJS(onDragStart)({x: e.x, y: e.y}))
    .onUpdate(e => onDragUpdate && runOnJS(onDragUpdate)({x: e.x, y: e.y}))
    .onEnd(e => onDragEnd && runOnJS(onDragEnd)({x: e.x, y: e.y}));

  const composed = Gesture.Simultaneous(
    pan,
    zoom,
    drag,
    Gesture.Exclusive(longPress, tap),
  );

  const grid = useMemo(
    () => (showGrid ? gridLines(view) : null),
    [view, showGrid],
  );

  const ink = useMemo(
    () =>
      shapes.map(s =>
        shapeVisuals(s, view, {
          selected: selection.includes(s.id),
          layerColour: s.type === 'dimension' ? DIM_INK : INK,
        }),
      ),
    [shapes, view, selection],
  );

  const gripMarks = useMemo(() => gripVisuals(grips, view), [grips, view]);
  const axis = useMemo(() => axisVisuals(view), [view]);
  const box = useMemo(
    () => (rubberBand ? boxVisuals(rubberBand, view) : null),
    [rubberBand, view],
  );
  const snap = useMemo(
    () =>
      snapMarker
        ? {
            cx: (snapMarker.x - view.centre.x) * view.scale + width / 2,
            cy: -(snapMarker.y - view.centre.y) * view.scale + height / 2,
          }
        : null,
    [snapMarker, view, width, height],
  );

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.fill, {width, height}]}>
        <Canvas style={styles.fill}>
          {/* Ink is drawn in the committed camera's coordinates; the group
              transform carries the live gesture on top of it. */}
          <Group transform={transform}>
            {grid ? (
              <>
                <Path
                  path={gridPath(grid.minor.vertical, true, height)}
                  color={FAINT}
                  style="stroke"
                  strokeWidth={1}
                />
                <Path
                  path={gridPath(grid.minor.horizontal, false, width)}
                  color={FAINT}
                  style="stroke"
                  strokeWidth={1}
                />
                <Path
                  path={gridPath(grid.major.vertical, true, height)}
                  color={MAJOR}
                  style="stroke"
                  strokeWidth={1}
                />
                <Path
                  path={gridPath(grid.major.horizontal, false, width)}
                  color={MAJOR}
                  style="stroke"
                  strokeWidth={1}
                />
              </>
            ) : null}

            {showGrid ? (
              <>
                <Line2
                  x1={axis.x}
                  y1={0}
                  x2={axis.x}
                  y2={height}
                  color={AXIS}
                  width={1.2}
                />
                <Line2
                  x1={0}
                  y1={axis.y}
                  x2={width}
                  y2={axis.y}
                  color={AXIS}
                  width={1.2}
                />
              </>
            ) : null}

            {ink.map((v, i) => (
              <Group key={shapes[i].id}>
                {v.paths.map((d, k) => (
                  <Path
                    key={k}
                    path={d}
                    color={v.colour}
                    style="stroke"
                    strokeWidth={v.width}
                  />
                ))}
                {v.texts.map((t, k) => (
                  <SkiaText
                    key={k}
                    x={t.x}
                    y={t.y}
                    text={t.text}
                    color={t.colour}
                    size={t.size}
                    font={font}
                  />
                ))}
              </Group>
            ))}

            {gripMarks.map((g, i) => (
              <Rect
                key={i}
                x={g.x - g.size}
                y={g.y - g.size}
                width={g.size * 2}
                height={g.size * 2}
                color={ACCENT}
                style="stroke"
                strokeWidth={1.4}
              />
            ))}

            {box ? (
              <>
                <Rect
                  x={box.x}
                  y={box.y}
                  width={Math.abs(box.w)}
                  height={Math.abs(box.h)}
                  color="rgba(76,194,255,0.16)"
                />
                <Rect
                  x={box.x}
                  y={box.y}
                  width={Math.abs(box.w)}
                  height={Math.abs(box.h)}
                  color={ACCENT}
                  style="stroke"
                  strokeWidth={1}
                />
              </>
            ) : null}

            {snap ? (
              <>
                <Circle
                  cx={snap.cx}
                  cy={snap.cy}
                  r={6}
                  color={SNAP}
                  style="stroke"
                  strokeWidth={1.6}
                />
                <Path
                  path={`M${snap.cx - 9} ${snap.cy}L${snap.cx + 9} ${snap.cy}M${
                    snap.cx
                  } ${snap.cy - 9}L${snap.cx} ${snap.cy + 9}`}
                  color={SNAP}
                  style="stroke"
                  strokeWidth={1}
                />
              </>
            ) : null}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

/** A one-segment line, kept local so the axes read clearly above. */
function Line2({x1, y1, x2, y2, color, width}) {
  return (
    <Path
      path={`M${x1} ${y1}L${x2} ${y2}`}
      color={color}
      style="stroke"
      strokeWidth={width}
    />
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, overflow: 'hidden'},
});
