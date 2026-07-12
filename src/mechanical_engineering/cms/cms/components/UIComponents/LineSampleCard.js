import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Renders a line-type swatch: symbol glyph + title + description
const LineSampleCard = ({ symbol, title, desc, color = '#2563EB' }) => (
  <View style={styles.card}>
    <View style={[styles.symbolBox, { backgroundColor: color + '15' }]}>
      <Text style={[styles.symbol, { color }]}>{symbol}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#e7eaeb', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#b9b9b9' },
  symbolBox: { width: 72, height: 72, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  symbol: { fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 13, lineHeight: 19, color: '#374151' },
});

export default LineSampleCard;