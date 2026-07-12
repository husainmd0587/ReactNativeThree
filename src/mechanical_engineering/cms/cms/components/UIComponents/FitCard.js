import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Expandable fit-type card (clearance / transition / interference)
const FitCard = ({ title, emoji, color = '#00D4FF', description, shaftRange, holeRange, uses = [] }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={[styles.card, { borderColor: color + '50' }]} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={[styles.emojiBg, { backgroundColor: color + '20' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.type, { color }]}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>
        </View>
        <Text style={[styles.chevron, { color }]}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <View style={styles.details}>
          <View style={styles.divider} />
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Shaft Tolerance</Text>
            <Text style={[styles.kvValue, { color }]}>{shaftRange}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Hole Tolerance</Text>
            <Text style={[styles.kvValue, { color }]}>{holeRange}</Text>
          </View>
          <Text style={styles.usesLabel}>Common Uses:</Text>
          {uses.map((u, i) => (
            <Text key={i} style={styles.use}>• {u}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1A2235', borderRadius: 14, marginBottom: 10, borderWidth: 1.5, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  emojiBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  type: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  desc: { fontSize: 11.5, color: '#8B9BB4', lineHeight: 17 },
  chevron: { fontSize: 12, fontWeight: '700' },
  details: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: '#1E2D45', marginBottom: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  kvLabel: { fontSize: 12, color: '#4B5A72' },
  kvValue: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  usesLabel: { fontSize: 11, fontWeight: '700', color: '#4B5A72', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
  use: { fontSize: 12, color: '#8B9BB4', marginBottom: 3, paddingLeft: 4 },
});

export default FitCard;