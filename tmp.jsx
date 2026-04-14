import { StyleSheet, Text, View, useWindowDimensions, ScrollView ,TouchableOpacity } from 'react-native';
import React, { useState, useCallback,useEffect,useRef,useMemo } from 'react';
import { Canvas, Group, Path, Skia, DashPathEffect,Circle, matchFont,Text as SkiaText,useFont } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import Grid, { Crosshair,resolveSnap,snapToGrid } from './components/grid';
import { clamp } from './utils/math';
import { hitTestSegment } from './utils/trim/hitTest';
import { applyTrim } from './utils/trim/trim';
import { hitTestEndpoint, applyExtend } from './utils/extend/extend';
import { getAllIntersectionsPoints } from './utils/trim/intersect';
import { applyOffsetSingle, getSideFromTap } from './utils/offset/offset';
import {applyFilletToLines,applyChamferToLines,applyCornerToRect,} from './utils/fillet/fillet'
import { translateSegments } from './utils/move/move';
import { cloneSegments, translateClones, commitCopy } from './utils/copy/copy';
import { applyMirror,mirrorSegment } from './utils/mirror/mirror';
import { applyRotate, computeRotationAngle, snapAngle, radToDeg, rotateSegment } from './utils/rotate/rotate';
import {applyScale, scaleSegment,computeScaleFactor, snapFactor, formatFactor,} from './utils/scale/scale';
import { findSnapPoint, DEFAULT_SNAP_SETTINGS, SNAP_COLORS, SNAP_SHAPES,resolveSnapPoint } from './utils/snap/snap';
import { applyOrtho, formatAxis, computeAngleDeg, computeDist }  from './utils/ortho/ortho';
import { DIM_TYPES, DIM_SUBTYPES, autoDetectDimType, formatDimValue, buildDimGeometry, } from './utils/dimension/dimension';
import {buildCircularPattern, buildRectPattern,buildCircularPreview, buildRectPreview,applyPattern,} from './utils/pattern/pattern';
import { getAllGrips, hitTestGrip, applyGripMove, getGrips, GRIP_COLOR,} from './utils/stretch/stretch';
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;


const SHAPES = [
  "line","arc","rectangle","circle",
  "trim","extend","offset","fillet","chamfer",
  "move","copy","mirror","rotate","scale","erase",
  "dim","cpat","rpat","stretch"
];

const SHAPE_MAP = {
  line:0, arc:1, rectangle:2, circle:3,
  trim:4, extend:5, offset:6, fillet:7, chamfer:8,
  move:9, copy:10, mirror:11, rotate:12, scale:13,
  erase:14, dim:15,
  cpat:16, rpat:17, stretch:18 
};

