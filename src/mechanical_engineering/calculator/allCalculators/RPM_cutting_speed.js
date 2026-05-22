// CalculatorScreen.jsx
// CNC Turning Simulator + Mechanical 3D Engineering App
// Single-file, React Native JSX, creamy white + multi-color professional UI

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  FlatList,
  useWindowDimensions,
} from 'react-native';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  // Backgrounds — warm creamy whites
  bg:         '#F4EFE6',   // warm cream page
  surface:    '#FDFAF5',   // near-white surface
  card:       '#FFFFFF',   // pure white cards
  inputBg:    '#F9F5EE',   // warm tinted input fill
  border:     '#E4DDD0',   // warm beige border
  divider:    '#EDE7DC',

  // Text — warm near-blacks
  text:       '#1A1714',   // warm charcoal
  textSub:    '#4B4540',   // medium warm grey
  textMuted:  '#9C8F80',   // muted warm
  textLight:  '#C8BDB0',   // placeholder

  // Multi-color accent palette — rich & distinct
  accent:     '#E8500A',   // vivid orange-red  (CORE header / PRO badge)
  accentDim:  '#E8500A1A',
  accentSoft: '#F97316',

  blue:       '#1D4ED8',   // royal blue  — Core Calculations
  blueDim:    '#1D4ED81A',
  blueMid:    '#2563EB',

  violet:     '#6D28D9',   // deep violet — Process Analysis
  violetDim:  '#6D28D91A',

  emerald:    '#047857',   // forest green — Geometry
  emeraldDim: '#0478571A',

  amber:      '#B45309',   // rich amber  — Utilities
  amberDim:   '#B453091A',

  teal:       '#0E7490',   // steel teal   — secondary results
  tealDim:    '#0E74901A',

  rose:       '#BE123C',   // deep rose    — warnings / very rough
  green:      '#15803D',
  warn:       '#D97706',
  red:        '#DC2626',
};

// Per-calculator accent map
const CALC_COLOR = {
  rpm:    '#1D4ED8',
  cs:     '#2563EB',
  fr:     '#0369A1',
  mrr:    '#6D28D9',
  mt:     '#7C3AED',
  sf:     '#9333EA',
  taper:  '#047857',
  thread: '#065F46',
  unit:   '#B45309',
  quick:  '#92400E',
};

// Per-category palette
const CAT_PAL = {
  'CORE CALCULATIONS': { color: '#1D4ED8', dim: '#1D4ED812', label: 'CORE CALCULATIONS' },
  'PROCESS ANALYSIS':  { color: '#6D28D9', dim: '#6D28D912', label: 'PROCESS ANALYSIS'  },
  'GEOMETRY':          { color: '#047857', dim: '#04785712', label: 'GEOMETRY'           },
  'UTILITIES':         { color: '#B45309', dim: '#B4530912', label: 'UTILITIES'          },
};

const FONT = {
  mono:   'Courier New',
  system: 'System',
};

// ─── REUSABLE PRIMITIVES ─────────────────────────────────────────────────────

const Divider = () => <View style={styles.divider} />;

const Label = ({ children, sub }) => (
  <Text style={[styles.label, sub && styles.labelSub]}>{children}</Text>
);

const UnitBadge = ({ unit }) => (
  <View style={styles.unitBadge}>
    <Text style={styles.unitBadgeText}>{unit}</Text>
  </View>
);

const ResultRow = ({ label, value, unit, accent, color }) => {
  const valColor = color || (accent ? C.accent : C.text);
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <View style={styles.resultValueWrap}>
        <Text style={[styles.resultValue, { color: valColor }]}>
          {value !== null && value !== undefined && value !== '' ? value : '—'}
        </Text>
        {unit ? <Text style={[styles.resultUnit, { color: valColor + 'AA' }]}> {unit}</Text> : null}
      </View>
    </View>
  );
};

const InputField = ({ label, unit, value, onChangeText, placeholder, keyboardType }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || '0.00'}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType || 'decimal-pad'}
        returnKeyType="done"
      />
      {unit ? <UnitBadge unit={unit} /> : null}
    </View>
  </View>
);

