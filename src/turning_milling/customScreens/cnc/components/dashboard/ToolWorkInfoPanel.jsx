import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ToolWorkInfoPanel({ toolNumber = 1, toolType = 'CNMG 120408', material = 'Aluminum', stockConfig }) {
  const workSize = stockConfig ? `Ø${stockConfig.stockDiameter} x ${stockConfig.stockLength} mm` : '—';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>TOOL & WORK INFO</Text>

      <InfoRow icon="🔧" label="TOOL" value={`T${String(toolNumber).padStart(2, '0')}01`} />
      <InfoRow icon="◆" label="TOOL TYPE" value={toolType} />
      <InfoRow icon="▦" label="MATERIAL" value={material} />
      <InfoRow icon="⬤" label="WORK SIZE" value={workSize} />
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#15171b', borderRadius: 10, padding: 12 },
  title: { color: '#8a919c', fontSize: 10, letterSpacing: 0.5, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { fontSize: 16, width: 28, color: '#c7ccd4' },
  label: { color: '#6b7178', fontSize: 9, letterSpacing: 0.5 },
  value: { color: '#e8eaed', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
