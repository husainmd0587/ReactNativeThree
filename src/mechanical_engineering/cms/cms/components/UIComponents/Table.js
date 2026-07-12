import { StyleSheet, Text, View, ScrollView } from 'react-native'
import React, { useMemo } from 'react'

const CHAR_WIDTH = 7   // approx px per character at fontSize 12
const MIN_COL = 60
const MAX_COL = 200
const H_PADDING = 24     // paddingHorizontal * 2

const Table = ({ headers = [], rows = [] }) => {
  const colWidths = useMemo(() => {
    return headers.map((h, ci) => {
      const maxChars = Math.max(
        h.length,
        ...rows.map(row => (row[ci] ?? '').length)
      )
      const computed = maxChars * CHAR_WIDTH + H_PADDING
      return Math.min(MAX_COL, Math.max(MIN_COL, computed))
    })
  }, [headers, rows])

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outerScroll}>
      <View style={styles.table}>

        {/* Header Row */}
        <View style={styles.headerRow}>
          {headers.map((h, i) => (
            <View key={i} style={[styles.headerCell, { width: colWidths[i] }]}>
              <Text style={styles.headerText}>{h}</Text>
            </View>
          ))}
        </View>

        {/* Data Rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.row, ri % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.cell, { width: colWidths[ci] }]}>
                <Text style={[styles.cellText, ci === 0 && styles.firstCellText]}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}

      </View>
    </ScrollView>
  )
}

export default Table

const styles = StyleSheet.create({
  outerScroll: {
    marginVertical: 5,
    borderRadius: 10,
  },
  table: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d4d4d6',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#E8EAF6',
  },
  headerCell: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#C5C7D8',
    justifyContent: 'center',
  },
  headerText: {
    color: '#3949AB',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#bebef8',
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd:  { backgroundColor: '#F5F5FB' },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: '#fabbd5',
    justifyContent: 'center',
  },
  cellText: {
    color: '#444466',
    fontSize: 12,
    lineHeight: 15,
  },
  firstCellText: {
    color: '#1A1A3A',
    fontWeight: '600',
  },
})