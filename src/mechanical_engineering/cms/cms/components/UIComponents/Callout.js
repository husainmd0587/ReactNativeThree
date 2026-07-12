import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Data shape:
// { type: "callout", term: "Heat Affected Zone (HAZ)", definition: "Area of base metal...", example: "In a 10mm steel plate..." }

const VARIANT_STYLES = {
  default: { border: '#C5CAE9', bg: '#E8EAF6', termColor: '#1A237E', iconBg: '#3949AB' },
  warning: { border: '#FFE082', bg: '#FFFDE7', termColor: '#E65100', iconBg: '#F57F17' },
  danger:  { border: '#FFCDD2', bg: '#FFEBEE', termColor: '#B71C1C', iconBg: '#C62828' },
  success: { border: '#C8E6C9', bg: '#E8F5E9', termColor: '#1B5E20', iconBg: '#2E7D32' },
}

const Callout = ({ term = '', definition = '', example = '', variant = 'default' }) => {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  return (
    <View style={[styles.wrapper, { borderColor: v.border, backgroundColor: v.bg }]}>
      {/* Term header */}
      <View style={[styles.termRow, { borderBottomColor: v.border }]}>
        <View style={[styles.iconBadge, { backgroundColor: v.iconBg }]}>
          <Text style={styles.iconText}>📌</Text>
        </View>
        <Text style={[styles.term, { color: v.termColor }]}>{term}</Text>
      </View>

      {/* Definition */}
      <Text style={styles.definition}>{definition}</Text>

      {/* Example — optional */}
      {example ? (
        <View style={[styles.exampleBox, { borderLeftColor: v.iconBg }]}>
          <Text style={styles.exampleLabel}>Example</Text>
          <Text style={styles.exampleText}>{example}</Text>
        </View>
      ) : null}
    </View>
  )
}

export default Callout

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 13,
  },
  term: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  definition: {
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  exampleBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  exampleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  exampleText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 17,
    fontStyle: 'italic',
  },
})