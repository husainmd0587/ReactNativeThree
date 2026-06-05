import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Line,
  Group,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

// ─── Color Palette ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  card: '#e7eaeb',
  border: '#b9b9b9',
  accent: '#2563EB',
  accentDim: '#1D4ED8',
  accentGlow: 'rgba(37,99,235,0.08)',
  gold: '#CA8A04',
  green: '#059669',
  red: '#DC2626',
  purple: '#7C3AED',
  orange: '#EA580C',
  text: '#111827',
  textSub: '#374151',
  textMuted: '#6B7280',
};

// ─── GD&T Categories ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'form',        label: 'Form',        color: COLORS.accent, icon: '◻' },
  { id: 'orientation', label: 'Orientation', color: COLORS.gold,   icon: '⊾' },
  { id: 'location',    label: 'Location',    color: COLORS.green,  icon: '⊕' },
  { id: 'runout',      label: 'Runout',      color: COLORS.purple, icon: '↗' },
  { id: 'profile',     label: 'Profile',     color: COLORS.orange, icon: '⌒' },
];

// ─── GD&T Symbol Data ──────────────────────────────────────────────────────────
const GDT_SYMBOLS = [
  {
    id: 'straightness', name: 'Straightness', symbol: '⏤', category: 'form',
    asmeName: 'Straightness', requiresDatum: false,
    description: 'Controls how straight a feature must be. Applied to a line or axis — limits how much a surface element or derived axis can deviate from a perfect straight line.',
    tolerance: 'Linear (mm or inches)', application: 'Shafts, axes, surface lines',
    example: '⏤ 0.05', datumNote: 'No datum reference required',
    details: [
      'Surface straightness: controls line elements on a surface',
      'Axis straightness: controls the derived axis within a cylindrical tolerance zone',
      'Can use diameter symbol (⌀) for cylindrical tolerance zone',
      'Used when out-of-straightness would cause assembly interference',
    ],
    relatedSymbols: ['flatness', 'cylindricity'],
    animDesc: 'Wavy line (out-of-tolerance) gradually straightening within tolerance zone',
  },
  {
    id: 'flatness', name: 'Flatness', symbol: '⏥', category: 'form',
    asmeName: 'Flatness', requiresDatum: false,
    description: 'Controls how flat a surface must be. All points of the surface must lie between two parallel planes separated by the tolerance value.',
    tolerance: 'Linear (mm or inches)', application: 'Mating surfaces, gasket faces, machine beds',
    example: '⏥ 0.1', datumNote: 'No datum reference required',
    details: [
      'Defines a tolerance zone between two parallel planes',
      'More restrictive than a size tolerance alone',
      'Does not control the orientation or location of the surface',
      'Commonly applied to sealing surfaces and precision mating parts',
    ],
    relatedSymbols: ['straightness', 'parallelism'],
    animDesc: 'Rippled surface settling flat between two parallel bounding planes',
  },
  {
    id: 'circularity', name: 'Circularity (Roundness)', symbol: '○', category: 'form',
    asmeName: 'Circularity', requiresDatum: false,
    description: 'Controls how round a circular feature is at any cross-section. Each circular cross-section must lie between two concentric circles.',
    tolerance: 'Radial (mm or inches)', application: 'Bearings, pistons, cylindrical fits',
    example: '○ 0.02', datumNote: 'No datum reference required',
    details: [
      'Applies independently at each cross-section perpendicular to the axis',
      'Tolerance is the radial difference between two coaxial circles',
      'Does not control taper or overall cylindrical form',
      'Measured using a roundness tester (CMM or V-block method)',
    ],
    relatedSymbols: ['cylindricity', 'concentricity'],
    animDesc: 'Distorted blob morphing into a perfect circle',
  },
  {
    id: 'cylindricity', name: 'Cylindricity', symbol: '⌭', category: 'form',
    asmeName: 'Cylindricity', requiresDatum: false,
    description: 'Controls the overall form of a cylindrical surface — roundness, straightness, and taper combined. All points must lie between two coaxial cylinders.',
    tolerance: 'Radial (mm or inches)', application: 'Precision shafts, hydraulic cylinders, bearing journals',
    example: '⌭ 0.03', datumNote: 'No datum reference required',
    details: [
      'Most comprehensive form control for cylinders',
      'Combines circularity + straightness + taper into one control',
      'Tolerance zone is the annular space between two coaxial cylinders',
      'Difficult and expensive to measure; use only when functionally necessary',
    ],
    relatedSymbols: ['circularity', 'straightness'],
    animDesc: 'Scan line sweeping the full cylinder length to check form',
  },
  {
    id: 'profile_line', name: 'Profile of a Line', symbol: '⌒', category: 'profile',
    asmeName: 'Profile of a Line', requiresDatum: false,
    description: 'Controls the form of a line element along a curved or complex surface. The actual profile must fall within a tolerance band around the true profile.',
    tolerance: 'Bilateral or unilateral band (mm)', application: 'Airfoils, cam profiles, 2D curved features',
    example: '⌒ 0.2 | A', datumNote: 'Datum optional — required for location control',
    details: [
      'Without datum: controls form only',
      'With datum: controls form, orientation, and location',
      'Tolerance band is uniform unless specified as unequal (U symbol)',
      'Applied to each individual cross-section independently',
    ],
    relatedSymbols: ['profile_surface'],
    animDesc: 'Tolerance band pulsing around the true profile curve',
  },
  {
    id: 'profile_surface', name: 'Profile of a Surface', symbol: '⌓', category: 'profile',
    asmeName: 'Profile of a Surface', requiresDatum: false,
    description: 'Controls the entire 3D form of a surface. All surface points must lie within a 3D tolerance zone offset from the true profile.',
    tolerance: 'Bilateral or unilateral band (mm)', application: 'Cast surfaces, freeform surfaces, complex 3D contours',
    example: '⌓ 0.5 | A | B | C', datumNote: 'Datum optional — required for full location control',
    details: [
      'The most powerful and versatile GD&T control',
      'Can replace multiple controls (flatness, angularity, position)',
      'Unequal bilateral tolerance uses U⃝ symbol with offset value',
      'Composite profile uses two-segment feature control frame',
    ],
    relatedSymbols: ['profile_line', 'flatness'],
    animDesc: 'Offset envelope expanding and contracting around the nominal surface',
  },
  {
    id: 'angularity', name: 'Angularity', symbol: '∠', category: 'orientation',
    asmeName: 'Angularity', requiresDatum: true,
    description: 'Controls the orientation of a surface, axis, or center plane to a datum at any angle other than 90° or 0°.',
    tolerance: 'Linear width or diameter (mm)', application: 'Angled faces, tapered holes, inclined datums',
    example: '∠ 0.1 | A', datumNote: 'Datum reference required',
    details: [
      'Tolerance zone is two parallel planes at the specified angle to the datum',
      'Can use ⌀ for cylindrical tolerance zone on axes',
      'Does not control the location of the feature — only its angle',
      'Basic angle dimension must be shown on drawing',
    ],
    relatedSymbols: ['perpendicularity', 'parallelism'],
    animDesc: 'Line rotating to settle at the specified basic angle',
  },
  {
    id: 'perpendicularity', name: 'Perpendicularity', symbol: '⊥', category: 'orientation',
    asmeName: 'Perpendicularity', requiresDatum: true,
    description: 'Controls how perpendicular (90°) a surface, axis, or center plane is to a datum. Special case of angularity at exactly 90°.',
    tolerance: 'Linear width or diameter (mm)', application: 'Bores, shoulders, mating faces, threaded holes',
    example: '⊥ 0.05 | A', datumNote: 'Datum reference required',
    details: [
      'Most commonly used orientation control',
      'Surface perpendicularity: tolerance zone between two parallel planes',
      'Axis perpendicularity: cylindrical tolerance zone (use ⌀)',
      'Often tighter than the size tolerance to ensure proper assembly',
    ],
    relatedSymbols: ['angularity', 'parallelism'],
    animDesc: 'Leaning surface snapping to exactly 90° with right-angle marker appearing',
  },
  {
    id: 'parallelism', name: 'Parallelism', symbol: '∥', category: 'orientation',
    asmeName: 'Parallelism', requiresDatum: true,
    description: 'Controls how parallel a surface, axis, or center plane is to a datum. Ensures two features maintain equal distance along their extent.',
    tolerance: 'Linear width or diameter (mm)', application: 'Mating surfaces, slide ways, twin bores',
    example: '∥ 0.08 | A', datumNote: 'Datum reference required',
    details: [
      'Tolerance zone is two planes parallel to the datum',
      'For axes: can specify cylindrical zone with ⌀',
      'Does not control the distance between the surfaces',
      'Used extensively on machine tool guideways and precision fixtures',
    ],
    relatedSymbols: ['angularity', 'perpendicularity', 'flatness'],
    animDesc: 'Diverging lines converging to equal spacing (parallel)',
  },
  {
    id: 'position', name: 'True Position', symbol: '⊕', category: 'location',
    asmeName: 'Position', requiresDatum: true, isKeySymbol: true,
    description: 'Controls the location and/or orientation of a feature relative to datums. The most used GD&T symbol — defines where a feature must be within a cylindrical or two-plane tolerance zone.',
    tolerance: 'Diameter or width (mm) — often with MMC/LMC modifier', application: 'Bolt holes, pin patterns, threaded features, slots',
    example: '⊕ ⌀0.3 MMC | A | B | C', datumNote: 'Datum reference required (usually 3 datums)',
    details: [
      'Cylindrical tolerance zone defined by ⌀ — most common for holes',
      'Rectangular zone (no ⌀) for slots and planar features',
      'MMC modifier allows bonus tolerance as feature departs from MMC',
      'LMC modifier used for minimum wall thickness requirements',
      'Composite position uses two-tier feature control frame',
      'Basic dimensions locate the true position from datums',
    ],
    relatedSymbols: ['concentricity', 'symmetry'],
    animDesc: 'Feature offset from true position tracking into the cylindrical tolerance zone',
  },
  {
    id: 'concentricity', name: 'Concentricity', symbol: '◎', category: 'location',
    asmeName: 'Concentricity', requiresDatum: true, deprecated: true,
    description: 'Controls the median points of diametrically opposed cross-section elements. (Deprecated in ASME Y14.5-2018; use Position or Runout instead.)',
    tolerance: 'Diameter (mm)', application: 'Precision rotational parts, counterweights, high-speed rotors',
    example: '◎ ⌀0.1 | A', datumNote: 'Datum axis reference required',
    details: [
      'Controls derived median line, not the surface',
      'Very difficult and expensive to measure',
      'Deprecated in ASME Y14.5-2018 — replaced by coaxiality via Position',
      'Still used in ISO 1101 as coaxiality',
      'For dynamic balance control, use circular runout instead',
    ],
    relatedSymbols: ['position', 'circular_runout'],
    animDesc: 'Median point orbiting about the datum axis to show coaxiality check',
  },
  {
    id: 'symmetry', name: 'Symmetry', symbol: '⌯', category: 'location',
    asmeName: 'Symmetry', requiresDatum: true, deprecated: true,
    description: 'Controls the median points of a feature relative to a datum center plane. (Deprecated in ASME Y14.5-2018; use Position instead.)',
    tolerance: 'Linear width (mm)', application: 'Symmetric slots, keyways, centered features',
    example: '⌯ 0.1 | A', datumNote: 'Datum center plane required',
    details: [
      'Controls derived median plane, not surface',
      'Difficult to measure — requires finding median points',
      'Deprecated in ASME Y14.5-2018',
      'Use Position with a center plane datum instead',
    ],
    relatedSymbols: ['position', 'parallelism'],
    animDesc: 'Asymmetric lines centering symmetrically about the datum plane',
  },
  {
    id: 'circular_runout', name: 'Circular Runout', symbol: '↗', category: 'runout',
    asmeName: 'Circular Runout', requiresDatum: true,
    description: 'Controls the variation of a surface at any single cross-section as the part is rotated 360° about a datum axis. Measured at individual cross-sections independently.',
    tolerance: 'Radial variation (mm)', application: 'Rotating shafts, bearing journals, pulley grooves',
    example: '↗ 0.05 | A-B', datumNote: 'Datum axis required',
    details: [
      'Measured with a dial indicator while rotating about the datum axis',
      'Tolerance is the full indicator movement (FIM) at each cross-section',
      'Controls both circularity and coaxiality simultaneously',
      'Simpler to measure than concentricity',
      'For faces: controls wobble at each radial line element',
    ],
    relatedSymbols: ['total_runout', 'circularity'],
    animDesc: 'Dial indicator sweeping 360° at one cross-section showing FIM measurement',
  },
  {
    id: 'total_runout', name: 'Total Runout', symbol: '⇗', category: 'runout',
    asmeName: 'Total Runout', requiresDatum: true,
    description: 'Controls the combined variation of the entire surface simultaneously as the part rotates 360° about a datum axis. More comprehensive than circular runout.',
    tolerance: 'Radial variation (mm)', application: 'High-precision shafts, spindles, precision rollers',
    example: '⇗ 0.1 | A-B', datumNote: 'Datum axis required',
    details: [
      'Indicator traverses entire surface length while part rotates',
      'Controls cylindricity + coaxiality combined',
      'For faces: controls flatness + perpendicularity combined',
      'More stringent than circular runout',
      'Tolerance zone is two coaxial cylinders about the datum axis',
    ],
    relatedSymbols: ['circular_runout', 'cylindricity'],
    animDesc: 'Scan indicator traversing the full surface length while the part rotates',
  },
];

