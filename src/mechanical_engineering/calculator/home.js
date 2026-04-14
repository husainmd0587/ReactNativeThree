import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  RoundedRect,
  Path,
  Oval,
  Paint,
  Skia,
  BlendMode,
} from '@shopify/react-native-skia';

// ─── Helper: polygon path string → Skia Path ─────────────────────────────────
const makePolygonPath = (points) => {
  const path = Skia.Path.Make();
  const pts = points.trim().split(/\s+/).map((p) => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
  path.close();
  return path;
};

const makeSvgPath = (d) => Skia.Path.MakeFromSVGString(d);

// ─── Shape Icons (Skia) ───────────────────────────────────────────────────────
const ShapeIcon = ({ shapeKey, size = 44 }) => {
  const s = size;
  const c = s / 2;
  const BLUE = '#4169E1';
  const WHITE = '#FFFFFF';

  const blue = Skia.Paint();
  blue.setColor(Skia.Color(BLUE));

  const white = Skia.Paint();
  white.setColor(Skia.Color(WHITE));
  white.setBlendMode(BlendMode.Clear);

  const whiteStroke = Skia.Paint();
  whiteStroke.setColor(Skia.Color(WHITE));
  whiteStroke.setStyle(1); // stroke
  whiteStroke.setStrokeWidth(1.5);
  whiteStroke.setBlendMode(BlendMode.Clear);

  const canvasProps = { width: s, height: s, style: { width: s, height: s } };

  switch (shapeKey) {

    case 'round_bar':
      return (
        <Canvas {...canvasProps}>
          <Circle cx={c} cy={c} r={c * 0.7} paint={blue} />
        </Canvas>
      );

    case 'round_tube':
      return (
        <Canvas {...canvasProps}>
          <Circle cx={c} cy={c} r={c * 0.7} paint={blue} />
          <Circle cx={c} cy={c} r={c * 0.35} paint={white} />
        </Canvas>
      );

    case 'round_hex': {
      const hexPts = `${c},${c*0.25} ${c*1.6},${c*0.6} ${c*1.6},${c*1.4} ${c},${c*1.75} ${c*0.4},${c*1.4} ${c*0.4},${c*0.6}`;
      return (
        <Canvas {...canvasProps}>
          <Circle cx={c} cy={c} r={c * 0.7} paint={blue} />
          <Path path={makePolygonPath(hexPts)} paint={white} />
        </Canvas>
      );
    }

    case 'sphere': {
      const ovalH = Skia.Path.Make();
      ovalH.addOval({ x: c - c*0.7, y: c - c*0.2, width: c*1.4, height: c*0.4 });
      const ovalV = Skia.Path.Make();
      ovalV.addOval({ x: c - c*0.2, y: c - c*0.7, width: c*0.4, height: c*1.4 });
      return (
        <Canvas {...canvasProps}>
          <Circle cx={c} cy={c} r={c * 0.7} paint={blue} />
          <Path path={ovalH} paint={whiteStroke} />
          <Path path={ovalV} paint={whiteStroke} />
        </Canvas>
      );
    }

    case 'square_bar':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.25} y={c*0.25} width={c*1.5} height={c*1.5} paint={blue} />
        </Canvas>
      );

    case 'square_tube':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.2} y={c*0.2} width={c*1.6} height={c*1.6} paint={blue} />
          <Rect x={c*0.55} y={c*0.55} width={c*0.9} height={c*0.9} paint={white} />
        </Canvas>
      );

    case 'square_round':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.2} y={c*0.2} width={c*1.6} height={c*1.6} paint={blue} />
          <Circle cx={c} cy={c} r={c*0.45} paint={white} />
        </Canvas>
      );

    case 'flat_bar':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.1} y={c*0.55} width={c*1.8} height={c*0.9} paint={blue} />
        </Canvas>
      );

    case 'rect_pipe':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.1} y={c*0.4} width={c*1.8} height={c*1.1} paint={blue} />
          <Rect x={c*0.35} y={c*0.65} width={c*1.3} height={c*0.6} paint={white} />
        </Canvas>
      );

    case 'hex_bar': {
      const pts = `${c},${c*0.2} ${c*1.7},${c*0.6} ${c*1.7},${c*1.4} ${c},${c*1.8} ${c*0.3},${c*1.4} ${c*0.3},${c*0.6}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
        </Canvas>
      );
    }

    case 'hex_round': {
      const pts = `${c},${c*0.2} ${c*1.7},${c*0.6} ${c*1.7},${c*1.4} ${c},${c*1.8} ${c*0.3},${c*1.4} ${c*0.3},${c*0.6}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
          <Circle cx={c} cy={c} r={c*0.42} paint={white} />
        </Canvas>
      );
    }

    case 'octagonal': {
      const pts = `${c*0.65},${c*0.2} ${c*1.35},${c*0.2} ${c*1.8},${c*0.65} ${c*1.8},${c*1.35} ${c*1.35},${c*1.8} ${c*0.65},${c*1.8} ${c*0.2},${c*1.35} ${c*0.2},${c*0.65}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
        </Canvas>
      );
    }

    case 'triangle': {
      const pts = `${c},${c*0.2} ${c*1.8},${c*1.8} ${c*0.2},${c*1.8}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
        </Canvas>
      );
    }

    case 'trapezoid': {
      const pts = `${c*0.4},${c*0.3} ${c*1.6},${c*0.3} ${c*1.8},${c*1.7} ${c*0.2},${c*1.7}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
        </Canvas>
      );
    }

    case 'trapezium': {
      const pts = `${c*0.9},${c*0.3} ${c*1.8},${c*0.3} ${c*1.8},${c*1.7} ${c*0.2},${c*1.7}`;
      return (
        <Canvas {...canvasProps}>
          <Path path={makePolygonPath(pts)} paint={blue} />
        </Canvas>
      );
    }

    case 'oval': {
      const ovalPath = Skia.Path.Make();
      ovalPath.addOval({ x: c - c*0.85, y: c - c*0.5, width: c*1.7, height: c*1.0 });
      return (
        <Canvas {...canvasProps}>
          <Path path={ovalPath} paint={blue} />
        </Canvas>
      );
    }

    case 'cr_square':
      return (
        <Canvas {...canvasProps}>
          <RoundedRect x={c*0.2} y={c*0.2} width={c*1.6} height={c*1.6} r={c*0.35} paint={blue} />
        </Canvas>
      );

    case 'cr_rect':
      return (
        <Canvas {...canvasProps}>
          <RoundedRect x={c*0.15} y={c*0.3} width={c*1.7} height={c*1.4} r={c*0.3} paint={blue} />
        </Canvas>
      );

    case 'angle':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*0.25},${c*0.25} L${c*0.25},${c*1.75} L${c*1.75},${c*1.75} L${c*1.75},${c*1.35} L${c*0.65},${c*1.35} L${c*0.65},${c*0.25} Z`)} paint={blue} />
        </Canvas>
      );

    case 'channel':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*0.25},${c*0.25} L${c*1.6},${c*0.25} L${c*1.6},${c*0.65} L${c*0.65},${c*0.65} L${c*0.65},${c*1.35} L${c*1.6},${c*1.35} L${c*1.6},${c*1.75} L${c*0.25},${c*1.75} Z`)} paint={blue} />
        </Canvas>
      );

    case 't_bar':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*0.2},${c*0.25} L${c*1.8},${c*0.25} L${c*1.8},${c*0.7} L${c*1.2},${c*0.7} L${c*1.2},${c*1.75} L${c*0.8},${c*1.75} L${c*0.8},${c*0.7} L${c*0.2},${c*0.7} Z`)} paint={blue} />
        </Canvas>
      );

    case 'i_beam':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*0.2},${c*0.2} L${c*1.8},${c*0.2} L${c*1.8},${c*0.6} L${c*1.2},${c*0.6} L${c*1.2},${c*1.4} L${c*1.8},${c*1.4} L${c*1.8},${c*1.8} L${c*0.2},${c*1.8} L${c*0.2},${c*1.4} L${c*0.8},${c*1.4} L${c*0.8},${c*0.6} L${c*0.2},${c*0.6} Z`)} paint={blue} />
        </Canvas>
      );

    case 'c_shape':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*1.75},${c*0.25} L${c*0.25},${c*0.25} L${c*0.25},${c*1.75} L${c*1.75},${c*1.75} L${c*1.75},${c*1.35} L${c*0.65},${c*1.35} L${c*0.65},${c*0.65} L${c*1.75},${c*0.65} Z`)} paint={blue} />
        </Canvas>
      );

    case 'e_shape':
      return (
        <Canvas {...canvasProps}>
          <Path path={makeSvgPath(`M${c*0.25},${c*0.25} L${c*1.75},${c*0.25} L${c*1.75},${c*0.6} L${c*0.65},${c*0.6} L${c*0.65},${c*0.85} L${c*1.6},${c*0.85} L${c*1.6},${c*1.15} L${c*0.65},${c*1.15} L${c*0.65},${c*1.4} L${c*1.75},${c*1.4} L${c*1.75},${c*1.75} L${c*0.25},${c*1.75} Z`)} paint={blue} />
        </Canvas>
      );

    case 'sheet':
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.1} y={c*0.3} width={c*1.8} height={c*1.4} paint={blue} />
        </Canvas>
      );

    default:
      return (
        <Canvas {...canvasProps}>
          <Rect x={c*0.2} y={c*0.2} width={c*1.6} height={c*1.6} paint={blue} />
        </Canvas>
      );
  }
};

