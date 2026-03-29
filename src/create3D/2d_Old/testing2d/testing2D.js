
import React, { useState, useCallback, useRef } from 'react';
import {  View, Text, TouchableOpacity,  ScrollView, StyleSheet, Dimensions, StatusBar, Platform,} from 'react-native';
import { Canvas, Path, Circle, Group, DashPathEffect,} from '@shopify/react-native-skia';
import { GestureDetector, Gesture,  GestureHandlerRootView,} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const TOOLBAR_H = 56;
const STATUS_H  = 30;
const STAGE_H   = 26;
const SAFE_TOP  = Platform.OS === 'ios' ? 44 : 24;
const CANVAS_H  = H - TOOLBAR_H - STATUS_H - SAFE_TOP - 4;
const GRID      = 20;

// ─── WORKLET: snap to grid ────────────────────────────────────────────────────
// Must be declared at module level with 'worklet' so Reanimated can compile it.
function snapPt(x, y, on) {
  'worklet';
  if (!on) return { x, y };
  return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID };
}

// ─── GEOMETRY (JS thread only) ───────────────────────────────────────────────
const EPS   = 1e-9;
const dist  = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function normalizeAngle(a) {
  while (a < 0) a += 2 * Math.PI;
  while (a >= 2 * Math.PI) a -= 2 * Math.PI;
  return a;
}

function pointOnArc(pt, arc) {
  const angle = normalizeAngle(Math.atan2(pt.y - arc.cy, pt.x - arc.cx));
  const sa = normalizeAngle(arc.startAngle);
  // endAngle may be > 2*PI for wrap-around arcs produced by splitCircle
  const ea = arc.endAngle;
  if (ea > 2 * Math.PI) {
    // arc crosses the 0/2*PI boundary: point is valid if >= sa OR <= (ea mod 2*PI)
    return angle >= sa - EPS || angle <= normalizeAngle(ea) + EPS;
  }
  const nea = normalizeAngle(ea);
  if (sa <= nea) return angle >= sa - EPS && angle <= nea + EPS;
  return angle >= sa - EPS || angle <= nea + EPS;
}

// ─── INTERSECTIONS START FROM HERE *************************───────────────────────────────────────────────────────────*******************************
function lineLineIntersect(l1, l2) {
  const dx1 = l1.p2.x - l1.p1.x, dy1 = l1.p2.y - l1.p1.y;
  const dx2 = l2.p2.x - l2.p1.x, dy2 = l2.p2.y - l2.p1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < EPS) return [];
  const t = ((l2.p1.x - l1.p1.x) * dy2 - (l2.p1.y - l1.p1.y) * dx2) / denom;
  const u = ((l2.p1.x - l1.p1.x) * dy1 - (l2.p1.y - l1.p1.y) * dx1) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return [];
  return [{ x: l1.p1.x + t * dx1, y: l1.p1.y + t * dy1 }];
}
function lineCircleIntersect(line, circle) {
  const dx = line.p2.x - line.p1.x, dy = line.p2.y - line.p1.y;
  const fx = line.p1.x - circle.cx, fy = line.p1.y - circle.cy;
  const a = dx * dx + dy * dy;
  if (a < EPS * EPS) return [];
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.r * circle.r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  if (disc < EPS * EPS) {
    const t = -b / (2 * a);
    if (t >= -EPS && t <= 1 + EPS) return [{ x: line.p1.x + t * dx, y: line.p1.y + t * dy }];
    return [];
  }
  disc = Math.sqrt(disc);
  const pts = [];
  for (const s of [-1, 1]) {
    const t = (-b + s * disc) / (2 * a);
    if (t >= -EPS && t <= 1 + EPS) pts.push({ x: line.p1.x + t * dx, y: line.p1.y + t * dy });
  }
  return pts;
}
function lineArcIntersect(line, arc) {
  return lineCircleIntersect(line, { cx: arc.cx, cy: arc.cy, r: arc.r }).filter(p => pointOnArc(p, arc));
}
function circleCircleIntersect(c1, c2) {
  const d = dist({ x: c1.cx, y: c1.cy }, { x: c2.cx, y: c2.cy });
  if (d < EPS || d > c1.r + c2.r + EPS || d < Math.abs(c1.r - c2.r) - EPS) return [];
  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
  const mx = c1.cx + (a / d) * (c2.cx - c1.cx), my = c1.cy + (a / d) * (c2.cy - c1.cy);
  const ox = (h / d) * (c2.cy - c1.cy), oy = (h / d) * (c2.cx - c1.cx);
  const pts = [{ x: mx + ox, y: my - oy }];
  if (h > EPS) pts.push({ x: mx - ox, y: my + oy });
  return pts;
}
function arcArcIntersect(a1, a2) {
  return circleCircleIntersect({ cx: a1.cx, cy: a1.cy, r: a1.r }, { cx: a2.cx, cy: a2.cy, r: a2.r })
    .filter(p => pointOnArc(p, a1) && pointOnArc(p, a2));
}
function arcCircleIntersect(arc, circle) {
  return circleCircleIntersect({ cx: arc.cx, cy: arc.cy, r: arc.r }, circle).filter(p => pointOnArc(p, arc));
}
function segSegIntersect(sa, sb) {
  const [ta, tb] = [sa.type, sb.type];
  if (ta === 'line'   && tb === 'line')   return lineLineIntersect(sa, sb);
  if (ta === 'line'   && tb === 'arc')    return lineArcIntersect(sa, sb);
  if (ta === 'line'   && tb === 'circle') return lineCircleIntersect(sa, sb);
  if (ta === 'arc'    && tb === 'line')   return lineArcIntersect(sb, sa);
  if (ta === 'circle' && tb === 'line')   return lineCircleIntersect(sb, sa);
  if (ta === 'arc'    && tb === 'arc')    return arcArcIntersect(sa, sb);
  if (ta === 'arc'    && tb === 'circle') return arcCircleIntersect(sa, sb);
  if (ta === 'circle' && tb === 'arc')    return arcCircleIntersect(sb, sa);
  if (ta === 'circle' && tb === 'circle') return circleCircleIntersect(sa, sb);
  return [];
}

