import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Canvas, Path, Circle, Rect, Skia } from '@shopify/react-native-skia';
import { BoxGeometry } from 'three';
// NOTE: adjust this relative path if beamDeflectionCalculator.js ends up at a
// different folder depth than wherever this was copied from — same class of
// "Unable to resolve module" error you hit earlier will show up here if it's
// off by a level.
import CanvaProvider, { AutoFitCamera, useScene } from '../../../utils/ThreeJs_Utils/provider';

// ─────────────────────────────────────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F4F6',
  card: '#FFFFFF',
  border: '#E4E4E8',
  text: '#181818',
  textSub: '#6B6B72',
  textMuted: '#9A9AA2',
  accent: '#FFA500',
  accentBg: '#FFF5E6',
  ok: '#1B8A5A',
  okBg: '#E4F6ED',
  fail: '#D64545',
  failBg: '#FCE8E8',
};

// ─────────────────────────────────────────────────────────────────────────────
//  BEAM CASES — support condition + load type, with closed-form formulas.
//  All formulas are in consistent SI-derived units: L in mm, P in N,
//  w in N/mm, M in N·mm, E in MPa (N/mm²), I in mm⁴ — so δ resolves to mm
//  and σ resolves to MPa without unit conversion inside the math.
// ─────────────────────────────────────────────────────────────────────────────
const CASES = [
  {
    id: 'ss_center_point', group: 'Simply Supported', label: 'Point load at center',
    needs: ['P'], hasPosition: false,
  },
  {
    id: 'ss_point_position', group: 'Simply Supported', label: 'Point load at any position',
    needs: ['P'], hasPosition: true,
  },
  {
    id: 'ss_udl', group: 'Simply Supported', label: 'Uniformly distributed load',
    needs: ['w'], hasPosition: false,
  },
  {
    id: 'ss_two_point_third', group: 'Simply Supported', label: 'Two equal loads at L/3 points',
    needs: ['P'], hasPosition: false,
  },
  {
    id: 'cant_end_point', group: 'Cantilever', label: 'Point load at free end',
    needs: ['P'], hasPosition: false,
  },
  {
    id: 'cant_point_position', group: 'Cantilever', label: 'Point load at any position',
    needs: ['P'], hasPosition: true,
  },
  {
    id: 'cant_udl', group: 'Cantilever', label: 'Uniformly distributed load',
    needs: ['w'], hasPosition: false,
  },
  {
    id: 'cant_end_moment', group: 'Cantilever', label: 'Moment applied at free end',
    needs: ['M'], hasPosition: false,
  },
  {
    id: 'ff_center_point', group: 'Fixed–Fixed', label: 'Point load at center',
    needs: ['P'], hasPosition: false,
  },
  {
    id: 'ff_udl', group: 'Fixed–Fixed', label: 'Uniformly distributed load',
    needs: ['w'], hasPosition: false,
  },
];

function beamType(caseId) {
  if (caseId.startsWith('ss_')) return 'simply-supported';
  if (caseId.startsWith('cant_')) return 'cantilever';
  return 'fixed-fixed';
}

