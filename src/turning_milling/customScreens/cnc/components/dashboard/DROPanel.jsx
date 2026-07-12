import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DROPanel({ x = 0, z = 0, feed = 0, spindleSpeed = 0, workOffset = 'G54' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.offset}>WORK OFFSET: {workOffset}</Text>

      <Row label="X" value={x.toFixed(3)} unit="mm" />
      <Row label="Z" value={z.toFixed(3)} unit="mm" />
      <Row label="F" value={feed.toFixed(2)} unit="mm/rev" small />
      <Row label="S" value={Math.round(spindleSpeed)} unit="RPM" small />
    </View>
  );
}

function Row({ label, value, unit, small }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.readout, small && styles.readoutSmall]}>
        <Text style={[styles.readoutValue, small && styles.readoutValueSmall]}>{value}</Text>
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#15171b', borderRadius: 10, padding: 12 },
  offset: { color: '#4ade80', fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowLabel: { color: '#c7ccd4', fontSize: 14, fontWeight: '700', width: 20 },
  readout: { flex: 1, backgroundColor: '#000', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginHorizontal: 8 },
  readoutSmall: { paddingVertical: 6 },
  readoutValue: { color: '#e8eaed', fontSize: 18, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' },
  readoutValueSmall: { fontSize: 15 },
  unit: { color: '#6b7178', fontSize: 10, width: 44 },
});
