import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Path, Skia, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import { buildShapeVisuals } from '../engine/geometry/shapeVisuals';
import { useSettings } from '../state/SettingsContext';

const CANVAS_HEIGHT = 280;
const SCREEN_PADDING = 32; // matches the screen's own horizontal padding
const PX_PER_MM = 2; // must match engine/geometry/units.js
const DIM_OFFSET = 26;
const ARROW_SIZE = 8;
const ARROW_ANGLE = 20;
const CROSSHAIR_SIZE = 22; // px, each arm's length from the pickbox out
const PICKBOX_SIZE = 3; // px, half-width of the center square

const DRAG_TYPES = new Set([
  'line', 'circle', 'rectangle',
  'move', 'copy', 'rotate', 'scale', 'mirror', 'offset', 'array',
]);

// Worklet helpers for the shape currently being dragged (see the note on
// engine/geometry/shapeVisuals.js — that file has the same math for
// already-committed shapes, duplicated on purpose because a worklet can't
// call a plain imported function).
function rotate(vx, vy, deg) {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: vx * cos - vy * sin, y: vx * sin + vy * cos };
}

function addArrow(path, tipX, tipY, dirX, dirY) {
  'worklet';
  const w1 = rotate(-dirX, -dirY, ARROW_ANGLE);
  const w2 = rotate(-dirX, -dirY, -ARROW_ANGLE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w1.x * ARROW_SIZE, tipY + w1.y * ARROW_SIZE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w2.x * ARROW_SIZE, tipY + w2.y * ARROW_SIZE);
}

