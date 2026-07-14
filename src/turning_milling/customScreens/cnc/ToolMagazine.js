import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { TOOL_STATIONS } from './toolLibrary';

/**
 * ToolMagazine
 *
 * Read-only reference screen listing every station in the turret with its tool
 * data - the kind of "tool offset / tool table" page a real CNC control shows.
 *
 * Props:
 *  - activeStation?: number - highlights the currently-loaded station if known
 *  - onBack: () => void
 */
export default function ToolMagazine({ activeStation, onBack }) {
  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Tool Magazine</Text>
          <Text style={styles.subtitle}>{TOOL_STATIONS.length}-station turret</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {TOOL_STATIONS.map((tool) => {
          const isActive = tool.station === activeStation;
          return (
            <View key={tool.station} style={[styles.card, isActive && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View style={[styles.stationBadge, isActive && styles.stationBadgeActive]}>
                  <Text style={[styles.stationNum, isActive && styles.stationNumActive]}>{tool.station}</Text>
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolNumber}>{tool.toolNumber}</Text>
                </View>
                {isActive ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>LOADED</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.specGrid}>
                <Spec label="Type" value={tool.type} />
                <Spec label="Insert" value={tool.insert} />
                <Spec label="Insert Shape" value={tool.insertShape} />
                <Spec label="Material" value={tool.material} />
                <Spec label="Nose Radius" value={tool.noseRadius} />
                <Spec label="Lead Angle" value={tool.leadAngle} />
                <Spec label="Max DOC" value={tool.maxDepthOfCut} />
              </View>

              <Text style={styles.notes}>{tool.notes}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Spec({ label, value }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
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
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  subtitle: { color: '#6b7178', fontSize: 10, marginTop: 1 },
  list: { padding: 10 },
  card: {
    backgroundColor: '#15171b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22252b',
    padding: 12,
    marginBottom: 10,
  },
  cardActive: { borderColor: '#f5a524' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stationBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1c2027',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stationBadgeActive: { backgroundColor: '#f5a524' },
  stationNum: { color: '#c7ccd4', fontSize: 13, fontWeight: '700' },
  stationNumActive: { color: '#0b0c0e' },
  cardHeaderText: { flex: 1 },
  toolName: { color: '#e8eaed', fontSize: 13, fontWeight: '700' },
  toolNumber: { color: '#5aa8ff', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  activePill: { backgroundColor: '#3a2a00', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  activePillText: { color: '#f5a524', fontSize: 8, fontWeight: '700' },
  specGrid: { borderTopWidth: 1, borderTopColor: '#1c1f24', paddingTop: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  specLabel: { color: '#6b7178', fontSize: 10 },
  specValue: { color: '#b8bcc4', fontSize: 10, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 10 },
  notes: { color: '#5a606a', fontSize: 10, fontStyle: 'italic', marginTop: 8, lineHeight: 14 },
});
