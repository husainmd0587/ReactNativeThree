import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TopBar({
  title = 'CNC Simulator',
  subtitle = '',
  onBack,
  onGCode,
  onView,
  onSettings,
  gcodeActive,
  viewActive,
  settingsActive,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.headerRight}>
        <IconButton icon="</>" label="G-Code" onPress={onGCode} active={gcodeActive} />
        <IconButton icon="◎" label="View" onPress={onView} active={viewActive} />
        <IconButton icon="⚙" label="Settings" onPress={onSettings} active={settingsActive} />
      </View>
    </View>
  );
}

function IconButton({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress}>
      <Text style={[styles.iconGlyph, active && styles.iconGlyphActive]}>{icon}</Text>
      <Text style={[styles.iconLabel, active && styles.iconLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0e1013',
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#22252b',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10, padding: 4 },
  backArrow: { color: '#e8eaed', fontSize: 18 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  subtitle: { color: '#8a919c', fontSize: 10 },
  headerRight: { flexDirection: 'row' },
  iconBtn: { alignItems: 'center', marginLeft: 14 },
  iconGlyph: { color: '#8a919c', fontSize: 14 },
  iconGlyphActive: { color: '#5aa8ff' },
  iconLabel: { color: '#6b7178', fontSize: 8, marginTop: 2 },
  iconLabelActive: { color: '#5aa8ff', fontWeight: '700' },
});