// ─── SPLIT ENGINE START FROM HERE ***********─────────────────────────────────────────────────────────────************************
function splitLine(seg, pts) {
  const sorted = [...pts].sort((a, b) => dist(seg.p1, a) - dist(seg.p1, b));
  const all = [seg.p1, ...sorted, seg.p2]
  const res = [];
  for (let i = 0; i < all.length - 1; i++)
    if (dist(all[i], all[i + 1]) > EPS) res.push({ type: 'line', p1: all[i], p2: all[i + 1] });
  return res;
}
 
function splitArc(seg, pts) {
  const sa = normalizeAngle(seg.startAngle);
  const toA = p => normalizeAngle(Math.atan2(p.y - seg.cy, p.x - seg.cx));
  const aOf = p => { let a = toA(p); if (a < sa - EPS) a += 2 * Math.PI; return a; };
  const sorted = [...pts].sort((a, b) => aOf(a) - aOf(b));
  const angles = [seg.startAngle, ...sorted.map(toA), seg.endAngle], res = [];
  for (let i = 0; i < angles.length - 1; i++)
    if (Math.abs(angles[i + 1] - angles[i]) > EPS)
      res.push({ type: 'arc', cx: seg.cx, cy: seg.cy, r: seg.r, startAngle: angles[i], endAngle: angles[i + 1] });
  return res;
}
function splitCircle(seg, pts) {
  if (!pts.length) return [seg];
  const toA = p => normalizeAngle(Math.atan2(p.y - seg.cy, p.x - seg.cx));
  const sorted = [...pts].sort((a, b) => toA(a) - toA(b));
  const angles = sorted.map(toA), res = [];
  for (let i = 0; i < angles.length; i++) {
    const sa = angles[i];
    // next angle, wrapping back to first for the last arc
    let ea = angles[(i + 1) % angles.length];
    // ensure ea > sa so the sweep (ea - sa) is always positive and non-zero
    if (ea <= sa) ea += 2 * Math.PI;
    res.push({ type: 'arc', cx: seg.cx, cy: seg.cy, r: seg.r, startAngle: sa, endAngle: ea });
  }
  return res;
}
function splitSeg(seg, pts) {
  if (!pts || !pts.length) return [seg];
  if (seg.type === 'line')   return splitLine(seg, pts);
  if (seg.type === 'arc')    return splitArc(seg, pts);
  if (seg.type === 'circle') return splitCircle(seg, pts);
  return [seg];
}

