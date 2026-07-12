import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Data shape:
// { type: "spec_card", title: "E7018 Electrode Specifications", icon: "📏",
//   specs: [
//     { group: "Classification",  rows: [
//       { label: "AWS Code",        value: "E7018"       },
//       { label: "Coating Type",    value: "Low Hydrogen + Iron Powder" },
//     ]},
//     { group: "Electrical",  rows: [
//       { label: "Current",         value: "DC+ only"    },
//       { label: "OCV Required",    value: "≥ 70V"       },
//     ]},
//   ]
// }

const SpecCard = ({ title = '', icon = '', specs = [] }) => (
  <View style={styles.wrapper}>
    {/* Header */}
    <View style={styles.header}>
      {icon ? <Text style={styles.headerIcon}>{icon}</Text> : null}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>

    {/* Spec groups */}
    {specs.map((group, gi) => (
      <View key={gi}>
        {/* Group label */}
        <View style={styles.groupRow}>
          <Text style={styles.groupLabel}>{group.group}</Text>
        </View>

        {/* Rows */}
        {group.rows.map((row, ri) => {
          const isEven = ri % 2 === 0
          return (
            <View key={ri} style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          )
        })}
      </View>
    ))}
  </View>
)

export default SpecCard

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A237E',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 19,
  },
  groupRow: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#C5CAE9',
    borderBottomWidth: 1,
    borderBottomColor: '#C5CAE9',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3949AB',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd:  { backgroundColor: '#F8F8FD' },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 8,
  },
})