const Sketching2D = ({navigation}) => {
  const { width, height } = useWindowDimensions();
  const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT;
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const font = useFont(require("../../assets/fonts/roboto.ttf"), 10);
  // ── viewport transform ────────────────────────────────────────────────────
  const scale      = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX     = useSharedValue(centerX);
  const savedY     = useSharedValue(centerY);
  const savedScale = useSharedValue(1);
  const MIN_SCALE  = 0.2;
  const MAX_SCALE  = 5;
  const LIMIT      = 500;  // max pan in any direction

  const transform = useDerivedValue(() => [   
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);
// ── grid snap state ───────────────────────────────────────────────────────────
const GRID_MINOR = 20;
const GRID_MAJOR = 100;
const [gridSnapEnabled, setGridSnapEnabled] = useState(false);
const [gridSnapPoint,   setGridSnapPoint]   = useState(null);
// ── snap state ─────────────────────────────────────────────────────────────
const [snapSettings, setSnapSettings] = useState(DEFAULT_SNAP_SETTINGS);
const [activeSnap,   setActiveSnap]   = useState(null);
const [showSnapPanel, setShowSnapPanel] = useState(false);
const [currentScale, setCurrentScale] = useState(1);
  useDerivedValue(() => {
  runOnJS(setCurrentScale)(scale.value);
})
// Called from JS thread during onUpdate / onEnd
const applySnap = useCallback((wx, wy, fromPoint = null) => {
  const drawingModes = ['line','arc','rectangle','circle'];
  if (!drawingModes.includes(currentShape)) return { x: wx, y: wy };
  const snap = findSnapPoint(wx, wy, shapeList, snapSettings, fromPoint);
  setActiveSnap(snap);
  return snap ? { x: snap.x, y: snap.y } : { x: wx, y: wy };
}, [currentShape, shapeList, snapSettings]); // ✅ all three deps

// JS-thread draw update with snap applied

// Replace your existing handleDrawUpdate:
const handleDrawUpdate = useCallback((wx, wy) => {
  const from = hasLastPoint.value
    ? { x: lastPoint.value.x, y: lastPoint.value.y }
    : null;
  const constrained = constrainPoint(wx, wy, from); // ← apply ortho
  applySnap(constrained.x, constrained.y, from);
}, [applySnap, constrainPoint]);

// Replace your existing commitLine:
const commitLine = useCallback((wx, wy) => {
  const startX = lastPoint.value.x;
  const startY = lastPoint.value.y;
  const from   = { x: startX, y: startY };

  // 1. ortho first, then snap
  const constrained = constrainPoint(wx, wy, from);
  const snapped     = getSnappedPoint(constrained.x, constrained.y, from);

  previewPath.value = Skia.Path.Make();
  lastPoint.value   = { x: snapped.x, y: snapped.y };

  addSegment({
    type:       'line',
    startPoint: { x: startX,   y: startY   },
    endPoint:   { x: snapped.x, y: snapped.y },
  });

  setActiveSnap(null);
  clearOrtho();
}, [getSnappedPoint, addSegment, constrainPoint, clearOrtho]);

// Wrap your addSegment calls to snap first

const getSnappedPoint = useCallback((wx, wy, fromPoint = null) => {
  const snap = findSnapPoint(wx, wy, shapeList, snapSettings, fromPoint);
  // ✅ Don't clear activeSnap here — let it persist so the marker stays visible
  // setActiveSnap(null);   ← DELETE this line
  return snap ?? { x: wx, y: wy };
}, [shapeList, snapSettings]);


const renderSnapMarker = () => {
  if (!activeSnap) return null;
;
  const { x, y, type } = activeSnap;
  const color  = SNAP_COLORS[type]  ?? '#ffffff';
  const shape  = SNAP_SHAPES[type]  ?? 'dot';
  const size   = 8 / currentScale;    // ✅ plain React state, safe during render
  const stroke = 1.5 / currentScale;  // ✅
  const elements = [];



  // ── Square (endpoint) ──────────────────────────────────────────────────────
  if (shape === 'square') {
    const p = Skia.Path.Make();
    p.addRect({ x: x-size, y: y-size, width: size*2, height: size*2 });
    elements.push(
      <Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── Triangle (midpoint) ────────────────────────────────────────────────────
  if (shape === 'triangle') {
    const p = Skia.Path.Make();
    p.moveTo(x,        y - size * 1.2);
    p.lineTo(x + size, y + size * 0.8);
    p.lineTo(x - size, y + size * 0.8);
    p.close();
    elements.push(
      <Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── Circle (center) ────────────────────────────────────────────────────────
  if (shape === 'circle') {
    elements.push(
      <Circle key="snap" cx={x} cy={y} r={size} color="transparent" />,
    );
    const p = Skia.Path.Make();
    p.addCircle(x, y, size);
    elements.push(
      <Path key="snap-ring" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── Cross X (intersection) ─────────────────────────────────────────────────
  if (shape === 'cross') {
    const p = Skia.Path.Make();
    p.moveTo(x - size, y - size); p.lineTo(x + size, y + size);
    p.moveTo(x + size, y - size); p.lineTo(x - size, y + size);
    elements.push(
      <Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── L shape (perpendicular) ────────────────────────────────────────────────
  if (shape === 'L') {
    const p = Skia.Path.Make();
    p.moveTo(x - size, y - size);
    p.lineTo(x - size, y + size);
    p.lineTo(x + size, y + size);
    elements.push(
      <Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── T shape (tangent) ──────────────────────────────────────────────────────
  if (shape === 'T') {
    const p = Skia.Path.Make();
    p.moveTo(x - size, y - size); p.lineTo(x + size, y - size);
    p.moveTo(x,        y - size); p.lineTo(x,        y + size);
    elements.push(
      <Path key="snap" path={p} color={color} style="stroke" strokeWidth={stroke} />
    );
  }

  // ── Dot (nearest) ─────────────────────────────────────────────────────────
  if (shape === 'dot') {
    elements.push(
      <Circle key="snap" cx={x} cy={y} r={size * 0.5} color={color} />
    );
  }

  // Always add a small center dot
  elements.push(
    <Circle key="snap-center" cx={x} cy={y} r={1.5 / currentScale} color={color} />
  );

  return elements;
};
 // ── ortho state ───────────────────────────────────────────────────────────────
const [orthoEnabled, setOrthoEnabled] = useState(false);
const [polarEnabled, setPolarEnabled] = useState(false);
// polarEnabled = 45° mode (overrides ortho when both on)
const [orthoAxis,    setOrthoAxis]    = useState(null);
// live axis label while drawing: 'horizontal' | 'vertical' | 'diagonal-45' etc
const [liveStats,    setLiveStats]    = useState(null);
// { dist, angleDeg } shown while drawing

/**
 * Apply ortho/polar constraint to a raw world point.
 * fromPoint = the anchor (lastPoint while drawing a line).
 * Returns constrained { x, y }.
 */
const constrainPoint = useCallback((wx, wy, fromPoint) => {
  if (!fromPoint) return { x: wx, y: wy };

  const mode = polarEnabled ? 'polar' : orthoEnabled ? 'ortho' : null;
  if (!mode) return { x: wx, y: wy };

  const result = applyOrtho(fromPoint.x, fromPoint.y, wx, wy, mode);
  setOrthoAxis(result.axis);

  // Live stats
  const dist     = computeDist(fromPoint.x, fromPoint.y, result.x, result.y);
  const angleDeg = computeAngleDeg(fromPoint.x, fromPoint.y, result.x, result.y);
  setLiveStats({ dist: Math.round(dist * 10) / 10, angleDeg: Math.round(angleDeg) });

  return { x: result.x, y: result.y };
}, [orthoEnabled, polarEnabled]);

// Clear ortho state after commit
const clearOrtho = useCallback(() => {
  setOrthoAxis(null);
  setLiveStats(null);
}, []);
// ── dimension state ───────────────────────────────────────────────────────────
// Dimensions are stored separately from shapeList
const [dimList,      setDimList]      = useState([]);
const [dimMode,      setDimMode]      = useState(DIM_TYPES.ALIGNED);
// Subtype for linear / ordinate
const [dimSubtype,   setDimSubtype]   = useState('horizontal');
// Dimension offset from geometry
const [dimOffset,    setDimOffset]    = useState(24);

// Phase state for manual two-point placement
// Phase 0: waiting for first tap
// Phase 1: first point picked, waiting for second
// Phase 2: both points picked, waiting for offset drag
const [dimPhase,     setDimPhase]     = useState(0);
const [dimPt1,       setDimPt1]       = useState(null);
const [dimPt2,       setDimPt2]       = useState(null);
const [dimFirstSeg,  setDimFirstSeg]  = useState(null); // for angular
const [dimPreview,   setDimPreview]   = useState(null); // live dim geometry

const handleDimTap = useCallback((wx, wy, currentScale) => {

  // ── Hit-test: lines use segment distance, circles/arcs use radial distance ──
  const idx = shapeList.findIndex(seg => {
    if (seg.type === 'line' || seg.type === 'rectangle') {
      return hitTestSegment(wx, wy, seg, 10 / currentScale);
    }
    if (seg.type === 'circle') {
      const d = Math.hypot(wx - seg.center.x, wy - seg.center.y);
      return Math.abs(d - seg.radius) < 12 / currentScale;
    }
    if (seg.type === 'arc') {
      const d = Math.hypot(wx - seg.center.x, wy - seg.center.y);
      if (Math.abs(d - seg.radius) > 12 / currentScale) return false;
      const angle = Math.atan2(wy - seg.center.y, wx - seg.center.x);
      const norm  = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const ns    = norm(seg.startAngle);
      const ne    = norm(seg.endAngle);
      const na    = norm(angle);
      if (seg.clockwise) {
        return ns <= ne ? (na >= ns && na <= ne) : (na >= ns || na <= ne);
      } else {
        return ns >= ne ? (na <= ns && na >= ne) : (na <= ns || na >= ne);
      }
    }
    return false;
  });

  if (idx !== -1) {
    const seg = shapeList[idx];

    // ── AUTO-DETECT: circle/arc tapped in wrong mode → override automatically ──
    if (seg.type === 'circle' && dimMode !== DIM_TYPES.DIAMETER && dimMode !== DIM_TYPES.RADIAL) {
      const geo = buildDimGeometry({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy });
      if (geo) commitDim({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy }, geo);
      return;
    }

    if (seg.type === 'arc' && dimMode !== DIM_TYPES.RADIAL && dimMode !== DIM_TYPES.ARC_LEN) {
      const geo = buildDimGeometry({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy });
      if (geo) commitDim({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy }, geo);
      return;
    }

    // ── ANGULAR: needs two line taps ─────────────────────────────────────────
    if (dimMode === DIM_TYPES.ANGULAR) {
      if (!dimFirstSeg) {
        if (seg.type !== 'line') return;
        setDimFirstSeg({ seg, tapX: wx, tapY: wy });
        return;
      }
      if (seg.type !== 'line') return;
      // Guard: same segment tapped twice → cancel
      if (dimFirstSeg.seg === seg) {
        setDimFirstSeg(null);
        return;
      }
      const geo = buildDimGeometry({
        dimType: DIM_TYPES.ANGULAR,
        segA: dimFirstSeg.seg, segB: seg,
        tapX: wx, tapY: wy,
      });
      if (geo) commitDim({ dimType: DIM_TYPES.ANGULAR, segA: dimFirstSeg.seg, segB: seg, tapX: wx, tapY: wy }, geo);
      setDimFirstSeg(null);
      return;
    }

    // ── RADIAL: arc or circle ─────────────────────────────────────────────────
    if (dimMode === DIM_TYPES.RADIAL) {
      if (seg.type !== 'circle' && seg.type !== 'arc') return;
      const geo = buildDimGeometry({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy, offset: dimOffset });
      if (geo) commitDim({ dimType: DIM_TYPES.RADIAL, seg, tapX: wx, tapY: wy, offset: dimOffset }, geo);
      return;
    }

    // ── DIAMETER: circles only ────────────────────────────────────────────────
    if (dimMode === DIM_TYPES.DIAMETER) {
      if (seg.type !== 'circle') return;
      const geo = buildDimGeometry({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy, offset: dimOffset });
      if (geo) commitDim({ dimType: DIM_TYPES.DIAMETER, seg, tapX: wx, tapY: wy, offset: dimOffset }, geo);
      return;
    }

    // ── ARC_LEN: arcs only ────────────────────────────────────────────────────
    if (dimMode === DIM_TYPES.ARC_LEN) {
      if (seg.type !== 'arc') return;
      const geo = buildDimGeometry({ dimType: DIM_TYPES.ARC_LEN, seg, offset: dimOffset });
      if (geo) commitDim({ dimType: DIM_TYPES.ARC_LEN, seg, offset: dimOffset }, geo);
      return;
    }

    // ── ALIGNED: auto from line segment ──────────────────────────────────────
    if (dimMode === DIM_TYPES.ALIGNED && seg.type === 'line') {
      const geo = buildDimGeometry({
        dimType: DIM_TYPES.ALIGNED,
        pt1: seg.startPoint, pt2: seg.endPoint,
        offset: dimOffset,
      });
      if (geo) commitDim({
        dimType: DIM_TYPES.ALIGNED,
        pt1: seg.startPoint, pt2: seg.endPoint,
        offset: dimOffset,
      }, geo);
      return;
    }
  }

  // ── Manual two-point mode ─────────────────────────────────────────────────
  if (dimPhase === 0) {
    setDimPt1({ x: wx, y: wy });
    setDimPhase(1);
    return;
  }

  if (dimPhase === 1) {
    setDimPt2({ x: wx, y: wy });
    setDimPhase(2);
    const geo = buildDimGeometry({
      dimType: dimMode,
      pt1:     dimPt1,
      pt2:     { x: wx, y: wy },
      offset:  dimOffset,
      subtype: dimSubtype,
    });
    if (geo) commitDim({
      dimType: dimMode,
      pt1:     dimPt1,
      pt2:     { x: wx, y: wy },
      offset:  dimOffset,
      subtype: dimSubtype,
    }, geo);
    setDimPhase(0);
    setDimPt1(null);
    setDimPt2(null);
    return;
  }
}, [shapeList, dimMode, dimSubtype, dimOffset, dimPhase, dimPt1, dimFirstSeg]);

// ── Live preview while picking second point ───────────────────────────────────
const handleDimMove = useCallback((wx, wy) => {
  if (dimPhase !== 1 || !dimPt1) return;
  if (dimMode === DIM_TYPES.LINEAR ||
      dimMode === DIM_TYPES.ALIGNED ||
      dimMode === DIM_TYPES.ORDINATE) {
    const geo = buildDimGeometry({
      dimType: dimMode,
      pt1:     dimPt1,
      pt2:     { x: wx, y: wy },
      offset:  dimOffset,
      subtype: dimSubtype,
    });
    setDimPreview(geo);
  }
}, [dimPhase, dimPt1, dimMode, dimOffset, dimSubtype]);

// ── Commit a dimension to dimList ─────────────────────────────────────────────
const commitDim = useCallback((record, geo) => {
  setDimList(prev => [...prev, { record, geo,
    text: formatDimValue(geo.value, record.dimType) }]);
}, []);

// Font setup — do once at component level
const dimFont = useMemo(() => {
  try {
    return matchFont({ familyName: "Arial", fontSize: 100 });
  } catch { return null; }
}, []);

const renderDimText = (text, x, y, angleDeg = 0, key, color = '#0099ff') => {
  if (!dimFont) return null;
  const textWidth = text.length * 4;  // approximate
  const conditionalAngle=  angleDeg;
  console.log(angleDeg)
  return (
    <Group
      key={`${key}-text`}
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: angleDeg * Math.PI / 180 },
        { translateX: -textWidth / 2 },
        { translateY: -6 },
      ]}
    >
      <Path
        path={(() => {
          const p = Skia.Path.Make();
          p.addRect({ x: -2, y: -1, width: textWidth + 4, height: 13 });
          return p;
        })()}
        color="rgba(255,255,255,0.85)"
        style="fill"
      />
      <SkiaText  transform={[{ rotate: 0 }]}
        x={0} y={7}
        text={String(`${text} mm`)}
        font={font}
        color={color}
      />
    </Group>
  );
};

// ── Render one dimension geometry ─────────────────────────────────────────────
const renderDimGeometry = (geo, text, key, color = '#0099ff') => {
  if (!geo) return null;
  const elements = [];
  const sw = 1;

  // Extension lines
  geo.extLines?.forEach(([a, b], i) => {
    const p = Skia.Path.Make();
    p.moveTo(a.x, a.y); p.lineTo(b.x, b.y);
    elements.push(
      <Path key={`${key}-ext-${i}`} path={p}
        color={color} style="stroke" strokeWidth={sw}
      />
    );
  });

  // Dimension line
  if (geo.dimLine) {
    const [a, b] = geo.dimLine;
    const p = Skia.Path.Make();
    p.moveTo(a.x, a.y); p.lineTo(b.x, b.y);
    elements.push(
      <Path key={`${key}-dimline`} path={p}
        color={color} style="stroke" strokeWidth={sw}
      />
    );
  }

  // Dimension arc (angular, arc length)
  if (geo.dimArc) {
    const { center, radius, startAngle, endAngle, clockwise } = geo.dimArc;
    let startDeg = startAngle * 180 / Math.PI;
    let sweepDeg = (endAngle - startAngle) * 180 / Math.PI;
    if (clockwise) { if (sweepDeg < 0) sweepDeg += 360; }
    else           { if (sweepDeg > 0) sweepDeg -= 360; }
    const p = Skia.Path.Make();
    p.addArc(
      { x: center.x - radius, y: center.y - radius, width: radius*2, height: radius*2 },
      startDeg, sweepDeg
    );
    elements.push(
      <Path key={`${key}-dimarc`} path={p}
        color={color} style="stroke" strokeWidth={sw}
      />
    );
  }

  // Angular arc
  if (geo.vertex && geo.arcR) {
    let startDeg = geo.startAngle * 180 / Math.PI;
    let sweepDeg = (geo.endAngle - geo.startAngle) * 180 / Math.PI;
    if (sweepDeg < 0) sweepDeg += 360;
    const p = Skia.Path.Make();
    p.addArc(
      { x: geo.vertex.x - geo.arcR, y: geo.vertex.y - geo.arcR,
        width: geo.arcR*2, height: geo.arcR*2 },
      startDeg, sweepDeg
    );
    elements.push(
      <Path key={`${key}-angarc`} path={p}
        color={color} style="stroke" strokeWidth={sw}
      />
    );
  }

  // Arrow heads
  geo.arrows?.forEach((arrow, i) => {
    if (!arrow || arrow.length < 3) return;
    const p = Skia.Path.Make();
    p.moveTo(arrow[0].x, arrow[0].y);
    p.lineTo(arrow[1].x, arrow[1].y);
    p.lineTo(arrow[2].x, arrow[2].y);
    p.close();
    elements.push(
      <Path key={`${key}-arr-${i}`} path={p}
        color={color} style="fill"
      />
    );
  });

  // Text — rendered as Skia Paragraph or simple fallback
  // Using Circle as text anchor marker (text rendering needs Skia Paragraph API)
  if (geo.textPt) {
    elements.push(
      <Circle
        key={`${key}-textdot`}
        cx={geo.textPt.x} cy={geo.textPt.y}
        r={1} color={color}
      />
    );
    // Skia text via Paragraph (see Step 7 for full text rendering)
    elements.push(
      renderDimText(text, geo.textPt.x, geo.textPt.y, geo.textAngle, key, color)
    );
  }

  return elements;
};

// ── Render all committed dimensions ───────────────────────────────────────────
const renderDimensions = () =>
  dimList.map(({ geo, text }, i) =>
    renderDimGeometry(geo, text, `dim-${i}`)
  );

// ── Render live preview ───────────────────────────────────────────────────────
const renderDimPreview = () => {
  if (!dimPreview || currentShape !== 'dim') return null;
  const text = formatDimValue(dimPreview.value, dimMode);
  return renderDimGeometry(dimPreview, text, 'dim-preview', 'rgba(0,153,255,0.5)');
};



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
  // ── offset state ──────────────────────────────────────────────────────────────
const [offsetDistance, setOffsetDistance] = useState(10);
const [pendingOffset,  setPendingOffset]  = useState(null);
// pendingOffset = { segIndex, side } — set on tap, confirmed on distance input

//   console.log(getAllIntersectionsPoints(shapeList)) // for testing intersections;
   const DrawIntersections = () => {
  const intersections = getAllIntersectionsPoints(shapeList);

  return (
    <>
      {intersections.map((inter, index) => (
        <Circle
          key={index}
          cx={inter.point.x}
          cy={inter.point.y}
          r={2}
          color="red"
        />
      ))}
    </>
  );
};

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
  setFilletFirstSelSynced(null);
   setSelectedIndices([]);
   setIsDragging(false);
  // sync filletMode ref if switching to fillet/chamfer directly
  if (shape === 'fillet' || shape === 'chamfer') {
    setFilletMode(shape);
    filletModeRef.current = shape;    // ← update ref immediately
  }
  // ── reset copy ──────────────────────────────────────────────────────────
  setCopyPhase(0);
  setCopyPreview([]);
  setCopyClones([]);
  setCopyBasePoint(null);
  setCopyCount(0);
  // ── mirror ──────────────────────────────────────────────────────────────
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
  // ── scale ──────────────────────────────────────────────────────────────
  setScalePhase(0);
  setScaleBase(null);
  setScaleDragRef(null);
  setScaleFactor(1);
  setScalePreview([]);
  scaleBaseList.current = [];
  // delete  ──────────────────────────────────────────────────────────────
   setEraseIndices([]);
}, []);

const CROSSHAIR_OFFSET = { x: 0, y: 50 }; // lift crosshair 20px above finger

const toWorld = (sx, sy) => {
  'worklet';
  return {
    x: (sx - translateX.value - CROSSHAIR_OFFSET.x) / scale.value,
    y: (sy - translateY.value - CROSSHAIR_OFFSET.y) / scale.value, // ✅ offset up
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
// ── For render only (no worklet) ─────────────────────────────────────────────
const buildRectPathJS = (x1, y1, x2, y2) => {
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
 // ── Add this handler for exiting the chain ──────────────────────────────────────────────────────
const handleExitChain = useCallback(() => {
  hasLastPoint.value = false;
  lastPoint.value    = { x: 0, y: 0 };
  previewPath.value  = Skia.Path.Make();
  // also reset arc if mid-sequence
  arcPhase.value     = 0;
}, []);
const handleTrim = useCallback((tx, ty, currentScale) => {
  setShapeList((prev) => {
    const idx = prev.findIndex(seg => hitTestSegment(tx, ty, seg, 8 / currentScale));
    if (idx === -1) return prev;
    return applyTrim(prev, idx, tx, ty);
  });
}, []);
// Extend  features code starts here ──────────────────────────────────────────────────
const [extendState, setExtendState] = useState(null);
const extendStateRef = React.useRef(null);
const shapeListRef = React.useRef(shapeList);
const offsetDistanceRef = React.useRef(offsetDistance);
useEffect(() => { shapeListRef.current = shapeList; }, [shapeList]);
useEffect(() => { offsetDistanceRef.current = offsetDistance; }, [offsetDistance]);

const handleExtendStart = useCallback((wx, wy, currentScale) => {
  let found = null;
  shapeListRef.current.forEach((seg, i) => {
    if (found) return;
    const ep = hitTestEndpoint(wx, wy, seg, 14 / currentScale);
    if (ep) found = { segIndex: i, endpoint: ep };
  });
  extendStateRef.current = found;  // ← write to ref
  setExtendState(found);           // ← still set state for rendering handles
}, []);

const handleExtendEnd = useCallback(() => {
  const state = extendStateRef.current;  // ← read from ref, always fresh
  if (!state) return;
  setShapeList(prev => applyExtend(prev, state.segIndex, state.endpoint));
  extendStateRef.current = null;
  setExtendState(null);
}, []); // ← stable, no deps needed

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
// Offset feature code starts here ─────────────────────────────────────────────────
const handleOffsetTap = useCallback((wx, wy, currentScale) => {
  const idx = shapeListRef.current.findIndex(        // ← ref, always fresh
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) return;

  const seg  = shapeListRef.current[idx];            // ← ref
  const side = getSideFromTap(seg, wx, wy);

  setShapeList(prev => applyOffsetSingle(prev, idx, offsetDistanceRef.current, side)); // ← ref
}, []); // ← empty deps, fully stable
// ── fillet/chamfer state ──────────────────────────────────────────────────────
const [filletRadius,   setFilletRadius]   = useState(10);
const [filletMode,     setFilletMode]     = useState('fillet'); // 'fillet' | 'chamfer'
const [filletFirstSel, setFilletFirstSel] = useState(null);
const [chamferDistance, setChamferDistance] = useState(10);  // ← add
//-Fillet and chamfer code starts here ─────────────────────────────────────────────────
const filletFirstSelRef = useRef(null);
const filletRadiusRef   = useRef(filletRadius);
const filletModeRef     = useRef(filletMode);
const chamferDistanceRef  = useRef(10);  // ← add


useEffect(() => { filletFirstSelRef.current = filletFirstSel; }, [filletFirstSel]);
useEffect(() => { filletRadiusRef.current   = filletRadius;   }, [filletRadius]);
useEffect(() => { filletModeRef.current     = filletMode;     }, [filletMode]);
useEffect(() => { chamferDistanceRef.current = chamferDistance; }, [chamferDistance]);  // ← add

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
// Highlight first selected segment
const renderFilletHighlight = () => {
  if (!filletFirstSel || (currentShape !== 'fillet' && currentShape !== 'chamfer'))
    return null;

  const seg = shapeList[filletFirstSel.idx];
  if (!seg || seg.type !== 'line') return null;

  const p = Skia.Path.Make();
  p.moveTo(seg.startPoint.x, seg.startPoint.y);
  p.lineTo(seg.endPoint.x,   seg.endPoint.y);
  return (
    <Path path={p} color="orange" style="stroke" strokeWidth={3} />
  );
};

// ── move state ────────────────────────────────────────────────────────────────
const [selectedIndices, setSelectedIndices] = useState([]);  // tapped segments
const [isDragging,      setIsDragging]      = useState(false);
const selectedIndicesRef = useRef([]);
const isDraggingRef = useRef(false);
const dragBaseList = useRef([]); // snapshot of shapeList at drag start for consistent delta application
const wasDragMove = useSharedValue(false);
useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
// Shared values for live drag delta (worklet → JS)
const dragStartX  = useSharedValue(0);
const dragStartY  = useSharedValue(0);

const handleMoveStart = useCallback((wx, wy) => {
  // Only snapshot — don't set dragging yet
  dragBaseList.current = shapeListRef.current;
}, []);

const handleMoveDragStart = useCallback(() => {
  // Called only when we confirm it's actually a drag
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
}, [])


const handleMoveEnd = useCallback((wasTap, ex, ey, currentScale) => {
  if (wasTap) {
    // It was a tap — handle selection
    const idx = shapeListRef.current.findIndex(
      seg => hitTestSegment(ex, ey, seg, 8 / currentScale)
    );
    if (idx === -1) {
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
    } else {
      const prev = selectedIndicesRef.current;
      const next = prev.includes(idx)
        ? prev.filter(i => i !== idx)
        : [...prev, idx];
      selectedIndicesRef.current = next;
      setSelectedIndices(next);
    }
  }
  isDraggingRef.current = false;
  setIsDragging(false);
  dragBaseList.current = [];
}, []);

const renderMoveHighlights = () => {
  if (currentShape !== 'move') return null;

  return selectedIndices.map(idx => {
    const seg = shapeList[idx];
    if (!seg) return null;

    // Draw a thick colored overlay on each selected segment
    if (seg.type === 'line') {
      const p = Skia.Path.Make();
      p.moveTo(seg.startPoint.x, seg.startPoint.y);
      p.lineTo(seg.endPoint.x,   seg.endPoint.y);
      return (
        <Path
          key={`sel-${idx}`}
          path={p}
          color="rgba(0,120,255,0.5)"
          style="stroke"
          strokeWidth={6}
        />
      );
    }

    if (seg.type === 'arc') {
      const r        = seg.radius;
      let startDeg   = seg.startAngle * (180 / Math.PI);
      let sweepDeg   = (seg.endAngle - seg.startAngle) * (180 / Math.PI);
      if (seg.clockwise)  { if (sweepDeg < 0) sweepDeg += 360; }
      else                { if (sweepDeg > 0) sweepDeg -= 360; }
      const p = Skia.Path.Make();
      p.addArc(
        { x: seg.center.x - r, y: seg.center.y - r, width: r*2, height: r*2 },
        startDeg, sweepDeg
      );
      return (
        <Path
          key={`sel-${idx}`}
          path={p}
          color="rgba(0,120,255,0.5)"
          style="stroke"
          strokeWidth={6}
        />
      );
    }

    if (seg.type === 'circle') {
      const p = Skia.Path.Make();
      p.addCircle(seg.center.x, seg.center.y, seg.radius);
      return (
        <Path
          key={`sel-${idx}`}
          path={p}
          color="rgba(0,120,255,0.5)"
          style="stroke"
          strokeWidth={6}
        />
      );
    }

    if (seg.type === 'rectangle') {
      const p = buildRectPathJS(
        seg.corner1.x, seg.corner1.y,
        seg.corner2.x, seg.corner2.y
      );
      return (
        <Path
          key={`sel-${idx}`}
          path={p}
          color="rgba(0,120,255,0.5)"
          style="stroke"
          strokeWidth={6}
        />
      );
    }

    return null;
  });
};

//- Copy feature code starts here ─────────────────────────────────────────────────
const [copyPhase,       setCopyPhase]       = useState(0);
const [copyBasePoint,   setCopyBasePoint]   = useState(null);
const [copyClones,      setCopyClones]      = useState([]);
const [copyPreview,     setCopyPreview]     = useState([]);
const copyDragStartX = useSharedValue(0);
const copyDragStartY = useSharedValue(0);
const [copyCount,       setCopyCount]       = useState(0);
const copyPhaseRef     = useRef(0);
const copyBasePointRef = useRef(null);
const copyClonesRef    = useRef([]);
// Keep synced:
useEffect(() => { copyPhaseRef.current     = copyPhase;     }, [copyPhase]);
useEffect(() => { copyBasePointRef.current = copyBasePoint; }, [copyBasePoint]);
useEffect(() => { copyClonesRef.current    = copyClones;    }, [copyClones]);
// ── Step 1: tap to select segments to copy ─────────────────────────────────
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
  const next = prev.includes(idx)
    ? prev.filter(i => i !== idx)
    : [...prev, idx];
  selectedIndicesRef.current = next;
  setSelectedIndices(next);
}, []);
// ── Step 2: drag to position copies, tap again to confirm ─────────────────────
const handleCopyDragStart = useCallback((wx, wy) => {
  if (selectedIndicesRef.current.length === 0) return;
  const clones = cloneSegments(shapeListRef.current, selectedIndicesRef.current);
  copyClonesRef.current    = clones;
  copyBasePointRef.current = { x: wx, y: wy };
  copyPhaseRef.current     = 1;
  setCopyClones(clones);
  setCopyBasePoint({ x: wx, y: wy });
  setCopyPreview(clones);
  setCopyPhase(1);
}, []);
// Note: we don't set isDragging for copy — it has its own visual state and logic
const handleCopyDragUpdate = useCallback((wx, wy) => {
  // If phase is 0 and we have selection, auto-start drag
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
// ── Step 3: confirm copy by tapping again, or cancel by tapping without moving ──
const handleCopyDragEnd = useCallback((wx, wy, currentScale) => {
  if (copyPhaseRef.current === 0) {
    // Was a tap — handle selection
    const idx = shapeListRef.current.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) {
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
    } else {
      const prev = selectedIndicesRef.current;
      const next = prev.includes(idx)
        ? prev.filter(i => i !== idx)
        : [...prev, idx];
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

// ── Done: user presses "Done" button → exit copy loop ────────────────────────
const handleCopyDone = useCallback(() => {
  setCopyPhase(0);
  setCopyPreview([]);
  setCopyClones([]);
  setCopyBasePoint(null);
  setSelectedIndices([]);
  setCopyCount(0);
}, []);
// ── Render selected segment highlights ───────────────────────────────────────
const renderCopyHighlights = () => {
  if (currentShape !== 'copy') return null;

  return selectedIndices.map(idx => {
    const seg = shapeList[idx];
    if (!seg) return null;
    return renderSegmentColored(seg, `copy-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
  });
};

// ── Render dashed live preview of copy being dragged ─────────────────────────
const renderCopyPreview = () => {
  if (currentShape !== 'copy' || copyPreview.length === 0) return null;

  return copyPreview.map((seg, i) =>
    renderSegmentColored(seg, `copy-prev-${i}`, '#00b84a', 2, true)
  );
};

// ── Shared helper: render any segment with a given color + optional dash ──────
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
      { x: seg.center.x - r, y: seg.center.y - r, width: r*2, height: r*2 },
      startDeg, sweepDeg
    );
    path = p;
  }

  if (seg.type === 'circle') {
    const p = Skia.Path.Make();
    p.addCircle(seg.center.x, seg.center.y, seg.radius);
    path = p;
  }

  if (seg.type === 'rectangle') {
    const p = buildRectPathJS(
      seg.corner1.x, seg.corner1.y,
      seg.corner2.x, seg.corner2.y
    );
    path = p;
  }

  if (!path) return null;

  return (
    <Path
      key={key}
      path={path}
      color={color}
      style="stroke"
      strokeWidth={strokeWidth}
    >
      {dashed && <DashPathEffect intervals={[6, 4]} />}
    </Path>
  );
};
//Mirror feature code starts here ─────────────────────────────────────────────────
const [mirrorPhase,   setMirrorPhase]   = useState(0);
const [mirrorPt1,     setMirrorPt1]     = useState(null); // { x, y }
const [mirrorPt2,     setMirrorPt2]     = useState(null); // { x, y } live
const [mirrorPreview, setMirrorPreview] = useState([]);   // live mirrored seg
// Shared value for live mirror line second point (worklet → JS)
const mirrorLiveX = useSharedValue(0);
const mirrorLiveY = useSharedValue(0);
// ── Phase 0: tap to select/deselect segments ──────────────────────────────────
const handleMirrorTap = useCallback((wx, wy, currentScale) => {
  if (mirrorPhase !== 0) return;

  const idx = shapeList.findIndex(
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) {
    setSelectedIndices([]);
    return;
  }
  setSelectedIndices(prev =>
    prev.includes(idx)
      ? prev.filter(i => i !== idx)
      : [...prev, idx]
  );
}, [shapeList, mirrorPhase]);

// ── Phase 1: first tap of mirror line ────────────────────────────────────────
const handleMirrorLinePt1 = useCallback((wx, wy) => {
  setMirrorPt1({ x: wx, y: wy });
  setMirrorPt2({ x: wx, y: wy });
  setMirrorPhase(2);
}, []);

// ── Phase 2 update: live preview as user drags second point ──────────────────
const handleMirrorLineUpdate = useCallback((wx, wy) => {
  if (mirrorPhase !== 2 || !mirrorPt1) return;

  setMirrorPt2({ x: wx, y: wy });

  // Compute live preview of mirrored segments
  if (selectedIndices.length > 0) {
    const preview = selectedIndices.map(i =>
      mirrorSegment(shapeList[i], mirrorPt1.x, mirrorPt1.y, wx, wy)
    );
    // Need mirrorSegment available here — import it
    setMirrorPreview(preview);
  }
}, [mirrorPhase, mirrorPt1, shapeList, selectedIndices]);

// ── Phase 2 end: commit mirror ────────────────────────────────────────────────
const handleMirrorLineEnd = useCallback((wx, wy) => {
  if (!mirrorPt1) return;

  // Need at least some distance for a valid mirror line
  const dist = Math.hypot(wx - mirrorPt1.x, wy - mirrorPt1.y);
  if (dist < 2) {
    setMirrorPhase(1);
    return;
  }

  if (selectedIndices.length > 0) {
    setShapeList(prev =>
      applyMirror(prev, selectedIndices, mirrorPt1.x, mirrorPt1.y, wx, wy)
    );
  }

  // Reset for next mirror operation — keep selection so user can mirror again
  setMirrorPhase(0);
  setMirrorPt1(null);
  setMirrorPt2(null);
  setMirrorPreview([]);
}, [mirrorPt1, selectedIndices]);

// ── "Draw mirror line" button pressed ────────────────────────────────────────
const handleStartMirrorLine = useCallback(() => {
  if (selectedIndices.length === 0) return;
  setMirrorPhase(1);   // next tap = first point of mirror line
}, [selectedIndices]);

// ── Done: exit mirror mode ────────────────────────────────────────────────────
const handleMirrorDone = useCallback(() => {
  setMirrorPhase(0);
  setMirrorPt1(null);
  setMirrorPt2(null);
  setMirrorPreview([]);
  setSelectedIndices([]);
}, []);
const handleMirrorGestureEnd = useCallback((wx, wy, currentScale) => {
  if (mirrorPhase === 0) {
    // Tap = select/deselect
    handleMirrorTap(wx, wy, currentScale ?? 1);
  } else if (mirrorPhase === 1) {
    // First point of mirror line
    handleMirrorLinePt1(wx, wy);
  } else if (mirrorPhase === 2) {
    // Second point → commit
    handleMirrorLineEnd(wx, wy);
  }
}, [mirrorPhase, handleMirrorTap, handleMirrorLinePt1, handleMirrorLineEnd]);
const renderMirrorOverlay = () => {
  if (currentShape !== 'mirror') return null;
  const elements = [];

  // 1. Green highlight on selected segments
  selectedIndices.forEach(idx => {
    const seg = shapeList[idx];
    if (!seg) return;
    const el = renderSegmentColored(seg, `mir-sel-${idx}`, 'rgba(0,180,80,0.6)', 6);
    if (el) elements.push(el);
  });

  // 2. Live mirror line (dashed orange)
  if (mirrorPt1 && mirrorPt2) {
    const lp = Skia.Path.Make();
    // Extend mirror line visually beyond endpoints
    const dx   = mirrorPt2.x - mirrorPt1.x;
    const dy   = mirrorPt2.y - mirrorPt1.y;
    const len  = Math.hypot(dx, dy) || 1;
    const ext  = 2000;                       // extend far in both directions
    const ux   = dx / len;
    const uy   = dy / len;
    lp.moveTo(mirrorPt1.x - ux * ext, mirrorPt1.y - uy * ext);
    lp.lineTo(mirrorPt1.x + ux * ext, mirrorPt1.y + uy * ext);
    elements.push(
      <Path
        key="mirror-line"
        path={lp}
        color="orange"
        style="stroke"
        strokeWidth={1.5}
      >
        <DashPathEffect intervals={[8, 6]} />
      </Path>
    );

    // Mirror line endpoints dots
    elements.push(
      <Circle key="mir-pt1" cx={mirrorPt1.x} cy={mirrorPt1.y} r={4} color="orange" />,
      <Circle key="mir-pt2" cx={mirrorPt2.x} cy={mirrorPt2.y} r={4} color="orange" />
    );
  }

  // 3. Live mirrored preview (dashed green)
  mirrorPreview.forEach((seg, i) => {
    const el = renderSegmentColored(seg, `mir-prev-${i}`, '#00cc66', 2, true);
    if (el) elements.push(el);
  });

  return elements;
};
// Rotate feature code starts here ─────────────────────────────────────────────────
const [rotatePhase,    setRotatePhase]   = useState(0);
const [rotateBase,     setRotateBase]    = useState(null);  // { x, y }
const [rotateDragRef,  setRotateDragRef] = useState(null);  // { x, y } first drag pt
const [rotateAngle,    setRotateAngle]   = useState(0);     // current delta angle
const [rotatePreview,  setRotatePreview] = useState([]);    // live rotated segs
const [rotateSnap,     setRotateSnap]    = useState(true);  // snap to 15°

// Snapshot of originals at rotate start
const rotateBaseList = useRef([]);
// ── Phase 0: select / deselect ────────────────────────────────────────────────
const handleRotateTap = useCallback((wx, wy, currentScale) => {
  if (rotatePhase !== 0) return;

  const idx = shapeList.findIndex(
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) {
    setSelectedIndices([]);
    return;
  }
  setSelectedIndices(prev =>
    prev.includes(idx)
      ? prev.filter(i => i !== idx)
      : [...prev, idx]
  );
}, [shapeList, rotatePhase]);

// ── Phase 1: set base point ───────────────────────────────────────────────────
const handleRotateSetBase = useCallback((wx, wy) => {
  if (rotatePhase !== 1) return;
  setRotateBase({ x: wx, y: wy });
  setRotatePhase(2);
}, [rotatePhase]);

// ── Phase 2: drag start — store reference direction ───────────────────────────
const handleRotateDragStart = useCallback((wx, wy) => {
  if (rotatePhase !== 2 || !rotateBase) return;
  rotateBaseList.current = shapeList;
  setRotateDragRef({ x: wx, y: wy });
  setRotateAngle(0);
}, [rotatePhase, rotateBase, shapeList]);

// ── Phase 2: drag update — compute angle + live preview ───────────────────────
const handleRotateDragUpdate = useCallback((wx, wy) => {
  if (rotatePhase !== 2 || !rotateBase || !rotateDragRef) return;

  let angle = computeRotationAngle(
    rotateBase.x, rotateBase.y,
    rotateDragRef.x, rotateDragRef.y,
    wx, wy
  );

  if (rotateSnap) angle = snapAngle(angle, 15);

  setRotateAngle(angle);

  // Live preview — rotate originals by delta angle
  const preview = selectedIndices.flatMap(i => {
    const rotated = rotateSegment(rotateBaseList.current[i], rotateBase.x, rotateBase.y, angle);
    return Array.isArray(rotated) ? rotated : [rotated];
  });
  setRotatePreview(preview);
}, [rotatePhase, rotateBase, rotateDragRef, rotateSnap, selectedIndices]);

// ── Phase 2: drag end — commit rotation ───────────────────────────────────────
const handleRotateDragEnd = useCallback((wx, wy) => {
  if (rotatePhase !== 2 || !rotateBase || !rotateDragRef) return;

  let angle = computeRotationAngle(
    rotateBase.x, rotateBase.y,
    rotateDragRef.x, rotateDragRef.y,
    wx, wy
  );
  if (rotateSnap) angle = snapAngle(angle, 15);

  // Commit — replace originals with rotated
  setShapeList(prev =>
    applyRotate(prev, selectedIndices, rotateBase.x, rotateBase.y, angle)
  );

  // Reset drag ref — base point stays so user can rotate again
  setRotateDragRef(null);
  setRotatePreview([]);
  setRotateAngle(0);
  rotateBaseList.current = [];
}, [rotatePhase, rotateBase, rotateDragRef, rotateSnap, selectedIndices]);

// ── Unified gesture end router ────────────────────────────────────────────────
const handleRotateGestureEnd = useCallback((wx, wy, currentScale) => {
  if (rotatePhase === 0) {
    handleRotateTap(wx, wy, currentScale);
  } else if (rotatePhase === 1) {
    handleRotateSetBase(wx, wy);
  } else if (rotatePhase === 2) {
    handleRotateDragEnd(wx, wy);
  }
}, [rotatePhase, handleRotateTap, handleRotateSetBase, handleRotateDragEnd]);

// ── Done: exit rotate ─────────────────────────────────────────────────────────
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

  // 1. Blue highlights on selected segments
  selectedIndices.forEach(idx => {
    const seg = shapeList[idx];
    if (!seg) return;
    const el = renderSegmentColored(seg, `rot-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
    if (el) elements.push(el);
  });

  // 2. Base point marker
  if (rotateBase) {
    // Crosshair circle at base point
    const bp = Skia.Path.Make();
    bp.addCircle(rotateBase.x, rotateBase.y, 8);
    elements.push(
      <Path
        key="rot-base-circle"
        path={bp}
        color="orange"
        style="stroke"
        strokeWidth={2}
      />
    );
    // Cross lines
    const cp = Skia.Path.Make();
    cp.moveTo(rotateBase.x - 12, rotateBase.y);
    cp.lineTo(rotateBase.x + 12, rotateBase.y);
    cp.moveTo(rotateBase.x, rotateBase.y - 12);
    cp.lineTo(rotateBase.x, rotateBase.y + 12);
    elements.push(
      <Path key="rot-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />
    );

    // Reference line from base to drag ref point
    if (rotateDragRef) {
      const rl = Skia.Path.Make();
      rl.moveTo(rotateBase.x, rotateBase.y);
      rl.lineTo(rotateDragRef.x, rotateDragRef.y);
      elements.push(
        <Path key="rot-ref-line" path={rl} color="rgba(255,165,0,0.4)"
          style="stroke" strokeWidth={1}>
          <DashPathEffect intervals={[4, 4]} />
        </Path>
      );
    }
  }

  // 3. Live rotated preview (cyan dashed)
  rotatePreview.forEach((seg, i) => {
    const el = renderSegmentColored(seg, `rot-prev-${i}`, '#00ccff', 2, true);
    if (el) elements.push(el);
  });

  return elements;
};
// Scale feature code starts here ─────────────────────────────────────────────────
const [scalePhase,    setScalePhase]   = useState(0);
const [scaleBase,     setScaleBase]    = useState(null);   // { x, y }
const [scaleDragRef,  setScaleDragRef] = useState(null);   // { x, y } first drag pt
const [scaleFactor,   setScaleFactor]  = useState(1);      // live factor
const [scalePreview,  setScalePreview] = useState([]);     // live scaled segs
const [scaleSnap,     setScaleSnap]    = useState(true);   // snap to clean factors

// Snapshot of originals at scale drag start
const scaleBaseList = useRef([]);
// ── Phase 0: select / deselect ────────────────────────────────────────────────
const handleScaleTap = useCallback((wx, wy, currentScale) => {
  if (scalePhase !== 0) return;

  const idx = shapeList.findIndex(
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) {
    setSelectedIndices([]);
    return;
  }
  setSelectedIndices(prev =>
    prev.includes(idx)
      ? prev.filter(i => i !== idx)
      : [...prev, idx]
  );
}, [shapeList, scalePhase]);

// ── Phase 1: set base point ───────────────────────────────────────────────────
const handleScaleSetBase = useCallback((wx, wy) => {
  if (scalePhase !== 1) return;
  setScaleBase({ x: wx, y: wy });
  setScalePhase(2);
}, [scalePhase]);

// ── Phase 2: drag start — store reference distance ───────────────────────────
const handleScaleDragStart = useCallback((wx, wy) => {
  if (scalePhase !== 2 || !scaleBase) return;
  scaleBaseList.current = shapeList;
  setScaleDragRef({ x: wx, y: wy });
  setScaleFactor(1);
}, [scalePhase, scaleBase, shapeList]);

// ── Phase 2: drag update — compute factor + live preview ─────────────────────
const handleScaleDragUpdate = useCallback((wx, wy) => {
  if (scalePhase !== 2 || !scaleBase || !scaleDragRef) return;

  let factor = computeScaleFactor(
    scaleBase.x, scaleBase.y,
    scaleDragRef.x, scaleDragRef.y,
    wx, wy
  );

  // Clamp to sane range
  factor = Math.max(0.05, Math.min(20, factor));
  if (scaleSnap) factor = snapFactor(factor);

  setScaleFactor(factor);

  // Live preview — scale originals by factor
  const preview = selectedIndices.flatMap(i => {
    const scaled = scaleSegment(
      scaleBaseList.current[i],
      scaleBase.x, scaleBase.y,
      factor
    );
    return Array.isArray(scaled) ? scaled : [scaled];
  });
  setScalePreview(preview);
}, [scalePhase, scaleBase, scaleDragRef, scaleSnap, selectedIndices]);

// ── Phase 2: drag end — commit scale ─────────────────────────────────────────
const handleScaleDragEnd = useCallback((wx, wy) => {
  if (scalePhase !== 2 || !scaleBase || !scaleDragRef) return;

  let factor = computeScaleFactor(
    scaleBase.x, scaleBase.y,
    scaleDragRef.x, scaleDragRef.y,
    wx, wy
  );
  factor = Math.max(0.05, Math.min(20, factor));
  if (scaleSnap) factor = snapFactor(factor);

  // Commit
  setShapeList(prev =>
    applyScale(prev, selectedIndices, scaleBase.x, scaleBase.y, factor)
  );

  // Reset drag — base stays for another scale operation
  setScaleDragRef(null);
  setScalePreview([]);
  setScaleFactor(1);
  scaleBaseList.current = [];
}, [scalePhase, scaleBase, scaleDragRef, scaleSnap, selectedIndices]);

// ── Apply preset factor directly ──────────────────────────────────────────────
const handleScalePreset = useCallback((factor) => {
  if (!scaleBase || selectedIndices.length === 0) return;
  setShapeList(prev =>
    applyScale(prev, selectedIndices, scaleBase.x, scaleBase.y, factor)
  );
  setScalePreview([]);
  setScaleFactor(1);
  scaleBaseList.current = [];
}, [scaleBase, selectedIndices]);

// ── Unified gesture end router ────────────────────────────────────────────────
const handleScaleGestureEnd = useCallback((wx, wy, currentScale) => {
  if (scalePhase === 0) {
    handleScaleTap(wx, wy, currentScale);
  } else if (scalePhase === 1) {
    handleScaleSetBase(wx, wy);
  } else if (scalePhase === 2) {
    handleScaleDragEnd(wx, wy);
  }
}, [scalePhase, handleScaleTap, handleScaleSetBase, handleScaleDragEnd]);

// ── Done: exit scale ──────────────────────────────────────────────────────────
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

  // 1. Blue highlights on selected segments
  selectedIndices.forEach(idx => {
    const seg = shapeList[idx];
    if (!seg) return;
    const el = renderSegmentColored(seg, `sc-sel-${idx}`, 'rgba(0,120,255,0.5)', 6);
    if (el) elements.push(el);
  });

  // 2. Base point marker + reference distance ring
  if (scaleBase) {

    // Outer ring showing reference distance
    if (scaleDragRef) {
      const refDist = Math.hypot(
        scaleDragRef.x - scaleBase.x,
        scaleDragRef.y - scaleBase.y
      );
      if (refDist > 4) {
        const rp = Skia.Path.Make();
        rp.addCircle(scaleBase.x, scaleBase.y, refDist);
        elements.push(
          <Path
            key="sc-ref-ring"
            path={rp}
            color="rgba(255,165,0,0.25)"
            style="stroke"
            strokeWidth={1}
          >
            <DashPathEffect intervals={[4, 4]} />
          </Path>
        );

        // Current drag distance ring
        const curDist = refDist * scaleFactor;
        const cr = Skia.Path.Make();
        cr.addCircle(scaleBase.x, scaleBase.y, curDist);
        elements.push(
          <Path
            key="sc-cur-ring"
            path={cr}
            color="rgba(0,200,255,0.4)"
            style="stroke"
            strokeWidth={1.5}
          />
        );

        // Line from base to drag ref
        const dl = Skia.Path.Make();
        dl.moveTo(scaleBase.x, scaleBase.y);
        dl.lineTo(scaleDragRef.x, scaleDragRef.y);
        elements.push(
          <Path
            key="sc-drag-line"
            path={dl}
            color="rgba(255,165,0,0.5)"
            style="stroke"
            strokeWidth={1}
          >
            <DashPathEffect intervals={[4, 4]} />
          </Path>
        );
      }
    }

    // Base point crosshair
    const bp = Skia.Path.Make();
    bp.addCircle(scaleBase.x, scaleBase.y, 8);
    elements.push(
      <Path key="sc-base-ring" path={bp} color="orange" style="stroke" strokeWidth={2} />
    );
    const cp = Skia.Path.Make();
    cp.moveTo(scaleBase.x - 12, scaleBase.y);
    cp.lineTo(scaleBase.x + 12, scaleBase.y);
    cp.moveTo(scaleBase.x, scaleBase.y - 12);
    cp.lineTo(scaleBase.x, scaleBase.y + 12);
    elements.push(
      <Path key="sc-base-cross" path={cp} color="orange" style="stroke" strokeWidth={1.5} />
    );
  }

  // 3. Live scaled preview (cyan dashed)
  scalePreview.forEach((seg, i) => {
    const el = renderSegmentColored(seg, `sc-prev-${i}`, '#00ccff', 2, true);
    if (el) elements.push(el);
  });

  return elements;
};
//Erase feature code starts here ─────────────────────────────────────────────────
const [eraseIndices, setEraseIndices] = useState([]);
const handleEraseTap = useCallback((wx, wy, currentScale) => {
  const idx = shapeList.findIndex(
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) return;

  // Toggle in/out of erase selection
  setEraseIndices(prev =>
    prev.includes(idx)
      ? prev.filter(i => i !== idx)
      : [...prev, idx]
  );
}, [shapeList]);

// ── Confirm: delete all marked segments ──────────────────────────────────────
const handleEraseConfirm = useCallback(() => {
  setShapeList(prev =>
    prev.filter((_, i) => !eraseIndices.includes(i))
  );
  setEraseIndices([]);
}, [eraseIndices]);

// ── Cancel: clear highlights without deleting ─────────────────────────────────
const handleEraseCancel = useCallback(() => {
  setEraseIndices([]);
}, []);
const renderEraseOverlay = () => {
  if (currentShape !== 'erase') return null;

  return eraseIndices.map(idx => {
    const seg = shapeList[idx];
    if (!seg) return null;
    return renderSegmentColored(seg, `era-${idx}`, 'rgba(220,50,50,0.85)', 6);
  });
};

//Pattern feature code starts here ─────────────────────────────────────────────────

// ── CIRCULAR PATTERN state ────────────────────────────────────────────────────
// Phase 0: selecting segments
// Phase 1: tap center point
// Phase 2: drag to set radius + count preview

const [cpatPhase,          setCpatPhase]          = useState(0);
const [cpatCenter,         setCpatCenter]         = useState(null);   // { x, y }
const [cpatCount,          setCpatCount]          = useState(4);
const [cpatSpan,           setCpatSpan]           = useState(360);
const [cpatRotateInst,     setCpatRotateInst]     = useState(true);
const [cpatPreview,        setCpatPreview]        = useState([]);
const [cpatDragRadius,     setCpatDragRadius]     = useState(0);

// ── RECTANGULAR PATTERN state ─────────────────────────────────────────────────
// Phase 0: selecting segments
// Phase 1: configure + place

const [rpatPhase,          setRpatPhase]          = useState(0);
const [rpatRows,           setRpatRows]           = useState(3);
const [rpatCols,           setRpatCols]           = useState(3);
const [rpatSpacingX,       setRpatSpacingX]       = useState(50);
const [rpatSpacingY,       setRpatSpacingY]       = useState(50);
const [rpatAngle,          setRpatAngle]          = useState(0);
const [rpatPreview,        setRpatPreview]        = useState([]);

// ── Phase 0: tap to select ────────────────────────────────────────────────────
const handleCpatTap = useCallback((wx, wy, currentScale) => {
  if (cpatPhase === 0) {
    const idx = shapeList.findIndex(
      seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
    );
    if (idx === -1) { setSelectedIndices([]); return; }
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
    return;
  }

  // Phase 1: set center
  if (cpatPhase === 1) {
    setCpatCenter({ x: wx, y: wy });
    setCpatPhase(2);
    return;
  }
}, [shapeList, cpatPhase]);

// ── Phase 2: drag to set radius → update count from drag distance ─────────────
const handleCpatDragUpdate = useCallback((wx, wy) => {
  if (cpatPhase !== 2 || !cpatCenter) return;

  const radius = Math.hypot(wx - cpatCenter.x, wy - cpatCenter.y);
  setCpatDragRadius(radius);

  // Build live preview
  const clones  = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
  const preview = buildCircularPreview(
    clones, cpatCenter.x, cpatCenter.y,
    cpatCount, cpatSpan, cpatRotateInst
  );
  setCpatPreview(preview);
}, [cpatPhase, cpatCenter, cpatCount, cpatSpan, cpatRotateInst, selectedIndices, shapeList]);

// ── Phase 2: drag end → commit ────────────────────────────────────────────────
const handleCpatDragEnd = useCallback(() => {
  if (cpatPhase !== 2 || !cpatCenter || selectedIndices.length === 0) return;

  const clones  = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
  const pattern = buildCircularPattern(
    clones, cpatCenter.x, cpatCenter.y,
    cpatCount, cpatSpan, cpatRotateInst
  );

  setShapeList(prev => applyPattern(prev, selectedIndices, pattern));

  // Reset
  setCpatPhase(0);
  setCpatCenter(null);
  setCpatPreview([]);
  setCpatDragRadius(0);
  setSelectedIndices([]);
}, [cpatPhase, cpatCenter, cpatCount, cpatSpan, cpatRotateInst, selectedIndices, shapeList]);

// ── Rebuild preview when settings change (phase 2) ────────────────────────────
useEffect(() => {
  if (cpatPhase !== 2 || !cpatCenter || selectedIndices.length === 0) return;
  const clones  = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
  const preview = buildCircularPreview(
    clones, cpatCenter.x, cpatCenter.y,
    cpatCount, cpatSpan, cpatRotateInst
  );
  setCpatPreview(preview);
}, [cpatCount, cpatSpan, cpatRotateInst]);
// ── Phase 0: tap to select ────────────────────────────────────────────────────
const handleRpatTap = useCallback((wx, wy, currentScale) => {
  if (rpatPhase !== 0) return;
  const idx = shapeList.findIndex(
    seg => hitTestSegment(wx, wy, seg, 8 / currentScale)
  );
  if (idx === -1) { setSelectedIndices([]); return; }
  setSelectedIndices(prev =>
    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
  );
}, [shapeList, rpatPhase]);

// ── Rebuild rect preview whenever settings change ─────────────────────────────
const rebuildRpatPreview = useCallback(() => {
  if (selectedIndices.length === 0) { setRpatPreview([]); return; }
  const clones  = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
  const preview = buildRectPreview(
    clones, rpatRows, rpatCols,
    rpatSpacingX, rpatSpacingY,
    rpatAngle * Math.PI / 180
  );
  setRpatPreview(preview);
}, [selectedIndices, shapeList, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle]);

useEffect(() => { rebuildRpatPreview(); },
  [rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle, selectedIndices]);

// ── Commit rect pattern ───────────────────────────────────────────────────────
const handleRpatCommit = useCallback(() => {
  if (selectedIndices.length === 0) return;
  const clones  = selectedIndices.map(i => JSON.parse(JSON.stringify(shapeList[i])));
  const pattern = buildRectPattern(
    clones, rpatRows, rpatCols,
    rpatSpacingX, rpatSpacingY,
    rpatAngle * Math.PI / 180
  );
  setShapeList(prev => applyPattern(prev, selectedIndices, pattern));
  setRpatPhase(0);
  setRpatPreview([]);
  setSelectedIndices([]);
}, [selectedIndices, shapeList, rpatRows, rpatCols, rpatSpacingX, rpatSpacingY, rpatAngle]);
// ── Shared: render a list of segments in a given color ────────────────────────
const renderPatternSegs = (segs, color, dashed = false, key = 'pat') =>
  segs.map((seg, i) =>
    renderSegmentColored(seg, `${key}-${i}`, color, 1.5, dashed)
  ).filter(Boolean);

// ── Circular pattern overlay ──────────────────────────────────────────────────
const renderCpatOverlay = () => {
  if (currentShape !== 'cpat') return null;
  const elements = [];

  // Selected highlights
  selectedIndices.forEach(idx => {
    const el = renderSegmentColored(
      shapeList[idx], `cps-${idx}`, 'rgba(0,180,80,0.6)', 6
    );
    if (el) elements.push(el);
  });

  // Center marker
  if (cpatCenter) {
    const cp = Skia.Path.Make();
    cp.addCircle(cpatCenter.x, cpatCenter.y, 6 / currentScale);
    elements.push(
      <Path key="cpat-center" path={cp}
        color="orange" style="stroke" strokeWidth={1.5} />
    );

    // Cross at center
    const crp = Skia.Path.Make();
    const cs = 10 / currentScale;
    crp.moveTo(cpatCenter.x - cs, cpatCenter.y);
    crp.lineTo(cpatCenter.x + cs, cpatCenter.y);
    crp.moveTo(cpatCenter.x, cpatCenter.y - cs);
    crp.lineTo(cpatCenter.x, cpatCenter.y + cs);
    elements.push(
      <Path key="cpat-cross" path={crp}
        color="orange" style="stroke" strokeWidth={1} />
    );

    // Radius ring (when dragging)
    if (cpatDragRadius > 0) {
      const rp = Skia.Path.Make();
      rp.addCircle(cpatCenter.x, cpatCenter.y, cpatDragRadius);
      elements.push(
        <Path key="cpat-ring" path={rp}
          color="rgba(255,165,0,0.2)" style="stroke" strokeWidth={1}>
          <DashPathEffect intervals={[6, 6]} />
        </Path>
      );
    }
  }

  // Pattern preview (cyan dashed)
  renderPatternSegs(cpatPreview, '#00ccff', true, 'cp').forEach(e => elements.push(e));

  return elements;
};

// ── Rectangular pattern overlay ───────────────────────────────────────────────
const renderRpatOverlay = () => {
  if (currentShape !== 'rpat') return null;
  const elements = [];

  // Selected highlights
  selectedIndices.forEach(idx => {
    const el = renderSegmentColored(
      shapeList[idx], `rps-${idx}`, 'rgba(0,180,80,0.6)', 6
    );
    if (el) elements.push(el);
  });

  // Pattern preview (orange dashed)
  renderPatternSegs(rpatPreview, 'rgba(255,140,0,0.7)', true, 'rp')
    .forEach(e => elements.push(e));

  return elements;
};

//stretch feature code starts here ─────────────────────────────────────────────────
const [allGrips,      setAllGrips]      = useState([]);
const [hotGrip,       setHotGrip]       = useState(null);
const [activeGrip,    setActiveGrip]    = useState(null);
const [stretchBase,   setStretchBase]   = useState(null);
useEffect(() => {
  if (currentShape === 'stretch') {
    setAllGrips(getAllGrips(shapeList));
  } else {
    setAllGrips([]);
  }
}, [shapeList, currentShape]);


// ── DECLARE applySnapFull FIRST ───────────────────────────────────────────────
const applySnapFull = useCallback((wx, wy, fromPoint = null) => {
  const result = resolveSnapPoint(
    wx, wy,
    shapeList, snapSettings, fromPoint,
    gridSnapEnabled, scale.value ?? 1,
    GRID_MINOR, GRID_MAJOR
  );
  setActiveSnap(result.osnapResult ?? null);
  setGridSnapPoint(result.snapType ? result : null);
  return { x: result.x, y: result.y };
}, [shapeList, snapSettings, gridSnapEnabled]);

// ── THEN declare stretch handlers that use it ─────────────────────────────────
const handleStretchStart = useCallback((wx, wy, currentScale) => {
  const threshold = 12 / currentScale;
  const g = hitTestGrip(wx, wy, allGrips, threshold);
  if (g) {
    setActiveGrip(g);
    setStretchBase(shapeList[g.segIndex]);
    setHotGrip(null);
  }
}, [allGrips, shapeList]);
const handleStretchMove = useCallback((wx, wy, currentScale) => {
  if (activeGrip) {
    const snapped = applySnapFull(wx, wy, null);   // ✅ now defined
    const updated = applyGripMove(
      stretchBase,
      activeGrip.type,
      snapped.x, snapped.y
    );
    setShapeList(prev => {
      const next = [...prev];
      next[activeGrip.segIndex] = updated;
      return next;
    });
    return;
  }
  const threshold = 12 / currentScale;
  const g = hitTestGrip(wx, wy, allGrips, threshold);
  setHotGrip(g ?? null);
}, [activeGrip, allGrips, stretchBase, applySnapFull]);   // ← applySnapFull in deps

// ✅ Fix handleStretchEnd to recalculate snapped internally:
const handleStretchEnd = useCallback((wx, wy, currentScale) => {
  if (!activeGrip) {
    handleStretchMove(wx, wy, currentScale);
    return;
  }

  const snapped = applySnapFull(wx, wy, null);  // ← recalculate here

  const updated = applyGripMove(
    stretchBase,
    activeGrip.type,
    snapped.x, snapped.y
  );
  setShapeList(prev => {
    const next = [...prev];
    next[activeGrip.segIndex] = updated;
    return next;
  });
  setActiveGrip(null);
  setStretchBase(null);
  setHotGrip(null);
}, [activeGrip, stretchBase, applySnapFull, handleStretchMove]);



const renderGrips = () => {
  if (currentShape !== 'stretch') return null;
  return allGrips.map(g => {
    const isHot    = hotGrip?.id    === g.id;
    const isActive = activeGrip?.id === g.id;
    const baseSize = g.role === 'midpoint' ? 5 : 6;
    const size     = (isActive ? baseSize * 1.8
                    : isHot    ? baseSize * 1.4
                    :            baseSize) / currentScale;
    const sw       = (isActive ? 2 : 1.5) / currentScale;
    const color    = isActive ? '#ffffff' : g.color;
    const elements = [];

    if (g.role === 'midpoint') {
      // Triangle for midpoints
      const p = Skia.Path.Make();
      p.moveTo(g.x,        g.y - size * 1.3);
      p.lineTo(g.x + size, g.y + size * 0.8);
      p.lineTo(g.x - size, g.y + size * 0.8);
      p.close();
      elements.push(
        <Path key={g.id} path={p} color={color} style="fill" />,
        <Path key={g.id+'b'} path={p} color="rgba(0,0,0,0.4)"
          style="stroke" strokeWidth={sw * 0.5} />
      );
    } else if (g.role === 'radius') {
      // Diamond for radius grips
      const p = Skia.Path.Make();
      p.moveTo(g.x,        g.y - size);
      p.lineTo(g.x + size, g.y);
      p.lineTo(g.x,        g.y + size);
      p.lineTo(g.x - size, g.y);
      p.close();
      elements.push(
        <Path key={g.id} path={p} color={color} style="fill" />,
        <Path key={g.id+'b'} path={p} color="rgba(0,0,0,0.4)"
          style="stroke" strokeWidth={sw * 0.5} />
      );
    } else {
      // Square for endpoints + center
      const p = Skia.Path.Make();
      p.addRect({ x: g.x - size, y: g.y - size, width: size*2, height: size*2 });
      elements.push(
        <Path key={g.id} path={p} color={color} style="fill" />,
        <Path key={g.id+'b'} path={p} color="rgba(0,0,0,0.4)"
          style="stroke" strokeWidth={sw * 0.5} />
      );
    }

    // Outer glow ring when hot or active
    if (isHot || isActive) {
      const rp = Skia.Path.Make();
      rp.addCircle(g.x, g.y, size * 1.8);
      elements.push(
        <Path key={g.id+'glow'} path={rp}
          color={isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,170,255,0.25)'}
          style="stroke" strokeWidth={sw} />
      );
    }

    return elements;
  });
};
const gripDragLinePath = useDerivedValue(() => {
  if (!activeGrip || !stretchBase) return Skia.Path.Make();
  const p = Skia.Path.Make();
  p.moveTo(activeGrip.x, activeGrip.y);
  p.lineTo(translateCrossX.value, translateCrossY.value);
  return p;
});
// Render active drag line (from original grip pos to current cursor)
const renderGripDragLine = () => {
  if (!activeGrip || !stretchBase) return null;
  return (
    <Path
      path={gripDragLinePath}           // ← animated path, no .value in render
      color="rgba(255,255,255,0.4)"
      style="stroke"
      strokeWidth={0.7 / currentScale}
    >
      <DashPathEffect intervals={[4, 4]} />
    </Path>
  );
};


  // ── unified draw gesture ──────────────────────────────────────────────────GETSURE LOGIC FOR ALL SHAPES, INCLUDING EXTEND AND TRIM
  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0) 
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
   // ── TRIM ────────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 4) {
    runOnJS(handleTrim)(wx, wy, scale.value);
  }
  // ── OFFSET ──────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 6) {
    runOnJS(handleOffsetTap)(wx, wy, scale.value);
  }
  // ── EXTEND ──────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 5) {
    runOnJS(handleExtendStart)(wx, wy, scale.value);
  }
   // ── MOVE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        dragStartX.value = wx;
        dragStartY.value = wy;
        wasDragMove.value = false;
        runOnJS(handleMoveStart)(wx, wy);
        return;
      }
        // ── COPY ────────────────────────────────────────────────────────────────
if (currentShapeSV.value === 10) {
  copyDragStartX.value = wx;
  copyDragStartY.value = wy;
  return;
}  
     // ── MIRROR ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 11) {
    mirrorLiveX.value = wx;
    mirrorLiveY.value = wy;
    return;
  }
    // ── ROTATE ──────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 12) {
    runOnJS(handleRotateDragStart)(wx, wy);
    return;
  }
  // ── SCALE ──────────────────────────────────────────────────────────────
    if (currentShapeSV.value === 13) {
    runOnJS(handleScaleDragStart)(wx, wy);
    return;
  }
    // ── CPAT drag start ──────────────────────────────────────────────────
  if (currentShapeSV.value === 17) {
    runOnJS(handleCpatDragUpdate)(wx, wy);
    return;
  }
  // ── STRETCH ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 19) {
    runOnJS(handleStretchStart)(wx, wy, scale.value);
    return;
  }  
})
    .onUpdate((e) => {
      'worklet';
      const { x: wx, y: wy } = toWorld(e.x, e.y);
      translateCrossX.value = wx;
      translateCrossY.value = wy;
        if (currentShapeSV.value === 0 ||   // line
      currentShapeSV.value === 1 ||   // arc
      currentShapeSV.value === 2 ||   // rect
      currentShapeSV.value === 3) {   // circle
    runOnJS(handleDrawUpdate)(wx, wy);
  }
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
       // ── MOVE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        const dx = wx - dragStartX.value;
        const dy = wy - dragStartY.value;
        // Only start dragging once finger moves enough
        if (!wasDragMove.value && Math.hypot(dx, dy) > 6 / scale.value) {
          wasDragMove.value = true;
          runOnJS(handleMoveDragStart)();
        }
        if (wasDragMove.value) {
          runOnJS(handleMoveDrag)(dx, dy);
        }
        return;
      }
        // ── COPY ────────────────────────────────────────────────────────────────
     if (currentShapeSV.value === 10) {
       runOnJS(handleCopyDragUpdate)(wx, wy);
        return;  }
        // ── MIRROR ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 11) {
    mirrorLiveX.value = wx;
    mirrorLiveY.value = wy;
    runOnJS(handleMirrorLineUpdate)(wx, wy);
    return;
  }
    // ── ROTATE ──────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 12) {
    runOnJS(handleRotateDragUpdate)(wx, wy);
    return;
  }
  // ── SCALE ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 13) {
    runOnJS(handleScaleDragUpdate)(wx, wy);
    return;
  }
    // ── DIM ───────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 15) {
    runOnJS(handleDimMove)(wx, wy);
    return;
  }
    // ── CPAT live preview ────────────────────────────────────────────────
  if (currentShapeSV.value === 17) {
    runOnJS(handleCpatDragUpdate)(wx, wy);
    return;
  }
   // ── STRETCH ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 19) {
    runOnJS(handleStretchMove)(wx, wy, scale.value);
    return;
  }   
})
    .onEnd(() => {
      'worklet';
      const endX = translateCrossX.value;
      const endY = translateCrossY.value;
      // ── LINE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 0) {
        runOnJS(commitLine)(endX, endY);
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
  // ── EXTEND ──────────────────────────────────────────────────────────────
        if (currentShapeSV.value === 5) {
       runOnJS(handleExtendEnd)(endX, endY);
  }


// ── FILLET / CHAMFER ──────────────────────────────────────────────────────
if (currentShapeSV.value === 7 || currentShapeSV.value === 8) {
  runOnJS(handleFilletTap)(endX, endY, scale.value);
}
 // ── MOVE ──────────────────────────────────────────────────────────────
      if (currentShapeSV.value === 9) {
        const dx = endX - dragStartX.value;
        const dy = endY - dragStartY.value;
        const wasTap = !wasDragMove.value;
        runOnJS(handleMoveEnd)(wasTap, endX, endY, scale.value);
        return;
      }
        // ── COPY ────────────────────────────────────────────────────────────────
 if (currentShapeSV.value === 10) {
  runOnJS(handleCopyDragEnd)(endX, endY, scale.value);  // ← add scale.value
  return;
}   
     // ── MIRROR ────────────────────────────────────────────────────────────
    if (currentShapeSV.value === 11) {
      runOnJS(handleMirrorGestureEnd)(endX, endY, scale.value);
      return;
    }
    // ── ROTATE ──────────────────────────────────────────────────────────────
    if (currentShapeSV.value === 12) {
    runOnJS(handleRotateGestureEnd)(endX, endY, scale.value);
    return;
  }
    // ── SCALE ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 13) {
    runOnJS(handleScaleGestureEnd)(endX, endY, scale.value);
    return;
  }
   // ── ERASE ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 14) {
    runOnJS(handleEraseTap)(endX, endY, scale.value);
    return;
  }
  // ── DIMENSION ────────────────────────────────────────────────────────────
    if (currentShapeSV.value === 15) {
    runOnJS(handleDimTap)(endX, endY, scale.value);
    return;
  }

  // ── CPAT ─────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 17) {
    const dx = endX - (cpatCenter?.x ?? endX);
    const dy = endY - (cpatCenter?.y ?? endY);
    const wasTap = Math.hypot(dx, dy) < 6 / scale.value;
    if (wasTap) {
      runOnJS(handleCpatTap)(endX, endY, scale.value);
    } else {
      runOnJS(handleCpatDragEnd)();
    }
    return;
  }
  // ── RPAT tap to select ────────────────────────────────────────────────
  if (currentShapeSV.value === 18) {
    runOnJS(handleRpatTap)(endX, endY, scale.value);
    return;
  }
    // ── STRETCH ────────────────────────────────────────────────────────────
  if (currentShapeSV.value === 19) {
    runOnJS(handleStretchEnd)(endX, endY, scale.value);
    return;
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
        const p = buildRectPathJS(
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
//--Extrude --------------------------------------------------------------------
const sendToExtrudeScreen = () => {
  navigation.navigate('Main3D', { segments: shapeList });
}


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
            <DrawIntersections />
            {renderDimensions()}
            {renderDimPreview()}
            {renderExtendHandles()}
            {renderFilletHighlight()}
            {renderMoveHighlights()}
            {renderCopyHighlights()}
            {renderCopyPreview()}
            {renderMirrorOverlay()}
            {renderRotateOverlay()}
            {renderScaleOverlay()}
            {renderEraseOverlay()}
            {renderSnapMarker()}
            {renderCpatOverlay()}
            {renderRpatOverlay()}
            {renderGrips()}
            {renderGripDragLine()}
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
              }}>
                <Text  style={{ color: '#fff', textTransform: 'capitalize' }}  onPress={() => handleShapeChange(shape)}  >
                {shape}
              </Text>
            </View>
          ))}
          <TouchableOpacity  style={{ backgroundColor: "#999",  paddingHorizontal: 15,  paddingVertical: 5,  borderRadius: 5, marginRight: 10,}}
            onPress={sendToExtrudeScreen}><Text style={{ color: '#fff' }}>Extrude</Text>
          </TouchableOpacity>
                <TouchableOpacity style={styles.btn}  onPress={handleExitChain}><Text style={{ color: '#fff' }}>✕ New</Text>
          </TouchableOpacity>
{currentShape === 'offset' && (
  <View style={{flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  }}><Text style={{ color: '#fff', fontSize: 12 }}>Distance:</Text>
    {[5, 10, 20, 50].map(d => (
      <View
        key={d}
        style={{
          backgroundColor: offsetDistance === d ? '#fff' : '#666',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 4,
        }}
      ><Text
          style={{ color: offsetDistance === d ? '#333' : '#fff', fontSize: 12 }}
          onPress={() => setOffsetDistance(d)} >{d}</Text>
      </View>
    ))}
  </View>
)} 

