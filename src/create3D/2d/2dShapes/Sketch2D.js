import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
  useWindowDimensions, Animated, PanResponder, Modal,
  Pressable, FlatList, Switch,
} from "react-native";
import {
  Canvas, Path, Circle, Group, Skia, Line, RoundedRect, rect, rrect, Paint,
  LinearGradient, vec, DashPathEffect, DiscretePathEffect,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue, useDerivedValue, runOnJS,
  withSpring, withTiming, interpolate, useAnimatedStyle,
} from "react-native-reanimated";

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Professional CAD/CAM Theme
// ═══════════════════════════════════════════════════════════════
//this is font
const DS = {
  fontMono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  fontSans: Platform.select({ ios: "SF Pro Display", android: "sans-serif-medium", default: "sans-serif" }),
  sp1: 4, sp2: 8, sp3: 12, sp4: 16, sp5: 20, sp6: 24,
  r1: 3, r2: 5, r3: 8, r4: 12,
  fast: 120, med: 220, slow: 380,
};
//this is themes
const THEMES = {
  dark: {
    id: "dark",
    bg: "#080B10",
    canvasBg: "#060810",
    surface: "#0E1118",
    surface2: "#141820",
    surface3: "#1A2030",
    border: "#1E2840",
    borderLight: "#283348",
    borderActive: "#3A8FD8",
    gridDot: "rgba(40,180,255,0.12)",
    gridMinor: "rgba(40,180,255,0.04)",
    gridMajor: "rgba(40,180,255,0.10)",
    gridAxis: "rgba(40,180,255,0.24)",
    shapePrimary: "#2AA8F2",
    shapeSelected: "#F7C948",
    shapeDim: "#E8623A",
    shapeEdit: "#FF7A45",
    shapeGhost: "rgba(247,201,72,0.22)",
    shapeHover: "rgba(42,168,242,0.15)",
    snapColor: "#00E5A0",
    coincColor: "#FF9500",
    autoClose: "#00E5A0",
    kpColor: "#F7C948",
    kpFill: "rgba(247,201,72,0.12)",
    text: "#B8C8E0",
    textMid: "#6B7A96",
    textDim: "#3A4860",
    textBright: "#E8F0FF",
    textAccent: "#2AA8F2",
    toolbar: "#0E1118",
    toolbarBorder: "#1A2030",
    panelBg: "rgba(10,13,22,0.97)",
    panelBorder: "#1A2030",
    menuBar: "#080B10",
    menuBarBorder: "#141820",
    active: "#2AA8F2",
    activeGlow: "rgba(42,168,242,0.20)",
    activeBg: "rgba(42,168,242,0.12)",
    warning: "#F7C948",
    warningBg: "rgba(247,201,72,0.12)",
    danger: "#F04040",
    dangerBg: "rgba(240,64,64,0.12)",
    success: "#00E5A0",
    successBg: "rgba(0,229,160,0.12)",
    editAccent: "#FF7A45",
    editBg: "rgba(255,122,69,0.12)",
    inputBg: "#060810",
    inputBorder: "#1E2840",
    inputText: "#E8F0FF",
    badge: "#141820",
    overlay: "rgba(0,0,0,0.7)",
    shadow: "#000",
    extrudeColor: "#A855F7",
    extrudeBg: "rgba(168,85,247,0.15)",
    extrudeBorder: "rgba(168,85,247,0.55)",
    extrudeGlow: "rgba(168,85,247,0.25)",
    arcColor: "#00E5A0",
    arcBg: "rgba(0,229,160,0.12)",
    arcBorder: "rgba(0,229,160,0.45)",
  },
  light: {
    id: "light",
    bg: "#F2F5FA",
    canvasBg: "#FAFBFE",
    surface: "#FFFFFF",
    surface2: "#F0F3F8",
    surface3: "#E8EDF5",
    border: "#D0D8E8",
    borderLight: "#DDE4F0",
    borderActive: "#1877C8",
    gridDot: "rgba(0,100,200,0.14)",
    gridMinor: "rgba(0,100,200,0.06)",
    gridMajor: "rgba(0,100,200,0.14)",
    gridAxis: "rgba(0,100,200,0.30)",
    shapePrimary: "#1877C8",
    shapeSelected: "#C4820A",
    shapeDim: "#CC3C10",
    shapeEdit: "#CC4A1A",
    shapeGhost: "rgba(196,130,10,0.22)",
    shapeHover: "rgba(24,119,200,0.10)",
    snapColor: "#007A50",
    coincColor: "#CC5500",
    autoClose: "#007A50",
    kpColor: "#C4820A",
    kpFill: "rgba(196,130,10,0.10)",
    text: "#2D3A50",
    textMid: "#7A8AAA",
    textDim: "#B0BCCC",
    textBright: "#111928",
    textAccent: "#1877C8",
    toolbar: "#FFFFFF",
    toolbarBorder: "#D0D8E8",
    panelBg: "rgba(250,251,254,0.98)",
    panelBorder: "#D0D8E8",
    menuBar: "#FFFFFF",
    menuBarBorder: "#D0D8E8",
    active: "#1877C8",
    activeGlow: "rgba(24,119,200,0.16)",
    activeBg: "rgba(24,119,200,0.10)",
    warning: "#C4820A",
    warningBg: "rgba(196,130,10,0.10)",
    danger: "#CC2020",
    dangerBg: "rgba(204,32,32,0.10)",
    success: "#007A50",
    successBg: "rgba(0,122,80,0.10)",
    editAccent: "#CC4A1A",
    editBg: "rgba(204,74,26,0.10)",
    inputBg: "#FFFFFF",
    inputBorder: "#C8D4E4",
    inputText: "#111928",
    badge: "#EEF2FA",
    overlay: "rgba(0,0,0,0.45)",
    shadow: "#000",
    extrudeColor: "#7C3AED",
    extrudeBg: "rgba(124,58,237,0.10)",
    extrudeBorder: "rgba(124,58,237,0.50)",
    extrudeGlow: "rgba(124,58,237,0.18)",
    arcColor: "#007A50",
    arcBg: "rgba(0,122,80,0.10)",
    arcBorder: "rgba(0,122,80,0.45)",
  },
};

let T = { ...THEMES.dark };

function applyTheme(isDark) {
  T = {
    ...T,
    ...(isDark ? THEMES.dark : THEMES.light)
  };
}


// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GRID_MINOR = 10;
const GRID_MAJOR = 50;
const SNAP_R = 18;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 16;
const ZOOM_STEP = 1.3;
const AUTO_CLOSE_R = 22;
const COINCIDENT_R = 6;
const DIM_OFFSET = 36;

const DEFAULT_LAYERS = [
  { id: "L0", name: "Construction", color: "#4A7FC8", visible: true, locked: false },
  { id: "L1", name: "Geometry", color: "#2AA8F2", visible: true, locked: false },
  { id: "L2", name: "Dimensions", color: "#F7C948", visible: true, locked: false },
  { id: "L3", name: "Annotations", color: "#00E5A0", visible: true, locked: false },
];

const TOOL_GROUPS = [
  {
    id: "select",
    label: "SELECT",
    tools: [
      { key: "SELECT", icon: "↖", label: "Select", shortcut: "S", desc: "Select & inspect shapes" },
      { key: "MOVE", icon: "✥", label: "Move", shortcut: "M", desc: "Move selected shape" },
    ],
  },
  {
    id: "primitives",
    label: "PRIMITIVES",
    tools: [
      { key: "LINE", icon: "╱", label: "Line", shortcut: "L", desc: "Draw a line segment" },
      { key: "RECTANGLE", icon: "▭", label: "Rectangle", shortcut: "R", desc: "Draw rectangle" },
      { key: "CIRCLE", icon: "○", label: "Circle", shortcut: "C", desc: "Draw circle by center+radius" },
      { key: "ELLIPSE", icon: "⬭", label: "Ellipse", shortcut: "E", desc: "Draw ellipse" },
      { key: "ARC", icon: "⌒", label: "Arc", shortcut: "A", desc: "3-point arc" },
    ],
  },
  {
    id: "advanced",
    label: "ADVANCED",
    tools: [
      { key: "POLYGON", icon: "⬡", label: "Polygon", shortcut: "P", desc: "Regular polygon" },
      { key: "TRIANGLE", icon: "△", label: "Triangle", shortcut: "T", desc: "Equilateral triangle" },
      { key: "STAR", icon: "★", label: "Star", shortcut: "K", desc: "Star polygon" },
      { key: "SLOT", icon: "⬬", label: "Slot", shortcut: "U", desc: "Rounded slot" },
    ],
  },
  {
    id: "curves",
    label: "CURVES",
    tools: [
      { key: "POLYLINE", icon: "⌇", label: "Polyline", shortcut: "Q", desc: "Multi-segment polyline" },
      { key: "SPLINE", icon: "∿", label: "Spline", shortcut: "B", desc: "Catmull-Rom spline" },
      { key: "FREEHAND", icon: "✏", label: "Freehand", shortcut: "F", desc: "Freehand sketch" },
      { key: "CLOUD", icon: "☁", label: "Cloud", shortcut: "D", desc: "Revision cloud" },
    ],
  },
  {
    id: "annotate",
    label: "ANNOTATE",
    tools: [
      { key: "DIMENSION", icon: "↔", label: "Dim", shortcut: "I", desc: "Linear dimension" },
      { key: "ERASER", icon: "✕", label: "Erase", shortcut: "X", desc: "Erase shape" },
    ],
  },
  {
    id: "edit",
    label: "EDIT",
    tools: [
      { key: "COPY", icon: "⿻", label: "Copy", shortcut: "O", desc: "Duplicate selected shape" },
      { key: "ROTATE", icon: "↻", label: "Rotate", shortcut: "V", desc: "Rotate around a point" },
      { key: "SCALE", icon: "⤢", label: "Scale", shortcut: "Z", desc: "Scale shape by factor" },
      { key: "MIRROR", icon: "⇔", label: "Mirror", shortcut: "W", desc: "Mirror across axis" },
      { key: "OFFSET", icon: "⊡", label: "Offset", shortcut: "N", desc: "Create parallel copy" },
      { key: "TRIM", icon: "✂", label: "Trim", shortcut: "J", desc: "Trim to boundary" },
      { key: "EXTEND", icon: "⇥", label: "Extend", shortcut: "G", desc: "Extend to boundary" },
      { key: "STRETCH", icon: "⤡", label: "Stretch", shortcut: "H", desc: "Stretch geometry" },
      { key: "FILLET", icon: "⌣", label: "Fillet", shortcut: "Y", desc: "Round corner" },
      { key: "CHAMFER", icon: "⌁", label: "Chamfer", shortcut: ";", desc: "Angled corner" },
    ],
  },
];

const ALL_TOOLS = TOOL_GROUPS.flatMap(g => g.tools);

// ═══════════════════════════════════════════════════════════════
// ARC MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

function arcFromBulge(p1, p2, bulge) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 0.001 || Math.abs(bulge) < 0.001) return null;
  const sagitta = bulge * chord / 2;
  const radius = (chord * chord / 4 + sagitta * sagitta) / (2 * sagitta);
  // midpoint of chord
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  // perpendicular unit vector
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const d = radius - sagitta;
  const cx = mx - nx * d, cy = my - ny * d;
  const startA = Math.atan2(p1.y - cy, p1.x - cx);
  const endA = Math.atan2(p2.y - cy, p2.x - cx);
  return { cx, cy, radius: Math.abs(radius), startA, endA, bulge };
}

/**
 * Compute arc from 3 points (start, mid/through, end) — for live preview.
 * Returns { cx, cy, radius, startA, endA, sweepDeg }
 */

