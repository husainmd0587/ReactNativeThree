import { StyleSheet, Text, View, useWindowDimensions, ScrollView, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Canvas, Group, Path, Skia, DashPathEffect, Circle, matchFont, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import Grid, { Crosshair, resolveSnap, snapToGrid } from './components/grid';
import { clamp } from './utils/math';
import { hitTestSegment } from './utils/trim/hitTest';
import { applyTrim } from './utils/trim/trim';
import { hitTestEndpoint, applyExtend } from './utils/extend/extend';
import { getAllIntersectionsPoints } from './utils/trim/intersect';
import { applyOffsetSingle, getSideFromTap } from './utils/offset/offset';
import { applyFilletToLines, applyChamferToLines, applyCornerToRect } from './utils/fillet/fillet';
import { translateSegments } from './utils/move/move';
import { cloneSegments, translateClones, commitCopy } from './utils/copy/copy';
import { applyMirror, mirrorSegment } from './utils/mirror/mirror';
import { applyRotate, computeRotationAngle, snapAngle, radToDeg, rotateSegment } from './utils/rotate/rotate';
import { applyScale, scaleSegment, computeScaleFactor, snapFactor, formatFactor } from './utils/scale/scale';
import { findSnapPoint, DEFAULT_SNAP_SETTINGS, SNAP_COLORS, SNAP_SHAPES, resolveSnapPoint } from './utils/snap/snap';
import { applyOrtho, formatAxis, computeAngleDeg, computeDist } from './utils/ortho/ortho';
import { DIM_TYPES, DIM_SUBTYPES, autoDetectDimType, formatDimValue, buildDimGeometry } from './utils/dimension/dimension';
import { buildCircularPattern, buildRectPattern, buildCircularPreview, buildRectPreview, applyPattern } from './utils/pattern/pattern';
import { getAllGrips, hitTestGrip, applyGripMove, getGrips, GRIP_COLOR } from './utils/stretch/stretch';

const HEADER_HEIGHT = 44;
const FOOTER_HEIGHT = 52;

// Font/design tokens (matches reference CAD component style)
const DS_MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const SHAPES = [
  "line", "arc", "rectangle", "circle",
  "trim", "extend", "offset", "fillet", "chamfer",
  "move", "copy", "mirror", "rotate", "scale", "erase",
  "dim", "cpat", "rpat", "stretch"
];

const SHAPE_MAP = {
  line: 0, arc: 1, rectangle: 2, circle: 3,
  trim: 4, extend: 5, offset: 6, fillet: 7, chamfer: 8,
  move: 9, copy: 10, mirror: 11, rotate: 12, scale: 13,
  erase: 14, dim: 15,
  cpat: 16, rpat: 17, stretch: 18
};

// Symbol + short label for each tool — used in the new styled toolbar
const SHAPE_META = {
  line:      { icon: "╱",  label: "Line"    },
  arc:       { icon: "⌒",  label: "Arc"     },
  rectangle: { icon: "▭",  label: "Rect"    },
  circle:    { icon: "○",  label: "Circle"  },
  trim:      { icon: "✂",  label: "Trim"    },
  extend:    { icon: "⇥",  label: "Extend"  },
  offset:    { icon: "⊡",  label: "Offset"  },
  fillet:    { icon: "⌣",  label: "Fillet"  },
  chamfer:   { icon: "⌁",  label: "Chamfer" },
  move:      { icon: "✥",  label: "Move"    },
  copy:      { icon: "⿻",  label: "Copy"    },
  mirror:    { icon: "⇔",  label: "Mirror"  },
  rotate:    { icon: "↻",  label: "Rotate"  },
  scale:     { icon: "⤢",  label: "Scale"   },
  erase:     { icon: "✕",  label: "Erase"   },
  dim:       { icon: "↔",  label: "Dim"     },
  cpat:      { icon: "◎",  label: "CPat"    },
  rpat:      { icon: "⊞",  label: "RPat"    },
  stretch:   { icon: "⤡",  label: "Stretch" },
};

// Colour palette (dark CAD theme — constant, no state dependency)
const C = {
  bg:         "#FFFFFF",   // main background (white)
  surface:    "#F8FAFC",   // cards / panels
  surface2:   "#F1F5F9",   // secondary surfaces
  border:     "#64748B",   // light border
  borderLt:   "#CBD5E1",   // slightly darker border
  active:     "#2563EB",   // blue (kept strong)
  activeBg:   "rgba(37,99,235,0.10)",
  activeBdr:  "rgba(37,99,235,0.35)",
  text:       "#0F172A",   // main text (dark)
  textMid:    "#334155",   // medium text
  textDim:    "#64748B",   // secondary text
  danger:     "#DC2626",   // red
  success:    "#059669",   // green
  warning:    "#D97706",   // amber
  extrude:    "#9333EA",   // purple (kept similar)
  extrudeBg:  "rgba(147,51,234,0.12)",
  extrudeBdr: "rgba(147,51,234,0.35)",
};


// ─── Memoized path builders (outside component, no closure capture) ────────────
const buildRectSkiaPath = (x1, y1, x2, y2) => {
  const p = Skia.Path.Make();
  p.moveTo(x1, y1); p.lineTo(x2, y1);
  p.lineTo(x2, y2); p.lineTo(x1, y2);
  p.close();
  return p;
};

// ─── Static segment renderer — pure function, no hooks ───────────────────────
const SegmentItem = React.memo(({ seg, index }) => {
  const path = useMemo(() => {
    if (seg.type === 'line') {
      const p = Skia.Path.Make();
      p.moveTo(seg.startPoint.x, seg.startPoint.y);
      p.lineTo(seg.endPoint.x, seg.endPoint.y);
      return p;
    }
    if (seg.type === 'rectangle') {
      return buildRectSkiaPath(seg.corner1.x, seg.corner1.y, seg.corner2.x, seg.corner2.y);
    }
    if (seg.type === 'circle') {
      const p = Skia.Path.Make();
      p.addCircle(seg.center.x, seg.center.y, seg.radius);
      return p;
    }
    if (seg.type === 'arc') {
      const { cx, cy } = { cx: seg.center.x, cy: seg.center.y };
      const r = seg.radius;
      let startDeg = seg.startAngle * (180 / Math.PI);
      let sweepDeg = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
      if (seg.clockwise) { if (sweepDeg < 0) sweepDeg += 360; }
      else { if (sweepDeg > 0) sweepDeg -= 360; }
      const p = Skia.Path.Make();
      p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg);
      return p;
    }
    return null;
  }, [seg]);

  if (!path) return null;
  const color = seg.type === 'arc' ? 'blue' : 'black';
  return <Path key={index} path={path} color={color} style="stroke" strokeWidth={2} />;
}, (prev, next) => prev.seg === next.seg);

// ─── Memoized intersection dots ───────────────────────────────────────────────
const IntersectionDots = React.memo(({ shapeList }) => {
  const intersections = useMemo(() => getAllIntersectionsPoints(shapeList), [shapeList]);
  return (
    <>
      {intersections.map((inter, index) => (
        <Circle key={index} cx={inter.point.x} cy={inter.point.y} r={2} color="red" />
      ))}
    </>
  );
});