// ─── Data ────────────────────────────────────────────────────────────────────
const MATERIALS = [
  { label: 'Steel / MS',      density: 7850 },
  { label: 'Aluminum',        density: 2700 },
  { label: 'Brass',           density: 8500 },
  { label: 'Copper',          density: 8960 },
  { label: 'Stainless Steel', density: 7900 },
  { label: 'Bronze',          density: 8800 },
  { label: 'Acrylic',         density: 1180 },
  { label: 'Beryllium',       density: 1850 },
  { label: 'Cast Iron',       density: 7200 },
  { label: 'Chrome',          density: 7190 },
  { label: 'Columbium',       density: 8570 },
  { label: 'Duralumin',       density: 2790 },
  { label: 'Glass',           density: 2500 },
  { label: 'Gold',            density: 19300 },
  { label: 'Lead',            density: 11340 },
  { label: 'Magnesium',       density: 1740 },
  { label: 'Mercury',         density: 13600 },
  { label: 'Molybdenum',      density: 10220 },
  { label: 'Nickel',          density: 8900 },
  { label: 'Nylon',           density: 1150 },
  { label: 'PB / Gunmetal',   density: 8770 },
  { label: 'Platinum',        density: 21450 },
  { label: 'Polycarbonate',   density: 1200 },
  { label: 'Polyethylene',    density: 960 },
  { label: 'Polypropylene',   density: 910 },
  { label: 'Potassium',       density: 860 },
  { label: 'PVDF',            density: 1780 },
  { label: 'Silver',          density: 10490 },
  { label: 'Tantalum',        density: 16690 },
  { label: 'Teflon',          density: 2200 },
  { label: 'Tin',             density: 7300 },
  { label: 'Titanium',        density: 4510 },
  { label: 'Tungsten',        density: 19300 },
  { label: 'Water',           density: 1000 },
  { label: 'Zinc',            density: 7133 },
  { label: 'Zirconium',       density: 6510 },
  { label: 'Custom...',       density: null },
];