const ActionBar = ({ onReset, children }) => (
  <View style={styles.actionBar}>
    <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.7}>
      <Text style={styles.resetBtnText}>⟳  Reset</Text>
    </TouchableOpacity>
    {children}
  </View>
);

// ─── ACCORDION CARD ──────────────────────────────────────────────────────────

const AccordionCard = ({ emoji, title, tag, children, calcId }) => {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [contentH, setContentH] = useState(0);

  const accentColor = CALC_COLOR[calcId] || C.blue;

  const toggle = () => {
    const toVal = open ? 0 : 1;
    Animated.parallel([
      Animated.timing(anim, {
        toValue: toVal,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(heightAnim, {
        toValue: toVal,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    setOpen(!open);
  };

  const chevronRot = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const heightInterp = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH || 400] });
  const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] });

  return (
    <View style={[styles.accordionCard, { borderLeftColor: accentColor, borderLeftWidth: 4 }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.accordionLeft}>
          <View style={[styles.emojiWrap, { backgroundColor: accentColor + '18' }]}>
            <Text style={styles.accordionEmoji}>{emoji}</Text>
          </View>
          <View>
            <Text style={styles.accordionTitle}>{title}</Text>
            <Text style={styles.accordionTag}>{tag}</Text>
          </View>
        </View>
        <Animated.Text style={[styles.chevron, { color: accentColor, transform: [{ rotate: chevronRot }] }]}>
          ▾
        </Animated.Text>
      </TouchableOpacity>

      <Animated.View style={{ height: heightInterp, overflow: 'hidden', opacity }}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && !contentH) setContentH(h);
          }}
          style={[styles.accordionBody, { borderTopColor: accentColor + '25' }]}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

const SectionHeader = ({ title }) => {
  const pal = CAT_PAL[title] || { color: C.blue, dim: C.blueDim };
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionPill, { backgroundColor: pal.dim, borderColor: pal.color + '35' }]}>
        <View style={[styles.sectionDot, { backgroundColor: pal.color }]} />
        <Text style={[styles.sectionHeaderText, { color: pal.color }]}>{title}</Text>
      </View>
      <View style={[styles.sectionHeaderBar, { backgroundColor: pal.color + '20', flex: 1 }]} />
    </View>
  );
};

// ─── SEARCH BAR ──────────────────────────────────────────────────────────────

const SearchBar = ({ value, onChangeText }) => (
  <View style={styles.searchWrap}>
    <Text style={styles.searchIcon}>🔍</Text>
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="Search calculators..."
      placeholderTextColor={C.textMuted}
      returnKeyType="search"
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')} style={styles.searchClear}>
        <Text style={styles.searchClearText}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── UTIL ─────────────────────────────────────────────────────────────────────

const f = (val, dp = 3) => {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return parseFloat(n.toFixed(dp)).toString();
};

const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

// ─── 1. RPM CALCULATOR ───────────────────────────────────────────────────────

const RPMCalc = () => {
  const [cs, setCs] = useState('');
  const [dia, setDia] = useState('');
  const reset = () => { setCs(''); setDia(''); };

  const rpm = useCallback(() => {
    const V = toNum(cs), D = toNum(dia);
    if (!V || !D || D === 0) return null;
    return f((1000 * V) / (Math.PI * D), 0);
  }, [cs, dia]);

  return (
    <>
      <InputField label="Cutting Speed" unit="m/min" value={cs} onChangeText={setCs} placeholder="e.g. 150" />
      <InputField label="Workpiece Diameter" unit="mm" value={dia} onChangeText={setDia} placeholder="e.g. 50" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.rpm }]}>
        <ResultRow label="Spindle Speed" value={rpm()} unit="RPM" color={CALC_COLOR.rpm} />
      </View>
    </>
  );
};

// ─── 2. CUTTING SPEED CALCULATOR ─────────────────────────────────────────────

