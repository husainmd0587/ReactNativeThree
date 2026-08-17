import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ResultPanel({ result, onRetry }) {
  return (
    <View style={[styles.panel, result.correct ? styles.correct : styles.incorrect]}>
      <Text style={[styles.status, result.correct ? styles.statusCorrect : styles.statusIncorrect]}>
        {result.correct ? 'Correct' : 'Not quite'}
      </Text>

      {result.checks.map((check) => (
        <View key={check.label} style={styles.row}>
          <Text style={styles.rowLabel}>{check.label}</Text>
          <Text style={styles.rowValue}>
            Required {check.required} · Yours {check.actual} {check.ok ? '✓' : '✗'}
          </Text>
        </View>
      ))}

      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={styles.retryText}>
          {result.correct ? 'Practice again' : 'Try again'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  correct: { backgroundColor: '#EAF7EE', borderColor: '#B9E6C4' },
  incorrect: { backgroundColor: '#FDEEEE', borderColor: '#F3C3C3' },
  status: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  statusCorrect: { color: '#1E8E4C' },
  statusIncorrect: { color: '#C24444' },
  row: { marginBottom: 5 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#6B6B78' },
  rowValue: { fontSize: 12, color: '#3A3A46', marginTop: 1 },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#2E7DAF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
