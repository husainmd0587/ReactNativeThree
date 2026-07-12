import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Categorized symbol glossary entry — e.g. "GD&T · ⊕ · True Position"
const SymbolGlossaryCard = ({ category, symbol, title, about, color = '#5BA3E8' }) => (
  <View style={styles.card}>
    <View style={[styles.symbolBox, { backgroundColor: color + '20' }]}>
      <Text style={[styles.symbolText, { color }]}>{symbol}</Text>
    </View>
    <View style={{ flex: 1 }}>
      {category ? (
        <View style={[styles.tag, { backgroundColor: color + '20' }]}>
          <Text style={[styles.tagText, { color }]}>{category}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.about}>{about}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#181C27', borderRadius: 14, borderWidth: 0.5, borderColor: '#2A2D3A', padding: 14, marginBottom: 10, gap: 12 },
  symbolBox: { width: 58, height: 58, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  symbolText: { fontSize: 18, fontWeight: '500', fontFamily: 'monospace', textAlign: 'center' },
  tag: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  tagText: { fontSize: 10, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '600', color: '#EAEAEA', marginBottom: 4 },
  about: { fontSize: 12, lineHeight: 19, color: '#888' },
});

export default SymbolGlossaryCard;