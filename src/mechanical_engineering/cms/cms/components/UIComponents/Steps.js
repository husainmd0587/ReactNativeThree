import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Steps = ({ title = '', steps = [] }) => {
  return (
    <View style={styles.wrapper}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1
          return (
            <View key={i} style={styles.stepRow}>
              {/* Left — number + connector line */}
              <View style={styles.left}>
                <View style={styles.circle}>
                  <Text style={styles.circleText}>{s.step}</Text>
                </View>
                {!isLast && <View style={styles.connector} />}
              </View>

              {/* Right — step text */}
              <View style={[styles.right, isLast && styles.rightLast]}>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default Steps

const CIRCLE = 30

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
    backgroundColor: '#FFFFFF',
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
  list: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  left: {
    alignItems: 'center',
    width: CIRCLE,
    marginRight: 12,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: '#3949AB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 14,
    backgroundColor: '#C5CAE9',
    marginVertical: 2,
  },
  right: {
    flex: 1,
    paddingBottom: 14,
    paddingTop: 4,
  },
  rightLast: {
    paddingBottom: 12,
  },
  stepText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
  },
})