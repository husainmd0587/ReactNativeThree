import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Reused for chamfer distance, fillet radius, extrude depth, revolve
// angle, and boolean-op overlap — each with its own step/range/unit.
// `dark` switches to light-on-dark text/borders for the 3D screen's dark
// viewport background; the 2D screens' light background uses the default.
export default function DistanceControl({
  label, value, unit = 'mm', step = 1, min = 2, max = 50, onChange, dark = false,
}) {
  const theme = dark ? darkTheme : lightTheme;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          style={[styles.btn, { borderColor: theme.border }, value <= min && styles.btnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, { color: theme.accent }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.valueText, { color: theme.valueColor }]}>{value}{unit ? ` ${unit}` : ''}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          style={[styles.btn, { borderColor: theme.border }, value >= max && styles.btnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={[styles.btnText, { color: theme.accent }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const lightTheme = {
  label: '#6B6B78', border: '#E8E6F0', accent: '#2E7DAF', valueColor: '#1A1A2E',
};
const darkTheme = {
  label: '#9A9AA6', border: '#3A3A42', accent: '#5CA9E0', valueColor: '#FFFFFF',
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  valueText: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', minWidth: 52, textAlign: 'center' },
});