const CuttingSpeedCalc = () => {
  const [rpm, setRpm] = useState('');
  const [dia, setDia] = useState('');
  const reset = () => { setRpm(''); setDia(''); };

  const cs = useCallback(() => {
    const N = toNum(rpm), D = toNum(dia);
    if (!N || !D) return null;
    return f((Math.PI * D * N) / 1000, 2);
  }, [rpm, dia]);

  return (
    <>
      <InputField label="Spindle Speed" unit="RPM" value={rpm} onChangeText={setRpm} placeholder="e.g. 955" />
      <InputField label="Workpiece Diameter" unit="mm" value={dia} onChangeText={setDia} placeholder="e.g. 50" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.cs }]}>
        <ResultRow label="Cutting Speed" value={cs()} unit="m/min" color={CALC_COLOR.cs} />
      </View>
    </>
  );
};

// ─── 3. FEED RATE CALCULATOR ──────────────────────────────────────────────────

const FeedRateCalc = () => {
  const [fpr, setFpr] = useState('');
  const [rpm, setRpm] = useState('');
  const reset = () => { setFpr(''); setRpm(''); };

  const fr = useCallback(() => {
    const F = toNum(fpr), N = toNum(rpm);
    if (!F || !N) return null;
    return f(F * N, 2);
  }, [fpr, rpm]);

  return (
    <>
      <InputField label="Feed per Revolution" unit="mm/rev" value={fpr} onChangeText={setFpr} placeholder="e.g. 0.15" />
      <InputField label="Spindle Speed" unit="RPM" value={rpm} onChangeText={setRpm} placeholder="e.g. 800" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.fr }]}>
        <ResultRow label="Feed Rate" value={fr()} unit="mm/min" color={CALC_COLOR.fr} />
      </View>
    </>
  );
};

// ─── 4. MATERIAL REMOVAL RATE ─────────────────────────────────────────────────

const MRRCalc = () => {
  const [dStart, setDStart] = useState('');
  const [dFinal, setDFinal] = useState('');
  const [feed, setFeed] = useState('');
  const [rpm, setRpm] = useState('');
  const reset = () => { setDStart(''); setDFinal(''); setFeed(''); setRpm(''); };

  const mrr = useCallback(() => {
    const Ds = toNum(dStart), Df = toNum(dFinal), F = toNum(feed), N = toNum(rpm);
    if (!Ds || !Df || !F || !N) return null;
    const doc = (Ds - Df) / 2; // depth of cut
    const avgD = (Ds + Df) / 2;
    const V = (Math.PI * avgD * N) / 1000; // m/min → convert
    return f(doc * F * V * 1000, 2); // cm³/min
  }, [dStart, dFinal, feed, rpm]);

  return (
    <>
      <InputField label="Starting Diameter" unit="mm" value={dStart} onChangeText={setDStart} placeholder="e.g. 60" />
      <InputField label="Final Diameter" unit="mm" value={dFinal} onChangeText={setDFinal} placeholder="e.g. 55" />
      <InputField label="Feed per Revolution" unit="mm/rev" value={feed} onChangeText={setFeed} placeholder="e.g. 0.2" />
      <InputField label="Spindle Speed" unit="RPM" value={rpm} onChangeText={setRpm} placeholder="e.g. 800" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.mrr }]}>
        <ResultRow label="Material Removal Rate" value={mrr()} unit="mm³/min" color={CALC_COLOR.mrr} />
      </View>
    </>
  );
};

// ─── 5. MACHINING TIME ────────────────────────────────────────────────────────

const MachiningTimeCalc = () => {
  const [len, setLen] = useState('');
  const [fr, setFr] = useState('');
  const reset = () => { setLen(''); setFr(''); };

  const time = useCallback(() => {
    const L = toNum(len), F = toNum(fr);
    if (!L || !F || F === 0) return null;
    const mins = L / F;
    return f(mins, 3);
  }, [len, fr]);

  const timeSecs = useCallback(() => {
    const t = toNum(time());
    if (t === null) return null;
    return f(t * 60, 1);
  }, [time]);

  return (
    <>
      <InputField label="Length of Cut" unit="mm" value={len} onChangeText={setLen} placeholder="e.g. 120" />
      <InputField label="Feed Rate" unit="mm/min" value={fr} onChangeText={setFr} placeholder="e.g. 160" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.mt }]}>
        <ResultRow label="Machining Time" value={time()} unit="min" color={CALC_COLOR.mt} />
        <Divider />
        <ResultRow label="Machining Time" value={timeSecs()} unit="sec" color={C.teal} />
      </View>
    </>
  );
};