// ─── DISTANCE POINT→SEG ──────────────────────────────────────────────────────
function distPtLine(pt, seg) {
  const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return dist(pt, seg.p1);
  const t = clamp(((pt.x - seg.p1.x) * dx + (pt.y - seg.p1.y) * dy) / len2, 0, 1);
  return dist(pt, { x: seg.p1.x + t * dx, y: seg.p1.y + t * dy });
}
function distPtArc(pt, seg) {
  if (pointOnArc(pt, seg)) return Math.abs(dist(pt, { x: seg.cx, y: seg.cy }) - seg.r);
  const sa = { x: seg.cx + seg.r * Math.cos(seg.startAngle), y: seg.cy + seg.r * Math.sin(seg.startAngle) };
  const ea = { x: seg.cx + seg.r * Math.cos(seg.endAngle),   y: seg.cy + seg.r * Math.sin(seg.endAngle) };
  return Math.min(dist(pt, sa), dist(pt, ea));
}
function distPtCircle(pt, seg) { return Math.abs(dist(pt, { x: seg.cx, y: seg.cy }) - seg.r); }
function distPtSeg(pt, seg) {
  if (seg.type === 'line')   return distPtLine(pt, seg);
  if (seg.type === 'arc')    return distPtArc(pt, seg);
  if (seg.type === 'circle') return distPtCircle(pt, seg);
  return Infinity;
}

// ─── TRIM ENGINE ──────────────────────────────────────────────────────────────
function trimShape(target, boundaries, clickPt) {
  const allBS = boundaries.flatMap(b => b.segments);
  const hitsPerSeg = target.segments.map(seg => {
    const h = [];
    for (const bs of allBS) h.push(...segSegIntersect(seg, bs));
    return h;
  });
  if (!hitsPerSeg.flat().length) return null;
  const newSegs = [];
  target.segments.forEach((seg, i) => newSegs.push(...splitSeg(seg, hitsPerSeg[i])));
  let minD = Infinity, minIdx = -1;
  newSegs.forEach((seg, i) => { const d = distPtSeg(clickPt, seg); if (d < minD) { minD = d; minIdx = i; } });
  if (minIdx === -1) return null;
  return { ...target, segments: newSegs.filter((_, i) => i !== minIdx) };
}

// ─── SEG → SVG PATH ───────────────────────────────────────────────────────────
function segToPath(seg) {
  if (seg.type === 'line') return `M${seg.p1.x} ${seg.p1.y} L${seg.p2.x} ${seg.p2.y}`;
  if (seg.type === 'arc') {
    const x1 = seg.cx + seg.r * Math.cos(seg.startAngle), y1 = seg.cy + seg.r * Math.sin(seg.startAngle);
    const x2 = seg.cx + seg.r * Math.cos(seg.endAngle),   y2 = seg.cy + seg.r * Math.sin(seg.endAngle);
    // IMPORTANT: do NOT use normalizeAngle here — it maps 2*PI → 0 making full arcs invisible.
    // Instead compute raw sweep and bring it into (0, 2*PI].
    let sweep = seg.endAngle - seg.startAngle;
    while (sweep <= 0)          sweep += 2 * Math.PI;
    while (sweep > 2 * Math.PI) sweep -= 2 * Math.PI;
    return `M${x1} ${y1} A${seg.r} ${seg.r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
  }
  if (seg.type === 'circle') {
    const { cx, cy, r } = seg;
    return `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  }
  return '';
}
function shapeToPath(shape) { return shape.segments.map(segToPath).filter(Boolean).join(' '); }