// Core mechanics-of-materials solver. Returns reactions, max moment (+location),
// max deflection (+location), and — for cantilevers — the max slope, which is
// the extra "advanced" figure a basic calculator wouldn't surface.
function computeBeam(caseId, { L, P, w, M, a, EI }) {
  switch (caseId) {
    case 'ss_center_point': {
      const RA = P / 2, RB = P / 2;
      const Mmax = (P * L) / 4;
      const deltaMax = (P * L ** 3) / (48 * EI);
      return { RA, RB, Mmax, MmaxAt: L / 2, deltaMax, deltaMaxAt: L / 2 };
    }
    case 'ss_point_position': {
      const b = L - a;
      const RA = (P * b) / L, RB = (P * a) / L;
      const Mmax = (P * a * b) / L;
      const nearIsA = a <= b;
      const near = nearIsA ? a : b;
      const far = nearIsA ? b : a;
      const xm = Math.sqrt((L * L - far * far) / 3);
      const deltaMax = (P * far * (L * L - far * far) ** 1.5) / (9 * Math.sqrt(3) * EI * L);
      const deltaMaxAt = nearIsA ? xm : L - xm;
      return { RA, RB, Mmax, MmaxAt: a, deltaMax, deltaMaxAt };
    }
    case 'ss_udl': {
      const RA = (w * L) / 2, RB = (w * L) / 2;
      const Mmax = (w * L * L) / 8;
      const deltaMax = (5 * w * L ** 4) / (384 * EI);
      return { RA, RB, Mmax, MmaxAt: L / 2, deltaMax, deltaMaxAt: L / 2 };
    }
    case 'ss_two_point_third': {
      const RA = P, RB = P;
      const Mmax = (P * L) / 3;
      const deltaMax = (23 * P * L ** 3) / (648 * EI);
      return { RA, RB, Mmax, MmaxAt: L / 2, deltaMax, deltaMaxAt: L / 2, note: 'Constant moment between the two loads' };
    }
    case 'cant_end_point': {
      const RA = P, MA = P * L;
      const deltaMax = (P * L ** 3) / (3 * EI);
      const slopeMax = (P * L * L) / (2 * EI);
      return { RA, MA, Mmax: MA, MmaxAt: 0, deltaMax, deltaMaxAt: L, slopeMax };
    }
    case 'cant_point_position': {
      const RA = P, MA = P * a;
      const deltaMax = (P * a * a * (3 * L - a)) / (6 * EI);
      const slopeMax = (P * a * a) / (2 * EI);
      return { RA, MA, Mmax: MA, MmaxAt: 0, deltaMax, deltaMaxAt: L, slopeMax };
    }
    case 'cant_udl': {
      const RA = w * L, MA = (w * L * L) / 2;
      const deltaMax = (w * L ** 4) / (8 * EI);
      const slopeMax = (w * L ** 3) / (6 * EI);
      return { RA, MA, Mmax: MA, MmaxAt: 0, deltaMax, deltaMaxAt: L, slopeMax };
    }
    case 'cant_end_moment': {
      const MA = M;
      const deltaMax = (M * L * L) / (2 * EI);
      const slopeMax = (M * L) / EI;
      return { RA: 0, MA, Mmax: MA, MmaxAt: 0, deltaMax, deltaMaxAt: L, slopeMax };
    }
    case 'ff_center_point': {
      const RA = P / 2, RB = P / 2;
      const Mmax = (P * L) / 8;
      const deltaMax = (P * L ** 3) / (192 * EI);
      return { RA, RB, Mmax, MmaxAt: 'fixed ends & center', deltaMax, deltaMaxAt: L / 2, note: 'Fixed-end moment equals center moment in magnitude' };
    }
    case 'ff_udl': {
      const RA = (w * L) / 2, RB = (w * L) / 2;
      const Mmax = (w * L * L) / 12;
      const deltaMax = (w * L ** 4) / (384 * EI);
      return { RA, RB, Mmax, MmaxAt: 'fixed ends', deltaMax, deltaMaxAt: L / 2 };
    }
    default:
      return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CROSS-SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'rect', label: 'Rectangular', fields: [{ id: 'b', label: 'Width b', unit: 'mm' }, { id: 'h', label: 'Height h', unit: 'mm' }] },
  { id: 'square', label: 'Square', fields: [{ id: 'a', label: 'Side a', unit: 'mm' }] },
  { id: 'circle', label: 'Solid Circular', fields: [{ id: 'd', label: 'Diameter d', unit: 'mm' }] },
  { id: 'tube', label: 'Hollow Circular (Tube)', fields: [{ id: 'D', label: 'Outer dia D', unit: 'mm' }, { id: 'd', label: 'Inner dia d', unit: 'mm' }] },
  { id: 'custom', label: 'Custom (I & Z from a table)', fields: [{ id: 'I', label: 'Moment of inertia I', unit: 'mm⁴' }, { id: 'Z', label: 'Section modulus Z', unit: 'mm³' }] },
];

