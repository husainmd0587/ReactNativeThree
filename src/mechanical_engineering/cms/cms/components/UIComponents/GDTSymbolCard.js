import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GDTSymbolCard = ({
  symbol, name, categoryColor = '#2563EB', requiresDatum,
  deprecated, isKeySymbol, description, tolerance, application,
  example, datumNote, details = [], relatedSymbols = [],
}) => (
  <View style={[styles.card, deprecated && styles.deprecated]}>
    <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <View style={[styles.symbolBox, { borderColor: categoryColor + '55' }]}>
          <Text style={[styles.symbolGlyph, { color: categoryColor }]}>{symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{name}</Text>
            {isKeySymbol && <View style={styles.keyBadge}><Text style={styles.keyText}>★ Key</Text></View>}
            {deprecated && <View style={styles.depBadge}><Text style={styles.depText}>Deprecated</Text></View>}
          </View>
          <Text style={styles.meta}>
            Datum: <Text style={{ color: requiresDatum ? '#CA8A04' : '#6B7280', fontWeight: '600' }}>
              {requiresDatum ? 'Required' : 'Not required'}
            </Text>
          </Text>
        </View>
      </View>

      <Text style={styles.desc}>{description}</Text>

      <View style={styles.fcf}><Text style={styles.fcfText}>{example}</Text></View>

      <View style={styles.specTable}>
        <SpecRow label="Tolerance Type" value={tolerance} />
        <SpecRow label="Application" value={application} />
        <SpecRow label="Datum Ref." value={datumNote} />
      </View>

      {details.length > 0 && (
        <View style={styles.detailsBlock}>
          {details.map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <View style={[styles.bullet, { backgroundColor: categoryColor }]} />
              <Text style={styles.detailText}>{d}</Text>
            </View>
          ))}
        </View>
      )}

      {relatedSymbols.length > 0 && (
        <View style={styles.relatedRow}>
          {relatedSymbols.map((r) => (
            <View key={r} style={styles.relatedChip}><Text style={styles.relatedText}>{r}</Text></View>
          ))}
        </View>
      )}
    </View>
  </View>
);

const SpecRow = ({ label, value }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#e7eaeb', borderRadius: 12, borderWidth: 1, borderColor: '#b9b9b9', overflow: 'hidden', marginVertical: 6 },
  deprecated: { opacity: 0.75, borderStyle: 'dashed' },
  accentBar: { height: 3, width: '100%' },
  body: { padding: 14 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  symbolBox: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  symbolGlyph: { fontSize: 26, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  keyBadge: { backgroundColor: '#CA8A0422', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  keyText: { fontSize: 10, color: '#CA8A04', fontWeight: '700' },
  depBadge: { backgroundColor: '#DC262622', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  depText: { fontSize: 10, color: '#DC2626', fontWeight: '600' },
  meta: { fontSize: 11, color: '#6B7280' },
  desc: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 10 },
  fcf: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#b9b9b9', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 10 },
  fcfText: { fontSize: 16, color: '#2563EB', fontWeight: '700', letterSpacing: 1 },
  specTable: { borderWidth: 1, borderColor: '#b9b9b9', borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
  specRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#b9b9b9' },
  specLabel: { fontSize: 11, color: '#6B7280', width: 110 },
  specValue: { fontSize: 11, color: '#374151', flex: 1, fontWeight: '500' },
  detailsBlock: { marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  detailText: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 17 },
  relatedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  relatedChip: { borderWidth: 1, borderColor: '#b9b9b9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  relatedText: { fontSize: 11, color: '#374151' },
});

export default GDTSymbolCard;