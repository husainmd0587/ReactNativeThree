import React, { useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Animated } from 'react-native'

// Data shape:
// { type: "progress_bar", title: "Section Completion", items: [
//   { label: "Introduction",       value: 100, color: "#2E7D32" },
//   { label: "Welding Processes",  value: 80,  color: "#3949AB" },
//   { label: "Equipment",          value: 60,  color: "#3949AB" },
//   { label: "Safety",             value: 0,   color: "#3949AB" },
// ]}

const BAR_HEIGHT = 10

const BarItem = ({ label, value = 0, color = '#3949AB' }) => {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 600,
      useNativeDriver: false,
    }).start()
  }, [value])

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  })

  return (
    <View style={styles.item}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.pct, { color }]}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const ProgressBar = ({ title = '', items = [] }) => {
  return (
    <View style={styles.wrapper}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.list}>
        {items.map((item, i) => (
          <BarItem key={i} label={item.label} value={item.value} color={item.color} />
        ))}
      </View>
    </View>
  )
}

export default ProgressBar

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
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
    paddingVertical: 10,
    gap: 12,
  },
  item: {
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  pct: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: '#EBEBF5',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
})