// ─── Modifier Symbols ──────────────────────────────────────────────────────────
const MODIFIERS = [
  { id: 'mmc',      symbol: 'Ⓜ', name: 'Maximum Material Condition', short: 'MMC',  description: 'Feature contains the maximum amount of material — smallest hole, largest shaft. Allows bonus tolerance as part departs from MMC.', color: COLORS.accent },
  { id: 'lmc',      symbol: 'Ⓛ', name: 'Least Material Condition',   short: 'LMC',  description: 'Feature contains the least amount of material — largest hole, smallest shaft. Used for wall thickness control.', color: COLORS.green },
  { id: 'rfs',      symbol: 'Ⓢ', name: 'Regardless of Feature Size', short: 'RFS',  description: 'Default condition — tolerance applies at any size within the size tolerance. No bonus tolerance. Most common condition.', color: COLORS.gold },
  { id: 'projected',symbol: 'Ⓟ', name: 'Projected Tolerance Zone',   short: 'PROJ', description: 'Extends the tolerance zone beyond the feature surface — used for threaded holes and press-fit pins to control mating part clearance.', color: COLORS.purple },
  { id: 'free_state',symbol:'Ⓕ', name: 'Free State',                 short: 'FREE', description: 'Tolerance applies in the free (unrestrained) state. Used for non-rigid parts like gaskets, plastic parts, and sheet metal.', color: COLORS.orange },
  { id: 'tangent',  symbol: 'Ⓣ', name: 'Tangent Plane',              short: 'TAN',  description: 'Tolerance applies to the tangent plane contacting the highest points of the surface. Used for mating surfaces where contact area matters.', color: COLORS.red },
  { id: 'unequal',  symbol: 'Ⓤ', name: 'Unequal Bilateral Tolerance',short: 'UB',   description: 'Profile tolerance is distributed unequally on each side of the true profile. The value after U defines the offset.', color: COLORS.textSub },
  { id: 'cf',       symbol: 'CF', name: 'Continuous Feature',         short: 'CF',   description: 'Identifies interrupted features that are treated as one continuous feature for tolerance purposes.', color: COLORS.accentDim },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FIXED SYMBOL COMPONENTS ───────────────────────────────────────────────────
//   CRITICAL FIX: Line p1/p2 and Circle cx/cy/r props DON'T accept SharedValues.
//   Only opacity and transform props accept animated values in Skia.
//   So we use ONLY opacity pulsing for all animations.
// ═══════════════════════════════════════════════════════════════════════════════

const StraightnessSymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const zonePath1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.1, cy - s * 0.12);
    p.lineTo(s * 0.9, cy - s * 0.12);
    return p;
  }, [s, cy]);

  const zonePath2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.1, cy + s * 0.12);
    p.lineTo(s * 0.9, cy + s * 0.12);
    return p;
  }, [s, cy]);

  const mainPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i <= 20; i++) {
      const x = s * 0.1 + (s * 0.8 * i) / 20;
      const y = cy;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={zonePath1} color={color + '55'} style="stroke" strokeWidth={sw * 0.6} />
      <Path path={zonePath2} color={color + '55'} style="stroke" strokeWidth={sw * 0.6} />
      <Path path={mainPath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" strokeJoin="round" opacity={opacity} />
    </Canvas>
  );
};