const UNITS = [
  { label: 'mm', desc: 'Millimetre', toMm: 1 },
  { label: 'cm', desc: 'Centimetre', toMm: 10 },
  { label: 'm',  desc: 'Metre',      toMm: 1000 },
  { label: 'in', desc: 'Inch',       toMm: 25.4 },
  { label: 'ft', desc: 'Foot',       toMm: 304.8 },
  { label: 'yd', desc: 'Yard',       toMm: 914.4 },
];

const SHAPES = {
  round_bar: {
    label: 'Round',
    dims: [{ id: 'dia', label: 'Diameter', defaultVal: '25' }],
    area: (d) => Math.PI * Math.pow(d.dia / 2, 2),
  },
  round_tube: {
    label: 'Round Pipe',
    dims: [
      { id: 'od', label: 'Outer dia', defaultVal: '40' },
      { id: 'wt', label: 'Wall thick.', defaultVal: '3' },
    ],
    area: (d) => {
      const r1 = d.od / 2, r2 = d.od / 2 - d.wt;
      return Math.PI * (r1 * r1 - r2 * r2);
    },
  },
  round_hex: {
    label: 'Round (Hex)',
    dims: [
      { id: 'od', label: 'Outer dia', defaultVal: '40' },
      { id: 'af', label: 'Hex across flats', defaultVal: '20' },
    ],
    area: (d) => {
      const circleArea = Math.PI * Math.pow(d.od / 2, 2);
      const s = d.af / Math.sqrt(3);
      const hexArea = (3 * Math.sqrt(3) / 2) * s * s;
      return circleArea - hexArea;
    },
  },
  sphere: {
    label: 'Sphere / Ball',
    dims: [{ id: 'dia', label: 'Diameter', defaultVal: '50' }],
    area: (d) => Math.PI * Math.pow(d.dia / 2, 2),
    volumeOverride: (d) => (4 / 3) * Math.PI * Math.pow(d.dia / 2, 3),
  },
  square_bar: {
    label: 'Square',
    dims: [{ id: 'side', label: 'Side', defaultVal: '25' }],
    area: (d) => d.side * d.side,
  },
  square_tube: {
    label: 'Square Pipe',
    dims: [
      { id: 'ow', label: 'Outer W', defaultVal: '50' },
      { id: 'oh', label: 'Outer H', defaultVal: '50' },
      { id: 'wt', label: 'Wall thick.', defaultVal: '3' },
    ],
    area: (d) => d.ow * d.oh - (d.ow - 2 * d.wt) * (d.oh - 2 * d.wt),
  },
  square_round: {
    label: 'Square (Round)',
    dims: [
      { id: 'side', label: 'Side', defaultVal: '50' },
      { id: 'dia', label: 'Hole dia', defaultVal: '25' },
    ],
    area: (d) => d.side * d.side - Math.PI * Math.pow(d.dia / 2, 2),
  },
  flat_bar: {
    label: 'Rectangle / Sheet',
    dims: [
      { id: 'width', label: 'Width', defaultVal: '50' },
      { id: 'thickness', label: 'Thickness', defaultVal: '6' },
    ],
    area: (d) => d.width * d.thickness,
  },
  rect_pipe: {
    label: 'Rectangle Pipe',
    dims: [
      { id: 'ow', label: 'Outer W', defaultVal: '60' },
      { id: 'oh', label: 'Outer H', defaultVal: '40' },
      { id: 'wt', label: 'Wall thick.', defaultVal: '3' },
    ],
    area: (d) => d.ow * d.oh - (d.ow - 2 * d.wt) * (d.oh - 2 * d.wt),
  },
  hex_bar: {
    label: 'Hex',
    dims: [{ id: 'af', label: 'Across flats', defaultVal: '30' }],
    area: (d) => { const s = d.af / Math.sqrt(3); return (3 * Math.sqrt(3) / 2) * s * s; },
  },
  hex_round: {
    label: 'Hex (Round)',
    dims: [
      { id: 'af', label: 'Across flats', defaultVal: '30' },
      { id: 'dia', label: 'Hole dia', defaultVal: '15' },
    ],
    area: (d) => {
      const s = d.af / Math.sqrt(3);
      const hexArea = (3 * Math.sqrt(3) / 2) * s * s;
      return hexArea - Math.PI * Math.pow(d.dia / 2, 2);
    },
  },
  octagonal: {
    label: 'Octagonal',
    dims: [{ id: 'af', label: 'Across flats', defaultVal: '40' }],
    area: (d) => 2 * (Math.sqrt(2) - 1) * d.af * d.af,
  },
  triangle: {
    label: 'Triangle',
    dims: [
      { id: 'base', label: 'Base', defaultVal: '50' },
      { id: 'height', label: 'Height', defaultVal: '43' },
    ],
    area: (d) => 0.5 * d.base * d.height,
  },
  trapezoid: {
    label: 'Trapezoid',
    dims: [
      { id: 'a', label: 'Top width', defaultVal: '30' },
      { id: 'b', label: 'Bottom width', defaultVal: '60' },
      { id: 'h', label: 'Height', defaultVal: '40' },
    ],
    area: (d) => 0.5 * (d.a + d.b) * d.h,
  },
  trapezium: {
    label: 'Trapezium',
    dims: [
      { id: 'a', label: 'Parallel side A', defaultVal: '50' },
      { id: 'b', label: 'Parallel side B', defaultVal: '30' },
      { id: 'h', label: 'Height', defaultVal: '40' },
    ],
    area: (d) => 0.5 * (d.a + d.b) * d.h,
  },
  oval: {
    label: 'Oval',
    dims: [
      { id: 'a', label: 'Major axis', defaultVal: '60' },
      { id: 'b', label: 'Minor axis', defaultVal: '30' },
    ],
    area: (d) => Math.PI * (d.a / 2) * (d.b / 2),
  },
  cr_square: {
    label: 'CR Square',
    dims: [
      { id: 'side', label: 'Side', defaultVal: '50' },
      { id: 'r', label: 'Corner radius', defaultVal: '8' },
    ],
    area: (d) => d.side * d.side - (4 - Math.PI) * d.r * d.r,
  },
  cr_rect: {
    label: 'CR Rectangle',
    dims: [
      { id: 'w', label: 'Width', defaultVal: '60' },
      { id: 'h', label: 'Height', defaultVal: '40' },
      { id: 'r', label: 'Corner radius', defaultVal: '8' },
    ],
    area: (d) => d.w * d.h - (4 - Math.PI) * d.r * d.r,
  },
  angle: {
    label: 'Angle / L',
    dims: [
      { id: 'a', label: 'Leg A', defaultVal: '50' },
      { id: 'b', label: 'Leg B', defaultVal: '50' },
      { id: 't', label: 'Thickness', defaultVal: '5' },
    ],
    area: (d) => d.a * d.t + (d.b - d.t) * d.t,
  },
  channel: {
    label: 'Channel / C',
    dims: [
      { id: 'h', label: 'Height', defaultVal: '100' },
      { id: 'w', label: 'Flange W', defaultVal: '50' },
      { id: 't', label: 'Thickness', defaultVal: '6' },
    ],
    area: (d) => d.h * d.t + 2 * (d.w - d.t) * d.t,
  },
  t_bar: {
    label: 'T Bar',
    dims: [
      { id: 'fw', label: 'Flange W', defaultVal: '80' },
      { id: 'ft', label: 'Flange thick.', defaultVal: '8' },
      { id: 'h', label: 'Web height', defaultVal: '80' },
      { id: 'wt', label: 'Web thick.', defaultVal: '6' },
    ],
    area: (d) => d.fw * d.ft + (d.h - d.ft) * d.wt,
  },
  i_beam: {
    label: 'I Beam',
    dims: [
      { id: 'h', label: 'Height', defaultVal: '200' },
      { id: 'fw', label: 'Flange W', defaultVal: '100' },
      { id: 'fw_t', label: 'Flange thick.', defaultVal: '10' },
      { id: 'wt', label: 'Web thick.', defaultVal: '6' },
    ],
    area: (d) => 2 * (d.fw * d.fw_t) + (d.h - 2 * d.fw_t) * d.wt,
  },
  c_shape: {
    label: 'C Shape',
    dims: [
      { id: 'h', label: 'Height', defaultVal: '100' },
      { id: 'w', label: 'Width', defaultVal: '60' },
      { id: 't', label: 'Thickness', defaultVal: '6' },
    ],
    area: (d) => 2 * d.w * d.t + (d.h - 2 * d.t) * d.t,
  },
  e_shape: {
    label: 'E Shape',
    dims: [
      { id: 'h', label: 'Height', defaultVal: '100' },
      { id: 'w', label: 'Width', defaultVal: '60' },
      { id: 't', label: 'Thickness', defaultVal: '6' },
    ],
    area: (d) => 3 * d.w * d.t + 2 * (d.h / 2 - 1.5 * d.t) * d.t,
  },
  sheet: {
    label: 'Sheet / Plate',
    dims: [
      { id: 'w', label: 'Width', defaultVal: '1000' },
      { id: 'h', label: 'Height', defaultVal: '2000' },
      { id: 't', label: 'Thickness', defaultVal: '3' },
    ],
    area: (d) => d.w * d.t,
    areaFull: (d) => d.w * d.h * d.t,
  },
};