// Mirrors centroidOf() in engine/operations/modify.js — duplicated here
// because a worklet can't call a plain imported function (same reason
// every other worklet helper in this file is self-contained).
function centroidOfWorklet(type, points) {
  'worklet';
  if (type === 'circle') return { x: points[0].x, y: points[0].y };
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < points.length; i += 1) {
    sx += points[i].x;
    sy += points[i].y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

// Renders every already-drawn shape for this command (`shapes`), plus one
// live in-progress shape (dragging for line/circle/rectangle, or the
// tap-by-tap `draftPoints` the parent is building for arc/polyline).
//
// This component owns rendering and raw gesture forwarding only — it does
// NOT decide what a tap or long-press means. `onCanvasTap`/
// `onCanvasLongPress` just report the raw point/event up to
// screens/CommandPractice.jsx, which owns the actual interaction state
// (selection, drafting, committing). Keeping that logic in one place
// (instead of split between here and the parent) is what fixes drafts
// silently failing to commit — there's now exactly one place that decides
// "this draft is done", and it's backed by an explicit Finish action in
// the Toolbar, not just gesture timing.
export default function PracticeCanvas({
  practiceType,
  shapes,
  draftPoints,
  selectedId,
  selectedShape,
  showDimensions,
  onDrawComplete,
  onCanvasTap,
  onCanvasLongPress,
}) {
  const { width } = useWindowDimensions();
  const canvasWidth = width - SCREEN_PADDING;
  const font = useFont(require('../../../../../assets/fonts/roboto.ttf'), 12);
  const { settings } = useSettings();
  const isTapType = practiceType === 'arc' || practiceType === 'polyline';
  // Captured fresh each render (plain JS, closed over by the worklets
  // below) so a drag-to-place-a-point knows where to rubber-band FROM —
  // the last point already confirmed in the current draft, or null if
  // this drag is placing the very first point.
  const lastDraftPointForPreview = draftPoints && draftPoints.length > 0
    ? draftPoints[draftPoints.length - 1]
    : null;

  // AutoCAD-style crosshair — visible the moment the screen opens
  // (defaults to canvas center), follows any touch across every command
  // (drawing or selecting), and stays put at the last touch position
  // afterward rather than disappearing. Independent of drag/draft state
  // on purpose: it's a cursor, not a shape.
  const cursorX = useSharedValue(canvasWidth / 2);
  const cursorY = useSharedValue(CANVAS_HEIGHT / 2);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const currentX = useSharedValue(0);
  const currentY = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Rotate-specific: captured once per drag (in onBegin, only when
  // practiceType is 'rotate' and something's selected) so the live
  // preview and gizmo below have a fixed pivot + original geometry to
  // rotate from as the finger moves — the AutoCAD-style "center dot +
  // reference arrow" rotation indicator this component didn't have
  // before, plus an actual live-rotating preview of the selected shape
  // instead of nothing happening until release.
  const rotationActive = useSharedValue(false);
  const rotationPivot = useSharedValue({ x: 0, y: 0 });
  const rotationOriginalPoints = useSharedValue([]);
  const rotationOriginalType = useSharedValue('');

  // Arc/Polyline point placement: same drag-with-live-rubber-band feel as
  // Line/Circle/Rectangle already have, instead of only a bare tap.
  // Dragging still ends by committing a point (via the same handleTap
  // path a plain tap uses) — this only adds live visual feedback while
  // the finger is down, and a second way to place a point precisely.
  const dragPointActive = useSharedValue(false);
  const dragPointX = useSharedValue(0);
  const dragPointY = useSharedValue(0);

  const handleDrawEnd = useCallback(
    (points) => {
      onDrawComplete(points);
    },
    [onDrawComplete],
  );

  const handleTap = useCallback(
    (point) => {
      onCanvasTap(point);
    },
    [onCanvasTap],
  );

  const handleLongPress = useCallback(() => {
    onCanvasLongPress();
  }, [onCanvasLongPress]);

  const pan = Gesture.Pan()
    .minDistance(6)
    .enabled(DRAG_TYPES.has(practiceType) || isTapType)
    .onTouchesMove((e) => {
      'worklet';
      const t = e.allTouches[0];
      if (t) {
        cursorX.value = t.x;
        cursorY.value = t.y;
      }
    })
    .onBegin((e) => {
      'worklet';
      if (isTapType) {
        dragPointX.value = e.x;
        dragPointY.value = e.y;
        dragPointActive.value = true;
        return;
      }
      startX.value = e.x;
      startY.value = e.y;
      currentX.value = e.x;
      currentY.value = e.y;
      dragging.value = true;

      if (practiceType === 'rotate' && selectedShape) {
        rotationOriginalPoints.value = selectedShape.points;
        rotationOriginalType.value = selectedShape.type;
        rotationPivot.value = centroidOfWorklet(selectedShape.type, selectedShape.points);
        rotationActive.value = true;
      } else {
        rotationActive.value = false;
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (isTapType) {
        dragPointX.value = e.x;
        dragPointY.value = e.y;
        return;
      }
      currentX.value = e.x;
      currentY.value = e.y;
    })
    .onEnd((e) => {
      'worklet';
      if (isTapType) {
        dragPointActive.value = false;
        runOnJS(handleTap)({ x: e.x, y: e.y });
        return;
      }
      dragging.value = false;
      runOnJS(handleDrawEnd)([
        { x: startX.value, y: startY.value },
        { x: currentX.value, y: currentY.value },
      ]);
    });

  // Exclusive (not Race): try the long-press first, and only fall back to
  // a plain tap once long-press fails to recognize. This is the reliable
  // way to combine tap + long-press on the same view — racing them
  // against each other is exactly what let a long-press sometimes lose to
  // a competing (but ultimately unwanted) tap recognition, which is why
  // a polyline could finish drafting on-screen but never actually commit.
  const tap = Gesture.Tap()
    .onTouchesDown((e) => {
      'worklet';
      const t = e.allTouches[0];
      if (t) {
        cursorX.value = t.x;
        cursorY.value = t.y;
      }
    })
    .onTouchesMove((e) => {
      'worklet';
      const t = e.allTouches[0];
      if (t) {
        cursorX.value = t.x;
        cursorY.value = t.y;
      }
    })
    .onEnd((e) => {
      'worklet';
      cursorX.value = e.x;
      cursorY.value = e.y;
      runOnJS(handleTap)({ x: e.x, y: e.y });
    });

  const longPress = Gesture.LongPress()
    .enabled(practiceType === 'polyline')
    .minDuration(450)
    .onStart(() => {
      'worklet';
      runOnJS(handleLongPress)();
    });

  const gesture = isTapType ? Gesture.Exclusive(longPress, pan, tap) : Gesture.Race(tap, pan);

  // ── Live, in-progress DRAG shape (line/circle/rectangle) — worklet-
  // driven, smooth per-frame updates, zero React re-renders while
  // dragging ────────────────────────────────────────────────────────────
  const liveShapePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value) return path;
    if (practiceType === 'line') {
      path.moveTo(startX.value, startY.value);
      path.lineTo(currentX.value, currentY.value);
    } else if (practiceType === 'rectangle') {
      path.addRect({
        x: Math.min(startX.value, currentX.value),
        y: Math.min(startY.value, currentY.value),
        width: Math.abs(currentX.value - startX.value),
        height: Math.abs(currentY.value - startY.value),
      });
    } else if (practiceType === 'circle') {
      const r = Math.hypot(
        currentX.value - startX.value,
        currentY.value - startY.value,
      );
      path.addCircle(startX.value, startY.value, r);
    }
    return path;
  });

  // ── Live ROTATE preview + gizmo — a rebuilt (rotated) copy of the
  // selected shape's own path, plus a pivot dot, a reference line from
  // pivot to finger, an arrowhead, and a live angle readout. All driven
  // by the same shared values as the drag itself, so it updates every
  // frame with no React re-render.
  const rotationPreviewPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value || !rotationActive.value) return path;

    const pivot = rotationPivot.value;
    const origPoints = rotationOriginalPoints.value;
    const shapeType = rotationOriginalType.value;
    const angleStart = Math.atan2(startY.value - pivot.y, startX.value - pivot.x);
    const angleNow = Math.atan2(currentY.value - pivot.y, currentX.value - pivot.x);
    const delta = angleNow - angleStart;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);

    const rotated = [];
    for (let i = 0; i < origPoints.length; i += 1) {
      const dx = origPoints[i].x - pivot.x;
      const dy = origPoints[i].y - pivot.y;
      rotated.push({ x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos });
    }

    if (shapeType === 'rectangle' && rotated.length === 4) {
      path.moveTo(rotated[0].x, rotated[0].y);
      path.lineTo(rotated[1].x, rotated[1].y);
      path.lineTo(rotated[2].x, rotated[2].y);
      path.lineTo(rotated[3].x, rotated[3].y);
      path.close();
    } else if (shapeType === 'line' && rotated.length === 2) {
      path.moveTo(rotated[0].x, rotated[0].y);
      path.lineTo(rotated[1].x, rotated[1].y);
    } else if (shapeType === 'circle' && rotated.length === 2) {
      const r = Math.hypot(rotated[1].x - rotated[0].x, rotated[1].y - rotated[0].y);
      path.addCircle(rotated[0].x, rotated[0].y, r);
    }
    return path;
  });

  const rotationGizmoPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value || !rotationActive.value) return path;
    const pivot = rotationPivot.value;
    path.addCircle(pivot.x, pivot.y, 4);
    path.moveTo(pivot.x, pivot.y);
    path.lineTo(currentX.value, currentY.value);
    const dx = currentX.value - pivot.x;
    const dy = currentY.value - pivot.y;
    const len = Math.hypot(dx, dy) || 1;
    addArrow(path, currentX.value, currentY.value, dx / len, dy / len);
    return path;
  });

  const rotationAngleText = useDerivedValue(() => {
    if (!dragging.value || !rotationActive.value) return '';
    const pivot = rotationPivot.value;
    const angleStart = Math.atan2(startY.value - pivot.y, startX.value - pivot.x);
    const angleNow = Math.atan2(currentY.value - pivot.y, currentX.value - pivot.x);
    let delta = ((angleNow - angleStart) * 180) / Math.PI;
    delta = Math.round(delta * 10) / 10;
    return `${delta}°`;
  });
  const rotationAngleTextX = useDerivedValue(() => currentX.value + 12);
  const rotationAngleTextY = useDerivedValue(() => currentY.value - 16);

  const liveAnnotationPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value) return path;

    if (practiceType === 'line') {
      const sx = startX.value;
      const sy = startY.value;
      const ex = currentX.value;
      const ey = currentY.value;
      const len = Math.hypot(ex - sx, ey - sy) || 1;
      const ux = (ex - sx) / len;
      const uy = (ey - sy) / len;
      const nx = -uy;
      const ny = ux;
      const d1x = sx + nx * DIM_OFFSET;
      const d1y = sy + ny * DIM_OFFSET;
      const d2x = ex + nx * DIM_OFFSET;
      const d2y = ey + ny * DIM_OFFSET;

      path.moveTo(sx, sy);
      path.lineTo(d1x, d1y);
      path.moveTo(ex, ey);
      path.lineTo(d2x, d2y);
      path.moveTo(d1x, d1y);
      path.lineTo(d2x, d2y);
      addArrow(path, d1x, d1y, -ux, -uy);
      addArrow(path, d2x, d2y, ux, uy);
    } else if (practiceType === 'circle') {
      const cx = startX.value;
      const cy = startY.value;
      const ex = currentX.value;
      const ey = currentY.value;
      const r = Math.hypot(ex - cx, ey - cy) || 1;
      const ux = (ex - cx) / r;
      const uy = (ey - cy) / r;

      path.moveTo(cx, cy);
      path.lineTo(ex, ey);
      path.moveTo(cx - 4, cy);
      path.lineTo(cx + 4, cy);
      path.moveTo(cx, cy - 4);
      path.lineTo(cx, cy + 4);
      addArrow(path, ex, ey, ux, uy);
    } else if (practiceType === 'rectangle') {
      const left = Math.min(startX.value, currentX.value);
      const right = Math.max(startX.value, currentX.value);
      const top = Math.min(startY.value, currentY.value);
      const bottom = Math.max(startY.value, currentY.value);

      const wy = bottom + DIM_OFFSET;
      path.moveTo(left, bottom);
      path.lineTo(left, wy);
      path.moveTo(right, bottom);
      path.lineTo(right, wy);
      path.moveTo(left, wy);
      path.lineTo(right, wy);
      addArrow(path, left, wy, -1, 0);
      addArrow(path, right, wy, 1, 0);

      const hx = right + DIM_OFFSET;
      path.moveTo(right, top);
      path.lineTo(hx, top);
      path.moveTo(right, bottom);
      path.lineTo(hx, bottom);
      path.moveTo(hx, top);
      path.lineTo(hx, bottom);
      addArrow(path, hx, top, 0, -1);
      addArrow(path, hx, bottom, 0, 1);
    }
    return path;
  });

  const livePrimaryText = useDerivedValue(() => {
    if (!dragging.value) return '';
    const dx = currentX.value - startX.value;
    const dy = currentY.value - startY.value;
    if (practiceType === 'line') {
      const lengthMm = Math.round((Math.hypot(dx, dy) / PX_PER_MM) * 10) / 10;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      angle = Math.round(angle * 10) / 10;
      return `${lengthMm} mm   ${angle}°`;
    }
    if (practiceType === 'circle') {
      const radiusMm = Math.round((Math.hypot(dx, dy) / PX_PER_MM) * 10) / 10;
      return `R ${radiusMm} mm`;
    }
    if (practiceType === 'rectangle') {
      const widthMm = Math.round((Math.abs(dx) / PX_PER_MM) * 10) / 10;
      return `${widthMm} mm`;
    }
    return '';
  });

  const livePrimaryX = useDerivedValue(() => {
    if (practiceType === 'circle') return (startX.value + currentX.value) / 2 + 8;
    if (practiceType === 'rectangle') return (startX.value + currentX.value) / 2 - 24;
    return (startX.value + currentX.value) / 2 - 30;
  });

  const livePrimaryY = useDerivedValue(() => {
    if (practiceType === 'line') {
      const nx = -(currentY.value - startY.value);
      const ny = currentX.value - startX.value;
      const nlen = Math.hypot(nx, ny) || 1;
      return (startY.value + currentY.value) / 2 + (ny / nlen) * DIM_OFFSET - 8;
    }
    if (practiceType === 'circle') return (startY.value + currentY.value) / 2 - 8;
    if (practiceType === 'rectangle') {
      return Math.max(startY.value, currentY.value) + DIM_OFFSET + 16;
    }
    return 0;
  });

  const liveSecondaryText = useDerivedValue(() => {
    if (practiceType !== 'rectangle' || !dragging.value) return '';
    const heightMm = Math.round(
      (Math.abs(currentY.value - startY.value) / PX_PER_MM) * 10,
    ) / 10;
    return `${heightMm} mm`;
  });
  const liveSecondaryX = useDerivedValue(
    () => Math.max(startX.value, currentX.value) + DIM_OFFSET + 6,
  );
  const liveSecondaryY = useDerivedValue(
    () => (startY.value + currentY.value) / 2,
  );

  // ── Already-committed shapes (plain React/JS — only recomputed when
  // the `shapes` array actually changes, not per drag/tap) ─────────────
  const committedVisuals = useMemo(
    () => shapes.map((shape) => ({
      id: shape.id,
      ...buildShapeVisuals(shape.type, shape.points),
    })),
    [shapes],
  );

  // ── In-progress TAP draft (arc/polyline), controlled by the parent —
  // a connecting line between placed points, a dot at each one, and for
  // polyline a running "so far" length label so the dimension is visible
  // WHILE drafting, not only once committed.
  const draftVisual = useMemo(() => {
    if (!draftPoints || draftPoints.length === 0) return null;

    const linePath = Skia.Path.Make();
    draftPoints.forEach((pt, i) => {
      if (i === 0) linePath.moveTo(pt.x, pt.y);
      else linePath.lineTo(pt.x, pt.y);
    });
    const dotsPath = Skia.Path.Make();
    draftPoints.forEach((pt) => dotsPath.addCircle(pt.x, pt.y, 3));

    let label = '';
    let labelX = 0;
    let labelY = 0;
    if (practiceType === 'polyline' && draftPoints.length >= 2) {
      let totalPx = 0;
      for (let i = 1; i < draftPoints.length; i += 1) {
        totalPx += Math.hypot(
          draftPoints[i].x - draftPoints[i - 1].x,
          draftPoints[i].y - draftPoints[i - 1].y,
        );
      }
      const totalMm = Math.round((totalPx / PX_PER_MM) * 10) / 10;
      const last = draftPoints[draftPoints.length - 1];
      label = `${draftPoints.length - 1} seg so far   ${totalMm} mm`;
      labelX = last.x + 8;
      labelY = last.y - 8;
    }

    return { linePath, dotsPath, label, labelX, labelY };
  }, [draftPoints, practiceType]);

  // Live rubber-band while dragging to place an arc/polyline point — a
  // line from the last confirmed draft point to wherever the finger
  // currently is (or, for the very first point of a fresh draft, just a
  // small dot at the finger, since there's nothing to rubber-band from
  // yet). Worklet-driven like every other live preview, so it updates
  // every frame with no React re-render.
  const dragPointPreviewPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragPointActive.value) return path;
    if (lastDraftPointForPreview) {
      path.moveTo(lastDraftPointForPreview.x, lastDraftPointForPreview.y);
      path.lineTo(dragPointX.value, dragPointY.value);
    } else {
      path.addCircle(dragPointX.value, dragPointY.value, 3);
    }
    return path;
  });

  // AutoCAD-style crosshair path: a "+" with a small gap for the pickbox
  // square in the middle, same visual language as the real desktop tool.
  const crosshairPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const cx = cursorX.value;
    const cy = cursorY.value;
    path.moveTo(cx - CROSSHAIR_SIZE, cy);
    path.lineTo(cx - PICKBOX_SIZE, cy);
    path.moveTo(cx + PICKBOX_SIZE, cy);
    path.lineTo(cx + CROSSHAIR_SIZE, cy);
    path.moveTo(cx, cy - CROSSHAIR_SIZE);
    path.lineTo(cx, cy - PICKBOX_SIZE);
    path.moveTo(cx, cy + PICKBOX_SIZE);
    path.lineTo(cx, cy + CROSSHAIR_SIZE);
    path.addRect({
      x: cx - PICKBOX_SIZE,
      y: cy - PICKBOX_SIZE,
      width: PICKBOX_SIZE * 2,
      height: PICKBOX_SIZE * 2,
    });
    return path;
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.canvasWrap,
          { width: canvasWidth, height: CANVAS_HEIGHT, backgroundColor: settings.canvasBackground },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {committedVisuals.map((v) => (
            <React.Fragment key={v.id}>
              <Path
                path={v.shapePath}
                color={v.id === selectedId ? settings.selectedColor : settings.shapeColor}
                style="stroke"
                strokeWidth={2.5}
              />
              {showDimensions && (
                <Path path={v.annotationPath} color={settings.dimensionColor} style="stroke" strokeWidth={1} />
              )}
              {showDimensions && font && (
                <>
                  <SkiaText x={v.primaryX} y={v.primaryY} text={v.primaryText} font={font} color={settings.shapeColor} />
                  {!!v.secondaryText && (
                    <SkiaText x={v.secondaryX} y={v.secondaryY} text={v.secondaryText} font={font} color={settings.shapeColor} />
                  )}
                </>
              )}
            </React.Fragment>
          ))}

          <Path path={liveShapePath} color={settings.shapeColor} style="stroke" strokeWidth={2.5} />
          {showDimensions && (
            <Path path={liveAnnotationPath} color={settings.dimensionColor} style="stroke" strokeWidth={1} />
          )}
          {showDimensions && font && (
            <>
              <SkiaText x={livePrimaryX} y={livePrimaryY} text={livePrimaryText} font={font} color={settings.shapeColor} />
              <SkiaText x={liveSecondaryX} y={liveSecondaryY} text={liveSecondaryText} font={font} color={settings.shapeColor} />
            </>
          )}

          {draftVisual && (
            <>
              <Path path={draftVisual.linePath} color={settings.shapeColor} style="stroke" strokeWidth={2} opacity={0.6} />
              <Path path={draftVisual.dotsPath} color={settings.shapeColor} style="fill" />
              {showDimensions && font && !!draftVisual.label && (
                <SkiaText
                  x={draftVisual.labelX}
                  y={draftVisual.labelY}
                  text={draftVisual.label}
                  font={font}
                  color={settings.shapeColor}
                />
              )}
            </>
          )}

          {/* Live rubber-band while dragging to place the next
              arc/polyline point — separate from draftVisual above, which
              only shows already-confirmed points. */}
          <Path path={dragPointPreviewPath} color={settings.shapeColor} style="stroke" strokeWidth={2} opacity={0.5} />

          {/* AutoCAD-style rotate gizmo: pivot dot, reference arrow, live
              angle readout, and a live-rotating preview of the selected
              shape — only active while dragging in Rotate mode. */}
          <Path path={rotationPreviewPath} color={settings.shapeColor} style="stroke" strokeWidth={2} opacity={0.7} />
          <Path path={rotationGizmoPath} color={settings.crosshairColor} style="stroke" strokeWidth={1.5} />
          {font && (
            <SkiaText
              x={rotationAngleTextX}
              y={rotationAngleTextY}
              text={rotationAngleText}
              font={font}
              color={settings.crosshairColor}
            />
          )}

          {/* Always on top, always visible — a cursor, not a dimension. */}
          <Path path={crosshairPath} color={settings.crosshairColor} style="stroke" strokeWidth={1} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    overflow: 'hidden',
  },
});
