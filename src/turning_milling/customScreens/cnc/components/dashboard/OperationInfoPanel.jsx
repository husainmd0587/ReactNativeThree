import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CYCLE_NAMES = {
  manual: 'Manual Move',
  G70: 'Finishing Cycle',
  G71: 'Rough Turning Cycle',
  G72: 'Rough Facing Cycle',
  G74: 'Peck Drilling Cycle',
  G75: 'Peck Grooving Cycle',
  G76: 'Threading Cycle',
  G184: 'Radial Drilling',
};

/**
 * Given the full pass list and the current pass index, find "pass N of M"
 * WITHIN the current pass's cycle - e.g. G71 might be passes 1-12 out of an
 * 18-pass program; this reports "Pass 4 of 12", not "Pass 4 of 18". Consecutive
 * passes sharing the same cycle code are treated as one group (matches how
 * toolpathToPasses.js actually groups them - each canned cycle's sub-passes
 * are always adjacent in the pass list).
 */
function findPositionWithinCycle(passes, index) {
  if (!passes[index]) return { position: 0, total: 0 };
  const cycle = passes[index].cycle;
  let start = index;
  while (start > 0 && passes[start - 1].cycle === cycle) start -= 1;
  let end = index;
  while (end < passes.length - 1 && passes[end + 1].cycle === cycle) end += 1;
  return { position: index - start + 1, total: end - start + 1 };
}

/**
 * Props:
 *  - passes: full pass array (from simulateGCode result)
 *  - passIndex: current pass index
 *  - telemetry: { feed, spindleSpeed, toolNumber, overallProgress }
 */
export default function OperationInfoPanel({ passes, passIndex, telemetry }) {
  const activePass = passes?.[passIndex];
  if (!activePass) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyText}>No program loaded.</Text>
      </View>
    );
  }

  const cycleName = CYCLE_NAMES[activePass.cycle] ?? activePass.cycle;
  const { position, total } = findPositionWithinCycle(passes, passIndex);
  const progressPct = Math.round((telemetry?.overallProgress ?? 0) * 100);

  return (
    <View style={styles.wrap}>
      <Text style={styles.cycleLabel}>{cycleName.toUpperCase()}</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Pass</Text>
        <Text style={styles.rowValue}>
          {position} <Text style={styles.rowValueDim}>of {total}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Feed</Text>
        <Text style={styles.rowValue}>{telemetry?.feed?.toFixed?.(2) ?? '—'} mm/rev</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Spindle</Text>
        <Text style={styles.rowValue}>{Math.round(telemetry?.spindleSpeed ?? 0)} RPM</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Tool</Text>
        <Text style={styles.rowValue}>T{String(telemetry?.toolNumber ?? 0).padStart(4, '0')}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.progressText}>{progressPct}% of program complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#15171b', borderRadius: 10, padding: 12 },
  emptyText: { color: '#6b7178', fontSize: 11 },
  cycleLabel: { color: '#5aa8ff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  rowLabel: { color: '#6b7178', fontSize: 10 },
  rowValue: { color: '#e8eaed', fontSize: 11, fontWeight: '700' },
  rowValueDim: { color: '#6b7178', fontWeight: '400' },
  progressBar: { height: 4, backgroundColor: '#2b2f36', borderRadius: 2, marginTop: 8, marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: '#4ade80', borderRadius: 2 },
  progressText: { color: '#6b7178', fontSize: 9 },
});