{(currentShape === 'fillet' || currentShape === 'chamfer') && (
  <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:12 }}>

    {['fillet','chamfer'].map(m => (
      <TouchableOpacity
        key={m}
        style={{
          backgroundColor: filletMode === m ? '#fff' : '#666',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
        }}
        onPress={() => {
          setFilletMode(m);
          currentShapeSV.value = SHAPE_MAP[m];
          setFilletFirstSelSynced(null);
          filletModeRef.current = m;
        }}
      >
        <Text style={{ color: filletMode === m ? '#333' : '#fff', fontSize: 12 }}>{m}</Text>
      </TouchableOpacity>
    ))}

    {filletMode === 'fillet' && (
      <>
        <Text style={{ color:'#fff', fontSize:12 }}>R:</Text>
        {[5, 10, 20, 30].map(r => (
          <TouchableOpacity
            key={r}
            style={{
              backgroundColor: filletRadius === r ? '#fff' : '#666',
              paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
            }}
           onPress={() => {
             setFilletRadius(r);
               filletRadiusRef.current = r;  
              }}

          >
            <Text style={{ color: filletRadius === r ? '#333' : '#fff', fontSize: 12 }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </>
    )}

    {filletMode === 'chamfer' && (
      <>
        <Text style={{ color:'#fff', fontSize:12 }}>D:</Text>
        {[5, 10, 20, 30].map(d => (
          <TouchableOpacity
            key={d}
            style={{
              backgroundColor: chamferDistance === d ? '#fff' : '#666',
              paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
            }}
          onPress={() => { setChamferDistance(d);
             chamferDistanceRef.current = d;     // ← immediate
             }}
          >
            <Text style={{ color: chamferDistance === d ? '#333' : '#fff', fontSize: 12 }}>{d}</Text>
          </TouchableOpacity>
        ))}
      </>
    )}

    {filletFirstSel && (
      <Text style={{ color:'orange', fontSize:12 }}>Tap 2nd line</Text>
    )}

  </View>
)}

{currentShape === 'move' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:10, paddingHorizontal:12,
  }}>
    <Text style={{ color:'#fff', fontSize:12 }}>
      {selectedIndices.length === 0
        ? 'Tap segments to select'
        : `${selectedIndices.length} selected — drag to move`}
    </Text>
    {selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={() => setSelectedIndices([])}
        >
          Clear
        </Text>
      </View>
    )}
  </View>
)}

