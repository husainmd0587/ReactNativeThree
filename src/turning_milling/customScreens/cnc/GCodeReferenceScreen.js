import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { G_CODES, M_CODES, ADDRESS_WORDS } from './gcodeReference';

const SECTIONS = [
  { key: 'G', title: 'G-Codes', data: G_CODES, accent: '#5aa8ff' },
  { key: 'M', title: 'M-Codes', data: M_CODES, accent: '#c084fc' },
  { key: 'ADDR', title: 'Address Words', data: ADDRESS_WORDS, accent: '#4ade80' },
];

/**
 * GCodeReference
 *
 * Read-only reference screen listing every G-code, M-code, and address word the
 * simulator's interpreter actually understands. Sourced directly from
 * gcodeReference.js, so it can't silently drift out of sync with what
 * latheInterpreter.js supports - if you add a code there, add it to
 * gcodeReference.js and it shows up here automatically.
 *
 * Props:
 *  - onBack: () => void
 */
export default function GCodeReference({ onBack }) {
  const [activeSection, setActiveSection] = useState('G');
  const section = SECTIONS.find((s) => s.key === activeSection);

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Supported G-Code / M-Code</Text>
          <Text style={styles.subtitle}>What this simulator's interpreter understands</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {SECTIONS.map((s) => {
          const active = s.key === activeSection;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.tab, active && { borderBottomColor: s.accent, backgroundColor: '#15171b' }]}
              onPress={() => setActiveSection(s.key)}
            >
              <Text style={[styles.tabText, active && { color: s.accent }]}>{s.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {section.data.map((item) => (
          <View key={item.code} style={styles.row}>
            <Text style={[styles.code, { color: section.accent }]}>{item.code}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        ))}

        {activeSection === 'G' ? (
          <Text style={styles.footnote}>
            Canned cycles (G70-G76) use standard P/Q block references. See the editor's live linter for real-time
            validation of these when writing a program.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0b0c0e' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1013',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#22252b',
  },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { color: '#e8eaed', fontSize: 18 },
  titleWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#6b7178', fontSize: 10, marginTop: 1 },
  tabRow: { flexDirection: 'row', backgroundColor: '#0e1013', borderBottomWidth: 1, borderBottomColor: '#22252b' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: '#6b7178', fontSize: 11, fontWeight: '700' },
  list: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1f24',
  },
  code: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace', width: 56 },
  desc: { color: '#b8bcc4', fontSize: 12, flex: 1 },
  footnote: { color: '#5a606a', fontSize: 10, fontStyle: 'italic', marginTop: 12, lineHeight: 15 },
});