// ─── 6. SURFACE FINISH ───────────────────────────────────────────────────────

const SurfaceFinishCalc = () => {
  const [nr, setNr] = useState('');
  const [feed, setFeed] = useState('');
  const reset = () => { setNr(''); setFeed(''); };

  const ra = useCallback(() => {
    const R = toNum(nr), F = toNum(feed);
    if (!R || !F || R === 0) return null;
    return f((F * F) / (32 * R) * 1000, 3); // μm
  }, [nr, feed]);

  const rz = useCallback(() => {
    const R = toNum(nr), F = toNum(feed);
    if (!R || !F || R === 0) return null;
    return f((F * F) / (8 * R) * 1000, 3); // μm
  }, [nr, feed]);

  const rating = useCallback(() => {
    const v = toNum(ra());
    if (v === null) return null;
    if (v < 0.8) return { label: '✦ Mirror Finish',  color: C.emerald };
    if (v < 1.6) return { label: '✦ Fine Finish',    color: C.teal };
    if (v < 3.2) return { label: '✦ Medium Finish',  color: C.amber };
    if (v < 6.3) return { label: '◈ Rough Finish',   color: C.orange || C.warn };
    return             { label: '◇ Very Rough',       color: C.rose };
  }, [ra]);

  return (
    <>
      <InputField label="Tool Nose Radius" unit="mm" value={nr} onChangeText={setNr} placeholder="e.g. 0.8" />
      <InputField label="Feed per Revolution" unit="mm/rev" value={feed} onChangeText={setFeed} placeholder="e.g. 0.15" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.sf }]}>
        <ResultRow label="Surface Roughness Ra" value={ra()} unit="μm" color={CALC_COLOR.sf} />
        <Divider />
        <ResultRow label="Surface Roughness Rz" value={rz()} unit="μm" color={C.teal} />
        {rating() && (
          <>
            <Divider />
            <View style={[styles.ratingRow, { backgroundColor: rating().color + '12', borderRadius: 8, paddingHorizontal: 10 }]}>
              <Text style={[styles.ratingText, { color: rating().color }]}>{rating().label}</Text>
            </View>
          </>
        )}
      </View>
    </>
  );
};

// ─── 7. TAPER TURNING ────────────────────────────────────────────────────────

const TaperCalc = () => {
  const [dL, setDL] = useState('');
  const [dS, setDS] = useState('');
  const [len, setLen] = useState('');
  const reset = () => { setDL(''); setDS(''); setLen(''); };

  const taperAngle = useCallback(() => {
    const DL = toNum(dL), DS = toNum(dS), L = toNum(len);
    if (!DL || !DS || !L || L === 0) return null;
    const rad = Math.atan((DL - DS) / (2 * L));
    return f(rad * (180 / Math.PI), 4);
  }, [dL, dS, len]);

  const taperRatio = useCallback(() => {
    const DL = toNum(dL), DS = toNum(dS), L = toNum(len);
    if (!DL || !DS || !L || L === 0) return null;
    return f((DL - DS) / L, 4);
  }, [dL, dS, len]);

  const tpi = useCallback(() => {
    const DL = toNum(dL), DS = toNum(dS), L = toNum(len);
    if (!DL || !DS || !L || L === 0) return null;
    return f((DL - DS) / (L / 25.4), 4);
  }, [dL, dS, len]);

  return (
    <>
      <InputField label="Large Diameter" unit="mm" value={dL} onChangeText={setDL} placeholder="e.g. 40" />
      <InputField label="Small Diameter" unit="mm" value={dS} onChangeText={setDS} placeholder="e.g. 30" />
      <InputField label="Length of Taper" unit="mm" value={len} onChangeText={setLen} placeholder="e.g. 100" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.taper }]}>
        <ResultRow label="Taper Angle (half)" value={taperAngle()} unit="°" color={CALC_COLOR.taper} />
        <Divider />
        <ResultRow label="Taper Ratio (D-d)/L" value={taperRatio()} unit="" color={C.teal} />
        <Divider />
        <ResultRow label="Taper per Inch (TPI)" value={tpi()} unit="in/in" color={C.amber} />
      </View>
    </>
  );
};