{currentShape === 'copy' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:10, paddingHorizontal:12, flex:1,
  }}>


    <Text style={{ color:'#fff', fontSize:12, flex:1 }}>
      {selectedIndices.length === 0 && copyCount === 0
        ? 'Tap to select segments'
        : selectedIndices.length > 0 && copyPhase === 0
        ? `${selectedIndices.length} selected — drag to copy`
        : copyPhase === 1
        ? 'Drag to place copy'
        : `${copyCount} ${copyCount === 1 ? 'copy' : 'copies'} placed`}
    </Text>

 
    {selectedIndices.length > 0 && copyPhase === 0 && (
      <View style={{
        backgroundColor:'#555',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={() => setSelectedIndices([])}
        >
          Clear
        </Text>
      </View>
    )}


    {(copyCount > 0 || selectedIndices.length > 0) && (
      <View style={{
        backgroundColor:'#0a7',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={handleCopyDone}
        >
          Done
        </Text>
      </View>
    )}

  </View>
)}

{currentShape === 'mirror' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:10, paddingHorizontal:12, flex:1,
  }}>

  
    <Text style={{ color:'#fff', fontSize:12, flex:1 }}>
      {mirrorPhase === 0 && selectedIndices.length === 0
        ? 'Tap segments to select'
        : mirrorPhase === 0 && selectedIndices.length > 0
        ? `${selectedIndices.length} selected`
        : mirrorPhase === 1
        ? 'Tap first point of mirror line'
        : 'Drag to second point — release to mirror'}
    </Text>

   
    {mirrorPhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#e67e00',
        paddingHorizontal:12, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={handleStartMirrorLine}
        >
          Mirror line
        </Text>
      </View>
    )}

   
    {mirrorPhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#555',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={() => setSelectedIndices([])}
        >
          Clear
        </Text>
      </View>
    )}


    {mirrorPhase >= 1 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={() => {
            setMirrorPhase(0);
            setMirrorPt1(null);
            setMirrorPt2(null);
            setMirrorPreview([]);
          }}
        >
          Cancel
        </Text>
      </View>
    )}


    {mirrorPhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#0a7',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={handleMirrorDone}
        >
          Done
        </Text>
      </View>
    )}

  </View>
)}