function arcFrom3Points(p1, pm, p2) {
  const ax = p1.x, ay = p1.y;
  const bx = pm.x, by = pm.y;
  const cx2 = p2.x, cy2 = p2.y;
  const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
  if (Math.abs(D) < 1e-6) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / D;
  const r = Math.hypot(ax - ux, ay - uy);
  const startA = Math.atan2(ay - uy, ax - ux);
  const endA = Math.atan2(cy2 - uy, cx2 - ux);
  // determine sweep direction via midpoint
  const midA = Math.atan2(by - uy, bx - ux);
  // choose sweep so it passes through midA
  let sweep = endA - startA;
  // normalise
  const midRel = ((midA - startA) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const endRel = ((sweep) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  if (midRel > endRel) sweep = sweep - 2 * Math.PI;
  return { cx: ux, cy: uy, radius: r, startA, endA, sweepDeg: sweep * 180 / Math.PI };
}

/**
 * Build a Skia path for a single arc segment.
 * info = { cx, cy, radius, startA, sweepDeg }
 */
function mkArcSegPath(info) {
  const p = Skia.Path.Make();
  if (!info || info.radius <= 0) return p;
  const r = info.radius;
  p.addArc(
    { x: info.cx - r, y: info.cy - r, width: r * 2, height: r * 2 },
    info.startA * 180 / Math.PI,
    info.sweepDeg
  );
  return p;
}

// ═══════════════════════════════════════════════════════════════
// CLOSED GEOMETRY DETECTION
// ═══════════════════════════════════════════════════════════════

function isClosedGeometry(shape) {
  if (!shape) return false;
  switch (shape.type) {
    case "RECTANGLE":
      return !!(shape.w && shape.h && Math.abs(shape.w) > 0 && Math.abs(shape.h) > 0);
    case "CIRCLE":
      return !!(shape.radius && shape.radius > 0);
    case "ELLIPSE":
      return !!(shape.rx && shape.ry && shape.rx > 0 && shape.ry > 0);
    case "POLYGON":
    case "TRIANGLE":
      return !!(shape.radius && shape.radius > 0 && shape.center);
    case "STAR":
      return !!(shape.outerR && shape.outerR > 0 && shape.center);
    case "SLOT":
      return !!(shape.p1 && shape.p2 && shape.radius > 0);
    case "POLYLINE":
    case "SPLINE":
      return !!(shape.points && shape.points.length >= 3 && shape.closed === true);
    default:
      return false;
  }
}

function getShapeSummary(shape) {
  if (!shape) return "";
  switch (shape.type) {
    case "RECTANGLE": return `${Math.abs(shape.w).toFixed(1)} × ${Math.abs(shape.h).toFixed(1)} mm`;
    case "CIRCLE": return `⌀ ${(shape.radius * 2).toFixed(1)} mm`;
    case "ELLIPSE": return `${shape.rx.toFixed(1)} × ${shape.ry.toFixed(1)} mm`;
    case "POLYGON": return `${shape.sides}-sided, R ${shape.radius.toFixed(1)} mm`;
    case "TRIANGLE": return `R ${shape.radius.toFixed(1)} mm`;
    case "STAR": return `${shape.points || 5}-pt star, R ${shape.outerR.toFixed(1)} mm`;
    case "SLOT": return `Slot, R ${shape.radius.toFixed(1)} mm`;
    case "POLYLINE":
    case "SPLINE": return `${shape.points?.length || 0}-pt closed ${shape.type.toLowerCase()}`;
    default: return shape.type;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXTRUDE BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// EDIT OPERATION PANEL — floating HUD for editing params
// ═══════════════════════════════════════════════════════════════

function EditOpPanel({
  tool, shape,
  // rotate
  rotateAngle, setRotateAngle,
  // scale
  scaleFactorX, setScaleFactorX, scaleFactorY, setScaleFactorY,
  // mirror
  mirrorAxis, setMirrorAxis,
  // offset
  offsetDist, setOffsetDist,
  // fillet
  filletRadius, setFilletRadius,
  // chamfer
  chamferDist, setChamferDist,
  // callbacks
  onApply, onCancel,
  isDark,
}) {
  const EDIT_TOOLS = ["COPY", "ROTATE", "SCALE", "MIRROR", "OFFSET", "TRIM", "EXTEND", "STRETCH", "FILLET", "CHAMFER"];
  if (!EDIT_TOOLS.includes(tool) || !shape) return null;

  const bg = isDark ? "rgba(8,11,16,0.97)" : "rgba(250,251,254,0.98)";
  const bdr = isDark ? "#1A2030" : "#D0D8E8";
  const ttl = isDark ? "#E8F0FF" : "#111928";
  const sub = isDark ? "#6B7A96" : "#7A8AAA";
  const acc = isDark ? "#2AA8F2" : "#1877C8";
  const abg = isDark ? "rgba(42,168,242,0.12)" : "rgba(24,119,200,0.10)";
  const abd = isDark ? "rgba(42,168,242,0.45)" : "rgba(24,119,200,0.40)";
  const ibg = isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)";

  const InputRow = ({ label, value, onChange, unit = "mm" }) => (
    <View style={ep.row}>
      <Text style={[ep.label, { color: sub }]}>{label}</Text>
      <View style={[ep.inputWrap, { backgroundColor: ibg, borderColor: abd }]}>
        <TextInput
          style={[ep.input, { color: ttl }]}
          value={String(value)}
          onChangeText={v => { const n = parseFloat(v); if (!isNaN(n)) onChange(n); }}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          placeholderTextColor={sub}
        />
      </View>
      {unit ? <Text style={[ep.unit, { color: sub }]}>{unit}</Text> : null}
    </View>
  );

  const renderBody = () => {
    switch (tool) {
      case "COPY":
        return <Text style={[ep.hint, { color: sub }]}>Tap canvas to place copy at that position.</Text>;
      case "ROTATE":
        return (
          <>
            <InputRow label="Angle" value={rotateAngle} onChange={setRotateAngle} unit="°" />
            <Text style={[ep.hint, { color: sub }]}>Tap canvas to set rotation origin.</Text>
            {[0, 45, 90, 180, 270].map(a => (
              <TouchableOpacity key={a} style={[ep.presetBtn, { borderColor: bdr }, rotateAngle === a && { backgroundColor: abg, borderColor: abd }]} onPress={() => setRotateAngle(a)}>
                <Text style={[ep.presetText, { color: rotateAngle === a ? acc : sub }]}>{a}°</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      case "SCALE":
        return (
          <>
            <InputRow label="Scale X" value={scaleFactorX} onChange={setScaleFactorX} unit="×" />
            <InputRow label="Scale Y" value={scaleFactorY} onChange={setScaleFactorY} unit="×" />
            {[0.25, 0.5, 1, 2, 4].map(f => (
              <TouchableOpacity key={f} style={[ep.presetBtn, { borderColor: bdr }, scaleFactorX === f && { backgroundColor: abg, borderColor: abd }]} onPress={() => { setScaleFactorX(f); setScaleFactorY(f); }}>
                <Text style={[ep.presetText, { color: scaleFactorX === f ? acc : sub }]}>{f}×</Text>
              </TouchableOpacity>
            ))}
          </>
        );

      case "MIRROR":
        return (
          <>
            <Text style={[ep.sectionLabel, { color: sub }]}>AXIS</Text>
            {["vertical", "horizontal", "custom"].map(ax => (
              <TouchableOpacity key={ax} style={[ep.presetBtn, { borderColor: bdr }, mirrorAxis === ax && { backgroundColor: abg, borderColor: abd }]} onPress={() => setMirrorAxis(ax)}>
                <Text style={[ep.presetText, { color: mirrorAxis === ax ? acc : sub }]}>{ax.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            {mirrorAxis === "custom" && <Text style={[ep.hint, { color: sub }]}>Draw a mirror line on canvas.</Text>}
          </>
        );

      case "OFFSET":
        return <InputRow label="Distance" value={offsetDist} onChange={setOffsetDist} />;

      case "FILLET":
        return <InputRow label="Radius" value={filletRadius} onChange={setFilletRadius} />;

      case "CHAMFER":
        return <InputRow label="Distance" value={chamferDist} onChange={setChamferDist} />;

      case "TRIM":
        return <Text style={[ep.hint, { color: sub }]}>1. Tap boundary line. 2. Tap segment to remove.</Text>;

      case "EXTEND":
        return <Text style={[ep.hint, { color: sub }]}>1. Tap boundary line. 2. Tap line to extend.</Text>;

      case "STRETCH":
        return <Text style={[ep.hint, { color: sub }]}>Drag a selection window, then drag the result.</Text>;

      default: return null;
    }
  };

  const toolMeta = ALL_TOOLS.find(t => t.key === tool);

  return (
    <View style={[ep.panel, { backgroundColor: bg, borderColor: bdr }]}>
      <View style={[ep.header, { borderBottomColor: bdr }]}>
        <View style={[ep.accentBar, { backgroundColor: acc }]} />
        <Text style={[ep.title, { color: ttl }]}>{toolMeta?.icon} {tool}</Text>
        <TouchableOpacity onPress={onCancel} style={ep.closeBtn}>
          <Text style={{ color: sub, fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={ep.body}>
        <View style={ep.presetRow}>
          {renderBody()}
        </View>
      </View>
      <View style={[ep.actions, { borderTopColor: bdr }]}>
        <TouchableOpacity style={[ep.cancelBtn, { borderColor: bdr }]} onPress={onCancel}>
          <Text style={[ep.btnText, { color: sub }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ep.applyBtn, { backgroundColor: abg, borderColor: abd }]} onPress={onApply}>
          <Text style={[ep.btnText, { color: acc, fontWeight: "700" }]}>Apply ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ep = StyleSheet.create({
  panel: { position: "absolute", bottom: 70, left: 10, right: 10, borderRadius: 12, borderWidth: 1, overflow: "hidden", zIndex: 85, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 22 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  accentBar: { width: 4, height: 24, borderRadius: 2 },
  title: { flex: 1, fontSize: 12, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1 },
  closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  label: { fontSize: 9, fontFamily: DS.fontMono, width: 60 },
  inputWrap: { flex: 1, borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, height: 30, justifyContent: "center" },
  input: { fontSize: 12, fontFamily: DS.fontMono, padding: 0 },
  unit: { fontSize: 8, fontFamily: DS.fontMono, width: 20 },
  hint: { fontSize: 9, fontFamily: DS.fontMono, lineHeight: 14, marginBottom: 4 },
  sectionLabel: { fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 1.2, marginBottom: 6 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1 },
  presetText: { fontSize: 9, fontFamily: DS.fontMono, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 7, borderWidth: 1 },
  applyBtn: { flex: 2, alignItems: "center", paddingVertical: 10, borderRadius: 7, borderWidth: 1 },
  btnText: { fontSize: 12, fontFamily: DS.fontMono, fontWeight: "700" },
});

function ExtrudeButton({ shape, onExtrude, isDark }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shape) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shape?.id]);

  if (!shape || !isClosedGeometry(shape)) return null;

  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View
      style={[
        s.extrudeButtonWrap,
        {
          opacity: glowOpacity,
          transform: [{ scale }],
          shadowColor: isDark ? "#A855F7" : "#7C3AED",
        },
      ]}
    >
      <TouchableOpacity
        style={[
          s.extrudeButton,
          {
            backgroundColor: isDark ? "rgba(168,85,247,0.18)" : "rgba(124,58,237,0.12)",
            borderColor: isDark ? "rgba(168,85,247,0.65)" : "rgba(124,58,237,0.55)",
          },
        ]}
        onPress={() => onExtrude(shape)}
        activeOpacity={0.75}
      >
        <View style={s.extrudeIconRow}>
          <Text style={[s.extrudeIcon, { color: isDark ? "#A855F7" : "#7C3AED" }]}>⬆</Text>
          <View style={s.extrudeIconDivider} />
          <Text style={[s.extrudeCubeIcon, { color: isDark ? "#C084FC" : "#9333EA" }]}>◈</Text>
        </View>
        <Text style={[s.extrudeLabel, { color: isDark ? "#A855F7" : "#7C3AED" }]}>EXTRUDE</Text>
        <Text style={[s.extrudeSub, { color: isDark ? "#7C3AED" : "#9333EA" }]}>TO 3D</Text>
        <View style={[s.extrudeShapeTag, { backgroundColor: isDark ? "rgba(168,85,247,0.10)" : "rgba(124,58,237,0.08)", borderColor: isDark ? "rgba(168,85,247,0.30)" : "rgba(124,58,237,0.25)" }]}>
          <Text style={[s.extrudeShapeType, { color: isDark ? "#C084FC" : "#9333EA" }]}>{shape.type}</Text>
        </View>
        <Text style={[s.extrudeShapeDims, { color: isDark ? "rgba(168,85,247,0.7)" : "rgba(124,58,237,0.65)" }]}>
          {getShapeSummary(shape)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXTRUDE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════

function ExtrudeModal({ shape, onConfirm, onCancel, isDark }) {
  const [extrudeDepth, setExtrudeDepth] = useState("20");
  const [extrudeMode, setExtrudeMode] = useState("solid");

  if (!shape) return null;

  const modes = [
    { key: "solid", icon: "◼", label: "Solid" },
    { key: "shell", icon: "◻", label: "Shell" },
    { key: "taper", icon: "◬", label: "Taper" },
  ];

  const bgColor = isDark ? "rgba(8,11,16,0.99)" : "rgba(250,251,254,0.99)";
  const borderClr = isDark ? "#1A2030" : "#D0D8E8";
  const titleClr = isDark ? "#E8F0FF" : "#111928";
  const subClr = isDark ? "#6B7A96" : "#7A8AAA";
  const inputBg = isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.9)";
  const inputBdr = isDark ? "rgba(168,85,247,0.45)" : "rgba(124,58,237,0.4)";
  const accentClr = isDark ? "#A855F7" : "#7C3AED";
  const accentBg = isDark ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.10)";
  const accentBdr = isDark ? "rgba(168,85,247,0.55)" : "rgba(124,58,237,0.45)";

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <Pressable style={s.extrudeModalBackdrop} onPress={onCancel}>
        <Pressable style={[s.extrudeModalCard, { backgroundColor: bgColor, borderColor: borderClr }]} onPress={() => { }}>
          <View style={[s.extrudeModalHeader, { borderBottomColor: borderClr }]}>
            <View style={s.extrudeModalHeaderLeft}>
              <View style={[s.extrudeModalAccentBar, { backgroundColor: accentClr }]} />
              <View>
                <Text style={[s.extrudeModalTitle, { color: titleClr }]}>Extrude to 3D</Text>
                <Text style={[s.extrudeModalSub, { color: subClr }]}>{shape.type} · {getShapeSummary(shape)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={s.extrudeModalClose}>
              <Text style={{ color: subClr, fontSize: 16, lineHeight: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.extrudeSection, { borderBottomColor: borderClr }]}>
            <Text style={[s.extrudeSectionLabel, { color: subClr }]}>EXTRUDE MODE</Text>
            <View style={s.extrudeModeRow}>
              {modes.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    s.extrudeModeBtn,
                    { borderColor: borderClr },
                    extrudeMode === m.key && { backgroundColor: accentBg, borderColor: accentBdr },
                  ]}
                  onPress={() => setExtrudeMode(m.key)}
                >
                  <Text style={[s.extrudeModeBtnIcon, { color: extrudeMode === m.key ? accentClr : subClr }]}>{m.icon}</Text>
                  <Text style={[s.extrudeModeBtnText, { color: extrudeMode === m.key ? accentClr : subClr }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[s.extrudeSection, { borderBottomColor: borderClr }]}>
            <Text style={[s.extrudeSectionLabel, { color: subClr }]}>EXTRUDE DEPTH</Text>
            <View style={s.extrudeDepthRow}>
              <View style={[s.extrudeDepthInput, { backgroundColor: inputBg, borderColor: inputBdr }]}>
                <TextInput
                  style={[s.extrudeDepthText, { color: titleClr }]}
                  value={extrudeDepth}
                  onChangeText={setExtrudeDepth}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  returnKeyType="done"
                  placeholderTextColor={subClr}
                />
              </View>
              <Text style={[s.extrudeDepthUnit, { color: subClr }]}>mm</Text>
              {["5", "10", "20", "50"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    s.extrudePresetBtn,
                    { borderColor: borderClr },
                    extrudeDepth === v && { backgroundColor: accentBg, borderColor: accentBdr },
                  ]}
                  onPress={() => setExtrudeDepth(v)}
                >
                  <Text style={[s.extrudePresetText, { color: extrudeDepth === v ? accentClr : subClr }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[s.extrudeSection, { borderBottomColor: borderClr }]}>
            <Text style={[s.extrudeSectionLabel, { color: subClr }]}>SHAPE DATA PREVIEW</Text>
            <View style={[s.extrudeDataPreview, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.04)", borderColor: borderClr }]}>
              <Text style={[s.extrudeDataText, { color: isDark ? "#3A4860" : "#B0BCCC" }]} numberOfLines={4}>
                {JSON.stringify({ type: shape.type, ...getShapePayload(shape), extrudeDepth: parseFloat(extrudeDepth) || 20, mode: extrudeMode }, null, 2)}
              </Text>
            </View>
          </View>
          <View style={s.extrudeModalActions}>
            <TouchableOpacity
              style={[s.extrudeActionBtn, s.extrudeCancelBtn, { borderColor: borderClr }]}
              onPress={onCancel}
            >
              <Text style={[s.extrudeActionText, { color: subClr }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.extrudeActionBtn, s.extrudeConfirmBtn, { backgroundColor: accentBg, borderColor: accentBdr }]}
              onPress={() => onConfirm(shape, parseFloat(extrudeDepth) || 20, extrudeMode)}
            >
              <Text style={[s.extrudeActionText, { color: accentClr, fontWeight: "700" }]}>⬆ Send to 3D</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getShapePayload(shape) {
  switch (shape.type) {
    case "RECTANGLE":
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case "CIRCLE":
      return { center: shape.center, radius: shape.radius };
    case "ELLIPSE":
      return { center: shape.center, rx: shape.rx, ry: shape.ry };
    case "POLYGON":
      return { center: shape.center, radius: shape.radius, sides: shape.sides };
    case "TRIANGLE":
      return { center: shape.center, radius: shape.radius };
    case "STAR":
      return { center: shape.center, outerR: shape.outerR, innerR: shape.innerR, points: shape.points };
    case "SLOT":
      return { p1: shape.p1, p2: shape.p2, radius: shape.radius };
    case "POLYLINE":
    case "SPLINE":
      return { points: shape.points, closed: shape.closed };
    default:
      return {};
  }
}

// ═══════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const gSnap = (v, g) => Math.round(v / g) * g;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const deg2rad = d => d * Math.PI / 180;
const rad2deg = r => r * 180 / Math.PI;

function snapPoint(rx, ry, snapEnabled, kpFlat) {
  "worklet";
  if (snapEnabled) {
    for (let i = 0; i < kpFlat.length; i += 2) {
      const px = kpFlat[i], py = kpFlat[i + 1];
      if (Math.hypot(rx - px, ry - py) < SNAP_R) return { x: px, y: py, snapped: true };
    }
    return { x: Math.round(rx / GRID_MINOR) * GRID_MINOR, y: Math.round(ry / GRID_MINOR) * GRID_MINOR, snapped: false };
  }
  return { x: rx, y: ry, snapped: false };
}

function snapJS(rx, ry, shapes, snapEnabled) {
  if (snapEnabled) {
    for (const s of shapes) {
      for (const p of keyPoints(s)) {
        if (dist(p, { x: rx, y: ry }) < SNAP_R) return { ...p, snapped: true };
      }
    }
    return { x: gSnap(rx, GRID_MINOR), y: gSnap(ry, GRID_MINOR), snapped: false };
  }
  return { x: rx, y: ry, snapped: false };
}

function keyPoints(s) {
  switch (s.type) {
    case "LINE": return [s.p1, s.p2, mid(s.p1, s.p2)].filter(Boolean);
    case "RECTANGLE": {
      const { x, y, w, h } = s;
      return [
        { x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h },
        { x: x + w / 2, y }, { x: x + w / 2, y: y + h },
        { x, y: y + h / 2 }, { x: x + w, y: y + h / 2 },
        { x: x + w / 2, y: y + h / 2 },
      ];
    }
    case "CIRCLE": return [
      { ...s.center },
      { x: s.center.x + s.radius, y: s.center.y },
      { x: s.center.x - s.radius, y: s.center.y },
      { x: s.center.x, y: s.center.y + s.radius },
      { x: s.center.x, y: s.center.y - s.radius },
    ];
    case "ELLIPSE": return [
      { ...s.center },
      { x: s.center.x + s.rx, y: s.center.y },
      { x: s.center.x - s.rx, y: s.center.y },
      { x: s.center.x, y: s.center.y + s.ry },
      { x: s.center.x, y: s.center.y - s.ry },
    ];
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return s.points ?? [];
    case "ARC": return [s.center, s.p1, s.p2].filter(Boolean);
    case "POLYGON":
    case "TRIANGLE": return [s.center];
    case "STAR": return [s.center];
    case "SLOT": return [s.p1, s.p2, mid(s.p1, s.p2)].filter(Boolean);
    case "CLOUD": return [s.p1, s.p2].filter(Boolean);
    default: return [];
  }
}

function terminalPoints(s) {
  switch (s.type) {
    case "LINE": return [s.p1, s.p2].filter(Boolean);
    case "RECTANGLE": { const { x, y, w, h } = s; return [{ x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h }]; }
    case "CIRCLE": return [{ ...s.center }];
    case "POLYLINE": return s.points?.length ? [s.points[0], s.points[s.points.length - 1]] : [];
    case "ARC": return [s.p1, s.p2].filter(Boolean);
    default: return [];
  }
}

function findNearestTerminal(x, y, shapes, excludeId, radius) {
  let best = null, bestD = radius;
  for (const s of shapes) {
    if (s.id === excludeId) continue;
    for (const p of terminalPoints(s)) {
      const d = dist(p, { x, y });
      if (d < bestD) { bestD = d; best = { ...p, shapeId: s.id, d: bestD }; }
    }
  }
  return best;
}

function findCoincidentPairs(shapes) {
  const pairs = [];
  for (let i = 0; i < shapes.length; i++) {
    const tpI = terminalPoints(shapes[i]);
    for (let j = i + 1; j < shapes.length; j++) {
      const tpJ = terminalPoints(shapes[j]);
      for (const pi of tpI) for (const pj of tpJ)
        if (Math.hypot(pi.x - pj.x, pi.y - pj.y) < COINCIDENT_R)
          pairs.push({ x: (pi.x + pj.x) / 2, y: (pi.y + pj.y) / 2 });
    }
  }
  return pairs;
}

function translateShape(s, dx, dy) {
  "worklet";
  switch (s.type) {
    case "LINE":
    case "SLOT":
    case "CLOUD": return { ...s, p1: { x: s.p1.x + dx, y: s.p1.y + dy }, p2: { x: s.p2.x + dx, y: s.p2.y + dy } };
    case "RECTANGLE": return { ...s, x: s.x + dx, y: s.y + dy };
    case "CIRCLE":
    case "ELLIPSE":
    case "POLYGON":
    case "TRIANGLE":
    case "STAR": return { ...s, center: { x: s.center.x + dx, y: s.center.y + dy } };
    case "ARC": return { ...s, center: { x: s.center.x + dx, y: s.center.y + dy }, p1: { x: s.p1.x + dx, y: s.p1.y + dy }, p2: { x: s.p2.x + dx, y: s.p2.y + dy } };
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return { ...s, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
    case "DIMENSION": return { ...s, p1: { x: s.p1.x + dx, y: s.p1.y + dy }, p2: { x: s.p2.x + dx, y: s.p2.y + dy } };
    default: return s;
  }
}

function moveConnectedEndpoint(shapes, shapeId, endpointKey, dx, dy) {
  const shape = shapes.find(s => s.id === shapeId);
  if (!shape || shape.type !== "LINE") return shapes;
  const movedPt = shape[endpointKey];
  const newPt = { x: movedPt.x + dx, y: movedPt.y + dy };
  return shapes.map(s => {
    if (s.id === shapeId) return { ...s, [endpointKey]: newPt };
    if (s.type === "LINE") {
      if (dist(s.p1, movedPt) < COINCIDENT_R) return { ...s, p1: newPt };
      if (dist(s.p2, movedPt) < COINCIDENT_R) return { ...s, p2: newPt };
    }
    return s;
  });
}

function findNearestEndpoint(shape, pt, tol = 22) {
  if (shape.type !== "LINE" && shape.type !== "SLOT") return null;
  const d1 = dist(shape.p1, pt), d2 = dist(shape.p2, pt);
  if (d1 < tol && d1 < d2) return "p1";
  if (d2 < tol) return "p2";
  return null;
}

function flatKP(shapes) {
  const out = [];
  for (const s of shapes) for (const p of keyPoints(s)) out.push(p.x, p.y);
  return out;
}

// ═══════════════════════════════════════════════════════════════
// EDIT OPERATION MATH
// ═══════════════════════════════════════════════════════════════

/** Rotate a point around an origin by angle (radians) */
function rotatePoint(pt, origin, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = pt.x - origin.x, dy = pt.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Rotate a shape around an origin by angle (radians) */
function rotateShape(shape, origin, angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  const rp = pt => rotatePoint(pt, origin, angle);
  switch (shape.type) {
    case "LINE":
    case "CLOUD":
    case "SLOT": return { ...shape, p1: rp(shape.p1), p2: rp(shape.p2) };
    case "RECTANGLE": {
      const corners = [
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.w, y: shape.y + shape.h },
      ].map(rp);
      // Convert to POLYGON since rotated rectangles aren't axis-aligned
      const allC = [
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.w, y: shape.y },
        { x: shape.x + shape.w, y: shape.y + shape.h },
        { x: shape.x, y: shape.y + shape.h },
      ].map(rp);
      return { ...shape, type: "POLYLINE", points: allC, closed: true };
    }
    case "CIRCLE":
    case "ELLIPSE":
    case "POLYGON":
    case "TRIANGLE":
    case "STAR": return { ...shape, center: rp(shape.center) };
    case "ARC": return { ...shape, center: rp(shape.center), p1: rp(shape.p1), p2: rp(shape.p2) };
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return { ...shape, points: shape.points.map(rp) };
    case "DIMENSION": return { ...shape, p1: rp(shape.p1), p2: rp(shape.p2) };
    default: return shape;
  }
}

/** Scale a shape around an origin by factors */
function scaleShape(shape, origin, sx, sy) {
  const sp = pt => ({
    x: origin.x + (pt.x - origin.x) * sx,
    y: origin.y + (pt.y - origin.y) * sy,
  });
  switch (shape.type) {
    case "LINE":
    case "CLOUD": return { ...shape, p1: sp(shape.p1), p2: sp(shape.p2) };
    case "RECTANGLE": {
      const tl = sp({ x: shape.x, y: shape.y });
      const br = sp({ x: shape.x + shape.w, y: shape.y + shape.h });
      return { ...shape, x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    }
    case "CIRCLE": return { ...shape, center: sp(shape.center), radius: shape.radius * Math.abs(sx) };
    case "ELLIPSE": return { ...shape, center: sp(shape.center), rx: shape.rx * Math.abs(sx), ry: shape.ry * Math.abs(sy) };
    case "POLYGON":
    case "TRIANGLE": return { ...shape, center: sp(shape.center), radius: shape.radius * Math.abs(sx) };
    case "STAR": return { ...shape, center: sp(shape.center), outerR: shape.outerR * Math.abs(sx), innerR: shape.innerR * Math.abs(sx) };
    case "SLOT": return { ...shape, p1: sp(shape.p1), p2: sp(shape.p2), radius: shape.radius * Math.abs(sx) };
    case "ARC": return { ...shape, center: sp(shape.center), p1: sp(shape.p1), p2: sp(shape.p2) };
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return { ...shape, points: shape.points.map(sp) };
    default: return shape;
  }
}

/** Mirror a shape across a line defined by p1→p2 */
function mirrorShape(shape, p1, p2) {
  const mp = pt => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) return pt;
    const t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / len2;
    const fx = p1.x + t * dx, fy = p1.y + t * dy;
    return { x: 2 * fx - pt.x, y: 2 * fy - pt.y };
  };
  switch (shape.type) {
    case "LINE":
    case "CLOUD": return { ...shape, p1: mp(shape.p1), p2: mp(shape.p2) };
    case "RECTANGLE": {
      const pts = [
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.w, y: shape.y },
        { x: shape.x + shape.w, y: shape.y + shape.h },
        { x: shape.x, y: shape.y + shape.h },
      ].map(mp);
      return { ...shape, type: "POLYLINE", points: pts, closed: true };
    }
    case "CIRCLE":
    case "ELLIPSE":
    case "POLYGON":
    case "TRIANGLE":
    case "STAR": return { ...shape, center: mp(shape.center) };
    case "SLOT": return { ...shape, p1: mp(shape.p1), p2: mp(shape.p2) };
    case "ARC": return { ...shape, center: mp(shape.center), p1: mp(shape.p1), p2: mp(shape.p2) };
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return { ...shape, points: shape.points.map(mp) };
    default: return shape;
  }
}

/** Offset a shape outward by `d` units */
function offsetShape(shape, d) {
  switch (shape.type) {
    case "CIRCLE": return { ...shape, radius: Math.max(0.5, shape.radius + d) };
    case "ELLIPSE": return { ...shape, rx: Math.max(0.5, shape.rx + d), ry: Math.max(0.5, shape.ry + d) };
    case "RECTANGLE": return { ...shape, x: shape.x - d, y: shape.y - d, w: shape.w + d * 2, h: shape.h + d * 2 };
    case "LINE": {
      const ang = Math.atan2(shape.p2.y - shape.p1.y, shape.p2.x - shape.p1.x);
      const nx = -Math.sin(ang) * d, ny = Math.cos(ang) * d;
      return { ...shape, p1: { x: shape.p1.x + nx, y: shape.p1.y + ny }, p2: { x: shape.p2.x + nx, y: shape.p2.y + ny } };
    }
    case "POLYGON":
    case "TRIANGLE": return { ...shape, radius: Math.max(0.5, shape.radius + d) };
    default: return shape;
  }
}

/**
 * Get the shape's bounding center for rotate/scale origin default
 */
function shapeCentroid(shape) {
  switch (shape.type) {
    case "LINE": return mid(shape.p1, shape.p2);
    case "RECTANGLE": return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
    case "CIRCLE":
    case "ELLIPSE":
    case "POLYGON":
    case "TRIANGLE":
    case "STAR": return { ...shape.center };
    case "SLOT": return mid(shape.p1, shape.p2);
    case "ARC": return { ...shape.center };
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": {
      if (!shape.points?.length) return { x: 0, y: 0 };
      const sum = shape.points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
      return { x: sum.x / shape.points.length, y: sum.y / shape.points.length };
    }
    default: return { x: 0, y: 0 };
  }
}

/**
 * Find intersection of two infinite lines (p1-p2) and (p3-p4).
 * Returns null if parallel.
 */
function lineIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-9) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y, t };
}

/**
 * Fillet: round the corner between two LINE shapes.
 * Returns { arc, line1, line2 } — the two trimmed lines + fillet arc shape.
 */
function computeFillet(lineA, lineB, radius) {
  if (lineA.type !== "LINE" || lineB.type !== "LINE") return null;
  const ix = lineIntersect(lineA.p1, lineA.p2, lineB.p1, lineB.p2);
  if (!ix) return null;

  const len1 = dist(lineA.p1, lineA.p2);
  const len2 = dist(lineB.p1, lineB.p2);
  if (len1 < 1e-4 || len2 < 1e-4) return null;

  // Unit vectors away from intersection
  const u1x = (lineA.p1.x - ix.x) / len1 + (lineA.p2.x - ix.x) / len1;
  const u1y = (lineA.p1.y - ix.y) / len1 + (lineA.p2.y - ix.y) / len1;

  const ang1 = Math.atan2(lineA.p2.y - lineA.p1.y, lineA.p2.x - lineA.p1.x);
  const ang2 = Math.atan2(lineB.p2.y - lineB.p1.y, lineB.p2.x - lineB.p1.x);

  // Bisector angle
  const bisAng = (ang1 + ang2) / 2;
  const halfAng = Math.abs(ang2 - ang1) / 2;
  if (Math.abs(Math.sin(halfAng)) < 1e-6) return null;

  const tanLen = radius / Math.tan(halfAng);
  const centerDist = radius / Math.sin(halfAng);

  // Tangent points on each line
  const t1 = { x: ix.x + Math.cos(ang1) * tanLen, y: ix.y + Math.sin(ang1) * tanLen };
  const t2 = { x: ix.x + Math.cos(ang2) * tanLen, y: ix.y + Math.sin(ang2) * tanLen };

  // Arc center
  const arcCenter = {
    x: ix.x + Math.cos(bisAng + Math.PI / 2) * centerDist,
    y: ix.y + Math.sin(bisAng + Math.PI / 2) * centerDist,
  };

  const arc = { type: "ARC", center: arcCenter, p1: t1, p2: t2 };

  // Trimmed lines: find which endpoint of each line is near the intersection
  const trimLine = (line, tangentPt) => {
    const d1 = dist(line.p1, { x: ix.x, y: ix.y });
    const d2 = dist(line.p2, { x: ix.x, y: ix.y });
    if (d1 < d2) return { ...line, p1: tangentPt };
    return { ...line, p2: tangentPt };
  };

  return {
    arc,
    line1: trimLine(lineA, t1),
    line2: trimLine(lineB, t2),
  };
}

/**
 * Chamfer: cut corner between two LINE shapes.
 * Returns { line1, line2, chamferLine }.
 */
function computeChamfer(lineA, lineB, dist1, dist2 = null) {
  if (lineA.type !== "LINE" || lineB.type !== "LINE") return null;
  const d2 = dist2 ?? dist1;
  const ix = lineIntersect(lineA.p1, lineA.p2, lineB.p1, lineB.p2);
  if (!ix) return null;

  const ang1 = Math.atan2(lineA.p2.y - lineA.p1.y, lineA.p2.x - lineA.p1.x);
  const ang2 = Math.atan2(lineB.p2.y - lineB.p1.y, lineB.p2.x - lineB.p1.x);

  const c1 = { x: ix.x + Math.cos(ang1) * dist1, y: ix.y + Math.sin(ang1) * dist1 };
  const c2 = { x: ix.x + Math.cos(ang2) * dist2, y: ix.y + Math.sin(ang2) * dist2 };

  const trimLine = (line, cutPt) => {
    const d1 = dist(line.p1, { x: ix.x, y: ix.y });
    const d2 = dist(line.p2, { x: ix.x, y: ix.y });
    if (d1 < d2) return { ...line, p1: cutPt };
    return { ...line, p2: cutPt };
  };

  return {
    line1: trimLine(lineA, c1),
    line2: trimLine(lineB, c2),
    chamferLine: { type: "LINE", p1: c1, p2: c2 },
  };
}

/**
 * Trim a LINE at the intersection with a boundary LINE.
 * side: "near" = trim the end nearest to trimPt, "far" = opposite.
 */
function trimLine(targetLine, boundaryLine, trimPt) {
  const ix = lineIntersect(
    targetLine.p1, targetLine.p2,
    boundaryLine.p1, boundaryLine.p2
  );
  if (!ix) return targetLine;
  const { x, y } = ix;
  // Keep whichever half does NOT contain trimPt
  const distP1 = dist(targetLine.p1, trimPt);
  const distP2 = dist(targetLine.p2, trimPt);
  if (distP1 < distP2) {
    // trimPt is near p1 — trim p1 end
    return { ...targetLine, p1: { x, y } };
  } else {
    return { ...targetLine, p2: { x, y } };
  }
}

/**
 * Extend a LINE to intersect with a boundary LINE.
 */
function extendLine(targetLine, boundaryLine) {
  const ix = lineIntersect(
    targetLine.p1, targetLine.p2,
    boundaryLine.p1, boundaryLine.p2
  );
  if (!ix) return targetLine;
  const { x, y } = ix;
  const dP1 = dist(targetLine.p1, { x, y });
  const dP2 = dist(targetLine.p2, { x, y });
  if (dP2 < dP1) return { ...targetLine, p2: { x, y } };
  return { ...targetLine, p1: { x, y } };
}

/**
 * Stretch: move all keypoints of shape that fall inside the window by dx/dy.
 */
function stretchShape(shape, window, dx, dy) {
  const inBox = pt => pt.x >= window.x && pt.x <= window.x + window.w && pt.y >= window.y && pt.y <= window.y + window.h;
  const mvp = pt => inBox(pt) ? { x: pt.x + dx, y: pt.y + dy } : pt;

  switch (shape.type) {
    case "LINE": return { ...shape, p1: mvp(shape.p1), p2: mvp(shape.p2) };
    case "SLOT": return { ...shape, p1: mvp(shape.p1), p2: mvp(shape.p2) };
    case "CLOUD": return { ...shape, p1: mvp(shape.p1), p2: mvp(shape.p2) };
    case "RECTANGLE": {
      const tl = mvp({ x: shape.x, y: shape.y });
      const br = mvp({ x: shape.x + shape.w, y: shape.y + shape.h });
      return { ...shape, x: Math.min(tl.x, br.x), y: Math.min(tl.y, br.y), w: Math.abs(br.x - tl.x), h: Math.abs(br.y - tl.y) };
    }
    case "POLYLINE":
    case "SPLINE":
    case "FREEHAND": return { ...shape, points: shape.points.map(mvp) };
    case "ARC": return { ...shape, center: mvp(shape.center), p1: mvp(shape.p1), p2: mvp(shape.p2) };
    default: return shape;
  }
}

// ═══════════════════════════════════════════════════════════════
// INLINE DIMENSIONS
// ═══════════════════════════════════════════════════════════════

function getInlineDims(shape) {
  if (!shape) return [];
  switch (shape.type) {
    case "LINE": {
      if (!shape.p1 || !shape.p2) return [];
      const len = dist(shape.p1, shape.p2);
      const mx = (shape.p1.x + shape.p2.x) / 2;
      const my = (shape.p1.y + shape.p2.y) / 2;
      const ang = Math.atan2(shape.p2.y - shape.p1.y, shape.p2.x - shape.p1.x);
      const absAng = Math.abs(ang) % Math.PI;
      const fromHoriz = absAng > Math.PI / 2 ? Math.PI - absAng : absAng;
      const nearHorizontal = fromHoriz < Math.PI / 4;
      return [{
        key: "length", label: "L", value: len.toFixed(2),
        x: mx + (nearHorizontal ? 0 : -DIM_OFFSET),
        y: my + (nearHorizontal ? -DIM_OFFSET : 0),
        horizontal: nearHorizontal,
      }];
    }
    case "RECTANGLE": {
      if (!shape.w || !shape.h) return [];
      return [
        { key: "w", label: "W", value: Math.abs(shape.w).toFixed(2), x: shape.x + shape.w / 2, y: shape.y - DIM_OFFSET, horizontal: true },
        { key: "h", label: "H", value: Math.abs(shape.h).toFixed(2), x: shape.x - DIM_OFFSET, y: shape.y + shape.h / 2, horizontal: false },
      ];
    }
    case "CIRCLE": {
      if (!shape.radius) return [];
      return [{
        key: "radius", label: "⌀", value: (shape.radius * 2).toFixed(2),
        x: shape.center.x + shape.radius * 0.5,
        y: shape.center.y - shape.radius - DIM_OFFSET * 0.8,
        horizontal: true,
      }];
    }
    case "ELLIPSE": {
      if (!shape.rx || !shape.ry) return [];
      return [
        { key: "rx", label: "Rx", value: shape.rx.toFixed(2), x: shape.center.x + shape.rx * 0.5, y: shape.center.y - shape.ry - DIM_OFFSET * 0.8, horizontal: true },
        { key: "ry", label: "Ry", value: shape.ry.toFixed(2), x: shape.center.x + shape.rx + DIM_OFFSET * 0.6, y: shape.center.y, horizontal: true },
      ];
    }
    case "POLYGON":
    case "TRIANGLE": {
      if (!shape.radius) return [];
      return [{
        key: "radius", label: "R", value: shape.radius.toFixed(2),
        x: shape.center.x, y: shape.center.y - shape.radius - DIM_OFFSET,
        horizontal: true,
      }];
    }
    case "ARC": {
      if (!shape.center || !shape.p1) return [];
      const r = dist(shape.center, shape.p1);
      return [{
        key: "radius", label: "R", value: r.toFixed(2),
        x: shape.center.x, y: shape.center.y - r - DIM_OFFSET,
        horizontal: true,
      }];
    }
    default: return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// PATH BUILDERS (worklet)
// ═══════════════════════════════════════════════════════════════

function buildLivePath(tool, x0, y0, x1, y1, arcCenter, arcP1, sides) {
  "worklet";
  const path = Skia.Path.Make();
  switch (tool) {
    case "LINE":
    case "DIMENSION":
      path.moveTo(x0, y0); path.lineTo(x1, y1); break;
    case "RECTANGLE": {
      const rx = Math.min(x0, x1), ry = Math.min(y0, y1);
      const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
      if (rw > 0 && rh > 0) path.addRect({ x: rx, y: ry, width: rw, height: rh }); break;
    }
    case "CIRCLE": {
      const r = Math.hypot(x1 - x0, y1 - y0);
      if (r > 0) path.addCircle(x0, y0, r); break;
    }
    case "ELLIPSE": {
      const rx2 = Math.abs(x1 - x0), ry2 = Math.abs(y1 - y0);
      if (rx2 > 0 && ry2 > 0) path.addOval({ x: Math.min(x0, x1), y: Math.min(y0, y1), width: rx2 * 2, height: ry2 * 2 }); break;
    }
    case "TRIANGLE": {
      const r = Math.hypot(x1 - x0, y1 - y0);
      if (r > 0) {
        for (let i = 0; i < 3; i++) {
          const a = (i * 2 * Math.PI / 3) - Math.PI / 2;
          const px = x0 + r * Math.cos(a), py = y0 + r * Math.sin(a);
          if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
        }
        path.close();
      }
      break;
    }
    case "STAR": {
      const outerR = Math.hypot(x1 - x0, y1 - y0); const innerR = outerR * 0.4; const n = sides || 5;
      if (outerR > 0) {
        for (let i = 0; i < n * 2; i++) {
          const a = (i * Math.PI / n) - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          const px = x0 + r * Math.cos(a), py = y0 + r * Math.sin(a);
          if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
        }
        path.close();
      }
      break;
    }
    case "SLOT": {
      const r2 = Math.hypot(y1 - y0, x1 - x0) * 0.25;
      const ang2 = Math.atan2(y1 - y0, x1 - x0);
      const ox = Math.sin(ang2) * r2, oy = -Math.cos(ang2) * r2;
      path.moveTo(x0 + ox, y0 + oy); path.lineTo(x1 + ox, y1 + oy);
      path.addArc({ x: x1 - r2, y: y1 - r2, width: r2 * 2, height: r2 * 2 }, (ang2 * 180 / Math.PI) - 90, 180);
      path.lineTo(x0 - ox, y0 - oy);
      path.addArc({ x: x0 - r2, y: y0 - r2, width: r2 * 2, height: r2 * 2 }, (ang2 * 180 / Math.PI) + 90, 180);
      path.close(); break;
    }
    case "POLYGON": {
      const r = Math.hypot(x1 - x0, y1 - y0);
      const s = Math.max(sides, 3);
      if (r > 0) {
        for (let i = 0; i < s; i++) {
          const a = (i * 2 * Math.PI) / s - Math.PI / 2;
          const px = x0 + r * Math.cos(a), py = y0 + r * Math.sin(a);
          if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
        }
        path.close();
      }
      break;
    }
    case "CLOUD": {
      const d2 = Math.hypot(x1 - x0, y1 - y0); if (d2 < 8) break;
      const bR = Math.max(d2 / 10, 8); const steps = Math.max(5, Math.floor(d2 / (bR * 2)));
      const ang3 = Math.atan2(y1 - y0, x1 - x0);
      const ox2 = Math.sin(ang3) * bR * 1.5, oy2 = -Math.cos(ang3) * bR * 1.5;
      path.moveTo(x0, y0); path.lineTo(x1, y1);
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const bx = x1 + (x0 - x1) * t, by = y1 + (y0 - y1) * t;
        path.addArc({ x: bx + ox2 - bR, y: by + oy2 - bR, width: bR * 2, height: bR * 2 }, 0, 180);
      }
      path.close(); break;
    }
    case "ARC": {
      if (arcCenter && arcP1) {
        const r = Math.hypot(arcP1.x - arcCenter.x, arcP1.y - arcCenter.y);
        const a1 = Math.atan2(arcP1.y - arcCenter.y, arcP1.x - arcCenter.x) * 180 / Math.PI;
        const a2 = Math.atan2(y1 - arcCenter.y, x1 - arcCenter.x) * 180 / Math.PI;
        const sweep = ((a2 - a1 + 360) % 360);
        if (r > 0 && sweep > 0)
          path.addArc({ x: arcCenter.x - r, y: arcCenter.y - r, width: r * 2, height: r * 2 }, a1, sweep);
      } else {
        path.moveTo(x0, y0); path.lineTo(x1, y1);
      }
      break;
    }
  }
  return path;
}

// ═══════════════════════════════════════════════════════════════
// JS PATH BUILDERS
// ═══════════════════════════════════════════════════════════════

const mkLine = (p1, p2) => { const p = Skia.Path.Make(); p.moveTo(p1.x, p1.y); p.lineTo(p2.x, p2.y); return p; };
const mkRect = (x, y, w, h) => { const p = Skia.Path.Make(); p.addRect({ x, y, width: Math.abs(w), height: Math.abs(h) }); return p; };
const mkCircle = (cx, cy, r) => { const p = Skia.Path.Make(); p.addCircle(cx, cy, Math.max(r, 0.5)); return p; };
const mkEllipse = (center, rx, ry) => { const p = Skia.Path.Make(); p.addOval({ x: center.x - rx, y: center.y - ry, width: rx * 2, height: ry * 2 }); return p; };

function mkArc(center, p1, p2) {
  const r = dist(center, p1);
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x) * 180 / Math.PI;
  const a2 = Math.atan2(p2.y - center.y, p2.x - center.x) * 180 / Math.PI;
  const p = Skia.Path.Make();
  p.addArc({ x: center.x - r, y: center.y - r, width: r * 2, height: r * 2 }, a1, ((a2 - a1 + 360) % 360));
  return p;
}

function mkPolygon(center, radius, sides) {
  const p = Skia.Path.Make(); const s = Math.max(sides, 3);
  for (let i = 0; i < s; i++) {
    const a = (i * 2 * Math.PI) / s - Math.PI / 2;
    const x = center.x + radius * Math.cos(a), y = center.y + radius * Math.sin(a);
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.close(); return p;
}

const mkTriangle = (center, radius) => mkPolygon(center, radius, 3);

function mkStar(center, outerR, innerR, numPts) {
  const p = Skia.Path.Make(); const n = Math.max(numPts, 3);
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI / n) - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = center.x + r * Math.cos(a), y = center.y + r * Math.sin(a);
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.close(); return p;
}

function mkSlot(p1, p2, radius) {
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const r = Math.max(radius, 1);
  const p = Skia.Path.Make();
  const ox = Math.sin(ang) * r, oy = -Math.cos(ang) * r;
  p.moveTo(p1.x + ox, p1.y + oy);
  p.lineTo(p2.x + ox, p2.y + oy);
  p.addArc({ x: p2.x - r, y: p2.y - r, width: r * 2, height: r * 2 }, (ang * 180 / Math.PI) - 90, 180);
  p.lineTo(p1.x - ox, p1.y - oy);
  p.addArc({ x: p1.x - r, y: p1.y - r, width: r * 2, height: r * 2 }, (ang * 180 / Math.PI) + 90, 180);
  p.close(); return p;
}

function mkSpline(pts, closed) {
  const p = Skia.Path.Make();
  if (!pts || pts.length < 2) return p;
  if (pts.length === 2) { p.moveTo(pts[0].x, pts[0].y); p.lineTo(pts[1].x, pts[1].y); return p; }
  const alpha = 0.5;
  const getT = (t, pi, pj) => Math.pow(Math.hypot(pj.x - pi.x, pj.y - pi.y), alpha) + t;
  const all = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < all.length - 2; i++) {
    const p0 = all[i - 1], p1 = all[i], p2 = all[i + 1], p3 = all[i + 2];
    const t0 = 0, t1 = getT(t0, p0, p1), t2 = getT(t1, p1, p2), t3 = getT(t2, p2, p3);
    const steps = 16;
    for (let s = 1; s <= steps; s++) {
      const t = t1 + (t2 - t1) * s / steps;
      const a1x = (t1 - t) / (t1 - t0) * p0.x + (t - t0) / (t1 - t0) * p1.x;
      const a1y = (t1 - t) / (t1 - t0) * p0.y + (t - t0) / (t1 - t0) * p1.y;
      const a2x = (t2 - t) / (t2 - t1) * p1.x + (t - t1) / (t2 - t1) * p2.x;
      const a2y = (t2 - t) / (t2 - t1) * p1.y + (t - t1) / (t2 - t1) * p2.y;
      const a3x = (t3 - t) / (t3 - t2) * p2.x + (t - t2) / (t3 - t2) * p3.x;
      const a3y = (t3 - t) / (t3 - t2) * p2.y + (t - t2) / (t3 - t2) * p3.y;
      const b1x = (t2 - t) / (t2 - t0) * a1x + (t - t0) / (t2 - t0) * a2x;
      const b1y = (t2 - t) / (t2 - t0) * a1y + (t - t0) / (t2 - t0) * a2y;
      const b2x = (t3 - t) / (t3 - t1) * a2x + (t - t1) / (t3 - t1) * a3x;
      const b2y = (t3 - t) / (t3 - t1) * a2y + (t - t1) / (t3 - t1) * a3y;
      p.lineTo((t2 - t) / (t2 - t1) * b1x + (t - t1) / (t2 - t1) * b2x, (t2 - t) / (t2 - t1) * b1y + (t - t1) / (t2 - t1) * b2y);
    }
  }
  if (closed) p.close();
  return p;
}

function mkCloud(p1, p2) {
  const p = Skia.Path.Make();
  const d = dist(p1, p2); if (d < 8) return p;
  const bumpR = Math.max(d / 10, 8); const steps = Math.max(5, Math.floor(d / (bumpR * 2)));
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const ox = Math.sin(ang) * bumpR * 1.5, oy = -Math.cos(ang) * bumpR * 1.5;
  p.moveTo(p1.x, p1.y); p.lineTo(p2.x, p2.y);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const bx = p2.x + (p1.x - p2.x) * t, by = p2.y + (p1.y - p2.y) * t;
    if (i === steps) p.moveTo(p2.x, p2.y);
    p.addArc({ x: bx + ox - bumpR, y: by + oy - bumpR, width: bumpR * 2, height: bumpR * 2 }, 0, 180);
  }
  p.close(); return p;
}

function mkFreehand(pts) {
  const p = Skia.Path.Make();
  if (!pts?.length) return p;
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  return p;
}

/**
 * Build path for a polyline that may contain mixed line + arc segments.
 * Each segment is stored as either:
 *   { x, y }  — a plain point (line segment to here)
 *   { x, y, arcTo: true, cx, cy, radius, startA, sweepDeg }  — arc segment
 */
function mkPolylineWithArcs(pts, closed) {
  const p = Skia.Path.Make();
  if (!pts || pts.length < 2) return p;
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const pt = pts[i];
    if (pt.arcTo && pt.radius > 0) {
      // arcToOval continues path from current position — no gap
      const sweep = pt.sweepDeg;
      const startDeg = pt.startA * 180 / Math.PI;
      p.arcToOval(
        { x: pt.cx - pt.radius, y: pt.cy - pt.radius, width: pt.radius * 2, height: pt.radius * 2 },
        startDeg,
        sweep,
        false  // forceMoveTo=false so it connects
      );
    } else {
      p.lineTo(pt.x, pt.y);
    }
  }
  if (closed) p.close();
  return p;
}

function buildShapePath(shape) {
  switch (shape.type) {
    case "LINE": return (shape.p1 && shape.p2) ? mkLine(shape.p1, shape.p2) : null;
    case "RECTANGLE": return (shape.w && shape.h) ? mkRect(shape.x, shape.y, shape.w, shape.h) : null;
    case "CIRCLE": return shape.radius ? mkCircle(shape.center.x, shape.center.y, shape.radius) : null;
    case "ELLIPSE": return (shape.rx && shape.ry) ? mkEllipse(shape.center, shape.rx, shape.ry) : null;
    case "ARC": return (shape.center && shape.p1 && shape.p2) ? mkArc(shape.center, shape.p1, shape.p2) : null;
    case "POLYGON": return shape.radius ? mkPolygon(shape.center, shape.radius, shape.sides) : null;
    case "TRIANGLE": return shape.radius ? mkTriangle(shape.center, shape.radius) : null;
    case "STAR": return shape.outerR ? mkStar(shape.center, shape.outerR, shape.innerR || shape.outerR * 0.4, shape.points || 5) : null;
    case "SLOT": return (shape.p1 && shape.p2 && shape.radius) ? mkSlot(shape.p1, shape.p2, shape.radius) : null;
    case "POLYLINE": return shape.points?.length ? (shape.hasArcs ? mkPolylineWithArcs(shape.points, shape.closed) : mkFreehand(shape.points)) : null;
    case "SPLINE": return shape.points?.length ? mkSpline(shape.points, shape.closed) : null;
    case "FREEHAND": return shape.points?.length ? mkFreehand(shape.points) : null;
    case "CLOUD": return (shape.p1 && shape.p2) ? mkCloud(shape.p1, shape.p2) : null;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER SHAPE // React component to render a shape with appropriate styling based on selection/edit state
// ═══════════════════════════════════════════════════════════════

const RenderShape = React.memo(function RenderShape({ shape, selected, editMode, layerColor, isExtrudable }) {
  if (!shape) return null;

  const color = selected
    ? (isExtrudable ? "#C084FC" : T.shapeSelected)
    : (editMode ? T.shapeEdit : (layerColor || T.shapePrimary));
  const sw = selected ? 2.0 : 1.5;
  const glowSW = selected ? 8 : (editMode ? 6 : 4);
  const glowC = selected && isExtrudable
    ? "rgba(168,85,247,0.12)"
    : selected
      ? "rgba(247,201,72,0.10)"
      : (editMode ? "rgba(255,122,69,0.08)" : "rgba(42,168,242,0.06)");

  if (shape.type === "DIMENSION") {
    if (!shape.p1 || !shape.p2) return null;
    const ang = Math.atan2(shape.p2.y - shape.p1.y, shape.p2.x - shape.p1.x);
    const ox = -Math.sin(ang) * 24, oy = Math.cos(ang) * 24;
    const dimLine = Skia.Path.Make();
    dimLine.moveTo(shape.p1.x + ox, shape.p1.y + oy);
    dimLine.lineTo(shape.p2.x + ox, shape.p2.y + oy);
    const extLines = Skia.Path.Make();
    extLines.moveTo(shape.p1.x, shape.p1.y); extLines.lineTo(shape.p1.x + ox * 1.25, shape.p1.y + oy * 1.25);
    extLines.moveTo(shape.p2.x, shape.p2.y); extLines.lineTo(shape.p2.x + ox * 1.25, shape.p2.y + oy * 1.25);
    const arrowLen = 9, arrowW = 3.5;
    const arrows = Skia.Path.Make();
    const p1dx = shape.p1.x + ox, p1dy = shape.p1.y + oy;
    const p2dx = shape.p2.x + ox, p2dy = shape.p2.y + oy;
    arrows.moveTo(p1dx, p1dy);
    arrows.lineTo(p1dx + Math.cos(ang) * arrowLen + Math.sin(ang) * arrowW, p1dy + Math.sin(ang) * arrowLen - Math.cos(ang) * arrowW);
    arrows.moveTo(p1dx, p1dy);
    arrows.lineTo(p1dx + Math.cos(ang) * arrowLen - Math.sin(ang) * arrowW, p1dy + Math.sin(ang) * arrowLen + Math.cos(ang) * arrowW);
    arrows.moveTo(p2dx, p2dy);
    arrows.lineTo(p2dx - Math.cos(ang) * arrowLen + Math.sin(ang) * arrowW, p2dy - Math.sin(ang) * arrowLen - Math.cos(ang) * arrowW);
    arrows.moveTo(p2dx, p2dy);
    arrows.lineTo(p2dx - Math.cos(ang) * arrowLen - Math.sin(ang) * arrowW, p2dy - Math.sin(ang) * arrowLen + Math.cos(ang) * arrowW);
    return (
      <Group>
        <Path path={extLines} color="rgba(247,201,72,0.45)" style="stroke" strokeWidth={0.8} />
        <Path path={dimLine} color={T.shapeDim} style="stroke" strokeWidth={1.3} />
        <Path path={arrows} color={T.shapeDim} style="stroke" strokeWidth={2} strokeJoin="round" strokeCap="round" />
      </Group>
    );
  }

  const path = React.useMemo(() => buildShapePath(shape), [
    shape.id, shape.type,
    shape.p1?.x, shape.p1?.y, shape.p2?.x, shape.p2?.y,
    shape.x, shape.y, shape.w, shape.h,
    shape.center?.x, shape.center?.y, shape.radius,
    shape.rx, shape.ry, shape.sides, shape.outerR, shape.innerR,
    shape.points, shape.closed,
  ]);

  if (!path) return null;

  return (
    <Group>
      <Path path={path} color={glowC} style="stroke" strokeWidth={glowSW} strokeCap="round" strokeJoin="round" />
      <Path path={path} color={color} style="stroke" strokeWidth={sw} strokeCap="round" strokeJoin="round" />
    </Group>
  );
}, (prev, next) => prev.selected === next.selected && prev.editMode === next.editMode && prev.shape === next.shape && prev.isExtrudable === next.isExtrudable);

// ═══════════════════════════════════════════════════════════════
// GRID
// ═══════════════════════════════════════════════════════════════

const gridCache = { key: "", dot: null, minor: null, major: null, axis: null };
function buildGridPaths(width, height) {
  const key = `${width}x${height}`;
  if (gridCache.key === key) return gridCache;
  const cols = Math.ceil(width / GRID_MINOR) + 8;
  const rows = Math.ceil(height / GRID_MINOR) + 8;
  const halfW = (cols * GRID_MINOR) / 2;
  const halfH = (rows * GRID_MINOR) / 2;
  const dot = Skia.Path.Make();
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  const axis = Skia.Path.Make();
  for (let i = -cols; i <= cols; i++) {
    for (let j = -rows; j <= rows; j++) {
      if (i % (GRID_MAJOR / GRID_MINOR) === 0 || j % (GRID_MAJOR / GRID_MINOR) === 0) continue;
      dot.addCircle(i * GRID_MINOR, j * GRID_MINOR, 0.6);
    }
  }
  for (let i = -cols; i <= cols; i++) {
    const x = i * GRID_MINOR;
    if (x === 0) { axis.moveTo(x, -halfH); axis.lineTo(x, halfH); }
    else if (i % (GRID_MAJOR / GRID_MINOR) === 0) { major.moveTo(x, -halfH); major.lineTo(x, halfH); }
  }
  for (let j = -rows; j <= rows; j++) {
    const y = j * GRID_MINOR;
    if (y === 0) { axis.moveTo(-halfW, y); axis.lineTo(halfW, y); }
    else if (j % (GRID_MAJOR / GRID_MINOR) === 0) { major.moveTo(-halfW, y); major.lineTo(halfW, y); }
  }
  gridCache.key = key; gridCache.dot = dot; gridCache.minor = minor; gridCache.major = major; gridCache.axis = axis;
  return gridCache;
}

function Grid({ width, height }) {
  const g = buildGridPaths(width, height);
  return (
    <>
      <Path path={g.dot} color={T.gridDot} style="fill" />
      <Path path={g.major} color={T.gridMajor} style="stroke" strokeWidth={0.5} />
      <Path path={g.axis} color={T.gridAxis} style="stroke" strokeWidth={1.2} />
    </>
  );
}

function Origin() {
  const xPath = Skia.Path.Make();
  xPath.moveTo(-32, 0); xPath.lineTo(32, 0);
  xPath.moveTo(26, -5); xPath.lineTo(32, 0); xPath.lineTo(26, 5);
  const yPath = Skia.Path.Make();
  yPath.moveTo(0, -32); yPath.lineTo(0, 32);
  yPath.moveTo(-5, -26); yPath.lineTo(0, -32); yPath.lineTo(5, -26);
  const cross = Skia.Path.Make();
  cross.moveTo(-4, -4); cross.lineTo(4, 4);
  cross.moveTo(-4, 4); cross.lineTo(4, -4);
  return (
    <>
      <Path path={xPath} color="rgba(230,70,60,0.65)" style="stroke" strokeWidth={1.2} strokeCap="round" />
      <Path path={yPath} color="rgba(60,210,80,0.65)" style="stroke" strokeWidth={1.2} strokeCap="round" />
      <Circle cx={0} cy={0} r={5} color="rgba(255,255,255,0.08)" style="fill" />
      <Circle cx={0} cy={0} r={4} color="rgba(255,255,255,0.35)" style="stroke" strokeWidth={1} />
      <Path path={cross} color="rgba(255,255,255,0.5)" style="stroke" strokeWidth={1} strokeCap="round" />
    </>
  );
}

function Crosshair({ x1SV, y1SV, draggingSV, toolSV }) {
  const isPolyTool = useDerivedValue(() => toolSV.value === "POLYLINE" || toolSV.value === "SPLINE");
  const hairPath = useDerivedValue(() => {
    if (!draggingSV.value && !isPolyTool.value) return Skia.Path.Make();
    const p = Skia.Path.Make();
    const x = x1SV.value, y = y1SV.value;
    const s1 = 6, s2 = 22;
    p.moveTo(x - s2, y); p.lineTo(x - s1, y);
    p.moveTo(x + s1, y); p.lineTo(x + s2, y);
    p.moveTo(x, y - s2); p.lineTo(x, y - s1);
    p.moveTo(x, y + s1); p.lineTo(x, y + s2);
    return p;
  });
  const dotPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!draggingSV.value && !isPolyTool.value) return p;
    p.addCircle(x1SV.value, y1SV.value, 2);
    return p;
  });
  const ringPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!draggingSV.value && !isPolyTool.value) return p;
    p.addCircle(x1SV.value, y1SV.value, 10);
    return p;
  });
  return (
    <>
      <Path path={ringPath} color="rgba(0,229,160,0.12)" style="fill" />
      <Path path={ringPath} color="rgba(0,229,160,0.5)" style="stroke" strokeWidth={0.7} />
      <Path path={hairPath} color={T.snapColor} style="stroke" strokeWidth={0.9} strokeCap="round" />
      <Path path={dotPath} color={T.snapColor} style="fill" />
    </>
  );
}

function LivePreview({ toolSV, x0SV, y0SV, x1SV, y1SV, draggingSV, sidesSV, arcCenterSV, arcP1SV }) {
  const livePath = useDerivedValue(() => {
    if (!draggingSV.value) return Skia.Path.Make();
    return buildLivePath(toolSV.value, x0SV.value, y0SV.value, x1SV.value, y1SV.value, arcCenterSV.value, arcP1SV.value, sidesSV.value);
  });
  const anchorPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!draggingSV.value) return p;
    p.addCircle(x0SV.value, y0SV.value, 4);
    return p;
  });
  return (
    <>
      <Path path={livePath} color="rgba(42,168,242,0.08)" style="stroke" strokeWidth={12} strokeCap="round" />
      <Path path={livePath} color="rgba(42,168,242,0.25)" style="stroke" strokeWidth={4} strokeCap="round" />
      <Path path={livePath} color={T.shapePrimary} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" />
      <Path path={anchorPath} color={T.warning} style="fill" />
      <Path path={anchorPath} color={T.warningBg} style="stroke" strokeWidth={4} />
    </>
  );
}

function MoveGhost({ movingSV, moveDxSV, moveDySV, selectedShapeSV }) {
  const ghostPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!movingSV.value) return path;
    const dx = moveDxSV.value, dy = moveDySV.value;
    const shape = selectedShapeSV.value;
    if (!shape) return path;
    const g = translateShape(shape, dx, dy);
    switch (g.type) {
      case "LINE": if (g.p1 && g.p2) { path.moveTo(g.p1.x, g.p1.y); path.lineTo(g.p2.x, g.p2.y); } break;
      case "RECTANGLE": if (g.w && g.h) path.addRect({ x: g.x, y: g.y, width: Math.abs(g.w), height: Math.abs(g.h) }); break;
      case "CIRCLE": if (g.radius) path.addCircle(g.center.x, g.center.y, g.radius); break;
      case "POLYGON": {
        if (!g.radius) break;
        const s = Math.max(g.sides, 3);
        for (let i = 0; i < s; i++) {
          const a = (i * 2 * Math.PI) / s - Math.PI / 2;
          const px = g.center.x + g.radius * Math.cos(a), py = g.center.y + g.radius * Math.sin(a);
          if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
        }
        path.close(); break;
      }
      case "POLYLINE": {
        if (g.points?.length) {
          path.moveTo(g.points[0].x, g.points[0].y);
          for (let i = 1; i < g.points.length; i++) path.lineTo(g.points[i].x, g.points[i].y);
          if (g.closed) path.close();
        }
        break;
      }
      case "ARC": {
        if (g.center && g.p1 && g.p2) {
          const r = Math.hypot(g.p1.x - g.center.x, g.p1.y - g.center.y);
          const a1 = Math.atan2(g.p1.y - g.center.y, g.p1.x - g.center.x) * 180 / Math.PI;
          const a2 = Math.atan2(g.p2.y - g.center.y, g.p2.x - g.center.x) * 180 / Math.PI;
          if (r > 0) path.addArc({ x: g.center.x - r, y: g.center.y - r, width: r * 2, height: r * 2 }, a1, ((a2 - a1 + 360) % 360));
        }
        break;
      }
    }
    return path;
  });
  return (
    <>
      <Path path={ghostPath} color="rgba(247,201,72,0.07)" style="stroke" strokeWidth={10} strokeCap="round" />
      <Path path={ghostPath} color="rgba(247,201,72,0.30)" style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HIT TEST
// ═══════════════════════════════════════════════════════════════

function hitTest(s, pt, tol = 18) {
  switch (s.type) {
    case "LINE": {
      const dx = s.p2.x - s.p1.x, dy = s.p2.y - s.p1.y, l2 = dx * dx + dy * dy;
      if (!l2) return dist(s.p1, pt) < tol;
      const t = Math.max(0, Math.min(1, ((pt.x - s.p1.x) * dx + (pt.y - s.p1.y) * dy) / l2));
      return dist({ x: s.p1.x + t * dx, y: s.p1.y + t * dy }, pt) < tol;
    }
    case "RECTANGLE": return pt.x >= s.x - tol && pt.x <= s.x + s.w + tol && pt.y >= s.y - tol && pt.y <= s.y + s.h + tol;
    case "CIRCLE": return Math.abs(dist(s.center, pt) - s.radius) < tol;
    case "POLYGON": return dist(s.center, pt) < s.radius + tol;
    case "ARC": return s.center && s.p1 && Math.abs(dist(s.center, pt) - dist(s.center, s.p1)) < tol;
    case "POLYLINE": return s.points?.some((p, i) => {
      if (!i) return false;
      const a = s.points[i - 1];
      const dx = p.x - a.x, dy = p.y - a.y, l2 = dx * dx + dy * dy;
      if (!l2) return dist(a, pt) < tol;
      const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / l2));
      return dist({ x: a.x + t * dx, y: a.y + t * dy }, pt) < tol;
    });
    default: return keyPoints(s).some(p => dist(p, pt) < tol);
  }
}

