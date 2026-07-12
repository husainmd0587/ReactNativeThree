import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ModifierCard = ({ symbol, name, short, description, color = '#2563EB' }) => (
  <View style={styles.card}>
    <View style={[styles.symBox, { borderColor: color + '66' }]}>
      <Text style={[styles.sym, { color }]}>{symbol}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.short, { color }]}>{short}</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#e7eaeb', borderRadius: 10, borderWidth: 1, borderColor: '#b9b9b9', padding: 14, gap: 14, alignItems: 'flex-start', marginVertical: 5 },
  symBox: { width: 52, height: 52, borderRadius: 10, borderWidth: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sym: { fontSize: 22, fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  short: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 12, color: '#374151', lineHeight: 17 },
});

export default ModifierCard;