{currentShape === 'rotate' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:8, paddingHorizontal:12, flex:1,
  }}>

    <Text style={{ color:'#fff', fontSize:11, flex:1 }} numberOfLines={1}>
      {rotatePhase === 0 && selectedIndices.length === 0
        ? 'Tap segments to select'
        : rotatePhase === 0 && selectedIndices.length > 0
        ? `${selectedIndices.length} selected`
        : rotatePhase === 1
        ? 'Tap base point'
        : `${Math.round(radToDeg(rotateAngle))}°`}
    </Text>

    {rotatePhase === 2 && (
      <View style={{
        backgroundColor: rotateSnap ? '#e67e00' : '#555',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRotateSnap(v => !v)}
        >
          {rotateSnap ? 'Snap 15°' : 'Free'}
        </Text>
      </View>
    )}

    {rotatePhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#e67e00',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRotatePhase(1)}
        >
          Base point
        </Text>
      </View>
    )}
    {rotatePhase === 2 && [45, 90, 135, 180].map(deg => (
      <View
        key={deg}
        style={{
          backgroundColor:'#444',
          paddingHorizontal:8, paddingVertical:4, borderRadius:4,
        }}
      >
        <Text
          style={{ color:'#fff', fontSize:11 }}
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
          {deg}°
        </Text>
      </View>
    ))}

    {rotatePhase === 0 && selectedIndices.length > 0 && (
      <View style={{ backgroundColor:'#555', paddingHorizontal:8, paddingVertical:4, borderRadius:4 }}>
        <Text style={{ color:'#fff', fontSize:11 }} onPress={() => setSelectedIndices([])}>
          Clear
        </Text>
      </View>
    )}
    {selectedIndices.length > 0 && (
      <View style={{ backgroundColor:'#0a7', paddingHorizontal:8, paddingVertical:4, borderRadius:4 }}>
        <Text style={{ color:'#fff', fontSize:11 }} onPress={handleRotateDone}>
          Done
        </Text>
      </View>
    )}

  </View>
)}

