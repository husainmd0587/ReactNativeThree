import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MIN = 1;
const MAX = 6;
const MIN_POLAR = 2;
const MAX_POLAR = 12;

function Stepper({ label, value, onChange, min, max }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ModeButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.modeBtn, active && styles.modeBtnActive]}
    >
      <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Rectangular: Rows x Columns, spacing comes from the canvas drag.
// Polar: Count copies spaced evenly around a center point (the drag's
// start point on the canvas), always a full circle.
export default function ArrayControls({
  mode, onModeChange, rows, cols, onRowsChange, onColsChange, count, onCountChange,
}) {
  return (
    <View>
      <View style={styles.modeRow}>
        <ModeButton label="Rectangular" active={mode === 'rectangular'} onPress={() => onModeChange('rectangular')} />
        <ModeButton label="Polar" active={mode === 'polar'} onPress={() => onModeChange('polar')} />
      </View>
      {mode === 'rectangular' ? (
        <View style={styles.row}>
          <Stepper label="Rows" value={rows} onChange={onRowsChange} min={MIN} max={MAX} />
          <Stepper label="Columns" value={cols} onChange={onColsChange} min={MIN} max={MAX} />
        </View>
      ) : (
        <View style={styles.row}>
          <Stepper label="Count" value={count} onChange={onCountChange} min={MIN_POLAR} max={MAX_POLAR} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    backgroundColor: '#FFFFFF',
  },
  modeBtnActive: { backgroundColor: '#E7F3FA', borderColor: '#BFE0F2' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: '#6B6B78' },
  modeBtnTextActive: { color: '#1D6FA5' },
  row: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B78' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: { fontSize: 15, fontWeight: '700', color: '#2E7DAF' },
  stepperValue: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', minWidth: 16, textAlign: 'center' },
});