// ─── 8. THREAD CUTTING ───────────────────────────────────────────────────────

const ThreadCalc = () => {
  const [pitch, setPitch] = useState('');
  const [rpm, setRpm] = useState('');
  const reset = () => { setPitch(''); setRpm(''); };

  const feedSync = useCallback(() => {
    const P = toNum(pitch), N = toNum(rpm);
    if (!P || !N) return null;
    return f(P * N, 2);
  }, [pitch, rpm]);

  const tpi = useCallback(() => {
    const P = toNum(pitch);
    if (!P || P === 0) return null;
    return f(25.4 / P, 2);
  }, [pitch]);

  return (
    <>
      <InputField label="Thread Pitch" unit="mm" value={pitch} onChangeText={setPitch} placeholder="e.g. 1.5" />
      <InputField label="Spindle Speed" unit="RPM" value={rpm} onChangeText={setRpm} placeholder="e.g. 200" />
      <ActionBar onReset={reset} />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.thread }]}>
        <ResultRow label="Lead Screw Feed Sync" value={feedSync()} unit="mm/min" color={CALC_COLOR.thread} />
        <Divider />
        <ResultRow label="Threads per Inch" value={tpi()} unit="TPI" color={C.teal} />
      </View>
    </>
  );
};

// ─── 9. UNIT CONVERTER ───────────────────────────────────────────────────────

const UnitConverter = () => {
  const [mm, setMm] = useState('');
  const [inch, setInch] = useState('');
  const [mmin, setMmin] = useState('');
  const [ftmin, setFtmin] = useState('');
  const [degC, setDegC] = useState('');
  const [degF, setDegF] = useState('');

  const mmToIn = useCallback(() => { const v = toNum(mm); return v !== null ? f(v / 25.4, 5) : null; }, [mm]);
  const inToMm = useCallback(() => { const v = toNum(inch); return v !== null ? f(v * 25.4, 3) : null; }, [inch]);
  const mminToFt = useCallback(() => { const v = toNum(mmin); return v !== null ? f(v * 3.28084, 3) : null; }, [mmin]);
  const ftToMmin = useCallback(() => { const v = toNum(ftmin); return v !== null ? f(v / 3.28084, 3) : null; }, [ftmin]);
  const cToF = useCallback(() => { const v = toNum(degC); return v !== null ? f(v * 9 / 5 + 32, 2) : null; }, [degC]);
  const fToC = useCallback(() => { const v = toNum(degF); return v !== null ? f((v - 32) * 5 / 9, 2) : null; }, [degF]);

  const resetAll = () => { setMm(''); setInch(''); setMmin(''); setFtmin(''); setDegC(''); setDegF(''); };

  return (
    <>
      {/* Length */}
      <Text style={styles.subSectionTitle}>📏  Length</Text>
      <InputField label="Millimeters → Inches" unit="mm" value={mm} onChangeText={setMm} placeholder="e.g. 25.4" />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.unit }]}>
        <ResultRow label="Result" value={mmToIn()} unit="in" color={CALC_COLOR.unit} />
      </View>
      <InputField label="Inches → Millimeters" unit="in" value={inch} onChangeText={setInch} placeholder="e.g. 1.0" />
      <View style={[styles.resultCard, { borderLeftColor: CALC_COLOR.unit }]}>
        <ResultRow label="Result" value={inToMm()} unit="mm" color={CALC_COLOR.unit} />
      </View>

      {/* Speed */}
      <Text style={styles.subSectionTitle}>⚡  Speed</Text>
      <InputField label="m/min → ft/min" unit="m/min" value={mmin} onChangeText={setMmin} placeholder="e.g. 100" />
      <View style={[styles.resultCard, { borderLeftColor: C.teal }]}>
        <ResultRow label="Result" value={mminToFt()} unit="ft/min" color={C.teal} />
      </View>
      <InputField label="ft/min → m/min" unit="ft/min" value={ftmin} onChangeText={setFtmin} placeholder="e.g. 328" />
      <View style={[styles.resultCard, { borderLeftColor: C.teal }]}>
        <ResultRow label="Result" value={ftToMmin()} unit="m/min" color={C.teal} />
      </View>

      {/* Temperature */}
      <Text style={styles.subSectionTitle}>🌡  Temperature</Text>
      <InputField label="°C → °F" unit="°C" value={degC} onChangeText={setDegC} placeholder="e.g. 100" />
      <View style={[styles.resultCard, { borderLeftColor: C.rose }]}>
        <ResultRow label="Result" value={cToF()} unit="°F" color={C.rose} />
      </View>
      <InputField label="°F → °C" unit="°F" value={degF} onChangeText={setDegF} placeholder="e.g. 212" />
      <View style={[styles.resultCard, { borderLeftColor: C.rose }]}>
        <ResultRow label="Result" value={fToC()} unit="°C" color={C.rose} />
      </View>

      <ActionBar onReset={resetAll} />
    </>
  );
};

