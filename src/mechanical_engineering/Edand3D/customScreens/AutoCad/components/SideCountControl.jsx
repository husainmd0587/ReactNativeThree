import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MIN_SIDES = 3;
const MAX_SIDES = 12;

// Side-count stepper for the Polygon command — 3 (triangle) up to a
// 12-sided dodecagon, defaulting to a hexagon like AutoCAD's own POLYGON.
export default function SideCountControl({ value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Sides</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(MIN_SIDES, value - 1))}
          disabled={value <= MIN_SIDES}
          style={[styles.btn, value <= MIN_SIDES && styles.btnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(MAX_SIDES, value + 1))}
          disabled={value >= MAX_SIDES}
          style={[styles.btn, value >= MAX_SIDES && styles.btnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#6B6B78' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#2E7DAF' },
  value: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', minWidth: 16, textAlign: 'center' },
});