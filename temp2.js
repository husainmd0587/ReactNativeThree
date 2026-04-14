import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Canvas,
  Group,
  Path,
  Skia,
  DashPathEffect,
  Circle,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

// ── Internal utilities & components ────────────────────────────────────────────
import Grid, { Crosshair } from './components/grid';
import { clamp } from './utils/math';
import { hitTestSegment } from './utils/trim/hitTest';
import { applyTrim } from './utils/trim/trim';
import { hitTestEndpoint, applyExtend } from './utils/extend/extend';
import { getAllIntersectionsPoints } from './utils/trim/intersect';
import { applyOffsetSingle, getSideFromTap } from './utils/offset/offset';
import {
  applyFilletToLines,
  applyChamferToLines,
  applyCornerToRect,
} from './utils/fillet/fillet';
import { translateSegments } from './utils/move/move';
import { cloneSegments, translateClones, commitCopy } from './utils/copy/copy';
import { applyMirror, mirrorSegment } from './utils/mirror/mirror';
import {
  applyRotate,
  computeRotationAngle,
  snapAngle,
  radToDeg,
  rotateSegment,
} from './utils/rotate/rotate';
import {
  applyScale,
  scaleSegment,
  computeScaleFactor,
  snapFactor,
  formatFactor,
} from './utils/scale/scale';
import {
  findSnapPoint,
  DEFAULT_SNAP_SETTINGS,
  SNAP_COLORS,
  SNAP_SHAPES,
} from './utils/snap/snap';
import {
  applyOrtho,
  formatAxis,
  computeAngleDeg,
  computeDist,
  POLAR_INCREMENTS,
  applyPolarTracking,
} from './utils/ortho/ortho';

// ── Layout constants ────────────────────────────────────────────────────────────
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;

// ── Tool definitions ────────────────────────────────────────────────────────────
const SHAPES = [
  'line', 'arc', 'rectangle', 'circle',
  'trim', 'extend', 'offset', 'fillet', 'chamfer',
  'move', 'copy', 'mirror', 'rotate', 'scale', 'erase',
];

const SHAPE_MAP = {
  line: 0, arc: 1, rectangle: 2, circle: 3,
  trim: 4, extend: 5, offset: 6, fillet: 7, chamfer: 8,
  move: 9, copy: 10, mirror: 11, rotate: 12, scale: 13, erase: 14,
};