// ─── 10. QUICK REFERENCE TOOLS ──────────────────────────────────────────────

const TAP_DRILL_DATA = [
  { thread: 'M2 × 0.4',  tapDrill: '1.6 mm',  clearDrill: '2.2 mm' },
  { thread: 'M2.5 × 0.45', tapDrill: '2.05 mm', clearDrill: '2.7 mm' },
  { thread: 'M3 × 0.5',  tapDrill: '2.5 mm',  clearDrill: '3.3 mm' },
  { thread: 'M4 × 0.7',  tapDrill: '3.3 mm',  clearDrill: '4.3 mm' },
  { thread: 'M5 × 0.8',  tapDrill: '4.2 mm',  clearDrill: '5.3 mm' },
  { thread: 'M6 × 1.0',  tapDrill: '5.0 mm',  clearDrill: '6.4 mm' },
  { thread: 'M8 × 1.25', tapDrill: '6.8 mm',  clearDrill: '8.4 mm' },
  { thread: 'M10 × 1.5', tapDrill: '8.5 mm',  clearDrill: '10.5 mm' },
  { thread: 'M12 × 1.75',tapDrill: '10.2 mm', clearDrill: '12.5 mm' },
  { thread: 'M14 × 2.0', tapDrill: '12.0 mm', clearDrill: '14.5 mm' },
  { thread: 'M16 × 2.0', tapDrill: '14.0 mm', clearDrill: '16.5 mm' },
  { thread: 'M20 × 2.5', tapDrill: '17.5 mm', clearDrill: '20.5 mm' },
];

const MATERIAL_SPEEDS = [
  { mat: '🔩 Mild Steel',       hss: '25–35',   carbide: '100–200', color: '#374151' },
  { mat: '⚙️ Stainless Steel',  hss: '15–25',   carbide: '50–150',  color: '#1D4ED8' },
  { mat: '🪙 Aluminum',         hss: '100–200', carbide: '300–600', color: '#0E7490' },
  { mat: '🔶 Brass',            hss: '60–90',   carbide: '150–300', color: '#B45309' },
  { mat: '🚀 Titanium',         hss: '5–15',    carbide: '30–80',   color: '#7C3AED' },
  { mat: '🏭 Cast Iron',        hss: '20–30',   carbide: '80–160',  color: '#374151' },
];

