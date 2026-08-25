import React from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSettings } from '../state/SettingsContext';

// A fixed preset palette rather than a full color-picker library — keeps
// this dependency-free and matches the project's "don't add a new
// dependency without a clear technical need" rule.
const PALETTE = [
  '#2E7DAF', '#E0524C', '#1D9E75', '#F0A93E',
  '#7A5CD6', '#1A1A2E', '#8A8A9A', '#4A4A55',
  '#FBFBFD', '#FFFFFF',
];

const FIELDS = [
  { key: 'canvasBackground', label: 'Canvas background' },
  { key: 'shapeColor', label: 'Shape / line color' },
  { key: 'selectedColor', label: 'Selected shape color' },
  { key: 'dimensionColor', label: 'Dimension line color' },
  { key: 'crosshairColor', label: 'Crosshair color' },
];

export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.section}>
            <Text style={styles.label}>{field.label}</Text>
            <View style={styles.swatchRow}>
              {PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => updateSetting(field.key, color)}
                  activeOpacity={0.8}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    settings[field.key] === color && styles.swatchSelected,
                  ]}
                />
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.resetBtn} onPress={resetSettings} activeOpacity={0.8}>
          <Text style={styles.resetText}>Reset to defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E8E6F0',
  },
  swatchSelected: { borderWidth: 3, borderColor: '#1A1A2E' },
  resetBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E6F0',
  },
  resetText: { fontSize: 12, fontWeight: '700', color: '#2E7DAF' },
});