{currentShape === 'scale' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:8, paddingHorizontal:12, flex:1,
  }}>

    <Text style={{ color:'#fff', fontSize:11, flex:1 }} numberOfLines={1}>
      {scalePhase === 0 && selectedIndices.length === 0
        ? 'Tap segments to select'
        : scalePhase === 0 && selectedIndices.length > 0
        ? `${selectedIndices.length} selected`
        : scalePhase === 1
        ? 'Tap base point'
        : formatFactor(scaleFactor)}
    </Text>

  
    {scalePhase === 2 && (
      <View style={{
        backgroundColor: scaleSnap ? '#e67e00' : '#555',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
      <TouchableOpacity onPress={() => setScaleSnap(v => !v)}>
            <Text
          style={{ color:'#fff', fontSize:11 }}
          
        >
          {scaleSnap ? 'Snap' : 'Free'}
        </Text>
      </TouchableOpacity>
      </View>
    )}

    {scalePhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#e67e00',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={() => setScalePhase(1)}
        >
          Base point
        </Text>
      </View>
    )}
    {scalePhase === 2 && [0.5, 2, 3, 4].map(f => (
      <View
        key={f}
        style={{
          backgroundColor: scaleFactor === f ? '#0af' : '#444',
          paddingHorizontal:8, paddingVertical:4, borderRadius:4,
        }}
      >
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={() => handleScalePreset(f)}
        >
          {f}×
        </Text>
      </View>
    ))}

    {scalePhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#555',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={() => setSelectedIndices([])}
        >
          Clear
        </Text>
      </View>
    )}
    {selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#0a7',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:11 }}
          onPress={handleScaleDone}
        >
          Done
        </Text>
      </View>
    )}

  </View>
)}