// ═══════════════════════════════════════════════════════════════
// SHAPE PROPERTIES / DIMS
// ═══════════════════════════════════════════════════════════════

function shapeDims(s) {
  if (!s) return [];
  switch (s.type) {
    case "LINE": return [
      { key: "length", label: "Length", value: dist(s.p1, s.p2), unit: "mm" },
      { key: "angle", label: "Angle", value: (rad2deg(Math.atan2(s.p2.y - s.p1.y, s.p2.x - s.p1.x))).toFixed(2), unit: "°" },
      { key: "p1x", label: "X1", value: s.p1.x.toFixed(2), unit: "mm", readonly: true },
      { key: "p1y", label: "Y1", value: s.p1.y.toFixed(2), unit: "mm", readonly: true },
      { key: "p2x", label: "X2", value: s.p2.x.toFixed(2), unit: "mm", readonly: true },
      { key: "p2y", label: "Y2", value: s.p2.y.toFixed(2), unit: "mm", readonly: true },
    ];
    case "RECTANGLE": return [
      { key: "w", label: "Width", value: Math.abs(s.w), unit: "mm" },
      { key: "h", label: "Height", value: Math.abs(s.h), unit: "mm" },
      { key: "x", label: "X", value: s.x.toFixed(2), unit: "mm", readonly: true },
      { key: "y", label: "Y", value: s.y.toFixed(2), unit: "mm", readonly: true },
      { key: "area", label: "Area", value: (Math.abs(s.w) * Math.abs(s.h)).toFixed(2), unit: "mm²", readonly: true },
      { key: "perim", label: "Perim.", value: (2 * (Math.abs(s.w) + Math.abs(s.h))).toFixed(2), unit: "mm", readonly: true },
    ];
    case "CIRCLE": return [
      { key: "radius", label: "Radius", value: s.radius, unit: "mm" },
      { key: "diameter", label: "Diameter", value: (s.radius * 2).toFixed(2), unit: "mm", readonly: true },
      { key: "area", label: "Area", value: (Math.PI * s.radius ** 2).toFixed(2), unit: "mm²", readonly: true },
      { key: "cx", label: "CX", value: s.center.x.toFixed(2), unit: "mm", readonly: true },
      { key: "cy", label: "CY", value: s.center.y.toFixed(2), unit: "mm", readonly: true },
    ];
    case "ELLIPSE": return [
      { key: "rx", label: "X Radius", value: s.rx, unit: "mm" },
      { key: "ry", label: "Y Radius", value: s.ry, unit: "mm" },
    ];
    case "POLYGON": return [
      { key: "radius", label: "Radius", value: s.radius, unit: "mm" },
      { key: "sides", label: "Sides", value: s.sides, unit: "", readonly: true },
    ];
    case "ARC": return s.center && s.p1 ? [{ key: "radius", label: "Radius", value: dist(s.center, s.p1).toFixed(2), unit: "mm", readonly: true }] : [];
    case "DIMENSION": return s.p1 && s.p2 ? [{ key: "dist", label: "Distance", value: dist(s.p1, s.p2).toFixed(2), unit: "mm", readonly: true }] : [];
    default: return [];
  }
}