const Sketching2D = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT;
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const font = useFont(require("../../assets/fonts/roboto.ttf"), 10);

  // ── viewport transform ────────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX = useSharedValue(centerX);
  const savedY = useSharedValue(centerY);
  const savedScale = useSharedValue(1);
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;
  const LIMIT = 500;

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ── grid snap state ────────────────────────────────────────────────────────
  const GRID_MINOR = 20;
  const GRID_MAJOR = 100;
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false);
  const [gridSnapPoint, setGridSnapPoint] = useState(null);

  // ── snap state ─────────────────────────────────────────────────────────────
  const [snapSettings, setSnapSettings] = useState(DEFAULT_SNAP_SETTINGS);
  const [showSnapPanel, setShowSnapPanel] = useState(false);

  // FIX: activeSnap as shared value — snap marker updates on UI thread,
  // zero React re-renders during drawing. Only header badge reads JS state.
  const activeSnapXSV  = useSharedValue(0);
  const activeSnapYSV  = useSharedValue(0);
  const activeSnapTypeSV = useSharedValue('');   // '' = no snap
  // Small JS-side mirror only for the header badge (low-frequency)
  const [activeSnapBadge, setActiveSnapBadge] = useState(null);
  const snapBadgeThrottle = useRef(0);

  // Keep a stable ref so worklet-called JS functions can read it without closure
  const snapSettingsRef = useRef(DEFAULT_SNAP_SETTINGS);
  useEffect(() => { snapSettingsRef.current = snapSettings; }, [snapSettings]);

  // FIX: currentScale as shared value — no re-render on pinch.
  // Snap marker and grip sizes read it directly on the UI thread.
  const currentScaleSV = useSharedValue(1);
  const _scaleSync = useDerivedValue(() => {
    currentScaleSV.value = scale.value;
  });
  // Cheap JS ref mirror for occasional JS-side size calcs (stretch grips, etc.)
  const currentScaleRef = useRef(1);
  useEffect(() => {
    const id = setInterval(() => { currentScaleRef.current = currentScaleSV.value; }, 200);
    return () => clearInterval(id);
  }, []);

  // ── ortho state ────────────────────────────────────────────────────────────
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [polarEnabled, setPolarEnabled] = useState(false);
  const [orthoAxis, setOrthoAxis] = useState(null);
  const [liveStats, setLiveStats] = useState(null);

  const orthoEnabledRef = useRef(false);
  const polarEnabledRef = useRef(false);
  useEffect(() => { orthoEnabledRef.current = orthoEnabled; }, [orthoEnabled]);
  useEffect(() => { polarEnabledRef.current = polarEnabled; }, [polarEnabled]);

  const constrainPoint = useCallback((wx, wy, fromPoint) => {
    if (!fromPoint) return { x: wx, y: wy };
    const mode = polarEnabledRef.current ? 'polar' : orthoEnabledRef.current ? 'ortho' : null;
    if (!mode) return { x: wx, y: wy };
    const result = applyOrtho(fromPoint.x, fromPoint.y, wx, wy, mode);
    setOrthoAxis(result.axis);
    const dist = computeDist(fromPoint.x, fromPoint.y, result.x, result.y);
    const angleDeg = computeAngleDeg(fromPoint.x, fromPoint.y, result.x, result.y);
    setLiveStats({ dist: Math.round(dist * 10) / 10, angleDeg: Math.round(angleDeg) });
    return { x: result.x, y: result.y };
  }, []); // stable — reads from refs

  const clearOrtho = useCallback(() => {
    setOrthoAxis(null);
    setLiveStats(null);
  }, []);

  // ── React state ────────────────────────────────────────────────────────────
  const [currentShape, setCurrentShape] = useState("line");
  const [shapeList, setShapeList] = useState([]);

  // Use refs for values needed in callbacks without causing re-renders
  const shapeListRef = useRef([]);
  const currentShapeRef = useRef("line");
  useEffect(() => { shapeListRef.current = shapeList; }, [shapeList]);
  useEffect(() => { currentShapeRef.current = currentShape; }, [currentShape]);

  // ── snap helpers ─────────────────────────────────────────────────────────
  // (snapSettingsRef already declared above with the snap state)

  const getSnappedPoint = useCallback((wx, wy, fromPoint = null) => {
    const snap = findSnapPoint(wx, wy, shapeListRef.current, snapSettingsRef.current, fromPoint);
    return snap ?? { x: wx, y: wy };
  }, []); // stable — reads from refs

  // FIX: write snap result into shared values — zero React re-renders on every move.
  // The snap marker is driven by useDerivedValue, updating directly on the UI thread.
  const _writeSnap = useCallback((snap) => {
    if (snap) {
      activeSnapXSV.value    = snap.x;
      activeSnapYSV.value    = snap.y;
      activeSnapTypeSV.value = snap.type ?? 'dot';
      // Throttle the header badge update to ~10 fps — purely cosmetic
      const now = Date.now();
      if (now - snapBadgeThrottle.current > 100) {
        snapBadgeThrottle.current = now;
        setActiveSnapBadge({ type: snap.type });
      }
    } else {
      activeSnapTypeSV.value = '';
      setActiveSnapBadge(null);
    }
  }, []);

  const applySnapFull = useCallback((wx, wy, fromPoint = null) => {
    const result = resolveSnapPoint(
      wx, wy,
      shapeListRef.current, snapSettingsRef.current, fromPoint,
      gridSnapEnabled, scale.value ?? 1,
      GRID_MINOR, GRID_MAJOR
    );
    _writeSnap(result.osnapResult ?? null);
    return { x: result.x, y: result.y };
  }, [gridSnapEnabled, _writeSnap]);

  const applySnap = useCallback((wx, wy, fromPoint = null) => {
    const drawingModes = ['line', 'arc', 'rectangle', 'circle'];
    if (!drawingModes.includes(currentShapeRef.current)) return { x: wx, y: wy };
    const snap = findSnapPoint(wx, wy, shapeListRef.current, snapSettingsRef.current, fromPoint);
    _writeSnap(snap ?? null);
    return snap ? { x: snap.x, y: snap.y } : { x: wx, y: wy };
  }, [_writeSnap]);

  // FIX: handleDrawUpdate — no React setState, just shared value writes.
  const handleDrawUpdate = useCallback((wx, wy) => {
    const from = hasLastPoint.value ? { x: lastPointX.value, y: lastPointY.value } : null;
    const constrained = constrainPoint(wx, wy, from);
    applySnap(constrained.x, constrained.y, from);
  }, [applySnap, constrainPoint]);

  const addSegment = useCallback((segment) => {
    setShapeList((prev) => [...prev, segment]);
  }, []);

  // ── crosshair ──────────────────────────────────────────────────────────────
  const translateCrossX = useSharedValue(0);
  const translateCrossY = useSharedValue(0);
  const transformCross = useDerivedValue(() => [
    { translateX: translateCrossX.value },
    { translateY: translateCrossY.value },
  ]);

  const previewPath = useSharedValue(Skia.Path.Make());
  const animatedPreview = useDerivedValue(() => previewPath.value);

  // ── FIX: scalar shared values instead of object shared values ──────────────
  // useSharedValue({x,y}) converts the object to a "shareable" (frozen).
  // Any later .current mutation on a ref holding that object triggers the warning.
  // Solution: one shared value per scalar — never share plain objects.
  const lastPointX = useSharedValue(0);
  const lastPointY = useSharedValue(0);
  const hasLastPoint = useSharedValue(false);

  const arcPhase = useSharedValue(0);
  const arcStartX = useSharedValue(0);
  const arcStartY = useSharedValue(0);
  const arcEndX   = useSharedValue(0);
  const arcEndY   = useSharedValue(0);

  const currentShapeSV = useSharedValue(0);

  // ── offset state ───────────────────────────────────────────────────────────
  const [offsetDistance, setOffsetDistance] = useState(10);
  const offsetDistanceRef = useRef(10);
  useEffect(() => { offsetDistanceRef.current = offsetDistance; }, [offsetDistance]);

  // ── dimension state ────────────────────────────────────────────────────────
  const [dimList, setDimList] = useState([]);
  const [dimMode, setDimMode] = useState(DIM_TYPES.ALIGNED);
  const [dimSubtype, setDimSubtype] = useState('horizontal');
  const [dimOffset, setDimOffset] = useState(24);
  const [dimPhase, setDimPhase] = useState(0);
  const [dimPt1, setDimPt1] = useState(null);
  const [dimPt2, setDimPt2] = useState(null);
  const [dimFirstSeg, setDimFirstSeg] = useState(null);
  const [dimPreview, setDimPreview] = useState(null);

  // Use refs for dim values accessed in callbacks
  const dimModeRef = useRef(DIM_TYPES.ALIGNED);
  const dimSubtypeRef = useRef('horizontal');
  const dimOffsetRef = useRef(24);
  const dimPhaseRef = useRef(0);
  const dimPt1Ref = useRef(null);
  const dimFirstSegRef = useRef(null);
  useEffect(() => { dimModeRef.current = dimMode; }, [dimMode]);
  useEffect(() => { dimSubtypeRef.current = dimSubtype; }, [dimSubtype]);
  useEffect(() => { dimOffsetRef.current = dimOffset; }, [dimOffset]);
  useEffect(() => { dimPhaseRef.current = dimPhase; }, [dimPhase]);
  useEffect(() => { dimPt1Ref.current = dimPt1; }, [dimPt1]);
  useEffect(() => { dimFirstSegRef.current = dimFirstSeg; }, [dimFirstSeg]);

  const dimFont = useMemo(() => {
    try { return matchFont({ familyName: "Arial", fontSize: 100 }); }
    catch { return null; }
  }, []);

  const commitDim = useCallback((record, geo) => {
    setDimList(prev => [...prev, { record, geo, text: formatDimValue(geo.value, record.dimType) }]);
  }, []);

  const handleDimTap = useCallback((wx, wy, cs) => {
    const currentScaleVal = cs;
    const shapes = shapeListRef.current;
    const mode = dimModeRef.current;
    const offset = dimOffsetRef.current;
    const subtype = dimSubtypeRef.current;
    const phase = dimPhaseRef.current;
    const pt1 = dimPt1Ref.current;
    const firstSeg = dimFirstSegRef.current;

    const idx = shapes.findIndex(seg => {
      if (seg.type === 'line' || seg.type === 'rectangle') return hitTestSegment(wx, wy, seg, 10 / currentScaleVal);
      if (seg.type === 'circle') return Math.abs(Math.hypot(wx - seg.center.x, wy - seg.center.y) - seg.radius) < 12 / currentScaleVal;
      if (seg.type === 'arc') {
        const d = Math.hypot(wx - seg.center.x, wy - seg.center.y);
        if (Math.abs(d - seg.radius) > 12 / currentScaleVal) return false;
        const angle = Math.atan2(wy - seg.center.y, wx - seg.center.x);
        const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const ns = norm(seg.startAngle), ne = norm(seg.endAngle), na = norm(angle);
        if (seg.clockwise) return ns <= ne ? (na >= ns && na <= ne) : (na >= ns || na <= ne);
        else return ns >= ne ? (na <= ns && na >= ne) : (na <= ns || na >= ne);
      }
      return false;
    });

    if (idx !== -1) {
      const seg = shapes[idx];
      if (seg.type === 'circle' && mode !== DIM_TYPES.DIAMETER && mode !== DIM_TYPES.RADIAL) {
        const geo = buildDimGeometry({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy });
        if (geo) commitDim({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy }, geo);
        return;
      }
      if (seg.type === 'arc' && mode !== DIM_TYPES.RADIAL && mode !== DIM_TYPES.ARC_LEN) {
        const geo = buildDimGeometry({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy });
        if (geo) commitDim({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy }, geo);
        return;
      }
      if (mode === DIM_TYPES.ANGULAR) {
        if (!firstSeg) { if (seg.type !== 'line') return; setDimFirstSeg({ seg, tapX: wx, tapY: wy }); return; }
        if (seg.type !== 'line' || firstSeg.seg === seg) { setDimFirstSeg(null); return; }
        const geo = buildDimGeometry({ dimType: DIM_TYPES.ANGULAR, segA: firstSeg.seg, segB: seg, tapX: wx, tapY: wy });
        if (geo) commitDim({ dimType: DIM_TYPES.ANGULAR, segA: firstSeg.seg, segB: seg, tapX: wx, tapY: wy }, geo);
        setDimFirstSeg(null); return;
      }
      if (mode === DIM_TYPES.RADIAL) {
        if (seg.type !== 'circle' && seg.type !== 'arc') return;
        const geo = buildDimGeometry({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy, offset });
        if (geo) commitDim({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy, offset }, geo);
        return;
      }
      if (mode === DIM_TYPES.DIAMETER) {
        if (seg.type !== 'circle') return;
        const geo = buildDimGeometry({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy, offset });
        if (geo) commitDim({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy, offset }, geo);
        return;
      }
      if (mode === DIM_TYPES.ARC_LEN) {
        if (seg.type !== 'arc') return;
        const geo = buildDimGeometry({ dimType: DIM_TYPES.ARC_LEN, seg, offset });
        if (geo) commitDim({ dimType: DIM_TYPES.ARC_LEN, seg, offset }, geo);
        return;
      }
      if (mode === DIM_TYPES.ALIGNED && seg.type === 'line') {
        const geo = buildDimGeometry({ dimType: DIM_TYPES.ALIGNED, pt1: seg.startPoint, pt2: seg.endPoint, offset });
        if (geo) commitDim({ dimType: DIM_TYPES.ALIGNED, pt1: seg.startPoint, pt2: seg.endPoint, offset }, geo);
        return;
      }
    }

    if (phase === 0) { setDimPt1({ x: wx, y: wy }); setDimPhase(1); return; }
    if (phase === 1) {
      setDimPt2({ x: wx, y: wy }); setDimPhase(2);
      const geo = buildDimGeometry({ dimType: mode, pt1, pt2: { x: wx, y: wy }, offset, subtype });
      if (geo) commitDim({ dimType: mode, pt1, pt2: { x: wx, y: wy }, offset, subtype }, geo);
      setDimPhase(0); setDimPt1(null); setDimPt2(null);
    }
  }, [commitDim]);

  const handleDimMove = useCallback((wx, wy) => {
    const phase = dimPhaseRef.current;
    const pt1 = dimPt1Ref.current;
    const mode = dimModeRef.current;
    const offset = dimOffsetRef.current;
    const subtype = dimSubtypeRef.current;
    if (phase !== 1 || !pt1) return;
    if (mode === DIM_TYPES.LINEAR || mode === DIM_TYPES.ALIGNED || mode === DIM_TYPES.ORDINATE) {
      const geo = buildDimGeometry({ dimType: mode, pt1, pt2: { x: wx, y: wy }, offset, subtype });
      setDimPreview(geo);
    }
  }, []);

  // ─── Memoized dim rendering ────────────────────────────────────────────────
  const renderDimText = useCallback((text, x, y, angleDeg = 0, key, color = '#0099ff') => {
    if (!font) return null;
    const textWidth = text.length * 4;
    return (
      <Group key={`${key}-text`} transform={[
        { translateX: x }, { translateY: y },
        { rotate: angleDeg * Math.PI / 180 },
        { translateX: -textWidth / 2 }, { translateY: -6 },
      ]}>
        <Path path={(() => { const p = Skia.Path.Make(); p.addRect({ x: -2, y: -1, width: textWidth + 4, height: 13 }); return p; })()} color="rgba(255,255,255,0.85)" style="fill" />
        <SkiaText transform={[{ rotate: 0 }]} x={0} y={7} text={String(`${text} mm`)} font={font} color={color} />
      </Group>
    );
  }, [font]);

  const renderDimGeometry = useCallback((geo, text, key, color = '#0099ff') => {
    if (!geo) return null;
    const elements = [];
    const sw = 1;
    geo.extLines?.forEach(([a, b], i) => {
      const p = Skia.Path.Make(); p.moveTo(a.x, a.y); p.lineTo(b.x, b.y);
      elements.push(<Path key={`${key}-ext-${i}`} path={p} color={color} style="stroke" strokeWidth={sw} />);
    });
    if (geo.dimLine) {
      const [a, b] = geo.dimLine;
      const p = Skia.Path.Make(); p.moveTo(a.x, a.y); p.lineTo(b.x, b.y);
      elements.push(<Path key={`${key}-dimline`} path={p} color={color} style="stroke" strokeWidth={sw} />);
    }
    if (geo.dimArc) {
      const { center, radius, startAngle, endAngle, clockwise } = geo.dimArc;
      let startDeg = startAngle * 180 / Math.PI;
      let sweepDeg = (endAngle - startAngle) * 180 / Math.PI;
      if (clockwise) { if (sweepDeg < 0) sweepDeg += 360; } else { if (sweepDeg > 0) sweepDeg -= 360; }
      const p = Skia.Path.Make();
      p.addArc({ x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 }, startDeg, sweepDeg);
      elements.push(<Path key={`${key}-dimarc`} path={p} color={color} style="stroke" strokeWidth={sw} />);
    }
    if (geo.vertex && geo.arcR) {
      let startDeg = geo.startAngle * 180 / Math.PI;
      let sweepDeg = (geo.endAngle - geo.startAngle) * 180 / Math.PI;
      if (sweepDeg < 0) sweepDeg += 360;
      const p = Skia.Path.Make();
      p.addArc({ x: geo.vertex.x - geo.arcR, y: geo.vertex.y - geo.arcR, width: geo.arcR * 2, height: geo.arcR * 2 }, startDeg, sweepDeg);
      elements.push(<Path key={`${key}-angarc`} path={p} color={color} style="stroke" strokeWidth={sw} />);
    }
    geo.arrows?.forEach((arrow, i) => {
      if (!arrow || arrow.length < 3) return;
      const p = Skia.Path.Make(); p.moveTo(arrow[0].x, arrow[0].y); p.lineTo(arrow[1].x, arrow[1].y); p.lineTo(arrow[2].x, arrow[2].y); p.close();
      elements.push(<Path key={`${key}-arr-${i}`} path={p} color={color} style="fill" />);
    });
    if (geo.textPt) {
      elements.push(<Circle key={`${key}-textdot`} cx={geo.textPt.x} cy={geo.textPt.y} r={1} color={color} />);
      elements.push(renderDimText(text, geo.textPt.x, geo.textPt.y, geo.textAngle, key, color));
    }
    return elements;
  }, [renderDimText]);

  // Memoize rendered dimensions — only recompute when dimList changes
  const renderedDimensions = useMemo(() =>
    dimList.map(({ geo, text }, i) => renderDimGeometry(geo, text, `dim-${i}`)),
    [dimList, renderDimGeometry]
  );

  const renderedDimPreview = useMemo(() => {
    if (!dimPreview || currentShape !== 'dim') return null;
    const text = formatDimValue(dimPreview.value, dimMode);
    return renderDimGeometry(dimPreview, text, 'dim-preview', 'rgba(0,153,255,0.5)');
  }, [dimPreview, currentShape, dimMode, renderDimGeometry]);

  // FIX: snap marker built entirely on the UI thread via useDerivedValue.
  // No React state, no re-renders — marker appears at the same frame as the
  // preview line because both update through the same Reanimated pipeline.
  const snapMarkerPath = useDerivedValue(() => {
    const type = activeSnapTypeSV.value;
    if (!type) return Skia.Path.Make();
    const x = activeSnapXSV.value, y = activeSnapYSV.value;
    const sc = currentScaleSV.value || 1;
    const size = 9 / sc;
    const p = Skia.Path.Make();
    if (type === 'endpoint') {
      // square
      p.addRect({ x: x - size, y: y - size, width: size * 2, height: size * 2 });
    } else if (type === 'midpoint') {
      // triangle
      p.moveTo(x, y - size * 1.2); p.lineTo(x + size, y + size * 0.8); p.lineTo(x - size, y + size * 0.8); p.close();
    } else if (type === 'center') {
      // circle ring
      p.addCircle(x, y, size);
    } else if (type === 'intersection') {
      // cross X
      p.moveTo(x - size, y - size); p.lineTo(x + size, y + size);
      p.moveTo(x + size, y - size); p.lineTo(x - size, y + size);
    } else if (type === 'perpendicular') {
      // L shape
      p.moveTo(x - size, y - size); p.lineTo(x - size, y + size); p.lineTo(x + size, y + size);
    } else if (type === 'tangent') {
      // T shape
      p.moveTo(x - size, y - size); p.lineTo(x + size, y - size);
      p.moveTo(x, y - size); p.lineTo(x, y + size);
    } else {
      // dot fallback — small circle
      p.addCircle(x, y, size * 0.5);
    }
    return p;
  });

  // Center dot always shown when any snap is active
  const snapCenterPath = useDerivedValue(() => {
    const type = activeSnapTypeSV.value;
    if (!type) return Skia.Path.Make();
    const p = Skia.Path.Make();
    p.addCircle(activeSnapXSV.value, activeSnapYSV.value, 1.8 / (currentScaleSV.value || 1));
    return p;
  });

  // Colour for the snap marker — derived from type string
  const SNAP_TYPE_COLORS = {
    endpoint:      '#F7C948',
    midpoint:      '#2AA8F2',
    center:        '#00E5A0',
    intersection:  '#FF7A45',
    perpendicular: '#A855F7',
    tangent:       '#FF9500',
    nearest:       '#B8C8E0',
  };
  // useDerivedValue can't return a dynamic color string for the color prop
  // so we render one <Path> per color but only the active one gets a real path.
  // Simpler: single animated path + fixed teal colour works fine for most snaps.
  // For per-type color we use a small JS-side Badge only (activeSnapBadge badge in header).
  // The marker itself uses a constant bright accent — fast, no JS involvement.
  const snapMarkerColor = '#00E5A0';  // single fast constant — visible on any background

  // ── shape switch ───────────────────────────────────────────────────────────
  const handleShapeChange = useCallback((shape) => {
    setCurrentShape(shape);
    currentShapeSV.value = SHAPE_MAP[shape];
    arcPhase.value = 0;
    hasLastPoint.value = false;
    lastPointX.value = 0;
    lastPointY.value = 0;
    previewPath.value = Skia.Path.Make();
    setFilletFirstSelSynced(null);
    setSelectedIndices([]);
    setIsDragging(false);
    if (shape === 'fillet' || shape === 'chamfer') {
      setFilletMode(shape);
      filletModeRef.current = shape;
    }
    setCopyPhase(0); setCopyPreview([]); setCopyClones([]); setCopyBasePoint(null); setCopyCount(0);
    setMirrorPhase(0); setMirrorPt1(null); setMirrorPt2(null); setMirrorPreview([]);
    setRotatePhase(0); setRotateBase(null); setRotateDragRef(null); setRotateAngle(0); setRotatePreview([]);
    rotateBaseList.current = [];
    setScalePhase(0); setScaleBase(null); setScaleDragRef(null); setScaleFactor(1); setScalePreview([]);
    scaleBaseList.current = [];
    setEraseIndices([]);
  }, []);

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

  const buildRectPath = (x1, y1, x2, y2) => {
    'worklet';
    const p = Skia.Path.Make();
    p.moveTo(x1, y1); p.lineTo(x2, y1); p.lineTo(x2, y2); p.lineTo(x1, y2); p.close();
    return p;
  };

  const getArcFrom3Points = (x1, y1, x2, y2, xb, yb) => {
    'worklet';
    const D = 2 * (x1 * (y2 - yb) + x2 * (yb - y1) + xb * (y1 - y2));
    if (Math.abs(D) < 1e-6) return null;
    const ux = ((x1 * x1 + y1 * y1) * (y2 - yb) + (x2 * x2 + y2 * y2) * (yb - y1) + (xb * xb + yb * yb) * (y1 - y2)) / D;
    const uy = ((x1 * x1 + y1 * y1) * (xb - x2) + (x2 * x2 + y2 * y2) * (x1 - xb) + (xb * xb + yb * yb) * (x2 - x1)) / D;
    const r = Math.sqrt((ux - x1) ** 2 + (uy - y1) ** 2);
    const startAngle = Math.atan2(y1 - uy, x1 - ux);
    const endAngle = Math.atan2(y2 - uy, x2 - ux);
    const midAngle = Math.atan2(yb - uy, xb - ux);
    const normalize = (a) => { 'worklet'; return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); };
    const ns = normalize(startAngle), ne = normalize(endAngle), nm = normalize(midAngle);
    const cwBetween = ns <= nm ? nm <= ne || ne < ns : nm <= ne && ne < ns;
    return { cx: ux, cy: uy, r, startAngle, endAngle, clockwise: cwBetween };
  };

  const buildArcPath = (x1, y1, x2, y2, xb, yb) => {
    'worklet';
    const arc = getArcFrom3Points(x1, y1, x2, y2, xb, yb);
    if (!arc) { const p = Skia.Path.Make(); p.moveTo(x1, y1); p.lineTo(x2, y2); return p; }
    const { cx, cy, r, startAngle, endAngle, clockwise } = arc;
    const toDeg = (a) => { 'worklet'; return a * (180 / Math.PI); };
    let startDeg = toDeg(startAngle);
    let sweepDeg = toDeg(endAngle) - startDeg;
    if (clockwise) { if (sweepDeg < 0) sweepDeg += 360; } else { if (sweepDeg > 0) sweepDeg -= 360; }
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg);
    return p;
  };

  const handleExitChain = useCallback(() => {
    hasLastPoint.value = false;
    lastPointX.value = 0;
    lastPointY.value = 0;
    previewPath.value = Skia.Path.Make();
    arcPhase.value = 0;
  }, []);

  const commitLine = useCallback((wx, wy) => {
    const startX = lastPointX.value;
    const startY = lastPointY.value;
    const from = { x: startX, y: startY };
    const constrained = constrainPoint(wx, wy, from);
    const snapped = getSnappedPoint(constrained.x, constrained.y, from);
    previewPath.value = Skia.Path.Make();
    lastPointX.value = snapped.x;
    lastPointY.value = snapped.y;
    addSegment({ type: 'line', startPoint: { x: startX, y: startY }, endPoint: { x: snapped.x, y: snapped.y } });
    activeSnapTypeSV.value = '';   // clear snap marker on UI thread — no re-render
    setActiveSnapBadge(null);
    clearOrtho();
  }, [getSnappedPoint, addSegment, constrainPoint, clearOrtho]);

  const handleTrim = useCallback((tx, ty, cs) => {
    setShapeList((prev) => {
      const idx = prev.findIndex(seg => hitTestSegment(tx, ty, seg, 8 / cs));
      if (idx === -1) return prev;
      return applyTrim(prev, idx, tx, ty);
    });
  }, []);

  // ── Extend ─────────────────────────────────────────────────────────────────
  const [extendState, setExtendState] = useState(null);
  const extendStateRef = useRef(null);

  const handleExtendStart = useCallback((wx, wy, cs) => {
    let found = null;
    shapeListRef.current.forEach((seg, i) => {
      if (found) return;
      const ep = hitTestEndpoint(wx, wy, seg, 14 / cs);
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

  const extendHandles = useMemo(() => {
    if (!extendState) return null;
    const seg = shapeListRef.current[extendState.segIndex];
    if (!seg) return null;
    let px, py;
    if (seg.type === 'line') { const pt = extendState.endpoint === 'end' ? seg.endPoint : seg.startPoint; px = pt.x; py = pt.y; }
    if (seg.type === 'arc') { const angle = extendState.endpoint === 'end' ? seg.endAngle : seg.startAngle; px = seg.center.x + seg.radius * Math.cos(angle); py = seg.center.y + seg.radius * Math.sin(angle); }
    if (px == null) return null;
    return <Circle cx={px} cy={py} r={8} color="orange" />;
  }, [extendState]);

  // ── Offset ─────────────────────────────────────────────────────────────────
  const handleOffsetTap = useCallback((wx, wy, cs) => {
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) return;
    const seg = shapeListRef.current[idx];
    const side = getSideFromTap(seg, wx, wy);
    setShapeList(prev => applyOffsetSingle(prev, idx, offsetDistanceRef.current, side));
  }, []);

  // ── Fillet / Chamfer ───────────────────────────────────────────────────────
  const [filletRadius, setFilletRadius] = useState(10);
  const [filletMode, setFilletMode] = useState('fillet');
  const [filletFirstSel, setFilletFirstSel] = useState(null);
  const [chamferDistance, setChamferDistance] = useState(10);

  const filletFirstSelRef = useRef(null);
  const filletRadiusRef = useRef(filletRadius);
  const filletModeRef = useRef(filletMode);
  const chamferDistanceRef = useRef(10);
  useEffect(() => { filletFirstSelRef.current = filletFirstSel; }, [filletFirstSel]);
  useEffect(() => { filletRadiusRef.current = filletRadius; }, [filletRadius]);
  useEffect(() => { filletModeRef.current = filletMode; }, [filletMode]);
  useEffect(() => { chamferDistanceRef.current = chamferDistance; }, [chamferDistance]);

  const setFilletFirstSelSynced = useCallback((val) => {
    filletFirstSelRef.current = val;
    setFilletFirstSel(val);
  }, []);

  const handleFilletTap = useCallback((wx, wy, cs) => {
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) { setFilletFirstSelSynced(null); return; }
    const seg = shapeListRef.current[idx];
    const firstSel = filletFirstSelRef.current;
    const mode = filletModeRef.current;
    const val = mode === 'fillet' ? filletRadiusRef.current : chamferDistanceRef.current;
    if (seg.type === 'rectangle') {
      setShapeList(prev => applyCornerToRect(prev, idx, wx, wy, val, mode));
      setFilletFirstSelSynced(null); return;
    }
    if (!firstSel) { setFilletFirstSelSynced({ idx, tapX: wx, tapY: wy }); return; }
    const { idx: idxA, tapX: tapAx, tapY: tapAy } = firstSel;
    if (idxA === idx) { setFilletFirstSelSynced(null); return; }
    setShapeList(prev => mode === 'fillet'
      ? applyFilletToLines(prev, idxA, idx, tapAx, tapAy, wx, wy, val)
      : applyChamferToLines(prev, idxA, idx, tapAx, tapAy, wx, wy, val));
    setFilletFirstSelSynced(null);
  }, [setFilletFirstSelSynced]);

  const filletHighlight = useMemo(() => {
    if (!filletFirstSel || (currentShape !== 'fillet' && currentShape !== 'chamfer')) return null;
    const seg = shapeList[filletFirstSel.idx];
    if (!seg || seg.type !== 'line') return null;
    const p = Skia.Path.Make();
    p.moveTo(seg.startPoint.x, seg.startPoint.y);
    p.lineTo(seg.endPoint.x, seg.endPoint.y);
    return <Path path={p} color="orange" style="stroke" strokeWidth={3} />;
  }, [filletFirstSel, currentShape, shapeList]);

  // ── Move ───────────────────────────────────────────────────────────────────
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const selectedIndicesRef = useRef([]);
  const isDraggingRef = useRef(false);
  const dragBaseList = useRef([]);
  const wasDragMove = useSharedValue(false);
  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const handleMoveStart = useCallback((wx, wy) => {
    // FIX: always copy — never store a reference to the live state array.
    // Assigning shapeListRef.current directly makes the same array object go
    // through a runOnJS boundary (translateSegments), which Reanimated freezes.
    dragBaseList.current = [...shapeListRef.current];
  }, []);

  const handleMoveDragStart = useCallback(() => {
    if (selectedIndicesRef.current.length === 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handleMoveDrag = useCallback((dx, dy) => {
    if (selectedIndicesRef.current.length === 0 || !isDraggingRef.current) return;
    setShapeList(translateSegments(dragBaseList.current, selectedIndicesRef.current, dx, dy));
  }, []);

  const handleMoveEnd = useCallback((wasTap, ex, ey, cs) => {
    if (wasTap) {
      const idx = shapeListRef.current.findIndex(seg => hitTestSegment(ex, ey, seg, 8 / cs));
      if (idx === -1) {
        setSelectedIndices([]);
        // FIX: do NOT write selectedIndicesRef.current directly here.
        // The ref is synced by useEffect. Direct mutation after a runOnJS
        // boundary triggers "tried to modify key of converted object".
      } else {
        const prev = selectedIndicesRef.current;
        const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
        setSelectedIndices(next);
        // ref will sync via useEffect
      }
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    dragBaseList.current = [];
  }, []);

  // ── Shared colored segment renderer ───────────────────────────────────────
  const renderSegmentColored = useCallback((seg, key, color, strokeWidth = 2, dashed = false) => {
    let path = null;
    if (seg.type === 'line') {
      const p = Skia.Path.Make(); p.moveTo(seg.startPoint.x, seg.startPoint.y); p.lineTo(seg.endPoint.x, seg.endPoint.y); path = p;
    } else if (seg.type === 'arc') {
      const r = seg.radius;
      let startDeg = seg.startAngle * (180 / Math.PI);
      let sweepDeg = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
      if (seg.clockwise) { if (sweepDeg < 0) sweepDeg += 360; } else { if (sweepDeg > 0) sweepDeg -= 360; }
      const p = Skia.Path.Make(); p.addArc({ x: seg.center.x - r, y: seg.center.y - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg); path = p;
    } else if (seg.type === 'circle') {
      const p = Skia.Path.Make(); p.addCircle(seg.center.x, seg.center.y, seg.radius); path = p;
    } else if (seg.type === 'rectangle') {
      path = buildRectSkiaPath(seg.corner1.x, seg.corner1.y, seg.corner2.x, seg.corner2.y);
    }
    if (!path) return null;
    return (
      <Path key={key} path={path} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dashed && <DashPathEffect intervals={[6, 4]} />}
      </Path>
    );
  }, []);

  // ── Memoized move highlights ───────────────────────────────────────────────
  const moveHighlights = useMemo(() => {
    if (currentShape !== 'move') return null;
    return selectedIndices.map(idx => {
      const seg = shapeList[idx];
      if (!seg) return null;
      return renderSegmentColored(seg, `sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
    });
  }, [currentShape, selectedIndices, shapeList, renderSegmentColored]);

  // ── Copy ───────────────────────────────────────────────────────────────────
  const [copyPhase, setCopyPhase] = useState(0);
  const [copyBasePoint, setCopyBasePoint] = useState(null);
  const [copyClones, setCopyClones] = useState([]);
  const [copyPreview, setCopyPreview] = useState([]);
  const [copyCount, setCopyCount] = useState(0);
  const copyDragStartX = useSharedValue(0);
  const copyDragStartY = useSharedValue(0);
  const copyPhaseRef = useRef(0);
  const copyBasePointRef = useRef(null);
  const copyClonesRef = useRef([]);
  useEffect(() => { copyPhaseRef.current = copyPhase; }, [copyPhase]);
  useEffect(() => { copyBasePointRef.current = copyBasePoint; }, [copyBasePoint]);
  useEffect(() => { copyClonesRef.current = copyClones; }, [copyClones]);

  const handleCopyDragUpdate = useCallback((wx, wy) => {
    if (copyPhaseRef.current === 0) {
      if (selectedIndicesRef.current.length === 0) return;
      // FIX: cloneSegments already returns new objects, safe to store.
      const clones = cloneSegments(shapeListRef.current, selectedIndicesRef.current);
      copyClonesRef.current = clones;
      copyBasePointRef.current = { x: wx, y: wy };
      copyPhaseRef.current = 1;
      setCopyClones(clones); setCopyBasePoint({ x: wx, y: wy }); setCopyPhase(1); return;
    }
    if (copyPhaseRef.current !== 1 || !copyBasePointRef.current) return;
    const dx = wx - copyBasePointRef.current.x, dy = wy - copyBasePointRef.current.y;
    setCopyPreview(translateClones(copyClonesRef.current, dx, dy));
  }, []);

  const handleCopyDragEnd = useCallback((wx, wy, cs) => {
    if (copyPhaseRef.current === 0) {
      const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
      if (idx === -1) {
        setSelectedIndices([]);
        // FIX: let useEffect sync the ref, don't mutate directly
      } else {
        const prev = selectedIndicesRef.current;
        const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
        setSelectedIndices(next);
      }
      return;
    }
    if (!copyBasePointRef.current) return;
    const dx = wx - copyBasePointRef.current.x, dy = wy - copyBasePointRef.current.y;
    setShapeList(prev => commitCopy(prev, copyClonesRef.current, dx, dy));
    setCopyCount(prev => prev + 1);
    copyPhaseRef.current = 0; copyBasePointRef.current = null;
    setCopyPhase(0); setCopyPreview([]); setCopyBasePoint(null);
  }, []);

  const handleCopyDone = useCallback(() => {
    setCopyPhase(0); setCopyPreview([]); setCopyClones([]); setCopyBasePoint(null);
    setSelectedIndices([]); setCopyCount(0);
  }, []);

  const copyHighlights = useMemo(() => {
    if (currentShape !== 'copy') return null;
    return selectedIndices.map(idx => {
      const seg = shapeList[idx];
      if (!seg) return null;
      return renderSegmentColored(seg, `copy-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
    });
  }, [currentShape, selectedIndices, shapeList, renderSegmentColored]);

  const copyPreviewElems = useMemo(() => {
    if (currentShape !== 'copy' || copyPreview.length === 0) return null;
    return copyPreview.map((seg, i) => renderSegmentColored(seg, `copy-prev-${i}`, '#00b84a', 2, true));
  }, [currentShape, copyPreview, renderSegmentColored]);

  // ── Mirror ─────────────────────────────────────────────────────────────────
  const [mirrorPhase, setMirrorPhase] = useState(0);
  const [mirrorPt1, setMirrorPt1] = useState(null);
  const [mirrorPt2, setMirrorPt2] = useState(null);
  const [mirrorPreview, setMirrorPreview] = useState([]);
  const mirrorLiveX = useSharedValue(0);
  const mirrorLiveY = useSharedValue(0);
  const mirrorPhaseRef = useRef(0);
  const mirrorPt1Ref = useRef(null);
  useEffect(() => { mirrorPhaseRef.current = mirrorPhase; }, [mirrorPhase]);
  useEffect(() => { mirrorPt1Ref.current = mirrorPt1; }, [mirrorPt1]);

  const handleMirrorTap = useCallback((wx, wy, cs) => {
    if (mirrorPhaseRef.current !== 0) return;
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  const handleMirrorLinePt1 = useCallback((wx, wy) => {
    setMirrorPt1({ x: wx, y: wy }); setMirrorPt2({ x: wx, y: wy }); setMirrorPhase(2);
  }, []);

  const handleMirrorLineUpdate = useCallback((wx, wy) => {
    if (mirrorPhaseRef.current !== 2 || !mirrorPt1Ref.current) return;
    setMirrorPt2({ x: wx, y: wy });
    const pt1 = mirrorPt1Ref.current;
    if (selectedIndicesRef.current.length > 0) {
      const preview = selectedIndicesRef.current.map(i => mirrorSegment(shapeListRef.current[i], pt1.x, pt1.y, wx, wy));
      setMirrorPreview(preview);
    }
  }, []);

  const handleMirrorLineEnd = useCallback((wx, wy) => {
    const pt1 = mirrorPt1Ref.current;
    if (!pt1) return;
    const dist = Math.hypot(wx - pt1.x, wy - pt1.y);
    if (dist < 2) { setMirrorPhase(1); return; }
    if (selectedIndicesRef.current.length > 0) {
      setShapeList(prev => applyMirror(prev, selectedIndicesRef.current, pt1.x, pt1.y, wx, wy));
    }
    setMirrorPhase(0); setMirrorPt1(null); setMirrorPt2(null); setMirrorPreview([]);
  }, []);

  const handleStartMirrorLine = useCallback(() => {
    if (selectedIndicesRef.current.length === 0) return;
    setMirrorPhase(1);
  }, []);

  const handleMirrorDone = useCallback(() => {
    setMirrorPhase(0); setMirrorPt1(null); setMirrorPt2(null); setMirrorPreview([]); setSelectedIndices([]);
  }, []);

  const handleMirrorGestureEnd = useCallback((wx, wy, cs) => {
    const phase = mirrorPhaseRef.current;
    if (phase === 0) handleMirrorTap(wx, wy, cs);
    else if (phase === 1) handleMirrorLinePt1(wx, wy);
    else if (phase === 2) handleMirrorLineEnd(wx, wy);
  }, [handleMirrorTap, handleMirrorLinePt1, handleMirrorLineEnd]);

  const mirrorOverlay = useMemo(() => {
    if (currentShape !== 'mirror') return null;
    const elements = [];
    selectedIndices.forEach(idx => {
      const seg = shapeList[idx]; if (!seg) return;
      const el = renderSegmentColored(seg, `mir-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
      if (el) elements.push(el);
    });
    if (mirrorPt1 && mirrorPt2) {
      const dx = mirrorPt2.x - mirrorPt1.x, dy = mirrorPt2.y - mirrorPt1.y;
      const len = Math.hypot(dx, dy) || 1, ext = 2000;
      const ux = dx / len, uy = dy / len;
      const lp = Skia.Path.Make();
      lp.moveTo(mirrorPt1.x - ux * ext, mirrorPt1.y - uy * ext);
      lp.lineTo(mirrorPt1.x + ux * ext, mirrorPt1.y + uy * ext);
      elements.push(<Path key="mirror-line" path={lp} color="orange" style="stroke" strokeWidth={1.5}><DashPathEffect intervals={[8, 6]} /></Path>);
      elements.push(<Circle key="mir-pt1" cx={mirrorPt1.x} cy={mirrorPt1.y} r={4} color="orange" />);
      elements.push(<Circle key="mir-pt2" cx={mirrorPt2.x} cy={mirrorPt2.y} r={4} color="orange" />);
    }
    mirrorPreview.forEach((seg, i) => { const el = renderSegmentColored(seg, `mir-prev-${i}`, '#00cc66', 2, true); if (el) elements.push(el); });
    return elements;
  }, [currentShape, selectedIndices, shapeList, mirrorPt1, mirrorPt2, mirrorPreview, renderSegmentColored]);

  // ── Rotate ─────────────────────────────────────────────────────────────────
  const [rotatePhase, setRotatePhase] = useState(0);
  const [rotateBase, setRotateBase] = useState(null);
  const [rotateDragRef, setRotateDragRef] = useState(null);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [rotatePreview, setRotatePreview] = useState([]);
  const [rotateSnap, setRotateSnap] = useState(true);
  const rotateBaseList = useRef([]);
  const rotatePhaseRef = useRef(0);
  const rotateBaseRef = useRef(null);
  const rotateDragRefRef = useRef(null);
  const rotateSnapRef = useRef(true);
  useEffect(() => { rotatePhaseRef.current = rotatePhase; }, [rotatePhase]);
  useEffect(() => { rotateBaseRef.current = rotateBase; }, [rotateBase]);
  useEffect(() => { rotateDragRefRef.current = rotateDragRef; }, [rotateDragRef]);
  useEffect(() => { rotateSnapRef.current = rotateSnap; }, [rotateSnap]);

  const handleRotateTap = useCallback((wx, wy, cs) => {
    if (rotatePhaseRef.current !== 0) return;
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  const handleRotateSetBase = useCallback((wx, wy) => {
    if (rotatePhaseRef.current !== 1) return;
    setRotateBase({ x: wx, y: wy }); setRotatePhase(2);
  }, []);

  const handleRotateDragStart = useCallback((wx, wy) => {
    if (rotatePhaseRef.current !== 2 || !rotateBaseRef.current) return;
    // FIX: copy — never store a direct reference to the live state array
    rotateBaseList.current = [...shapeListRef.current];
    setRotateDragRef({ x: wx, y: wy }); setRotateAngle(0);
  }, []);

  const handleRotateDragUpdate = useCallback((wx, wy) => {
    const base = rotateBaseRef.current;
    const dragRef = rotateDragRefRef.current;
    if (rotatePhaseRef.current !== 2 || !base || !dragRef) return;
    let angle = computeRotationAngle(base.x, base.y, dragRef.x, dragRef.y, wx, wy);
    if (rotateSnapRef.current) angle = snapAngle(angle, 15);
    setRotateAngle(angle);
    const preview = selectedIndicesRef.current.flatMap(i => {
      const rotated = rotateSegment(rotateBaseList.current[i], base.x, base.y, angle);
      return Array.isArray(rotated) ? rotated : [rotated];
    });
    setRotatePreview(preview);
  }, []);

  const handleRotateDragEnd = useCallback((wx, wy) => {
    const base = rotateBaseRef.current;
    const dragRef = rotateDragRefRef.current;
    if (rotatePhaseRef.current !== 2 || !base || !dragRef) return;
    let angle = computeRotationAngle(base.x, base.y, dragRef.x, dragRef.y, wx, wy);
    if (rotateSnapRef.current) angle = snapAngle(angle, 15);
    setShapeList(prev => applyRotate(prev, selectedIndicesRef.current, base.x, base.y, angle));
    setRotateDragRef(null); setRotatePreview([]); setRotateAngle(0); rotateBaseList.current = [];
  }, []);

  const handleRotateGestureEnd = useCallback((wx, wy, cs) => {
    const phase = rotatePhaseRef.current;
    if (phase === 0) handleRotateTap(wx, wy, cs);
    else if (phase === 1) handleRotateSetBase(wx, wy);
    else if (phase === 2) handleRotateDragEnd(wx, wy);
  }, [handleRotateTap, handleRotateSetBase, handleRotateDragEnd]);

  const handleRotateDone = useCallback(() => {
    setRotatePhase(0); setRotateBase(null); setRotateDragRef(null); setRotateAngle(0);
    setRotatePreview([]); setSelectedIndices([]); rotateBaseList.current = [];
  }, []);

  const rotateOverlay = useMemo(() => {
    if (currentShape !== 'rotate') return null;
    const elements = [];
    selectedIndices.forEach(idx => {
      const seg = shapeList[idx]; if (!seg) return;
      const el = renderSegmentColored(seg, `rot-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
      if (el) elements.push(el);
    });
    if (rotateBase) {
      const bp = Skia.Path.Make(); bp.addCircle(rotateBase.x, rotateBase.y, 8);
      elements.push(<Path key="rot-base-circle" path={bp} color="orange" style="stroke" strokeWidth={2} />);
      const cp = Skia.Path.Make();
      cp.moveTo(rotateBase.x - 12, rotateBase.y); cp.lineTo(rotateBase.x + 12, rotateBase.y);
      cp.moveTo(rotateBase.x, rotateBase.y - 12); cp.lineTo(rotateBase.x, rotateBase.y + 12);
      elements.push(<Path key="rot-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />);
      if (rotateDragRef) {
        const rl = Skia.Path.Make();
        rl.moveTo(rotateBase.x, rotateBase.y); rl.lineTo(rotateDragRef.x, rotateDragRef.y);
        elements.push(<Path key="rot-ref-line" path={rl} color="rgba(255,165,0,0.4)" style="stroke" strokeWidth={1}><DashPathEffect intervals={[4, 4]} /></Path>);
      }
    }
    rotatePreview.forEach((seg, i) => { const el = renderSegmentColored(seg, `rot-prev-${i}`, '#00ccff', 2, true); if (el) elements.push(el); });
    return elements;
  }, [currentShape, selectedIndices, shapeList, rotateBase, rotateDragRef, rotatePreview, renderSegmentColored]);

  // ── Scale ──────────────────────────────────────────────────────────────────
  const [scalePhase, setScalePhase] = useState(0);
  const [scaleBase, setScaleBase] = useState(null);
  const [scaleDragRef, setScaleDragRef] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [scalePreview, setScalePreview] = useState([]);
  const [scaleSnap, setScaleSnap] = useState(true);
  const scaleBaseList = useRef([]);
  const scalePhaseRef = useRef(0);
  const scaleBaseRef = useRef(null);
  const scaleDragRefRef = useRef(null);
  const scaleSnapRef = useRef(true);
  useEffect(() => { scalePhaseRef.current = scalePhase; }, [scalePhase]);
  useEffect(() => { scaleBaseRef.current = scaleBase; }, [scaleBase]);
  useEffect(() => { scaleDragRefRef.current = scaleDragRef; }, [scaleDragRef]);
  useEffect(() => { scaleSnapRef.current = scaleSnap; }, [scaleSnap]);

  const handleScaleTap = useCallback((wx, wy, cs) => {
    if (scalePhaseRef.current !== 0) return;
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  const handleScaleSetBase = useCallback((wx, wy) => {
    if (scalePhaseRef.current !== 1) return;
    setScaleBase({ x: wx, y: wy }); setScalePhase(2);
  }, []);

  const handleScaleDragStart = useCallback((wx, wy) => {
    if (scalePhaseRef.current !== 2 || !scaleBaseRef.current) return;
    // FIX: copy — never store a direct reference to the live state array
    scaleBaseList.current = [...shapeListRef.current];
    setScaleDragRef({ x: wx, y: wy }); setScaleFactor(1);
  }, []);

  const handleScaleDragUpdate = useCallback((wx, wy) => {
    const base = scaleBaseRef.current;
    const dragRef = scaleDragRefRef.current;
    if (scalePhaseRef.current !== 2 || !base || !dragRef) return;
    let factor = computeScaleFactor(base.x, base.y, dragRef.x, dragRef.y, wx, wy);
    factor = Math.max(0.05, Math.min(20, factor));
    if (scaleSnapRef.current) factor = snapFactor(factor);
    setScaleFactor(factor);
    const preview = selectedIndicesRef.current.flatMap(i => {
      const scaled = scaleSegment(scaleBaseList.current[i], base.x, base.y, factor);
      return Array.isArray(scaled) ? scaled : [scaled];
    });
    setScalePreview(preview);
  }, []);

  const handleScaleDragEnd = useCallback((wx, wy) => {
    const base = scaleBaseRef.current;
    const dragRef = scaleDragRefRef.current;
    if (scalePhaseRef.current !== 2 || !base || !dragRef) return;
    let factor = computeScaleFactor(base.x, base.y, dragRef.x, dragRef.y, wx, wy);
    factor = Math.max(0.05, Math.min(20, factor));
    if (scaleSnapRef.current) factor = snapFactor(factor);
    setShapeList(prev => applyScale(prev, selectedIndicesRef.current, base.x, base.y, factor));
    setScaleDragRef(null); setScalePreview([]); setScaleFactor(1); scaleBaseList.current = [];
  }, []);

  const handleScalePreset = useCallback((factor) => {
    const base = scaleBaseRef.current;
    if (!base || selectedIndicesRef.current.length === 0) return;
    setShapeList(prev => applyScale(prev, selectedIndicesRef.current, base.x, base.y, factor));
    setScalePreview([]); setScaleFactor(1); scaleBaseList.current = [];
  }, []);

  const handleScaleGestureEnd = useCallback((wx, wy, cs) => {
    const phase = scalePhaseRef.current;
    if (phase === 0) handleScaleTap(wx, wy, cs);
    else if (phase === 1) handleScaleSetBase(wx, wy);
    else if (phase === 2) handleScaleDragEnd(wx, wy);
  }, [handleScaleTap, handleScaleSetBase, handleScaleDragEnd]);

  const handleScaleDone = useCallback(() => {
    setScalePhase(0); setScaleBase(null); setScaleDragRef(null); setScaleFactor(1);
    setScalePreview([]); setSelectedIndices([]); scaleBaseList.current = [];
  }, []);

  const scaleOverlay = useMemo(() => {
    if (currentShape !== 'scale') return null;
    const elements = [];
    selectedIndices.forEach(idx => {
      const seg = shapeList[idx]; if (!seg) return;
      const el = renderSegmentColored(seg, `sc-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
      if (el) elements.push(el);
    });
    if (scaleBase) {
      if (scaleDragRef) {
        const refDist = Math.hypot(scaleDragRef.x - scaleBase.x, scaleDragRef.y - scaleBase.y);
        if (refDist > 4) {
          const rp = Skia.Path.Make(); rp.addCircle(scaleBase.x, scaleBase.y, refDist);
          elements.push(<Path key="sc-ref-ring" path={rp} color="rgba(255,165,0,0.25)" style="stroke" strokeWidth={1}><DashPathEffect intervals={[4, 4]} /></Path>);
          const cr = Skia.Path.Make(); cr.addCircle(scaleBase.x, scaleBase.y, refDist * scaleFactor);
          elements.push(<Path key="sc-cur-ring" path={cr} color="rgba(0,200,255,0.4)" style="stroke" strokeWidth={1.5} />);
          const dl = Skia.Path.Make(); dl.moveTo(scaleBase.x, scaleBase.y); dl.lineTo(scaleDragRef.x, scaleDragRef.y);
          elements.push(<Path key="sc-drag-line" path={dl} color="rgba(255,165,0,0.5)" style="stroke" strokeWidth={1}><DashPathEffect intervals={[4, 4]} /></Path>);
        }
      }
      const bp = Skia.Path.Make(); bp.addCircle(scaleBase.x, scaleBase.y, 8);
      elements.push(<Path key="sc-base-ring" path={bp} color="orange" style="stroke" strokeWidth={2} />);
      const cp = Skia.Path.Make();
      cp.moveTo(scaleBase.x - 12, scaleBase.y); cp.lineTo(scaleBase.x + 12, scaleBase.y);
      cp.moveTo(scaleBase.x, scaleBase.y - 12); cp.lineTo(scaleBase.x, scaleBase.y + 12);
      elements.push(<Path key="sc-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />);
    }
    scalePreview.forEach((seg, i) => { const el = renderSegmentColored(seg, `sc-prev-${i}`, '#00ccff', 2, true); if (el) elements.push(el); });
    return elements;
  }, [currentShape, selectedIndices, shapeList, scaleBase, scaleDragRef, scaleFactor, scalePreview, renderSegmentColored]);

  // ── Erase ──────────────────────────────────────────────────────────────────
  const [eraseIndices, setEraseIndices] = useState([]);

  const handleEraseTap = useCallback((wx, wy, cs) => {
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) return;
    setEraseIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  const handleEraseConfirm = useCallback(() => {
    setShapeList(prev => prev.filter((_, i) => !eraseIndices.includes(i)));
    setEraseIndices([]);
  }, [eraseIndices]);

  const handleEraseCancel = useCallback(() => { setEraseIndices([]); }, []);

  const eraseOverlay = useMemo(() => {
    if (currentShape !== 'erase') return null;
    return eraseIndices.map(idx => {
      const seg = shapeList[idx]; if (!seg) return null;
      return renderSegmentColored(seg, `era-${idx}`, 'rgba(220,50,50,0.85)', 6);
    });
  }, [currentShape, eraseIndices, shapeList, renderSegmentColored]);

  // ── Pattern ────────────────────────────────────────────────────────────────
  const [cpatPhase, setCpatPhase] = useState(0);
  const [cpatCenter, setCpatCenter] = useState(null);
  const [cpatCount, setCpatCount] = useState(4);
  const [cpatSpan, setCpatSpan] = useState(360);
  const [cpatRotateInst, setCpatRotateInst] = useState(true);
  const [cpatPreview, setCpatPreview] = useState([]);
  const [cpatDragRadius, setCpatDragRadius] = useState(0);

  const [rpatPhase, setRpatPhase] = useState(0);
  const [rpatRows, setRpatRows] = useState(3);
  const [rpatCols, setRpatCols] = useState(3);
  const [rpatSpacingX, setRpatSpacingX] = useState(50);
  const [rpatSpacingY, setRpatSpacingY] = useState(50);
  const [rpatAngle, setRpatAngle] = useState(0);
  const [rpatPreview, setRpatPreview] = useState([]);

  const cpatPhaseRef = useRef(0);
  const cpatCenterRef = useRef(null);
  useEffect(() => { cpatPhaseRef.current = cpatPhase; }, [cpatPhase]);
  useEffect(() => { cpatCenterRef.current = cpatCenter; }, [cpatCenter]);

  const handleCpatTap = useCallback((wx, wy, cs) => {
    if (cpatPhaseRef.current === 0) {
      const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
      if (idx === -1) { setSelectedIndices([]); return; }
      setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
      return;
    }
    if (cpatPhaseRef.current === 1) { setCpatCenter({ x: wx, y: wy }); setCpatPhase(2); }
  }, []);

  const handleCpatDragUpdate = useCallback((wx, wy) => {
    if (cpatPhaseRef.current !== 2 || !cpatCenterRef.current) return;
    const radius = Math.hypot(wx - cpatCenterRef.current.x, wy - cpatCenterRef.current.y);
    setCpatDragRadius(radius);
    const clones = selectedIndicesRef.current.map(i => JSON.parse(JSON.stringify(shapeListRef.current[i])));
    const preview = buildCircularPreview(clones, cpatCenterRef.current.x, cpatCenterRef.current.y, cpatCount, cpatSpan, cpatRotateInst);
    setCpatPreview(preview);
  }, [cpatCount, cpatSpan, cpatRotateInst]);

  const handleCpatDragEnd = useCallback(() => {
    if (cpatPhaseRef.current !== 2 || !cpatCenterRef.current || selectedIndicesRef.current.length === 0) return;
    const clones = selectedIndicesRef.current.map(i => JSON.parse(JSON.stringify(shapeListRef.current[i])));
    const pattern = buildCircularPattern(clones, cpatCenterRef.current.x, cpatCenterRef.current.y, cpatCount, cpatSpan, cpatRotateInst);
    setShapeList(prev => applyPattern(prev, selectedIndicesRef.current, pattern));
    setCpatPhase(0); setCpatCenter(null); setCpatPreview([]); setCpatDragRadius(0); setSelectedIndices([]);
  }, [cpatCount, cpatSpan, cpatRotateInst]);

  useEffect(() => {
    if (cpatPhase !== 2 || !cpatCenter || selectedIndicesRef.current.length === 0) return;
    const clones = selectedIndicesRef.current.map(i => JSON.parse(JSON.stringify(shapeListRef.current[i])));
    const preview = buildCircularPreview(clones, cpatCenter.x, cpatCenter.y, cpatCount, cpatSpan, cpatRotateInst);
    setCpatPreview(preview);
  }, [cpatCount, cpatSpan, cpatRotateInst]);

  // FIX: cpat gesture end — previously read cpatCenterRef.current INSIDE the worklet,
  // which caused "tried to modify key of converted object" because Reanimated had
  // already frozen the ref object when it captured the worklet closure.
  // Solution: call this JS handler via runOnJS and read the ref safely on the JS thread.
  const handleCpatGestureEnd = useCallback((wx, wy, cs) => {
    const center = cpatCenterRef.current;
    const wasTap = !center || Math.hypot(wx - center.x, wy - center.y) < 6 / cs;
    if (wasTap) handleCpatTap(wx, wy, cs);
    else handleCpatDragEnd();
  }, [handleCpatTap, handleCpatDragEnd]);

  const handleRpatTap = useCallback((wx, wy, cs) => {
    if (rpatPhase !== 0) return;
    const idx = shapeListRef.current.findIndex(seg => hitTestSegment(wx, wy, seg, 8 / cs));
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, [rpatPhase]);

  const rebuildRpatPreview = useCallback(() => {
    if (selectedIndices.length === 0) { setRpatPreview([]); return; }
    const clones = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
    const preview = buildRectPreview(clones, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle * Math.PI / 180);
    setRpatPreview(preview);
  }, [selectedIndices, shapeList, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle]);

  useEffect(() => { rebuildRpatPreview(); }, [rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle, selectedIndices]);

  const handleRpatCommit = useCallback(() => {
    if (selectedIndices.length === 0) return;
    const clones = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
    const pattern = buildRectPattern(clones, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle * Math.PI / 180);
    setShapeList(prev => applyPattern(prev, selectedIndices, pattern));
    setRpatPhase(0); setRpatPreview([]); setSelectedIndices([]);
  }, [selectedIndices, shapeList, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle]);

  const renderPatternSegs = useCallback((segs, color, dashed = false, key = 'pat') =>
    segs.map((seg, i) => renderSegmentColored(seg, `${key}-${i}`, color, 1.5, dashed)).filter(Boolean),
    [renderSegmentColored]);

  const cpatOverlay = useMemo(() => {
    if (currentShape !== 'cpat') return null;
    const elements = [];
    const cs = currentScaleRef.current;
    selectedIndices.forEach(idx => { const el = renderSegmentColored(shapeList[idx], `cps-${idx}`, 'rgba(0,180,80,0.6)', 6); if (el) elements.push(el); });
    if (cpatCenter) {
      const s = 10 / cs;
      const cp = Skia.Path.Make(); cp.addCircle(cpatCenter.x, cpatCenter.y, 6 / cs);
      elements.push(<Path key="cpat-center" path={cp} color="orange" style="stroke" strokeWidth={1.5} />);
      const crp = Skia.Path.Make();
      crp.moveTo(cpatCenter.x - s, cpatCenter.y); crp.lineTo(cpatCenter.x + s, cpatCenter.y);
      crp.moveTo(cpatCenter.x, cpatCenter.y - s); crp.lineTo(cpatCenter.x, cpatCenter.y + s);
      elements.push(<Path key="cpat-cross" path={crp} color="orange" style="stroke" strokeWidth={1} />);
      if (cpatDragRadius > 0) {
        const rp = Skia.Path.Make(); rp.addCircle(cpatCenter.x, cpatCenter.y, cpatDragRadius);
        elements.push(<Path key="cpat-ring" path={rp} color="rgba(255,165,0,0.2)" style="stroke" strokeWidth={1}><DashPathEffect intervals={[6, 6]} /></Path>);
      }
    }
    renderPatternSegs(cpatPreview, '#00ccff', true, 'cp').forEach(e => elements.push(e));
    return elements;
  }, [currentShape, selectedIndices, shapeList, cpatCenter, cpatDragRadius, cpatPreview, renderSegmentColored, renderPatternSegs]);

  const rpatOverlay = useMemo(() => {
    if (currentShape !== 'rpat') return null;
    const elements = [];
    selectedIndices.forEach(idx => { const el = renderSegmentColored(shapeList[idx], `rps-${idx}`, 'rgba(0,180,80,0.6)', 6); if (el) elements.push(el); });
    renderPatternSegs(rpatPreview, 'rgba(255,140,0,0.7)', true, 'rp').forEach(e => elements.push(e));
    return elements;
  }, [currentShape, selectedIndices, shapeList, rpatPreview, renderSegmentColored, renderPatternSegs]);

  // ── Stretch ────────────────────────────────────────────────────────────────
  const [allGrips, setAllGrips] = useState([]);
  const [hotGrip, setHotGrip] = useState(null);
  const [activeGrip, setActiveGrip] = useState(null);
  const [stretchBase, setStretchBase] = useState(null);
  const activeGripRef = useRef(null);
  const stretchBaseRef = useRef(null);
  useEffect(() => { activeGripRef.current = activeGrip; }, [activeGrip]);
  useEffect(() => { stretchBaseRef.current = stretchBase; }, [stretchBase]);

  useEffect(() => {
    if (currentShape === 'stretch') setAllGrips(getAllGrips(shapeList));
    else setAllGrips([]);
  }, [shapeList, currentShape]);

  const handleStretchStart = useCallback((wx, wy, cs) => {
    const threshold = 12 / cs;
    const g = hitTestGrip(wx, wy, allGrips, threshold);
    if (g) { setActiveGrip(g); setStretchBase(shapeListRef.current[g.segIndex]); setHotGrip(null); }
  }, [allGrips]);

  const handleStretchMove = useCallback((wx, wy, cs) => {
    const grip = activeGripRef.current;
    if (grip) {
      const snapped = applySnapFull(wx, wy, null);
      const updated = applyGripMove(stretchBaseRef.current, grip.type, snapped.x, snapped.y);
      setShapeList(prev => { const next = [...prev]; next[grip.segIndex] = updated; return next; });
      return;
    }
    const threshold = 12 / cs;
    const g = hitTestGrip(wx, wy, allGrips, threshold);
    setHotGrip(g ?? null);
  }, [allGrips, applySnapFull]);

  const handleStretchEnd = useCallback((wx, wy, cs) => {
    const grip = activeGripRef.current;
    if (!grip) { handleStretchMove(wx, wy, cs); return; }
    const snapped = applySnapFull(wx, wy, null);
    const updated = applyGripMove(stretchBaseRef.current, grip.type, snapped.x, snapped.y);
    setShapeList(prev => { const next = [...prev]; next[grip.segIndex] = updated; return next; });
    setActiveGrip(null); setStretchBase(null); setHotGrip(null);
  }, [applySnapFull, handleStretchMove]);

  const gripsOverlay = useMemo(() => {
    if (currentShape !== 'stretch') return null;
    const cs = currentScaleRef.current;
    return allGrips.map(g => {
      const isHot = hotGrip?.id === g.id;
      const isActive = activeGrip?.id === g.id;
      const baseSize = g.role === 'midpoint' ? 5 : 6;
      const size = (isActive ? baseSize * 1.8 : isHot ? baseSize * 1.4 : baseSize) / cs;
      const sw = (isActive ? 2 : 1.5) / cs;
      const color = isActive ? '#ffffff' : g.color;
      const elements = [];
      if (g.role === 'midpoint') {
        const p = Skia.Path.Make(); p.moveTo(g.x, g.y - size * 1.3); p.lineTo(g.x + size, g.y + size * 0.8); p.lineTo(g.x - size, g.y + size * 0.8); p.close();
        elements.push(<Path key={g.id} path={p} color={color} style="fill" />, <Path key={g.id + 'b'} path={p} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={sw * 0.5} />);
      } else if (g.role === 'radius') {
        const p = Skia.Path.Make(); p.moveTo(g.x, g.y - size); p.lineTo(g.x + size, g.y); p.lineTo(g.x, g.y + size); p.lineTo(g.x - size, g.y); p.close();
        elements.push(<Path key={g.id} path={p} color={color} style="fill" />, <Path key={g.id + 'b'} path={p} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={sw * 0.5} />);
      } else {
        const p = Skia.Path.Make(); p.addRect({ x: g.x - size, y: g.y - size, width: size * 2, height: size * 2 });
        elements.push(<Path key={g.id} path={p} color={color} style="fill" />, <Path key={g.id + 'b'} path={p} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={sw * 0.5} />);
      }
      if (isHot || isActive) {
        const rp = Skia.Path.Make(); rp.addCircle(g.x, g.y, size * 1.8);
        elements.push(<Path key={g.id + 'glow'} path={rp} color={isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,170,255,0.25)'} style="stroke" strokeWidth={sw} />);
      }
      return elements;
    });
  }, [currentShape, allGrips, hotGrip, activeGrip]);   // currentScale removed — reads ref

  const gripDragLinePath = useDerivedValue(() => {
    if (!activeGrip || !stretchBase) return Skia.Path.Make();
    const p = Skia.Path.Make();
    p.moveTo(activeGrip.x, activeGrip.y);
    p.lineTo(translateCrossX.value, translateCrossY.value);
    return p;
  });

  const gripDragLine = useMemo(() => {
    if (!activeGrip || !stretchBase) return null;
    // strokeWidth reads ref — no dependency on scale state
    const sw = 0.7 / (currentScaleRef.current || 1);
    return <Path path={gripDragLinePath} color="rgba(255,255,255,0.4)" style="stroke" strokeWidth={sw}><DashPathEffect intervals={[4, 4]} /></Path>;
  }, [activeGrip, stretchBase, gripDragLinePath]);      // currentScale removed

  // ── Memoized full segment list render ─────────────────────────────────────
  const renderedSegments = useMemo(() =>
    shapeList.map((seg, index) => <SegmentItem key={index} seg={seg} index={index} />),
    [shapeList]
  );

  // ── Draw Gesture ───────────────────────────────────────────────────────────
  // ALL shared values used here are scalars (number | boolean).
  // Never write .value = { x, y } — that creates a frozen object.
  // Never read .value.x from a shared object — use separate scalar SVs instead.
  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onStart((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx; translateCrossY.value = wy;

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        if (!hasLastPoint.value) {
          lastPointX.value = wx; lastPointY.value = wy; hasLastPoint.value = true;
        }
        const p = Skia.Path.Make();
        p.moveTo(lastPointX.value, lastPointY.value); p.lineTo(wx, wy);
        previewPath.value = p;
      }

      // ── ARC phase 0 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        const sx = hasLastPoint.value ? lastPointX.value : wx;
        const sy = hasLastPoint.value ? lastPointY.value : wy;
        arcStartX.value = sx; arcStartY.value = sy;
        const p = Skia.Path.Make(); p.addCircle(sx, sy, 3); previewPath.value = p;
      }

      // ── ARC phase 1 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        previewPath.value = buildArcPath(arcStartX.value, arcStartY.value, arcEndX.value, arcEndY.value, wx, wy);
      }

      // ── RECTANGLE ─────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        if (!hasLastPoint.value) {
          lastPointX.value = wx; lastPointY.value = wy; hasLastPoint.value = true;
        }
        const p = Skia.Path.Make(); p.addCircle(lastPointX.value, lastPointY.value, 3); previewPath.value = p;
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        if (!hasLastPoint.value) {
          lastPointX.value = wx; lastPointY.value = wy; hasLastPoint.value = true;
        }
        const p = Skia.Path.Make(); p.addCircle(lastPointX.value, lastPointY.value, 3); previewPath.value = p;
      }

      if (currentShapeSV.value === 4) { runOnJS(handleTrim)(wx, wy, scale.value); }
      if (currentShapeSV.value === 6) { runOnJS(handleOffsetTap)(wx, wy, scale.value); }
      if (currentShapeSV.value === 5) { runOnJS(handleExtendStart)(wx, wy, scale.value); }
      if (currentShapeSV.value === 9) {
        dragStartX.value = wx; dragStartY.value = wy; wasDragMove.value = false;
        runOnJS(handleMoveStart)(wx, wy); return;
      }
      if (currentShapeSV.value === 10) { copyDragStartX.value = wx; copyDragStartY.value = wy; return; }
      if (currentShapeSV.value === 11) { mirrorLiveX.value = wx; mirrorLiveY.value = wy; return; }
      if (currentShapeSV.value === 12) { runOnJS(handleRotateDragStart)(wx, wy); return; }
      if (currentShapeSV.value === 13) { runOnJS(handleScaleDragStart)(wx, wy); return; }
      if (currentShapeSV.value === 16) { runOnJS(handleCpatDragUpdate)(wx, wy); return; }
      if (currentShapeSV.value === 19) { runOnJS(handleStretchStart)(wx, wy, scale.value); return; }
    })
    .onUpdate((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx; translateCrossY.value = wy;

      // snap/ortho feedback on JS thread for drawing modes
      if (currentShapeSV.value >= 0 && currentShapeSV.value <= 3) { runOnJS(handleDrawUpdate)(wx, wy); }

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        const p = Skia.Path.Make();
        p.moveTo(lastPointX.value, lastPointY.value); p.lineTo(wx, wy); previewPath.value = p;
      }

      // ── ARC phase 0 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        const p = Skia.Path.Make();
        p.moveTo(arcStartX.value, arcStartY.value); p.lineTo(wx, wy); previewPath.value = p;
      }

      // ── ARC phase 1 ───────────────────────────────────────────────────────
      if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        previewPath.value = buildArcPath(arcStartX.value, arcStartY.value, arcEndX.value, arcEndY.value, wx, wy);
      }

      // ── RECTANGLE ─────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        previewPath.value = buildRectPath(lastPointX.value, lastPointY.value, wx, wy);
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        const x1 = lastPointX.value, y1 = lastPointY.value;
        const cx = (x1 + wx) / 2, cy = (y1 + wy) / 2, r = getDistance(x1, y1, wx, wy) / 2;
        const p = Skia.Path.Make(); p.addCircle(cx, cy, r); previewPath.value = p;
      }

      if (currentShapeSV.value === 9) {
        const dx = wx - dragStartX.value, dy = wy - dragStartY.value;
        if (!wasDragMove.value && Math.hypot(dx, dy) > 6 / scale.value) {
          wasDragMove.value = true; runOnJS(handleMoveDragStart)();
        }
        if (wasDragMove.value) { runOnJS(handleMoveDrag)(dx, dy); }
        return;
      }
      if (currentShapeSV.value === 10) { runOnJS(handleCopyDragUpdate)(wx, wy); return; }
      if (currentShapeSV.value === 11) {
        mirrorLiveX.value = wx; mirrorLiveY.value = wy; runOnJS(handleMirrorLineUpdate)(wx, wy); return;
      }
      if (currentShapeSV.value === 12) { runOnJS(handleRotateDragUpdate)(wx, wy); return; }
      if (currentShapeSV.value === 13) { runOnJS(handleScaleDragUpdate)(wx, wy); return; }
      if (currentShapeSV.value === 15) { runOnJS(handleDimMove)(wx, wy); return; }
      if (currentShapeSV.value === 16) { runOnJS(handleCpatDragUpdate)(wx, wy); return; }
      if (currentShapeSV.value === 19) { runOnJS(handleStretchMove)(wx, wy, scale.value); return; }
    })
    .onEnd(() => {
      'worklet';
      const endX = translateCrossX.value, endY = translateCrossY.value;

      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) { runOnJS(commitLine)(endX, endY); }

      // ── ARC phase 0 → lock end point (all scalars, no object writes) ──────
      if (currentShapeSV.value === 1 && arcPhase.value === 0) {
        arcEndX.value = endX; arcEndY.value = endY; arcPhase.value = 1;
        const p = Skia.Path.Make();
        p.moveTo(arcStartX.value, arcStartY.value); p.lineTo(endX, endY); previewPath.value = p;
      }

      // ── ARC phase 1 → commit (read scalar SVs, pass plain numbers to runOnJS) ──
      else if (currentShapeSV.value === 1 && arcPhase.value === 1) {
        // Capture scalars into locals before any mutation so runOnJS args are primitives
        const sx = arcStartX.value, sy = arcStartY.value;
        const ex = arcEndX.value,   ey = arcEndY.value;
        const arc = getArcFrom3Points(sx, sy, ex, ey, endX, endY);
        previewPath.value = Skia.Path.Make();
        arcPhase.value = 0;
        lastPointX.value = ex; lastPointY.value = ey; hasLastPoint.value = true;
        if (arc) {
          // Pass only plain number/boolean primitives — no objects — across the worklet boundary
          runOnJS(addSegment)({
            type: 'arc',
            center:     { x: arc.cx, y: arc.cy },
            radius:     arc.r,
            startAngle: arc.startAngle,
            endAngle:   arc.endAngle,
            clockwise:  arc.clockwise,
            startPoint: { x: sx,   y: sy   },
            endPoint:   { x: ex,   y: ey   },
            bulgePoint: { x: endX, y: endY },
          });
        }
      }

      // ── RECTANGLE ─────────────────────────────────────────────────────────
      if (currentShapeSV.value === 2) {
        const x1 = lastPointX.value, y1 = lastPointY.value;
        previewPath.value = Skia.Path.Make();
        lastPointX.value = endX; lastPointY.value = endY; hasLastPoint.value = true;
        runOnJS(addSegment)({
          type:        'rectangle',
          topLeft:     { x: Math.min(x1, endX), y: Math.min(y1, endY) },
          bottomRight: { x: Math.max(x1, endX), y: Math.max(y1, endY) },
          corner1:     { x: x1,   y: y1   },
          corner2:     { x: endX, y: endY },
        });
      }

      // ── CIRCLE ────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 3) {
        const x1 = lastPointX.value, y1 = lastPointY.value;
        const cx = (x1 + endX) / 2, cy = (y1 + endY) / 2, r = getDistance(x1, y1, endX, endY) / 2;
        previewPath.value = Skia.Path.Make();
        lastPointX.value = endX; lastPointY.value = endY; hasLastPoint.value = true;
        runOnJS(addSegment)({
          type:   'circle',
          center: { x: cx, y: cy },
          radius: r,
          point1: { x: x1,   y: y1   },
          point2: { x: endX, y: endY },
        });
      }

      if (currentShapeSV.value === 5) { runOnJS(handleExtendEnd)(endX, endY); }
      if (currentShapeSV.value === 7 || currentShapeSV.value === 8) { runOnJS(handleFilletTap)(endX, endY, scale.value); }
      if (currentShapeSV.value === 9) { runOnJS(handleMoveEnd)(!wasDragMove.value, endX, endY, scale.value); return; }
      if (currentShapeSV.value === 10) { runOnJS(handleCopyDragEnd)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 11) { runOnJS(handleMirrorGestureEnd)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 12) { runOnJS(handleRotateGestureEnd)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 13) { runOnJS(handleScaleGestureEnd)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 14) { runOnJS(handleEraseTap)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 15) { runOnJS(handleDimTap)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 16) {
        // Read cpatCenter via shared scalar SVs — NOT via ref.current inside worklet
        // (cpatCenterRef.current is a JS object; reading it in a worklet causes the warning)
        // Instead we pass endX/endY and let the JS handler decide phase
        runOnJS(handleCpatGestureEnd)(endX, endY, scale.value);
        return;
      }
      if (currentShapeSV.value === 17) { runOnJS(handleRpatTap)(endX, endY, scale.value); return; }
      if (currentShapeSV.value === 19) { runOnJS(handleStretchEnd)(endX, endY, scale.value); return; }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => { scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE); });

  const pan = Gesture.Pan()
    .minPointers(2).maxPointers(2)
    .onStart(() => { savedX.value = translateX.value; savedY.value = translateY.value; })
    .onUpdate((e) => {
      translateX.value = clamp(savedX.value + e.translationX, -LIMIT, LIMIT);
      translateY.value = clamp(savedY.value + e.translationY, -LIMIT, LIMIT);
    });

  const composed = Gesture.Simultaneous(pinch, pan, drawGesture);

  const sendToExtrudeScreen = useCallback(() => {
    navigation.navigate('Main3D', { segments: shapeList });
  }, [navigation, shapeList]);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
   <>
        <View style={[styles.container, { width, height }]}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Brand */}
        <View style={styles.hBrand}>
          <View style={styles.hBrandIcon}><Text style={styles.hBrandIconText}>⬡</Text></View>
          <View>
            <Text style={styles.hBrandName}>CADSketch</Text>
            <Text style={styles.hBrandVersion}>2D SKETCH</Text>
          </View>
        </View>

        <View style={styles.hDivider} />

        {/* Active tool badge */}
        <View style={[styles.hToolBadge,
          currentShape && { backgroundColor: C.activeBg, borderColor: C.activeBdr }]}>
          <Text style={styles.hToolIcon}>
            {currentShape ? (SHAPE_META[currentShape]?.icon ?? '?') : '–'}
          </Text>
          <Text style={styles.hToolLabel}>
            {currentShape ? currentShape.toUpperCase() : 'NO TOOL'}
          </Text>
        </View>

        <View style={styles.hDivider} />

        {/* Ortho / Polar toggles */}
        {['line','arc','rectangle','circle'].includes(currentShape) && (
          <>
            <TouchableOpacity
              style={[styles.hToggle, orthoEnabled && styles.hToggleOn]}
              onPress={() => { setOrthoEnabled(v => !v); if (!orthoEnabled) setPolarEnabled(false); }}>
              <Text style={[styles.hToggleText, orthoEnabled && styles.hToggleTextOn]}>⊞ ORTHO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hToggle, polarEnabled && { backgroundColor: 'rgba(160,0,255,0.14)', borderColor: 'rgba(160,0,255,0.45)' }]}
              onPress={() => { setPolarEnabled(v => !v); if (!polarEnabled) setOrthoEnabled(false); }}>
              <Text style={[styles.hToggleText, polarEnabled && { color: '#a0f' }]}>⊙ POLAR</Text>
            </TouchableOpacity>
            {(orthoEnabled || polarEnabled) && orthoAxis && (
              <View style={styles.hAxisBadge}>
                <Text style={styles.hAxisText}>
                  {formatAxis(orthoAxis)}{liveStats ? `  ${liveStats.dist}  ${liveStats.angleDeg}°` : ''}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Snap badge */}
        <View style={[styles.hSnapBadge,
          { backgroundColor: activeSnapBadge ? 'rgba(0,229,160,0.14)' : 'transparent',
            borderColor: activeSnapBadge ? 'rgba(0,229,160,0.4)' : C.border }]}>
          <Text style={[styles.hSnapText, { color: activeSnapBadge ? C.success : C.textDim }]}>
            {activeSnapBadge ? `⊕ ${activeSnapBadge.type}` : '⊕ snap'}
          </Text>
        </View>
      </View>
      <GestureDetector gesture={composed}>
        <Canvas style={{ width, height: CANVAS_HEIGHT }}>
          <Group transform={transform}>
            <Grid />
            {renderedSegments}
            <Path path={animatedPreview} color="black" style="stroke" strokeWidth={2}>
              <DashPathEffect intervals={[6, 4]} />
            </Path>
            <Crosshair transform={transformCross} />
            <IntersectionDots shapeList={shapeList} />
            {renderedDimensions}
            {renderedDimPreview}
            {extendHandles}
            {filletHighlight}
            {moveHighlights}
            {copyHighlights}
            {copyPreviewElems}
            {mirrorOverlay}
            {rotateOverlay}
            {scaleOverlay}
            {eraseOverlay}
            {/* Snap marker — fully animated, zero JS re-renders */}
            <Path path={snapMarkerPath} color={snapMarkerColor} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" />
            <Path path={snapCenterPath} color={snapMarkerColor} style="fill" />
            {cpatOverlay}
            {rpatOverlay}
            {gripsOverlay}
            {gripDragLine}
          </Group>
        </Canvas>
      </GestureDetector>

      {/* ── FOOTER TOOLBAR ────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.footerInner}
        >
          {/* Tool buttons — icon + short label */}
          {SHAPES.map((shape) => {
            const meta = SHAPE_META[shape];
            const active = currentShape === shape;
            return (
              <TouchableOpacity
                key={shape}
                style={[styles.toolBtn, active && styles.toolBtnActive]}
                onPress={() => handleShapeChange(shape)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toolIcon, active && styles.toolIconActive]}>
                  {meta?.icon ?? shape[0].toUpperCase()}
                </Text>
                <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>
                  {meta?.label ?? shape}
                </Text>
                {active && <View style={styles.toolPip} />}
              </TouchableOpacity>
            );
          })}

          {/* Separator */}
          <View style={styles.toolSep} />

          {/* Extrude */}
          <TouchableOpacity style={styles.extrudeBtn} onPress={sendToExtrudeScreen} activeOpacity={0.75}>
            <Text style={styles.extrudeBtnIcon}>◈</Text>
            <Text style={styles.extrudeBtnLabel}>3D</Text>
          </TouchableOpacity>

          {/* New chain */}
          <TouchableOpacity style={styles.newBtn} onPress={handleExitChain} activeOpacity={0.75}>
            <Text style={styles.newBtnText}>✕</Text>
            <Text style={styles.newBtnLabel}>New</Text>
          </TouchableOpacity>

          {/* Snap / Osnap panel toggle */}
          <View style={styles.toolSep} />
          <TouchableOpacity
            style={[styles.snapToggleBtn, snapSettings.enabled && styles.snapToggleBtnOn]}
            onPress={() => setShowSnapPanel(v => !v)}
          >
            <Text style={[styles.snapToggleText, snapSettings.enabled && styles.snapToggleTextOn]}>
              OSNAP
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Context controls — shown inline below the tool row ── */}
        {currentShape === 'offset' && (
          <View style={styles.ctxRow}>
            <Text style={styles.ctxLabel}>Dist:</Text>
              {[5, 10, 20, 50].map(d => (
                <TouchableOpacity key={d} style={[styles.ctxChip, offsetDistance === d && styles.ctxChipOn]}
                  onPress={() => setOffsetDistance(d)}>
                  <Text style={[styles.ctxChipText, offsetDistance === d && styles.ctxChipTextOn]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(currentShape === 'fillet' || currentShape === 'chamfer') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
              {['fillet', 'chamfer'].map(m => (
                <TouchableOpacity key={m} style={{ backgroundColor: filletMode === m ? '#fff' : '#666', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                  onPress={() => { setFilletMode(m); currentShapeSV.value = SHAPE_MAP[m]; setFilletFirstSelSynced(null); filletModeRef.current = m; }}>
                  <Text style={{ color: filletMode === m ? '#333' : '#fff', fontSize: 12 }}>{m}</Text>
                </TouchableOpacity>
              ))}
              {filletMode === 'fillet' && (
                <>{[5, 10, 20, 30].map(r => (
                  <TouchableOpacity key={r} style={{ backgroundColor: filletRadius === r ? '#fff' : '#666', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                    onPress={() => { setFilletRadius(r); filletRadiusRef.current = r; }}>
                    <Text style={{ color: filletRadius === r ? '#333' : '#fff', fontSize: 12 }}>{r}</Text>
                  </TouchableOpacity>
                ))}</>
              )}
              {filletMode === 'chamfer' && (
                <>{[5, 10, 20, 30].map(d => (
                  <TouchableOpacity key={d} style={{ backgroundColor: chamferDistance === d ? '#fff' : '#666', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                    onPress={() => { setChamferDistance(d); chamferDistanceRef.current = d; }}>
                    <Text style={{ color: chamferDistance === d ? '#333' : '#fff', fontSize: 12 }}>{d}</Text>
                  </TouchableOpacity>
                ))}</>
              )}
              {filletFirstSel && <Text style={{ color: 'orange', fontSize: 12 }}>Tap 2nd line</Text>}
            </View>
          )}

          {currentShape === 'move' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{selectedIndices.length === 0 ? 'Tap segments to select' : `${selectedIndices.length} selected — drag to move`}</Text>
              {selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={() => setSelectedIndices([])}>Clear</Text>
                </View>
              )}
            </View>
          )}

          {currentShape === 'copy' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>
                {selectedIndices.length === 0 && copyCount === 0 ? 'Tap to select segments' : selectedIndices.length > 0 && copyPhase === 0 ? `${selectedIndices.length} selected — drag to copy` : copyPhase === 1 ? 'Drag to place copy' : `${copyCount} ${copyCount === 1 ? 'copy' : 'copies'} placed`}
              </Text>
              {selectedIndices.length > 0 && copyPhase === 0 && (
                <View style={{ backgroundColor: '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={() => setSelectedIndices([])}>Clear</Text>
                </View>
              )}
              {(copyCount > 0 || selectedIndices.length > 0) && (
                <View style={{ backgroundColor: '#0a7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={handleCopyDone}>Done</Text>
                </View>
              )}
            </View>
          )}

          {currentShape === 'mirror' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>
                {mirrorPhase === 0 && selectedIndices.length === 0 ? 'Tap segments to select' : mirrorPhase === 0 && selectedIndices.length > 0 ? `${selectedIndices.length} selected` : mirrorPhase === 1 ? 'Tap first point of mirror line' : 'Drag to second point — release to mirror'}
              </Text>
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#e67e00', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={handleStartMirrorLine}>Mirror line</Text>
                </View>
              )}
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={() => setSelectedIndices([])}>Clear</Text>
                </View>
              )}
              {mirrorPhase >= 1 && (
                <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={() => { setMirrorPhase(0); setMirrorPt1(null); setMirrorPt2(null); setMirrorPreview([]); }}>Cancel</Text>
                </View>
              )}
              {mirrorPhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#0a7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={handleMirrorDone}>Done</Text>
                </View>
              )}
            </View>
          )}

          {currentShape === 'rotate' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 11, flex: 1 }} numberOfLines={1}>
                {rotatePhase === 0 && selectedIndices.length === 0 ? 'Tap segments to select' : rotatePhase === 0 && selectedIndices.length > 0 ? `${selectedIndices.length} selected` : rotatePhase === 1 ? 'Tap base point' : `${Math.round(radToDeg(rotateAngle))}°`}
              </Text>
              {rotatePhase === 2 && (
                <View style={{ backgroundColor: rotateSnap ? '#e67e00' : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setRotateSnap(v => !v)}>{rotateSnap ? 'Snap 15°' : 'Free'}</Text>
                </View>
              )}
              {rotatePhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#e67e00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setRotatePhase(1)}>Base point</Text>
                </View>
              )}
              {rotatePhase === 2 && [45, 90, 135, 180].map(deg => (
                <View key={deg} style={{ backgroundColor: '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => {
                    const base = rotateBaseRef.current;
                    if (!base) return;
                    setShapeList(prev => applyRotate(prev, selectedIndices, base.x, base.y, deg * Math.PI / 180));
                    setRotateDragRef(null); setRotatePreview([]); setRotateAngle(0);
                  }}>{deg}°</Text>
                </View>
              ))}
              {rotatePhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setSelectedIndices([])}>Clear</Text>
                </View>
              )}
              {selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#0a7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={handleRotateDone}>Done</Text>
                </View>
              )}
            </View>
          )}

          {currentShape === 'scale' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 11, flex: 1 }} numberOfLines={1}>
                {scalePhase === 0 && selectedIndices.length === 0 ? 'Tap segments to select' : scalePhase === 0 && selectedIndices.length > 0 ? `${selectedIndices.length} selected` : scalePhase === 1 ? 'Tap base point' : formatFactor(scaleFactor)}
              </Text>
              {scalePhase === 2 && (
                <View style={{ backgroundColor: scaleSnap ? '#e67e00' : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <TouchableOpacity onPress={() => setScaleSnap(v => !v)}>
                    <Text style={{ color: '#fff', fontSize: 11 }}>{scaleSnap ? 'Snap' : 'Free'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {scalePhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#e67e00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setScalePhase(1)}>Base point</Text>
                </View>
              )}
              {scalePhase === 2 && [0.5, 2, 3, 4].map(f => (
                <View key={f} style={{ backgroundColor: scaleFactor === f ? '#0af' : '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => handleScalePreset(f)}>{f}×</Text>
                </View>
              ))}
              {scalePhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setSelectedIndices([])}>Clear</Text>
                </View>
              )}
              {selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#0a7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={handleScaleDone}>Done</Text>
                </View>
              )}
            </View>
          )}

          {currentShape === 'erase' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>
                {eraseIndices.length === 0 ? 'Tap segments to mark for deletion' : `${eraseIndices.length} segment${eraseIndices.length > 1 ? 's' : ''} marked`}
              </Text>
              {eraseIndices.length > 0 && (
                <View style={{ backgroundColor: '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={handleEraseCancel}>Cancel</Text>
                </View>
              )}
              {eraseIndices.length > 0 && (
                <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }} onPress={handleEraseConfirm}>Delete {eraseIndices.length}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ backgroundColor: snapSettings.enabled ? '#0a7' : '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginRight: 6 }}>
            <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setShowSnapPanel(v => !v)}>OSNAP {snapSettings.enabled ? 'ON' : 'OFF'}</Text>
          </View>

          <View style={{ backgroundColor: activeSnapBadge ? '#0f0' : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 6 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>{activeSnapBadge ? `SNAP: ${activeSnapBadge.type}` : 'no snap'}</Text>
          </View>

          {['line', 'arc', 'rectangle', 'circle'].includes(currentShape) && (
            <>
              <View style={{ backgroundColor: orthoEnabled ? '#0af' : '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginRight: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => { setOrthoEnabled(v => !v); if (!orthoEnabled) setPolarEnabled(false); }}>ORTHO {orthoEnabled ? 'ON' : 'OFF'}</Text>
              </View>
              <View style={{ backgroundColor: polarEnabled ? '#a0f' : '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginRight: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => { setPolarEnabled(v => !v); if (!polarEnabled) setOrthoEnabled(false); }}>POLAR {polarEnabled ? 'ON' : 'OFF'}</Text>
              </View>
              {(orthoEnabled || polarEnabled) && orthoAxis && (
                <View style={{ backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginRight: 6 }}>
                  <Text style={{ color: '#ff0', fontSize: 10 }}>{formatAxis(orthoAxis)}{liveStats ? `  ${liveStats.dist}  ${liveStats.angleDeg}°` : ''}</Text>
                </View>
              )}
            </>
          )}

          {currentShape === 'dim' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8, gap: 6 }}>
              {[{ type: DIM_TYPES.LINEAR, label: '↔ Linear' }, { type: DIM_TYPES.ALIGNED, label: '⟋ Aligned' }, { type: DIM_TYPES.RADIAL, label: 'R Radial' }, { type: DIM_TYPES.DIAMETER, label: '⌀ Diameter' }, { type: DIM_TYPES.ANGULAR, label: '∠ Angular' }, { type: DIM_TYPES.ORDINATE, label: '⊢ Ordinate' }, { type: DIM_TYPES.ARC_LEN, label: '⌒ Arc Len' }].map(({ type, label }) => (
                <View key={type} style={{ backgroundColor: dimMode === type ? '#0099ff' : '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: dimMode === type ? '#fff' : '#aaa', fontSize: 10 }} onPress={() => { setDimMode(type); setDimPhase(0); setDimFirstSeg(null); }}>{label}</Text>
                </View>
              ))}
              {dimMode === DIM_TYPES.LINEAR && ['horizontal', 'vertical'].map(s => (
                <View key={s} style={{ backgroundColor: dimSubtype === s ? '#006acc' : '#333', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10 }} onPress={() => setDimSubtype(s)}>{s === 'horizontal' ? '— H' : '| V'}</Text>
                </View>
              ))}
              {dimMode === DIM_TYPES.ORDINATE && ['x', 'y'].map(s => (
                <View key={s} style={{ backgroundColor: dimSubtype === s ? '#006acc' : '#333', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10 }} onPress={() => setDimSubtype(s)}>{s.toUpperCase()}</Text>
                </View>
              ))}
              <Text style={{ color: '#888', fontSize: 10 }}>Offset:</Text>
              {[16, 24, 40, 60].map(o => (
                <View key={o} style={{ backgroundColor: dimOffset === o ? '#0099ff' : '#333', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10 }} onPress={() => setDimOffset(o)}>{o}</Text>
                </View>
              ))}
              <Text style={{ color: '#aaa', fontSize: 10 }}>{dimPhase === 0 && !dimFirstSeg ? 'Tap segment or 1st point' : dimPhase === 1 ? 'Tap 2nd point' : dimFirstSeg && dimMode === DIM_TYPES.ANGULAR ? 'Tap 2nd line' : ''}</Text>
              {dimList.length > 0 && (
                <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10 }} onPress={() => setDimList([])}>Clear dims</Text>
                </View>
              )}
            </ScrollView>
          )}

          {currentShape === 'cpat' && (
            <>
              <Text style={{ color: '#fff', fontSize: 11 }}>{cpatPhase === 0 ? 'Select objects' : cpatPhase === 1 ? 'Tap center point' : 'Drag → release to place'}</Text>
              <Text style={{ color: '#888', fontSize: 10 }}>Count:</Text>
              {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <View key={n} style={{ backgroundColor: cpatCount === n ? '#0099ff' : '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setCpatCount(n)}>{n}</Text>
                </View>
              ))}
              <Text style={{ color: '#888', fontSize: 10 }}>Span:</Text>
              {[90, 120, 180, 270, 360].map(s => (
                <View key={s} style={{ backgroundColor: cpatSpan === s ? '#0099ff' : '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setCpatSpan(s)}>{s}°</Text>
                </View>
              ))}
              <View style={{ backgroundColor: cpatRotateInst ? '#e67e00' : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setCpatRotateInst(v => !v)}>{cpatRotateInst ? 'Rotate ✓' : 'No rotate'}</Text>
              </View>
              {cpatPhase === 0 && selectedIndices.length > 0 && (
                <View style={{ backgroundColor: '#0a7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => setCpatPhase(1)}>Set center →</Text>
                </View>
              )}
              {cpatPhase > 0 && (
                <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => { setCpatPhase(0); setCpatCenter(null); setCpatPreview([]); setSelectedIndices([]); }}>Cancel</Text>
                </View>
              )}
            </>
          )}

          {currentShape === 'rpat' && (
            <>
              <Text style={{ color: '#fff', fontSize: 11 }}>{selectedIndices.length === 0 ? 'Select objects' : `${selectedIndices.length} selected`}</Text>
              {[{ label: 'Rows:', vals: [1, 2, 3, 4, 5, 6], state: rpatRows, set: setRpatRows }, { label: 'Cols:', vals: [1, 2, 3, 4, 5, 6], state: rpatCols, set: setRpatCols }, { label: 'dX:', vals: [20, 30, 50, 80, 100], state: rpatSpacingX, set: setRpatSpacingX }, { label: 'dY:', vals: [20, 30, 50, 80, 100], state: rpatSpacingY, set: setRpatSpacingY }, { label: 'Angle:', vals: [0, 15, 30, 45, 90], state: rpatAngle, set: setRpatAngle }].map(({ label, vals, state, set }) => (
                <React.Fragment key={label}>
                  <Text style={{ color: '#888', fontSize: 10 }}>{label}</Text>
                  {vals.map(n => (
                    <View key={n} style={{ backgroundColor: state === n ? '#0099ff' : '#444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => set(n)}>{n}{label === 'Angle:' ? '°' : ''}</Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
              {selectedIndices.length > 0 && (
                <>
                  <View style={{ backgroundColor: '#0a7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 11 }} onPress={handleRpatCommit}>Place {rpatRows * rpatCols}</Text>
                  </View>
                  <View style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 11 }} onPress={() => { setSelectedIndices([]); setRpatPreview([]); }}>Cancel</Text>
                  </View>
                </>
              )}
            </>
          )}

          {currentShape === 'stretch' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>
                {!activeGrip && !hotGrip ? 'Hover over a grip point' : hotGrip && !activeGrip ? `${hotGrip.role} grip — drag to stretch` : activeGrip ? `Stretching ${activeGrip.role}…` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {[{ color: GRIP_COLOR.endpoint, label: 'End' }, { color: GRIP_COLOR.midpoint, label: 'Mid' }, { color: GRIP_COLOR.center, label: 'Center' }, { color: GRIP_COLOR.radius, label: 'Radius' }].map(({ color, label }) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: color }} />
                    <Text style={{ color: '#aaa', fontSize: 9 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
      {showSnapPanel && (
        <View style={{ position: 'absolute', bottom: FOOTER_HEIGHT, left: 0, right: 0, backgroundColor: '#222', borderRadius: 8, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 100, elevation: 10 }}>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>OSNAP Settings</Text>
            <TouchableOpacity style={{ backgroundColor: snapSettings.enabled ? '#0a7' : '#555', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 }}
              onPress={() => setSnapSettings(s => ({ ...s, enabled: !s.enabled }))}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{snapSettings.enabled ? 'Enabled' : 'Disabled'}</Text>
            </TouchableOpacity>
          </View>
          {[{ key: 'endpoint', label: 'Endpoint', color: SNAP_COLORS.endpoint }, { key: 'midpoint', label: 'Midpoint', color: SNAP_COLORS.midpoint }, { key: 'center', label: 'Center', color: SNAP_COLORS.center }, { key: 'intersection', label: 'Intersect', color: SNAP_COLORS.intersection }, { key: 'perpendicular', label: 'Perpendicular', color: SNAP_COLORS.perpendicular }, { key: 'tangent', label: 'Tangent', color: SNAP_COLORS.tangent }, { key: 'nearest', label: 'Nearest', color: SNAP_COLORS.nearest }].map(({ key, label, color }) => (
            <TouchableOpacity key={key} style={{ backgroundColor: !snapSettings[key] ? color + '33' : '#333', borderWidth: 1, borderColor: !snapSettings[key] ? color : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
              onPress={() => setSnapSettings(s => ({ ...s, [key]: !s[key] }))}>
              <Text style={{ color: !snapSettings[key] ? color : '#888', fontSize: 11 }}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 11 }}>Radius: {snapSettings.radius}</Text>
            {[10, 20, 30, 50].map(r => (
              <TouchableOpacity key={r} style={{ backgroundColor: snapSettings.radius === r ? '#0af' : '#444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}
                onPress={() => setSnapSettings(s => ({ ...s, radius: r }))}>
                <Text style={{ color: '#fff', fontSize: 11 }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
   </>
  );
};

export default Sketching2D;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  hBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hBrandIcon: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: C.activeBg,
    borderWidth: 1, borderColor: C.activeBdr,
    alignItems: 'center', justifyContent: 'center',
  },
  hBrandIconText: { color: C.active, fontSize: 12 },
  hBrandName: {
    color: C.text, fontSize: 11,
    fontFamily: DS_MONO, fontWeight: '700', letterSpacing: 1.5,
  },
  hBrandVersion: {
    color: C.textDim, fontSize: 7,
    fontFamily: DS_MONO, letterSpacing: 0.8,
  },
  hDivider: { width: 1, height: 22, backgroundColor: C.border, marginHorizontal: 2 },
  hToolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: C.border, borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  hToolIcon: { color: C.active, fontSize: 14, lineHeight: 18 },
  hToolLabel: {
    color: C.active, fontSize: 9,
    fontFamily: DS_MONO, fontWeight: '700', letterSpacing: 0.8,
  },
  hToggle: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1, borderColor: C.border,
  },
  hToggleOn: { backgroundColor: C.activeBg, borderColor: C.activeBdr },
  hToggleText: { color: C.textDim, fontSize: 8, fontFamily: DS_MONO, letterSpacing: 0.5 },
  hToggleTextOn: { color: C.active },
  hAxisBadge: {
    backgroundColor: '#1a1a00', borderWidth: 1,
    borderColor: 'rgba(247,201,72,0.35)', borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  hAxisText: { color: C.warning, fontSize: 9, fontFamily: DS_MONO },
  hSnapBadge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  hSnapText: { fontSize: 8, fontFamily: DS_MONO, letterSpacing: 0.4 },

  // ── Footer toolbar ───────────────────────────────────────────────────────
  footer: {
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 2,
  },

  // Tool button — icon + label + active pip
  toolBtn: {
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: C.surface2,
    minWidth: 40,
    position: 'relative',
  },
  toolBtnActive: {
    backgroundColor: C.activeBg,
    borderColor: C.activeBdr,
  },
  toolIcon: { fontSize: 15, color: C.textDim, lineHeight: 19 },
  toolIconActive: { color: C.active },
  toolLabel: {
    fontSize: 7, color: C.textDim,
    fontFamily: DS_MONO, letterSpacing: 0.3, marginTop: 1,
  },
  toolLabelActive: { color: C.active },
  toolPip: {
    position: 'absolute', bottom: 2,
    left: '50%', marginLeft: -2,
    width: 4, height: 2, borderRadius: 1,
    backgroundColor: C.active,
  },
  toolSep: { width: 1, height: 30, backgroundColor: C.border, marginHorizontal: 4 },

  // Extrude button
  extrudeBtn: {
    alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 5, borderWidth: 1,
    backgroundColor: C.extrudeBg, borderColor: C.extrudeBdr,
    marginLeft: 2,
  },
  extrudeBtnIcon: { color: C.extrude, fontSize: 14, lineHeight: 18 },
  extrudeBtnLabel: { color: C.extrude, fontSize: 7, fontFamily: DS_MONO, fontWeight: '700', letterSpacing: 0.8 },

  // New chain button
  newBtn: {
    alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 5, borderWidth: 1,
    backgroundColor: 'rgba(240,64,64,0.12)', borderColor: 'rgba(240,64,64,0.35)',
    marginLeft: 2,
  },
  newBtnText: { color: C.danger, fontSize: 12, lineHeight: 16 },
  newBtnLabel: { color: C.danger, fontSize: 7, fontFamily: DS_MONO, letterSpacing: 0.8 },

  // Snap toggle
  snapToggleBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, borderWidth: 1, borderColor: C.border,
  },
  snapToggleBtnOn: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: 'rgba(0,229,160,0.4)' },
  snapToggleText: { color: C.textDim, fontSize: 8, fontFamily: DS_MONO, letterSpacing: 0.5 },
  snapToggleTextOn: { color: C.success, fontWeight: '700' },

  // Context/param row (offset distance, etc)
  ctxRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingBottom: 5,
  },
  ctxLabel: { color: C.textMid, fontSize: 9, fontFamily: DS_MONO },
  ctxChip: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1, borderColor: C.borderLt,
    backgroundColor: C.surface2,
  },
  ctxChipOn: { backgroundColor: C.activeBg, borderColor: C.activeBdr },
  ctxChipText: { color: C.textMid, fontSize: 10, fontFamily: DS_MONO },
  ctxChipTextOn: { color: C.active, fontWeight: '700' },
});