const SHAPE_KEYS = Object.keys(SHAPES);

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0D0D',
  card: '#1C1C1C',
  border: '#2A2A2A',
  accent: '#E8C84A',
  accentDim: '#3D3214',
  text: '#F0EDE6',
  textSub: '#888880',
  textMuted: '#444440',
  unitBg: '#252523',
  unitBorder: '#333330',
};

// ─── Input field ─────────────────────────────────────────────────────────────
const InputField = ({ label, value, onChangeText, unitLabel, onUnitPress, placeholder }) => (
  <View style={styles.inputWrap}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0'}
        placeholderTextColor={C.textMuted}
        selectionColor={C.accent}
      />
      {unitLabel !== undefined && (
        <TouchableOpacity onPress={onUnitPress} style={styles.unitBtn} activeOpacity={0.7}>
          <Text style={styles.unitBtnText}>{unitLabel}</Text>
          <Text style={styles.unitArrow}>▾</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── Result card ─────────────────────────────────────────────────────────────
const ResultCard = ({ label, value, unit, highlight }) => (
  <View style={[styles.resultCard, highlight && styles.resultCardHL]}>
    <Text style={[styles.resultLabel, highlight && styles.resultLabelHL]}>{label}</Text>
    <Text style={[styles.resultValue, highlight && styles.resultValueHL]}>{value}</Text>
    <Text style={[styles.resultUnit, highlight && styles.resultUnitHL]}>{unit}</Text>
  </View>
);

// ─── Animated Bottom Sheet wrapper ───────────────────────────────────────────
const SCREEN_H = Dimensions.get('window').height;

const BottomSheet = ({ visible, onClose, title, children, snapHeight = 0.82 }) => {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && translateY._value === SCREEN_H) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.modalOverlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[
            styles.modalSheet,
            { height: SCREEN_H * snapHeight, transform: [{ translateY }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Shape Picker Modal ───────────────────────────────────────────────────────
const ShapePickerModal = ({ visible, currentKey, onSelect, onClose }) => {
  const renderItem = ({ item: key }) => {
    const isActive = key === currentKey;
    return (
      <TouchableOpacity
        style={[styles.shapeCell, isActive && styles.shapeCellActive]}
        onPress={() => onSelect(key)}
        activeOpacity={0.7}
      >
        <View style={styles.shapeIconWrap}>
          <ShapeIcon shapeKey={key} size={44} />
        </View>
        <Text style={[styles.shapeCellLabel, isActive && styles.shapeCellLabelActive]} numberOfLines={2}>
          {SHAPES[key].label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select Profile" snapHeight={0.85}>
      <FlatList
        data={SHAPE_KEYS}
        renderItem={renderItem}
        keyExtractor={(k) => k}
        numColumns={3}
        contentContainerStyle={[styles.shapeGrid, { paddingBottom: 34 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
      />
    </BottomSheet>
  );
};

// ─── Material Picker Modal ────────────────────────────────────────────────────
const MaterialPickerModal = ({ visible, currentIdx, onSelect, onClose }) => {
  const pairs = [];
  for (let i = 0; i < MATERIALS.length; i += 2) {
    pairs.push([i, i + 1 < MATERIALS.length ? i + 1 : null]);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select Material" snapHeight={0.82}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
        {pairs.map(([li, ri]) => (
          <View key={li} style={styles.matRow}>
            {[li, ri].map((i) => {
              if (i === null) return <View key="empty" style={styles.matCell} />;
              const m = MATERIALS[i];
              const isActive = i === currentIdx;
              return (
                <TouchableOpacity
                  key={m.label}
                  style={[styles.matCell, isActive && styles.matCellActive]}
                  onPress={() => onSelect(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.matCellText, isActive && styles.matCellTextActive]}>{m.label}</Text>
                  {m.density !== null && (
                    <Text style={[styles.matCellDensity, isActive && styles.matCellDensityActive]}>
                      {m.density} kg/m³
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};


export default function MetalWeightCalculator({ navigation }) {
  const [shapeKey, setShapeKey] = useState('round_bar');
  const [matIdx, setMatIdx] = useState(0);
  const [customDensity, setCustomDensity] = useState('7850');
  const [length, setLength] = useState('1000');
  const [qty, setQty] = useState('1');
  const [dims, setDims] = useState(() => {
    const d = {};
    SHAPES['round_bar'].dims.forEach((f) => { d[f.id] = f.defaultVal; });
    return d;
  });

  const [unitIdx, setUnitIdx] = useState({});
  const [openPanel, setOpenPanel] = useState(null);
  const [shapeModalVisible, setShapeModalVisible] = useState(false);
  const [matModalVisible, setMatModalVisible] = useState(false);
  const [mode, setMode] = useState('weight'); // 'weight' | 'length'

  const shape = SHAPES[shapeKey];
  const isCustomMat = MATERIALS[matIdx].density === null;

  const togglePanel = (name) =>
    setOpenPanel((prev) => (prev === name ? null : name));

  const switchShape = useCallback((key) => {
    setShapeKey(key);
    const d = {};
    SHAPES[key].dims.forEach((f) => { d[f.id] = f.defaultVal; });
    setDims(d);
    setShapeModalVisible(false);
  }, []);

  const setDim = (id, val) => setDims((prev) => ({ ...prev, [id]: val }));

  const selectUnit = (fieldId, idx) => {
    setUnitIdx((prev) => ({ ...prev, [fieldId]: idx }));
    setOpenPanel(null);
  };

  const getUnitIdx = (fieldId) => unitIdx[fieldId] ?? 0;
  const getUnit = (fieldId) => UNITS[getUnitIdx(fieldId)];
  const toMm = (val, fieldId) => (parseFloat(val) || 0) * getUnit(fieldId).toMm;

  const density = isCustomMat
    ? parseFloat(customDensity) || 7850
    : MATERIALS[matIdx].density;

  const numDims = {};
  shape.dims.forEach((f) => { numDims[f.id] = toMm(dims[f.id], f.id); });

  const lenMm = toMm(length, 'length');
  const pieces = parseInt(qty) || 1;

  let volumeMm3 = 0;
  let areaMm2 = 0;

  if (shapeKey === 'sheet' && shape.areaFull) {
    volumeMm3 = shape.areaFull(numDims);
    areaMm2 = numDims.w * numDims.h;
  } else if (shape.volumeOverride) {
    volumeMm3 = shape.volumeOverride(numDims);
    areaMm2 = shape.area(numDims);
  } else {
    areaMm2 = shape.area(numDims);
    volumeMm3 = areaMm2 * lenMm;
  }

  const weightKg = (volumeMm3 / 1e9) * density;
  const totalKg = weightKg * pieces;

  // Length mode: derive length from a target weight input
  const [targetWeight, setTargetWeight] = useState('10');
  const targetWeightKg = parseFloat(targetWeight) || 0;
  const lengthFromWeight = areaMm2 > 0 && density > 0
    ? (targetWeightKg * 1e9) / (areaMm2 * density)
    : 0;
  const lengthFromWeightM  = lengthFromWeight / 1000;
  const lengthFromWeightFt = lengthFromWeight / 304.8;
  const lengthFromWeightIn = lengthFromWeight / 25.4;

  const fmt = (n, dec = 3) =>
    !isFinite(n) || n < 0.0001 ? '0' : n >= 10000 ? n.toFixed(0) : n >= 1000 ? n.toFixed(1) : n.toFixed(dec);

  const renderUnitDropdown = (fieldId) =>
    openPanel === `unit:${fieldId}` && (
      <View style={styles.dropdown}>
        {UNITS.map((u, i) => {
          const active = i === getUnitIdx(fieldId);
          return (
            <TouchableOpacity
              key={u.label}
              style={[styles.dropItem, active && styles.dropItemActive]}
              onPress={() => selectUnit(fieldId, i)}
            >
              <Text style={[styles.dropItemText, active && styles.dropItemTextActive]}>{u.label}</Text>
              <Text style={styles.dropItemSub}>{u.desc}</Text>
              {active && <Text style={styles.dropCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <ShapePickerModal
        visible={shapeModalVisible}
        currentKey={shapeKey}
        onSelect={switchShape}
        onClose={() => setShapeModalVisible(false)}
      />
      <MaterialPickerModal
        visible={matModalVisible}
        currentIdx={matIdx}
        onSelect={(i) => { setMatIdx(i); setMatModalVisible(false); }}
        onClose={() => setMatModalVisible(false)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          {navigation && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerEyebrow}>INDUSTRIAL TOOLS</Text>
          <Text style={styles.headerTitle}>Metal Weight Calculator</Text>
        </View>

        {/* ── Mode Toggle ── */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'weight' && styles.toggleBtnActive]}
            onPress={() => setMode('weight')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, mode === 'weight' && styles.toggleBtnTextActive]}>⚖ Weight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'length' && styles.toggleBtnActive]}
            onPress={() => setMode('length')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, mode === 'length' && styles.toggleBtnTextActive]}>📏 Length</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Result Card ── */}
        {mode === 'weight' ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>WEIGHT PER PIECE</Text>
            <Text style={styles.heroValue}>
              {fmt(weightKg)}<Text style={styles.heroUnit}> kg</Text>
            </Text>
            <View style={styles.heroDivider} />
            {/* Single-line result row */}
            <View style={styles.heroRow}>
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>Total ({pieces} pcs)</Text>
                <Text style={styles.heroSubVal}>{fmt(totalKg)} kg</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>Grams</Text>
                <Text style={styles.heroSubVal}>{fmt(weightKg * 1000, 1)} g</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>Pounds</Text>
                <Text style={styles.heroSubVal}>{fmt(weightKg * 2.20462)} lb</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>Tonnes</Text>
                <Text style={styles.heroSubVal}>{fmt(weightKg / 1000, 4)} t</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>LENGTH PER WEIGHT</Text>
            {/* Big number = meters, mirrors the kg display in weight mode */}
            <Text style={styles.heroValue}>
              {fmt(lengthFromWeightM, 3)}<Text style={styles.heroUnit}> m</Text>
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroRow}>
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>mm</Text>
                <Text style={styles.heroSubVal}>{fmt(lengthFromWeight, 0)}</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>cm</Text>
                <Text style={styles.heroSubVal}>{fmt(lengthFromWeight / 10, 1)}</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>ft</Text>
                <Text style={styles.heroSubVal}>{fmt(lengthFromWeightFt, 2)}</Text>
              </View>
              <View style={styles.heroSepLine} />
              <View style={styles.heroSub}>
                <Text style={styles.heroSubLabel}>inches</Text>
                <Text style={styles.heroSubVal}>{fmt(lengthFromWeightIn, 1)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Shape selector — shows icon + name, opens modal */}
        <Text style={styles.sectionLabel}>Profile</Text>
        <TouchableOpacity
          style={styles.shapeSelector}
          onPress={() => setShapeModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.shapeSelectorIcon}>
            <ShapeIcon shapeKey={shapeKey} size={40} />
          </View>
          <View style={styles.shapeSelectorText}>
            <Text style={styles.shapeSelectorName}>{shape.label}</Text>
            <Text style={styles.shapeSelectorHint}>Tap to change profile</Text>
          </View>
          <Text style={styles.shapeSelectorArrow}>›</Text>
        </TouchableOpacity>

        {/* Material */}
        <Text style={styles.sectionLabel}>Material</Text>
        <TouchableOpacity
          style={styles.shapeSelector}
          onPress={() => setMatModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.shapeSelectorText}>
            <Text style={styles.shapeSelectorName}>{MATERIALS[matIdx].label}</Text>
            {MATERIALS[matIdx].density !== null && (
              <Text style={styles.shapeSelectorHint}>{MATERIALS[matIdx].density} kg/m³</Text>
            )}
          </View>
          <Text style={styles.shapeSelectorArrow}>›</Text>
        </TouchableOpacity>

        {isCustomMat && (
          <InputField
            label="Custom density (kg/m³)"
            value={customDensity}
            onChangeText={setCustomDensity}
            placeholder="7850"
          />
        )}

        {/* Dimensions */}
        <Text style={styles.sectionLabel}>Dimensions</Text>
        <View style={styles.dimGrid}>
          {shape.dims.map((f) => (
            <View key={f.id} style={[styles.dimCell, shape.dims.length === 1 && { width: '100%' }]}>
              <InputField
                label={f.label}
                value={dims[f.id] ?? f.defaultVal}
                onChangeText={(v) => setDim(f.id, v)}
                unitLabel={getUnit(f.id).label}
                onUnitPress={() => togglePanel(`unit:${f.id}`)}
              />
              {renderUnitDropdown(f.id)}
            </View>
          ))}
        </View>

        {/* Length & Qty — only in weight mode, hide for sphere/sheet */}
        {mode === 'weight' && shapeKey !== 'sphere' && shapeKey !== 'sheet' && (
          <>
            <Text style={styles.sectionLabel}>Length & Quantity</Text>
            <View style={styles.dimGrid}>
              <View style={styles.dimCell}>
                <InputField
                  label="Length"
                  value={length}
                  onChangeText={setLength}
                  unitLabel={getUnit('length').label}
                  onUnitPress={() => togglePanel('unit:length')}
                />
                {renderUnitDropdown('length')}
              </View>
              <View style={styles.dimCell}>
                <InputField label="Qty (pcs)" value={qty} onChangeText={setQty} />
              </View>
            </View>
          </>
        )}

        {/* Weight input — only in length mode, shown near dimension fields */}
        {mode === 'length' && (
          <>
            <Text style={styles.sectionLabel}>Weight Input</Text>
            <View style={styles.dimGrid}>
              <View style={styles.dimCell}>
                <InputField
                  label="Weight (kg)"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  placeholder="10"
                />
              </View>
            </View>
          </>
        )}

        {/* Detail strip — single row, no scroll */}
        <View style={styles.detailStrip}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Area</Text>
            <Text style={styles.detailVal}>{fmt(areaMm2, 1)}</Text>
            <Text style={styles.detailUnit}>mm²</Text>
          </View>
          <View style={styles.detailSep} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Volume</Text>
            <Text style={styles.detailVal}>{fmt(volumeMm3 / 1000, 1)}</Text>
            <Text style={styles.detailUnit}>cm³</Text>
          </View>
          <View style={styles.detailSep} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Density</Text>
            <Text style={styles.detailVal}>{density >= 1000 ? (density/1000).toFixed(2) : density}</Text>
            <Text style={styles.detailUnit}>{density >= 1000 ? 't/m³' : 'kg/m³'}</Text>
          </View>
          <View style={styles.detailSep} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>kg/m</Text>
            <Text style={styles.detailVal}>
              {shapeKey === 'sheet' || shapeKey === 'sphere' ? '—' : fmt((areaMm2 / 1e6) * density, 2)}
            </Text>
            <Text style={styles.detailUnit}>kg/m</Text>
          </View>
        </View>

        <Text style={styles.footer}>Tap the unit badge on any input to select a unit</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 44 },

  header: { marginBottom: 14, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4, paddingHorizontal: 2 },
  backArrow: { fontSize: 26, color: C.accent, lineHeight: 28, marginRight: 2 },
  backLabel: { fontSize: 14, color: C.accent, fontWeight: '500' },
  headerEyebrow: { fontSize: 10, letterSpacing: 3, color: C.accent, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.text },

  heroCard: { backgroundColor: C.accent, borderRadius: 14, padding: 16, marginBottom: 14 },
  heroLabel: { fontSize: 9, fontWeight: '700', color: '#6B5800', letterSpacing: 1.5, marginBottom: 2 },
  heroValue: { fontSize: 40, fontWeight: '800', color: '#1A1200' },
  heroUnit: { fontSize: 20, fontWeight: '600', color: '#5A4A00' },
  heroDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.12)', marginVertical: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroSub: { flex: 1, alignItems: 'center' },
  heroSubLabel: { fontSize: 9, color: '#7A6400', fontWeight: '500', marginBottom: 2 },
  heroSubVal: { fontSize: 13, fontWeight: '700', color: '#1A1200' },
  heroSepLine: { width: 1, height: 26, backgroundColor: 'rgba(0,0,0,0.15)' },

  sectionLabel: {
    fontSize: 9, letterSpacing: 2, color: C.textMuted,
    fontWeight: '600', marginBottom: 6, marginTop: 8, textTransform: 'uppercase',
  },

  shapeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  shapeSelectorIcon: { marginRight: 12 },
  shapeSelectorText: { flex: 1 },
  shapeSelectorName: { fontSize: 15, fontWeight: '600', color: C.text },
  shapeSelectorHint: { fontSize: 11, color: C.textSub, marginTop: 2 },
  shapeSelectorArrow: { fontSize: 22, color: C.textSub },

  pickerBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerBtnFullText: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },
  pickerArrow: { fontSize: 9, color: C.textSub },

  dropdown: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropItemActive: { backgroundColor: C.accentDim },
  dropItemText: { fontSize: 13, color: C.text, flex: 1 },
  dropItemTextActive: { color: C.accent, fontWeight: '600' },
  dropItemSub: { fontSize: 11, color: C.textSub, marginRight: 8 },
  dropCheck: { fontSize: 13, color: C.accent, fontWeight: '700' },

  inputWrap: { marginBottom: 8 },
  inputLabel: { fontSize: 10, color: C.textSub, fontWeight: '500', marginBottom: 4, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    height: 34,
    overflow: 'hidden',
  },
  input: { flex: 1, height: 34, paddingHorizontal: 10, fontSize: 13, color: C.text },
  unitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.unitBg,
    borderLeftWidth: 1,
    borderLeftColor: C.unitBorder,
    paddingHorizontal: 8,
    height: 34,
    minWidth: 44,
  },
  unitBtnText: { fontSize: 11, color: C.accent, fontWeight: '700' },
  unitArrow: { fontSize: 8, color: C.textMuted, marginLeft: 2 },

  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dimCell: { width: '48%' },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  resultCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 12, width: '47.5%',
  },
  resultCardHL: { backgroundColor: C.accentDim, borderColor: C.accent },
  resultLabel: { fontSize: 9, color: C.textSub, marginBottom: 3, letterSpacing: 0.5 },
  resultLabelHL: { color: C.accent },
  resultValue: { fontSize: 18, fontWeight: '700', color: C.text },
  resultValueHL: { color: C.accent },
  resultUnit: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  resultUnitHL: { color: C.accent },

  footer: { fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 16 },

  // ── Mode toggle ──
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: C.accent },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  toggleBtnTextActive: { color: '#1A1200' },

  // ── Length mode input inside hero ──
  lengthInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  lengthInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1A1200',
    minWidth: 80,
    padding: 0,
  },
  lengthInputUnit: { fontSize: 20, fontWeight: '600', color: '#5A4A00', marginLeft: 6 },

  heroWeightInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1200',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 1,
    paddingHorizontal: 2,
    minWidth: 44,
    textAlign: 'center',
  },

  // ── Detail strip ──
  detailStrip: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  detailItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  detailSep: { width: 1, backgroundColor: C.border, marginVertical: 8 },
  detailLabel: { fontSize: 9, color: C.textMuted, letterSpacing: 0.5, marginBottom: 3, fontWeight: '600' },
  detailVal: { fontSize: 13, fontWeight: '700', color: C.text },
  detailUnit: { fontSize: 9, color: C.textSub, marginTop: 1 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 16, color: C.textSub },

  shapeGrid: { padding: 8 },
  shapeCell: {
    flex: 1,
    margin: 5,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    minHeight: 90,
  },
  shapeCellActive: {
    backgroundColor: C.accentDim,
    borderColor: C.accent,
  },
  shapeIconWrap: { marginBottom: 8 },
  shapeCellLabel: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  shapeCellLabelActive: { color: C.accent },

  matRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  matCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
    justifyContent: 'center',
  },
  matCellActive: { backgroundColor: C.accentDim },
  matCellText: { fontSize: 14, fontWeight: '600', color: C.text },
  matCellTextActive: { color: C.accent },
  matCellDensity: { fontSize: 11, color: C.textSub, marginTop: 2 },
  matCellDensityActive: { color: C.accent },
});