function sectionProps(shapeId, dims) {
  switch (shapeId) {
    case 'rect': {
      const b = Number(dims.b) || 0, h = Number(dims.h) || 0;
      const I = (b * h ** 3) / 12, c = h / 2;
      return { I, c, Z: c ? I / c : 0 };
    }
    case 'square': {
      const a = Number(dims.a) || 0;
      const I = a ** 4 / 12, c = a / 2;
      return { I, c, Z: c ? I / c : 0 };
    }
    case 'circle': {
      const d = Number(dims.d) || 0;
      const I = (Math.PI * d ** 4) / 64, c = d / 2;
      return { I, c, Z: c ? I / c : 0 };
    }
    case 'tube': {
      const D = Number(dims.D) || 0, d = Number(dims.d) || 0;
      const I = (Math.PI * (D ** 4 - d ** 4)) / 64, c = D / 2;
      return { I, c, Z: c ? I / c : 0 };
    }
    case 'custom': {
      const I = Number(dims.I) || 0, Z = Number(dims.Z) || 0;
      return { I, c: Z ? I / Z : 0, Z };
    }
    default:
      return { I: 0, c: 0, Z: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MATERIALS — E in MPa (N/mm²), yield in MPa
// ─────────────────────────────────────────────────────────────────────────────
const MATERIALS = [
  { id: 'mild_steel', label: 'Mild Steel', E: 200000, yield: 250 },
  { id: 'structural_steel', label: 'Structural Steel (Fe410)', E: 200000, yield: 250 },
  { id: 'stainless_steel', label: 'Stainless Steel 304', E: 193000, yield: 215 },
  { id: 'cast_iron', label: 'Cast Iron', E: 100000, yield: 150 },
  { id: 'aluminum', label: 'Aluminum 6061-T6', E: 69000, yield: 275 },
  { id: 'titanium', label: 'Titanium Ti-6Al-4V', E: 114000, yield: 880 },
  { id: 'copper', label: 'Copper', E: 110000, yield: 70 },
  { id: 'brass', label: 'Brass', E: 100000, yield: 95 },
  { id: 'timber', label: 'Structural Timber', E: 11000, yield: 10 },
  { id: 'custom', label: 'Custom', E: null, yield: null },
];

const DEFLECTION_LIMITS = [
  { label: 'L/180 — general', value: 180 },
  { label: 'L/240 — roof members', value: 240 },
  { label: 'L/250 — machine members', value: 250 },
  { label: 'L/360 — floor members', value: 360 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SMALL UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const ChipRow = ({ options, value, onChange, getLabel = (o) => o.label, getId = (o) => o.id }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
    {options.map((opt) => {
      const active = getId(opt) === value;
      return (
        <TouchableOpacity
          key={getId(opt)}
          onPress={() => onChange(getId(opt))}
          style={[styles.chip, active && styles.chipActive]}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{getLabel(opt)}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const NumField = ({ label, unit, value, onChangeText }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}{unit ? ` (${unit})` : ''}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholder="0"
      placeholderTextColor={C.textMuted}
    />
  </View>
);

const ResultRow = ({ label, value, unit, highlight, status }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[styles.resultValue, highlight && { color: C.accent }]}>
        {value}{unit ? ` ${unit}` : ''}
      </Text>
      {status && (
        <View style={[styles.statusPill, status === 'PASS' ? styles.statusPillOk : styles.statusPillFail]}>
          <Text style={[styles.statusPillText, { color: status === 'PASS' ? C.ok : C.fail }]}>{status}</Text>
        </View>
      )}
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
//  DIAGRAM — beam line, supports, load arrows, and an L / a dimension line.
//  Kept intentionally schematic (not to scale beyond the load position ratio)
//  so it stays legible at any input magnitude.
// ─────────────────────────────────────────────────────────────────────────────
function BeamDiagram({ caseDef, positionRatio }) {
  const W = 320, H = 150;
  const x0 = 30, x1 = 290, y = 70;
  const type = beamType(caseDef.id);
  const loadX = caseDef.hasPosition ? x0 + (x1 - x0) * positionRatio : (x0 + x1) / 2;

  const beamPath = Skia.Path.Make();
  beamPath.moveTo(x0, y);
  beamPath.lineTo(x1, y);

  const dimPath = Skia.Path.Make();
  dimPath.moveTo(x0, 118); dimPath.lineTo(x1, 118);
  dimPath.moveTo(x0, 112); dimPath.lineTo(x0, 124);
  dimPath.moveTo(x1, 112); dimPath.lineTo(x1, 124);

  const supportPath = (cx) => {
    const p = Skia.Path.Make();
    p.moveTo(cx - 12, y + 22);
    p.lineTo(cx, y);
    p.lineTo(cx + 12, y + 22);
    p.close();
    return p;
  };

  const hatchPath = (cx) => {
    const p = Skia.Path.Make();
    p.moveTo(cx - 16, y - 20); p.lineTo(cx + 16, y - 20);
    p.lineTo(cx + 16, y + 20); p.lineTo(cx - 16, y + 20);
    p.close();
    for (let i = -14; i <= 14; i += 6) {
      p.moveTo(cx + i, y - 20); p.lineTo(cx + i - 6, y - 8);
    }
    return p;
  };

  const arrowDown = (cx, topY = y - 34) => {
    const p = Skia.Path.Make();
    p.moveTo(cx, topY); p.lineTo(cx, y - 2);
    p.moveTo(cx, y - 2); p.lineTo(cx - 5, y - 10);
    p.moveTo(cx, y - 2); p.lineTo(cx + 5, y - 10);
    return p;
  };

  const isUDL = caseDef.needs.includes('w');
  const isMoment = caseDef.needs.includes('M');

  return (
    <Canvas style={{ width: W, height: H }}>
      <Path path={beamPath} color={C.textSub} style="stroke" strokeWidth={4} />

      {type === 'simply-supported' && (
        <>
          <Path path={supportPath(x0)} color={C.accentBg} />
          <Path path={supportPath(x0)} color={C.accent} style="stroke" strokeWidth={1.5} />
          <Path path={supportPath(x1)} color={C.accentBg} />
          <Path path={supportPath(x1)} color={C.accent} style="stroke" strokeWidth={1.5} />
          <Circle cx={x1 - 12} cy={y + 26} r={3} color={C.accent} />
          <Circle cx={x1 + 12} cy={y + 26} r={3} color={C.accent} />
        </>
      )}
      {type === 'cantilever' && (
        <>
          <Rect x={x0 - 6} y={y - 22} width={6} height={44} color={C.accentBg} />
          <Path path={hatchPath(x0 - 3)} color={C.textSub} style="stroke" strokeWidth={1} opacity={0.6} />
        </>
      )}
      {type === 'fixed-fixed' && (
        <>
          <Rect x={x0 - 6} y={y - 22} width={6} height={44} color={C.accentBg} />
          <Path path={hatchPath(x0 - 3)} color={C.textSub} style="stroke" strokeWidth={1} opacity={0.6} />
          <Rect x={x1} y={y - 22} width={6} height={44} color={C.accentBg} />
          <Path path={hatchPath(x1 + 3)} color={C.textSub} style="stroke" strokeWidth={1} opacity={0.6} />
        </>
      )}

      {!isUDL && !isMoment && (
        <Path path={arrowDown(caseDef.id === 'ss_two_point_third' ? x0 + (x1 - x0) / 3 : loadX)} color={C.accent} style="stroke" strokeWidth={2.2} />
      )}
      {caseDef.id === 'ss_two_point_third' && (
        <Path path={arrowDown(x0 + ((x1 - x0) * 2) / 3)} color={C.accent} style="stroke" strokeWidth={2.2} />
      )}
      {isUDL && Array.from({ length: 9 }).map((_, i) => (
        <Path key={i} path={arrowDown(x0 + ((x1 - x0) / 8) * i, y - 22)} color={C.accent} style="stroke" strokeWidth={1.6} />
      ))}
      {isMoment && (
        <Path
          path={(() => {
            const p = Skia.Path.Make();
            p.addArc({ x: x1 - 14, y: y - 28, width: 28, height: 28 }, -30, 240);
            return p;
          })()}
          color={C.accent}
          style="stroke"
          strokeWidth={2}
        />
      )}

      <Path path={dimPath} color={C.text} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  3D VISUALIZATION — real Euler–Bernoulli deflection curves, not a
//  decoration. Everything below computes y(x) along the beam's own length
//  from the same equations the numeric "Results" section is built on, then
//  bends an actual box mesh to match — so the 3D shape is trustworthy, not
//  just a mockup. Renders inside <CanvaProvider>, which already supplies
//  the Canvas, lighting, orbit controls and camera; this file only ever
//  authors what goes INSIDE that Canvas (plain three.js/R3F elements, no
//  React Native views).
// ─────────────────────────────────────────────────────────────────────────────

// Closed-form deflection at position `a` from the left support for a single
// point load P (Hibbeler / standard mechanics-of-materials result). Reused
// for every case that's built from one or two point loads by superposition,
// instead of re-deriving a bespoke piecewise formula per case.
function singlePointLoadY(x, P, a, L, EI) {
  if (!EI) return 0;
  const b = L - a;
  if (x <= a) {
    return ((P * b * x) / (6 * L * EI)) * (L * L - b * b - x * x);
  }
  const xr = L - x;
  return ((P * a * xr) / (6 * L * EI)) * (2 * L * x - a * a - x * x);
}

// y(x) — downward deflection at position x (0..L) for every supported case.
// Matches the closed-form max-deflection values in computeBeam() above at
// their known locations (verified: center-load, UDL, and fixed-fixed UDL
// all reduce to the same peak formulas at x = L/2).
function beamShapeY(caseId, x, { L, P, w, M, a, EI }) {
  if (!EI || !L) return 0;
  switch (caseId) {
    case 'ss_center_point':
      return singlePointLoadY(x, P, L / 2, L, EI);
    case 'ss_point_position':
      return singlePointLoadY(x, P, a, L, EI);
    case 'ss_two_point_third':
      return singlePointLoadY(x, P, L / 3, L, EI) + singlePointLoadY(x, P, (2 * L) / 3, L, EI);
    case 'ss_udl':
      return ((w * x) / (24 * EI)) * (L ** 3 - 2 * L * x * x + x ** 3);
    case 'cant_end_point':
      return ((P * x * x) / (6 * EI)) * (3 * L - x);
    case 'cant_point_position':
      return x <= a
        ? ((P * x * x) / (6 * EI)) * (3 * a - x)
        : ((P * a * a) / (6 * EI)) * (3 * x - a);
    case 'cant_udl':
      return ((w * x * x) / (24 * EI)) * (x * x - 4 * L * x + 6 * L * L);
    case 'cant_end_moment':
      return (M * x * x) / (2 * EI);
    case 'ff_center_point':
      return x <= L / 2
        ? ((P * x * x) / (48 * EI)) * (3 * L - 4 * x)
        : ((P * (L - x) * (L - x)) / (48 * EI)) * (3 * L - 4 * (L - x));
    case 'ff_udl':
      return (w * x * x * (L - x) * (L - x)) / (24 * EI);
    default:
      return 0;
  }
}

function loadMarkerPositions(caseId, L, a) {
  switch (caseId) {
    case 'ss_center_point':
    case 'ff_center_point':
      return [L / 2];
    case 'ss_point_position':
    case 'cant_point_position':
      return [a];
    case 'cant_end_point':
      return [L];
    case 'ss_two_point_third':
      return [L / 3, (2 * L) / 3];
    default:
      return [];
  }
}

function visualCrossDims(sectionId, dims) {
  switch (sectionId) {
    case 'rect': return { w: Number(dims.b) || 10, h: Number(dims.h) || 10 };
    case 'square': return { w: Number(dims.a) || 10, h: Number(dims.a) || 10 };
    case 'circle': return { w: Number(dims.d) || 10, h: Number(dims.d) || 10 };
    case 'tube': return { w: Number(dims.D) || 10, h: Number(dims.D) || 10 };
    default: return { w: 40, h: 40 };
  }
}

const SCENE_SCALE = 0.1; // 1 three.js unit = 10 mm — keeps the scene in the
                          // same numeric range as the app's other 3D models
                          // regardless of the span the student types in.
const BEND_SEGMENTS = 48;
const toSceneX = (realX, L) => (realX - L / 2) * SCENE_SCALE;

// Bends a box mesh's own vertices along the beam's deflection curve — the
// same trick as bending a loaf of bread — instead of chaining many small
// segments together. `exaggeration` scales the *visual* offset only; every
// number that feeds the Results card above is unaffected by it.
function buildBentBeamGeometry({ caseId, L, P, w, M, a, EI, crossW, crossH, exaggeration }) {
  const visW = Math.max(crossW, L * 0.02) * SCENE_SCALE;
  const visH = Math.max(crossH, L * 0.02) * SCENE_SCALE;
  const Ls = L * SCENE_SCALE;
  const geo = new BoxGeometry(Ls, visH, visW, BEND_SEGMENTS, 1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const localX = pos.getX(i);
    const xReal = Math.min(L, Math.max(0, localX / SCENE_SCALE + L / 2));
    const yDefl = beamShapeY(caseId, xReal, { L, P, w, M, a, EI });
    pos.setY(i, pos.getY(i) - yDefl * exaggeration * SCENE_SCALE);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function SupportMarker({ x, y, roller }) {
  const size = 1.6;
  return (
    <group position={[x, y - size * 0.4, 0]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[size, size, 4]} />
        <meshStandardMaterial color={C.accent} metalness={0.3} roughness={0.6} />
      </mesh>
      {roller && (
        <>
          <mesh position={[-size * 0.4, -size * 0.85, 0]}>
            <sphereGeometry args={[size * 0.22, 12, 12]} />
            <meshStandardMaterial color={C.accent} />
          </mesh>
          <mesh position={[size * 0.4, -size * 0.85, 0]}>
            <sphereGeometry args={[size * 0.22, 12, 12]} />
            <meshStandardMaterial color={C.accent} />
          </mesh>
        </>
      )}
    </group>
  );
}

function FixedWall({ x, y }) {
  return (
    <mesh position={[x, y, 0]}>
      <boxGeometry args={[0.3, 4.5, 3.2]} />
      <meshStandardMaterial color="#6B6B72" metalness={0.2} roughness={0.8} />
    </mesh>
  );
}

function LoadArrow({ x, y, small }) {
  const shaftLen = small ? 1.3 : 2.2;
  const headLen = small ? 0.4 : 0.6;
  const radius = small ? 0.05 : 0.09;
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, headLen / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius * 2.2, headLen, 10]} />
        <meshStandardMaterial color={C.fail} />
      </mesh>
      <mesh position={[0, headLen + shaftLen / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shaftLen, 8]} />
        <meshStandardMaterial color={C.fail} />
      </mesh>
    </group>
  );
}

function MomentRing({ x, y }) {
  const r = 1.3;
  return (
    <mesh position={[x, y + r, r * 0.3]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.08, 8, 24, Math.PI * 1.5]} />
      <meshStandardMaterial color={C.fail} />
    </mesh>
  );
}

// The actual scene content — mounted as CanvaProvider's children, so this
// runs INSIDE the Canvas/Suspense tree and can call useThree()-backed hooks
// like useScene(). Reads the viewer's own render-mode / wireframe /
// transparency / shadow settings so the beam responds to the same "Display"
// tab controls every other model in the app already uses, instead of
// ignoring them.
function BeamScene3D({ caseDef, L, EI, P, w, M, aPos, crossW, crossH, exaggeration }) {
  const { setCameraTarget, wireframe, renderMode, transparency, shadows } = useScene();
  const groupRef = useRef(null);

  const geometry = useMemo(
    () => buildBentBeamGeometry({ caseId: caseDef.id, L, P, w, M, a: aPos, EI, crossW, crossH, exaggeration }),
    [caseDef.id, L, P, w, M, aPos, EI, crossW, crossH, exaggeration],
  );

  const type = beamType(caseDef.id);
  const isUDL = caseDef.needs.includes('w');
  const isMoment = caseDef.needs.includes('M');
  const isWireframe = wireframe || renderMode === 'Wireframe';
  const isXray = renderMode === 'X-Ray' || transparency;

  const surfaceY = (x) => {
    const visH = Math.max(crossH, L * 0.02) * SCENE_SCALE;
    const defl = beamShapeY(caseDef.id, x, { L, P, w, M, a: aPos, EI }) * exaggeration * SCENE_SCALE;
    return visH / 2 - defl;
  };

  const trigger = `${caseDef.id}|${L}|${P}|${w}|${M}|${aPos}|${crossW}|${crossH}|${exaggeration}`;

  return (
    <>
      <group ref={groupRef}>
        <mesh geometry={geometry} castShadow={shadows} receiveShadow={shadows}>
          <meshStandardMaterial
            color={isXray ? '#4FA8FF' : C.accent}
            wireframe={isWireframe}
            transparent={isXray}
            opacity={isXray ? 0.35 : 1}
            metalness={0.35}
            roughness={0.5}
          />
        </mesh>

        {type !== 'cantilever' && (
          <SupportMarker x={toSceneX(0, L)} y={surfaceY(0)} />
        )}
        {type === 'simply-supported' && (
          <SupportMarker x={toSceneX(L, L)} y={surfaceY(L)} roller />
        )}
        {(type === 'cantilever' || type === 'fixed-fixed') && (
          <FixedWall x={toSceneX(0, L)} y={surfaceY(0)} />
        )}
        {type === 'fixed-fixed' && (
          <FixedWall x={toSceneX(L, L)} y={surfaceY(L)} />
        )}

        {loadMarkerPositions(caseDef.id, L, aPos).map((x, i) => (
          <LoadArrow key={i} x={toSceneX(x, L)} y={surfaceY(x)} />
        ))}
        {isUDL && Array.from({ length: 9 }).map((_, i) => {
          const x = (L / 8) * i;
          return <LoadArrow key={i} x={toSceneX(x, L)} y={surfaceY(x)} small />;
        })}
        {isMoment && <MomentRing x={toSceneX(L, L)} y={surfaceY(L)} />}
      </group>

      <AutoFitCamera groupRef={groupRef} trigger={trigger} onTargetChange={setCameraTarget} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function BeamDeflectionCalculator() {
  const { height: windowHeight } = useWindowDimensions();
  const [caseId, setCaseId] = useState('ss_center_point');
  const [sectionId, setSectionId] = useState('rect');
  const [materialId, setMaterialId] = useState('mild_steel');
  const [limitRatio, setLimitRatio] = useState(360);
  const [fosTarget, setFosTarget] = useState('2');

  const [dims, setDims] = useState({ b: '50', h: '100', a: '25', d: '40', D: '40', I: '', Z: '' });
  const [L, setL] = useState('2000');
  const [P, setP] = useState('1000');
  const [w, setW] = useState('5');
  const [M, setM] = useState('100000');
  const [aPos, setAPos] = useState('800');
  const [customE, setCustomE] = useState('200000');
  const [customYield, setCustomYield] = useState('250');
  const [show3D, setShow3D] = useState(false);
  const [exaggerateOn, setExaggerateOn] = useState(true);

  const caseDef = CASES.find((c) => c.id === caseId);
  const section = SECTIONS.find((s) => s.id === sectionId);
  const material = MATERIALS.find((m) => m.id === materialId);

  const setDim = (id, val) => setDims((d) => ({ ...d, [id]: val }));

  const { I, c, Z } = useMemo(() => sectionProps(sectionId, dims), [sectionId, dims]);
  const E = material.id === 'custom' ? Number(customE) || 0 : material.E;
  const yieldStrength = material.id === 'custom' ? Number(customYield) || 0 : material.yield;

  const result = useMemo(() => {
    const Lv = Number(L) || 0;
    const EI = E * I;
    if (!Lv || !EI) return null;
    return computeBeam(caseId, {
      L: Lv,
      P: Number(P) || 0,
      w: Number(w) || 0,
      M: Number(M) || 0,
      a: Number(aPos) || 0,
      EI,
    });
  }, [caseId, L, P, w, M, aPos, E, I]);

  const sigma = result && Z ? result.Mmax / Z : 0;
  const fos = sigma ? yieldStrength / sigma : 0;
  const fosOk = fos >= (Number(fosTarget) || 0);

  const Lv = Number(L) || 0;
  const deflectionLimit = Lv / limitRatio;
  const deflectionOk = result ? result.deltaMax <= deflectionLimit : false;

  const positionRatio = Lv ? Math.min(1, Math.max(0, (Number(aPos) || 0) / Lv)) : 0.5;

  const EI = E * I;
  const crossDims = visualCrossDims(sectionId, dims);
  // Auto-picks a multiplier so the max deflection reads at ~12% of the span
  // — real deflections are almost always far too small to see at true
  // scale next to the beam's own length. Purely visual; every figure in
  // the Results card above uses the un-exaggerated value.
  const exaggeration = useMemo(() => {
    if (!exaggerateOn || !result || !result.deltaMax) return 1;
    const target = Lv * 0.12;
    return Math.min(4000, Math.max(1, target / result.deltaMax));
  }, [exaggerateOn, result, Lv]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Beam Deflection & Bending Stress</Text>
        <Text style={styles.subtitle}>Advanced — reactions, stress, deflection & safety checks</Text>

        <Text style={styles.sectionLabel}>SUPPORT & LOAD CASE</Text>
        {['Simply Supported', 'Cantilever', 'Fixed–Fixed'].map((group) => (
          <View key={group} style={{ marginBottom: 6 }}>
            <Text style={styles.groupLabel}>{group}</Text>
            <ChipRow options={CASES.filter((c) => c.group === group)} value={caseId} onChange={setCaseId} />
          </View>
        ))}

        <View style={styles.card}>
          <BeamDiagram caseDef={caseDef} positionRatio={positionRatio} />
        </View>

        <Text style={styles.sectionLabel}>3D VISUALIZATION</Text>
        <View style={styles.card}>
          <Text style={styles.derivedText}>View the beam and its bent shape in 3D</Text>
          <TouchableOpacity
            onPress={() => setShow3D(true)}
            style={[styles.toggle3DBtn, { marginTop: 10 }]}
            disabled={!result}
          >
            <Text style={styles.toggle3DBtnText}>{result ? 'Open 3D View' : 'Enter span & load first'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>SPAN & LOADING</Text>
        <View style={styles.card}>
          <NumField label="Span Length L" unit="mm" value={L} onChangeText={setL} />
          {caseDef.needs.includes('P') && (
            <NumField label="Point Load P" unit="N" value={P} onChangeText={setP} />
          )}
          {caseDef.needs.includes('w') && (
            <NumField label="Distributed Load w" unit="N/mm" value={w} onChangeText={setW} />
          )}
          {caseDef.needs.includes('M') && (
            <NumField label="Applied Moment M" unit="N·mm" value={M} onChangeText={setM} />
          )}
          {caseDef.hasPosition && (
            <NumField label="Load position a (from left/fixed end)" unit="mm" value={aPos} onChangeText={setAPos} />
          )}
        </View>

        <Text style={styles.sectionLabel}>CROSS-SECTION</Text>
        <ChipRow options={SECTIONS} value={sectionId} onChange={setSectionId} />
        <View style={styles.card}>
          {section.fields.map((f) => (
            <NumField key={f.id} label={f.label} unit={f.unit} value={dims[f.id]} onChangeText={(v) => setDim(f.id, v)} />
          ))}
          <Text style={styles.derivedText}>
            I = {I ? I.toFixed(0) : '—'} mm⁴  ·  Z = {Z ? Z.toFixed(0) : '—'} mm³  ·  c = {c ? c.toFixed(1) : '—'} mm
          </Text>
        </View>

        <Text style={styles.sectionLabel}>MATERIAL</Text>
        <ChipRow options={MATERIALS} value={materialId} onChange={setMaterialId} />
        <View style={styles.card}>
          {material.id === 'custom' ? (
            <>
              <NumField label="Young's Modulus E" unit="MPa" value={customE} onChangeText={setCustomE} />
              <NumField label="Yield Strength" unit="MPa" value={customYield} onChangeText={setCustomYield} />
            </>
          ) : (
            <Text style={styles.derivedText}>E = {material.E.toLocaleString()} MPa  ·  Yield = {material.yield} MPa</Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>SAFETY CRITERIA</Text>
        <View style={styles.card}>
          <NumField label="Target Factor of Safety" value={fosTarget} onChangeText={setFosTarget} />
          <Text style={styles.fieldLabel}>Deflection Limit</Text>
          <ChipRow
            options={DEFLECTION_LIMITS}
            value={limitRatio}
            onChange={setLimitRatio}
            getId={(o) => o.value}
          />
        </View>

        <Text style={styles.sectionLabel}>RESULTS</Text>
        <View style={styles.card}>
          {!result ? (
            <Text style={styles.derivedText}>Enter span length and load to see results.</Text>
          ) : (
            <>
              {caseDef.group === 'Simply Supported' ? (
                <>
                  <ResultRow label="Reaction RA" value={result.RA.toFixed(1)} unit="N" />
                  <ResultRow label="Reaction RB" value={result.RB.toFixed(1)} unit="N" />
                </>
              ) : (
                <>
                  <ResultRow label="Reaction (shear) R" value={(result.RA || 0).toFixed(1)} unit="N" />
                  {result.MA !== undefined && <ResultRow label="Fixed-end Moment" value={result.MA.toFixed(0)} unit="N·mm" />}
                </>
              )}
              <ResultRow label="Max Bending Moment" value={result.Mmax.toFixed(0)} unit="N·mm" highlight />
              <ResultRow label="Max Moment Location" value={typeof result.MmaxAt === 'number' ? `${result.MmaxAt.toFixed(0)} mm` : result.MmaxAt} />
              <ResultRow label="Max Bending Stress σ" value={sigma.toFixed(2)} unit="MPa" highlight />
              <ResultRow
                label={`Factor of Safety (yield ${yieldStrength} MPa)`}
                value={fos ? fos.toFixed(2) : '—'}
                status={sigma ? (fosOk ? 'PASS' : 'FAIL') : undefined}
              />
              <ResultRow label="Max Deflection δ" value={result.deltaMax.toFixed(3)} unit="mm" highlight />
              <ResultRow label="Deflection Location" value={typeof result.deltaMaxAt === 'number' ? `${result.deltaMaxAt.toFixed(0)} mm` : result.deltaMaxAt} />
              <ResultRow
                label={`Deflection Limit (L/${limitRatio})`}
                value={deflectionLimit.toFixed(3)}
                unit="mm"
                status={deflectionOk ? 'PASS' : 'FAIL'}
              />
              {result.slopeMax !== undefined && (
                <ResultRow label="Max Slope (at free end)" value={result.slopeMax.toFixed(5)} unit="rad" />
              )}
              {result.note && <Text style={styles.noteText}>{result.note}</Text>}
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Standard Euler–Bernoulli beam theory (small deflections, linear-elastic, prismatic section).
          Verify against your applicable design code before use in a real design.
        </Text>
      </ScrollView>

      <Modal
        visible={show3D}
        animationType="slide"
        transparent
        onRequestClose={() => setShow3D(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: Math.max(windowHeight * 0.7, 480) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>3D Beam View</Text>
              <TouchableOpacity onPress={() => setShow3D(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            {result && (
              <>
                <View style={styles.canvas3DWrap}>
                  <CanvaProvider style={{ flex: 1 }} instanceId="beam-deflection-3d" camPosition={[60, 40, 60]}>
                    <BeamScene3D
                      caseDef={caseDef}
                      L={Lv}
                      EI={EI}
                      P={Number(P) || 0}
                      w={Number(w) || 0}
                      M={Number(M) || 0}
                      aPos={Number(aPos) || 0}
                      crossW={crossDims.w}
                      crossH={crossDims.h}
                      exaggeration={exaggeration}
                    />
                  </CanvaProvider>
                </View>
                <Text style={styles.derivedText}>Drag to orbit, pinch to zoom</Text>
                <View style={styles.row3DHeader}>
                  <Text style={styles.derivedText}>
                    {exaggerateOn ? `Deflection shown at ~${exaggeration.toFixed(0)}× actual scale` : 'True-scale deflection (may be invisible)'}
                  </Text>
                  <TouchableOpacity onPress={() => setExaggerateOn((v) => !v)}>
                    <Text style={[styles.derivedText, { color: C.accent, fontWeight: '700' }]}>
                      {exaggerateOn ? 'True Scale' : 'Exaggerate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 20, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 12, color: C.textSub, marginTop: 2, marginBottom: 14 },

  sectionLabel: {
    fontSize: 10, letterSpacing: 1.2, color: C.textMuted, fontWeight: '700',
    marginTop: 14, marginBottom: 6, textTransform: 'uppercase',
  },
  groupLabel: { fontSize: 11, color: C.textSub, fontWeight: '600', marginBottom: 4 },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 4, alignItems: 'center',
  },

  chipRow: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  fieldWrap: { width: '100%', marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: C.textSub, marginBottom: 4, fontWeight: '500' },
  fieldInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: C.text, width: '100%',
  },
  derivedText: { fontSize: 12, color: C.textSub, alignSelf: 'flex-start' },

  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  resultLabel: { fontSize: 12, color: C.textSub, flex: 1, paddingRight: 8 },
  resultValue: { fontSize: 13, fontWeight: '700', color: C.text },
  statusPill: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusPillOk: { backgroundColor: C.okBg },
  statusPillFail: { backgroundColor: C.failBg },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  noteText: { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6, alignSelf: 'flex-start' },
  footer: { fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 18, lineHeight: 15 },

  row3DHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', flexWrap: 'wrap', gap: 6,
  },
  toggle3DBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: C.accent, alignItems: 'center',
  },
  toggle3DBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  canvas3DWrap: {
    width: '100%', flex: 1, borderRadius: 10, overflow: 'hidden',
    marginTop: 4, marginBottom: 8, backgroundColor: '#1a1b1e',
  },

  modalBackdrop: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  modalCloseBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  modalCloseBtnText: { fontSize: 12, fontWeight: '600', color: C.textSub },
});