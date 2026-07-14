import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share, SafeAreaView, StatusBar,
  Modal, Dimensions,
} from 'react-native';
import { SHAPES, MATERIALS } from './shapes';
import { DimensionedPreview } from './dimensionOverlay';
import { COLORS, RADIUS, SHADOW, FONT } from './theme';
import { formatDate, buildShareText } from './storage';
import { useAppData } from './appData';

const UNITS = ['mm', 'cm', 'm', 'in'];
const SCREEN_H = Dimensions.get('window').height;

// ── Material picker: 80%-height bottom sheet, since the material list is
// long (37 entries) — a small inline dropdown doesn't scale to that.
function MaterialPickerModal({ visible, materials, currentIndex, onSelect, onClose, customDensity, onCustomDensityChange }) {
  const selected = materials[currentIndex];
  const isCustom = selected?.density === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Material</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {materials.map((m, i) => {
              const isActive = i === currentIndex;
              return (
                <TouchableOpacity
                  key={m.label}
                  style={[styles.modalMatRow, isActive && styles.modalMatRowActive]}
                  onPress={() => onSelect(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalMatLabel, isActive && styles.modalMatLabelActive]}>{m.label}</Text>
                  <Text style={[styles.modalMatDensity, isActive && styles.modalMatDensityActive]}>
                    {m.density !== null ? `${m.density} g/cm³` : 'set below'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isCustom && (
            <View style={styles.customDensityRow}>
              <Text style={styles.customDensityLabel}>Custom density (g/cm³)</Text>
              <TextInput
                style={styles.customDensityInput}
                value={customDensity}
                onChangeText={onCustomDensityChange}
                keyboardType="numeric"
                placeholder="7.85"
                placeholderTextColor={COLORS.text3}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CalculatorScreen({ route, navigation }) {
  const { shapeId } = route.params;
  const shape = useMemo(() => SHAPES.find(s => s.id === shapeId), [shapeId]);
  const hasLength = useMemo(() => shape.dims.some(d => d.id === 'length'), [shape]);

  const { addHistoryEntry, settings } = useAppData();

  const [matIndex, setMatIndex] = useState(0);
  const [mode, setMode] = useState('length'); // 'length' | 'weight'
  const [matModalVisible, setMatModalVisible] = useState(false);
  const [customDensity, setCustomDensity] = useState('7.85');
  const [extraMats] = useState([]);

  // Build initial input state from shape dims
  const initInputs = useCallback(() => {
    const obj = {};
    shape.dims.forEach(d => {
      obj[d.id] = d.default !== '' ? String(d.default) : '';
      if (d.unit) obj['unit' + d.id.charAt(0).toUpperCase() + d.id.slice(1)] = 'mm';
    });
    obj.targetWeight = '';
    return obj;
  }, [shape]);

  const [inputs, setInputs] = useState(initInputs);
  const [result, setResult] = useState(null);

  const allMats = useMemo(() => [...MATERIALS, ...extraMats], [extraMats]);
  const rawMaterial = allMats[matIndex] || MATERIALS[0];
  const isCustomMat = rawMaterial.density === null;
  const material = isCustomMat
    ? { label: rawMaterial.label, density: parseFloat(customDensity) || 7.85 }
    : rawMaterial;

  // ── Calculate ──────────────────────────────────────────────────────────────
  // Two modes:
  //  - 'length': the usual case — enter dimensions + length, get the weight.
  //  - 'weight': enter a target weight instead, and the required length is
  //    solved for automatically (weight scales linearly with length for every
  //    shape here, so we measure weight-per-mm and divide it out).
  const calculate = useCallback(() => {
    const d = { ...inputs };
    shape.dims.forEach(dim => {
      if (dim.unit) {
        const unitKey = 'unit' + dim.id.charAt(0).toUpperCase() + dim.id.slice(1);
        d[unitKey] = inputs[unitKey] || 'mm';
      }
    });

    const pieces = parseFloat(inputs.pieces) || 1;
    const kgPrice = parseFloat(inputs.kgPrice) || 0;

    let weightPerPiece, areaPerPiece, computedLengthMM = null;

    if (mode === 'weight' && hasLength) {
      const targetWeight = parseFloat(inputs.targetWeight) || 0;
      const perMMDims = { ...d, length: '1', unitLength: 'mm' };
      const weightPerMM = shape.calcWeight(perMMDims, material.density);
      computedLengthMM = weightPerMM > 0 ? (targetWeight / pieces) / weightPerMM : 0;

      const solvedDims = { ...d, length: String(computedLengthMM), unitLength: 'mm' };
      weightPerPiece = shape.calcWeight(solvedDims, material.density);
      areaPerPiece = shape.calcArea(solvedDims);
    } else {
      weightPerPiece = shape.calcWeight(d, material.density);
      areaPerPiece = shape.calcArea(d);
    }

    const totalWeight = weightPerPiece * pieces;
    const totalArea = areaPerPiece * pieces;
    const total = kgPrice > 0 ? (totalWeight * kgPrice) : null;

    const res = {
      weightPerPiece, areaPerPiece, totalWeight, totalArea, total,
      pieces, kgPrice, computedLengthMM,
    };
    setResult(res);
    return res;
  }, [inputs, shape, material, mode, hasLength]);

  // Live "smart" recalculation — results stay current as the person types,
  // instead of only updating on an explicit button press.
  useEffect(() => {
    calculate();
  }, [calculate]);

  // Build the dimension list used for saved/shared entries. In weight mode the
  // length field is solved for, so its value comes from the result, not inputs.
  const buildDimsList = useCallback((r) => {
    return shape.dims
      .filter(dim => !['pieces', 'kgPrice'].includes(dim.id))
      .map(dim => {
        if (mode === 'weight' && hasLength && dim.id === 'length') {
          return {
            id: dim.id,
            label: dim.label,
            value: r.computedLengthMM != null ? r.computedLengthMM.toFixed(2) : '',
            unit: 'mm',
          };
        }
        return {
          id: dim.id,
          label: dim.label,
          value: inputs[dim.id] || '',
          unit: dim.unit ? (inputs['unit' + dim.id.charAt(0).toUpperCase() + dim.id.slice(1)] || 'mm') : null,
        };
      });
  }, [shape, inputs, mode, hasLength]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const r = calculate();
    const entry = {
      id:        Date.now(),
      shapeId,
      shapeName: shape.name,
      material:  material.label,
      dims:      buildDimsList(r),
      weight:    r.totalWeight.toFixed(4),
      area:      r.totalArea.toFixed(4),
      total:     r.total ? r.total.toFixed(2) : null,
      pieces:    r.pieces,
      date:      formatDate(),
    };
    addHistoryEntry(entry);
    Alert.alert('Saved', 'Calculation saved to history.');
  }, [calculate, buildDimsList, shape, shapeId, material, addHistoryEntry]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const r = calculate();
    const entry = {
      shapeName: shape.name,
      dims:      buildDimsList(r),
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
  }, [calculate, buildDimsList, shape]);

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

  const switchMode = useCallback((next) => {
    if (next === 'weight' && !hasLength) return; // e.g. sheet/plate has no single length axis
    setMode(next);
  }, [hasLength]);

  const currency = settings?.currency || '';

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
              <DimensionedPreview
                shape={shape}
                inputs={
                  mode === 'weight' && hasLength && result?.computedLengthMM != null
                    ? { ...inputs, length: result.computedLengthMM.toFixed(1), unitLength: 'mm' }
                    : inputs
                }
              />
            </View>
            <View style={styles.ctrlCol}>
              {/* Material picker */}
              <TouchableOpacity
                style={styles.matRow}
                onPress={() => setMatModalVisible(true)}
              >
                <Text style={styles.matLabel}>{material.label}</Text>
                <Text style={styles.chevron}>▾</Text>
              </TouchableOpacity>

              {/* Mode toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'length' && styles.toggleBtnActive]}
                  onPress={() => switchMode('length')}
                >
                  <Text style={[styles.toggleTxt, mode === 'length' && styles.toggleTxtActive]}>
                    by Length
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    mode === 'weight' && styles.toggleBtnActive,
                    !hasLength && styles.toggleBtnDisabled,
                  ]}
                  disabled={!hasLength}
                  onPress={() => switchMode('weight')}
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
          {shape.dims.map(dim => {
            if (mode === 'weight' && hasLength && dim.id === 'length') return null;
            return (
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
            );
          })}

          {mode === 'weight' && hasLength && (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Target Weight :</Text>
              <TextInput
                style={styles.input}
                value={inputs.targetWeight !== undefined ? String(inputs.targetWeight) : ''}
                onChangeText={v => setInput('targetWeight', v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.text3}
              />
              <View style={styles.unitBtn}>
                <Text style={styles.unitTxt}>kg</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Results card ── */}
        <View style={styles.card}>
          <Text style={styles.resultsTitle}>Results</Text>

          {mode === 'weight' && hasLength && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Required length :</Text>
              <Text style={styles.resultVal}>
                {result?.computedLengthMM != null ? result.computedLengthMM.toFixed(2) + ' mm' : '— mm'}
              </Text>
            </View>
          )}
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
              <Text style={styles.resultVal}>{currency}{result.total.toFixed(2)}</Text>
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

      <MaterialPickerModal
        visible={matModalVisible}
        materials={allMats}
        currentIndex={matIndex}
        onSelect={(i) => { setMatIndex(i); if (allMats[i].density !== null) setMatModalVisible(false); }}
        onClose={() => setMatModalVisible(false)}
        customDensity={customDensity}
        onCustomDensityChange={setCustomDensity}
      />
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

  // ── Material picker modal (80% screen height) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: SCREEN_H * 0.8,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: FONT.bold, color: COLORS.text },
  modalCloseBtn: { padding: 4 },
  modalCloseTxt: { fontSize: 18, color: COLORS.text2 },
  modalList: { paddingVertical: 4 },
  modalMatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalMatRowActive: { backgroundColor: COLORS.cyanLight },
  modalMatLabel: { fontSize: 14, color: COLORS.text, fontWeight: FONT.medium },
  modalMatLabelActive: { color: COLORS.cyanDark, fontWeight: FONT.semibold },
  modalMatDensity: { fontSize: 12, color: COLORS.text2 },
  modalMatDensityActive: { color: COLORS.cyanDark },
  customDensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  customDensityLabel: { fontSize: 13, color: COLORS.text, fontWeight: FONT.medium },
  customDensityInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card,
    minWidth: 90,
    textAlign: 'right',
  },

  toggleRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  toggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: COLORS.card },
  toggleBtnActive: { backgroundColor: COLORS.cyan },
  toggleBtnDisabled: { opacity: 0.4 },
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