const QuickTools = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Tap Drill', 'Speeds', 'Pitch Ref'];

  const PITCH_REF = [
    { desc: 'M3 Coarse',  pitch: '0.5 mm',  tpi: '50.8' },
    { desc: 'M6 Coarse',  pitch: '1.0 mm',  tpi: '25.4' },
    { desc: 'M8 Coarse',  pitch: '1.25 mm', tpi: '20.3' },
    { desc: 'M10 Coarse', pitch: '1.5 mm',  tpi: '16.9' },
    { desc: 'M12 Coarse', pitch: '1.75 mm', tpi: '14.5' },
    { desc: 'M16 Coarse', pitch: '2.0 mm',  tpi: '12.7' },
    { desc: 'M20 Coarse', pitch: '2.5 mm',  tpi: '10.2' },
    { desc: '1/4-20 UNC', pitch: '1.27 mm', tpi: '20' },
    { desc: '3/8-16 UNC', pitch: '1.59 mm', tpi: '16' },
    { desc: '1/2-13 UNC', pitch: '1.95 mm', tpi: '13' },
  ];

  return (
    <>
      <View style={styles.tabRow}>
        {tabs.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 && (
        <View style={styles.tableWrap}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHCell, { flex: 1.4 }]}>Thread</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>Tap Drill</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>Clearance</Text>
          </View>
          {TAP_DRILL_DATA.map((row, i) => (
            <View key={row.thread} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableCellMono, { flex: 1.4, color: C.accent }]}>{row.thread}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono]}>{row.tapDrill}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono]}>{row.clearDrill}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === 1 && (
        <View style={styles.tableWrap}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHCell, { flex: 1.6 }]}>Material</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>HSS (m/min)</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>Carbide</Text>
          </View>
          {MATERIAL_SPEEDS.map((row, i) => (
            <View key={row.mat} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { flex: 1.6, color: row.color, fontSize: 12 }]}>{row.mat}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono]}>{row.hss}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono, { color: C.teal }]}>{row.carbide}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === 2 && (
        <View style={styles.tableWrap}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHCell, { flex: 1.4 }]}>Thread</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>Pitch</Text>
            <Text style={[styles.tableCell, styles.tableHCell]}>TPI</Text>
          </View>
          {PITCH_REF.map((row, i) => (
            <View key={row.desc} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { flex: 1.4, color: C.amber, fontSize: 12 }]}>{row.desc}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono]}>{row.pitch}</Text>
              <Text style={[styles.tableCell, styles.tableCellMono, { color: C.teal }]}>{row.tpi}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

// ─── CALCULATOR CONFIG ────────────────────────────────────────────────────────

const CALC_LIST = [
  {
    id: 'rpm',
    emoji: '🔩',
    title: 'Turning RPM',
    tag: 'Speed · Diameter → RPM',
    category: 'CORE CALCULATIONS',
    component: RPMCalc,
  },
  {
    id: 'cs',
    emoji: '⚙️',
    title: 'Cutting Speed',
    tag: 'RPM · Diameter → Vc',
    category: 'CORE CALCULATIONS',
    component: CuttingSpeedCalc,
  },
  {
    id: 'fr',
    emoji: '🛠',
    title: 'Feed Rate',
    tag: 'Feed/Rev · RPM → mm/min',
    category: 'CORE CALCULATIONS',
    component: FeedRateCalc,
  },
  {
    id: 'mrr',
    emoji: '🏭',
    title: 'Material Removal Rate',
    tag: 'Depth · Feed · Speed → MRR',
    category: 'PROCESS ANALYSIS',
    component: MRRCalc,
  },
  {
    id: 'mt',
    emoji: '⏱',
    title: 'Machining Time',
    tag: 'Length · Feed → Time',
    category: 'PROCESS ANALYSIS',
    component: MachiningTimeCalc,
  },
  {
    id: 'sf',
    emoji: '✨',
    title: 'Surface Finish',
    tag: 'Nose Radius · Feed → Ra / Rz',
    category: 'PROCESS ANALYSIS',
    component: SurfaceFinishCalc,
  },
  {
    id: 'taper',
    emoji: '📐',
    title: 'Taper Turning',
    tag: 'Diameters · Length → Angle',
    category: 'GEOMETRY',
    component: TaperCalc,
  },
  {
    id: 'thread',
    emoji: '🔧',
    title: 'Thread Cutting',
    tag: 'Pitch · RPM → Feed Sync',
    category: 'GEOMETRY',
    component: ThreadCalc,
  },
  {
    id: 'unit',
    emoji: '📏',
    title: 'Unit Converter',
    tag: 'mm ↔ in  ·  m/min ↔ ft/min  ·  °C ↔ °F',
    category: 'UTILITIES',
    component: UnitConverter,
  },
  {
    id: 'quick',
    emoji: '📚',
    title: 'Quick Reference',
    tag: 'Tap Drills · Speeds · Thread Pitch',
    category: 'UTILITIES',
    component: QuickTools,
  },
];

