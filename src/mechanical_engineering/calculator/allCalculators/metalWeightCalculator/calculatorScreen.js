import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share, SafeAreaView, StatusBar,
} from 'react-native';
import { SHAPES, MATERIALS } from './shapes';
import { SHAPE_PREVIEWS } from './shapeIcon';
import { COLORS, RADIUS, SHADOW, FONT } from './theme';
import { addHistoryEntry, formatDate, buildShareText } from './storage';

const UNITS = ['mm', 'cm', 'm'];

export default function CalculatorScreen({ route, navigation }) {
  const { shapeId } = route.params;
  const shape = useMemo(() => SHAPES.find(s => s.id === shapeId), [shapeId]);

  const [matIndex, setMatIndex] = useState(0);
  const [mode, setMode] = useState('length'); // 'length' | 'weight'
  const [showMatPicker, setShowMatPicker] = useState(false);
  const [extraMats, setExtraMats] = useState([]);

  // Build initial input state from shape dims
  const initInputs = useCallback(() => {
    const obj = {};
    shape.dims.forEach(d => {
      obj[d.id] = d.default !== '' ? String(d.default) : '';
      if (d.unit) obj['unit' + d.id.charAt(0).toUpperCase() + d.id.slice(1)] = 'mm';
    });
    return obj;
  }, [shape]);

  const [inputs, setInputs] = useState(initInputs);
  const [result, setResult] = useState(null);

  const allMats = useMemo(() => [...MATERIALS, ...extraMats], [extraMats]);
  const material = allMats[matIndex] || MATERIALS[0];

  const PreviewComp = SHAPE_PREVIEWS[shapeId];

  // ── Calculate ──────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    const d = { ...inputs };
    // convert unit fields
    shape.dims.forEach(dim => {
      if (dim.unit) {
        const unitKey = 'unit' + dim.id.charAt(0).toUpperCase() + dim.id.slice(1);
        d[unitKey] = inputs[unitKey] || 'mm';
      }
    });

    const pieces = parseFloat(inputs.pieces) || 1;
    const kgPrice = parseFloat(inputs.kgPrice) || 0;

    const weightPerPiece = shape.calcWeight(d, material.density);
    const areaPerPiece   = shape.calcArea(d);
    const totalWeight    = weightPerPiece * pieces;
    const totalArea      = areaPerPiece   * pieces;
    const total          = kgPrice > 0 ? (totalWeight * kgPrice) : null;

    setResult({ weightPerPiece, areaPerPiece, totalWeight, totalArea, total, pieces, kgPrice });
    return { weightPerPiece, areaPerPiece, totalWeight, totalArea, total, pieces, kgPrice };
  }, [inputs, shape, material]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const r = calculate();
    const dimsList = shape.dims
      .filter(d => !['pieces', 'kgPrice'].includes(d.id))
      .map(d => ({
        id: d.id,
        label: d.label,
        value: inputs[d.id] || '',
        unit: d.unit ? (inputs['unit' + d.id.charAt(0).toUpperCase() + d.id.slice(1)] || 'mm') : null,
      }));

    const entry = {
      id:        Date.now(),
      shapeId,
      shapeName: shape.name,
      material:  material.label,
      dims:      dimsList,
      weight:    r.totalWeight.toFixed(4),
      area:      r.totalArea.toFixed(4),
      total:     r.total ? r.total.toFixed(2) : null,
      pieces:    r.pieces,
      date:      formatDate(),
    };
    await addHistoryEntry(entry);
    Alert.alert('Saved', 'Calculation saved to history.');
  }, [calculate, shape, shapeId, material, inputs]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const r = calculate();
    const dimsList = shape.dims
      .filter(d => !['pieces', 'kgPrice'].includes(d.id))
      .map(d => ({
        id: d.id,
        label: d.label,
        value: inputs[d.id] || '',
        unit: d.unit ? (inputs['unit' + d.id.charAt(0).toUpperCase() + d.id.slice(1)] || 'mm') : null,
      }));

    const entry = {
      shapeName: shape.name,
      dims:      dimsList,
      weight:    r.totalWeight.toFixed(4),
      area:      r.totalArea.toFixed(4),
      total:     r.total ? r.total.toFixed(2) : null,
      date:      formatDate(),
    };
    const text = buildShareText(entry);

    try {
      await Share.share({ message: text });
    } catch (e) {
      Alert.alert('Share failed', e.message);
    }
  }, [calculate, shape, inputs]);

  // ── Unit toggle for a dimension ────────────────────────────────────────────
  const cycleUnit = useCallback((dimId) => {
    const key = 'unit' + dimId.charAt(0).toUpperCase() + dimId.slice(1);
    setInputs(prev => {
      const cur = prev[key] || 'mm';
      const idx = UNITS.indexOf(cur);
      return { ...prev, [key]: UNITS[(idx + 1) % UNITS.length] };
    });
  }, []);

  const setInput = useCallback((key, val) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{shape.name}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('History')}>
          <Text style={styles.iconTxt}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.iconTxt}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Visual + controls card ── */}
        <View style={styles.card}>
          <View style={styles.visualRow}>
            <View style={styles.previewBox}>
              <PreviewComp />
            </View>
            <View style={styles.ctrlCol}>
              {/* Material picker */}
              <TouchableOpacity
                style={styles.matRow}
                onPress={() => setShowMatPicker(v => !v)}
              >
                <Text style={styles.matLabel}>{material.label}</Text>
                <Text style={styles.chevron}>▾</Text>
              </TouchableOpacity>
              {showMatPicker && (
                <View style={styles.matDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {allMats.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.matOpt, i === matIndex && styles.matOptActive]}
                        onPress={() => { setMatIndex(i); setShowMatPicker(false); }}
                      >
                        <Text style={[styles.matOptTxt, i === matIndex && styles.matOptTxtActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Mode toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'length' && styles.toggleBtnActive]}
                  onPress={() => setMode('length')}
                >
                  <Text style={[styles.toggleTxt, mode === 'length' && styles.toggleTxtActive]}>
                    by Length
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'weight' && styles.toggleBtnActive]}
                  onPress={() => setMode('weight')}
                >
                  <Text style={[styles.toggleTxt, mode === 'weight' && styles.toggleTxtActive]}>
                    by Weight
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.densityBadge}>
                <Text style={styles.densityTxt}>{material.density} gr/cm³</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Inputs card ── */}
        <View style={styles.card}>
          {shape.dims.map(dim => (
            <View key={dim.id} style={styles.inputRow}>
              <Text style={styles.inputLabel}>{dim.label} :</Text>
              <TextInput
                style={styles.input}
                value={inputs[dim.id] !== undefined ? String(inputs[dim.id]) : ''}
                onChangeText={v => setInput(dim.id, v)}
                keyboardType="numeric"
                placeholder={dim.id === 'pieces' || dim.id === 'kgPrice' ? '' : String(dim.default)}
                placeholderTextColor={COLORS.text3}
              />
              {dim.unit && (
                <TouchableOpacity
                  style={styles.unitBtn}
                  onPress={() => cycleUnit(dim.id)}
                >
                  <Text style={styles.unitTxt}>
                    {inputs['unit' + dim.id.charAt(0).toUpperCase() + dim.id.slice(1)] || 'mm'} ▾
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* ── Results card ── */}
        <View style={styles.card}>
          <Text style={styles.resultsTitle}>Results</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Weight :</Text>
            <Text style={styles.resultVal}>
              {result ? result.totalWeight.toFixed(4) + ' kg' : '— kg'}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Paint area :</Text>
            <Text style={styles.resultVal}>
              {result ? result.totalArea.toFixed(4) + ' m²' : '— m²'}
            </Text>
          </View>
          {result?.total != null && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total :</Text>
              <Text style={styles.resultVal}>{result.total.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerIconBtn} onPress={handleShare}>
          <Text style={styles.footerIconTxt}>↗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
          <Text style={styles.calcBtnTxt}>CALCULATE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerIconBtn} onPress={handleSave}>
          <Text style={styles.footerIconTxt}>💾</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 20 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 4,
  },
  backBtn: { padding: 6 },
  backTxt: { fontSize: 28, color: COLORS.text, lineHeight: 32 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: FONT.bold,
    color: COLORS.text,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  iconBtn: { padding: 6 },
  iconTxt: { fontSize: 20, color: COLORS.pink },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.sm,
  },

  // Visual row
  visualRow: { flexDirection: 'row', gap: 12 },
  previewBox: { width: 110, height: 100, alignItems: 'center', justifyContent: 'center' },
  ctrlCol: { flex: 1, gap: 8 },

  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.inputBg,
  },
  matLabel: { fontSize: 13, color: COLORS.text, fontWeight: FONT.medium },
  chevron:  { fontSize: 13, color: COLORS.text2 },
  matDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    ...SHADOW.md,
    zIndex: 99,
  },
  matOpt: { paddingHorizontal: 14, paddingVertical: 10 },
  matOptActive: { backgroundColor: COLORS.cyanLight },
  matOptTxt: { fontSize: 13, color: COLORS.text },
  matOptTxtActive: { color: COLORS.cyanDark, fontWeight: FONT.semibold },

  toggleRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  toggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: COLORS.card },
  toggleBtnActive: { backgroundColor: COLORS.cyan },
  toggleTxt: { fontSize: 11, fontWeight: FONT.semibold, color: COLORS.text2 },
  toggleTxtActive: { color: COLORS.white },

  densityBadge: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
  },
  densityTxt: { fontSize: 12, color: COLORS.text2 },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputLabel: { width: 110, fontSize: 13, fontWeight: FONT.semibold, color: COLORS.text },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
  },
  unitBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.inputBg,
    minWidth: 54,
    alignItems: 'center',
  },
  unitTxt: { fontSize: 12, color: COLORS.text, fontWeight: FONT.medium },

  // Results
  resultsTitle: { fontSize: 14, fontWeight: FONT.bold, color: COLORS.text, textAlign: 'center' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  resultLabel: { fontSize: 13, color: COLORS.text2 },
  resultVal: { fontSize: 15, fontWeight: FONT.bold, color: COLORS.cyanDark },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.bg,
  },
  footerIconBtn: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    backgroundColor: '#B0CDD9',
    alignItems: 'center', justifyContent: 'center',
  },
  footerIconTxt: { fontSize: 20 },
  calcBtn: {
    flex: 1, height: 52, borderRadius: RADIUS.md,
    backgroundColor: COLORS.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  calcBtnTxt: { color: COLORS.white, fontWeight: FONT.bold, fontSize: 16, letterSpacing: 1.2 },
});