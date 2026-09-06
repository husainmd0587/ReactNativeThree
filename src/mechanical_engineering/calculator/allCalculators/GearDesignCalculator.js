import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';

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
//  REFERENCE DATA
//  Spur gears are treated as the ψ = 0 case of a helical gear throughout —
//  every formula below degenerates to the standard spur-gear form when the
//  helix angle is zero, so there's one formula set instead of two, and no
//  risk of the spur and helical paths silently drifting apart.
// ─────────────────────────────────────────────────────────────────────────────

// Lewis form factor Y — standard analytical approximations (avoids needing
// a lookup table). Uses the FORMATIVE (virtual) number of teeth for helical
// gears: Tv = T / cos³ψ, which is just T itself when ψ = 0.
const PRESSURE_ANGLES = [
  { id: '14.5fd', label: '14.5° Full Depth', Y: (T) => 0.124 - 0.684 / T },
  { id: '20fd', label: '20° Full Depth', Y: (T) => 0.154 - 0.912 / T },
  { id: '20stub', label: '20° Stub', Y: (T) => 0.175 - 0.841 / T },
];

// Typical design bending stress values (N/mm²) — commonly tabulated
// reference figures for textbook-style gear problems. Verify against your
// own design data book before using for a real design.
const GEAR_MATERIALS = [
  { id: 'ci_grade14', label: 'Cast Iron (Grade 14)', sigma: 56 },
  { id: 'ci_grade30', label: 'Cast Iron (Grade 30)', sigma: 105 },
  { id: 'cast_steel', label: 'Cast Steel (0.20%C)', sigma: 103 },
  { id: 'c45_untreated', label: 'C45 Steel (untreated)', sigma: 138 },
  { id: 'c45_hardened', label: 'C45 Steel (hardened)', sigma: 210 },
  { id: 'nickel_chrome', label: 'Nickel-Chrome Steel', sigma: 310 },
  { id: 'phosphor_bronze', label: 'Phosphor Bronze (cast)', sigma: 84 },
  { id: 'custom', label: 'Custom', sigma: null },
];

// Buckingham load-stress factor K (N/mm²) for the wear-strength check —
// again, typical reference figures; the material-pair/hardness table in
// your design data book is the authoritative source.
const WEAR_K_FACTORS = [
  { id: 'steel_steel_200', label: 'Steel–Steel, 200 BHN', K: 0.16 },
  { id: 'steel_steel_250', label: 'Steel–Steel, 250 BHN', K: 0.235 },
  { id: 'steel_steel_300', label: 'Steel–Steel, 300 BHN', K: 0.34 },
  { id: 'steel_ci', label: 'Steel–Cast Iron', K: 0.115 },
  { id: 'ci_ci', label: 'Cast Iron–Cast Iron', K: 0.09 },
  { id: 'custom', label: 'Custom', K: null },
];

const SERVICE_FACTORS = [
  { label: 'Steady load', value: 1.0 },
  { label: 'Light shock', value: 1.25 },
  { label: 'Medium shock', value: 1.5 },
  { label: 'Heavy shock', value: 1.8 },
];

// Barth's velocity factor — accounts for dynamic effects at running speed
// without the full Buckingham dynamic-load equation. v is pitch-line
// velocity in m/s.
const VELOCITY_FACTORS = [
  { id: 'ordinary', label: 'Ordinary (cut), v < 10 m/s', Cv: (v) => 3 / (3 + v) },
  { id: 'machine_cut', label: 'Machine cut, careful', Cv: (v) => 6 / (6 + v) },
  { id: 'hobbed', label: 'Hobbed / Shaved (precision)', Cv: (v) => 5.6 / (5.6 + Math.sqrt(v)) },
  { id: 'ground', label: 'Ground (high precision)', Cv: (v) => 0.75 / (0.75 + Math.sqrt(v)) },
];

