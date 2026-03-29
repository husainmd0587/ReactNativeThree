import { StyleSheet, Text, View, useWindowDimensions, ScrollView } from 'react-native';
import React, { useState, useCallback } from 'react';
import { Canvas, Group, Path, Skia, DashPathEffect } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import Grid, { Crosshair } from './components/grid';
import { clamp } from './utils/math';
import { hitTestSegment } from './utils/hitTest';
import { applyTrim } from './utils/trim';

const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;
const SHAPES    = ["line", "arc", "rectangle", "circle", "trim"];
const SHAPE_MAP = { line: 0, arc: 1, rectangle: 2, circle: 3, trim: 4 };

const Sketching2D = () => {
  const { width, height } = useWindowDimensions();
  const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT;
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2;

  // ── viewport transform ────────────────────────────────────────────────────
  const scale      = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX     = useSharedValue(centerX);
  const savedY     = useSharedValue(centerY);
  const savedScale = useSharedValue(1);
  const MIN_SCALE  = 0.2;
  const MAX_SCALE  = 5;
  const LIMIT      = 500;
  
  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ── crosshair ─────────────────────────────────────────────────────────────
  const translateCrossX = useSharedValue(0);
  const translateCrossY = useSharedValue(0);
  const transformCross  = useDerivedValue(() => [
    { translateX: translateCrossX.value },
    { translateY: translateCrossY.value },
  ]);

  // ── preview path ──────────────────────────────────────────────────────────
  const previewPath     = useSharedValue(Skia.Path.Make());
  const animatedPreview = useDerivedValue(() => previewPath.value);

  // ── chaining ──────────────────────────────────────────────────────────────
  const lastPoint    = useSharedValue({ x: 0, y: 0 });
  const hasLastPoint = useSharedValue(false);

  // ── arc shared state ──────────────────────────────────────────────────────
  const arcPhase = useSharedValue(0);
  const arcStart = useSharedValue({ x: 0, y: 0 });
  const arcEnd   = useSharedValue({ x: 0, y: 0 });

  // ── current shape shared value ────────────────────────────────────────────
  const currentShapeSV = useSharedValue(0);

  // ── React state ───────────────────────────────────────────────────────────
  const [currentShape, setCurrentShape] = useState("line");
  const [shapeList,    setShapeList]    = useState([]);

  // ── JS thread: add segment ────────────────────────────────────────────────
  const addSegment = (segment) => {
    setShapeList((prev) => [...prev, segment]);
  };

  // ── shape switch ──────────────────────────────────────────────────────────
  const handleShapeChange = useCallback((shape) => {
    setCurrentShape(shape);
    currentShapeSV.value = SHAPE_MAP[shape];
    arcPhase.value       = 0;
    previewPath.value    = Skia.Path.Make();
  }, []);

  // ── worklet helpers ───────────────────────────────────────────────────────
  const toWorld = (sx, sy) => {
    'worklet';
    return {
      x: (sx - translateX.value) / scale.value,
      y: (sy - translateY.value) / scale.value,
    };
  };

  const getDistance = (x1, y1, x2, y2) => {
    'worklet';
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // ── build rectangle Skia path from 2 corner points ───────────────────────
  const buildRectPath = (x1, y1, x2, y2) => {
    'worklet';
    const p = Skia.Path.Make();
    p.moveTo(x1, y1);
    p.lineTo(x2, y1);
    p.lineTo(x2, y2);
    p.lineTo(x1, y2);
    p.close();
    return p;
  };

  // ── arc from 3 points ─────────────────────────────────────────────────────
  const getArcFrom3Points = (x1, y1, x2, y2, xb, yb) => {
    'worklet';
    const ax = x1, ay = y1;
    const bx = x2, by = y2;
    const cx = xb, cy = yb;

    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-6) return null;

    const ux = ((ax * ax + ay * ay) * (by - cy) +
                (bx * bx + by * by) * (cy - ay) +
                (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) +
                (bx * bx + by * by) * (ax - cx) +
                (cx * cx + cy * cy) * (bx - ax)) / D;

    const r          = getDistance(ux, uy, ax, ay);
    const startAngle = Math.atan2(ay - uy, ax - ux);
    const endAngle   = Math.atan2(by - uy, bx - ux);
    const midAngle   = Math.atan2(cy - uy, cx - ux);

    const normalize = (a) => {
      'worklet';
      return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    };

    const ns = normalize(startAngle);
    const ne = normalize(endAngle);
    const nm = normalize(midAngle);

    const cwBetween = ns <= nm
      ? nm <= ne || ne < ns
      : nm <= ne && ne < ns;

    return { cx: ux, cy: uy, r, startAngle, endAngle, clockwise: cwBetween };
  };

  // ── build arc Skia path ───────────────────────────────────────────────────
  const buildArcPath = (x1, y1, x2, y2, xb, yb) => {
    'worklet';
    const arc = getArcFrom3Points(x1, y1, x2, y2, xb, yb);
    if (!arc) {
      const p = Skia.Path.Make();
      p.moveTo(x1, y1);
      p.lineTo(x2, y2);
      return p;
    }
    const { cx, cy, r, startAngle, endAngle, clockwise } = arc;
    const toDeg  = (a) => { 'worklet'; return a * (180 / Math.PI); };
    let startDeg = toDeg(startAngle);
    let sweepDeg = toDeg(endAngle) - startDeg;

    if (clockwise)  { if (sweepDeg < 0) sweepDeg += 360; }
    else            { if (sweepDeg > 0) sweepDeg -= 360; }

    const p = Skia.Path.Make();
    p.addArc(
      { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      startDeg,
      sweepDeg
    );
    return p;
  };

const handleTrim = useCallback((tx, ty, currentScale) => {
  setShapeList((prev) => {
    const idx = prev.findIndex(seg => hitTestSegment(tx, ty, seg, 8 / currentScale));
    if (idx === -1) return prev;
    return applyTrim(prev, idx, tx, ty);
  });
}, []);

  // ── unified draw gesture ──────────────────────────────────────────────────
  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx;
      translateCrossY.value = wy;

      // ── LINE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        if (!hasLastPoint.value) {
          lastPoint.value    = { x: wx, y: wy };
          hasLastPoint.value = true;
        }
        const p = Skia.Path.Make();
        p.moveTo(lastPoint.value.x, lastPoint.value.y);
        p.lineTo(wx, wy);
        previewPath.value = p;
      }

      // ── ARC phase 0 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        const sx = hasLastPoint.value ? lastPoint.value.x : wx;
        const sy = hasLastPoint.value ? lastPoint.value.y : wy;
        arcStart.value = { x: sx, y: sy };
        const p = Skia.Path.Make();
        p.addCircle(sx, sy, 3);
        previewPath.value = p;
      }

      // ── ARC phase 1 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        const p = buildArcPath(
          arcStart.value.x, arcStart.value.y,
          arcEnd.value.x,   arcEnd.value.y,
          wx, wy
        );
        previewPath.value = p;
      }

      // ── RECTANGLE ─────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        if (!hasLastPoint.value) {
          lastPoint.value    = { x: wx, y: wy };
          hasLastPoint.value = true;
        }
        // show dot at anchor corner
        const p = Skia.Path.Make();
        p.addCircle(lastPoint.value.x, lastPoint.value.y, 3);
        previewPath.value = p;
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        if (!hasLastPoint.value) {
          lastPoint.value    = { x: wx, y: wy };
          hasLastPoint.value = true;
        }
        const p = Skia.Path.Make();
        p.addCircle(lastPoint.value.x, lastPoint.value.y, 3);
        previewPath.value = p;
      }
    })
    .onUpdate((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx;
      translateCrossY.value = wy;

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        const p = Skia.Path.Make();
        p.moveTo(lastPoint.value.x, lastPoint.value.y);
        p.lineTo(wx, wy);
        previewPath.value = p;
      }

      // ── ARC phase 0 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        const p = Skia.Path.Make();
        p.moveTo(arcStart.value.x, arcStart.value.y);
        p.lineTo(wx, wy);
        previewPath.value = p;
      }

      // ── ARC phase 1 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        const p = buildArcPath(
          arcStart.value.x, arcStart.value.y,
          arcEnd.value.x,   arcEnd.value.y,
          wx, wy
        );
        previewPath.value = p;
      }

      // ── RECTANGLE — live preview from anchor corner → finger ──────────────
      if (currentShapeSV.value === 2) {
        const p = buildRectPath(
          lastPoint.value.x, lastPoint.value.y,
          wx, wy
        );
        previewPath.value = p;
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        const x1 = lastPoint.value.x;
        const y1 = lastPoint.value.y;
        const cx = (x1 + wx) / 2;
        const cy = (y1 + wy) / 2;
        const r  = getDistance(x1, y1, wx, wy) / 2;
        const p  = Skia.Path.Make();
        p.addCircle(cx, cy, r);
        previewPath.value = p;
      }
    })
    .onEnd(() => {
      'worklet';
      const endX = translateCrossX.value;
      const endY = translateCrossY.value;

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        const startX = lastPoint.value.x;
        const startY = lastPoint.value.y;
        previewPath.value = Skia.Path.Make();
        lastPoint.value   = { x: endX, y: endY };
        runOnJS(addSegment)({
          type:       "line",
          startPoint: { x: startX, y: startY },
          endPoint:   { x: endX,   y: endY   },
        });
      }

      // ── ARC phase 0 → lock endPoint ───────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        arcEnd.value   = { x: endX, y: endY };
        arcPhase.value = 1;
        const p = Skia.Path.Make();
        p.moveTo(arcStart.value.x, arcStart.value.y);
        p.lineTo(endX, endY);
        previewPath.value = p;
      }

      // ── ARC phase 1 → commit arc ──────────────────────────────────────────
      else if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        const x1  = arcStart.value.x;
        const y1  = arcStart.value.y;
        const x2  = arcEnd.value.x;
        const y2  = arcEnd.value.y;
        const arc = getArcFrom3Points(x1, y1, x2, y2, endX, endY);

        previewPath.value  = Skia.Path.Make();
        arcPhase.value     = 0;
        lastPoint.value    = { x: x2, y: y2 };
        hasLastPoint.value = true;

        if (arc) {
          runOnJS(addSegment)({
            type:       "arc",
            center:     { x: arc.cx, y: arc.cy },
            radius:     arc.r,
            startAngle: arc.startAngle,
            endAngle:   arc.endAngle,
            clockwise:  arc.clockwise,
            startPoint: { x: x1,   y: y1   },
            endPoint:   { x: x2,   y: y2   },
            bulgePoint: { x: endX, y: endY },
          });
        }
      }

      // ── RECTANGLE — commit, chain lastPoint to drag-end corner ────────────
      if (currentShapeSV.value === 2) {
        const x1 = lastPoint.value.x;
        const y1 = lastPoint.value.y;

        previewPath.value  = Skia.Path.Make();
        // chain: next shape from the drag-end corner
        lastPoint.value    = { x: endX, y: endY };
        hasLastPoint.value = true;

        runOnJS(addSegment)({
          type:        "rectangle",
          topLeft:     { x: Math.min(x1, endX), y: Math.min(y1, endY) },
          bottomRight: { x: Math.max(x1, endX), y: Math.max(y1, endY) },
          // store original corners for reference
          corner1:     { x: x1,   y: y1   },
          corner2:     { x: endX, y: endY },
        });
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        const x1 = lastPoint.value.x;
        const y1 = lastPoint.value.y;
        const cx = (x1 + endX) / 2;
        const cy = (y1 + endY) / 2;
        const r  = getDistance(x1, y1, endX, endY) / 2;

        previewPath.value  = Skia.Path.Make();
        lastPoint.value    = { x: endX, y: endY };
        hasLastPoint.value = true;

        runOnJS(addSegment)({
          type:   "circle",
          center: { x: cx,   y: cy   },
          radius: r,
          point1: { x: x1,   y: y1   },
          point2: { x: endX, y: endY },
        });
      }
    // ── TRIM ──────────────────────────────────────────────────────────────
        if (currentShapeSV.value === 4) {
        runOnJS(handleTrim)(endX, endY, scale.value); // read scale.value here, in the worklet
        }
    });

  // ── pinch ─────────────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  // ── two-finger pan ────────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(savedX.value + e.translationX, -LIMIT, LIMIT);
      translateY.value = clamp(savedY.value + e.translationY, -LIMIT, LIMIT);
    });

  const composed = Gesture.Simultaneous(pinch, pan, drawGesture);

  // ── render segments ───────────────────────────────────────────────────────
  const renderSegments = () =>
    shapeList.map((seg, index) => {

      if (seg.type === "line") {
        const p = Skia.Path.Make();
        p.moveTo(seg.startPoint.x, seg.startPoint.y);
        p.lineTo(seg.endPoint.x,   seg.endPoint.y);
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }

      if (seg.type === "rectangle") {
        const p = buildRectPath(
          seg.corner1.x, seg.corner1.y,
          seg.corner2.x, seg.corner2.y
        );
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }

      if (seg.type === "circle") {
        const p = Skia.Path.Make();
        p.addCircle(seg.center.x, seg.center.y, seg.radius);
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }

      if (seg.type === "arc") {
        const { cx, cy } = { cx: seg.center.x, cy: seg.center.y };
        const r          = seg.radius;
        let startDeg     = seg.startAngle * (180 / Math.PI);
        let sweepDeg     = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
        if (seg.clockwise) { if (sweepDeg < 0) sweepDeg += 360; }
        else               { if (sweepDeg > 0) sweepDeg -= 360; }
        const p = Skia.Path.Make();
        p.addArc(
          { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
          startDeg, sweepDeg
        );
        return <Path key={index} path={p} color="blue" style="stroke" strokeWidth={2} />;
      }

      return null;
    });

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width, height }]}>

      <View style={[styles.header, { height: HEADER_HEIGHT, width }]} />

      <GestureDetector gesture={composed}>
        <Canvas style={{ width, height: CANVAS_HEIGHT }}>
          <Group transform={transform}>
            <Grid />
            {renderSegments()}
            <Path path={animatedPreview} color="black" style="stroke" strokeWidth={2}>
              <DashPathEffect intervals={[6, 4]} />
            </Path>
            <Crosshair transform={transformCross} />
          </Group>
        </Canvas>
      </GestureDetector>

      <View style={[styles.footer, { height: FOOTER_HEIGHT, width }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 10 }}
        >
          {SHAPES.map((shape) => (
            <View
              key={shape}
              style={{
                backgroundColor: currentShape === shape ? "#333" : "#999",
                paddingHorizontal: 15,
                paddingVertical: 5,
                borderRadius: 5,
                marginRight: 10,
              }}
            >
              <Text
                style={{ color: '#fff', textTransform: 'capitalize' }}
                onPress={() => handleShapeChange(shape)}
              >
                {shape}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

    </View>
  );
};

export default Sketching2D;

const styles = StyleSheet.create({
  container: { backgroundColor: '#999' },
  header:    { backgroundColor: '#ccc' },
  footer:    { backgroundColor: '#ccc' },
});