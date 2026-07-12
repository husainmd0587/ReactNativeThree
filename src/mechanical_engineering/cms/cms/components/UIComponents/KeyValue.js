import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const KeyValue = ({ title = '', items = [] }) => {
  return (
    <View style={styles.wrapper}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      {items.map((item, i) => {
        const isEven = i % 2 === 0
        return (
          <View
            key={i}
            style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}
          >
            <View style={styles.keyCell}>
              <Text style={styles.keyText}>{item.key}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.valueCell}>
              <Text style={styles.valueText}>{item.value}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default KeyValue

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
  },
  titleRow: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#C5CAE9',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949AB',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    minHeight: 38,
    alignItems: 'stretch',
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd:  { backgroundColor: '#F5F5FB' },
  keyCell: {
    width: 130,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A237E',
    lineHeight: 16,
  },
  divider: {
    width: 1,
    backgroundColor: '#D8D8E8',
  },
  valueCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 17,
  },
})