// ════════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════════
const Sketching2D = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT;
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2;

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 1 · Viewport transform (pan + zoom)
  // ────────────────────────────────────────────────────────────────────────────
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;
  const LIMIT = 500;

  const scale      = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX     = useSharedValue(centerX);
  const savedY     = useSharedValue(centerY);
  const savedScale = useSharedValue(1);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 2 · OSNAP state
  // ────────────────────────────────────────────────────────────────────────────
  const [snapSettings,   setSnapSettings]   = useState(DEFAULT_SNAP_SETTINGS);
  const [activeSnap,     setActiveSnap]     = useState(null);
  const [showSnapPanel,  setShowSnapPanel]  = useState(false);
  const [currentScale,   setCurrentScale]   = useState(1);

  useDerivedValue(() => {
    runOnJS(setCurrentScale)(scale.value);
  });

  const constrainedX         = useSharedValue(0);
  const constrainedY         = useSharedValue(0);
  const lastConstrainedPoint = useRef({ x: 0, y: 0 });

  const seedConstrainedPoint = useCallback((x, y) => {
    lastConstrainedPoint.current = { x, y };
  }, []);

  // ── FIX 1: handleDrawUpdate ref pattern used everywhere ──────────────────────
  /**
   * handleDrawUpdateRef always holds the latest closure so worklets that call
   * runOnJS(handleDrawUpdateStable) never see stale ortho/polar/snap state.
   */
  const handleDrawUpdateRef = useRef(null);

  const handleDrawUpdate = useCallback((wx, wy) => {
    const from = hasLastPoint.value
      ? { x: lastPoint.value.x, y: lastPoint.value.y }
      : null;

    const constrained = constrainPoint(wx, wy, from);
    const snap = findSnapPoint(constrained.x, constrained.y, shapeList, snapSettings, from);

    const drawingModes = ['line', 'arc', 'rectangle', 'circle'];
    if (drawingModes.includes(currentShape)) setActiveSnap(snap);

    const finalX = snap ? snap.x : constrained.x;
    const finalY = snap ? snap.y : constrained.y;

    lastConstrainedPoint.current = { x: finalX, y: finalY };
    constrainedX.value = finalX;
    constrainedY.value = finalY;
  }, [constrainPoint, shapeList, snapSettings, currentShape]);

  // Always keep ref up to date — this is the key to fixing stale closures
  useEffect(() => { handleDrawUpdateRef.current = handleDrawUpdate; }, [handleDrawUpdate]);

  /**
   * STABLE wrapper — never re-created, safe to pass to runOnJS in worklets.
   * Always delegates to the latest handleDrawUpdate via the ref.
   * FIX: In onUpdate worklet use runOnJS(handleDrawUpdateStable) NOT runOnJS(handleDrawUpdate).
   */
  const handleDrawUpdateStable = useCallback((wx, wy) => {
    handleDrawUpdateRef.current?.(wx, wy);
  }, []);

  const commitLine = useCallback(() => {
    const startX = lastPoint.value.x;
    const startY = lastPoint.value.y;
    const { x: ex, y: ey } = lastConstrainedPoint.current;

    if (ex === 0 && ey === 0) return;

    lastPoint.value    = { x: ex, y: ey };
    previewPath.value  = Skia.Path.Make();
    constrainedX.value = ex;
    constrainedY.value = ey;

    addSegment({
      type: 'line',
      startPoint: { x: startX, y: startY },
      endPoint:   { x: ex,    y: ey     },
    });
    setActiveSnap(null);
    clearOrtho();
  }, [addSegment, clearOrtho]);

  const commitLineRef = useRef(null);
  useEffect(() => { commitLineRef.current = commitLine; }, [commitLine]);
  const commitLineStable = useCallback(() => { commitLineRef.current?.(); }, []);

  const getSnappedPoint = useCallback((wx, wy, fromPoint = null) => {
    const snap = findSnapPoint(wx, wy, shapeList, snapSettings, fromPoint);
    return snap ?? { x: wx, y: wy };
  }, [shapeList, snapSettings]);

  // ── Snap marker renderer ─────────────────────────────────────────────────────
  const renderSnapMarker = () => {
    if (!activeSnap) return null;

    const { x, y, type } = activeSnap;
    const color  = SNAP_COLORS[type]  ?? '#ffffff';
    const shape  = SNAP_SHAPES[type]  ?? 'dot';
    const size   = 8   / currentScale;
    const stroke = 1.5 / currentScale;
    const elements = [];

    if (shape === 'square') {
      const p = Skia.Path.Make();
      p.addRect({ x: x - size, y: y - size, width: size * 2, height: size * 2 });
      elements.push(<Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />);
    }
    if (shape === 'triangle') {
      const p = Skia.Path.Make();
      p.moveTo(x,         y - size * 1.2);
      p.lineTo(x + size,  y + size * 0.8);
      p.lineTo(x - size,  y + size * 0.8);
      p.close();
      elements.push(<Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />);
    }
    if (shape === 'circle') {
      const p = Skia.Path.Make();
      p.addCircle(x, y, size);
      elements.push(
        <Circle key="snap"      cx={x} cy={y} r={size} color="transparent" />,
        <Path   key="snap-ring" path={p} color={color} style="stroke" strokeWidth={stroke} />,
      );
    }
    if (shape === 'cross') {
      const p = Skia.Path.Make();
      p.moveTo(x - size, y - size); p.lineTo(x + size, y + size);
      p.moveTo(x + size, y - size); p.lineTo(x - size, y + size);
      elements.push(<Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />);
    }
    if (shape === 'L') {
      const p = Skia.Path.Make();
      p.moveTo(x - size, y - size);
      p.lineTo(x - size, y + size);
      p.lineTo(x + size, y + size);
      elements.push(<Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />);
    }
    if (shape === 'T') {
      const p = Skia.Path.Make();
      p.moveTo(x - size, y - size); p.lineTo(x + size, y - size);
      p.moveTo(x,        y - size); p.lineTo(x,        y + size);
      elements.push(<Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />);
    }
    if (shape === 'dot') {
      elements.push(<Circle key="snap" cx={x} cy={y} r={size * 0.5} color={color} />);
    }
    elements.push(
      <Circle key="snap-center" cx={x} cy={y} r={1.5 / (scale?.value ?? 1)} color={color} />
    );
    return elements;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 3 · Ortho & Polar tracking
  // ────────────────────────────────────────────────────────────────────────────
  const [orthoEnabled,    setOrthoEnabled]    = useState(false);
  const [polarEnabled,    setPolarEnabled]    = useState(false);
  const [orthoAxis,       setOrthoAxis]       = useState(null);
  const [liveStats,       setLiveStats]       = useState(null);
  const [polarIncrement,  setPolarIncrement]  = useState(15);
  const [polarSnapTol,    setPolarSnapTol]    = useState(5);
  const [polarTracking,   setPolarTracking]   = useState(null);

  const constrainPoint = useCallback((wx, wy, fromPoint) => {
    if (!fromPoint) return { x: wx, y: wy };

    if (orthoEnabled) {
      const result = applyOrtho(fromPoint.x, fromPoint.y, wx, wy, 'ortho');
      setOrthoAxis(result.axis);
      setPolarTracking(null);
      const dist     = computeDist(fromPoint.x, fromPoint.y, result.x, result.y);
      const angleDeg = computeAngleDeg(fromPoint.x, fromPoint.y, result.x, result.y);
      setLiveStats({ dist: Math.round(dist * 10) / 10, angleDeg: Math.round(angleDeg) });
      return { x: result.x, y: result.y };
    }

    if (polarEnabled) {
      const result = applyPolarTracking(
        fromPoint.x, fromPoint.y,
        wx, wy,
        polarIncrement,
        polarSnapTol,
      );
      setPolarTracking(result);
      setOrthoAxis(null);
      setLiveStats({ dist: result.dist, angleDeg: result.angleDeg });
      return { x: result.x, y: result.y };
    }

    setOrthoAxis(null);
    setPolarTracking(null);
    const dist     = computeDist(fromPoint.x, fromPoint.y, wx, wy);
    const angleDeg = computeAngleDeg(fromPoint.x, fromPoint.y, wx, wy);
    setLiveStats({ dist: Math.round(dist * 10) / 10, angleDeg: Math.round(angleDeg) });
    return { x: wx, y: wy };
  }, [orthoEnabled, polarEnabled, polarIncrement, polarSnapTol]);

  const clearOrtho = useCallback(() => {
    setOrthoAxis(null);
    setPolarTracking(null);
    setLiveStats(null);
  }, []);

  const handleOrthoToggle = useCallback(() => {
    const next = !orthoEnabled;
    setOrthoEnabled(next);
    if (next) setPolarEnabled(false);
    clearOrtho();
  }, [orthoEnabled, clearOrtho]);

  const handlePolarToggle = useCallback(() => {
    const next = !polarEnabled;
    setPolarEnabled(next);
    if (next) setOrthoEnabled(false);
    clearOrtho();
  }, [polarEnabled, clearOrtho]);

  const renderPolarGuides = () => {
    if (!polarEnabled || !polarTracking) return null;
    if (currentShape !== 'line')         return null;
    if (!hasLastPoint.value)             return null;

    const from     = { x: lastPoint.value.x, y: lastPoint.value.y };
    const elements = [];
    const ext      = 100000;
    const sw       = 1 / (scale?.value ?? 1);

    if (polarTracking.trackedAngle !== null) {
      const snapRad = polarTracking.trackedAngle * (Math.PI / 180);
      const gp = Skia.Path.Make();
      gp.moveTo(from.x - ext * Math.cos(snapRad), from.y - ext * Math.sin(snapRad));
      gp.lineTo(from.x + ext * Math.cos(snapRad), from.y + ext * Math.sin(snapRad));
      elements.push(
        <Path
          key="polar-guide"
          path={gp}
          color={polarTracking.snapped ? 'rgba(0,200,255,0.4)' : 'rgba(100,100,100,0.2)'}
          style="stroke"
          strokeWidth={sw}
        >
          <DashPathEffect intervals={[6, 6]} />
        </Path>
      );
    }

    const allAngles = [];
    for (let a = 0; a < 360; a += polarIncrement) allAngles.push(a);
    allAngles.forEach(deg => {
      if (deg === polarTracking.trackedAngle) return;
      const rad = deg * (Math.PI / 180);
      const fp  = Skia.Path.Make();
      fp.moveTo(from.x, from.y);
      fp.lineTo(from.x + ext * Math.cos(rad), from.y + ext * Math.sin(rad));
      elements.push(
        <Path key={`polar-all-${deg}`} path={fp} color="rgba(80,80,80,0.15)" style="stroke" strokeWidth={sw * 0.5}>
          <DashPathEffect intervals={[4, 8]} />
        </Path>
      );
    });

    if (polarTracking.snapped) {
      const sp = Skia.Path.Make();
      sp.addCircle(polarTracking.x, polarTracking.y, 6 / (scale?.value ?? 1));
      elements.push(
        <Path key="polar-snap-ring" path={sp} color="#00ccff" style="stroke" strokeWidth={sw * 1.5} />
      );
    }

    if (polarTracking.trackedAngle !== null && polarTracking.snapped) {
      const arcR = 20 / (scale?.value ?? 1);
      const ap   = Skia.Path.Make();
      ap.addArc(
        { x: from.x - arcR, y: from.y - arcR, width: arcR * 2, height: arcR * 2 },
        0,
        polarTracking.trackedAngle,
      );
      elements.push(
        <Path key="polar-arc" path={ap} color="rgba(0,200,255,0.5)" style="stroke" strokeWidth={sw} />
      );
    }

    return elements;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 4 · Canvas shared values
  // ────────────────────────────────────────────────────────────────────────────
  const translateCrossX = useSharedValue(0);
  const translateCrossY = useSharedValue(0);
  const transformCross  = useDerivedValue(() => [
    { translateX: translateCrossX.value },
    { translateY: translateCrossY.value },
  ]);

  const previewPath     = useSharedValue(Skia.Path.Make());
  const animatedPreview = useDerivedValue(() => previewPath.value);

  const lastPoint    = useSharedValue({ x: 0, y: 0 });
  const hasLastPoint = useSharedValue(false);

  const arcPhase = useSharedValue(0);
  const arcStart = useSharedValue({ x: 0, y: 0 });
  const arcEnd   = useSharedValue({ x: 0, y: 0 });

  const currentShapeSV = useSharedValue(0);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 5 · React state — shapes & tool selection
  // ────────────────────────────────────────────────────────────────────────────
  const [currentShape, setCurrentShape] = useState('line');
  const [shapeList,    setShapeList]    = useState([]);

  const shapeListRef = useRef(shapeList);
  useEffect(() => { shapeListRef.current = shapeList; }, [shapeList]);

  const addSegment = (segment) => setShapeList(prev => [...prev, segment]);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 6 · Tool switching
  // ────────────────────────────────────────────────────────────────────────────
  const handleShapeChange = useCallback((shape) => {
    setCurrentShape(shape);
    currentShapeSV.value = SHAPE_MAP[shape];
    arcPhase.value       = 0;
    previewPath.value    = Skia.Path.Make();
    setFilletFirstSelSynced(null);
    setSelectedIndices([]);
    setIsDragging(false);

    if (shape === 'fillet' || shape === 'chamfer') {
      setFilletMode(shape);
      filletModeRef.current = shape;
    }

    setCopyPhase(0);
    setCopyPreview([]);
    setCopyClones([]);
    setCopyBasePoint(null);
    setCopyCount(0);

    setMirrorPhase(0);
    setMirrorPt1(null);
    setMirrorPt2(null);
    setMirrorPreview([]);

    setRotatePhase(0);
    setRotateBase(null);
    setRotateDragRef(null);
    setRotateAngle(0);
    setRotatePreview([]);
    rotateBaseList.current = [];

    setScalePhase(0);
    setScaleBase(null);
    setScaleDragRef(null);
    setScaleFactor(1);
    setScalePreview([]);
    scaleBaseList.current = [];

    setEraseIndices([]);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 7 · Coordinate helpers
  // ────────────────────────────────────────────────────────────────────────────
  const CROSSHAIR_OFFSET = { x: 0, y: 50 };

  const toWorld = (sx, sy) => {
    'worklet';
    return {
      x: (sx - translateX.value - CROSSHAIR_OFFSET.x) / scale.value,
      y: (sy - translateY.value - CROSSHAIR_OFFSET.y) / scale.value,
    };
  };

  const getDistance = (x1, y1, x2, y2) => {
    'worklet';
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 8 · Path builders
  // ────────────────────────────────────────────────────────────────────────────
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

  const buildRectPathJS = (x1, y1, x2, y2) => {
    const p = Skia.Path.Make();
    p.moveTo(x1, y1);
    p.lineTo(x2, y1);
    p.lineTo(x2, y2);
    p.lineTo(x1, y2);
    p.close();
    return p;
  };

  const getArcFrom3Points = (x1, y1, x2, y2, xb, yb) => {
    'worklet';
    const D = 2 * (x1 * (y2 - yb) + x2 * (yb - y1) + xb * (y1 - y2));
    if (Math.abs(D) < 1e-6) return null;

    const ux = (
      (x1 * x1 + y1 * y1) * (y2 - yb) +
      (x2 * x2 + y2 * y2) * (yb - y1) +
      (xb * xb + yb * yb) * (y1 - y2)
    ) / D;
    const uy = (
      (x1 * x1 + y1 * y1) * (xb - x2) +
      (x2 * x2 + y2 * y2) * (x1 - xb) +
      (xb * xb + yb * yb) * (x2 - x1)
    ) / D;

    const r          = getDistance(ux, uy, x1, y1);
    const startAngle = Math.atan2(y1 - uy, x1 - ux);
    const endAngle   = Math.atan2(y2 - uy, x2 - ux);
    const midAngle   = Math.atan2(yb - uy, xb - ux);

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
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg);
    return p;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 9 · Chain / exit chain
  // ────────────────────────────────────────────────────────────────────────────
  const handleExitChain = useCallback(() => {
    hasLastPoint.value = false;
    lastPoint.value    = { x: 0, y: 0 };
    previewPath.value  = Skia.Path.Make();
    arcPhase.value     = 0;
    lastConstrainedPoint.current = { x: 0, y: 0 };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 10 · Trim
  // ────────────────────────────────────────────────────────────────────────────
  const handleTrim = useCallback((tx, ty, currentScale) => {
    setShapeList(prev => {
      const idx = prev.findIndex(seg => hitTestSegment(tx, ty, seg, 8 / currentScale));
      if (idx === -1) return prev;
      return applyTrim(prev, idx, tx, ty);
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 11 · Extend
  // ────────────────────────────────────────────────────────────────────────────
  const [extendState, setExtendState] = useState(null);
  const extendStateRef = useRef(null);

  const handleExtendStart = useCallback((wx, wy, currentScale) => {
    let found = null;
    shapeListRef.current.forEach((seg, i) => {
      if (found) return;
      const ep = hitTestEndpoint(wx, wy, seg, 14 / currentScale);
      if (ep) found = { segIndex: i, endpoint: ep };
    });
    extendStateRef.current = found;
    setExtendState(found);
  }, []);

  const handleExtendEnd = useCallback(() => {
    const state = extendStateRef.current;
    if (!state) return;
    setShapeList(prev => applyExtend(prev, state.segIndex, state.endpoint));
    extendStateRef.current = null;
    setExtendState(null);
  }, []);

  const renderExtendHandles = () => {
    if (!extendState) return null;
    const seg = shapeList[extendState.segIndex];
    let px, py;

    if (seg.type === 'line') {
      const pt = extendState.endpoint === 'end' ? seg.endPoint : seg.startPoint;
      px = pt.x; py = pt.y;
    }
    if (seg.type === 'arc') {
      const angle = extendState.endpoint === 'end' ? seg.endAngle : seg.startAngle;
      px = seg.center.x + seg.radius * Math.cos(angle);
      py = seg.center.y + seg.radius * Math.sin(angle);
    }
    if (px == null) return null;
    return <Circle cx={px} cy={py} r={8} color="orange" />;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 12 · Offset
  // ────────────────────────────────────────────────────────────────────────────
  const [offsetDistance, setOffsetDistance] = useState(10);
  const offsetDistanceRef = useRef(offsetDistance);
  useEffect(() => { offsetDistanceRef.current = offsetDistance; }, [offsetDistance]);

  const handleOffsetTap = useCallback((wx, wy, currentScale) => {
    const idx = shapeListRef.current.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) return;
    const seg  = shapeListRef.current[idx];
    const side = getSideFromTap(seg, wx, wy);
    setShapeList(prev => applyOffsetSingle(prev, idx, offsetDistanceRef.current, side));
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 13 · Fillet & Chamfer
  // ────────────────────────────────────────────────────────────────────────────
  const [filletRadius,    setFilletRadius]    = useState(10);
  const [filletMode,      setFilletMode]      = useState('fillet');
  const [filletFirstSel,  setFilletFirstSel]  = useState(null);
  const [chamferDistance, setChamferDistance] = useState(10);

  const filletFirstSelRef   = useRef(null);
  const filletRadiusRef     = useRef(filletRadius);
  const filletModeRef       = useRef(filletMode);
  const chamferDistanceRef  = useRef(10);

  useEffect(() => { filletFirstSelRef.current  = filletFirstSel;  }, [filletFirstSel]);
  useEffect(() => { filletRadiusRef.current    = filletRadius;    }, [filletRadius]);
  useEffect(() => { filletModeRef.current      = filletMode;      }, [filletMode]);
  useEffect(() => { chamferDistanceRef.current = chamferDistance; }, [chamferDistance]);

  const setFilletFirstSelSynced = (val) => {
    filletFirstSelRef.current = val;
    setFilletFirstSel(val);
  };

  const handleFilletTap = useCallback((wx, wy, currentScale) => {
    const idx = shapeListRef.current.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) { setFilletFirstSelSynced(null); return; }

    const seg      = shapeListRef.current[idx];
    const firstSel = filletFirstSelRef.current;
    const mode     = filletModeRef.current;
    const val      = mode === 'fillet' ? filletRadiusRef.current : chamferDistanceRef.current;

    if (seg.type === 'rectangle') {
      setShapeList(prev => applyCornerToRect(prev, idx, wx, wy, val, mode));
      setFilletFirstSelSynced(null);
      return;
    }

    if (!firstSel) {
      setFilletFirstSelSynced({ idx, tapX: wx, tapY: wy });
      return;
    }

    const { idx: idxA, tapX: tapAx, tapY: tapAy } = firstSel;
    if (idxA === idx) { setFilletFirstSelSynced(null); return; }

    setShapeList(prev =>
      mode === 'fillet'
        ? applyFilletToLines(prev, idxA, idx, tapAx, tapAy, wx, wy, val)
        : applyChamferToLines(prev, idxA, idx, tapAx, tapAy, wx, wy, val)
    );
    setFilletFirstSelSynced(null);
  }, []);

  const renderFilletHighlight = () => {
    if (!filletFirstSel || (currentShape !== 'fillet' && currentShape !== 'chamfer')) return null;
    const seg = shapeList[filletFirstSel.idx];
    if (!seg || seg.type !== 'line') return null;
    const p = Skia.Path.Make();
    p.moveTo(seg.startPoint.x, seg.startPoint.y);
    p.lineTo(seg.endPoint.x,   seg.endPoint.y);
    return <Path path={p} color="orange" style="stroke" strokeWidth={3} />;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 14 · Move
  // ────────────────────────────────────────────────────────────────────────────
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isDragging,      setIsDragging]      = useState(false);

  const selectedIndicesRef = useRef([]);
  const isDraggingRef      = useRef(false);
  const dragBaseList       = useRef([]);

  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
  useEffect(() => { isDraggingRef.current      = isDragging;      }, [isDragging]);

  const dragStartX  = useSharedValue(0);
  const dragStartY  = useSharedValue(0);
  const wasDragMove = useSharedValue(false);

  const handleMoveStart = useCallback((wx, wy) => {
    dragBaseList.current = shapeListRef.current;
  }, []);

  const handleMoveDragStart = useCallback(() => {
    if (selectedIndicesRef.current.length === 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handleMoveDrag = useCallback((dx, dy) => {
    if (selectedIndicesRef.current.length === 0) return;
    if (!isDraggingRef.current) return;
    setShapeList(
      translateSegments(dragBaseList.current, selectedIndicesRef.current, dx, dy)
    );
  }, []);

  const handleMoveEnd = useCallback((wasTap, ex, ey, currentScale) => {
    if (wasTap) {
      const idx = shapeListRef.current.findIndex(
        seg => hitTestSegment(ex, ey, seg, 8 / currentScale)
      );
      if (idx === -1) {
        setSelectedIndices([]);
        selectedIndicesRef.current = [];
      } else {
        const prev = selectedIndicesRef.current;
        const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
        selectedIndicesRef.current = next;
        setSelectedIndices(next);
      }
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    dragBaseList.current  = [];
  }, []);

  const renderMoveHighlights = () => {
    if (currentShape !== 'move') return null;
    return selectedIndices.map(idx => {
      const seg = shapeList[idx];
      if (!seg) return null;
      return renderSegmentColored(seg, `sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 15 · Copy
  // ────────────────────────────────────────────────────────────────────────────
  const [copyPhase,     setCopyPhase]     = useState(0);
  const [copyBasePoint, setCopyBasePoint] = useState(null);
  const [copyClones,    setCopyClones]    = useState([]);
  const [copyPreview,   setCopyPreview]   = useState([]);
  const [copyCount,     setCopyCount]     = useState(0);

  const copyDragStartX   = useSharedValue(0);
  const copyDragStartY   = useSharedValue(0);
  const copyPhaseRef     = useRef(0);
  const copyBasePointRef = useRef(null);
  const copyClonesRef    = useRef([]);

  useEffect(() => { copyPhaseRef.current     = copyPhase;     }, [copyPhase]);
  useEffect(() => { copyBasePointRef.current = copyBasePoint; }, [copyBasePoint]);
  useEffect(() => { copyClonesRef.current    = copyClones;    }, [copyClones]);

  const handleCopyTap = useCallback((wx, wy, currentScale) => {
    if (copyPhaseRef.current !== 0) return;
    const idx = shapeListRef.current.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) {
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
      return;
    }
    const prev = selectedIndicesRef.current;
    const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
    selectedIndicesRef.current = next;
    setSelectedIndices(next);
  }, []);

  const handleCopyDragUpdate = useCallback((wx, wy) => {
    if (copyPhaseRef.current === 0) {
      if (selectedIndicesRef.current.length === 0) return;
      const clones = cloneSegments(shapeListRef.current, selectedIndicesRef.current);
      copyClonesRef.current    = clones;
      copyBasePointRef.current = { x: wx, y: wy };
      copyPhaseRef.current     = 1;
      setCopyClones(clones);
      setCopyBasePoint({ x: wx, y: wy });
      setCopyPhase(1);
      return;
    }
    if (copyPhaseRef.current !== 1 || !copyBasePointRef.current) return;
    const dx = wx - copyBasePointRef.current.x;
    const dy = wy - copyBasePointRef.current.y;
    setCopyPreview(translateClones(copyClonesRef.current, dx, dy));
  }, []);

  const handleCopyDragEnd = useCallback((wx, wy, currentScale) => {
    if (copyPhaseRef.current === 0) {
      const idx = shapeListRef.current.findIndex(
        seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
      );
      if (idx === -1) {
        setSelectedIndices([]);
        selectedIndicesRef.current = [];
      } else {
        const prev = selectedIndicesRef.current;
        const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
        selectedIndicesRef.current = next;
        setSelectedIndices(next);
      }
      return;
    }
    if (!copyBasePointRef.current) return;
    const dx = wx - copyBasePointRef.current.x;
    const dy = wy - copyBasePointRef.current.y;
    setShapeList(prev => commitCopy(prev, copyClonesRef.current, dx, dy));
    setCopyCount(prev => prev + 1);
    copyPhaseRef.current     = 0;
    copyBasePointRef.current = null;
    setCopyPhase(0);
    setCopyPreview([]);
    setCopyBasePoint(null);
  }, []);

  const handleCopyDone = useCallback(() => {
    setCopyPhase(0);
    setCopyPreview([]);
    setCopyClones([]);
    setCopyBasePoint(null);
    setSelectedIndices([]);
    setCopyCount(0);
  }, []);

  const renderCopyHighlights = () => {
    if (currentShape !== 'copy') return null;
    return selectedIndices.map(idx => {
      const seg = shapeList[idx];
      if (!seg) return null;
      return renderSegmentColored(seg, `copy-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
    });
  };

  const renderCopyPreview = () => {
    if (currentShape !== 'copy' || copyPreview.length === 0) return null;
    return copyPreview.map((seg, i) =>
      renderSegmentColored(seg, `copy-prev-${i}`, '#00b84a', 2, true)
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 16 · Mirror
  // ────────────────────────────────────────────────────────────────────────────
  const [mirrorPhase,   setMirrorPhase]   = useState(0);
  const [mirrorPt1,     setMirrorPt1]     = useState(null);
  const [mirrorPt2,     setMirrorPt2]     = useState(null);
  const [mirrorPreview, setMirrorPreview] = useState([]);
  const mirrorLiveX = useSharedValue(0);
  const mirrorLiveY = useSharedValue(0);

  const handleMirrorTap = useCallback((wx, wy, currentScale) => {
    if (mirrorPhase !== 0) return;
    const idx = shapeList.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, [shapeList, mirrorPhase]);

  const handleMirrorLinePt1 = useCallback((wx, wy) => {
    setMirrorPt1({ x: wx, y: wy });
    setMirrorPt2({ x: wx, y: wy });
    setMirrorPhase(2);
  }, []);

  const handleMirrorLineUpdate = useCallback((wx, wy) => {
    if (mirrorPhase !== 2 || !mirrorPt1) return;
    setMirrorPt2({ x: wx, y: wy });
    if (selectedIndices.length > 0) {
      const preview = selectedIndices.map(i =>
        mirrorSegment(shapeList[i], mirrorPt1.x, mirrorPt1.y, wx, wy)
      );
      setMirrorPreview(preview);
    }
  }, [mirrorPhase, mirrorPt1, shapeList, selectedIndices]);

  const handleMirrorLineEnd = useCallback((wx, wy) => {
    if (!mirrorPt1) return;
    if (Math.hypot(wx - mirrorPt1.x, wy - mirrorPt1.y) < 2) {
      setMirrorPhase(1);
      return;
    }
    if (selectedIndices.length > 0) {
      setShapeList(prev =>
        applyMirror(prev, selectedIndices, mirrorPt1.x, mirrorPt1.y, wx, wy)
      );
    }
    setMirrorPhase(0);
    setMirrorPt1(null);
    setMirrorPt2(null);
    setMirrorPreview([]);
  }, [mirrorPt1, selectedIndices]);

  const handleStartMirrorLine = useCallback(() => {
    if (selectedIndices.length === 0) return;
    setMirrorPhase(1);
  }, [selectedIndices]);

  const handleMirrorDone = useCallback(() => {
    setMirrorPhase(0);
    setMirrorPt1(null);
    setMirrorPt2(null);
    setMirrorPreview([]);
    setSelectedIndices([]);
  }, []);

  const handleMirrorGestureEnd = useCallback((wx, wy, currentScale) => {
    if (mirrorPhase === 0)      handleMirrorTap(wx, wy, currentScale);
    else if (mirrorPhase === 1) handleMirrorLinePt1(wx, wy);
    else if (mirrorPhase === 2) handleMirrorLineEnd(wx, wy);
  }, [mirrorPhase, handleMirrorTap, handleMirrorLinePt1, handleMirrorLineEnd]);

  const renderMirrorOverlay = () => {
    if (currentShape !== 'mirror') return null;
    const elements = [];

    selectedIndices.forEach(idx => {
      const el = renderSegmentColored(shapeList[idx], `mir-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
      if (el) elements.push(el);
    });

    if (mirrorPt1 && mirrorPt2) {
      const dx  = mirrorPt2.x - mirrorPt1.x;
      const dy  = mirrorPt2.y - mirrorPt1.y;
      const len = Math.hypot(dx, dy) || 1;
      const ext = 2000;
      const ux  = dx / len;
      const uy  = dy / len;
      const lp  = Skia.Path.Make();
      lp.moveTo(mirrorPt1.x - ux * ext, mirrorPt1.y - uy * ext);
      lp.lineTo(mirrorPt1.x + ux * ext, mirrorPt1.y + uy * ext);
      elements.push(
        <Path key="mirror-line" path={lp} color="orange" style="stroke" strokeWidth={1.5}>
          <DashPathEffect intervals={[8, 6]} />
        </Path>,
        <Circle key="mir-pt1" cx={mirrorPt1.x} cy={mirrorPt1.y} r={4} color="orange" />,
        <Circle key="mir-pt2" cx={mirrorPt2.x} cy={mirrorPt2.y} r={4} color="orange" />,
      );
    }

    mirrorPreview.forEach((seg, i) => {
      const el = renderSegmentColored(seg, `mir-prev-${i}`, '#00cc66', 2, true);
      if (el) elements.push(el);
    });

    return elements;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 17 · Rotate
  // ────────────────────────────────────────────────────────────────────────────
  const [rotatePhase,   setRotatePhase]   = useState(0);
  const [rotateBase,    setRotateBase]    = useState(null);
  const [rotateDragRef, setRotateDragRef] = useState(null);
  const [rotateAngle,   setRotateAngle]   = useState(0);
  const [rotatePreview, setRotatePreview] = useState([]);
  const [rotateSnap,    setRotateSnap]    = useState(true);

  const rotateBaseList = useRef([]);

  const handleRotateTap = useCallback((wx, wy, currentScale) => {
    if (rotatePhase !== 0) return;
    const idx = shapeList.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / currentScale));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, [shapeList, rotatePhase]);

  const handleRotateSetBase = useCallback((wx, wy) => {
    if (rotatePhase !== 1) return;
    setRotateBase({ x: wx, y: wy });
    setRotatePhase(2);
  }, [rotatePhase]);

  const handleRotateDragStart = useCallback((wx, wy) => {
    if (rotatePhase !== 2 || !rotateBase) return;
    rotateBaseList.current = shapeList;
    setRotateDragRef({ x: wx, y: wy });
    setRotateAngle(0);
  }, [rotatePhase, rotateBase, shapeList]);

  const handleRotateDragUpdate = useCallback((wx, wy) => {
    if (rotatePhase !== 2 || !rotateBase || !rotateDragRef) return;
    let angle = computeRotationAngle(
      rotateBase.x, rotateBase.y,
      rotateDragRef.x, rotateDragRef.y,
      wx, wy,
    );
    if (rotateSnap) angle = snapAngle(angle, 15);
    setRotateAngle(angle);
    const preview = selectedIndices.flatMap(i => {
      const rotated = rotateSegment(rotateBaseList.current[i], rotateBase.x, rotateBase.y, angle);
      return Array.isArray(rotated) ? rotated : [rotated];
    });
    setRotatePreview(preview);
  }, [rotatePhase, rotateBase, rotateDragRef, rotateSnap, selectedIndices]);

  const handleRotateDragEnd = useCallback((wx, wy) => {
    if (rotatePhase !== 2 || !rotateBase || !rotateDragRef) return;
    let angle = computeRotationAngle(
      rotateBase.x, rotateBase.y,
      rotateDragRef.x, rotateDragRef.y,
      wx, wy,
    );
    if (rotateSnap) angle = snapAngle(angle, 15);
    setShapeList(prev => applyRotate(prev, selectedIndices, rotateBase.x, rotateBase.y, angle));
    setRotateDragRef(null);
    setRotatePreview([]);
    setRotateAngle(0);
    rotateBaseList.current = [];
  }, [rotatePhase, rotateBase, rotateDragRef, rotateSnap, selectedIndices]);

  const handleRotateGestureEnd = useCallback((wx, wy, currentScale) => {
    if (rotatePhase === 0)      handleRotateTap(wx, wy, currentScale);
    else if (rotatePhase === 1) handleRotateSetBase(wx, wy);
    else if (rotatePhase === 2) handleRotateDragEnd(wx, wy);
  }, [rotatePhase, handleRotateTap, handleRotateSetBase, handleRotateDragEnd]);

  const handleRotateDone = useCallback(() => {
    setRotatePhase(0);
    setRotateBase(null);
    setRotateDragRef(null);
    setRotateAngle(0);
    setRotatePreview([]);
    setSelectedIndices([]);
    rotateBaseList.current = [];
  }, []);

  const renderRotateOverlay = () => {
    if (currentShape !== 'rotate') return null;
    const elements = [];

    selectedIndices.forEach(idx => {
      const el = renderSegmentColored(shapeList[idx], `rot-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
      if (el) elements.push(el);
    });

    if (rotateBase) {
      const bp = Skia.Path.Make();
      bp.addCircle(rotateBase.x, rotateBase.y, 8);
      elements.push(<Path key="rot-base-circle" path={bp} color="orange" style="stroke" strokeWidth={2} />);
      const cp = Skia.Path.Make();
      cp.moveTo(rotateBase.x - 12, rotateBase.y); cp.lineTo(rotateBase.x + 12, rotateBase.y);
      cp.moveTo(rotateBase.x, rotateBase.y - 12); cp.lineTo(rotateBase.x, rotateBase.y + 12);
      elements.push(<Path key="rot-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />);

      if (rotateDragRef) {
        const rl = Skia.Path.Make();
        rl.moveTo(rotateBase.x, rotateBase.y);
        rl.lineTo(rotateDragRef.x, rotateDragRef.y);
        elements.push(
          <Path key="rot-ref-line" path={rl} color="rgba(255,165,0,0.4)" style="stroke" strokeWidth={1}>
            <DashPathEffect intervals={[4, 4]} />
          </Path>
        );
      }
    }

    rotatePreview.forEach((seg, i) => {
      const el = renderSegmentColored(seg, `rot-prev-${i}`, '#00ccff', 2, true);
      if (el) elements.push(el);
    });

    return elements;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 18 · Scale
  // ────────────────────────────────────────────────────────────────────────────
  const [scalePhase,   setScalePhase]   = useState(0);
  const [scaleBase,    setScaleBase]    = useState(null);
  const [scaleDragRef, setScaleDragRef] = useState(null);
  const [scaleFactor,  setScaleFactor]  = useState(1);
  const [scalePreview, setScalePreview] = useState([]);
  const [scaleSnap,    setScaleSnap]    = useState(true);

  const scaleBaseList = useRef([]);

  const handleScaleTap = useCallback((wx, wy, currentScale) => {
    if (scalePhase !== 0) return;
    const idx = shapeList.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / currentScale));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, [shapeList, scalePhase]);

  const handleScaleSetBase = useCallback((wx, wy) => {
    if (scalePhase !== 1) return;
    setScaleBase({ x: wx, y: wy });
    setScalePhase(2);
  }, [scalePhase]);

  const handleScaleDragStart = useCallback((wx, wy) => {
    if (scalePhase !== 2 || !scaleBase) return;
    scaleBaseList.current = shapeList;
    setScaleDragRef({ x: wx, y: wy });
    setScaleFactor(1);
  }, [scalePhase, scaleBase, shapeList]);

  const handleScaleDragUpdate = useCallback((wx, wy) => {
    if (scalePhase !== 2 || !scaleBase || !scaleDragRef) return;
    let factor = computeScaleFactor(
      scaleBase.x, scaleBase.y,
      scaleDragRef.x, scaleDragRef.y,
      wx, wy,
    );
    factor = Math.max(0.05, Math.min(20, factor));
    if (scaleSnap) factor = snapFactor(factor);
    setScaleFactor(factor);
    const preview = selectedIndices.flatMap(i => {
      const scaled = scaleSegment(scaleBaseList.current[i], scaleBase.x, scaleBase.y, factor);
      return Array.isArray(scaled) ? scaled : [scaled];
    });
    setScalePreview(preview);
  }, [scalePhase, scaleBase, scaleDragRef, scaleSnap, selectedIndices]);

  const handleScaleDragEnd = useCallback((wx, wy) => {
    if (scalePhase !== 2 || !scaleBase || !scaleDragRef) return;
    let factor = computeScaleFactor(
      scaleBase.x, scaleBase.y,
      scaleDragRef.x, scaleDragRef.y,
      wx, wy,
    );
    factor = Math.max(0.05, Math.min(20, factor));
    if (scaleSnap) factor = snapFactor(factor);
    setShapeList(prev => applyScale(prev, selectedIndices, scaleBase.x, scaleBase.y, factor));
    setScaleDragRef(null);
    setScalePreview([]);
    setScaleFactor(1);
    scaleBaseList.current = [];
  }, [scalePhase, scaleBase, scaleDragRef, scaleSnap, selectedIndices]);

  const handleScalePreset = useCallback((factor) => {
    if (!scaleBase || selectedIndices.length === 0) return;
    setShapeList(prev => applyScale(prev, selectedIndices, scaleBase.x, scaleBase.y, factor));
    setScalePreview([]);
    setScaleFactor(1);
    scaleBaseList.current = [];
  }, [scaleBase, selectedIndices]);

  const handleScaleGestureEnd = useCallback((wx, wy, currentScale) => {
    if (scalePhase === 0)      handleScaleTap(wx, wy, currentScale);
    else if (scalePhase === 1) handleScaleSetBase(wx, wy);
    else if (scalePhase === 2) handleScaleDragEnd(wx, wy);
  }, [scalePhase, handleScaleTap, handleScaleSetBase, handleScaleDragEnd]);

  const handleScaleDone = useCallback(() => {
    setScalePhase(0);
    setScaleBase(null);
    setScaleDragRef(null);
    setScaleFactor(1);
    setScalePreview([]);
    setSelectedIndices([]);
    scaleBaseList.current = [];
  }, []);

  const renderScaleOverlay = () => {
    if (currentShape !== 'scale') return null;
    const elements = [];

    selectedIndices.forEach(idx => {
      const el = renderSegmentColored(shapeList[idx], `sc-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
      if (el) elements.push(el);
    });

    if (scaleBase) {
      if (scaleDragRef) {
        const refDist = Math.hypot(scaleDragRef.x - scaleBase.x, scaleDragRef.y - scaleBase.y);
        if (refDist > 4) {
          const rp = Skia.Path.Make();
          rp.addCircle(scaleBase.x, scaleBase.y, refDist);
          elements.push(
            <Path key="sc-ref-ring" path={rp} color="rgba(255,165,0,0.25)" style="stroke" strokeWidth={1}>
              <DashPathEffect intervals={[4, 4]} />
            </Path>
          );
          const cr = Skia.Path.Make();
          cr.addCircle(scaleBase.x, scaleBase.y, refDist * scaleFactor);
          elements.push(<Path key="sc-cur-ring" path={cr} color="rgba(0,200,255,0.4)" style="stroke" strokeWidth={1.5} />);
          const dl = Skia.Path.Make();
          dl.moveTo(scaleBase.x, scaleBase.y);
          dl.lineTo(scaleDragRef.x, scaleDragRef.y);
          elements.push(
            <Path key="sc-drag-line" path={dl} color="rgba(255,165,0,0.5)" style="stroke" strokeWidth={1}>
              <DashPathEffect intervals={[4, 4]} />
            </Path>
          );
        }
      }
      const bp = Skia.Path.Make();
      bp.addCircle(scaleBase.x, scaleBase.y, 8);
      elements.push(<Path key="sc-base-ring" path={bp} color="orange" style="stroke" strokeWidth={2} />);
      const cp = Skia.Path.Make();
      cp.moveTo(scaleBase.x - 12, scaleBase.y); cp.lineTo(scaleBase.x + 12, scaleBase.y);
      cp.moveTo(scaleBase.x, scaleBase.y - 12); cp.lineTo(scaleBase.x, scaleBase.y + 12);
      elements.push(<Path key="sc-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />);
    }

    scalePreview.forEach((seg, i) => {
      const el = renderSegmentColored(seg, `sc-prev-${i}`, '#00ccff', 2, true);
      if (el) elements.push(el);
    });

    return elements;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 19 · Erase
  // ────────────────────────────────────────────────────────────────────────────
  const [eraseIndices, setEraseIndices] = useState([]);

  const handleEraseTap = useCallback((wx, wy, currentScale) => {
    const idx = shapeList.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) return;
    setEraseIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, [shapeList]);

  const handleEraseConfirm = useCallback(() => {
    setShapeList(prev => prev.filter((_, i) => !eraseIndices.includes(i)));
    setEraseIndices([]);
  }, [eraseIndices]);

  const handleEraseCancel = useCallback(() => setEraseIndices([]), []);

  const renderEraseOverlay = () => {
    if (currentShape !== 'erase') return null;
    return eraseIndices.map(idx => {
      const seg = shapeList[idx];
      if (!seg) return null;
      return renderSegmentColored(seg, `era-${idx}`, 'rgba(220,50,50,0.85)', 6);
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 20 · Shared segment renderer
  // ────────────────────────────────────────────────────────────────────────────
  const renderSegmentColored = (seg, key, color, strokeWidth = 2, dashed = false) => {
    let path = null;

    if (seg.type === 'line') {
      const p = Skia.Path.Make();
      p.moveTo(seg.startPoint.x, seg.startPoint.y);
      p.lineTo(seg.endPoint.x,   seg.endPoint.y);
      path = p;
    }
    if (seg.type === 'arc') {
      const r = seg.radius;
      let startDeg = seg.startAngle * (180 / Math.PI);
      let sweepDeg = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
      if (seg.clockwise) { if (sweepDeg < 0) sweepDeg += 360; }
      else               { if (sweepDeg > 0) sweepDeg -= 360; }
      const p = Skia.Path.Make();
      p.addArc(
        { x: seg.center.x - r, y: seg.center.y - r, width: r * 2, height: r * 2 },
        startDeg, sweepDeg,
      );
      path = p;
    }
    if (seg.type === 'circle') {
      const p = Skia.Path.Make();
      p.addCircle(seg.center.x, seg.center.y, seg.radius);
      path = p;
    }
    if (seg.type === 'rectangle') {
      path = buildRectPathJS(seg.corner1.x, seg.corner1.y, seg.corner2.x, seg.corner2.y);
    }
    if (!path) return null;

    return (
      <Path key={key} path={path} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dashed && <DashPathEffect intervals={[6, 4]} />}
      </Path>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 21 · Intersection debug overlay
  // ────────────────────────────────────────────────────────────────────────────
  const DrawIntersections = () => {
    const intersections = getAllIntersectionsPoints(shapeList);
    return (
      <>
        {intersections.map((inter, index) => (
          <Circle key={index} cx={inter.point.x} cy={inter.point.y} r={2} color="red" />
        ))}
      </>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 22 · Committed segment renderer
  // ────────────────────────────────────────────────────────────────────────────
  const renderSegments = () =>
    shapeList.map((seg, index) => {
      if (seg.type === 'line') {
        const p = Skia.Path.Make();
        p.moveTo(seg.startPoint.x, seg.startPoint.y);
        p.lineTo(seg.endPoint.x,   seg.endPoint.y);
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }
      if (seg.type === 'rectangle') {
        const p = buildRectPathJS(seg.corner1.x, seg.corner1.y, seg.corner2.x, seg.corner2.y);
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }
      if (seg.type === 'circle') {
        const p = Skia.Path.Make();
        p.addCircle(seg.center.x, seg.center.y, seg.radius);
        return <Path key={index} path={p} color="black" style="stroke" strokeWidth={2} />;
      }
      if (seg.type === 'arc') {
        const { cx, cy } = { cx: seg.center.x, cy: seg.center.y };
        const r      = seg.radius;
        let startDeg = seg.startAngle * (180 / Math.PI);
        let sweepDeg = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
        if (seg.clockwise) { if (sweepDeg < 0) sweepDeg += 360; }
        else               { if (sweepDeg > 0) sweepDeg -= 360; }
        const p = Skia.Path.Make();
        p.addArc(
          { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
          startDeg, sweepDeg,
        );
        return <Path key={index} path={p} color="blue" style="stroke" strokeWidth={2} />;
      }
      return null;
    });

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 23 · Navigation
  // ────────────────────────────────────────────────────────────────────────────
  const sendToExtrudeScreen = () => {
    navigation.navigate('Main3D', { segments: shapeList });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 24 · Gesture recognisers
  // ────────────────────────────────────────────────────────────────────────────

  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onStart((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx;
      translateCrossY.value = wy;

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        if (!hasLastPoint.value) {
          lastPoint.value    = { x: wx, y: wy };
          hasLastPoint.value = true;
          constrainedX.value = wx;
          constrainedY.value = wy;
          runOnJS(seedConstrainedPoint)(wx, wy);
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
        previewPath.value = buildArcPath(
          arcStart.value.x, arcStart.value.y,
          arcEnd.value.x,   arcEnd.value.y,
          wx, wy,
        );
      }

      // ── RECTANGLE ─────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        if (!hasLastPoint.value) {
          lastPoint.value    = { x: wx, y: wy };
          hasLastPoint.value = true;
        }
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

      // ── TRIM ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 4) {
        runOnJS(handleTrim)(wx, wy, scale.value);
      }

      // ── OFFSET ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 6) {
        runOnJS(handleOffsetTap)(wx, wy, scale.value);
      }

      // ── EXTEND ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 5) {
        runOnJS(handleExtendStart)(wx, wy, scale.value);
      }

      // ── MOVE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        dragStartX.value  = wx;
        dragStartY.value  = wy;
        wasDragMove.value = false;
        runOnJS(handleMoveStart)(wx, wy);
      }

      // ── COPY ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 10) {
        copyDragStartX.value = wx;
        copyDragStartY.value = wy;
      }

      // ── MIRROR ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 11) {
        mirrorLiveX.value = wx;
        mirrorLiveY.value = wy;
      }

      // ── ROTATE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 12) {
        runOnJS(handleRotateDragStart)(wx, wy);
      }

      // ── SCALE ─────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 13) {
        runOnJS(handleScaleDragStart)(wx, wy);
      }
    })

    .onUpdate((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx;
      translateCrossY.value = wy;

      // ── LINE preview — FIX 2: draw raw preview immediately on UI thread ───
      // This makes the rubber-band feel instant. The JS snap/ortho correction
      // updates constrainedX/Y asynchronously and only affects the committed point.
      if (currentShapeSV.value === 0 && hasLastPoint.value) {
        // Immediate raw preview (no JS-thread wait) — eliminates lag
        const p = Skia.Path.Make();
        p.moveTo(lastPoint.value.x, lastPoint.value.y);
        p.lineTo(wx, wy);
        previewPath.value = p;
        // Kick off JS for snap/ortho — result written to constrainedX/Y for commit
        // FIX 1: use handleDrawUpdateStable (via ref) NOT handleDrawUpdate (stale closure)
        runOnJS(handleDrawUpdateStable)(wx, wy);
      }

      // ── ARC / RECT / CIRCLE — also call stable update for snap markers ────
      if ([1, 2, 3].includes(currentShapeSV.value)) {
        // FIX 1: use handleDrawUpdateStable here too
        runOnJS(handleDrawUpdateStable)(wx, wy);
      }

      // ── ARC phase 0 preview ───────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        const p = Skia.Path.Make();
        p.moveTo(arcStart.value.x, arcStart.value.y);
        p.lineTo(wx, wy);
        previewPath.value = p;
      }

      // ── ARC phase 1 preview ───────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        previewPath.value = buildArcPath(
          arcStart.value.x, arcStart.value.y,
          arcEnd.value.x,   arcEnd.value.y,
          wx, wy,
        );
      }

      // ── RECTANGLE preview ─────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        previewPath.value = buildRectPath(lastPoint.value.x, lastPoint.value.y, wx, wy);
      }

      // ── CIRCLE preview ────────────────────────────────────────────────────
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

      // ── MOVE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        const dx = wx - dragStartX.value;
        const dy = wy - dragStartY.value;
        if (!wasDragMove.value && Math.hypot(dx, dy) > 6 / scale.value) {
          wasDragMove.value = true;
          runOnJS(handleMoveDragStart)();
        }
        if (wasDragMove.value) runOnJS(handleMoveDrag)(dx, dy);
      }

      // ── COPY ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 10) {
        runOnJS(handleCopyDragUpdate)(wx, wy);
      }

      // ── MIRROR ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 11) {
        mirrorLiveX.value = wx;
        mirrorLiveY.value = wy;
        runOnJS(handleMirrorLineUpdate)(wx, wy);
      }

      // ── ROTATE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 12) {
        runOnJS(handleRotateDragUpdate)(wx, wy);
      }

      // ── SCALE ─────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 13) {
        runOnJS(handleScaleDragUpdate)(wx, wy);
      }
    })

    .onEnd(() => {
      'worklet';
      const endX = currentShapeSV.value === 0 ? constrainedX.value : translateCrossX.value;
      const endY = currentShapeSV.value === 0 ? constrainedY.value : translateCrossY.value;

      // ── LINE — commit uses constrainedX/Y (JS-corrected snap/ortho point) ──
      if (currentShapeSV.value === 0) {
        runOnJS(commitLineStable)();
      }

      // ── ARC phase 0 → lock end ─────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        arcEnd.value   = { x: endX, y: endY };
        arcPhase.value = 1;
        const p = Skia.Path.Make();
        p.moveTo(arcStart.value.x, arcStart.value.y);
        p.lineTo(endX, endY);
        previewPath.value = p;
      }

      // ── ARC phase 1 → commit arc ───────────────────────────────────────────
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
            type:       'arc',
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

      // ── RECTANGLE ──────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        const x1 = lastPoint.value.x;
        const y1 = lastPoint.value.y;
        previewPath.value  = Skia.Path.Make();
        lastPoint.value    = { x: endX, y: endY };
        hasLastPoint.value = true;
        runOnJS(addSegment)({
          type:        'rectangle',
          topLeft:     { x: Math.min(x1, endX), y: Math.min(y1, endY) },
          bottomRight: { x: Math.max(x1, endX), y: Math.max(y1, endY) },
          corner1:     { x: x1,   y: y1   },
          corner2:     { x: endX, y: endY },
        });
      }

      // ── CIRCLE ─────────────────────────────────────────────────────────────
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
          type:   'circle',
          center: { x: cx, y: cy },
          radius: r,
          point1: { x: x1,   y: y1   },
          point2: { x: endX, y: endY },
        });
      }

      // ── EXTEND ─────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 5) {
        runOnJS(handleExtendEnd)(endX, endY);
      }

      // ── FILLET / CHAMFER ───────────────────────────────────────────────────
      if (currentShapeSV.value === 7 || currentShapeSV.value === 8) {
        runOnJS(handleFilletTap)(endX, endY, scale.value);
      }

      // ── MOVE ───────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        const wasTap = !wasDragMove.value;
        runOnJS(handleMoveEnd)(wasTap, endX, endY, scale.value);
      }

      // ── COPY ───────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 10) {
        runOnJS(handleCopyDragEnd)(endX, endY, scale.value);
      }

      // ── MIRROR ─────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 11) {
        runOnJS(handleMirrorGestureEnd)(endX, endY, scale.value);
      }

      // ── ROTATE ─────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 12) {
        runOnJS(handleRotateGestureEnd)(endX, endY, scale.value);
      }

      // ── SCALE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 13) {
        runOnJS(handleScaleGestureEnd)(endX, endY, scale.value);
      }

      // ── ERASE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 14) {
        runOnJS(handleEraseTap)(endX, endY, scale.value);
      }
    });

  /** Pinch to zoom */
  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  /** Two-finger pan */
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

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 25 · JSX
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width, height }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { height: HEADER_HEIGHT, width }]} />

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <GestureDetector gesture={composed}>
        <Canvas style={{ width, height: CANVAS_HEIGHT }}>
          <Group transform={transform}>
            <Grid />

            {/* Committed geometry */}
            {renderSegments()}

            {/* Dashed live preview while drawing */}
            <Path path={animatedPreview} color="black" style="stroke" strokeWidth={2}>
              <DashPathEffect intervals={[6, 4]} />
            </Path>

            {/* Crosshair */}
            <Crosshair transform={transformCross} />

            {/* Debug: intersection dots */}
            <DrawIntersections />

            {/* Tool overlays */}
            {renderExtendHandles()}
            {renderFilletHighlight()}
            {renderMoveHighlights()}
            {renderCopyHighlights()}
            {renderCopyPreview()}
            {renderMirrorOverlay()}
            {renderRotateOverlay()}
            {renderScaleOverlay()}
            {renderEraseOverlay()}

            {/* OSNAP marker */}
            {renderSnapMarker()}

            {/* Polar guide lines */}
            {renderPolarGuides()}
          </Group>
        </Canvas>
      </GestureDetector>

      {/* ── Footer toolbar ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, { height: FOOTER_HEIGHT, width }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.footerScroll}
        >
          {/* Tool buttons */}
          {SHAPES.map((shape) => (
            <TouchableOpacity
              key={shape}
              style={[styles.toolBtn, currentShape === shape && styles.toolBtnActive]}
              onPress={() => handleShapeChange(shape)}
            >
              <Text style={styles.toolBtnText}>{shape}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.toolBtn} onPress={sendToExtrudeScreen}>
            <Text style={styles.toolBtnText}>Extrude</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newChainBtn} onPress={handleExitChain}>
            <Text style={styles.toolBtnText}>✕ New</Text>
          </TouchableOpacity>

          {/* ── Offset controls ──────────────────────────────────────────────── */}
          {currentShape === 'offset' && (
            <View style={styles.ctxRow}>
              <Text style={styles.ctxLabel}>Distance:</Text>
              {[5, 10, 20, 50].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.ctxChip, offsetDistance === d && styles.ctxChipActive]}
                  onPress={() => setOffsetDistance(d)}
                >
                  <Text style={[styles.ctxChipText, offsetDistance === d && styles.ctxChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Fillet / Chamfer controls ─────────────────────────────────────── */}
          {(currentShape === 'fillet' || currentShape === 'chamfer') && (
            <View style={styles.ctxRow}>
              {['fillet', 'chamfer'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.ctxChip, filletMode === m && styles.ctxChipActive]}
                  onPress={() => {
                    setFilletMode(m);
                    currentShapeSV.value = SHAPE_MAP[m];
                    setFilletFirstSelSynced(null);
                    filletModeRef.current = m;
                  }}
                >
                  <Text style={[styles.ctxChipText, filletMode === m && styles.ctxChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}

              {filletMode === 'fillet' && (
                <>
                  <Text style={styles.ctxLabel}>R:</Text>
                  {[5, 10, 20, 30].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.ctxChip, filletRadius === r && styles.ctxChipActive]}
                      onPress={() => { setFilletRadius(r); filletRadiusRef.current = r; }}
                    >
                      <Text style={[styles.ctxChipText, filletRadius === r && styles.ctxChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {filletMode === 'chamfer' && (
                <>
                  <Text style={styles.ctxLabel}>D:</Text>
                  {[5, 10, 20, 30].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.ctxChip, chamferDistance === d && styles.ctxChipActive]}
                      onPress={() => { setChamferDistance(d); chamferDistanceRef.current = d; }}
                    >
                      <Text style={[styles.ctxChipText, chamferDistance === d && styles.ctxChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {filletFirstSel && <Text style={styles.hintText}>Tap 2nd line</Text>}
            </View>
          )}

          {/* ── Move controls ─────────────────────────────────────────────────── */}
          {currentShape === 'move' && (
            <View style={styles.ctxRow}>
              <Text style={styles.ctxLabel}>
                {selectedIndices.length === 0
                  ? 'Tap segments to select'
                  : `${selectedIndices.length} selected — drag to move`}
              </Text>
              {selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.dangerBtn} onPress={() => setSelectedIndices([])}>
                  <Text style={styles.toolBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Copy controls ─────────────────────────────────────────────────── */}
          {currentShape === 'copy' && (
            <View style={[styles.ctxRow, { flex: 1 }]}>
              <Text style={[styles.ctxLabel, { flex: 1 }]}>
                {selectedIndices.length === 0 && copyCount === 0
                  ? 'Tap to select segments'
                  : selectedIndices.length > 0 && copyPhase === 0
                  ? `${selectedIndices.length} selected — drag to copy`
                  : copyPhase === 1
                  ? 'Drag to place copy'
                  : `${copyCount} ${copyCount === 1 ? 'copy' : 'copies'} placed`}
              </Text>
              {selectedIndices.length > 0 && copyPhase === 0 && (
                <TouchableOpacity style={styles.mutedBtn} onPress={() => setSelectedIndices([])}>
                  <Text style={styles.toolBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              {(copyCount > 0 || selectedIndices.length > 0) && (
                <TouchableOpacity style={styles.successBtn} onPress={handleCopyDone}>
                  <Text style={styles.toolBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Mirror controls ───────────────────────────────────────────────── */}
          {currentShape === 'mirror' && (
            <View style={[styles.ctxRow, { flex: 1 }]}>
              <Text style={[styles.ctxLabel, { flex: 1 }]}>
                {mirrorPhase === 0 && selectedIndices.length === 0
                  ? 'Tap segments to select'
                  : mirrorPhase === 0 && selectedIndices.length > 0
                  ? `${selectedIndices.length} selected`
                  : mirrorPhase === 1
                  ? 'Tap first point of mirror line'
                  : 'Drag to second point — release to mirror'}
              </Text>
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.warningBtn} onPress={handleStartMirrorLine}>
                  <Text style={styles.toolBtnText}>Mirror line</Text>
                </TouchableOpacity>
              )}
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.mutedBtn} onPress={() => setSelectedIndices([])}>
                  <Text style={styles.toolBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              {mirrorPhase >= 1 && (
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() => {
                    setMirrorPhase(0);
                    setMirrorPt1(null);
                    setMirrorPt2(null);
                    setMirrorPreview([]);
                  }}
                >
                  <Text style={styles.toolBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.successBtn} onPress={handleMirrorDone}>
                  <Text style={styles.toolBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Rotate controls ───────────────────────────────────────────────── */}
          {currentShape === 'rotate' && (
            <View style={[styles.ctxRow, { flex: 1 }]}>
              <Text style={[styles.ctxLabel, { flex: 1 }]} numberOfLines={1}>
                {rotatePhase === 0 && selectedIndices.length === 0
                  ? 'Tap segments to select'
                  : rotatePhase === 0 && selectedIndices.length > 0
                  ? `${selectedIndices.length} selected`
                  : rotatePhase === 1
                  ? 'Tap base point'
                  : `${Math.round(radToDeg(rotateAngle))}°`}
              </Text>
              {rotatePhase === 2 && (
                <TouchableOpacity
                  style={[styles.warningBtn, !rotateSnap && styles.mutedBtn]}
                  onPress={() => setRotateSnap(v => !v)}
                >
                  <Text style={styles.toolBtnText}>{rotateSnap ? 'Snap 15°' : 'Free'}</Text>
                </TouchableOpacity>
              )}
              {rotatePhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.warningBtn} onPress={() => setRotatePhase(1)}>
                  <Text style={styles.toolBtnText}>Base point</Text>
                </TouchableOpacity>
              )}
              {rotatePhase === 2 && [45, 90, 135, 180].map(deg => (
                <TouchableOpacity
                  key={deg}
                  style={styles.mutedBtn}
                  onPress={() => {
                    const angle = deg * Math.PI / 180;
                    setShapeList(prev =>
                      applyRotate(prev, selectedIndices, rotateBase.x, rotateBase.y, angle)
                    );
                    setRotateDragRef(null);
                    setRotatePreview([]);
                    setRotateAngle(0);
                  }}
                >
                  <Text style={styles.toolBtnText}>{deg}°</Text>
                </TouchableOpacity>
              ))}
              {rotatePhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.mutedBtn} onPress={() => setSelectedIndices([])}>
                  <Text style={styles.toolBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              {selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.successBtn} onPress={handleRotateDone}>
                  <Text style={styles.toolBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Scale controls ────────────────────────────────────────────────── */}
          {currentShape === 'scale' && (
            <View style={[styles.ctxRow, { flex: 1 }]}>
              <Text style={[styles.ctxLabel, { flex: 1 }]} numberOfLines={1}>
                {scalePhase === 0 && selectedIndices.length === 0
                  ? 'Tap segments to select'
                  : scalePhase === 0 && selectedIndices.length > 0
                  ? `${selectedIndices.length} selected`
                  : scalePhase === 1
                  ? 'Tap base point'
                  : formatFactor(scaleFactor)}
              </Text>
              {scalePhase === 2 && (
                <TouchableOpacity
                  style={[styles.warningBtn, !scaleSnap && styles.mutedBtn]}
                  onPress={() => setScaleSnap(v => !v)}
                >
                  <Text style={styles.toolBtnText}>{scaleSnap ? 'Snap' : 'Free'}</Text>
                </TouchableOpacity>
              )}
              {scalePhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.warningBtn} onPress={() => setScalePhase(1)}>
                  <Text style={styles.toolBtnText}>Base point</Text>
                </TouchableOpacity>
              )}
              {scalePhase === 2 && [0.5, 2, 3, 4].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.mutedBtn, scaleFactor === f && styles.accentBtn]}
                  onPress={() => handleScalePreset(f)}
                >
                  <Text style={styles.toolBtnText}>{f}×</Text>
                </TouchableOpacity>
              ))}
              {scalePhase === 0 && selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.mutedBtn} onPress={() => setSelectedIndices([])}>
                  <Text style={styles.toolBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              {selectedIndices.length > 0 && (
                <TouchableOpacity style={styles.successBtn} onPress={handleScaleDone}>
                  <Text style={styles.toolBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Erase controls ────────────────────────────────────────────────── */}
          {currentShape === 'erase' && (
            <View style={[styles.ctxRow, { flex: 1 }]}>
              <Text style={[styles.ctxLabel, { flex: 1 }]}>
                {eraseIndices.length === 0
                  ? 'Tap segments to mark for deletion'
                  : `${eraseIndices.length} segment${eraseIndices.length > 1 ? 's' : ''} marked`}
              </Text>
              {eraseIndices.length > 0 && (
                <>
                  <TouchableOpacity style={styles.mutedBtn} onPress={handleEraseCancel}>
                    <Text style={styles.toolBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerBtn} onPress={handleEraseConfirm}>
                    <Text style={styles.toolBtnText}>Delete {eraseIndices.length}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── OSNAP / ORTHO / POLAR status ─────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.statusChip, snapSettings.enabled && styles.statusChipOn]}
            onPress={() => setShowSnapPanel(v => !v)}
          >
            <Text style={styles.statusChipText}>
              OSNAP {snapSettings.enabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.statusChip, activeSnap && styles.snapActiveChip]}>
            <Text style={styles.statusChipText}>
              {activeSnap ? `SNAP: ${activeSnap.type}` : 'no snap'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.statusChip, orthoEnabled && styles.orthoChipOn]}
            onPress={handleOrthoToggle}
          >
            <Text style={[styles.statusChipText, orthoEnabled && styles.statusChipTextOn]}>
              ORTHO
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusChip, polarEnabled && styles.polarChipOn]}
            onPress={handlePolarToggle}
          >
            <Text style={[styles.statusChipText, polarEnabled && styles.statusChipTextOn]}>
              POLAR
            </Text>
          </TouchableOpacity>

          {polarEnabled && (
            <View style={styles.ctxRow}>
              <Text style={styles.dimText}>Inc:</Text>
              {POLAR_INCREMENTS.map(deg => (
                <TouchableOpacity
                  key={deg}
                  style={[styles.ctxChip, polarIncrement === deg && styles.polarChipActive]}
                  onPress={() => setPolarIncrement(deg)}
                >
                  <Text style={[styles.ctxChipText, polarIncrement === deg && styles.ctxChipTextOn]}>
                    {deg}°
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {liveStats && currentShape === 'line' && (orthoEnabled || polarEnabled) && (
            <View style={[
              styles.liveReadout,
              polarTracking?.snapped && styles.liveReadoutSnapped,
            ]}>
              <Text style={[styles.liveAngle, polarTracking?.snapped && styles.liveAngleSnapped]}>
                {liveStats.angleDeg}°
              </Text>
              <Text style={styles.liveReadoutSep}>|</Text>
              <Text style={styles.liveDist}>{liveStats.dist} u</Text>
              {polarTracking?.snapped && (
                <>
                  <Text style={styles.liveReadoutSep}>|</Text>
                  <Text style={styles.liveSnapLabel}>◆ {polarTracking.trackedAngle}°</Text>
                </>
              )}
              {orthoEnabled && orthoAxis && (
                <>
                  <Text style={styles.liveReadoutSep}>|</Text>
                  <Text style={styles.liveAxisLabel}>{formatAxis(orthoAxis)}</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── OSNAP Settings Panel ────────────────────────────────────────────── */}
      {showSnapPanel && (
        <View style={styles.snapPanel}>
          <View style={styles.snapPanelHeader}>
            <Text style={styles.snapPanelTitle}>OSNAP Settings</Text>
            <TouchableOpacity
              style={[styles.ctxChip, snapSettings.enabled && styles.ctxChipActive]}
              onPress={() => setSnapSettings(s => ({ ...s, enabled: !s.enabled }))}
            >
              <Text style={styles.ctxChipText}>
                {snapSettings.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </TouchableOpacity>
          </View>

          {[
            { key: 'endpoint',      label: 'Endpoint',      color: SNAP_COLORS.endpoint      },
            { key: 'midpoint',      label: 'Midpoint',      color: SNAP_COLORS.midpoint      },
            { key: 'center',        label: 'Center',        color: SNAP_COLORS.center        },
            { key: 'intersection',  label: 'Intersect',     color: SNAP_COLORS.intersection  },
            { key: 'perpendicular', label: 'Perpendicular', color: SNAP_COLORS.perpendicular },
            { key: 'tangent',       label: 'Tangent',       color: SNAP_COLORS.tangent       },
            { key: 'nearest',       label: 'Nearest',       color: SNAP_COLORS.nearest       },
          ].map(({ key, label, color }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.snapTypeChip,
                { borderColor: snapSettings[key] ? color : '#555' },
                snapSettings[key] && { backgroundColor: color + '33' },
              ]}
              onPress={() => setSnapSettings(s => ({ ...s, [key]: !s[key] }))}
            >
              <Text style={{ color: snapSettings[key] ? color : '#888', fontSize: 11 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.snapRadiusRow}>
            <Text style={styles.dimText}>Radius: {snapSettings.radius}</Text>
            {[10, 20, 30, 50].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.ctxChip, snapSettings.radius === r && styles.accentBtn]}
                onPress={() => setSnapSettings(s => ({ ...s, radius: r }))}
              >
                <Text style={styles.ctxChipText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default Sketching2D;

// ══════════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:    { backgroundColor: '#999' },
  header:       { backgroundColor: '#ccc' },
  footer:       { backgroundColor: '#ccc' },
  footerScroll: { alignItems: 'center', paddingHorizontal: 10 },

  toolBtn: {
    backgroundColor:   '#999',
    paddingHorizontal: 15,
    paddingVertical:   5,
    borderRadius:      5,
    marginRight:       10,
  },
  toolBtnActive: { backgroundColor: '#333' },
  toolBtnText:   { color: '#fff', textTransform: 'capitalize', fontSize: 13 },
  newChainBtn: {
    backgroundColor:   '#e05',
    paddingHorizontal: 15,
    paddingVertical:   5,
    borderRadius:      5,
    marginRight:       10,
  },

  ctxRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    gap:               8,
  },
  ctxLabel:  { color: '#fff', fontSize: 12 },
  hintText:  { color: 'orange', fontSize: 12 },
  dimText:   { color: '#888', fontSize: 10 },

  ctxChip: {
    backgroundColor:   '#666',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      4,
  },
  ctxChipActive:     { backgroundColor: '#fff' },
  ctxChipText:       { color: '#fff', fontSize: 12 },
  ctxChipTextActive: { color: '#333' },
  ctxChipTextOn:     { color: '#fff', fontWeight: '600' },

  mutedBtn: {
    backgroundColor:   '#555',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      4,
  },
  dangerBtn: {
    backgroundColor:   '#c0392b',
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderRadius:      4,
  },
  successBtn: {
    backgroundColor:   '#0a7',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      4,
  },
  warningBtn: {
    backgroundColor:   '#e67e00',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      4,
  },
  accentBtn: { backgroundColor: '#0af' },

  statusChip: {
    backgroundColor:   '#444',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      4,
    marginRight:       4,
  },
  statusChipOn:      { backgroundColor: '#0a7' },
  statusChipText:    { color: '#aaa', fontSize: 11 },
  statusChipTextOn:  { color: '#fff' },
  snapActiveChip:    { backgroundColor: '#0f0' },
  orthoChipOn:       { backgroundColor: '#1a6fb5' },
  polarChipOn:       { backgroundColor: '#8b44cc' },
  polarChipActive: {
    backgroundColor:   '#8b44cc',
    borderWidth:        1,
    borderColor:        '#aa66ff',
    paddingHorizontal:  8,
  },

  liveReadout: {
    backgroundColor:   'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      4,
    marginRight:       4,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
  },
  liveReadoutSnapped: { borderWidth: 1, borderColor: '#00ccff' },
  liveAngle:          { color: '#aaa', fontSize: 11 },
  liveAngleSnapped:   { color: '#00ccff', fontWeight: '600' },
  liveReadoutSep:     { color: '#555', fontSize: 11 },
  liveDist:           { color: '#aaa', fontSize: 11 },
  liveSnapLabel:      { color: '#00ccff', fontSize: 10 },
  liveAxisLabel:      { color: '#4499ff', fontSize: 10 },

  snapPanel: {
    position:        'absolute',
    bottom:          FOOTER_HEIGHT,
    left:            0,
    right:           0,
    backgroundColor: '#222',
    borderRadius:    8,
    padding:         10,
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             6,
    zIndex:          100,
    elevation:       10,
  },
  snapPanelHeader: {
    width:          '100%',
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },
  snapPanelTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  snapTypeChip: {
    borderWidth:       1,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      4,
  },
  snapRadiusRow: {
    width:         '100%',
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginTop:     4,
  },
});