import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

export default function SimpleSlider({ label, value, min = 0, max = 100, unit = '', onChange, accentColor = '#3b82f6', format }) {
  const [trackWidth, setTrackWidth] = useState(1);
  const trackRef = useRef(null);

  const valueFromX = (x) => {
    const t = Math.max(0, Math.min(1, x / trackWidth));
    return min + (max - min) * t;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        onChange?.(valueFromX(evt.nativeEvent.locationX));
      },
      onPanResponderGrant: (evt) => {
        onChange?.(valueFromX(evt.nativeEvent.locationX));
      },
    })
  ).current;

  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const displayValue = format ? format(value) : Math.round(value * 100) / 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {displayValue} <Text style={styles.unit}>{unit}</Text>
        </Text>
      </View>
      <View
        ref={trackRef}
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${t * 100}%`, backgroundColor: accentColor }]} />
        <View style={[styles.thumb, { left: `${t * 100}%`, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#9aa0aa', fontSize: 11, letterSpacing: 0.5 },
  value: { color: '#e8eaed', fontSize: 13, fontWeight: '700' },
  unit: { color: '#9aa0aa', fontSize: 11, fontWeight: '400' },
  track: { height: 4, backgroundColor: '#2b2f36', borderRadius: 2, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: '#0f1114',
  },
});
