import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Gauge sweeps from -130deg to +130deg (260deg total), leaving a gap at the bottom
// like a real analog dial.
const START_ANGLE = -130;
const END_ANGLE = 130;

export default function DialGauge({ label, value, min = 0, max = 100, unit = '', size = 96, accentColor = '#3b82f6' }) {
  const clamped = Math.max(min, Math.min(max, value));
  const t = (clamped - min) / (max - min || 1);
  const angle = START_ANGLE + (END_ANGLE - START_ANGLE) * t;
  const needleLength = size / 2 - 10;

  return (
    <View style={styles.wrap}>
      <View style={[styles.dial, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={styles.ticksRow}>
          <Text style={styles.tickText}>{min}</Text>
          <Text style={styles.tickText}>{max}</Text>
        </View>

        <View
          style={[
            styles.needle,
            {
              height: needleLength,
              backgroundColor: accentColor,
              transform: [{ translateY: -needleLength / 2 }, { rotate: `${angle}deg` }],
            },
          ]}
        />
        <View style={[styles.hub, { backgroundColor: accentColor }]} />
      </View>

      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {typeof value === 'number' ? Math.round(value) : value}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dial: {
    borderWidth: 3,
    borderColor: '#3a3f47',
    backgroundColor: '#15171b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ticksRow: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tickText: { color: '#5a606a', fontSize: 9 },
  needle: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
    top: '50%',
  },
  hub: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  label: { color: '#8a919c', fontSize: 10, marginTop: 6, letterSpacing: 0.5 },
  value: { color: '#e8eaed', fontSize: 14, fontWeight: '700', marginTop: 2 },
  unit: { color: '#8a919c', fontSize: 10, fontWeight: '400' },
});
