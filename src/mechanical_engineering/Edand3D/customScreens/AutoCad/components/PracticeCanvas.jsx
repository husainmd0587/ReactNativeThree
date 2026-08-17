import React, { useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Path, Skia, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';

const CANVAS_HEIGHT = 280;
const SCREEN_PADDING = 32; // matches the screen's own horizontal padding
const PX_PER_MM = 2; // must match engine/geometry/units.js
const DIM_OFFSET = 26; // px, how far the dimension line sits from the shape
const ARROW_SIZE = 8;
const ARROW_ANGLE = 20; // degrees, half-angle of the arrowhead "V"

// Small worklet helpers. Kept in this file (not imported from
// engine/geometry/math.js) because a function called from inside a
// worklet must itself be a worklet — the reanimated babel plugin only
// auto-workletizes functions that carry the 'worklet' directive, and
// that has to happen where the function is defined.
function rotate(vx, vy, deg) {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: vx * cos - vy * sin, y: vx * sin + vy * cos };
}

// Draws a small arrowhead "V" with its tip at (tipX, tipY), pointing in
// direction (dirX, dirY) — the same visual language AutoCAD/SolidWorks use
// for dimension line arrows.
function addArrow(path, tipX, tipY, dirX, dirY) {
  'worklet';
  const w1 = rotate(-dirX, -dirY, ARROW_ANGLE);
  const w2 = rotate(-dirX, -dirY, -ARROW_ANGLE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w1.x * ARROW_SIZE, tipY + w1.y * ARROW_SIZE);
  path.moveTo(tipX, tipY);
  path.lineTo(tipX + w2.x * ARROW_SIZE, tipY + w2.y * ARROW_SIZE);
}

// Line, circle, and rectangle all reduce to the same interaction: drag from
// a start point to an end point. What differs is only (a) the shape + its
// dimension annotation while dragging, and (b) how the two points get
// measured — that measurement happens outside this component (see
// engine/operations/*), once, when the gesture ends.
//
// `initialPoints` lets a parent re-seed an already-drawn shape (used when
// the student edits a value in the Properties panel) — pass it together
// with a changed `key` prop to force a remount with the new geometry
// already committed.
export default function PracticeCanvas({ practiceType, onComplete, initialPoints }) {
  const { width } = useWindowDimensions();
  const canvasWidth = width - SCREEN_PADDING;
  const font = useFont(require('../../../../../assets/fonts/roboto.ttf'), 12);

  const startX = useSharedValue(initialPoints?.start?.x ?? 0);
  const startY = useSharedValue(initialPoints?.start?.y ?? 0);
  const currentX = useSharedValue(initialPoints?.end?.x ?? 0);
  const currentY = useSharedValue(initialPoints?.end?.y ?? 0);
  const dragging = useSharedValue(false);
  // Once a shape exists (drawn or seeded), keep rendering it — nothing
  // ever gets hidden based on what it measures to.
  const hasShape = useSharedValue(Boolean(initialPoints));

  const handleEnd = useCallback(
    (start, end) => {
      onComplete(start, end);
    },
    [onComplete],
  );

  const pan = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      startX.value = e.x;
      startY.value = e.y;
      currentX.value = e.x;
      currentY.value = e.y;
      dragging.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      // Transient drag state lives only in shared values — never React
      // state or Redux — so dragging never triggers a JS-thread re-render.
      currentX.value = e.x;
      currentY.value = e.y;
    })
    .onEnd(() => {
      'worklet';
      dragging.value = false;
      hasShape.value = true;
      runOnJS(handleEnd)(
        { x: startX.value, y: startY.value },
        { x: currentX.value, y: currentY.value },
      );
    });

  // The shape itself.
  const shapePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value && !hasShape.value) return path;

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

  // Dimension lines + extension lines + arrowheads — AutoCAD/SolidWorks
  // style annotation, built as one path. Updates live while dragging and
  // stays put once released, same as the shape itself.
  const annotationPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!dragging.value && !hasShape.value) return path;

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

  // Primary dimension text (length+angle / radius+diameter / width) and,
  // for rectangle only, a second label (height). Empty string draws
  // nothing — unlike a floating TextInput, there's no empty box to see.
  const primaryText = useDerivedValue(() => {
    if (!dragging.value && !hasShape.value) return '';
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

  const primaryTextX = useDerivedValue(() => {
    if (practiceType === 'line') {
      return (startX.value + currentX.value) / 2 - 30;
    }
    if (practiceType === 'circle') {
      return (startX.value + currentX.value) / 2 + 8;
    }
    if (practiceType === 'rectangle') {
      return (startX.value + currentX.value) / 2 - 24;
    }
    return 0;
  });

  const primaryTextY = useDerivedValue(() => {
    if (practiceType === 'line') {
      const nx = -(currentY.value - startY.value);
      const ny = currentX.value - startX.value;
      const nlen = Math.hypot(nx, ny) || 1;
      return (startY.value + currentY.value) / 2 + (ny / nlen) * DIM_OFFSET - 8;
    }
    if (practiceType === 'circle') {
      return (startY.value + currentY.value) / 2 - 8;
    }
    if (practiceType === 'rectangle') {
      return Math.max(startY.value, currentY.value) + DIM_OFFSET + 16;
    }
    return 0;
  });

  // Rectangle's second dimension label (height), to the right of the shape.
  const secondaryText = useDerivedValue(() => {
    if (practiceType !== 'rectangle' || (!dragging.value && !hasShape.value)) return '';
    const heightMm = Math.round(
      (Math.abs(currentY.value - startY.value) / PX_PER_MM) * 10,
    ) / 10;
    return `${heightMm} mm`;
  });

  const secondaryTextX = useDerivedValue(
    () => Math.max(startX.value, currentX.value) + DIM_OFFSET + 6,
  );
  const secondaryTextY = useDerivedValue(
    () => (startY.value + currentY.value) / 2,
  );

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.canvasWrap, { width: canvasWidth, height: CANVAS_HEIGHT }]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Path path={shapePath} color="#2E7DAF" style="stroke" strokeWidth={2.5} />
          <Path
            path={annotationPath}
            color="#8A8A9A"
            style="stroke"
            strokeWidth={1}
          />
          {font && (
            <>
              <SkiaText
                x={primaryTextX}
                y={primaryTextY}
                text={primaryText}
                font={font}
                color="#2E7DAF"
              />
              <SkiaText
                x={secondaryTextX}
                y={secondaryTextY}
                text={secondaryText}
                font={font}
                color="#2E7DAF"
              />
            </>
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    backgroundColor: '#FBFBFD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    overflow: 'hidden',
  },
});
