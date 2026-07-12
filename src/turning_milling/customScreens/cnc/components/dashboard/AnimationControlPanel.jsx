import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SimpleSlider from './SimpleSlider';

export default function AnimationControlPanel({
  spindleSpeed,
  onChangeSpindleSpeed,
  feedRate,
  onChangeFeedRate,
  simSpeedPercent,
  onChangeSimSpeedPercent,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>ANIMATION CONTROL</Text>
      <SimpleSlider
        label="SPINDLE SPEED"
        value={spindleSpeed}
        min={0}
        max={3000}
        unit="RPM"
        accentColor="#f5a524"
        format={(v) => Math.round(v)}
        onChange={onChangeSpindleSpeed}
      />
      <SimpleSlider
        label="FEED RATE"
        value={feedRate}
        min={0.05}
        max={0.5}
        unit="mm/rev"
        accentColor="#4ade80"
        format={(v) => v.toFixed(2)}
        onChange={onChangeFeedRate}
      />
      <SimpleSlider
        label="SIMULATION SPEED"
        value={simSpeedPercent}
        min={10}
        max={400}
        unit="%"
        accentColor="#5aa8ff"
        format={(v) => Math.round(v)}
        onChange={onChangeSimSpeedPercent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#15171b', borderRadius: 10, padding: 12 },
  title: { color: '#8a919c', fontSize: 10, letterSpacing: 0.5, fontWeight: '700', marginBottom: 4 },
});