function applyEdit(shape, key, raw) {
  const v = parseFloat(raw);
  if (isNaN(v)) return shape;
  switch (shape.type) {
    case "LINE": {
      const len = dist(shape.p1, shape.p2);
      const curAng = Math.atan2(shape.p2.y - shape.p1.y, shape.p2.x - shape.p1.x);
      if (key === "length" && v > 0) return { ...shape, p2: { x: shape.p1.x + v * Math.cos(curAng), y: shape.p1.y + v * Math.sin(curAng) } };
      if (key === "angle") { const rad = deg2rad(v); return { ...shape, p2: { x: shape.p1.x + len * Math.cos(rad), y: shape.p1.y + len * Math.sin(rad) } }; }
      return shape;
    }
    case "RECTANGLE": if (key === "w" && v > 0) return { ...shape, w: v }; if (key === "h" && v > 0) return { ...shape, h: v }; return shape;
    case "CIRCLE": if (key === "radius" && v > 0) return { ...shape, radius: v }; return shape;
    case "ELLIPSE": if (key === "rx" && v > 0) return { ...shape, rx: v }; if (key === "ry" && v > 0) return { ...shape, ry: v }; return shape;
    case "POLYGON":
    case "TRIANGLE": if (key === "radius" && v > 0) return { ...shape, radius: v }; return shape;
    default: return shape;
  }
}

function applyEditWithConnections(allShapes, shapeId, key, raw) {
  const shape = allShapes.find(s => s.id === shapeId);
  if (!shape) return allShapes;
  const updated = applyEdit(shape, key, raw);
  if (updated === shape) return allShapes;
  const didMoveP2 = shape.type === "LINE" && (key === "length" || key === "angle");
  return allShapes.map(s => {
    if (s.id === shapeId) return updated;
    if (!didMoveP2 || s.type !== "LINE") return s;
    const oldP2 = shape.p2; const newP2 = updated.p2;
    if (dist(s.p1, oldP2) < COINCIDENT_R) return { ...s, p1: newP2 };
    if (dist(s.p2, oldP2) < COINCIDENT_R) return { ...s, p2: newP2 };
    return s;
  });
}

// ═══════════════════════════════════════════════════════════════
// COORDINATE DISPLAY
// ═══════════════════════════════════════════════════════════════

