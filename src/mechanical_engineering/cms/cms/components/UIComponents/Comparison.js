import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Comparison = ({ title = '', left = {}, right = {} }) => {
  const maxRows = Math.max(
    (left.points || []).length,
    (right.points || []).length
  )

  return (
    <View style={styles.wrapper}>
      {/* Optional title */}
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      {/* Column headers */}
      <View style={styles.headerRow}>
        <View style={[styles.headerCell, styles.headerLeft]}>
          <Text style={styles.headerText}>{left.label || 'Option A'}</Text>
        </View>
        <View style={[styles.headerCell, styles.headerRight]}>
          <Text style={styles.headerText}>{right.label || 'Option B'}</Text>
        </View>
      </View>

      {/* Rows */}
      {Array.from({ length: maxRows }).map((_, i) => {
        const lText = (left.points  || [])[i] || ''
        const rText = (right.points || [])[i] || ''
        const isEven = i % 2 === 0
        return (
          <View
            key={i}
            style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}
          >
            {/* Left point */}
            <View style={styles.cell}>
              {lText ? (
                <View style={styles.pointRow}>
                  <View style={[styles.dot, styles.dotLeft]} />
                  <Text style={[styles.pointText, styles.pointLeft]}>{lText}</Text>
                </View>
              ) : null}
            </View>

            {/* Centre divider */}
            <View style={styles.centreDivider} />

            {/* Right point */}
            <View style={styles.cell}>
              {rText ? (
                <View style={styles.pointRow}>
                  <View style={[styles.dot, styles.dotRight]} />
                  <Text style={[styles.pointText, styles.pointRight]}>{rText}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default Comparison

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
  },
  titleRow: {
    backgroundColor: '#F5F5FB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8E8',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.3,
  },
  headerRow: {
    flexDirection: 'row',
  },
  headerCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerLeft: {
    backgroundColor: '#3949AB',
    borderRightWidth: 1,
    borderRightColor: '#303F9F',
  },
  headerRight: {
    backgroundColor: '#00838F',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EBEBF5',
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd:  { backgroundColor: '#F8F8FD' },
  cell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  centreDivider: {
    width: 1,
    backgroundColor: '#D8D8E8',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    marginRight: 6,
    flexShrink: 0,
  },
  dotLeft:  { backgroundColor: '#3949AB' },
  dotRight: { backgroundColor: '#00838F' },
  pointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#333',
  },
  pointLeft:  { color: '#1A237E' },
  pointRight: { color: '#004D40' },
})