{currentShape === 'erase' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:8, paddingHorizontal:12, flex:1,
  }}>

    {/* Instruction / count */}
    <Text style={{ color:'#fff', fontSize:12, flex:1 }}>
      {eraseIndices.length === 0
        ? 'Tap segments to mark for deletion'
        : `${eraseIndices.length} segment${eraseIndices.length > 1 ? 's' : ''} marked`}
    </Text>

    {/* Clear highlights */}
    {eraseIndices.length > 0 && (
      <View style={{
        backgroundColor:'#555',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={handleEraseCancel}
        >
          Cancel
        </Text>
      </View>
    )}

    {/* Confirm delete */}
    {eraseIndices.length > 0 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:12, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:12 }}
          onPress={handleEraseConfirm}
        >
          Delete {eraseIndices.length}
        </Text>
      </View>
    )}

  </View>
)}
 
 <View style={{
  backgroundColor: snapSettings.enabled ? '#0a7' : '#555',
  paddingHorizontal:10, paddingVertical:4, borderRadius:4,
  marginRight:6,
}}>
  <Text
    style={{ color:'#fff', fontSize:11 }}
    onPress={() => setShowSnapPanel(v => !v)}
  >
    OSNAP {snapSettings.enabled ? 'ON' : 'OFF'}
  </Text>
</View>