// ─── HEADER ──────────────────────────────────────────────────────────────────

const AppHeader = () => (
  <View style={styles.appHeader}>
    <View style={styles.appHeaderLeft}>
      <View style={styles.headerLogoWrap}>
        <Text style={styles.headerLogoText}>⚙</Text>
      </View>
      <View>
        <Text style={styles.appTitle}>CNC TURNING</Text>
        <Text style={styles.appSubtitle}>Engineering Calculator Suite</Text>
      </View>
    </View>
    <View style={styles.headerBadge}>
      <Text style={styles.headerBadgeText}>PRO</Text>
    </View>
  </View>
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function CalculatorScreen() {
  const [search, setSearch] = useState('');

  const filtered = search.trim().length > 0
    ? CALC_LIST.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.tag.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
      )
    : CALC_LIST;

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBar value={search} onChangeText={setSearch} />

        {Object.keys(grouped).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No calculators match your search</Text>
          </View>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <View key={category}>
            <SectionHeader title={category} />
            {items.map((calc) => {
              const Comp = calc.component;
              return (
                <AccordionCard
                  key={calc.id}
                  calcId={calc.id}
                  emoji={calc.emoji}
                  title={calc.title}
                  tag={calc.tag}
                >
                  <Comp />
                </AccordionCard>
              );
            })}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CNC Turning Simulator · Engineering Suite</Text>
          <Text style={styles.footerSub}>All results are theoretical. Validate with test cuts.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // App Header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
    shadowColor: '#7C6A50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  appHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLogoText: {
    fontSize: 24,
    color: '#fff',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 2.5,
    fontFamily: FONT.mono,
  },
  appSubtitle: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  headerBadge: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 56,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#7C6A50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    height: 50,
  },
  searchClear: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 26,
    marginBottom: 10,
    gap: 10,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    fontFamily: FONT.mono,
  },
  sectionHeaderBar: {
    height: 1.5,
    borderRadius: 1,
  },

  // Accordion Card
  accordionCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#7C6A50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionEmoji: {
    fontSize: 19,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.1,
  },
  accordionTag: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 8,
  },
  accordionBody: {
    padding: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    position: 'absolute',
    width: '100%',
    backgroundColor: C.card,
  },

  // Inputs
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: C.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: C.text,
    fontSize: 15,
    fontFamily: FONT.mono,
  },
  unitBadge: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minWidth: 58,
    alignItems: 'center',
  },
  unitBadgeText: {
    color: C.textSub,
    fontSize: 12,
    fontFamily: FONT.mono,
    fontWeight: '700',
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    gap: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
  },
  resetBtnText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Results
  resultCard: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  resultLabel: {
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 0.2,
    flex: 1,
    fontWeight: '500',
  },
  resultValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.mono,
  },
  resultUnit: {
    fontSize: 12,
    fontFamily: FONT.mono,
    marginLeft: 3,
    fontWeight: '600',
  },
  ratingRow: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Labels
  label: {
    color: C.textSub,
    fontSize: 13,
  },
  labelSub: {
    color: C.textMuted,
    fontSize: 11,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 5,
  },

  // Sub section title
  subSectionTitle: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.inputBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    marginTop: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: C.amber,
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },

  // Table
  tableWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt: {
    backgroundColor: '#7C6A5009',
  },
  tableHead: {
    backgroundColor: C.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  tableCell: {
    flex: 1,
    color: C.textSub,
    fontSize: 12,
  },
  tableHCell: {
    color: C.textMuted,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableCellMono: {
    fontFamily: FONT.mono,
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  footerText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  footerSub: {
    color: C.textLight,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.2,
  },
});