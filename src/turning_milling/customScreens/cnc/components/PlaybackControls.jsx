import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SPEEDS = [0.5, 1, 2, 4];

export default function PlaybackControls({
  playing,
  onTogglePlay,
  onStepBack,
  onStepForward,
  passIndex,
  passCount,
  speed,
  onChangeSpeed,
  currentMove,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          Pass {Math.min(passIndex + 1, passCount)}/{passCount}
          {currentMove ? `  ·  ${currentMove.cycle.toUpperCase()}  ·  F${currentMove.feed?.toFixed(2)}  ·  S${currentMove.spindleSpeed ?? 0}rpm  ·  T${currentMove.toolNumber ?? 0}` : ''}
        </Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={onStepBack}>
          <Text style={styles.btnText}>⏮ Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.playBtn]} onPress={onTogglePlay}>
          <Text style={styles.btnText}>{playing ? '⏸ Pause' : '▶ Play'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={onStepForward}>
          <Text style={styles.btnText}>Next ⏭</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {SPEEDS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
            onPress={() => onChangeSpeed(s)}
          >
            <Text style={[styles.btnText, speed === s && styles.speedTextActive]}>{s}x</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 10, backgroundColor: '#1a1d22', borderTopWidth: 1, borderTopColor: '#333' },
  hud: { marginBottom: 8 },
  hudText: { color: '#9fe870', fontSize: 12, fontFamily: 'monospace' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  btn: { flex: 1, marginHorizontal: 4, paddingVertical: 10, backgroundColor: '#2b2f36', borderRadius: 8, alignItems: 'center' },
  playBtn: { backgroundColor: '#3a5f3a' },
  btnText: { color: '#fff', fontWeight: '600' },
  speedBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 6, backgroundColor: '#2b2f36', borderRadius: 6, alignItems: 'center' },
  speedBtnActive: { backgroundColor: '#4a7fd6' },
  speedText: { color: '#fff' },
  speedTextActive: { color: '#fff', fontWeight: '700' },
});