const FlatnessSymbol = ({ size, color, progress }) => {
  const s = size, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const plane1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.08, cy - s * 0.13);
    p.lineTo(s * 0.92, cy - s * 0.13);
    return p;
  }, [s, cy]);

  const plane2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.08, cy + s * 0.13);
    p.lineTo(s * 0.92, cy + s * 0.13);
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={plane1} color={color + '55'} style="stroke" strokeWidth={sw * 0.6} />
      <Path path={plane2} color={color + '55'} style="stroke" strokeWidth={sw * 0.6} />
      <Line p1={{ x: s * 0.08, y: cy }} p2={{ x: s * 0.92, y: cy }} color={color} strokeWidth={sw} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const CircularitySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const guidePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={guidePath} color={color + '33'} style="stroke" strokeWidth={sw * 0.5} />
      <Circle cx={cx} cy={cy} r={r} color={color} style="stroke" strokeWidth={sw} opacity={opacity} />
    </Canvas>
  );
};

const CylindricitySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const circlePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const scanLine = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx - r, cy);
    p.lineTo(cx + r, cy);
    return p;
  }, [cx, cy, r]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={circlePath} color={color} style="stroke" strokeWidth={sw} />
      <Line p1={{ x: cx - r, y: cy - r * 0.7 }} p2={{ x: cx - r, y: cy + r * 0.7 }} color={color} strokeWidth={sw} strokeCap="round" />
      <Line p1={{ x: cx + r, y: cy - r * 0.7 }} p2={{ x: cx + r, y: cy + r * 0.7 }} color={color} strokeWidth={sw} strokeCap="round" />
      <Path path={scanLine} color={color} style="stroke" strokeWidth={sw * 1.6} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const ProfileLineSymbol = ({ size, color, progress }) => {
  const s = size, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const truePath = useMemo(() => {
    const N = 20;
    const p = Skia.Path.Make();
    for (let i = 0; i <= N; i++) {
      const x = s * 0.1 + (s * 0.8 * i) / N;
      const y = cy - s * 0.08 * Math.sin((i / N) * Math.PI);
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    return p;
  }, [s, cy]);

  const upperPath = useMemo(() => {
    const N = 20;
    const p = Skia.Path.Make();
    for (let i = 0; i <= N; i++) {
      const x = s * 0.1 + (s * 0.8 * i) / N;
      const y = cy - s * 0.08 * Math.sin((i / N) * Math.PI) - s * 0.12;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    return p;
  }, [s, cy]);

  const lowerPath = useMemo(() => {
    const N = 20;
    const p = Skia.Path.Make();
    for (let i = 0; i <= N; i++) {
      const x = s * 0.1 + (s * 0.8 * i) / N;
      const y = cy - s * 0.08 * Math.sin((i / N) * Math.PI) + s * 0.12;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.3 + progress.value * 0.7;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={upperPath} color={color + '66'} style="stroke" strokeWidth={sw * 0.7} strokeCap="round" opacity={opacity} />
      <Path path={lowerPath} color={color + '66'} style="stroke" strokeWidth={sw * 0.7} strokeCap="round" opacity={opacity} />
      <Path path={truePath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" />
    </Canvas>
  );
};

const ProfileSurfaceSymbol = ({ size, color, progress }) => {
  const s = size, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const makeArc = (offset) => {
    const N = 18;
    const p = Skia.Path.Make();
    for (let i = 0; i <= N; i++) {
      const x = s * 0.1 + (s * 0.8 * i) / N;
      const y = cy - s * 0.08 * Math.sin((i / N) * Math.PI) + offset;
      i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
    }
    return p;
  };

  const truePath = useMemo(() => makeArc(0), [s, cy]);
  const upperPath = useMemo(() => makeArc(-s * 0.12), [s, cy]);
  const lowerPath = useMemo(() => makeArc(s * 0.12), [s, cy]);
  const baseLine = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.1, cy + s * 0.2);
    p.lineTo(s * 0.9, cy + s * 0.2);
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.3 + progress.value * 0.7;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={upperPath} color={color + '66'} style="stroke" strokeWidth={sw * 0.7} strokeCap="round" opacity={opacity} />
      <Path path={lowerPath} color={color + '66'} style="stroke" strokeWidth={sw * 0.7} strokeCap="round" opacity={opacity} />
      <Path path={truePath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" />
      <Path path={baseLine} color={color} style="stroke" strokeWidth={sw} strokeCap="round" />
    </Canvas>
  );
};

const AngularitySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);
  const baseY = cy + r * 0.5;
  const target = 45 * (Math.PI / 180);
  const len = r * 1.2;

  const basePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx - r, baseY);
    p.lineTo(cx + r, baseY);
    return p;
  }, [cx, r, baseY]);

  const featurePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, baseY);
    p.lineTo(cx + len * Math.cos(Math.PI - target), baseY - len * Math.sin(target));
    return p;
  }, [cx, baseY, len, target]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={basePath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" />
      <Path path={featurePath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const PerpendicularitySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);
  const baseY = cy + r * 0.45;
  const len = r * 1.4;

  const basePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx - r, baseY);
    p.lineTo(cx + r, baseY);
    return p;
  }, [cx, r, baseY]);

  const vertPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, baseY);
    p.lineTo(cx, baseY - len);
    return p;
  }, [cx, baseY, len]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={basePath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" />
      <Path path={vertPath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const ParallelismSymbol = ({ size, color, progress }) => {
  const s = size, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const line1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.12, cy - s * 0.1);
    p.lineTo(s * 0.88, cy - s * 0.1);
    return p;
  }, [s, cy]);

  const line2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.12, cy + s * 0.1);
    p.lineTo(s * 0.88, cy + s * 0.1);
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={line1} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
      <Path path={line2} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const PositionSymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const outerCircle = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const hLine = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx - r, cy);
    p.lineTo(cx + r, cy);
    return p;
  }, [cx, cy, r]);

  const vLine = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy - r);
    p.lineTo(cx, cy + r);
    return p;
  }, [cx, cy, r]);

  const tolCircle = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r * 0.5);
    return p;
  }, [cx, cy, r]);

  const dotPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, sw * 1.5);
    return p;
  }, [cx, cy, sw]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={outerCircle} color={color} style="stroke" strokeWidth={sw} />
      <Path path={hLine} color={color} style="stroke" strokeWidth={sw} />
      <Path path={vLine} color={color} style="stroke" strokeWidth={sw} />
      <Path path={tolCircle} color={color + '66'} style="stroke" strokeWidth={sw * 0.6} opacity={opacity} />
      <Path path={dotPath} color={color} opacity={opacity} />
    </Canvas>
  );
};

const ConcentricitySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const outer = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const inner = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r * 0.45);
    return p;
  }, [cx, cy, r]);

  const dotPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx + r * 0.28, cy, sw * 1.3);
    return p;
  }, [cx, cy, r, sw]);

  const centerDot = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, sw * 0.7);
    return p;
  }, [cx, cy, sw]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={outer} color={color} style="stroke" strokeWidth={sw} />
      <Path path={inner} color={color} style="stroke" strokeWidth={sw} />
      <Path path={dotPath} color={color} opacity={opacity} />
      <Path path={centerDot} color={color + '88'} />
    </Canvas>
  );
};

const SymmetrySymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, sw = Math.max(1.5, s * 0.05);

  const axisPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy - s * 0.28);
    p.lineTo(cx, cy + s * 0.28);
    return p;
  }, [cx, cy, s]);

  const line1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.2, cy - s * 0.15);
    p.lineTo(s * 0.8, cy - s * 0.15);
    return p;
  }, [s, cy]);

  const line2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.12, cy);
    p.lineTo(s * 0.88, cy);
    return p;
  }, [s, cy]);

  const line3 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(s * 0.2, cy + s * 0.15);
    p.lineTo(s * 0.8, cy + s * 0.15);
    return p;
  }, [s, cy]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={axisPath} color={color + '33'} style="stroke" strokeWidth={sw * 0.5} />
      <Path path={line1} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
      <Path path={line2} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
      <Path path={line3} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

const CircularRunoutSymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const trackPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, 300);
    return p;
  }, [cx, cy, r]);

  const sweepPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, 300);
    return p;
  }, [cx, cy, r]);

  const centerDot = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, sw);
    return p;
  }, [cx, cy, sw]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={trackPath} color={color + '2A'} style="stroke" strokeWidth={sw * 2.5} strokeCap="round" />
      <Path path={sweepPath} color={color} style="stroke" strokeWidth={sw} strokeCap="round" opacity={opacity} />
      <Path path={centerDot} color={color} />
    </Canvas>
  );
};

const TotalRunoutSymbol = ({ size, color, progress }) => {
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.33, sw = Math.max(1.5, s * 0.05);

  const arc1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r - s * 0.06, width: r * 2, height: r * 2 }, -90, 270);
    return p;
  }, [cx, cy, r, s]);

  const arc2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r, y: cy - r + s * 0.06, width: r * 2, height: r * 2 }, -90, 270);
    return p;
  }, [cx, cy, r, s]);

  const scanLine = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy - r + s * 0.05);
    p.lineTo(cx, cy + r - s * 0.05);
    return p;
  }, [cx, cy, r, s]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.4 + progress.value * 0.6;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={arc1} color={color} style="stroke" strokeWidth={sw} />
      <Path path={arc2} color={color} style="stroke" strokeWidth={sw} />
      <Path path={scanLine} color={color} style="stroke" strokeWidth={sw * 1.4} strokeCap="round" opacity={opacity} />
    </Canvas>
  );
};

// ─── Symbol component map ──────────────────────────────────────────────────────
const SYMBOL_COMPONENTS = {
  straightness:    StraightnessSymbol,
  flatness:        FlatnessSymbol,
  circularity:     CircularitySymbol,
  cylindricity:    CylindricitySymbol,
  profile_line:    ProfileLineSymbol,
  profile_surface: ProfileSurfaceSymbol,
  angularity:      AngularitySymbol,
  perpendicularity:PerpendicularitySymbol,
  parallelism:     ParallelismSymbol,
  position:        PositionSymbol,
  concentricity:   ConcentricitySymbol,
  symmetry:        SymmetrySymbol,
  circular_runout: CircularRunoutSymbol,
  total_runout:    TotalRunoutSymbol,
};

// ─── GDTAnimatedSymbol: manages the shared animation clock ────────────────────
const GDTAnimatedSymbol = React.memo(({ symbolId, size = 48, color, animate = true }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    // FIX: Easing.sine → Easing.sin (Reanimated v3)
    progress.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(progress);
  }, [animate]);

  const Sym = SYMBOL_COMPONENTS[symbolId];
  if (!Sym) return null;
  return <Sym size={size} color={color} progress={progress} />;
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── UI Components ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Symbol Card ──────────────────────────────────────────────────────────────
const SymbolCard = React.memo(({ item, onPress, categoryColor, animate }) => (
  <TouchableOpacity
    style={[styles.card, item.deprecated && styles.cardDeprecated]}
    onPress={() => onPress(item)}
    activeOpacity={0.75}
  >
    <View style={[styles.cardAccentBar, { backgroundColor: categoryColor }]} />
    <View style={styles.cardInner}>
      <View style={[styles.symbolBox, { borderColor: categoryColor + '44' }]}>
        <GDTAnimatedSymbol symbolId={item.id} size={44} color={categoryColor} animate={animate} />
        <Text style={[styles.symbolUnicode, { color: categoryColor }]}>{item.symbol}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.deprecated && (
            <View style={styles.deprecatedBadge}><Text style={styles.deprecatedText}>Deprecated</Text></View>
          )}
          {item.isKeySymbol && (
            <View style={styles.keyBadge}><Text style={styles.keyText}>★ Key</Text></View>
          )}
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaLabel}>Datum: </Text>
          <Text style={[styles.metaValue, { color: item.requiresDatum ? COLORS.gold : COLORS.textMuted }]}>
            {item.requiresDatum ? 'Required' : 'Not required'}
          </Text>
          <Text style={styles.metaDivider}> · </Text>
          <Text style={styles.metaLabel}>Tol: </Text>
          <Text style={styles.metaValue}>{item.tolerance.split('(')[0].trim()}</Text>
        </View>
        <View style={styles.fcfPreview}>
          <Text style={styles.fcfLabel}>FCF: </Text>
          <Text style={styles.fcfText}>{item.example}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
));