function CoordBox({ coordXSV, coordYSV }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let rafId;
    const poll = () => {
      const x = coordXSV.value, y = coordYSV.value;
      setCoords(prev => (Math.abs(prev.x - x) < 0.05 && Math.abs(prev.y - y) < 0.05) ? prev : { x, y });
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [coordXSV, coordYSV]);
  return (
    <View style={s.coordBox}>
      <Text style={[s.coordLabel, { color: "#f31823" }]}>X</Text>
      <Text style={s.coordVal}>{coords.x.toFixed(2)}</Text>
      <View style={s.coordDivider} />
      <Text style={[s.coordLabel, { color: "#09f01c" }]}>Y</Text>
      <Text style={s.coordVal}>{coords.y.toFixed(2)}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// ARC SEGMENT HUD — floating info box showing live arc data
// ═══════════════════════════════════════════════════════════════
function ArcSegmentHUD({ arcInfo, zoom, width, height, onRadiusChange }) {
  const [radiusInput, setRadiusInput] = useState("");
  const prevArcInfo = useRef(null);

  useEffect(() => {
    if (arcInfo && arcInfo.radius > 0) {
      // Only update the text if we don't have focus (avoid overwriting user typing)
      setRadiusInput(arcInfo.radius.toFixed(2));
      prevArcInfo.current = arcInfo;
    }
  }, [arcInfo?.radius, arcInfo?.cx, arcInfo?.cy]);

  if (!arcInfo) return null;

  const canvasH = height - 60;

  // Convert arc center to screen coords for the indicator dot
  const dotX = arcInfo.cx * zoom + width / 2;
  const dotY = arcInfo.cy * zoom + canvasH / 2;
  const dotInView = dotX > 0 && dotX < width && dotY > 0 && dotY < canvasH;

  return (
    <>
      {/* Center dot indicator on canvas — absolute positioned */}
      {dotInView && (
        <View
          pointerEvents="none"
          style={[
            s.arcCenterDot,
            { left: dotX - 6, top: dotY - 6 },
          ]}
        />
      )}

      {/* Info panel */}
      <View style={s.arcHud} pointerEvents="box-none">
        {/* Header */}
        <View style={s.arcHudHeader}>
          <View style={s.arcHudIcon}>
            <Text style={s.arcHudIconText}>⌒</Text>
          </View>
          <Text style={s.arcHudTitle}>ARC SEGMENT</Text>
        </View>

        {/* Radius row with editable input */}
        <View style={s.arcHudRow}>
          <Text style={s.arcHudLabel}>R</Text>
          <View style={s.arcHudInputWrap}>
            <TextInput
              style={s.arcHudInput}
              value={radiusInput}
              onChangeText={v => {
                setRadiusInput(v);
                const parsed = parseFloat(v);
                if (!isNaN(parsed) && parsed > 0) onRadiusChange?.(parsed);
              }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              placeholderTextColor="#283348"
            />
          </View>
          <Text style={s.arcHudUnit}>mm</Text>
        </View>

        {/* Center coords — read-only */}
        <View style={s.arcHudCoordsRow}>
          <View style={s.arcHudCoordPair}>
            <Text style={s.arcHudCoordLabel}>CX</Text>
            <Text style={s.arcHudCoordVal}>{arcInfo.cx.toFixed(1)}</Text>
          </View>
          <View style={s.arcHudDivider} />
          <View style={s.arcHudCoordPair}>
            <Text style={s.arcHudCoordLabel}>CY</Text>
            <Text style={s.arcHudCoordVal}>{arcInfo.cy.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════════

function PropertiesPanel({ shape, onUpdate, onApplyWithConnections, onDelete }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [activeSection, setActiveSection] = useState("dims");

  const open = useCallback(() => { setIsOpen(true); Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 14 }).start(); }, []);
  const close = useCallback(() => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 14 }).start(() => setIsOpen(false)); }, []);

  useEffect(() => { if (!shape && isOpen) close(); }, [shape?.id]);

  useEffect(() => {
    if (shape) {
      const dims = shapeDims(shape);
      setVals(Object.fromEntries(dims.map(d => [d.key, String(typeof d.value === "number" ? d.value.toFixed(4) : d.value)])));
    }
  }, [shape?.id, shape?.type]);

  const dims = shape ? shapeDims(shape) : [];

  const applyAll = () => {
    if (!shape) return;
    dims.filter(d => !d.readonly).forEach(d => {
      if (onApplyWithConnections) onApplyWithConnections(shape.id, d.key, vals[d.key]);
    });
  };

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [296, 0] });

  return (
    <View style={s.propPanelContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={[s.propTabBtn, isOpen && s.propTabBtnOpen]}
        onPress={() => isOpen ? close() : (shape ? open() : null)}
        activeOpacity={0.8}
      >
        <Text style={s.propTabIcon}>{isOpen ? "›" : "‹"}</Text>
        {shape && !isOpen && <View style={s.propTabDot} />}
      </TouchableOpacity>

      <Animated.View
        style={[s.propPanel, { transform: [{ translateX }] }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        {shape && (
          <>
            <View style={s.propHeader}>
              <View style={s.propHeaderLeft}>
                <View style={[s.propHeaderDot, { backgroundColor: T.active }]} />
                <Text style={s.propHeaderType}>{shape.type}</Text>
              </View>
              <View style={s.propHeaderActions}>
                <TouchableOpacity style={[s.propActionBtn, s.propDeleteBtn]} onPress={onDelete}>
                  <Text style={[s.propActionText, { color: T.danger }]}>⊗</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.propActionBtn, s.propApplyBtn]} onPress={applyAll}>
                  <Text style={s.propActionText}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.propSectionTabs}>
              {[
                { id: "dims", label: "DIMENSIONS" },
                { id: "pos", label: "POSITION" },
                { id: "props", label: "PROPERTIES" },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[s.propSectionTab, activeSection === tab.id && s.propSectionTabActive]}
                  onPress={() => setActiveSection(tab.id)}
                >
                  <Text style={[s.propSectionTabText, activeSection === tab.id && s.propSectionTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={s.propScrollArea} keyboardShouldPersistTaps="handled">
              {dims.map(d => (
                <View key={d.key} style={s.propFieldRow}>
                  <View style={s.propFieldLabelWrap}>
                    <Text style={s.propFieldLabel}>{d.label}</Text>
                    {d.unit ? <Text style={s.propFieldUnitLabel}>{d.unit}</Text> : null}
                  </View>
                  <View style={[s.propFieldInput, d.readonly && s.propFieldInputRO]}>
                    <TextInput
                      style={[s.propFieldText, d.readonly && s.propFieldTextRO]}
                      value={vals[d.key] ?? ""}
                      onChangeText={v => setVals(p => ({ ...p, [d.key]: v }))}
                      keyboardType="decimal-pad"
                      editable={!d.readonly}
                      selectTextOnFocus
                      returnKeyType="done"
                      onSubmitEditing={applyAll}
                      placeholderTextColor={T.textDim}
                    />
                  </View>
                </View>
              ))}

              {/* Arc segments list for polyline with arcs */}
              {shape.type === "POLYLINE" && shape.hasArcs && shape.points && (
                <View style={s.arcSegmentSection}>
                  <Text style={s.arcSegmentSectionTitle}>⌒ ARC SEGMENTS</Text>
                  {shape.points.map((pt, i) => {
                    if (!pt.arcTo) return null;
                    return (
                      <View key={i} style={s.arcSegmentRow}>
                        <Text style={s.arcSegmentIndex}>#{i}</Text>
                        <View style={s.arcSegmentData}>
                          <Text style={s.arcSegmentStat}>R {pt.radius.toFixed(2)} mm</Text>
                          <Text style={s.arcSegmentStatSub}>CX {pt.cx.toFixed(1)}  CY {pt.cy.toFixed(1)}</Text>
                        </View>
                      </View>
                    );
                  }).filter(Boolean)}
                </View>
              )}

              <View style={s.propMetaSection}>
                <View style={s.propMetaRow}>
                  <Text style={s.propMetaLabel}>ID</Text>
                  <Text style={s.propMetaValue}>{shape.id?.toString().slice(-12)}</Text>
                </View>
                <View style={s.propMetaRow}>
                  <Text style={s.propMetaLabel}>TYPE</Text>
                  <Text style={s.propMetaValue}>{shape.type}</Text>
                </View>
                {shape.layer && (
                  <View style={s.propMetaRow}>
                    <Text style={s.propMetaLabel}>LAYER</Text>
                    <Text style={s.propMetaValue}>{shape.layer}</Text>
                  </View>
                )}
                {isClosedGeometry(shape) && (
                  <View style={s.propExtrudeBadge}>
                    <Text style={s.propExtrudeBadgeText}>⬡ CLOSED — EXTRUDABLE</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// POLYLINE OVERLAYS
// ═══════════════════════════════════════════════════════════════

function BlinkCircle({ x, y, r = 7, color, period = 650 }) {
  const [vis, setVis] = useState(true);
  useEffect(() => { const id = setInterval(() => setVis(v => !v), period); return () => clearInterval(id); }, [period]);
  if (!vis) return null;
  return (
    <Group>
      <Circle cx={x} cy={y} r={r + 5} color={color.replace(")", ",0.12)").replace("rgb(", "rgba(")} />
      <Circle cx={x} cy={y} r={r} color={color} />
    </Group>
  );
}

/**
 * Enhanced PolylineOverlay that supports arc rubber-band preview.
 * When segMode === "arc", draws an arc preview from last point through
 * the current cursor mid-point to the cursor end.
 */
function PolylineOverlay({ polyPts, polyStarted, lastPolyXSV, lastPolyYSV, x1SV, y1SV, activeColor, closeColor, segModeSV }) {
  const polyStartedSV2 = useSharedValue(false);
  useEffect(() => { polyStartedSV2.value = polyStarted; }, [polyStarted]);

  // segModeSV is passed in directly as a shared value — always in sync with gesture worklet

  // Rubber-band line path (used only in line mode)
  const rubberLinePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!polyStartedSV2.value || segModeSV.value !== "line") return p;
    p.moveTo(lastPolyXSV.value, lastPolyYSV.value);
    p.lineTo(x1SV.value, y1SV.value);
    return p;
  });

  const rubberArcPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!polyStartedSV2.value || segModeSV.value !== "arc") return p;
    const ax = lastPolyXSV.value, ay = lastPolyYSV.value;
    const ex = x1SV.value, ey = y1SV.value;
    const chord = Math.hypot(ex - ax, ey - ay);
    if (chord < 2) return p;
    // Circumcircle of 3 points: start, perp-offset midpoint, end
    const mx = (ax + ex) / 2 - (ey - ay) * 0.35;
    const my = (ay + ey) / 2 + (ex - ax) * 0.35;
    const D = 2 * (ax * (my - ey) + mx * (ey - ay) + ex * (ay - my));
    if (Math.abs(D) < 1e-6) { p.moveTo(ax, ay); p.lineTo(ex, ey); return p; }
    const ux = ((ax * ax + ay * ay) * (my - ey) + (mx * mx + my * my) * (ey - ay) + (ex * ex + ey * ey) * (ay - my)) / D;
    const uy = ((ax * ax + ay * ay) * (ex - mx) + (mx * mx + my * my) * (ax - ex) + (ex * ex + ey * ey) * (mx - ax)) / D;
    const r = Math.hypot(ax - ux, ay - uy);
    if (r < 1) return p;
    const startA = Math.atan2(ay - uy, ax - ux);
    const endA = Math.atan2(ey - uy, ex - ux);
    const midA = Math.atan2(my - uy, mx - ux);
    // Determine sweep direction: go through midA
    const PI2 = Math.PI * 2;
    const norm = v => ((v % PI2) + PI2) % PI2;
    let sweep = norm(endA - startA);
    const midRel = norm(midA - startA);
    if (midRel > sweep) sweep = sweep - PI2; // go the other way
    // Draw arc by stepping — guaranteed to start exactly at (ax,ay)
    const steps = Math.max(8, Math.ceil(Math.abs(sweep) * r / 4));
    p.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const a = startA + sweep * (i / steps);
      p.lineTo(ux + r * Math.cos(a), uy + r * Math.sin(a));
    }
    return p;
  });

  // Arc center dot path — shows arc center + radius lines while previewing
  const arcCenterPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (!polyStartedSV2.value || segModeSV.value !== "arc") return p;
    const ax = lastPolyXSV.value, ay = lastPolyYSV.value;
    const ex = x1SV.value, ey = y1SV.value;
    const chord = Math.hypot(ex - ax, ey - ay);
    if (chord < 2) return p;
    const mx = (ax + ex) / 2 - (ey - ay) * 0.35;
    const my = (ay + ey) / 2 + (ex - ax) * 0.35;
    const D = 2 * (ax * (my - ey) + mx * (ey - ay) + ex * (ay - my));
    if (Math.abs(D) < 1e-6) return p;
    const ux = ((ax * ax + ay * ay) * (my - ey) + (mx * mx + my * my) * (ey - ay) + (ex * ex + ey * ey) * (ay - my)) / D;
    const uy = ((ax * ax + ay * ay) * (ex - mx) + (mx * mx + my * my) * (ax - ex) + (ex * ex + ey * ey) * (mx - ax)) / D;
    const r = Math.hypot(ax - ux, ay - uy);
    if (r < 1) return p;
    p.addCircle(ux, uy, 4);
    // radius lines
    p.moveTo(ux, uy); p.lineTo(ax, ay);
    p.moveTo(ux, uy); p.lineTo(ex, ey);
    return p;
  });

  if (!polyStarted && polyPts.length === 0) return null;

  // Build committed segments path (respecting arc segments)
  const segPath = Skia.Path.Make();
  if (polyPts.length >= 2) {
    segPath.moveTo(polyPts[0].x, polyPts[0].y);
    for (let i = 1; i < polyPts.length; i++) {
      const pt = polyPts[i];
      if (pt.arcTo && pt.radius > 0) {
        segPath.arcToOval(
          { x: pt.cx - pt.radius, y: pt.cy - pt.radius, width: pt.radius * 2, height: pt.radius * 2 },
          pt.startA * 180 / Math.PI,
          pt.sweepDeg,
          false
        );
      } else {
        segPath.lineTo(pt.x, pt.y);
      }
    }
  }

  return (
    <Group>
      {polyPts.length >= 2 && (
        <>
          <Path path={segPath} color="rgba(42,168,242,0.08)" style="stroke" strokeWidth={8} strokeCap="round" />
          <Path path={segPath} color={activeColor} style="stroke" strokeWidth={1.8} strokeCap="round" strokeJoin="round" />
        </>
      )}
      {/* Line rubber band */}
      <Path path={rubberLinePath} color="rgba(42,168,242,0.4)" style="stroke" strokeWidth={1} strokeCap="round" />
      {/* Arc rubber band */}
      <Path path={rubberArcPath} color="rgba(0,229,160,0.5)" style="stroke" strokeWidth={1.5} strokeCap="round" />
      <Path path={arcCenterPath} color="rgba(0,229,160,0.3)" style="stroke" strokeWidth={0.8} strokeCap="round" />

      {polyPts.map((p, i) => {
        const isLast = i === polyPts.length - 1;
        const isFirst = i === 0 && polyPts.length >= 3;
        const isArcEnd = p.arcTo;
        return (
          <Group key={i}>
            {isFirst && (
              <Group>
                <Circle cx={p.x} cy={p.y} r={14} color="rgba(0,229,160,0.08)" />
                <Circle cx={p.x} cy={p.y} r={9} color={closeColor} style="stroke" strokeWidth={1.5} />
                <Circle cx={p.x} cy={p.y} r={3} color={closeColor} />
              </Group>
            )}
            {isArcEnd ? (
              <Group>
                <Circle cx={p.x} cy={p.y} r={8} color="rgba(0,229,160,0.12)" />
                <Circle cx={p.x} cy={p.y} r={5} color="#00E5A0" style="stroke" strokeWidth={1.5} />
                <Circle cx={p.x} cy={p.y} r={2} color="#00E5A0" />
              </Group>
            ) : isLast ? (
              <BlinkCircle x={p.x} y={p.y} r={6} color={activeColor} />
            ) : (
              <Circle cx={p.x} cy={p.y} r={3} color="rgba(42,168,242,0.6)" />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function PolylineCanvas({ registerRef, polyStarted, lastPolyXSV, lastPolyYSV, x1SV, y1SV, segModeSV }) {
  const [pts, setPts] = React.useState([]);
  React.useEffect(() => { registerRef.current = setPts; }, []);
  return (
    <PolylineOverlay
      polyPts={pts}
      polyStarted={polyStarted}
      lastPolyXSV={lastPolyXSV} lastPolyYSV={lastPolyYSV}
      x1SV={x1SV} y1SV={y1SV}
      activeColor={T.active} closeColor={T.success}
      segModeSV={segModeSV}
    />
  );
}

function FreehandPreview({ registerRef }) {
  const [pts, setPts] = React.useState([]);
  React.useEffect(() => { registerRef.current = setPts; }, []);
  if (pts.length < 2) return null;
  return <Path path={mkFreehand(pts)} color={T.shapePrimary} style="stroke" strokeWidth={1.8} strokeCap="round" strokeJoin="round" />;
}

function PolyStatusBar({ registerRef, onFinish, onSegModeToggle }) {
  const [pts, setPts] = React.useState(0);
  const [segMode, setSegMode] = React.useState("line");
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    registerRef.current = (count, mode, isActive) => {
      setPts(count);
      if (mode !== undefined) setSegMode(mode);
      setActive(isActive);
    };
  }, []);
  if (!active) return null;
  return (
    <>
      <View style={s.polyStatusPill}>
        <Text style={s.polyStatusText}>{pts} PTS</Text>
      </View>
      {/* Line / Arc toggle */}
      <TouchableOpacity
        style={[s.statusBtn, segMode === "arc" && s.statusBtnArc]}
        onPress={onSegModeToggle}
      >
        <Text style={[s.statusBtnText, segMode === "arc" && s.statusBtnTextArc]}>
          {segMode === "arc" ? "⌒ ARC" : "╱ LINE"}
        </Text>
      </TouchableOpacity>
      {pts >= 2 && (
        <TouchableOpacity style={[s.statusBtn, s.statusBtnDone]} onPress={onFinish}>
          <Text style={[s.statusBtnText, { color: T.success }]}>✓ DONE</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function StatusText({ registerRef }) {
  const [msg, setMsg] = React.useState("");
  React.useEffect(() => { registerRef.current = setMsg; }, []);
  if (!msg) return null;
  return <Text style={s.statusText}>· {msg}</Text>;
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR
// ═══════════════════════════════════════════════════════════════

const Toolbar = React.memo(function Toolbar({
  activeTool, onSelect,
  onUndo, onRedo, onClear,
  polygonSides, setPolygonSides,
  zoom, onZoomIn, onZoomOut, onZoomReset,
  defaultSize, setDefaultSize,
  snapEnabled, orthoEnabled, gridEnabled,
  onToggleSnap, onToggleOrtho, onToggleGrid,
  onShowLayers, onShowSettings,
  isDark,
}) {
  const bgColor = isDark ? "rgba(8,11,16,0.99)" : "rgba(250,251,254,0.99)";
  const borderClr = isDark ? "#1A2030" : "#D0D8E8";
  const titleClr = isDark ? "#E8F0FF" : "#111928";
  const subClr = isDark ? "#6B7A96" : "#7A8AAA";
  const inputBg = isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.9)";
  const accentClr = isDark ? "#A855F7" : "#7C3AED";
  const accentBg = isDark ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.10)";
  const accentBdr = isDark ? "rgba(168,85,247,0.55)" : "rgba(124,58,237,0.45)";

  return (
    <View style={[s.toolbar, { backgroundColor: bgColor, borderColor: borderClr }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.toolbarInner}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <React.Fragment key={group.id}>
            {gi > 0 && <View style={[s.toolSep, { backgroundColor: borderClr }]} />}
            <View style={s.toolGroup}>
              {group.tools.map(tool => {
                const isActive = activeTool === tool.key;

                return (
                  <TouchableOpacity
                    key={tool.key}
                    style={[
                      s.toolBtn,
                      { borderColor: borderClr, backgroundColor: inputBg },
                      isActive && {
                        backgroundColor: accentBg,
                        borderColor: accentBdr,
                      }
                    ]}
                    onPress={() => onSelect(tool.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.toolIcon,
                        { color: subClr },
                        isActive && { color: accentClr }
                      ]}
                    >
                      {tool.icon}
                    </Text>

                    <Text
                      style={[
                        s.toolLabel,
                        { color: subClr },
                        isActive && { color: accentClr }
                      ]}
                    >
                      {tool.label}
                    </Text>

                    {isActive && (
                      <View
                        style={[
                          s.toolActivePip,
                          { backgroundColor: accentClr }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </React.Fragment>
        ))}

        <View style={[s.toolSep, { backgroundColor: borderClr }]} />

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onUndo}>
          <Text style={[s.toolIcon, { color: titleClr }]}>↩</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onRedo}>
          <Text style={[s.toolIcon, { color: subClr }]}>↪</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Redo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, { borderColor: "rgba(240,64,64,0.3)" }]}
          onPress={onClear}
        >
          <Text style={[s.toolIcon, { color: "rgba(240,64,64,0.7)" }]}>⊘</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Clear</Text>
        </TouchableOpacity>

        <View style={[s.toolSep, { backgroundColor: borderClr }]} />

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onZoomOut}>
          <Text style={[s.toolIcon, { color: titleClr }]}>−</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Zoom−</Text>
        </TouchableOpacity>

        <View style={[s.zoomChip, { backgroundColor: inputBg, borderColor: borderClr }]}>
          <Text style={[s.zoomText, { color: titleClr }]}>
            {(zoom * 100).toFixed(0)}
            <Text style={[s.zoomPct, { color: subClr }]}>%</Text>
          </Text>
        </View>

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onZoomIn}>
          <Text style={[s.toolIcon, { color: titleClr }]}>+</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Zoom+</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onZoomReset}>
          <Text style={[s.toolIcon, { color: titleClr }]}>⊙</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Fit</Text>
        </TouchableOpacity>

        <View style={[s.toolSep, { backgroundColor: borderClr }]} />

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onShowLayers}>
          <Text style={[s.toolIcon, { color: titleClr }]}>≡</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Layers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.toolBtn, { borderColor: borderClr }]} onPress={onShowSettings}>
          <Text style={[s.toolIcon, { color: titleClr }]}>⚙</Text>
          <Text style={[s.toolLabel, { color: subClr }]}>Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {activeTool === "POLYGON" && (
        <View style={[s.sidesStrip, { backgroundColor: bgColor, borderColor: borderClr }]}>
          <Text style={[s.sidesLabel, { color: titleClr }]}>SIDES</Text>

          {[3, 4, 5, 6, 8, 10, 12, 16].map(n => (
            <TouchableOpacity
              key={n}
              style={[
                s.sideBtn,
                { borderColor: borderClr, backgroundColor: inputBg },
                polygonSides === n && {
                  backgroundColor: accentBg,
                  borderColor: accentBdr
                }
              ]}
              onPress={() => setPolygonSides(n)}
            >
              <Text
                style={[
                  s.sideBtnText,
                  { color: subClr },
                  polygonSides === n && { color: accentClr }
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});


// ═══════════════════════════════════════════════════════════════
// LAYERS PANEL
// ═══════════════════════════════════════════════════════════════

function LayersPanel({ layers, activeLayer, onSetActive, onToggleVisible, onToggleLock, onClose }) {
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.layersPanel} onPress={() => { }}>
          <View style={s.layersPanelHeader}>
            <Text style={s.layersPanelTitle}>LAYERS</Text>
            <TouchableOpacity onPress={onClose} style={s.layersCloseBtn}>
              <Text style={s.layersCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {layers.map(layer => (
            <View key={layer.id} style={[s.layerRow, activeLayer === layer.id && s.layerRowActive]}>
              <TouchableOpacity style={[s.layerColorDot, { backgroundColor: layer.color }]} onPress={() => onSetActive(layer.id)} />
              <TouchableOpacity style={s.layerName} onPress={() => onSetActive(layer.id)}>
                <Text style={[s.layerNameText, activeLayer === layer.id && s.layerNameTextActive]}>{layer.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.layerActionBtn} onPress={() => onToggleVisible(layer.id)}>
                <Text style={[s.layerActionIcon, !layer.visible && s.layerActionIconDim]}>◎</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.layerActionBtn} onPress={() => onToggleLock(layer.id)}>
                <Text style={[s.layerActionIcon, layer.locked && s.layerActionIconActive]}>⊠</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════

function SettingsPanel({
  snapEnabled, orthoEnabled, gridEnabled, isDark,
  onToggleSnap, onToggleOrtho, onToggleGrid, onToggleTheme,
  defaultSize, setDefaultSize,
  onClose,
}) {
  const rows = [
    { label: "Snap to Grid", value: snapEnabled, onToggle: onToggleSnap },
    { label: "Ortho Mode", value: orthoEnabled, onToggle: onToggleOrtho },
    { label: "Show Grid", value: gridEnabled, onToggle: onToggleGrid },
    { label: "Dark Theme", value: isDark, onToggle: onToggleTheme },
  ];
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.settingsPanel} onPress={() => { }}>
          <View style={s.layersPanelHeader}>
            <Text style={s.layersPanelTitle}>SETTINGS</Text>
            <TouchableOpacity onPress={onClose} style={s.layersCloseBtn}><Text style={s.layersCloseBtnText}>✕</Text></TouchableOpacity>
          </View>
          {rows.map(r => (
            <View key={r.label} style={s.settingRow}>
              <Text style={s.settingLabel}>{r.label}</Text>
              <Switch value={r.value} onValueChange={r.onToggle} trackColor={{ false: T.surface3, true: T.activeBg }} thumbColor={r.value ? T.active : T.textDim} />
            </View>
          ))}
          <View style={s.settingDivider} />
          <Text style={s.settingSectionTitle}>DEFAULT SIZE</Text>
          {[{ k: "w", label: "Width" }, { k: "h", label: "Height" }, { k: "r", label: "Radius" }].map(item => (
            <View key={item.k} style={s.settingInputRow}>
              <Text style={s.settingLabel}>{item.label}</Text>
              <View style={s.settingInput}>
                <TextInput
                  style={s.settingInputText}
                  value={String(defaultSize[item.k])}
                  onChangeText={v => setDefaultSize(p => ({ ...p, [item.k]: parseFloat(v) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor={T.textDim}
                />
                <Text style={s.settingUnit}>mm</Text>
              </View>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDIT MODE OVERLAY
// ═══════════════════════════════════════════════════════════════

function EditModeOverlay({ shapes, selectedId, onDeleteShape, zoom, width, height, editMoveMode, onSetEditMoveMode }) {
  const canvasH = height - 60;
  return (
    <>
      {selectedId && shapes.find(s => s.id === selectedId)?.type === "LINE" && (
        <View style={s.editMoveModeBar}>
          <Text style={s.editMoveModeTitle}>MOVE:</Text>
          {[{ k: "whole", l: "⊞ Whole" }, { k: "segment", l: "↔ Segment" }].map(opt => (
            <TouchableOpacity
              key={opt.k}
              style={[s.editModeBtn, editMoveMode === opt.k && s.editModeBtnActive]}
              onPress={() => onSetEditMoveMode(opt.k)}
            >
              <Text style={[s.editModeBtnText, editMoveMode === opt.k && s.editModeBtnTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {shapes.map(shape => {
        let cx = 0, cy = 0;
        if (shape.type === "LINE") { cx = (shape.p1.x + shape.p2.x) / 2; cy = (shape.p1.y + shape.p2.y) / 2; }
        else if (shape.type === "RECTANGLE") { cx = shape.x + shape.w / 2; cy = shape.y + shape.h / 2; }
        else if (shape.center) { cx = shape.center.x; cy = shape.center.y; }
        else if (shape.p1 && shape.p2) { cx = (shape.p1.x + shape.p2.x) / 2; cy = (shape.p1.y + shape.p2.y) / 2; }
        else return null;
        const screenX = cx * zoom + width / 2;
        const screenY = cy * zoom + canvasH / 2;
        return (
          <TouchableOpacity
            key={`del-${shape.id}`}
            style={[s.editDeleteHandle, { left: screenX - 11, top: screenY - 11 }]}
            onPress={() => onDeleteShape(shape.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.editDeleteIcon}>✕</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// INLINE DIM OVERLAYS
// ═══════════════════════════════════════════════════════════════

function InlineDimOverlays({
  shapes, selectedId, inlineEditId, editModeEnabled,
  zoom, width, height,
  inlineDimTexts, onDimChange, onDimCommit,
  onFocus,
}) {
  const canvasH = height - 60;
  return (
    <>
      {shapes.map(shape => {
        const isSelected = shape.id === selectedId;
        const isInlineEdit = shape.id === inlineEditId;
        const shouldShow = editModeEnabled ? true : (isSelected || isInlineEdit);
        if (!shouldShow) return null;
        const dims = getInlineDims(shape);
        if (!dims.length) return null;
        const BOX_W = 82, BOX_H = 26;
        return dims.map(dim => {
          const screenX = dim.x * zoom + width / 2;
          const screenY = dim.y * zoom + canvasH / 2;
          return (
            <View
              key={`${shape.id}-${dim.key}`}
              style={[s.dimWrap, { left: screenX - BOX_W / 2, top: screenY - BOX_H / 2 }]}
            >
              <View style={[s.dimBox, isSelected && s.dimBoxSelected, isInlineEdit && s.dimBoxActive]}>
                {dim.label ? <Text style={s.dimLabel}>{dim.label}</Text> : null}
                <TextInput
                  style={s.dimInput}
                  value={inlineDimTexts[`${shape.id}-${dim.key}`] ?? dim.value}
                  onChangeText={v => onDimChange(shape.id, dim.key, v)}
                  onSubmitEditing={e => onDimCommit(shape.id, dim.key, e.nativeEvent.text)}
                  onFocus={() => onFocus(shape.id)}
                  onBlur={e => onDimCommit(shape.id, dim.key, e.nativeEvent.text)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  returnKeyType="done"
                  placeholderTextColor={T.textDim}
                />
              </View>
              <View style={[s.dimTick, dim.horizontal ? s.dimTickDown : s.dimTickRight]} />
            </View>
          );
        });
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

export default function SketchScreen({ navigation }) {
  const [shapes, setShapes] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [activeTool, setActiveTool] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [polygonSides, setPolygonSides] = useState(6);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [arcStep, setArcStep] = useState(null);
  const [polySegMode, setPolySegMode] = useState("line");
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [editMoveMode, setEditMoveMode] = useState("whole");
  const [isDark, setIsDark] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [activeLayer, setActiveLayer] = useState("L1");
  const [showLayers, setShowLayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoCloseTarget, setAutoCloseTarget] = useState(null);
  const [coincidentPts, setCoincidentPts] = useState([]);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [defaultSize, setDefaultSize] = useState({ w: 100, h: 80, r: 50 });
  const [polyStarted, setPolyStarted] = useState(false);
  const [inlineDimTexts, setInlineDimTexts] = useState({});
  const [shapeCount, setShapeCount] = useState(0);
  const [defaultGeomCreated, setDefaultGeomCreated] = useState(false);
  // ── Edit operation state ────────────────────────────────────
  const [copyOffset, setCopyOffset] = useState({ x: 20, y: 20 });
  const [rotateAngle, setRotateAngle] = useState(0);
  const [rotateOrigin, setRotateOrigin] = useState(null);
  const [scaleFactorX, setScaleFactorX] = useState(1);
  const [scaleFactorY, setScaleFactorY] = useState(1);
  const [mirrorAxis, setMirrorAxis] = useState("vertical");
  const [mirrorLine, setMirrorLine] = useState(null);
  const [offsetDist, setOffsetDist] = useState(10);
  const [filletRadius, setFilletRadius] = useState(5);
  const [chamferDist, setChamferDist] = useState(5);
  const [trimBoundary, setTrimBoundary] = useState(null);
  const [extendTarget, setExtendTarget] = useState(null);
  const [editOpStep, setEditOpStep] = useState(0);
  const [editOpPreview, setEditOpPreview] = useState(null);
  const [stretchWindow, setStretchWindow] = useState(null);
  const [stretchPhase, setStretchPhase] = useState("select");
  const [extrudeShape, setExtrudeShape] = useState(null);
  // ── Live arc segment state ─────────────────────────────────
  const [arcLiveInfo, setArcLiveInfo] = useState(null);
  const arcRadiusOverride = useRef(null);
  const { width, height } = useWindowDimensions();
  applyTheme(isDark);

  // ── Shared values ──────────────────────────────────────────
  const toolSV = useSharedValue("LINE");
  const x0SV = useSharedValue(0);
  const y0SV = useSharedValue(0);
  const x1SV = useSharedValue(0);
  const y1SV = useSharedValue(0);
  const draggingSV = useSharedValue(false);
  const snapOriginSV = useSharedValue(false);
  const sidesSV = useSharedValue(6);
  const snapOnSV = useSharedValue(true);
  const arcCenterSV = useSharedValue(null);
  const arcP1SV = useSharedValue(null);
  const kpSV = useSharedValue([]);
  const movingSV = useSharedValue(false);
  const moveDxSV = useSharedValue(0);
  const moveDySV = useSharedValue(0);
  const selectedIdSV = useSharedValue(null);
  const selectedShapeSV = useSharedValue(null);
  const zoomSV = useSharedValue(1);
  const coordXSV = useSharedValue(0);
  const coordYSV = useSharedValue(0);
  const polyStartedSV = useSharedValue(false);
  const lastPolyXSV = useSharedValue(0);
  const lastPolyYSV = useSharedValue(0);
  // FIX: shared values for stretch phase (readable on UI thread)
  const stretchPhaseSV = useSharedValue("select");
  const stretchX0SV = useSharedValue(0);
  const stretchY0SV = useSharedValue(0);

  // ── Refs ───────────────────────────────────────────────────
  const shapesRef = useRef(shapes);
  const snapEnabledRef = useRef(snapEnabled);
  const orthoEnabledRef = useRef(orthoEnabled);
  const polygonSidesRef = useRef(polygonSides);
  const arcStepRef = useRef(null);
  const polyPtsRef = useRef([]);
  const polySegModeRef = useRef("line");
  const freehandRef = useRef([]);
  const selectedIdRef = useRef(null);
  const editModeRef = useRef(false);
  const editMoveModeRef = useRef("whole");
  const dragEndpointRef = useRef(null);
  const cb = useRef({});

  const polyRegisterRef = useRef(null);
  const statusRegisterRef = useRef(null);
  const freehandRegisterRef = useRef(null);
  const polyStatusRegRef = useRef(null);
  shapesRef.current = shapes;
  snapEnabledRef.current = snapEnabled;
  orthoEnabledRef.current = orthoEnabled;
  polygonSidesRef.current = polygonSides;
  selectedIdRef.current = selectedId;
  polySegModeRef.current = polySegMode;
  editModeRef.current = editModeEnabled;
  editMoveModeRef.current = editMoveMode;

  useEffect(() => {
    selectedIdSV.value = selectedId;
    const sel = selectedId ? shapesRef.current.find(s => s.id === selectedId) ?? null : null;
    selectedShapeSV.value = sel ? JSON.parse(JSON.stringify(sel)) : null;
  }, [selectedId]);
  useEffect(() => { toolSV.value = activeTool; }, [activeTool]);
  useEffect(() => { sidesSV.value = polygonSides; }, [polygonSides]);
  useEffect(() => { snapOnSV.value = snapEnabled; }, [snapEnabled]);
  useEffect(() => { zoomSV.value = zoom; }, [zoom]);
  // FIX: keep stretchPhaseSV in sync so gesture worklet can read it
  useEffect(() => { stretchPhaseSV.value = stretchPhase; }, [stretchPhase]);

  const coincTimerRef = useRef(null);
  useEffect(() => {
    kpSV.value = flatKP(shapes);
    const sel = selectedId ? shapes.find(s => s.id === selectedId) ?? null : null;
    selectedShapeSV.value = sel ? JSON.parse(JSON.stringify(sel)) : null;
    setShapeCount(shapes.length);
    clearTimeout(coincTimerRef.current);
    coincTimerRef.current = setTimeout(() => setCoincidentPts(findCoincidentPairs(shapes)), 150);
    return () => clearTimeout(coincTimerRef.current);
  }, [shapes, selectedId]);

  useEffect(() => {
    const drawableTools = ["RECTANGLE", "CIRCLE", "POLYGON", "LINE", "ARC", "ELLIPSE"];
    if (drawableTools.includes(activeTool) && !defaultGeomCreated) {
      const defaultShape = getDefaultGeometryShape(activeTool, defaultSize, polygonSides);
      if (defaultShape) {
        const id = `DEFAULT_${activeTool}_${Date.now()}`;
        setShapes(prev => [...prev, { ...defaultShape, id, layer: activeLayer }]);
        setSelectedId(id);
        setDefaultGeomCreated(true);
      }
    }
  }, [activeTool, defaultGeomCreated, defaultSize, polygonSides]);

  useEffect(() => {
    if (editModeEnabled && activeTool !== "SELECT" && activeTool !== "MOVE")
      setEditModeEnabled(false);
  }, [activeTool]);

  useEffect(() => {
    if (polySegMode !== "arc") setArcLiveInfo(null);
  }, [polySegMode]);

  const pushHistory = useCallback((newShapes) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, newShapes];
    });
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const snapJ = useCallback((rx, ry) => snapJS(rx, ry, shapesRef.current, snapEnabledRef.current), []);
  const orthoConstrain = useCallback((ax, ay, bx, by) => {
    if (!orthoEnabledRef.current) return { x: bx, y: by };
    const dx = bx - ax, dy = by - ay;
    const ang = Math.atan2(dy, dx);
    const snappedAng = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    return { x: ax + len * Math.cos(snappedAng), y: ay + len * Math.sin(snappedAng) };
  }, []);

  const commit = useCallback((shape) => {
    if (!shape) return;
    draggingSV.value = false;
    const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newShape = { ...shape, id, layer: activeLayer };
    setShapes(prev => {
      const next = [...prev.filter(s => !s.id.toString().startsWith("DEFAULT_")), newShape];
      return next;
    });
    setSelectedId(id);
    statusRegisterRef.current?.("");
    setAutoCloseTarget(null);
    setDefaultGeomCreated(true);
    setArcLiveInfo(null);
    arcRadiusOverride.current = null;
  }, [activeLayer]);

  const updateAutoClose = useCallback((x, y) => {
    const target = findNearestTerminal(x, y, shapesRef.current, null, AUTO_CLOSE_R);
    setAutoCloseTarget(target ? { x: target.x, y: target.y } : null);
  }, []);

  const updateArcLiveInfo = useCallback((ax, ay, ex, ey) => {
    const chord = Math.hypot(ex - ax, ey - ay);
    if (chord < 2) { setArcLiveInfo(null); return; }
    let radius;
    if (arcRadiusOverride.current !== null) {
      radius = arcRadiusOverride.current;
    }
    const mx = (ax + ex) / 2 - (ey - ay) * 0.35;
    const my = (ay + ey) / 2 + (ex - ax) * 0.35;
    const D = 2 * (ax * (my - ey) + mx * (ey - ay) + ex * (ay - my));
    if (Math.abs(D) < 1e-6) { setArcLiveInfo(null); return; }
    const ux = ((ax * ax + ay * ay) * (my - ey) + (mx * mx + my * my) * (ey - ay) + (ex * ex + ey * ey) * (ay - my)) / D;
    const uy = ((ax * ax + ay * ay) * (ex - mx) + (mx * mx + my * my) * (ax - ex) + (ex * ex + ey * ey) * (mx - ax)) / D;
    const r = Math.hypot(ax - ux, ay - uy);
    setArcLiveInfo({ cx: ux, cy: uy, radius: radius ?? r });
  }, []);

  const resetPolyState = useCallback(() => {
    polyPtsRef.current = [];
    polyRegisterRef.current?.([]);
    setPolySegMode("line"); polySegModeRef.current = "line";
    freehandRef.current = [];
    freehandRegisterRef.current?.([]);
    statusRegisterRef.current?.("");
    polyStatusRegRef.current?.(0, "line", false);
    setPolyStarted(false); polyStartedSV.value = false;
    setArcLiveInfo(null);
    arcRadiusOverride.current = null;
  }, []);

  const undo = useCallback(() => {
    if (historyIdx > 0) { const prev = history[historyIdx - 1]; setShapes(prev); setHistoryIdx(i => i - 1); }
    else { setShapes(p => p.slice(0, -1)); }
    setSelectedId(null); resetPolyState(); setArcStep(null); arcStepRef.current = null;
    setAutoCloseTarget(null); movingSV.value = false;
  }, [history, historyIdx, resetPolyState]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) { const next = history[historyIdx + 1]; setShapes(next); setHistoryIdx(i => i + 1); }
  }, [history, historyIdx]);

  const clear = useCallback(() => {
    setShapes([]); setSelectedId(null); resetPolyState();
    setArcStep(null); arcStepRef.current = null;
    setAutoCloseTarget(null); movingSV.value = false;
  }, [resetPolyState]);

  const DRAWABLE = ["RECTANGLE", "CIRCLE", "ELLIPSE", "POLYGON", "TRIANGLE", "STAR", "SLOT", "LINE", "ARC", "CLOUD"];

  const selectTool = useCallback((t) => {
    if (activeTool !== t && DRAWABLE.includes(activeTool))
      setShapes(prev => prev.filter(s => !s.id.toString().startsWith("DEFAULT_") || s.id === selectedId));

    const wasPolyInProgress =
      (activeTool === "POLYLINE" || activeTool === "SPLINE") &&
      polyStartedSV.value &&
      polyPtsRef.current.length > 0;
    const lastPolyPt = wasPolyInProgress
      ? { ...polyPtsRef.current[polyPtsRef.current.length - 1] }
      : null;

    setActiveTool(t);
    if (t !== "MOVE" && t !== "SELECT") setSelectedId(null);
    draggingSV.value = false; resetPolyState(); setArcStep(null); arcStepRef.current = null;
    setAutoCloseTarget(null); movingSV.value = false;
    if (t !== "MOVE") setDefaultGeomCreated(false);

    setTrimBoundary(null);
    setExtendTarget(null);
    setStretchWindow(null);
    setStretchPhase("select");
    stretchPhaseSV.value = "select"; // FIX: keep SV in sync on tool change
    setMirrorLine(null);

    if (lastPolyPt && DRAWABLE.includes(t)) {
      x0SV.value = lastPolyPt.x;
      y0SV.value = lastPolyPt.y;
      x1SV.value = lastPolyPt.x;
      y1SV.value = lastPolyPt.y;
      snapOriginSV.value = true;
    }

    const EDIT_HINTS = {
      COPY: "Select shape, then tap canvas to place copy",
      ROTATE: "Select shape, set angle, tap Apply",
      SCALE: "Select shape, set scale, tap Apply",
      MIRROR: "Select shape, choose axis, tap Apply",
      OFFSET: "Select shape, set distance, tap Apply",
      TRIM: "Tap boundary line, then tap segment to remove",
      EXTEND: "Tap boundary line, then tap line to extend",
      STRETCH: "Drag a window around points, then drag to stretch",
      FILLET: "Tap first line, then second line",
      CHAMFER: "Tap first line, then second line",
    };
    if (EDIT_HINTS[t]) statusRegisterRef.current?.(EDIT_HINTS[t]);
  }, [activeTool, selectedId, resetPolyState]);

  const zoomIn = useCallback(() => setZoom(z => Math.min(z * ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z / ZOOM_STEP, MIN_ZOOM)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  const panelShape = shapes.find(s => s.id === selectedId) ?? null;
  const onPanelUpdate = useCallback(upd => setShapes(p => p.map(s => s.id === upd.id ? upd : s)), []);
  const onPanelDelete = useCallback(() => {
    setShapes(p => p.filter(s => s.id !== selectedId)); setSelectedId(null);
  }, [selectedId]);

  const handleInlineDimChange = useCallback((shapeId, key, rawVal) => {
    setInlineDimTexts(p => ({ ...p, [`${shapeId}-${key}`]: rawVal }));
  }, []);
  const handleInlineDimCommit = useCallback((shapeId, key, rawVal) => {
    const v = parseFloat(rawVal);
    if (isNaN(v) || v <= 0) return;
    setShapes(prev => applyEditWithConnections(prev, shapeId, key, String(v)));
    setInlineDimTexts(p => { const n = { ...p }; delete n[`${shapeId}-${key}`]; return n; });
  }, []);

  // ── Extrude handlers ───────────────────────────────────────
  const handleExtrudePress = useCallback((shape) => { setExtrudeShape(shape); }, []);

  const handleExtrudeConfirm = useCallback((shape, depth, mode) => {
    setExtrudeShape(null);
    const shape2D = {
      id: shape.id, type: shape.type, layer: shape.layer ?? "L1",
      ...getShapePayload(shape),
      extrudeDepth: depth, extrudeMode: mode,
      label: getShapeSummary(shape), timestamp: Date.now(),
    };
    if (navigation) navigation.navigate("ToThreeDScreen", { shape2D });
    else { console.log("[CADSketch] Extrude →", JSON.stringify(shape2D, null, 2)); alert(`Would navigate to ToThreeD with:\n${JSON.stringify(shape2D, null, 2)}`); }
  }, [navigation]);

  const handleExtrudeCancel = useCallback(() => { setExtrudeShape(null); }, []);

  // ═══════════════════════════════════════════════════════════════
  // EDIT OPERATION HANDLERS
  // ═══════════════════════════════════════════════════════════════

  /** COPY — triggered on canvas tap while COPY tool is active */
  const handleCopyPlace = useCallback((canvasX, canvasY) => {
    // FIX: use selectedIdRef.current — never stale
    const sid = selectedIdRef.current;
    if (!sid) { statusRegisterRef.current?.("Select a shape first"); return; }
    const shape = shapesRef.current.find(s => s.id === sid);
    if (!shape) return;
    const src = shapeCentroid(shape);
    const dx = canvasX - src.x, dy = canvasY - src.y;
    const copy = translateShape(shape, dx, dy);
    const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setShapes(prev => [...prev, { ...copy, id }]);
    setSelectedId(id);
    statusRegisterRef.current?.("Copied — tap again to place another");
  }, []);

  /** ROTATE */
  const handleRotateApply = useCallback((originPt = null) => {
    const sid = selectedIdRef.current;
    if (!sid) return;
    setShapes(prev => prev.map(s => {
      if (s.id !== sid) return s;
      const origin = originPt ?? shapeCentroid(s);
      return { ...rotateShape(s, origin, rotateAngle), id: s.id, layer: s.layer };
    }));
    statusRegisterRef.current?.(`Rotated ${rotateAngle}°`);
  }, [rotateAngle]);

  /** SCALE */
  const handleScaleApply = useCallback(() => {
    const sid = selectedIdRef.current;
    if (!sid) return;
    setShapes(prev => prev.map(s => {
      if (s.id !== sid) return s;
      const origin = shapeCentroid(s);
      return { ...scaleShape(s, origin, scaleFactorX, scaleFactorY), id: s.id, layer: s.layer };
    }));
    statusRegisterRef.current?.(`Scaled ${scaleFactorX}×${scaleFactorY}`);
  }, [scaleFactorX, scaleFactorY]);

  /** MIRROR */
  const handleMirrorApply = useCallback(() => {
    const sid = selectedIdRef.current;
    if (!sid) return;
    const shape = shapesRef.current.find(s => s.id === sid);
    if (!shape) return;
    const c = shapeCentroid(shape);
    let p1, p2;
    if (mirrorAxis === "vertical") { p1 = { x: c.x, y: c.y - 500 }; p2 = { x: c.x, y: c.y + 500 }; }
    else if (mirrorAxis === "horizontal") { p1 = { x: c.x - 500, y: c.y }; p2 = { x: c.x + 500, y: c.y }; }
    else if (mirrorLine) { p1 = mirrorLine.p1; p2 = mirrorLine.p2; }
    else { statusRegisterRef.current?.("Draw a mirror line first"); return; }
    const mirrored = mirrorShape(shape, p1, p2);
    const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setShapes(prev => [...prev, { ...mirrored, id, layer: shape.layer }]);
    setSelectedId(id);
    statusRegisterRef.current?.("Mirrored");
  }, [mirrorAxis, mirrorLine]);

  /** OFFSET */
  const handleOffsetApply = useCallback(() => {
    const sid = selectedIdRef.current;
    if (!sid) return;
    const shape = shapesRef.current.find(s => s.id === sid);
    if (!shape) return;
    const off = offsetShape(shape, offsetDist);
    const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setShapes(prev => [...prev, { ...off, id, layer: shape.layer }]);
    setSelectedId(id);
    statusRegisterRef.current?.(`Offset ${offsetDist}mm`);
  }, [offsetDist]);

  /** FILLET */
  const handleFilletApply = useCallback((lineAId, lineBId) => {
    const lines = shapesRef.current.filter(s => s.id === lineAId || s.id === lineBId);
    if (lines.length < 2) { statusRegisterRef.current?.("Select two intersecting lines"); return; }
    const result = computeFillet(lines[0], lines[1], filletRadius);
    if (!result) { statusRegisterRef.current?.("Lines don't intersect"); return; }
    const arcId = `shape_${Date.now()}_arc`;
    setShapes(prev => [
      ...prev.filter(s => s.id !== lineAId && s.id !== lineBId),
      { ...result.line1, id: lineAId },
      { ...result.line2, id: lineBId },
      { ...result.arc, id: arcId, layer: lines[0].layer },
    ]);
    statusRegisterRef.current?.(`Fillet R${filletRadius}mm applied`);
  }, [filletRadius]);

  /** CHAMFER */
  const handleChamferApply = useCallback((lineAId, lineBId) => {
    const lines = shapesRef.current.filter(s => s.id === lineAId || s.id === lineBId);
    if (lines.length < 2) { statusRegisterRef.current?.("Select two intersecting lines"); return; }
    const result = computeChamfer(lines[0], lines[1], chamferDist);
    if (!result) { statusRegisterRef.current?.("Lines don't intersect"); return; }
    const chamId = `shape_${Date.now()}_cham`;
    setShapes(prev => [
      ...prev.filter(s => s.id !== lineAId && s.id !== lineBId),
      { ...result.line1, id: lineAId },
      { ...result.line2, id: lineBId },
      { ...result.chamferLine, id: chamId, layer: lines[0].layer },
    ]);
    statusRegisterRef.current?.(`Chamfer ${chamferDist}mm applied`);
  }, [chamferDist]);

  // FIX: TRIM — snap the point, guard null trimLine result
  const handleTrimTap = useCallback((canvasX, canvasY) => {
    const pt = snapJ(canvasX, canvasY); // FIX: snap the incoming point
    if (!trimBoundary) {
      const found = shapesRef.current.find(s => hitTest(s, pt));
      if (found) {
        setTrimBoundary(found.id);
        statusRegisterRef.current?.("Tap the segment to remove");
      } else {
        statusRegisterRef.current?.("Tap a line to use as boundary");
      }
      return;
    }
    const boundary = shapesRef.current.find(s => s.id === trimBoundary);
    const target = shapesRef.current.find(s => s.id !== trimBoundary && hitTest(s, pt));
    if (!target || !boundary) {
      // FIX: don't silently reset — give feedback, let user retry
      statusRegisterRef.current?.("Missed — tap the segment to remove");
      return;
    }
    if (target.type !== "LINE" || boundary.type !== "LINE") {
      statusRegisterRef.current?.("Trim works on lines only");
      setTrimBoundary(null);
      return;
    }
    const trimmed = trimLine(target, boundary, pt);
    // FIX: guard null result from trimLine
    if (!trimmed) {
      statusRegisterRef.current?.("No intersection — try again");
      setTrimBoundary(null);
      return;
    }
    setShapes(prev => prev.map(s => s.id === target.id ? { ...trimmed, id: s.id } : s));
    setTrimBoundary(null);
    statusRegisterRef.current?.("Trimmed ✓");
  }, [trimBoundary, snapJ]);

  // FIX: EXTEND — snap the point, guard null extendLine result
  const handleExtendTap = useCallback((canvasX, canvasY) => {
    const pt = snapJ(canvasX, canvasY); // FIX: snap the incoming point
    if (!extendTarget) {
      const found = shapesRef.current.find(s => hitTest(s, pt));
      if (found) {
        setExtendTarget(found.id);
        statusRegisterRef.current?.("Tap the line to extend");
      } else {
        statusRegisterRef.current?.("Tap a line to extend TO");
      }
      return;
    }
    const boundary = shapesRef.current.find(s => s.id === extendTarget);
    const target = shapesRef.current.find(s => s.id !== extendTarget && hitTest(s, pt));
    if (!target || !boundary) {
      // FIX: don't reset on miss — let user retry second tap
      statusRegisterRef.current?.("Missed — tap the line to extend");
      return;
    }
    if (target.type !== "LINE" || boundary.type !== "LINE") {
      statusRegisterRef.current?.("Extend works on lines only");
      setExtendTarget(null);
      return;
    }
    const extended = extendLine(target, boundary);
    // FIX: guard null result from extendLine
    if (!extended) {
      statusRegisterRef.current?.("Lines are parallel — cannot extend");
      setExtendTarget(null);
      return;
    }
    setShapes(prev => prev.map(s => s.id === target.id ? { ...extended, id: s.id } : s));
    setExtendTarget(null);
    statusRegisterRef.current?.("Extended ✓");
  }, [extendTarget, snapJ]);

  // FIX: STRETCH — these are now wired to gesture handlers below
  const handleStretchWindow = useCallback((x, y, w, h) => {
    if (w < 4 || h < 4) return; // ignore accidental micro-drags
    setStretchWindow({ x, y, w, h });
    setStretchPhase("drag");
    stretchPhaseSV.value = "drag"; // keep SV in sync immediately
    statusRegisterRef.current?.("Now drag to stretch the selected points");
  }, []);

  const handleStretchApply = useCallback((x0, y0, x1, y1) => {
    if (!stretchWindow) return;
    const dx = x1 - x0, dy = y1 - y0;
    setShapes(prev => prev.map(s => stretchShape(s, stretchWindow, dx, dy)));
    setStretchWindow(null);
    setStretchPhase("select");
    stretchPhaseSV.value = "select";
    statusRegisterRef.current?.("Stretched ✓");
  }, [stretchWindow]);

  // ── Callbacks ───────────────────────────────────────────────
  const onEndRef = useRef(null);
  const onTapRef = useRef(null);
  const onDblTapRef = useRef(null);
  const onMoveEndRef = useRef(null);

  onEndRef.current = (rx, ry) => {
    const tool = toolSV.value;
    draggingSV.value = false;
    if (tool === "FREEHAND") {
      const pts = freehandRef.current;
      if (pts.length >= 3) commit({ type: "FREEHAND", points: [...pts] });
      freehandRef.current = []; freehandRegisterRef.current?.([]); return;
    }
    if (tool === "SELECT" || tool === "ERASER" || tool === "POLYLINE" || tool === "SPLINE" || tool === "MOVE") return;
    const pt = snapJ(rx, ry);
    const ax = x0SV.value, ay = y0SV.value;
    let bx = pt.x, by = pt.y;
    if (orthoEnabledRef.current && (tool === "LINE" || tool === "RECTANGLE")) {
      const oc = orthoConstrain(ax, ay, bx, by); bx = oc.x; by = oc.y;
    }
    if (tool === "ARC") {
      if (!arcStepRef.current) {
        const ns = { center: { x: ax, y: ay }, p1: { x: bx, y: by } };
        arcStepRef.current = ns; arcCenterSV.value = ns.center; arcP1SV.value = ns.p1;
        setArcStep(ns); statusRegisterRef.current?.("Tap to set arc endpoint");
      } else {
        const full = { type: "ARC", center: arcStepRef.current.center, p1: arcStepRef.current.p1, p2: { x: bx, y: by } };
        arcStepRef.current = null; arcCenterSV.value = null; arcP1SV.value = null;
        setArcStep(null); commit(full);
      }
      return;
    }
    const closeTarget = findNearestTerminal(bx, by, shapesRef.current, null, AUTO_CLOSE_R);
    const fx = closeTarget ? closeTarget.x : bx;
    const fy = closeTarget ? closeTarget.y : by;
    setAutoCloseTarget(null);
    const d = Math.hypot(fx - ax, fy - ay);
    if ((tool === "LINE" || tool === "DIMENSION") && d < 4) return;
    if ((tool === "CIRCLE" || tool === "POLYGON" || tool === "TRIANGLE" || tool === "STAR") && d < 4) return;
    if (tool === "RECTANGLE" && (Math.abs(bx - ax) < 4 || Math.abs(by - ay) < 4)) return;
    let shape = null;
    if (tool === "LINE") shape = { type: "LINE", p1: { x: ax, y: ay }, p2: { x: fx, y: fy } };
    else if (tool === "RECTANGLE") shape = { type: "RECTANGLE", x: Math.min(ax, fx), y: Math.min(ay, fy), w: Math.abs(fx - ax), h: Math.abs(fy - ay) };
    else if (tool === "CIRCLE") shape = { type: "CIRCLE", center: { x: ax, y: ay }, radius: d };
    else if (tool === "ELLIPSE") shape = { type: "ELLIPSE", center: { x: (ax + bx) / 2, y: (ay + by) / 2 }, rx: Math.abs(bx - ax) / 2, ry: Math.abs(by - ay) / 2 };
    else if (tool === "TRIANGLE") shape = { type: "TRIANGLE", center: { x: ax, y: ay }, radius: d };
    else if (tool === "STAR") shape = { type: "STAR", center: { x: ax, y: ay }, outerR: d, innerR: d * 0.4, points: polygonSidesRef.current };
    else if (tool === "SLOT") shape = { type: "SLOT", p1: { x: ax, y: ay }, p2: { x: fx, y: fy }, radius: d * 0.25 };
    else if (tool === "CLOUD") shape = { type: "CLOUD", p1: { x: ax, y: ay }, p2: { x: fx, y: fy } };
    else if (tool === "POLYGON") shape = { type: "POLYGON", center: { x: ax, y: ay }, radius: d, sides: polygonSidesRef.current };
    else if (tool === "DIMENSION") shape = { type: "DIMENSION", p1: { x: ax, y: ay }, p2: { x: fx, y: fy } };
    commit(shape);
  };

  // FIX: COPY/TRIM/EXTEND moved ABOVE the SELECT block so they fire before
  // the fallthrough SELECT logic can deselect the current shape.
  onTapRef.current = (rx, ry) => {
    const tool = toolSV.value;
    const pt = snapJ(rx, ry);

    // ── Edit tool taps (must come before SELECT handler) ──────
    if (tool === "COPY") { handleCopyPlace(pt.x, pt.y); return; }
    if (tool === "TRIM") { handleTrimTap(pt.x, pt.y); return; }
    if (tool === "EXTEND") { handleExtendTap(pt.x, pt.y); return; }

    if (tool === "FILLET" || tool === "CHAMFER") {
      let found = null;
      for (let i = shapesRef.current.length - 1; i >= 0; i--)
        if (hitTest(shapesRef.current[i], pt) && shapesRef.current[i].type === "LINE") {
          found = shapesRef.current[i].id; break;
        }
      if (!found) return;
      // FIX: use selectedIdRef.current — never stale in async callback
      if (!selectedIdRef.current) {
        setSelectedId(found);
        statusRegisterRef.current?.("Now tap the second line");
        return;
      }
      if (tool === "FILLET") handleFilletApply(selectedIdRef.current, found);
      if (tool === "CHAMFER") handleChamferApply(selectedIdRef.current, found);
      setSelectedId(null);
      return;
    }

    // ── SELECT / MOVE ─────────────────────────────────────────
    if (tool === "SELECT" || tool === "MOVE") {
      let found = null;
      for (let i = shapesRef.current.length - 1; i >= 0; i--)
        if (hitTest(shapesRef.current[i], pt)) { found = shapesRef.current[i].id; break; }
      setSelectedId(found);
      return;
    }

    if (tool === "ERASER") {
      setShapes(p => p.filter(s => !hitTest(s, pt)));
      return;
    }
  };

  const finishPoly = useCallback(() => {
    const pts = polyPtsRef.current;
    if (pts.length >= 2) {
      const type = activeTool === "SPLINE" ? "SPLINE" : "POLYLINE";
      const hasArcs = pts.some(p => p.arcTo);
      commit({ type, points: [...pts], closed: false, hasArcs });
    }
    polyPtsRef.current = []; polyRegisterRef.current?.([]);
    setPolySegMode("line"); polySegModeRef.current = "line";
    statusRegisterRef.current?.(""); polyStatusRegRef.current?.(0, "line", false);
    setPolyStarted(false); polyStartedSV.value = false;
    x0SV.value = 0; y0SV.value = 0;
    setArcLiveInfo(null); arcRadiusOverride.current = null;
  }, [commit, activeTool]);

  const computeArcSegment = useCallback((x1, y1, x2, y2) => {
    const chord = Math.hypot(x2 - x1, y2 - y1);
    if (chord < 2) return null;
    let ux, uy, r;
    if (arcRadiusOverride.current !== null && arcRadiusOverride.current >= chord / 2) {
      r = arcRadiusOverride.current;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const nx = -dy / chord, ny = dx / chord;
      const h = Math.sqrt(Math.max(0, r * r - (chord / 2) * (chord / 2)));
      ux = mx + nx * h;
      uy = my + ny * h;
    } else {
      const mx = (x1 + x2) / 2 - (y2 - y1) * 0.35;
      const my = (y1 + y2) / 2 + (x2 - x1) * 0.35;
      const D = 2 * (x1 * (my - y2) + mx * (y2 - y1) + x2 * (y1 - my));
      if (Math.abs(D) < 1e-6) return null;
      ux = ((x1 * x1 + y1 * y1) * (my - y2) + (mx * mx + my * my) * (y2 - y1) + (x2 * x2 + y2 * y2) * (y1 - my)) / D;
      uy = ((x1 * x1 + y1 * y1) * (x2 - mx) + (mx * mx + my * my) * (x1 - x2) + (x2 * x2 + y2 * y2) * (mx - x1)) / D;
      r = Math.hypot(x1 - ux, y1 - uy);
    }
    const startA = Math.atan2(y1 - uy, x1 - ux);
    const endA = Math.atan2(y2 - uy, x2 - ux);
    const midA = Math.atan2((y1 + y2) / 2 - uy, (x1 + x2) / 2 - ux);
    let sweep = endA - startA;
    const norm = v => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const midRel = norm(midA - startA);
    const endRel = norm(sweep);
    if (midRel > endRel) sweep = sweep > 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
    return {
      x: x2, y: y2,
      arcTo: true,
      cx: ux, cy: uy,
      radius: r,
      startA,
      sweepDeg: sweep * 180 / Math.PI,
    };
  }, []);

  const onPolySegEnd = useCallback((x1, y1, x2, y2) => {
    const p2raw = { x: x2, y: y2 };
    let pts = polyPtsRef.current;
    if (pts.length === 0) pts = [{ x: x1, y: y1 }];
    if (pts.length >= 2 && dist(pts[0], p2raw) < SNAP_R * 1.5) {
      const type = activeTool === "SPLINE" ? "SPLINE" : "POLYLINE";
      const closingPt = polySegModeRef.current === "arc"
        ? (computeArcSegment(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y) ?? { ...pts[0] })
        : { ...pts[0] };
      const finalPts = [...pts, closingPt];
      const hasArcs = finalPts.some(p => p.arcTo);
      commit({ type, points: finalPts, closed: true, hasArcs });
      polyPtsRef.current = []; polyRegisterRef.current?.([]);
      statusRegisterRef.current?.(""); polyStatusRegRef.current?.(0, "line", false);
      setPolyStarted(false); polyStartedSV.value = false;
      x0SV.value = 0; y0SV.value = 0;
      setArcLiveInfo(null); arcRadiusOverride.current = null;
      return;
    }
    let newPt;
    if (polySegModeRef.current === "arc" && pts.length >= 1) {
      const last = pts[pts.length - 1];
      newPt = computeArcSegment(last.x, last.y, x2, y2) ?? p2raw;
    } else {
      newPt = p2raw;
    }
    const newPts = [...pts, newPt];
    polyPtsRef.current = newPts;
    polyRegisterRef.current?.([...newPts]);
    polyStatusRegRef.current?.(newPts.length, polySegModeRef.current, true);
    setArcLiveInfo(null); arcRadiusOverride.current = null;
  }, [activeTool, commit, computeArcSegment]);

  onDblTapRef.current = (rx, ry) => {
    const tool = toolSV.value;
    if (tool === "POLYLINE" || tool === "SPLINE") { finishPoly(); return; }
    const pt = snapJ(rx, ry);
    let found = null;
    for (let i = shapesRef.current.length - 1; i >= 0; i--)
      if (hitTest(shapesRef.current[i], pt)) { found = shapesRef.current[i].id; break; }
    setInlineEditId(found);
    if (found) setSelectedId(found);
  };

  onMoveEndRef.current = (dx, dy) => {
    movingSV.value = false; moveDxSV.value = 0; moveDySV.value = 0;
    const sid = selectedIdRef.current;
    if (!sid || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) { dragEndpointRef.current = null; return; }
    if (editModeRef.current && editMoveModeRef.current === "segment" && dragEndpointRef.current) {
      setShapes(prev => moveConnectedEndpoint(prev, sid, dragEndpointRef.current, dx, dy));
    } else {
      setShapes(prev => prev.map(s => s.id === sid ? translateShape(s, dx, dy) : s));
    }
    dragEndpointRef.current = null;
  };

  const onMoveBeginJS = useCallback((canvasX, canvasY) => {
    let sid = selectedIdRef.current;
    if (!sid) {
      const pt = snapJ(canvasX, canvasY);
      for (let i = shapesRef.current.length - 1; i >= 0; i--) {
        if (hitTest(shapesRef.current[i], pt)) { sid = shapesRef.current[i].id; setSelectedId(sid); break; }
      }
    }
    if (!sid) return;
    movingSV.value = true;
    const shape = shapesRef.current.find(s => s.id === sid);
    if (!shape) return;
    if (editModeRef.current && editMoveModeRef.current === "segment" && shape.type === "LINE") {
      const epKey = findNearestEndpoint(shape, { x: canvasX, y: canvasY }, 28);
      if (epKey) { dragEndpointRef.current = epKey; return; }
    }
    dragEndpointRef.current = null;
  }, [snapJ]);

  const updatePolyArcHud = useCallback((curX, curY) => {
    if (polySegModeRef.current !== "arc") return;
    const pts = polyPtsRef.current;
    if (pts.length === 0) return;
    const last = pts[pts.length - 1];
    updateArcLiveInfo(last.x, last.y, curX, curY);
  }, [updateArcLiveInfo]);

  const addFreehandPt = useCallback((x, y) => {
    freehandRef.current.push({ x, y });
    if (freehandRef.current.length % 8 === 0) freehandRegisterRef.current?.([...freehandRef.current]);
  }, []);
  const setPolyStartedTrue = useCallback(() => { polyStartedSV.value = true; setPolyStarted(true); }, []);

  // FIX: stable JS-thread callbacks for stretch (must be stable refs, not inline arrows)
  const onStretchWindowJS = useCallback((x, y, w, h) => handleStretchWindow(x, y, w, h), [handleStretchWindow]);
  const onStretchApplyJS = useCallback((x0, y0, x1, y1) => handleStretchApply(x0, y0, x1, y1), [handleStretchApply]);

  cb.current.end = (x, y) => onEndRef.current(x, y);
  cb.current.tap = (x, y) => onTapRef.current(x, y);
  cb.current.dblTap = (x, y) => onDblTapRef.current(x, y);
  cb.current.finish = () => finishPoly();
  cb.current.moveEnd = (dx, dy) => onMoveEndRef.current(dx, dy);
  cb.current.autoClose = (x, y) => updateAutoClose(x, y);
  cb.current.freehandPt = (x, y) => addFreehandPt(x, y);
  cb.current.setPolyStarted = () => setPolyStartedTrue();
  cb.current.polySegEnd = (x1, y1, x2, y2) => onPolySegEnd(x1, y1, x2, y2);
  cb.current.moveBegin = (x, y) => onMoveBeginJS(x, y);
  cb.current.polyArcHud = (x, y) => updatePolyArcHud(x, y);
  cb.current.stretchWindow = (x, y, w, h) => onStretchWindowJS(x, y, w, h);
  cb.current.stretchApply = (x0, y0, x1, y1) => onStretchApplyJS(x0, y0, x1, y1);

  const sEnd = useRef((x, y) => cb.current.end(x, y)).current;
  const sTap = useRef((x, y) => cb.current.tap(x, y)).current;
  const sDblTap = useRef((x, y) => cb.current.dblTap(x, y)).current;
  const sFinish = useRef(() => cb.current.finish()).current;
  const sMoveEnd = useRef((dx, dy) => cb.current.moveEnd(dx, dy)).current;
  const sAutoClose = useRef((x, y) => cb.current.autoClose(x, y)).current;
  const sFreehandPt = useRef((x, y) => cb.current.freehandPt(x, y)).current;
  const sPolySegEnd = useRef((x1, y1, x2, y2) => cb.current.polySegEnd(x1, y1, x2, y2)).current;
  const sSetPolyStarted = useRef(() => cb.current.setPolyStarted()).current;
  const sMoveBegin = useRef((x, y) => cb.current.moveBegin(x, y)).current;
  const sPolyArcHud = useRef((x, y) => cb.current.polyArcHud(x, y)).current;
  // FIX: stable runOnJS wrappers for stretch
  const sStretchWindow = useRef((x, y, w, h) => cb.current.stretchWindow(x, y, w, h)).current;
  const sStretchApply = useRef((x0, y0, x1, y1) => cb.current.stretchApply(x0, y0, x1, y1)).current;

  // ── Gestures ────────────────────────────────────────────────
  const canvasHeight = height - 60;
  const segModeSV2 = useSharedValue("line");
  useEffect(() => { segModeSV2.value = polySegMode; }, [polySegMode]);

  const panG = useRef(
    Gesture.Pan().minDistance(1)
      .onBegin(e => {
        "worklet";
        const tool = toolSV.value;
        const z = zoomSV.value;
        const canvasX = (e.x - width / 2) / z, canvasY = (e.y - canvasHeight / 2) / z;
        coordXSV.value = canvasX; coordYSV.value = canvasY;
        if (tool === "SELECT") return;
        if (tool === "MOVE") {
          moveDxSV.value = 0; moveDySV.value = 0;
          x0SV.value = canvasX; y0SV.value = canvasY;
          runOnJS(sMoveBegin)(canvasX, canvasY);
          return;
        }
        if (tool === "FREEHAND") {
          runOnJS(sFreehandPt)(canvasX, canvasY);
          x1SV.value = canvasX; y1SV.value = canvasY;
          draggingSV.value = true;
          return;
        }
        if (tool === "POLYLINE" || tool === "SPLINE") {
          const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
          if (segModeSV2.value === "arc" && polyStartedSV.value) {
            // FIX: sync x0SV to last poly point so arc start is always correct
            x0SV.value = lastPolyXSV.value;
            y0SV.value = lastPolyYSV.value;
            x1SV.value = pt.x; y1SV.value = pt.y;
            return;
          }
          if (!polyStartedSV.value) {
            x0SV.value = pt.x; y0SV.value = pt.y;
            lastPolyXSV.value = pt.x; lastPolyYSV.value = pt.y;
            runOnJS(sSetPolyStarted)();
          }
          x1SV.value = pt.x; y1SV.value = pt.y;
          draggingSV.value = true;
          return;
        }
        if (tool === "ERASER") return;
        // FIX: STRETCH — record rubber-band start
        if (tool === "STRETCH") {
          x0SV.value = canvasX; y0SV.value = canvasY;
          x1SV.value = canvasX; y1SV.value = canvasY;
          stretchX0SV.value = canvasX; stretchY0SV.value = canvasY;
          draggingSV.value = true;
          return;
        }
        const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
        if (snapOriginSV.value) {
          snapOriginSV.value = false;
          x1SV.value = pt.x; y1SV.value = pt.y;
          draggingSV.value = true;
        } else {
          x0SV.value = pt.x; y0SV.value = pt.y;
          x1SV.value = pt.x; y1SV.value = pt.y;
          draggingSV.value = true;
        }
      })
      .onUpdate(e => {
        "worklet";
        const tool = toolSV.value;
        const z = zoomSV.value;
        const canvasX = (e.x - width / 2) / z, canvasY = (e.y - canvasHeight / 2) / z;
        coordXSV.value = canvasX; coordYSV.value = canvasY;
        if (tool === "MOVE") {
          if (movingSV.value) { moveDxSV.value = canvasX - x0SV.value; moveDySV.value = canvasY - y0SV.value; }
          return;
        }
        if (tool === "FREEHAND") {
          runOnJS(sFreehandPt)(canvasX, canvasY);
          x1SV.value = canvasX; y1SV.value = canvasY;
          return;
        }
        // FIX: STRETCH — update rubber-band preview
        if (tool === "STRETCH") {
          x1SV.value = canvasX; y1SV.value = canvasY;
          return;
        }
        const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
        if (tool === "POLYLINE" || tool === "SPLINE") {
          x1SV.value = pt.x; y1SV.value = pt.y;
          const fc = Math.round(canvasX + canvasY) & 0xF;
          if (fc === 0) runOnJS(sAutoClose)(pt.x, pt.y);
          if ((fc & 0x3) === 0) runOnJS(sPolyArcHud)(pt.x, pt.y);
          return;
        }
        if (!draggingSV.value) return;
        x1SV.value = pt.x; y1SV.value = pt.y;
        const fc = Math.round(canvasX + canvasY) & 0xF;
        if (fc === 0) runOnJS(sAutoClose)(pt.x, pt.y);
      })
      .onEnd(e => {
        "worklet";
        const tool = toolSV.value;
        const z = zoomSV.value;
        const canvasX = (e.x - width / 2) / z, canvasY = (e.y - canvasHeight / 2) / z;
        if (tool === "MOVE") {
          const dx = canvasX - x0SV.value, dy = canvasY - y0SV.value;
          movingSV.value = false; moveDxSV.value = 0; moveDySV.value = 0;
          runOnJS(sMoveEnd)(dx, dy);
          return;
        }
        if (tool === "FREEHAND") {
          draggingSV.value = false;
          runOnJS(sEnd)(canvasX, canvasY);
          return;
        }
        // FIX: STRETCH — on pan-end, dispatch to correct phase handler
        if (tool === "STRETCH") {
          draggingSV.value = false;
          const sx = stretchX0SV.value, sy = stretchY0SV.value;
          const ex = canvasX, ey = canvasY;
          if (stretchPhaseSV.value === "select") {
            // First drag: define the selection window
            runOnJS(sStretchWindow)(
              Math.min(sx, ex), Math.min(sy, ey),
              Math.abs(ex - sx), Math.abs(ey - sy)
            );
          } else {
            // Second drag: apply the stretch displacement
            runOnJS(sStretchApply)(sx, sy, ex, ey);
          }
          // Reset stretch origin for next drag
          stretchX0SV.value = canvasX;
          stretchY0SV.value = canvasY;
          return;
        }
        if (tool === "POLYLINE" || tool === "SPLINE") {
          if (segModeSV2.value === "arc" && polyStartedSV.value) {
            draggingSV.value = false;
            return;
          }
          if (!draggingSV.value) return;
          draggingSV.value = false;
          const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
          x1SV.value = pt.x; y1SV.value = pt.y;
          const sx = x0SV.value, sy = y0SV.value;
          x0SV.value = pt.x; y0SV.value = pt.y;
          lastPolyXSV.value = pt.x; lastPolyYSV.value = pt.y;
          runOnJS(sPolySegEnd)(sx, sy, pt.x, pt.y);
          return;
        }
        if (!draggingSV.value) return;
        const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
        x1SV.value = pt.x; y1SV.value = pt.y;
        runOnJS(sEnd)(pt.x, pt.y);
      })
  ).current;

  const tapG = useRef(
    Gesture.Tap().maxDuration(250).onEnd(e => {
      "worklet";
      const z = zoomSV.value;
      const canvasX = (e.x - width / 2) / z, canvasY = (e.y - canvasHeight / 2) / z;
      coordXSV.value = canvasX; coordYSV.value = canvasY;
      const tool = toolSV.value;
      if (tool === "POLYLINE" || tool === "SPLINE") {
        const pt = snapPoint(canvasX, canvasY, snapOnSV.value, kpSV.value);
        x1SV.value = pt.x; y1SV.value = pt.y;
        if (segModeSV2.value === "arc" && polyStartedSV.value) {
          const sx = x0SV.value, sy = y0SV.value;
          x0SV.value = pt.x; y0SV.value = pt.y;
          lastPolyXSV.value = pt.x; lastPolyYSV.value = pt.y;
          runOnJS(sPolySegEnd)(sx, sy, pt.x, pt.y);
        } else {
          runOnJS(sTap)(pt.x, pt.y);
        }
      } else {
        runOnJS(sTap)(canvasX, canvasY);
      }
    })
  ).current;

  const dblG = useRef(
    Gesture.Tap().numberOfTaps(2).maxDuration(400).onEnd(e => {
      "worklet";
      const t = toolSV.value;
      if (t === "POLYLINE" || t === "SPLINE") { runOnJS(sFinish)(); return; }
      const z = zoomSV.value;
      const canvasX = (e.x - width / 2) / z, canvasY = (e.y - canvasHeight / 2) / z;
      runOnJS(sDblTap)(canvasX, canvasY);
    })
  ).current;

  const composed = useRef(Gesture.Exclusive(Gesture.Simultaneous(dblG, tapG), panG)).current;

  const selShape = shapes.find(s => s.id === selectedId);
  const selKPs = selShape ? keyPoints(selShape) : [];
  const canExtrude = selShape ? isClosedGeometry(selShape) : false;

  const showArcHud = (activeTool === "POLYLINE" || activeTool === "SPLINE")
    && polyStarted && polySegMode === "arc";

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>

      {/* ═══ MENU / STATUS BAR ═══ */}
      <View style={[s.menuBar, { backgroundColor: T.menuBar, borderBottomColor: T.menuBarBorder }]}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.menuBarInner}
        >
          <View style={s.brand}>
            <View style={s.brandIcon}><Text style={s.brandIconText}>⬡</Text></View>
            <View>
              <Text style={s.brandName}>CADSketch</Text>
              <Text style={s.brandVersion}>PRO v1.0</Text>
            </View>
          </View>

          <View style={s.menuDivider} />

          <View style={s.activeToolBadge}>
            <Text style={s.activeToolText}>{ALL_TOOLS.find(t => t.key === activeTool)?.icon ?? "?"}</Text>
            <Text style={s.activeToolLabel}>{activeTool}</Text>
          </View>

          <StatusText registerRef={statusRegisterRef} />
          {autoCloseTarget && (
            <View style={s.autoCloseBadge}>
              <Text style={s.autoCloseBadgeText}>⊙ AUTO-CLOSE</Text>
            </View>
          )}

          {showArcHud && (
            <View style={s.arcModeBadge}>
              <Text style={s.arcModeBadgeText}>⌒ ARC SEG</Text>
            </View>
          )}

          {(activeTool === "POLYLINE" || activeTool === "SPLINE") && (
            <PolyStatusBar
              registerRef={polyStatusRegRef}
              onFinish={finishPoly}
              onSegModeToggle={() => {
                const next = polySegMode === "line" ? "arc" : "line";
                setPolySegMode(next); polySegModeRef.current = next;
                segModeSV2.value = next;
                polyStatusRegRef.current?.(polyPtsRef.current.length, next, true);
                if (next === "line") { setArcLiveInfo(null); arcRadiusOverride.current = null; }
              }}
            />
          )}

          <View style={s.menuDivider} />
          <CoordBox coordXSV={coordXSV} coordYSV={coordYSV} />
          <View style={s.menuDivider} />

          <View style={s.quickToggles}>
            <TouchableOpacity
              style={[s.qToggle, editModeEnabled && s.qToggleEdit]}
              onPress={() => {
                const next = !editModeEnabled;
                setEditModeEnabled(next);
                if (next && activeTool !== "SELECT" && activeTool !== "MOVE") setActiveTool("SELECT");
              }}
            >
              <Text style={[s.qToggleText, editModeEnabled && s.qToggleTextEdit]}>✏ EDIT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.qToggle, snapEnabled && s.qToggleOn]} onPress={() => setSnapEnabled(v => !v)}>
              <Text style={[s.qToggleText, snapEnabled && s.qToggleTextOn]}>⊕ SNAP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.qToggle, orthoEnabled && s.qToggleOn]} onPress={() => setOrthoEnabled(v => !v)}>
              <Text style={[s.qToggleText, orthoEnabled && s.qToggleTextOn]}>⊞ ORTHO</Text>
            </TouchableOpacity>
          </View>

          <View style={s.menuDivider} />
          <TouchableOpacity style={s.themeToggle} onPress={() => setIsDark(v => !v)}>
            <Text style={s.themeToggleText}>{isDark ? "☀" : "◑"}</Text>
          </TouchableOpacity>
          <View style={s.shapeCountBadge}>
            <Text style={s.shapeCountText}>{shapeCount}</Text>
            <Text style={s.shapeCountLabel}>shapes</Text>
          </View>
        </ScrollView>
      </View>

      {/* ═══ CANVAS ═══ */}
      <View style={[s.canvasWrap, { backgroundColor: T.canvasBg }]}>
        <GestureDetector gesture={composed}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={[
              { translateX: width / 2 },
              { translateY: canvasHeight / 2 },
              { scaleX: zoom },
              { scaleY: zoom },
            ]}>
              {gridEnabled && <Grid width={width} height={canvasHeight} />}

              {useMemo(() => shapes.map(shape => {
                const layer = layers.find(l => l.id === shape.layer);
                if (layer && !layer.visible) return null;
                return (
                  <Group key={shape.id}>
                    <RenderShape
                      shape={shape}
                      selected={shape.id === selectedId}
                      editMode={editModeEnabled && shape.id !== selectedId}
                      layerColor={layer?.color}
                      isExtrudable={shape.id === selectedId && isClosedGeometry(shape)}
                    />
                  </Group>
                );
              }), [shapes, selectedId, editModeEnabled, layers])}

              <LivePreview
                toolSV={toolSV} x0SV={x0SV} y0SV={y0SV}
                x1SV={x1SV} y1SV={y1SV}
                draggingSV={draggingSV} sidesSV={sidesSV}
                arcCenterSV={arcCenterSV} arcP1SV={arcP1SV}
              />

              {arcStep && (
                <Group>
                  <Circle cx={arcStep.center.x} cy={arcStep.center.y} r={7} color="rgba(247,201,72,0.15)" />
                  <Circle cx={arcStep.center.x} cy={arcStep.center.y} r={5} color={T.warning} style="stroke" strokeWidth={1.5} />
                  <Circle cx={arcStep.center.x} cy={arcStep.center.y} r={2} color={T.warning} />
                </Group>
              )}

              {(activeTool === "POLYLINE" || activeTool === "SPLINE") && (
                <PolylineCanvas
                  registerRef={polyRegisterRef}
                  polyStarted={polyStarted}
                  lastPolyXSV={lastPolyXSV} lastPolyYSV={lastPolyYSV}
                  x1SV={x1SV} y1SV={y1SV}
                  segModeSV={segModeSV2}
                />
              )}

              {activeTool === "FREEHAND" && <FreehandPreview registerRef={freehandRegisterRef} />}

              {selKPs.map((p, i) => (
                <Group key={i}>
                  <Circle cx={p.x} cy={p.y} r={10} color={canExtrude ? "rgba(168,85,247,0.10)" : T.kpFill} />
                  <Circle cx={p.x} cy={p.y} r={6} color={canExtrude ? "#C084FC" : T.kpColor} style="stroke" strokeWidth={1.5} />
                  <Circle cx={p.x} cy={p.y} r={2.5} color={canExtrude ? "#C084FC" : T.kpColor} />
                </Group>
              ))}

              {editModeEnabled && selShape?.type === "LINE" && (
                <>
                  {[selShape.p1, selShape.p2].map((ep, i) => ep && (
                    <Group key={`ep-${i}`}>
                      <Circle cx={ep.x} cy={ep.y} r={12} color="rgba(255,122,69,0.12)" />
                      <Circle cx={ep.x} cy={ep.y} r={8} color={T.shapeEdit} style="stroke" strokeWidth={1.8} />
                      <Circle cx={ep.x} cy={ep.y} r={3} color={T.shapeEdit} />
                    </Group>
                  ))}
                  <Circle
                    cx={(selShape.p1.x + selShape.p2.x) / 2}
                    cy={(selShape.p1.y + selShape.p2.y) / 2}
                    r={4.5} color="rgba(255,122,69,0.45)"
                  />
                </>
              )}

              {coincidentPts.map((p, i) => (
                <Group key={i}>
                  <Circle cx={p.x} cy={p.y} r={10} color="rgba(255,149,0,0.08)" />
                  <Circle cx={p.x} cy={p.y} r={7} color={T.coincColor} style="stroke" strokeWidth={1.5} />
                  <Circle cx={p.x} cy={p.y} r={2.5} color={T.coincColor} />
                </Group>
              ))}

              {autoCloseTarget && (
                <Group>
                  <Circle cx={autoCloseTarget.x} cy={autoCloseTarget.y} r={20} color="rgba(0,229,160,0.04)" />
                  <Circle cx={autoCloseTarget.x} cy={autoCloseTarget.y} r={14} color="rgba(0,229,160,0.10)" />
                  <Circle cx={autoCloseTarget.x} cy={autoCloseTarget.y} r={9} color={T.autoClose} style="stroke" strokeWidth={1.5} />
                  <Circle cx={autoCloseTarget.x} cy={autoCloseTarget.y} r={3} color={T.autoClose} />
                </Group>
              )}

              <MoveGhost movingSV={movingSV} moveDxSV={moveDxSV} moveDySV={moveDySV} selectedShapeSV={selectedShapeSV} />

              {/* Stretch selection window preview */}
              {stretchWindow && (
                <Group>
                  {(() => {
                    const { x, y, w, h } = stretchWindow;
                    const p = Skia.Path.Make();
                    p.addRect({ x, y, width: w, height: h });
                    return (
                      <>
                        <Path path={p} color="rgba(247,201,72,0.06)" style="fill" />
                        <Path path={p} color="rgba(247,201,72,0.55)" style="stroke" strokeWidth={1} />
                      </>
                    );
                  })()}
                </Group>
              )}

              <Crosshair x1SV={x1SV} y1SV={y1SV} draggingSV={draggingSV} toolSV={toolSV} />
              <Origin />
            </Group>
          </Canvas>
        </GestureDetector>

        {/* Empty canvas welcome */}
        {shapes.length === 0 && (
          <View style={s.emptyCanvas} pointerEvents="none">
            <View style={s.emptyCrossH} /><View style={s.emptyCrossV} />
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([r, b], i) => (
              <View key={i} style={[s.emptyCorner, r ? s.emptyCornerR : s.emptyCornerL, b ? s.emptyCornerB : s.emptyCornerT]}>
                <View style={s.emptyCornerH} /><View style={s.emptyCornerV} />
              </View>
            ))}
            <View style={s.emptyCenter}>
              <Text style={[s.emptyIcon, { color: T.active + "40" }]}>⬡</Text>
              <Text style={[s.emptyTitle, { color: T.active + "80" }]}>CADSketch</Text>
              <Text style={[s.emptySubtitle, { color: T.text + "50" }]}>PROFESSIONAL</Text>
              <View style={[s.emptyDivider, { backgroundColor: T.border }]} />
              <Text style={[s.emptyHint, { color: T.textMid }]}>Select a tool and start drawing</Text>
            </View>
          </View>
        )}

        {/* Edit mode overlays */}
        {editModeEnabled && (
          <EditModeOverlay
            shapes={shapes}
            selectedId={selectedId}
            onDeleteShape={id => { setShapes(p => p.filter(sh => sh.id !== id)); if (id === selectedId) setSelectedId(null); }}
            onDeleteSegment={() => { }}
            zoom={zoom}
            width={width}
            height={height}
            editMoveMode={editMoveMode}
            onSetEditMoveMode={setEditMoveMode}
          />
        )}

        {/* Inline dimension overlays */}
        <InlineDimOverlays
          shapes={shapes}
          selectedId={selectedId}
          inlineEditId={inlineEditId}
          editModeEnabled={editModeEnabled}
          zoom={zoom}
          width={width}
          height={height}
          inlineDimTexts={inlineDimTexts}
          onDimChange={handleInlineDimChange}
          onDimCommit={handleInlineDimCommit}
          onFocus={id => { setInlineEditId(id); setSelectedId(id); }}
        />

        {/* Arc segment HUD */}
        {showArcHud && (
          <ArcSegmentHUD
            arcInfo={arcLiveInfo}
            zoom={zoom}
            width={width}
            height={height}
            onRadiusChange={r => { arcRadiusOverride.current = r; }}
          />
        )}

        {/* Edit op panel */}
        <EditOpPanel
          tool={activeTool}
          shape={panelShape}
          rotateAngle={rotateAngle} setRotateAngle={setRotateAngle}
          scaleFactorX={scaleFactorX} setScaleFactorX={setScaleFactorX}
          scaleFactorY={scaleFactorY} setScaleFactorY={setScaleFactorY}
          mirrorAxis={mirrorAxis} setMirrorAxis={setMirrorAxis}
          offsetDist={offsetDist} setOffsetDist={setOffsetDist}
          filletRadius={filletRadius} setFilletRadius={setFilletRadius}
          chamferDist={chamferDist} setChamferDist={setChamferDist}
          onApply={() => {
            if (activeTool === "ROTATE") handleRotateApply();
            if (activeTool === "SCALE") handleScaleApply();
            if (activeTool === "MIRROR") handleMirrorApply();
            if (activeTool === "OFFSET") handleOffsetApply();
          }}
          onCancel={() => selectTool("SELECT")}
          isDark={isDark}
        />

        {/* Extrude button */}
        {canExtrude && selShape && (
          <View style={s.extrudeHudPosition} pointerEvents="box-none">
            <ExtrudeButton
              shape={selShape}
              onExtrude={handleExtrudePress}
              isDark={isDark}
            />
          </View>
        )}

        {/* Zoom indicator */}
        <View style={s.zoomIndicator}>
          <Text style={s.zoomIndicatorText}>{(zoom * 100).toFixed(0)}%</Text>
          <Text style={s.zoomIndicatorLabel}>ZOOM</Text>
        </View>

        {/* Active layer indicator */}
        <View style={s.layerIndicator}>
          <View style={[s.layerIndicatorDot, { backgroundColor: layers.find(l => l.id === activeLayer)?.color ?? T.active }]} />
          <Text style={s.layerIndicatorText}>{layers.find(l => l.id === activeLayer)?.name ?? activeLayer}</Text>
        </View>

        {/* Properties panel */}
        <PropertiesPanel
          shape={panelShape}
          onUpdate={onPanelUpdate}
          onApplyWithConnections={(shapeId, key, raw) => setShapes(prev => applyEditWithConnections(prev, shapeId, key, raw))}
          onDelete={onPanelDelete}
        />
      </View>

      {/* ═══ TOOLBAR ═══ */}
      <Toolbar
        activeTool={activeTool} onSelect={selectTool}
        onUndo={undo} onRedo={redo} onClear={clear}
        polygonSides={polygonSides} setPolygonSides={setPolygonSides}
        zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset}
        defaultSize={defaultSize} setDefaultSize={setDefaultSize}
        snapEnabled={snapEnabled} onToggleSnap={() => setSnapEnabled(v => !v)}
        orthoEnabled={orthoEnabled} onToggleOrtho={() => setOrthoEnabled(v => !v)}
        gridEnabled={gridEnabled} onToggleGrid={() => setGridEnabled(v => !v)}
        onShowLayers={() => setShowLayers(true)}
        onShowSettings={() => setShowSettings(true)}
        isDark={isDark}
      />

      {/* ═══ MODALS ═══ */}
      {showLayers && (
        <LayersPanel
          layers={layers} activeLayer={activeLayer}
          onSetActive={setActiveLayer}
          onToggleVisible={id => setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))}
          onToggleLock={id => setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l))}
          onClose={() => setShowLayers(false)}
        />
      )}
      {showSettings && (
        <SettingsPanel
          snapEnabled={snapEnabled} orthoEnabled={orthoEnabled}
          gridEnabled={gridEnabled} isDark={isDark}
          onToggleSnap={() => setSnapEnabled(v => !v)}
          onToggleOrtho={() => setOrthoEnabled(v => !v)}
          onToggleGrid={() => setGridEnabled(v => !v)}
          onToggleTheme={() => setIsDark(v => !v)}
          defaultSize={defaultSize} setDefaultSize={setDefaultSize}
          onClose={() => setShowSettings(false)}
        />
      )}

      {extrudeShape && (
        <ExtrudeModal
          shape={extrudeShape}
          onConfirm={handleExtrudeConfirm}
          onCancel={handleExtrudeCancel}
          isDark={isDark}
        />
      )}
    </View>
  );
}

// ─── Helper ───────────────────────────────────────────────────
function getDefaultGeometryShape(tool, defaultSize, polygonSides) {
  const { w, h, r } = defaultSize;
  switch (tool) {
    case "RECTANGLE": return { type: "RECTANGLE", x: -w / 2, y: -h / 2, w, h, id: "preview" };
    case "CIRCLE": return { type: "CIRCLE", center: { x: 0, y: 0 }, radius: r, id: "preview" };
    case "ELLIPSE": return { type: "ELLIPSE", center: { x: 0, y: 0 }, rx: r, ry: r * 0.6, id: "preview" };
    case "POLYGON": return { type: "POLYGON", center: { x: 0, y: 0 }, radius: r, sides: polygonSides, id: "preview" };
    case "LINE": return { type: "LINE", p1: { x: -r, y: 0 }, p2: { x: r, y: 0 }, id: "preview" };
    case "ARC": return { type: "ARC", center: { x: 0, y: 0 }, p1: { x: r, y: 0 }, p2: { x: 0, y: r }, id: "preview" };
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1 },

  // ── Menu Bar ───────────────────────────────────────────────
  menuBar: { minHeight: 44, maxHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
  menuBarInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 6, height: 44 },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandIcon: { width: 26, height: 26, borderRadius: 6, backgroundColor: "rgba(42,168,242,0.15)", borderWidth: 1, borderColor: "rgba(42,168,242,0.4)", alignItems: "center", justifyContent: "center" },
  brandIconText: { color: "#2AA8F2", fontSize: 12 },
  brandName: { color: "#E8F0FF", fontSize: 11, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1.5 },
  brandVersion: { color: "#3A4860", fontSize: 7, fontFamily: DS.fontMono, letterSpacing: 0.8 },
  menuDivider: { width: 1, height: 22, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 2 },

  activeToolBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(42,168,242,0.10)", borderWidth: 1, borderColor: "rgba(42,168,242,0.30)", borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  activeToolText: { color: "#2AA8F2", fontSize: 12, lineHeight: 16 },
  activeToolLabel: { color: "#2AA8F2", fontSize: 9, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 0.8 },
  autoCloseBadge: { backgroundColor: "rgba(0,229,160,0.12)", borderWidth: 1, borderColor: "rgba(0,229,160,0.4)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  autoCloseBadgeText: { color: "#00E5A0", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.8, fontWeight: "700" },

  // Arc mode badge
  arcModeBadge: { backgroundColor: "rgba(0,229,160,0.14)", borderWidth: 1, borderColor: "rgba(0,229,160,0.45)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  arcModeBadgeText: { color: "#00E5A0", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.8, fontWeight: "700" },

  coordBox: { flexDirection: "row", alignItems: "center", gap: 1, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  coordLabel: { fontSize: 8, fontFamily: DS.fontMono, fontWeight: "600" },
  coordVal: { color: "#B8C8E0", fontSize: 10, fontFamily: DS.fontMono, minWidth: 40, fontWeight: "600" },
  coordDivider: { width: 1, height: 14, backgroundColor: "rgba(255,255,000,0.5)", marginHorizontal: 2 },

  quickToggles: { flexDirection: "row", gap: 4 },
  qToggle: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  qToggleOn: { backgroundColor: "rgba(42,168,242,0.12)", borderColor: "rgba(42,168,242,0.35)" },
  qToggleEdit: { backgroundColor: "rgba(255,122,69,0.14)", borderColor: "rgba(255,122,69,0.50)" },
  qToggleText: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.5 },
  qToggleTextOn: { color: "#2AA8F2" },
  qToggleTextEdit: { color: "#FF7A45", fontWeight: "700" },
  themeToggle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  themeToggleText: { fontSize: 14, lineHeight: 18 },
  shapeCountBadge: { alignItems: "center", backgroundColor: "rgba(42,168,242,0.10)", borderWidth: 1, borderColor: "rgba(42,168,242,0.25)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  shapeCountText: { color: "#2AA8F2", fontSize: 13, fontFamily: DS.fontMono, fontWeight: "700", lineHeight: 16 },
  shapeCountLabel: { color: "#3A4860", fontSize: 6, fontFamily: DS.fontMono, letterSpacing: 0.8 },

  // ── Canvas ─────────────────────────────────────────────────
  canvasWrap: { flex: 1, position: "relative" },

  // ── Arc Segment HUD ────────────────────────────────────────
  arcHud: {
    position: "absolute",
    left: 10,
    bottom: 60,
    backgroundColor: "rgba(6,8,16,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.45)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 170,
    shadowColor: "#00E5A0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 18,
    zIndex: 90,
  },
  arcHudHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,229,160,0.18)",
  },
  arcHudIcon: {
    width: 22, height: 22,
    borderRadius: 5,
    backgroundColor: "rgba(0,229,160,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  arcHudIconText: { color: "#00E5A0", fontSize: 12 },
  arcHudTitle: { color: "#00E5A0", fontSize: 9, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1.5 },

  arcHudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  arcHudLabel: { color: "#3A7060", fontSize: 9, fontFamily: DS.fontMono, fontWeight: "700", width: 12 },
  arcHudInputWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.4)",
    borderRadius: 4,
    paddingHorizontal: 6,
    height: 28,
    justifyContent: "center",
  },
  arcHudInput: { color: "#00E5A0", fontSize: 12, fontFamily: DS.fontMono, padding: 0 },
  arcHudUnit: { color: "#1A4840", fontSize: 8, fontFamily: DS.fontMono },

  arcHudCoordsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  arcHudCoordPair: { flex: 1, alignItems: "center" },
  arcHudDivider: { width: 1, height: 22, backgroundColor: "rgba(0,229,160,0.18)", marginHorizontal: 4 },
  arcHudCoordLabel: { color: "#1A4840", fontSize: 7, fontFamily: DS.fontMono, letterSpacing: 0.5 },
  arcHudCoordVal: { color: "#3A7060", fontSize: 10, fontFamily: DS.fontMono, fontWeight: "600" },

  // Arc center dot on canvas overlay
  arcCenterDot: {
    position: "absolute",
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(0,229,160,0.25)",
    borderWidth: 1.5,
    borderColor: "#00E5A0",
    pointerEvents: "none",
    zIndex: 89,
  },

  // ── Arc segments list in properties panel ──────────────────
  arcSegmentSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1A2030",
  },
  arcSegmentSectionTitle: {
    color: "#00E5A0",
    fontSize: 8,
    fontFamily: DS.fontMono,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  arcSegmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(0,229,160,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.15)",
    marginBottom: 4,
    gap: 8,
  },
  arcSegmentIndex: { color: "#1A4840", fontSize: 8, fontFamily: DS.fontMono, width: 18 },
  arcSegmentData: { flex: 1 },
  arcSegmentStat: { color: "#00E5A0", fontSize: 10, fontFamily: DS.fontMono, fontWeight: "700" },
  arcSegmentStatSub: { color: "#1A4840", fontSize: 8, fontFamily: DS.fontMono, marginTop: 1 },

  // ── Extrude HUD ─────────────────────────────────────────────
  extrudeHudPosition: {
    position: "absolute",
    top: 34,
    right: -30,
    alignItems: "center",
    pointerEvents: "box-none",
    zIndex: 80,
  },
  extrudeButtonWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  extrudeButton: {
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 2,
    minWidth: 110,
  },
  extrudeIconRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 1 },
  extrudeIconDivider: { width: 1, height: 14, backgroundColor: "rgba(168,85,247,0.3)" },
  extrudeIcon: { fontSize: 18, lineHeight: 22 },
  extrudeCubeIcon: { fontSize: 14, lineHeight: 18 },
  extrudeLabel: { fontSize: 11, fontFamily: DS.fontMono, fontWeight: "900", letterSpacing: 2.5 },
  extrudeSub: { fontSize: 8, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 2, marginTop: -2 },
  extrudeShapeTag: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1, marginTop: 4 },
  extrudeShapeType: { fontSize: 8, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1 },
  extrudeShapeDims: { fontSize: 8, fontFamily: DS.fontMono, marginTop: 2 },

  // ── Extrude modal ──────────────────────────────────────────
  extrudeModalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20,
  },
  extrudeModalCard: {
    width: "100%", maxWidth: 380,
    borderRadius: 16, borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#A855F7", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 30,
  },
  extrudeModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  extrudeModalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  extrudeModalAccentBar: { width: 4, height: 32, borderRadius: 2 },
  extrudeModalTitle: { fontSize: 15, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 0.5 },
  extrudeModalSub: { fontSize: 10, fontFamily: DS.fontMono, marginTop: 2 },
  extrudeModalClose: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  extrudeSection: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  extrudeSectionLabel: { fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 1.5, marginBottom: 10 },
  extrudeModeRow: { flexDirection: "row", gap: 8 },
  extrudeModeBtn: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, gap: 4,
  },
  extrudeModeBtnIcon: { fontSize: 18, lineHeight: 22 },
  extrudeModeBtnText: { fontSize: 9, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 0.8 },
  extrudeDepthRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  extrudeDepthInput: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 12, height: 38, minWidth: 80,
  },
  extrudeDepthText: { color: "#E8F0FF", fontSize: 16, fontFamily: DS.fontMono, fontWeight: "700", padding: 0, flex: 1 },
  extrudeDepthUnit: { fontSize: 10, fontFamily: DS.fontMono, marginLeft: 2 },
  extrudePresetBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5, borderWidth: 1, alignItems: "center" },
  extrudePresetText: { fontSize: 10, fontFamily: DS.fontMono, fontWeight: "700" },
  extrudeDataPreview: {
    borderRadius: 6, borderWidth: 1, padding: 10, marginTop: 4,
  },
  extrudeDataText: { fontSize: 9, fontFamily: DS.fontMono, lineHeight: 15 },
  extrudeModalActions: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingVertical: 14 },
  extrudeActionBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  extrudeCancelBtn: {},
  extrudeConfirmBtn: {},
  extrudeActionText: { fontSize: 13, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 0.5 },

  // ── Properties panel ───────────────────────────────────────
  propPanelContainer: { position: "absolute", bottom: 0, right: 0, top: 0, flexDirection: "row", alignItems: "flex-end", pointerEvents: "box-none" },
  propTabBtn: { position: "absolute", bottom: 70, right: 0, width: 24, height: 56, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, backgroundColor: "rgba(10,13,22,0.95)", borderWidth: 1, borderRightWidth: 0, borderColor: "#1A2030", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: -3, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 12, zIndex: 200 },
  propTabBtnOpen: { borderColor: "rgba(42,168,242,0.5)", backgroundColor: "rgba(42,168,242,0.10)" },
  propTabIcon: { color: "#2AA8F2", fontSize: 16, fontWeight: "700" },
  propTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#F7C948", marginTop: 3 },
  propPanel: { position: "absolute", bottom: 0, right: 0, width: 296, maxHeight: "72%", backgroundColor: "rgba(8,11,16,0.98)", borderLeftWidth: 1, borderTopWidth: 1, borderColor: "#1A2030", borderTopLeftRadius: 12, shadowColor: "#000", shadowOffset: { width: -8, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 24, zIndex: 190 },
  propHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A2030" },
  propHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  propHeaderDot: { width: 7, height: 7, borderRadius: 3.5 },
  propHeaderType: { color: "#2AA8F2", fontSize: 10, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1, backgroundColor: "rgba(42,168,242,0.12)", borderWidth: 1, borderColor: "rgba(42,168,242,0.3)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 },
  propHeaderActions: { flexDirection: "row", gap: 5 },
  propActionBtn: { width: 32, height: 32, borderRadius: 5, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1A2030" },
  propDeleteBtn: { borderColor: "rgba(240,64,64,0.3)" },
  propApplyBtn: { backgroundColor: "rgba(42,168,242,0.15)", borderColor: "rgba(42,168,242,0.4)" },
  propActionText: { color: "#2AA8F2", fontSize: 14, fontWeight: "700" },
  propSectionTabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1A2030" },
  propSectionTab: { flex: 1, paddingVertical: 7, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  propSectionTabActive: { borderBottomColor: "#2AA8F2" },
  propSectionTabText: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.6 },
  propSectionTabTextActive: { color: "#2AA8F2" },
  propScrollArea: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  propFieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  propFieldLabelWrap: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  propFieldLabel: { color: "#3A4860", fontSize: 9, fontFamily: DS.fontMono, textTransform: "uppercase" },
  propFieldUnitLabel: { color: "#1A2840", fontSize: 7, fontFamily: DS.fontMono },
  propFieldInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(42,168,242,0.35)", borderRadius: 4, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 8, height: 28, minWidth: 110, flex: 1, maxWidth: 170 },
  propFieldInputRO: { borderColor: "#1A2030", backgroundColor: "rgba(0,0,0,0.2)" },
  propFieldText: { color: "#E8F0FF", fontSize: 11, fontFamily: DS.fontMono, padding: 0, flex: 1 },
  propFieldTextRO: { color: "#3A4860" },
  propMetaSection: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#1A2030" },
  propMetaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  propMetaLabel: { color: "#1A2840", fontSize: 8, fontFamily: DS.fontMono },
  propMetaValue: { color: "#283348", fontSize: 8, fontFamily: DS.fontMono },
  propExtrudeBadge: { marginTop: 8, backgroundColor: "rgba(168,85,247,0.12)", borderWidth: 1, borderColor: "rgba(168,85,247,0.4)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center" },
  propExtrudeBadgeText: { color: "#A855F7", fontSize: 8, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1 },

  // ── Edit mode overlays ─────────────────────────────────────
  editMoveModeBar: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(8,11,16,0.95)", borderWidth: 1, borderColor: "rgba(255,122,69,0.4)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, shadowColor: "#FF7A45", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 150 },
  editMoveModeTitle: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, marginRight: 3 },
  editModeBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, borderWidth: 1, borderColor: "#1A2030" },
  editModeBtnActive: { backgroundColor: "rgba(255,122,69,0.15)", borderColor: "rgba(255,122,69,0.5)" },
  editModeBtnText: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono },
  editModeBtnTextActive: { color: "#FF7A45", fontWeight: "700" },
  editDeleteHandle: { position: "absolute", width: 22, height: 22, alignItems: "center", justifyContent: "center", zIndex: 120, backgroundColor: "rgba(240,64,64,0.15)", borderWidth: 1, borderColor: "rgba(240,64,64,0.4)", borderRadius: 4 },
  editDeleteIcon: { color: "#F04040", fontSize: 10, fontWeight: "900" },

  // ── Inline dim overlays ────────────────────────────────────
  dimWrap: { position: "absolute", alignItems: "center" },
  dimBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(8,11,16,0.93)", borderWidth: 1, borderColor: "rgba(42,168,242,0.30)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, shadowColor: "#2AA8F2", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 6 },
  dimBoxSelected: { borderColor: "rgba(42,168,242,0.55)", backgroundColor: "rgba(42,168,242,0.08)" },
  dimBoxActive: { borderColor: "#2AA8F2", backgroundColor: "rgba(42,168,242,0.12)", shadowOpacity: 0.3 },
  dimLabel: { color: "#2AA8F2", fontSize: 8, fontFamily: DS.fontMono, fontWeight: "700", marginRight: 3 },
  dimInput: { color: "#999", fontSize: 10, fontFamily: DS.fontMono, padding: 0, width: 44, textAlign: "center" },
  dimTick: { backgroundColor: "rgba(42,168,242,0.35)" },
  dimTickDown: { width: 1, height: 8, alignSelf: "center", marginTop: 1 },
  dimTickRight: { width: 8, height: 1, alignSelf: "flex-end", marginTop: 0, marginRight: -1 },

  // ── Empty canvas ───────────────────────────────────────────
  emptyCanvas: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  emptyCrossH: { position: "absolute", left: 0, right: 0, top: "50%", height: StyleSheet.hairlineWidth, backgroundColor: "rgba(42,168,242,0.05)" },
  emptyCrossV: { position: "absolute", top: 0, bottom: 0, left: "50%", width: StyleSheet.hairlineWidth, backgroundColor: "rgba(42,168,242,0.05)" },
  emptyCorner: { position: "absolute", width: 24, height: 24 },
  emptyCornerL: { left: 16 }, emptyCornerR: { right: 16 },
  emptyCornerT: { top: 16 }, emptyCornerB: { bottom: 16 },
  emptyCornerH: { position: "absolute", height: 1, width: 18, backgroundColor: "rgba(42,168,242,0.20)", top: 0, left: 0 },
  emptyCornerV: { position: "absolute", width: 1, height: 18, backgroundColor: "rgba(42,168,242,0.20)", top: 0, left: 0 },
  emptyCenter: { alignItems: "center", gap: 7 },
  emptyIcon: { fontSize: 56, lineHeight: 64, marginBottom: 6 },
  emptyTitle: { fontSize: 24, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 5, textTransform: "uppercase" },
  emptySubtitle: { fontSize: 10, fontFamily: DS.fontMono, letterSpacing: 4, textTransform: "uppercase", marginTop: -4 },
  emptyDivider: { width: 60, height: 1, marginVertical: 10 },
  emptyHint: { fontSize: 11, fontFamily: DS.fontMono, letterSpacing: 0.5 },

  // ── Toolbar ────────────────────────────────────────────────
  toolbar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#1A2030", backgroundColor: "#0E1118", paddingBottom: Platform.OS === "ios" ? 2 : 0 },
  toolbarInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 4, gap: 1 },
  toolGroup: { flexDirection: "row", gap: 1 },
  toolBtn: { alignItems: "center", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: "transparent", minWidth: 42, position: "relative" },
  toolBtnActive: { backgroundColor: "rgba(42,168,242,0.13)", borderColor: "rgba(42,168,242,0.38)" },
  toolIcon: { fontSize: 15, color: "#3A4860", lineHeight: 19 },
  toolIconActive: { color: "#2AA8F2" },
  toolLabel: { fontSize: 7, color: "#283348", fontFamily: DS.fontMono, letterSpacing: 0.3, marginTop: 1 },
  toolLabelActive: { color: "#2AA8F2" },
  toolActivePip: { position: "absolute", bottom: 2, left: "50%", marginLeft: -2, width: 4, height: 2, borderRadius: 1, backgroundColor: "#2AA8F2" },
  toolSep: { width: 1, height: 28, backgroundColor: "#1A2030", marginHorizontal: 3 },
  zoomChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1, borderColor: "#1A2030" },
  zoomText: { color: "#B8C8E0", fontSize: 11, fontFamily: DS.fontMono, fontWeight: "700" },
  zoomPct: { color: "#3A4860", fontSize: 7 },
  sidesStrip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 4, paddingTop: 2, gap: 4, borderTopWidth: 1, borderTopColor: "#1A2030" },
  sidesLabel: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, marginRight: 4, letterSpacing: 0.8 },
  sideBtn: { width: 26, height: 26, borderRadius: 4, borderWidth: 1, borderColor: "#1A2030", alignItems: "center", justifyContent: "center" },
  sideBtnActive: { backgroundColor: "rgba(42,168,242,0.15)", borderColor: "rgba(42,168,242,0.45)" },
  sideBtnText: { color: "#3A4860", fontSize: 10, fontFamily: DS.fontMono },
  sideBtnTextActive: { color: "#2AA8F2", fontWeight: "700" },

  // ── Layers panel modal ─────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "flex-end", justifyContent: "flex-start", paddingTop: 60, paddingRight: 10 },
  layersPanel: { width: 240, backgroundColor: "rgba(10,13,22,0.98)", borderWidth: 1, borderColor: "#1A2030", borderRadius: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 20 },
  layersPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A2030" },
  layersPanelTitle: { color: "#B8C8E0", fontSize: 10, fontFamily: DS.fontMono, fontWeight: "700", letterSpacing: 1.5 },
  layersCloseBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  layersCloseBtnText: { color: "#3A4860", fontSize: 12 },
  layerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#0E1118" },
  layerRowActive: { backgroundColor: "rgba(42,168,242,0.06)" },
  layerColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  layerName: { flex: 1 },
  layerNameText: { color: "#3A4860", fontSize: 11, fontFamily: DS.fontMono },
  layerNameTextActive: { color: "#B8C8E0" },
  layerActionBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  layerActionIcon: { color: "#283348", fontSize: 14 },
  layerActionIconDim: { color: "#1A2030" },
  layerActionIconActive: { color: "#F7C948" },

  // ── Settings panel ─────────────────────────────────────────
  settingsPanel: { width: 260, backgroundColor: "rgba(10,13,22,0.98)", borderWidth: 1, borderColor: "#1A2030", borderRadius: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 20 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#0E1118" },
  settingLabel: { color: "#6B7A96", fontSize: 11, fontFamily: DS.fontMono },
  settingDivider: { height: 1, backgroundColor: "#1A2030", marginVertical: 4 },
  settingSectionTitle: { color: "#283348", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 1.5, paddingHorizontal: 14, paddingVertical: 6 },
  settingInputRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0E1118" },
  settingInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#1A2030", borderRadius: 4, paddingHorizontal: 8, backgroundColor: "rgba(0,0,0,0.3)", height: 28, minWidth: 80 },
  settingInputText: { color: "#B8C8E0", fontSize: 11, fontFamily: DS.fontMono, flex: 1, padding: 0 },
  settingUnit: { color: "#283348", fontSize: 8, fontFamily: DS.fontMono },

  // ── Status bar items ───────────────────────────────────────
  polyStatusPill: { backgroundColor: "rgba(42,168,242,0.12)", borderWidth: 1, borderColor: "rgba(42,168,242,0.3)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  polyStatusText: { color: "#2AA8F2", fontSize: 8, fontFamily: DS.fontMono, fontWeight: "700" },
  statusBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: "#1A2030" },
  statusBtnActive: { backgroundColor: "rgba(42,168,242,0.12)", borderColor: "rgba(42,168,242,0.35)" },
  statusBtnArc: { backgroundColor: "rgba(0,229,160,0.14)", borderColor: "rgba(0,229,160,0.50)" },
  statusBtnDone: { backgroundColor: "rgba(0,229,160,0.10)", borderColor: "rgba(0,229,160,0.35)" },
  statusBtnText: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.5 },
  statusBtnTextArc: { color: "#00E5A0", fontWeight: "700" },
  statusText: { color: "#283348", fontSize: 9, fontFamily: DS.fontMono },

  // ── HUD elements ────────────────────────────────────────────
  zoomIndicator: { position: "absolute", bottom: 8, left: 10, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "#1A2030", borderRadius: 4, paddingHorizontal: 9, paddingVertical: 3, alignItems: "center" },
  zoomIndicatorText: { color: "#2AA8F2", fontSize: 11, fontFamily: DS.fontMono, fontWeight: "700" },
  zoomIndicatorLabel: { color: "#1A2840", fontSize: 7, fontFamily: DS.fontMono, letterSpacing: 0.8 },
  layerIndicator: { position: "absolute", bottom: 8, left: "50%", transform: [{ translateX: -60 }], flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "#1A2030", borderRadius: 4, paddingHorizontal: 9, paddingVertical: 4 },
  layerIndicatorDot: { width: 7, height: 7, borderRadius: 3.5 },
  layerIndicatorText: { color: "#3A4860", fontSize: 8, fontFamily: DS.fontMono, letterSpacing: 0.8 },
});