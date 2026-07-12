import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'

// Data shape:
// { type: "badge_row", badges: [
//   { label: "Difficulty", value: "Intermediate", color: "amber" },
//   { label: "Duration",   value: "45 min",       color: "blue"  },
//   { label: "Process",    value: "SMAW",          color: "purple"},
//   { label: "Standard",   value: "AWS D1.1",      color: "green" },
// ]}

const COLOR_MAP = {
  blue:   { bg: '#E8EAF6', text: '#1A237E', border: '#C5CAE9' },
  green:  { bg: '#E8F5E9', text: '#1B5E20', border: '#C8E6C9' },
  amber:  { bg: '#FFFDE7', text: '#E65100', border: '#FFE082' },
  red:    { bg: '#FFEBEE', text: '#B71C1C', border: '#FFCDD2' },
  purple: { bg: '#F3E5F5', text: '#4A148C', border: '#CE93D8' },
  teal:   { bg: '#E0F7FA', text: '#006064', border: '#80DEEA' },
  grey:   { bg: '#F5F5F5', text: '#333',    border: '#E0E0E0' },
}

const Badge = ({ label, value, color = 'grey' }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.grey
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      {label ? <Text style={styles.badgeLabel}>{label}</Text> : null}
      <Text style={[styles.badgeValue, { color: c.text }]}>{value}</Text>
    </View>
  )
}

const BadgeRow = ({ badges = [], title = '' }) => {
  return (
    <View style={styles.wrapper}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {badges.map((b, i) => (
          <Badge key={i} label={b.label} value={b.value} color={b.color} />
        ))}
      </ScrollView>
    </View>
  )
}

export default BadgeRow

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
})