const MODULE_PRESETS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20];

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
//  DIAGRAM — two pitch circles tangent at the pitch point, with center
//  distance called out. Purely schematic (not exactly to scale for extreme
//  gear ratios, clamped so both circles always stay visible).
// ─────────────────────────────────────────────────────────────────────────────
function GearDiagram({ Tp, Tg }) {
  const W = 320, H = 170;
  const cy = 95;
  const ratio = Math.max(0.35, Math.min(2.8, Tg / Tp));
  const rp = 42;
  const rg = rp * ratio;
  const cxP = 90;
  const cxG = cxP + rp + rg;

  const pitchPath = Skia.Path.Make();
  pitchPath.moveTo(cxP, cy);
  pitchPath.lineTo(cxG, cy);

  const tickPath = Skia.Path.Make();
  tickPath.moveTo(cxP, cy - 6); tickPath.lineTo(cxP, cy + 6);
  tickPath.moveTo(cxG, cy - 6); tickPath.lineTo(cxG, cy + 6);

  return (
    <Canvas style={{ width: W, height: H }}>
      <Circle cx={cxP} cy={cy} r={rp} color={C.accentBg} />
      <Circle cx={cxP} cy={cy} r={rp} color={C.accent} style="stroke" strokeWidth={2} />
      <Circle cx={cxG} cy={cy} r={rg} color={C.accentBg} />
      <Circle cx={cxG} cy={cy} r={rg} color={C.accent} style="stroke" strokeWidth={2} />
      <Circle cx={(cxP + cxG) / 2} cy={cy} r={3} color={C.fail} />
      <Path path={pitchPath} color={C.textSub} style="stroke" strokeWidth={1} />
      <Path path={tickPath} color={C.text} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function GearDesignCalculator() {
  const [helical, setHelical] = useState(false);
  const [module, setModule] = useState('4');
  const [Tp, setTp] = useState('20');
  const [Tg, setTg] = useState('60');
  const [pressureAngleId, setPressureAngleId] = useState('20fd');
  const [helixAngle, setHelixAngle] = useState('15');
  const [faceWidth, setFaceWidth] = useState('40');

  const [power, setPower] = useState('5');
  const [speed, setSpeed] = useState('1440');
  const [serviceFactor, setServiceFactor] = useState(1.0);
  const [velocityFactorId, setVelocityFactorId] = useState('machine_cut');

  const [pinionMaterialId, setPinionMaterialId] = useState('c45_untreated');
  const [gearMaterialId, setGearMaterialId] = useState('c45_untreated');
  const [customPinionSigma, setCustomPinionSigma] = useState('138');
  const [customGearSigma, setCustomGearSigma] = useState('138');

  const [kFactorId, setKFactorId] = useState('steel_steel_250');
  const [customK, setCustomK] = useState('0.235');

  const [fosTarget, setFosTarget] = useState('1.5');

  const pressureAngle = PRESSURE_ANGLES.find((p) => p.id === pressureAngleId);
  const velocityFactorDef = VELOCITY_FACTORS.find((v) => v.id === velocityFactorId);
  const pinionMaterial = GEAR_MATERIALS.find((m) => m.id === pinionMaterialId);
  const gearMaterial = GEAR_MATERIALS.find((m) => m.id === gearMaterialId);
  const kDef = WEAR_K_FACTORS.find((k) => k.id === kFactorId);

  const sigmaPinion = pinionMaterial.id === 'custom' ? Number(customPinionSigma) || 0 : pinionMaterial.sigma;
  const sigmaGear = gearMaterial.id === 'custom' ? Number(customGearSigma) || 0 : gearMaterial.sigma;
  const K = kDef.id === 'custom' ? Number(customK) || 0 : kDef.K;

  const result = useMemo(() => {
    const m = Number(module) || 0;
    const Tpv = Number(Tp) || 0;
    const Tgv = Number(Tg) || 0;
    const b = Number(faceWidth) || 0;
    const P = Number(power) || 0;
    const Np = Number(speed) || 0;
    const psiDeg = helical ? Number(helixAngle) || 0 : 0;
    if (!m || !Tpv || !Tgv || !b || !P || !Np) return null;

    const psi = (psiDeg * Math.PI) / 180;
    const phi = (Number(pressureAngle.id.match(/^[\d.]+/)[0]) * Math.PI) / 180;
    const cosPsi = Math.cos(psi);

    // Geometry — transverse module carries the helix-angle correction; for
    // spur gears (ψ = 0) this is identical to the normal module.
    const mt = m / cosPsi;
    const Dp = mt * Tpv;
    const Dg = mt * Tgv;
    const centerDistance = mt * (Tpv + Tgv) / 2;
    const circularPitch = Math.PI * mt;
    const addendum = m;
    const dedendum = 1.25 * m;
    const outsideDiaP = Dp + 2 * addendum;
    const outsideDiaG = Dg + 2 * addendum;
    const rootDiaP = Dp - 2 * dedendum;
    const rootDiaG = Dg - 2 * dedendum;
    const gearRatio = Tgv / Tpv;
    const Ng = Np * Tpv / Tgv;

    // Loads
    const v = (Math.PI * Dp * Np) / 60000; // m/s
    if (!v) return null;
    const Wt = (P * 1000) / v; // N
    const Wr = (Wt * Math.tan(phi)) / cosPsi;
    const Wa = Wt * Math.tan(psi);

    const Cv = velocityFactorDef.Cv(v);
    const Weff = (serviceFactor * Wt) / Cv;

    // Bending strength (Lewis, formative-teeth method for helical)
    const TvP = Tpv / cosPsi ** 3;
    const TvG = Tgv / cosPsi ** 3;
    const Yp = pressureAngle.Y(TvP);
    const Yg = pressureAngle.Y(TvG);
    const WbPinion = (sigmaPinion * b * Math.PI * m * Yp) / cosPsi;
    const WbGear = (sigmaGear * b * Math.PI * m * Yg) / cosPsi;
    const weakerIsPinion = WbPinion <= WbGear;
    const Wb = Math.min(WbPinion, WbGear);
    const fosBending = Weff ? Wb / Weff : 0;

    // Wear strength (Buckingham)
    const Q = (2 * Tgv) / (Tpv + Tgv);
    const Ww = (Dp * b * Q * K) / cosPsi ** 2;
    const fosWear = Weff ? Ww / Weff : 0;

    return {
      mt, Dp, Dg, centerDistance, circularPitch, addendum, dedendum,
      outsideDiaP, outsideDiaG, rootDiaP, rootDiaG, gearRatio, Ng,
      v, Wt, Wr, Wa, Cv, Weff,
      Yp, Yg, WbPinion, WbGear, Wb, weakerIsPinion, fosBending,
      Q, Ww, fosWear,
    };
  }, [
    module, Tp, Tg, faceWidth, power, speed, helical, helixAngle,
    pressureAngle, velocityFactorDef, serviceFactor, sigmaPinion, sigmaGear, K,
  ]);

  const target = Number(fosTarget) || 0;
  const bendingOk = result ? result.fosBending >= target : false;
  const wearOk = result ? result.fosWear >= target : false;
  const governing = result ? (result.Wb <= result.Ww ? 'Bending' : 'Wear') : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Gear Design & Load Calculator</Text>
        <Text style={styles.subtitle}>Geometry, tooth loads, Lewis bending & Buckingham wear checks</Text>

        <Text style={styles.sectionLabel}>GEAR TYPE</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            onPress={() => setHelical(false)}
            style={[styles.segmentBtn, !helical && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, !helical && styles.segmentBtnTextActive]}>Spur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHelical(true)}
            style={[styles.segmentBtn, helical && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, helical && styles.segmentBtnTextActive]}>Helical</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <GearDiagram Tp={Number(Tp) || 20} Tg={Number(Tg) || 60} />
        </View>

        <Text style={styles.sectionLabel}>GEOMETRY</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Module {helical ? '(normal)' : ''}</Text>
          <ChipRow
            options={MODULE_PRESETS.map((m) => ({ id: String(m), label: String(m) }))}
            value={module}
            onChange={setModule}
          />
          <NumField label={helical ? 'Normal Module' : 'Module'} unit="mm" value={module} onChangeText={setModule} />
          <NumField label="Pinion Teeth (Tp)" value={Tp} onChangeText={setTp} />
          <NumField label="Gear Teeth (Tg)" value={Tg} onChangeText={setTg} />
          <Text style={styles.fieldLabel}>Pressure Angle</Text>
          <ChipRow options={PRESSURE_ANGLES} value={pressureAngleId} onChange={setPressureAngleId} />
          {helical && (
            <NumField label="Helix Angle ψ" unit="deg" value={helixAngle} onChangeText={setHelixAngle} />
          )}
          <NumField label="Face Width b" unit="mm" value={faceWidth} onChangeText={setFaceWidth} />
          <Text style={styles.derivedText}>Recommended: b ≈ {(9.5 * (Number(module) || 0)).toFixed(0)}–{(12.5 * (Number(module) || 0)).toFixed(0)} mm</Text>
        </View>

        <Text style={styles.sectionLabel}>OPERATING CONDITIONS</Text>
        <View style={styles.card}>
          <NumField label="Power (at pinion)" unit="kW" value={power} onChangeText={setPower} />
          <NumField label="Pinion Speed" unit="rpm" value={speed} onChangeText={setSpeed} />
          <Text style={styles.fieldLabel}>Service Factor (load type)</Text>
          <ChipRow
            options={SERVICE_FACTORS}
            value={serviceFactor}
            onChange={setServiceFactor}
            getId={(o) => o.value}
          />
          <Text style={styles.fieldLabel}>Velocity Factor (gear cutting quality)</Text>
          <ChipRow options={VELOCITY_FACTORS} value={velocityFactorId} onChange={setVelocityFactorId} />
        </View>

        <Text style={styles.sectionLabel}>MATERIAL — PINION</Text>
        <ChipRow options={GEAR_MATERIALS} value={pinionMaterialId} onChange={setPinionMaterialId} />
        {pinionMaterialId === 'custom' && (
          <View style={styles.card}>
            <NumField label="Design Bending Stress σo" unit="N/mm²" value={customPinionSigma} onChangeText={setCustomPinionSigma} />
          </View>
        )}

        <Text style={styles.sectionLabel}>MATERIAL — GEAR</Text>
        <ChipRow options={GEAR_MATERIALS} value={gearMaterialId} onChange={setGearMaterialId} />
        {gearMaterialId === 'custom' && (
          <View style={styles.card}>
            <NumField label="Design Bending Stress σo" unit="N/mm²" value={customGearSigma} onChangeText={setCustomGearSigma} />
          </View>
        )}

        <Text style={styles.sectionLabel}>WEAR — LOAD-STRESS FACTOR</Text>
        <ChipRow options={WEAR_K_FACTORS} value={kFactorId} onChange={setKFactorId} />
        {kFactorId === 'custom' && (
          <View style={styles.card}>
            <NumField label="Load-Stress Factor K" unit="N/mm²" value={customK} onChangeText={setCustomK} />
          </View>
        )}

        <Text style={styles.sectionLabel}>SAFETY CRITERIA</Text>
        <View style={styles.card}>
          <NumField label="Target Factor of Safety" value={fosTarget} onChangeText={setFosTarget} />
        </View>

        <Text style={styles.sectionLabel}>RESULTS — GEOMETRY</Text>
        <View style={styles.card}>
          {!result ? (
            <Text style={styles.derivedText}>Enter module, teeth, face width, power & speed to see results.</Text>
          ) : (
            <>
              <ResultRow label="Pitch Dia — Pinion (Dp)" value={result.Dp.toFixed(2)} unit="mm" />
              <ResultRow label="Pitch Dia — Gear (Dg)" value={result.Dg.toFixed(2)} unit="mm" />
              <ResultRow label="Center Distance" value={result.centerDistance.toFixed(2)} unit="mm" highlight />
              <ResultRow label="Circular Pitch" value={result.circularPitch.toFixed(2)} unit="mm" />
              <ResultRow label="Addendum" value={result.addendum.toFixed(2)} unit="mm" />
              <ResultRow label="Dedendum" value={result.dedendum.toFixed(2)} unit="mm" />
              <ResultRow label="Outside Dia — Pinion" value={result.outsideDiaP.toFixed(2)} unit="mm" />
              <ResultRow label="Outside Dia — Gear" value={result.outsideDiaG.toFixed(2)} unit="mm" />
              <ResultRow label="Root Dia — Pinion" value={result.rootDiaP.toFixed(2)} unit="mm" />
              <ResultRow label="Root Dia — Gear" value={result.rootDiaG.toFixed(2)} unit="mm" />
              <ResultRow label="Gear Ratio (Tg/Tp)" value={result.gearRatio.toFixed(3)} />
              <ResultRow label="Gear Speed" value={result.Ng.toFixed(1)} unit="rpm" />
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>RESULTS — LOADS</Text>
        <View style={styles.card}>
          {result && (
            <>
              <ResultRow label="Pitch Line Velocity" value={result.v.toFixed(3)} unit="m/s" />
              <ResultRow label="Tangential Load (Wt)" value={result.Wt.toFixed(1)} unit="N" highlight />
              <ResultRow label="Radial Load (Wr)" value={result.Wr.toFixed(1)} unit="N" />
              {helical && <ResultRow label="Axial / Thrust Load (Wa)" value={result.Wa.toFixed(1)} unit="N" />}
              <ResultRow label="Velocity Factor (Cv)" value={result.Cv.toFixed(3)} />
              <ResultRow label="Effective Design Load (Weff)" value={result.Weff.toFixed(1)} unit="N" highlight />
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>RESULTS — STRENGTH CHECKS</Text>
        <View style={styles.card}>
          {result && (
            <>
              <ResultRow label="Lewis Form Factor — Pinion (Yp)" value={result.Yp.toFixed(4)} />
              <ResultRow label="Lewis Form Factor — Gear (Yg)" value={result.Yg.toFixed(4)} />
              <ResultRow label="Beam Strength — Pinion" value={result.WbPinion.toFixed(1)} unit="N" />
              <ResultRow label="Beam Strength — Gear" value={result.WbGear.toFixed(1)} unit="N" />
              <ResultRow
                label={`Governing Beam Strength (${result.weakerIsPinion ? 'Pinion' : 'Gear'} weaker)`}
                value={result.Wb.toFixed(1)}
                unit="N"
                highlight
              />
              <ResultRow
                label="Bending Factor of Safety"
                value={result.fosBending.toFixed(2)}
                status={bendingOk ? 'PASS' : 'FAIL'}
              />
              <ResultRow label="Wear Strength (Ww)" value={result.Ww.toFixed(1)} unit="N" highlight />
              <ResultRow
                label="Wear Factor of Safety"
                value={result.fosWear.toFixed(2)}
                status={wearOk ? 'PASS' : 'FAIL'}
              />
              <Text style={styles.noteText}>
                Design is governed by {governing} strength (the lower of the two capacities).
              </Text>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Lewis equation (velocity-factor method) for bending strength and Buckingham's equation for
          wear strength — the standard simplified gear design procedure. Material and K-factor values
          are typical reference figures; verify against your design data book before real use.
        </Text>
      </ScrollView>
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

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 4, alignItems: 'center',
  },

  segmentRow: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, padding: 3, marginBottom: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: C.accent },
  segmentBtnText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  segmentBtnTextActive: { color: '#FFFFFF' },

  chipRow: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  fieldWrap: { width: '100%', marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: C.textSub, marginBottom: 4, fontWeight: '500', alignSelf: 'flex-start' },
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
});