// ─── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ item, visible, onClose }) => {
  if (!item) return null;
  const cat = CATEGORIES.find(c => c.id === item.category);
  const catColor = cat?.color || COLORS.accent;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalHeader, { borderBottomColor: catColor + '44' }]}>
          <View style={styles.modalHeaderLeft}>
            <GDTAnimatedSymbol symbolId={item.id} size={60} color={catColor} animate={visible} />
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.modalTitle}>{item.name}</Text>
              <Text style={[styles.modalCategory, { color: catColor }]}>{cat?.label} Control</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {item.deprecated && (
              <View style={[styles.badge, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red }]}>
                <Text style={[styles.badgeText, { color: COLORS.red }]}>⚠ Deprecated in ASME Y14.5-2018</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: catColor + '18', borderColor: catColor + '55' }]}>
              <Text style={[styles.badgeText, { color: catColor }]}>{cat?.label}</Text>
            </View>
            <View style={[styles.badge, { borderColor: COLORS.border }]}>
              <Text style={[styles.badgeText, { color: item.requiresDatum ? COLORS.gold : COLORS.textMuted }]}>
                {item.requiresDatum ? '📌 Datum Required' : '○ No Datum'}
              </Text>
            </View>
          </View>

          {/* Animation description */}
          {item.animDesc && (
            <View style={[styles.animLabel, { borderColor: catColor + '44', backgroundColor: catColor + '0C' }]}>
              <Text style={[styles.animLabelText, { color: catColor }]}>◎  {item.animDesc}</Text>
            </View>
          )}

          {/* Feature Control Frame */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feature Control Frame</Text>
            <View style={styles.fcfFull}>
              <Text style={styles.fcfFullText}>{item.example}</Text>
            </View>
          </View>

          {/* Definition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Definition</Text>
            <Text style={styles.sectionBody}>{item.description}</Text>
          </View>

          {/* Specs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specTable}>
              <SpecRow label="Tolerance Type"      value={item.tolerance} />
              <SpecRow label="ASME Name"            value={item.asmeName} />
              <SpecRow label="Datum Ref."           value={item.datumNote} highlight={item.requiresDatum} />
              <SpecRow label="Typical Application" value={item.application} />
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Engineering Details</Text>
            {item.details.map((d, i) => (
              <View key={i} style={styles.detailRow}>
                <View style={[styles.bullet, { backgroundColor: catColor }]} />
                <Text style={styles.detailText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Related */}
          {item.relatedSymbols?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Related Symbols</Text>
              <View style={styles.relatedRow}>
                {item.relatedSymbols.map(rid => {
                  const rel = GDT_SYMBOLS.find(s => s.id === rid);
                  if (!rel) return null;
                  const rcat = CATEGORIES.find(c => c.id === rel.category);
                  return (
                    <View key={rid} style={[styles.relatedChip, { borderColor: rcat?.color + '55' }]}>
                      <Text style={[styles.relatedSymbol, { color: rcat?.color }]}>{rel.symbol}</Text>
                      <Text style={styles.relatedName}>{rel.name.split(' ')[0]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const SpecRow = ({ label, value, highlight }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={[styles.specValue, highlight && { color: COLORS.gold }]}>{value}</Text>
  </View>
);

// ─── Modifiers Tab ─────────────────────────────────────────────────────────────
const ModifiersTab = () => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modGrid}>
    <Text style={styles.tabHeading}>Material Condition & Other Modifiers</Text>
    <Text style={styles.tabSubheading}>
      Modifiers appear inside the feature control frame to refine how the tolerance applies.
    </Text>
    {MODIFIERS.map(mod => (
      <View key={mod.id} style={styles.modCard}>
        <View style={[styles.modSymBox, { borderColor: mod.color + '66' }]}>
          <Text style={[styles.modSym, { color: mod.color }]}>{mod.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.modTitleRow}>
            <Text style={styles.modName}>{mod.name}</Text>
            <Text style={[styles.modShort, { color: mod.color }]}>{mod.short}</Text>
          </View>
          <Text style={styles.modDesc}>{mod.description}</Text>
        </View>
      </View>
    ))}
  </ScrollView>
);

// ─── Datum Tab ─────────────────────────────────────────────────────────────────
const DatumTab = () => {
  const datumInfo = [
    { title: 'Datum Feature',        desc: 'An actual physical feature on the part (surface, hole, slot) used to establish a datum.',                                symbol: '▲',   color: COLORS.accent },
    { title: 'Datum Feature Symbol', desc: 'A capital letter in a square box with triangle — identifies the datum feature on the drawing. E.g., |A|',              symbol: '|A|', color: COLORS.gold },
    { title: 'Primary Datum (A)',    desc: 'Establishes the first axis or plane. Contacts with at least 3 points. Constrains 3 degrees of freedom.',                symbol: 'A',   color: COLORS.green },
    { title: 'Secondary Datum (B)',  desc: 'Contacts with at least 2 points. Constrains 2 more DOF. Must be perpendicular to primary.',                             symbol: 'B',   color: COLORS.gold },
    { title: 'Tertiary Datum (C)',   desc: 'Contacts with at least 1 point. Constrains the final degree of freedom. Completes the DRF.',                            symbol: 'C',   color: COLORS.orange },
    { title: 'Datum Reference Frame',desc: 'Three mutually perpendicular planes (A, B, C) that fully constrain part location for measurement. 6 DOF total.',        symbol: 'DRF', color: COLORS.purple },
    { title: 'Simulated Datum',      desc: 'The inspection tool surface (plate, mandrel, chuck) that physically represents the theoretical datum plane/axis.',       symbol: '~',   color: COLORS.textSub },
    { title: 'Compound Datum',       desc: 'Two features acting together as a single datum, written A-B. Common for long shafts with two bearing journals.',        symbol: 'A-B', color: COLORS.red },
  ];
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modGrid}>
      <Text style={styles.tabHeading}>Datum System</Text>
      <Text style={styles.tabSubheading}>
        Datums are theoretically exact points, axes, and planes derived from datum features. They form the Datum Reference Frame (DRF) from which all tolerances are measured.
      </Text>
      {datumInfo.map((d, i) => (
        <View key={i} style={styles.modCard}>
          <View style={[styles.modSymBox, { borderColor: d.color + '66' }]}>
            <Text style={[styles.modSym, { color: d.color, fontSize: d.symbol.length > 2 ? 13 : 22 }]}>{d.symbol}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modName}>{d.title}</Text>
            <Text style={styles.modDesc}>{d.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Quick Reference Tab ───────────────────────────────────────────────────────
const QuickRefTab = () => {
  const hierarchy = [
    { level: 'Form',        desc: 'Straightness, Flatness, Circularity, Cylindricity', color: COLORS.accent },
    { level: 'Profile',     desc: 'Profile of a Line, Profile of a Surface',           color: COLORS.orange },
    { level: 'Orientation', desc: 'Angularity, Perpendicularity, Parallelism',         color: COLORS.gold },
    { level: 'Location',    desc: 'Position, Concentricity, Symmetry',                 color: COLORS.green },
    { level: 'Runout',      desc: 'Circular Runout, Total Runout',                     color: COLORS.purple },
  ];
  const rules = [
    { rule: 'Rule #1 — Envelope Principle', desc: 'Individual feature of size must not violate its envelope of perfect form at MMC.', color: COLORS.accent },
    { rule: 'Rule #2 — RFS Default',        desc: 'All geometric tolerances apply at RFS unless MMC or LMC is explicitly specified.', color: COLORS.gold },
    { rule: 'Bonus Tolerance',              desc: 'When MMC modifier is used, bonus = |actual mating size − MMC size|. Total = specified + bonus.', color: COLORS.green },
    { rule: 'Precedence of Datums',         desc: 'Datums in the FCF are listed in order: primary | secondary | tertiary.', color: COLORS.purple },
    { rule: 'Basic Dimensions',             desc: 'Boxed dimensions locate true positions and profiles. They have no tolerance of their own.', color: COLORS.orange },
    { rule: 'Regardless of Feature Size',   desc: 'Default for all GD&T controls. The tolerance zone stays constant regardless of produced size.', color: COLORS.textSub },
  ];
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modGrid}>
      <Text style={styles.tabHeading}>Quick Reference</Text>
      <Text style={styles.subSection}>GD&T Hierarchy</Text>
      {hierarchy.map((h, i) => (
        <View key={i} style={styles.hierRow}>
          <View style={[styles.hierNum, { backgroundColor: h.color + '22', borderColor: h.color + '55' }]}>
            <Text style={[styles.hierNumText, { color: h.color }]}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hierLevel, { color: h.color }]}>{h.level}</Text>
            <Text style={styles.hierDesc}>{h.desc}</Text>
          </View>
        </View>
      ))}
      <Text style={[styles.subSection, { marginTop: 24 }]}>Fundamental Rules</Text>
      {rules.map((r, i) => (
        <View key={i} style={[styles.ruleCard, { borderLeftColor: r.color }]}>
          <Text style={[styles.ruleName, { color: r.color }]}>{r.rule}</Text>
          <Text style={styles.ruleDesc}>{r.desc}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Main GDT Library Component ───────────────────────────────────────────────
export default function GDTLibrary() {
  const [activeTab, setActiveTab]         = useState('symbols');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem]   = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [visibleIds, setVisibleIds]       = useState(new Set());

  const filteredSymbols = activeCategory === 'all'
    ? GDT_SYMBOLS
    : GDT_SYMBOLS.filter(s => s.category === activeCategory);

  const handlePress = useCallback((item) => {
    setSelectedItem(item);
    setModalVisible(true);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    setVisibleIds(new Set(viewableItems.map(i => i.key)));
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const tabs = [
    { id: 'symbols',   label: 'Symbols'   },
    { id: 'modifiers', label: 'Modifiers' },
    { id: 'datums',    label: 'Datums'    },
    { id: 'reference', label: 'Reference' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GD&T Library</Text>
          <Text style={styles.headerSub}>ASME Y14.5 · ISO 1101 · Animated Reference</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{GDT_SYMBOLS.length} Symbols</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
            {activeTab === tab.id && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Symbols Tab */}
      {activeTab === 'symbols' && (
        <View style={{ flex: 1 }}>
          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'all' && styles.filterChipActive]}
              onPress={() => setActiveCategory('all')}
            >
              <Text style={[styles.filterText, activeCategory === 'all' && styles.filterTextActive]}>
                All ({GDT_SYMBOLS.length})
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => {
              const count = GDT_SYMBOLS.filter(s => s.category === cat.id).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    activeCategory === cat.id && [styles.filterChipActive, { borderColor: cat.color, backgroundColor: cat.color + '18' }],
                  ]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text style={[styles.filterText, activeCategory === cat.id && { color: cat.color }]}>
                    {cat.icon} {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

        


          {/* Symbol List */}
          <FlatList
            data={filteredSymbols}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            windowSize={5}
            maxToRenderPerBatch={4}
            initialNumToRender={5}
            updateCellsBatchingPeriod={50}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => {
              const cat = CATEGORIES.find(c => c.id === item.category);
              return (
                <SymbolCard
                  item={item}
                  onPress={handlePress}
                  categoryColor={cat?.color || COLORS.accent}
                  animate={visibleIds.has(item.id)}
                />
              );
            }}
          />
        </View>
      )}

      {activeTab === 'modifiers' && <ModifiersTab />}
      {activeTab === 'datums'    && <DatumTab />}
      {activeTab === 'reference' && <QuickRefTab />}

      <DetailModal item={selectedItem} visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle:      { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },
  headerSub:        { fontSize: 11, color: COLORS.textMuted, marginTop: 3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  headerBadge:      { backgroundColor: COLORS.accentGlow, borderWidth: 1, borderColor: COLORS.accentDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeText:  { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  tabBar:           { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 8 },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabItemActive:    {},
  tabLabel:         { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive:   { color: COLORS.accent, fontWeight: '700' },
  tabUnderline:     { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.accent, borderRadius: 2 },
  filterScroll:     { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 52 },
  filterContent:    { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  filterChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  filterText:       { fontSize: 12, color: COLORS.textSub, fontWeight: '500' },
  filterTextActive: { color: COLORS.accent },
  list:             { padding: 14, gap: 12 },
  card:             { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardDeprecated:   { opacity: 0.75, borderStyle: 'dashed' },
  cardAccentBar:    { height: 3, width: '100%' },
  cardInner:        { flexDirection: 'row', padding: 14, gap: 14, alignItems: 'flex-start' },
  symbolBox:        { width: 68, height: 68, borderRadius: 10, borderWidth: 1, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  symbolUnicode:    { fontSize: 10, marginTop: -4, fontWeight: '600' },
  cardContent:      { flex: 1 },
  cardTitleRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 5 },
  cardName:         { fontSize: 15, fontWeight: '700', color: COLORS.text },
  deprecatedBadge:  { backgroundColor: COLORS.red + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  deprecatedText:   { fontSize: 10, color: COLORS.red, fontWeight: '600' },
  keyBadge:         { backgroundColor: COLORS.gold + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  keyText:          { fontSize: 10, color: COLORS.gold, fontWeight: '700' },
  cardDesc:         { fontSize: 12, color: COLORS.textSub, lineHeight: 17, marginBottom: 8 },
  cardMeta:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaLabel:        { fontSize: 11, color: COLORS.textMuted },
  metaValue:        { fontSize: 11, color: COLORS.textSub, fontWeight: '500' },
  metaDivider:      { color: COLORS.textMuted, fontSize: 11 },
  fcfPreview:       { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  fcfLabel:         { fontSize: 10, color: COLORS.textMuted },
  fcfText:          { fontSize: 12, color: COLORS.accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  modalContainer:   { flex: 1, backgroundColor: COLORS.bg },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 16, paddingBottom: 16, borderBottomWidth: 1, backgroundColor: COLORS.surface },
  modalHeaderLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalTitle:       { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalCategory:    { fontSize: 12, marginTop: 3, fontWeight: '600' },
  closeBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:     { color: COLORS.textSub, fontSize: 14, fontWeight: '600' },
  modalScroll:      { flex: 1, paddingHorizontal: 20 },
  badgeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 16 },
  badge:            { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderColor: COLORS.border },
  badgeText:        { fontSize: 11, fontWeight: '600', color: COLORS.textSub },
  animLabel:        { marginTop: 14, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  animLabelText:    { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  section:          { marginTop: 22 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  sectionBody:      { fontSize: 14, color: COLORS.textSub, lineHeight: 21 },
  fcfFull:          { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, alignItems: 'center' },
  fcfFullText:      { fontSize: 20, color: COLORS.accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', letterSpacing: 2 },
  specTable:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  specRow:          { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  specLabel:        { fontSize: 12, color: COLORS.textMuted, width: 130 },
  specValue:        { fontSize: 12, color: COLORS.textSub, flex: 1, fontWeight: '500' },
  detailRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  bullet:           { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  detailText:       { fontSize: 13, color: COLORS.textSub, flex: 1, lineHeight: 19 },
  relatedRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  relatedChip:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.card, gap: 6 },
  relatedSymbol:    { fontSize: 18 },
  relatedName:      { fontSize: 12, color: COLORS.textSub, fontWeight: '500' },
  modGrid:          { padding: 16, gap: 10 },
  tabHeading:       { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  tabSubheading:    { fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginBottom: 8 },
  modCard:          { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 14, alignItems: 'flex-start' },
  modSymBox:        { width: 52, height: 52, borderRadius: 10, borderWidth: 1, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  modSym:           { fontSize: 24, fontWeight: '700' },
  modTitleRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  modName:          { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 },
  modShort:         { fontSize: 11, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modDesc:          { fontSize: 12, color: COLORS.textSub, lineHeight: 17 },
  subSection:       { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  hierRow:          { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8, gap: 12, alignItems: 'center' },
  hierNum:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hierNumText:      { fontSize: 15, fontWeight: '800' },
  hierLevel:        { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  hierDesc:         { fontSize: 11, color: COLORS.textMuted },
  ruleCard:         { backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, padding: 14, marginBottom: 8 },
  ruleName:         { fontSize: 13, fontWeight: '700', marginBottom: 5 },
  ruleDesc:         { fontSize: 12, color: COLORS.textSub, lineHeight: 18 },
});