// ─── FIND NEAREST ─────────────────────────────────────────────────────────────
function findNearest(shapes, pt, excludeIds, radius = 24) {
  let best = null, bestD = radius;
  for (const sh of shapes) {
    if (excludeIds && excludeIds.has(sh.id)) continue;
    for (const seg of sh.segments) {
      const d = distPtSeg(pt, seg);
      if (d < bestD) { bestD = d; best = sh; }
    }
  }
  return best;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TOOLS = { SELECT:'SELECT', LINE:'LINE', RECT:'RECT', CIRCLE:'CIRCLE', ARC:'ARC', TRIM:'TRIM', ERASE:'ERASE' };
const TOOL_DEFS = [
  { id: TOOLS.SELECT, label: 'Select', icon: '↖' },
  { id: TOOLS.LINE,   label: 'Line',   icon: '╱' },
  { id: TOOLS.RECT,   label: 'Rect',   icon: '▭' },
  { id: TOOLS.CIRCLE, label: 'Circle', icon: '○' },
  { id: TOOLS.ARC,    label: 'Arc',    icon: '◜' },
  { id: TOOLS.TRIM,   label: 'Trim',   icon: '✂' },
  { id: TOOLS.ERASE,  label: 'Erase',  icon: '⌫' },
];
const COLORS = ['#00D4FF','#FF6B35','#A8FF3E','#FF3EA8','#FFD700','#BF7FFF','#FF4466','#44FF88'];
const TRIM_STAGE = { BOUNDARY: 'BOUNDARY', TRIM: 'TRIM' };

let _id = 0;
const uid = () => `s${++_id}`;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CADTrimTool() {
  const [shapes,      setShapes]      = useState([]);
  const [tool,        setTool]        = useState(TOOLS.LINE);
  const [color,       setColor]       = useState('#00D4FF');
  const [snapOn,      setSnapOn]      = useState(true);
  const [gridOn,      setGridOn]      = useState(true);
  const [drawState,   setDrawState]   = useState(null);  // current drawing phase
  const [cursor,      setCursor]      = useState({ x: W / 2, y: CANVAS_H / 2 });
  const [trimStage,   setTrimStage]   = useState(TRIM_STAGE.BOUNDARY);
  const [boundaryIds, setBoundaryIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [status,      setStatus]      = useState('Choose a tool and tap on canvas');
  const toolRef     = useRef(TOOLS.LINE);
  const colorRef    = useRef('#00D4FF');
  const snapRef     = useRef(true);
  const drawRef     = useRef(null);
  const trimStgRef  = useRef(TRIM_STAGE.BOUNDARY);
  const bIdsRef     = useRef(new Set());
  const shapesRef   = useRef([]);
  const lastTapRef  = useRef(0); // for double-tap detection

  // ── Helpers ──
  const applyShapes = useCallback((ns) => {
    shapesRef.current = ns;
    setShapes([...ns]); // spread to force re-render
  }, []);

  const setDS = useCallback((v) => {
    drawRef.current = v;
    setDrawState(v ? { ...v } : null); // spread to force re-render
  }, []);

  // ── History ──
  const histRef = useRef([[]]); 
  const histIdx = useRef(0);
  const commit = useCallback((ns) => {
    const h = histRef.current, i = histIdx.current;
    histRef.current = [...h.slice(0, i + 1), [...ns]];
    histIdx.current = i + 1;
    applyShapes(ns);
  }, [applyShapes]);

  const undo = useCallback(() => {
    const i = histIdx.current;
    if (i > 0) { histIdx.current = i - 1; applyShapes([...histRef.current[histIdx.current]]); setStatus('Undo'); }
  }, [applyShapes]);
  const redo = useCallback(() => {
    const i = histIdx.current, h = histRef.current;
    if (i < h.length - 1) { histIdx.current = i + 1; applyShapes([...h[histIdx.current]]); setStatus('Redo'); }
  }, [applyShapes]);

  // ── Reset trim ──
  const resetTrim = useCallback(() => {
    const empty = new Set();
    bIdsRef.current = empty; setBoundaryIds(empty);
    trimStgRef.current = TRIM_STAGE.BOUNDARY; setTrimStage(TRIM_STAGE.BOUNDARY);
    setStatus('✂ STEP 1: Tap boundary edges, then Confirm');
  }, []);

  // ── Change tool ──
  const changeTool = useCallback((id) => {
    toolRef.current = id; setTool(id);
    drawRef.current = null; setDrawState(null);
    setSelectedIds(new Set());
    if (id === TOOLS.TRIM) { resetTrim(); return; }
    const msgs = {
      [TOOLS.SELECT]: 'Tap to select a shape',
      [TOOLS.LINE]:   'Tap to place start point',
      [TOOLS.RECT]:   'Tap to place first corner',
      [TOOLS.CIRCLE]: 'Tap to place center',
      [TOOLS.ARC]:    'Tap to place arc center',
      [TOOLS.ERASE]:  'Tap a shape to delete it',
    };
    setStatus(msgs[id] || '');
  }, [resetTrim]);

  // ── Confirm boundary ──
  const confirmBoundary = useCallback(() => {
    if (bIdsRef.current.size === 0) { setStatus('Select at least 1 boundary edge first'); return; }
    trimStgRef.current = TRIM_STAGE.TRIM; setTrimStage(TRIM_STAGE.TRIM);
    setStatus('Tap the segment to remove');
  }, []);

  // ── Main tap handler (JS thread, called via runOnJS) ──
  const onTap = useCallback((rawX, rawY) => {
    const pt   = snapPt(rawX, rawY, snapRef.current);
    const t    = toolRef.current;
    const ds   = drawRef.current;
    const col  = colorRef.current;
    const shs  = shapesRef.current;
    const bIds = bIdsRef.current;
    const tStg = trimStgRef.current;

    if (t === TOOLS.SELECT) {
      const s = findNearest(shs, pt);
      if (s) { setSelectedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }); setStatus(`Selected ${s.id}`); }
      else { setSelectedIds(new Set()); setStatus('Tap a shape'); }
      return;
    }

    if (t === TOOLS.ERASE) {
      const s = findNearest(shs, pt);
      if (!s) { setStatus('Nothing nearby'); return; }
      commit(shs.filter(sh => sh.id !== s.id));
      setStatus('Erased');
      return;
    }

    if (t === TOOLS.LINE) {
      if (!ds) {
        setDS({ tool: TOOLS.LINE, p1: pt });
        setStatus(`Start set — tap end point`);
      } else {
        commit([...shs, { id: uid(), color: col, segments: [{ type: 'line', p1: ds.p1, p2: pt }] }]);
        setDS({ tool: TOOLS.LINE, p1: pt }); // chain
        setStatus('Line added — tap next or double-tap to stop');
      }
      return;
    }

    if (t === TOOLS.RECT) {
      if (!ds) {
        setDS({ tool: TOOLS.RECT, p1: pt });
        setStatus('Tap opposite corner');
      } else {
        const x = Math.min(ds.p1.x, pt.x), y = Math.min(ds.p1.y, pt.y);
        const w = Math.abs(pt.x - ds.p1.x), h = Math.abs(pt.y - ds.p1.y);
        if (w > 4 && h > 4) {
          commit([...shs, {
            id: uid(), color: col, segments: [
              { type: 'line', p1: { x, y },             p2: { x: x + w, y } },
              { type: 'line', p1: { x: x + w, y },       p2: { x: x + w, y: y + h } },
              { type: 'line', p1: { x: x + w, y: y + h }, p2: { x, y: y + h } },
              { type: 'line', p1: { x, y: y + h },       p2: { x, y } },
            ],
          }]);
          setStatus('Rectangle added');
        }
        setDS(null);
      }
      return;
    }

    if (t === TOOLS.CIRCLE) {
      if (!ds) {
        setDS({ tool: TOOLS.CIRCLE, center: pt });
        setStatus('Tap to set radius');
      } else {
        const r = dist(ds.center, pt);
        if (r > 4) {
          commit([...shs, { id: uid(), color: col, segments: [{ type: 'circle', cx: ds.center.x, cy: ds.center.y, r }] }]);
          setStatus('Circle added');
        }
        setDS(null);
      }
      return;
    }

    if (t === TOOLS.ARC) {
      if (!ds) {
        setDS({ tool: TOOLS.ARC, phase: 1, center: pt });
        setStatus('Tap start point (sets radius)');
      } else if (ds.phase === 1) {
        const r = dist(ds.center, pt);
        const sa = Math.atan2(pt.y - ds.center.y, pt.x - ds.center.x);
        setDS({ ...ds, phase: 2, r, startAngle: sa, startPt: pt });
        setStatus('Tap end point of arc');
      } else {
        const ea = Math.atan2(pt.y - ds.center.y, pt.x - ds.center.x);
        commit([...shs, { id: uid(), color: col, segments: [{ type: 'arc', cx: ds.center.x, cy: ds.center.y, r: ds.r, startAngle: ds.startAngle, endAngle: ea }] }]);
        setDS(null);
        setStatus('Arc added');
      }
      return;
    }

    if (t === TOOLS.TRIM) {
      if (tStg === TRIM_STAGE.BOUNDARY) {
        const s = findNearest(shs, pt);
        if (!s) { setStatus('Tap closer to a shape'); return; }
        const nb = new Set(bIds);
        nb.has(s.id) ? nb.delete(s.id) : nb.add(s.id);
        bIdsRef.current = nb; setBoundaryIds(new Set(nb));
        setStatus(`${nb.size} boundary selected — tap Confirm`);
        return;
      }
      if (tStg === TRIM_STAGE.TRIM) {
        const bounds = shs.filter(s => bIds.has(s.id));
        if (!bounds.length) { setStatus('No boundary set'); return; }
        const target = findNearest(shs, pt, bIds);
        if (!target) { setStatus('Tap the segment to remove'); return; }
        const result = trimShape(target, bounds, pt);
        if (!result) { setStatus('No intersection found'); return; }
        const ns = result.segments.length === 0
          ? shs.filter(sh => sh.id !== target.id)
          : shs.map(sh => sh.id === target.id ? result : sh);
        commit(ns);
        setStatus('Trimmed ✓');
      }
    }
  }, [setDS, commit]);

  // Double-tap to stop line chain
  const onDoubleTap = useCallback(() => {
    if (toolRef.current === TOOLS.LINE) {
      drawRef.current = null; setDrawState(null);
      setStatus('Line chain finished');
    }
  }, []);

  // ─── GESTURE: single Tap gesture only ────────────────────────────────────
  // We detect double-tap ourselves via timestamp diff to avoid Exclusive eating taps.
  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd((e) => {
      'worklet';
      const now = Date.now();
      const last = lastTapRef.current;
      lastTapRef.current = now;
      if (now - last < 350) {
        runOnJS(onDoubleTap)();
      } else {
        runOnJS(onTap)(e.x, e.y);
      }
    });

  // ─── Touch move for cursor tracking (no gesture, just View onTouchMove) ──
  const onTouchMove = useCallback((e) => {
    const touch = e.nativeEvent.touches[0];
    if (!touch) return;
    const pt = snapPt(touch.locationX, touch.locationY, snapRef.current);
    setCursor(pt);
  }, []);

  const onTouchStart = useCallback((e) => {
    const touch = e.nativeEvent.touches[0];
    if (!touch) return;
    const pt = snapPt(touch.locationX, touch.locationY, snapRef.current);
    setCursor(pt);
  }, []);

  // ─── Preview path ──────────────────────────────────────────────────────────
  const previewPath = (() => {
    const ds = drawState;
    if (!ds) return null;
    const pt = cursor;
    if (ds.tool === TOOLS.LINE && ds.p1)
      return `M${ds.p1.x} ${ds.p1.y} L${pt.x} ${pt.y}`;
    if (ds.tool === TOOLS.RECT && ds.p1) {
      const x = Math.min(ds.p1.x, pt.x), y = Math.min(ds.p1.y, pt.y);
      const w = Math.abs(pt.x - ds.p1.x), h = Math.abs(pt.y - ds.p1.y);
      if (w < 1 || h < 1) return null;
      return `M${x} ${y} h${w} v${h} h${-w} Z`;
    }
    if (ds.tool === TOOLS.CIRCLE && ds.center) {
      const r = Math.max(1, dist(ds.center, pt));
      return `M${ds.center.x + r} ${ds.center.y} A${r} ${r} 0 1 1 ${ds.center.x - r} ${ds.center.y} A${r} ${r} 0 1 1 ${ds.center.x + r} ${ds.center.y}`;
    }
    if (ds.tool === TOOLS.ARC) {
      if (ds.phase === 1) {
        const r = Math.max(1, dist(ds.center, pt));
        return `M${ds.center.x + r} ${ds.center.y} A${r} ${r} 0 1 1 ${ds.center.x - r} ${ds.center.y} A${r} ${r} 0 1 1 ${ds.center.x + r} ${ds.center.y}`;
      }
      if (ds.phase === 2 && ds.r > 0) {
        const ea = Math.atan2(pt.y - ds.center.y, pt.x - ds.center.x);
        return segToPath({ type: 'arc', cx: ds.center.x, cy: ds.center.y, r: ds.r, startAngle: ds.startAngle, endAngle: ea });
      }
    }
    return null;
  })();

  // ─── Grid ──────────────────────────────────────────────────────────────────
  const gridMinorPath = (() => {
    if (!gridOn) return '';
    const l = [];
    for (let x = 0; x <= W; x += GRID) l.push(`M${x} 0 L${x} ${CANVAS_H}`);
    for (let y = 0; y <= CANVAS_H; y += GRID) l.push(`M0 ${y} L${W} ${y}`);
    return l.join(' ');
  })();
  const gridMajorPath = (() => {
    if (!gridOn) return '';
    const l = [];
    for (let x = 0; x <= W; x += GRID * 5) l.push(`M${x} 0 L${x} ${CANVAS_H}`);
    for (let y = 0; y <= CANVAS_H; y += GRID * 5) l.push(`M0 ${y} L${W} ${y}`);
    return l.join(' ');
  })();

  // ─── Trim-specific UI ─────────────────────────────────────────────────────
  const showTrimBar = tool === TOOLS.TRIM;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor="#090b11" />

      {/* TOP TOOLBAR */}
      <View style={[S.toolbar, { marginTop: SAFE_TOP }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.toolbarContent} bounces={false}>

          {/* Tool buttons */}
          {TOOL_DEFS.map(td => {
            const active = tool === td.id;
            return (
              <TouchableOpacity key={td.id} onPress={() => changeTool(td.id)} activeOpacity={0.7} style={[S.toolBtn, active && S.toolBtnActive]}>
                <Text style={[S.toolIcon, active && S.toolIconActive]}>{td.icon}</Text>
                <Text style={[S.toolLbl,  active && S.toolLblActive]}>{td.label}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={S.sep} />

          {/* Trim controls */}
          {showTrimBar && (
            trimStage === TRIM_STAGE.BOUNDARY ? (
              <TouchableOpacity onPress={confirmBoundary} activeOpacity={0.7}
                style={[S.actionBtn, boundaryIds.size > 0 ? S.btnConfirm : S.btnDisabled]}>
                <Text style={[S.actionTxt, { color: boundaryIds.size > 0 ? '#000' : '#555' }]}>
                  ✓ Confirm ({boundaryIds.size})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={resetTrim} activeOpacity={0.7} style={[S.actionBtn, S.btnReset]}>
                <Text style={[S.actionTxt, { color: '#ff7070' }]}>↩ New Boundary</Text>
              </TouchableOpacity>
            )
          )}

          {showTrimBar && <View style={S.sep} />}

          {/* Undo / Redo */}
          {[['↩', undo, 'Undo'], ['↪', redo, 'Redo']].map(([ico, fn, lbl]) => (
            <TouchableOpacity key={lbl} onPress={fn} style={S.toolBtn} activeOpacity={0.7}>
              <Text style={S.toolIcon}>{ico}</Text>
              <Text style={S.toolLbl}>{lbl}</Text>
            </TouchableOpacity>
          ))}

          <View style={S.sep} />

          {/* Grid / Snap */}
          {[
            ['⊞', 'Grid', gridOn, () => setGridOn(g => !g)],
            ['⊙', 'Snap', snapOn, () => { const nv = !snapOn; snapRef.current = nv; setSnapOn(nv); }],
          ].map(([ico, lbl, on, fn]) => (
            <TouchableOpacity key={lbl} onPress={fn} activeOpacity={0.7} style={[S.toolBtn, on && S.toolBtnGreen]}>
              <Text style={[S.toolIcon, on && { color: '#00ff88' }]}>{ico}</Text>
              <Text style={[S.toolLbl, on && { color: '#00ff88' }]}>{lbl}</Text>
            </TouchableOpacity>
          ))}

          <View style={S.sep} />

          {/* Color swatches */}
          <View style={S.swatchRow}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} onPress={() => { colorRef.current = c; setColor(c); }} activeOpacity={0.8}
                style={[S.swatch, { backgroundColor: c }, color === c && S.swatchActive]}>
                {color === c && <View style={S.swatchDot} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={S.sep} />

          {/* Clear */}
          <TouchableOpacity onPress={() => { commit([]); setDS(null); setSelectedIds(new Set()); resetTrim(); setStatus('Cleared'); }} style={S.toolBtn} activeOpacity={0.7}>
            <Text style={S.toolIcon}>🗑</Text>
            <Text style={S.toolLbl}>Clear</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* TRIM STAGE BANNER */}
      {showTrimBar && (
        <View style={[S.stageBanner, trimStage === TRIM_STAGE.TRIM && S.stageBannerTrim]}>
          <View style={[S.stageDot, trimStage === TRIM_STAGE.TRIM && { backgroundColor: '#00d4ff' }]} />
          <Text style={[S.stageTxt, trimStage === TRIM_STAGE.TRIM && { color: '#00d4ff' }]}>
            {trimStage === TRIM_STAGE.BOUNDARY
              ? `STEP 1 — SELECT BOUNDARY  (${boundaryIds.size} selected)`
              : 'STEP 2 — TAP SEGMENT TO TRIM AWAY'}
          </Text>
        </View>
      )}

      {/* CANVAS */}
      <GestureDetector gesture={tapGesture}>
        <View
          style={{ width: W, height: CANVAS_H, backgroundColor: '#090b11' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          <Canvas style={{ flex: 1 }}>

            {/* Grid */}
            {gridOn && gridMinorPath ? <Path path={gridMinorPath} color="rgba(255,255,255,0.03)" style="stroke" strokeWidth={0.5} /> : null}
            {gridOn && gridMajorPath ? <Path path={gridMajorPath} color="rgba(255,255,255,0.07)" style="stroke" strokeWidth={0.8} /> : null}

            {/* Shapes */}
            {shapes.map(shape => {
              const p = shapeToPath(shape);
              if (!p) return null;
              const isBound = boundaryIds.has(shape.id);
              const isSel   = selectedIds.has(shape.id);
              const col     = shape.color || '#fff';
              return (
                <Group key={shape.id}>
                  {(isBound || isSel) && (
                    <Path path={p} color={isBound ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.1)'} style="stroke" strokeWidth={18} />
                  )}
                  <Path
                    path={p}
                    color={isBound ? '#FFD700' : col}
                    style="stroke"
                    strokeWidth={isBound || isSel ? 2.5 : 2}
                  />
                  {isBound && (
                    <Path path={p} color="rgba(255,215,0,0.6)" style="stroke" strokeWidth={1}>
                      <DashPathEffect intervals={[8, 5]} />
                    </Path>
                  )}
                </Group>
              );
            })}

            {/* Rubber-band preview */}
            {previewPath ? (
              <Path path={previewPath} color={color} style="stroke" strokeWidth={1.5}>
                <DashPathEffect intervals={[6, 4]} />
              </Path>
            ) : null}

            {/* Anchor dots */}
            {drawState?.p1      ? <Circle cx={drawState.p1.x}      cy={drawState.p1.y}      r={5} color="#00d4ff" opacity={0.9} /> : null}
            {drawState?.center  ? <Circle cx={drawState.center.x}   cy={drawState.center.y}   r={5} color="#FFD700" opacity={0.9} /> : null}
            {drawState?.startPt ? <Circle cx={drawState.startPt.x}  cy={drawState.startPt.y}  r={4} color="#FFD700" opacity={0.8} /> : null}

            {/* Crosshair */}
            <Path
              path={`M${cursor.x - 18} ${cursor.y} L${cursor.x + 18} ${cursor.y} M${cursor.x} ${cursor.y - 18} L${cursor.x} ${cursor.y + 18}`}
              color="rgba(0,212,255,0.4)"
              style="stroke"
              strokeWidth={1}
            />
            <Circle cx={cursor.x} cy={cursor.y} r={2.5} color="rgba(0,212,255,0.65)" />

          </Canvas>
        </View>
      </GestureDetector>

      {/* STATUS BAR */}
      <View style={S.statusBar}>
        <Text style={S.statusTool}>{TOOL_DEFS.find(t => t.id === tool)?.label?.toUpperCase()}</Text>
        <View style={S.statusSep} />
        <Text style={S.statusMsg} numberOfLines={1}>{status}</Text>
        <Text style={S.statusCoord}>{Math.round(cursor.x)},{Math.round(cursor.y)}</Text>
        <View style={S.statusSep} />
        <Text style={S.statusCount}>{shapes.length} obj</Text>
      </View>

    </GestureHandlerRootView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090b11' },

  toolbar: {
    height: TOOLBAR_H,
    backgroundColor: '#12141e',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1f2e',
  },
  toolbarContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 3,
    height: TOOLBAR_H,
  },
  toolBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 52, height: 44, borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.4)',
  },
  toolBtnGreen: {
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)',
  },
  toolIcon:       { fontSize: 18, color: '#525a75', lineHeight: 21 },
  toolIconActive: { color: '#00d4ff' },
  toolLbl:        { fontSize: 8, color: '#303650', marginTop: 1, letterSpacing: 0.3 },
  toolLblActive:  { color: '#00d4ff' },

  sep: { width: 1, height: 30, backgroundColor: '#1c1f2e', marginHorizontal: 4 },

  actionBtn:  { height: 34, paddingHorizontal: 12, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  btnConfirm: { backgroundColor: '#00d4ff' },
  btnDisabled:{ backgroundColor: '#1c1f2e' },
  btnReset:   { backgroundColor: 'rgba(255,60,60,0.15)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.35)' },
  actionTxt:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

  swatchRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  swatch:      { width: 20, height: 20, borderRadius: 10 },
  swatchActive:{ transform: [{ scale: 1.25 }], borderWidth: 2.5, borderColor: '#fff' },
  swatchDot:   { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#000', top: '50%', left: '50%', marginLeft: -2.5, marginTop: -2.5 },

  stageBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, height: STAGE_H,
    backgroundColor: '#0e1018',
    borderBottomWidth: 1, borderBottomColor: '#1a1e2e',
  },
  stageBannerTrim: { backgroundColor: '#0c1a28', borderBottomColor: '#1a4060' },
  stageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD700' },
  stageTxt: { color: '#FFD700', fontSize: 9.5, fontWeight: '700', letterSpacing: 1 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0c0e18',
    borderTopWidth: 1, borderTopColor: '#1c1f2e',
    height: STATUS_H, paddingHorizontal: 12, gap: 8,
  },
  statusTool:  { color: '#00d4ff', fontSize: 8.5, fontWeight: '800', letterSpacing: 1.5, minWidth: 46 },
  statusSep:   { width: 1, height: 14, backgroundColor: '#1c1f2e' },
  statusMsg:   { flex: 1, color: '#3a4060', fontSize: 9.5, letterSpacing: 0.3 },
  statusCoord: { color: '#232840', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusCount: { color: '#232840', fontSize: 9, minWidth: 30, textAlign: 'right' },
});