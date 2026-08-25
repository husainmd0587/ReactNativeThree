import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MIN = 1;
const MAX = 6;

function Stepper({ label, value, onChange }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(MIN, value - 1))}
          disabled={value <= MIN}
          style={[styles.stepBtn, value <= MIN && styles.stepBtnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(MAX, value + 1))}
          disabled={value >= MAX}
          style={[styles.stepBtn, value >= MAX && styles.stepBtnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Rows x Columns for a rectangular array. The spacing between copies
// comes from the drag on the canvas, not from here — this only controls
// how many copies to make.
export default function ArrayControls({ rows, cols, onRowsChange, onColsChange }) {
  return (
    <View style={styles.row}>
      <Stepper label="Rows" value={rows} onChange={onRowsChange} />
      <Stepper label="Columns" value={cols} onChange={onColsChange} />
    </View>
  );
}

const styles = StyleSheet.create({
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
