import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CompactStatusStrip({ toolNumber = 0, spindleSpeed = 0, feed = 0, lineIndex, elapsedSeconds = 0 }) {
  return (
    <View style={styles.wrap}>
      <Item label="TOOL" value={`T${String(toolNumber).padStart(2, '0')}01`} color="#f5a524" />
      <Dot />
      <Item label="RPM" value={Math.round(spindleSpeed)} color="#e8eaed" />
      <Dot />
      <Item label="FEED" value={`${feed?.toFixed?.(2) ?? feed}`} color="#4ade80" />
      <Dot />
      <Item label="LN" value={lineIndex ?? '—'} color="#5aa8ff" />
      <Dot />
      <Item label="TIME" value={fmtTime(elapsedSeconds)} color="#9aa0aa" />
    </View>
  );
}

function Item({ label, value, color }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={[styles.itemValue, { color }]}>{value}</Text>
    </View>
  );
}

function Dot() {
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1013',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1f24',
  },
  item: { flexDirection: 'row', alignItems: 'baseline' },
  itemLabel: { fontSize: 8, color: '#5a606a', marginRight: 3, letterSpacing: 0.3 },
  itemValue: { fontSize: 10, fontWeight: '700' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#33373f', marginHorizontal: 8 },
});