<View style={{ backgroundColor: activeSnap ? '#0f0' : '#555',
  paddingHorizontal:8, paddingVertical:4, borderRadius:4, marginRight:6 }}>
  <Text style={{ color:'#fff', fontSize:10 }}>
    {activeSnap ? `SNAP: ${activeSnap.type}` : 'no snap'}
  </Text>
</View>

  {['line','arc','rectangle','circle'].includes(currentShape) && (
  <>
    <View style={{
      backgroundColor: orthoEnabled ? '#0af' : '#555',
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 4, marginRight: 6,
    }}>
      <Text
        style={{ color: '#fff', fontSize: 11 }}
        onPress={() => {
          setOrthoEnabled(v => !v);
          if (!orthoEnabled) setPolarEnabled(false); // mutual exclusion
        }}
      >
        ORTHO {orthoEnabled ? 'ON' : 'OFF'}
      </Text>
    </View>

    <View style={{
      backgroundColor: polarEnabled ? '#a0f' : '#555',
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 4, marginRight: 6,
    }}>
      <Text
        style={{ color: '#fff', fontSize: 11 }}
        onPress={() => {
          setPolarEnabled(v => !v);
          if (!polarEnabled) setOrthoEnabled(false); // mutual exclusion
        }}
      >
        POLAR {polarEnabled ? 'ON' : 'OFF'}
      </Text>
    </View>

    {/* Live axis + distance readout while drawing */}
    {(orthoEnabled || polarEnabled) && orthoAxis && (
      <View style={{
        backgroundColor: '#333',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 4, marginRight: 6,
      }}>
        <Text style={{ color: '#ff0', fontSize: 10 }}>
          {formatAxis(orthoAxis)}
          {liveStats ? `  ${liveStats.dist}  ${liveStats.angleDeg}°` : ''}
        </Text>
      </View>
    )}
  </>
)}

{currentShape === 'dim' && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ alignItems:'center', paddingHorizontal:8, gap:6 }}
  >
    {/* Dim type selector */}
    {[
      { type: DIM_TYPES.LINEAR,   label: '↔ Linear'   },
      { type: DIM_TYPES.ALIGNED,  label: '⟋ Aligned'  },
      { type: DIM_TYPES.RADIAL,   label: 'R Radial'   },
      { type: DIM_TYPES.DIAMETER, label: '⌀ Diameter' },
      { type: DIM_TYPES.ANGULAR,  label: '∠ Angular'  },
      { type: DIM_TYPES.ORDINATE, label: '⊢ Ordinate' },
      { type: DIM_TYPES.ARC_LEN,  label: '⌒ Arc Len'  },
    ].map(({ type, label }) => (
      <View key={type} style={{
        backgroundColor: dimMode === type ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color: dimMode === type ? '#fff' : '#aaa', fontSize:10 }}
          onPress={() => { setDimMode(type); setDimPhase(0); setDimFirstSeg(null); }}
        >
          {label}
        </Text>
      </View>
    ))}

    {/* Subtype for linear */}
    {dimMode === DIM_TYPES.LINEAR && (
      <>
        {['horizontal','vertical'].map(s => (
          <View key={s} style={{
            backgroundColor: dimSubtype === s ? '#006acc' : '#333',
            paddingHorizontal:6, paddingVertical:3, borderRadius:4,
          }}>
            <Text
              style={{ color:'#fff', fontSize:10 }}
              onPress={() => setDimSubtype(s)}
            >
              {s === 'horizontal' ? '— H' : '| V'}
            </Text>
          </View>
        ))}
      </>
    )}

    {/* Subtype for ordinate */}
    {dimMode === DIM_TYPES.ORDINATE && (
      <>
        {['x','y'].map(s => (
          <View key={s} style={{
            backgroundColor: dimSubtype === s ? '#006acc' : '#333',
            paddingHorizontal:6, paddingVertical:3, borderRadius:4,
          }}>
            <Text
              style={{ color:'#fff', fontSize:10 }}
              onPress={() => setDimSubtype(s)}
            >
              {s.toUpperCase()}
            </Text>
          </View>
        ))}
      </>
    )}

    {/* Offset presets */}
    <Text style={{ color:'#888', fontSize:10 }}>Offset:</Text>
    {[16, 24, 40, 60].map(o => (
      <View key={o} style={{
        backgroundColor: dimOffset === o ? '#0099ff' : '#333',
        paddingHorizontal:6, paddingVertical:3, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:10 }}
          onPress={() => setDimOffset(o)}
        >
          {o}
        </Text>
      </View>
    ))}

    {/* Phase indicator */}
    <Text style={{ color:'#aaa', fontSize:10 }}>
      {dimPhase === 0 && !dimFirstSeg ? 'Tap segment or 1st point'  : ''}
      {dimPhase === 1               ? 'Tap 2nd point'               : ''}
      {dimFirstSeg && dimMode === DIM_TYPES.ANGULAR ? 'Tap 2nd line' : ''}
    </Text>

    {/* Clear all dims */}
    {dimList.length > 0 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text
          style={{ color:'#fff', fontSize:10 }}
          onPress={() => setDimList([])}
        >
          Clear dims
        </Text>
      </View>
    )}
  </ScrollView>
)}

{/* ── CIRCULAR PATTERN footer ───────────────────────────────────────────── */}
{currentShape === 'cpat' && (
   <>
       {/* Phase label */}
    <Text style={{ color:'#fff', fontSize:11 }}>
      {cpatPhase === 0 ? 'Select objects'
       : cpatPhase === 1 ? 'Tap center point'
       : 'Drag → release to place'}
    </Text>

    {/* Count */}
    <Text style={{ color:'#888', fontSize:10 }}>Count:</Text>
    {[2,3,4,5,6,8,10,12].map(n => (
      <View key={n} style={{
        backgroundColor: cpatCount === n ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setCpatCount(n)}>{n}</Text>
      </View>
    ))}

    {/* Span */}
    <Text style={{ color:'#888', fontSize:10 }}>Span:</Text>
    {[90,120,180,270,360].map(s => (
      <View key={s} style={{
        backgroundColor: cpatSpan === s ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setCpatSpan(s)}>{s}°</Text>
      </View>
    ))}

    {/* Rotate instances toggle */}
    <View style={{
      backgroundColor: cpatRotateInst ? '#e67e00' : '#555',
      paddingHorizontal:8, paddingVertical:4, borderRadius:4,
    }}>
      <Text style={{ color:'#fff', fontSize:11 }}
        onPress={() => setCpatRotateInst(v => !v)}>
        {cpatRotateInst ? 'Rotate ✓' : 'No rotate'}
      </Text>
    </View>

    {/* Go to phase 1 */}
    {cpatPhase === 0 && selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#0a7',
        paddingHorizontal:10, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setCpatPhase(1)}>
          Set center →
        </Text>
      </View>
    )}

    {/* Cancel */}
    {cpatPhase > 0 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => {
            setCpatPhase(0); setCpatCenter(null);
            setCpatPreview([]); setSelectedIndices([]);
          }}>Cancel</Text>
      </View>
    )}
   
   </>
)}

{/* ── RECTANGULAR PATTERN footer ────────────────────────────────────────── */}
{currentShape === 'rpat' && (
  <>
    {/* Phase label */}
    <Text style={{ color:'#fff', fontSize:11 }}>
      {selectedIndices.length === 0 ? 'Select objects' : `${selectedIndices.length} selected`}
    </Text>

    {/* Rows */}
    <Text style={{ color:'#888', fontSize:10 }}>Rows:</Text>
    {[1,2,3,4,5,6].map(n => (
      <View key={n} style={{
        backgroundColor: rpatRows === n ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRpatRows(n)}>{n}</Text>
      </View>
    ))}

    {/* Cols */}
    <Text style={{ color:'#888', fontSize:10 }}>Cols:</Text>
    {[1,2,3,4,5,6].map(n => (
      <View key={n} style={{
        backgroundColor: rpatCols === n ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRpatCols(n)}>{n}</Text>
      </View>
    ))}

    {/* Spacing X */}
    <Text style={{ color:'#888', fontSize:10 }}>dX:</Text>
    {[20,30,50,80,100].map(s => (
      <View key={s} style={{
        backgroundColor: rpatSpacingX === s ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRpatSpacingX(s)}>{s}</Text>
      </View>
    ))}

    {/* Spacing Y */}
    <Text style={{ color:'#888', fontSize:10 }}>dY:</Text>
    {[20,30,50,80,100].map(s => (
      <View key={s} style={{
        backgroundColor: rpatSpacingY === s ? '#0099ff' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRpatSpacingY(s)}>{s}</Text>
      </View>
    ))}

    {/* Pattern angle */}
    <Text style={{ color:'#888', fontSize:10 }}>Angle:</Text>
    {[0,15,30,45,90].map(a => (
      <View key={a} style={{
        backgroundColor: rpatAngle === a ? '#e67e00' : '#444',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => setRpatAngle(a)}>{a}°</Text>
      </View>
    ))}

    {/* Commit */}
    {selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#0a7',
        paddingHorizontal:12, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={handleRpatCommit}>
          Place {rpatRows * rpatCols}
        </Text>
      </View>
    )}

    {/* Cancel */}
    {selectedIndices.length > 0 && (
      <View style={{
        backgroundColor:'#c0392b',
        paddingHorizontal:8, paddingVertical:4, borderRadius:4,
      }}>
        <Text style={{ color:'#fff', fontSize:11 }}
          onPress={() => { setSelectedIndices([]); setRpatPreview([]); }}>
          Cancel
        </Text>
      </View>
    )}
  </>
)}

{currentShape === 'stretch' && (
  <View style={{
    flexDirection:'row', alignItems:'center',
    gap:10, paddingHorizontal:12, flex:1,
  }}>

    {/* Status */}
    <Text style={{ color:'#fff', fontSize:12, flex:1 }}>
      {!activeGrip && !hotGrip
        ? 'Hover over a grip point'
        : hotGrip && !activeGrip
        ? `${hotGrip.role} grip — drag to stretch`
        : activeGrip
        ? `Stretching ${activeGrip.role}…`
        : ''}
    </Text>

    {/* Legend */}
    <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
      {[
        { color: GRIP_COLOR.endpoint, label: 'End'    },
        { color: GRIP_COLOR.midpoint, label: 'Mid'    },
        { color: GRIP_COLOR.center,   label: 'Center' },
        { color: GRIP_COLOR.radius,   label: 'Radius' },
      ].map(({ color, label }) => (
        <View key={label} style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
          <View style={{
            width:8, height:8, borderRadius:1,
            backgroundColor: color,
          }} />
          <Text style={{ color:'#aaa', fontSize:9 }}>{label}</Text>
        </View>
      ))}
    </View>

  </View>
)}

        </ScrollView>
      </View>
     {/* Move this OUTSIDE the ScrollView, directly inside the footer View */}
{showSnapPanel && (
  <View style={{
    position: 'absolute',
    bottom: FOOTER_HEIGHT,
    left: 0, right: 0,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 100,
    elevation: 10,
  }}>

    {/* Header row */}
    <View style={{ width: '100%', flexDirection: 'row',
      justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>OSNAP Settings</Text>
      <TouchableOpacity
        style={{
          backgroundColor: snapSettings.enabled ? '#0a7' : '#555',
          paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4,
        }}
        onPress={() => setSnapSettings(s => ({ ...s, enabled: !s.enabled }))}
      >
        <Text style={{ color: '#fff', fontSize: 12 }}>
          {snapSettings.enabled ? 'Enabled' : 'Disabled'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Per-type toggles */}
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
        style={{
          backgroundColor: !snapSettings[key] ? color + '33' : '#333',
          borderWidth: 1,
          borderColor: !snapSettings[key] ? color : '#555',
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
        }}
        onPress={() => setSnapSettings(s => ({ ...s, [key]: !s[key] }))}
      >
        <Text style={{ color: !snapSettings[key] ? color : '#888', fontSize: 11 }}>
          {label}
        </Text>
      </TouchableOpacity>
    ))}

    {/* Radius row */}
    <View style={{ width: '100%', flexDirection: 'row',
      alignItems: 'center', gap: 8, marginTop: 4 }}>
      <Text style={{ color: '#aaa', fontSize: 11 }}>Radius: {snapSettings.radius}</Text>
      {[10, 20, 30, 50].map(r => (
        <TouchableOpacity
          key={r}
          style={{
            backgroundColor: snapSettings.radius === r ? '#0af' : '#444',
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
          }}
          onPress={() => setSnapSettings(s => ({ ...s, radius: r }))}
        >
          <Text style={{ color: '#fff', fontSize: 11 }}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>

  </View>
)}

    </View>
  );
};

export default Sketching2D;

const styles = StyleSheet.create({
  container: { backgroundColor: '#999' },
  header:    { backgroundColor: '#ccc' },
  footer:    { backgroundColor: '#ccc' },
  btn:{
    backgroundColor: "#e05",   
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
}
});