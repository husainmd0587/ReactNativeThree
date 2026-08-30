import React from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSettings } from '../state/SettingsContext';

// A fixed preset palette rather than a full color-picker library — keeps
// this dependency-free and matches the project's "don't add a new
// dependency without a clear technical need" rule. Small enough (24px)
// that all 10 fit on one row, Word/PowerPoint-ribbon style, instead of
// wrapping into a big block grid.
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

function Swatch({ color, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} hitSlop={4}>
      <View style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]} />
    </TouchableOpacity>
  );
}

// One compact single-row strip per setting — the ribbon itself scrolls
// horizontally if a screen is ever too narrow for all 10, but at 24px
// swatches it fits without wrapping on a normal phone width.
function ColorRibbon({ label, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.ribbon}>
          {PALETTE.map((color) => (
            <Swatch key={color} color={color} selected={value === color} onPress={() => onChange(color)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Reads straight from the live `settings` object passed in — there's no
// separate preview state to keep in sync, so every tap on a swatch above
// updates this immediately, the same render pass. That's the actual fix
// for "show it in real time": the preview isn't a snapshot, it's just
// another consumer of the same settings the canvas itself uses.
function LivePreview({ settings }) {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewLabel}>PREVIEW</Text>
      <View style={[styles.previewCanvas, { backgroundColor: settings.canvasBackground }]}>
        <View style={[styles.previewShape, { borderColor: settings.shapeColor }]} />
        <View style={[styles.previewSelected, { borderColor: settings.selectedColor }]} />
        <View style={[styles.previewDimLine, { backgroundColor: settings.dimensionColor }]} />
        <View style={styles.previewCrosshair} pointerEvents="none">
          <View style={[styles.crosshairArmH, { backgroundColor: settings.crosshairColor }]} />
          <View style={[styles.crosshairArmV, { backgroundColor: settings.crosshairColor }]} />
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LivePreview settings={settings} />

        {FIELDS.map((field) => (
          <ColorRibbon
            key={field.key}
            label={field.label}
            value={settings[field.key]}
            onChange={(color) => updateSetting(field.key, color)}
          />
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

  previewSection: { marginBottom: 22 },
  previewLabel: {
    fontSize: 10, fontWeight: '700', color: '#AAAAAA', letterSpacing: 1.2, marginBottom: 8,
  },
  previewCanvas: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    overflow: 'hidden',
  },
  previewShape: {
    position: 'absolute',
    left: 20,
    top: 24,
    width: 64,
    height: 40,
    borderWidth: 2,
    borderRadius: 3,
  },
  previewSelected: {
    position: 'absolute',
    left: 60,
    top: 44,
    width: 44,
    height: 32,
    borderWidth: 2,
    borderRadius: 3,
  },
  previewDimLine: {
    position: 'absolute',
    left: 20,
    top: 78,
    width: 84,
    height: 2,
    borderRadius: 1,
  },
  previewCrosshair: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 18,
    height: 18,
  },
  crosshairArmH: {
    position: 'absolute', left: 0, top: 8, width: 18, height: 1.5,
  },
  crosshairArmV: {
    position: 'absolute', left: 8, top: 0, width: 1.5, height: 18,
  },

  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B78', marginBottom: 8 },
  ribbon: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F7F7F9',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: '#EDEDF1',
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E6F0',
  },
  swatchSelected: { borderWidth: 2, borderColor: '#1A1A2E' },

  resetBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E6F0',
  },
  resetText: { fontSize: 12, fontWeight: '700', color: '#2E7DAF' },
});
