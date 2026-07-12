import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Formula = ({ expression = '', variables = [] }) => {
  return (
    <View style={styles.wrapper}>
      {/* Expression box */}
      <View style={styles.exprBox}>
        <Text style={styles.exprText}>{expression}</Text>
      </View>

      {/* Variables */}
      {variables.length > 0 && (
        <View style={styles.varList}>
          {variables.map((v, i) => (
            <View key={i} style={styles.varRow}>
              <Text style={styles.symbol}>{v.symbol}</Text>
              <Text style={styles.equals}>=</Text>
              <Text style={styles.meaning}>{v.meaning}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default Formula

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  exprBox: {
    backgroundColor: '#E8EAF6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#C5CAE9',
  },
  exprText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A237E',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  varList: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  varRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F8',
  },
  symbol: {
    width: 52,
    fontSize: 13,
    fontWeight: '700',
    color: '#3949AB',
    fontFamily: 'monospace',
  },
  equals: {
    width: 18,
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  meaning: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    lineHeight: 17,
  },
})