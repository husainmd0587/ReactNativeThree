import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Data shape:
// { type: "timeline", title: "History of Welding", items: [
//   { year: "1800",    event: "Sir Humphry Davy demonstrates the electric arc",  highlight: false },
//   { year: "1904",    event: "Oscar Kjellberg invents the coated electrode",     highlight: true  },
//   { year: "1948",    event: "MIG (GMAW) welding developed at Battelle",         highlight: false },
// ]}

const TimelineItem = ({ year, event, highlight = false, isLast = false }) => (
  <View style={styles.item}>
    {/* Left col — year + line */}
    <View style={styles.left}>
      <View style={[styles.yearBadge, highlight && styles.yearBadgeHL]}>
        <Text style={[styles.yearText, highlight && styles.yearTextHL]}>{year}</Text>
      </View>
      {!isLast && <View style={styles.connector} />}
    </View>

    {/* Right col — event */}
    <View style={[styles.right, isLast && styles.rightLast, highlight && styles.rightHL]}>
      <Text style={[styles.eventText, highlight && styles.eventTextHL]}>{event}</Text>
    </View>
  </View>
)

const Timeline = ({ title = '', items = [] }) => (
  <View style={styles.wrapper}>
    {title ? (
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
      </View>
    ) : null}
    <View style={styles.list}>
      {items.map((item, i) => (
        <TimelineItem
          key={i}
          year={item.year}
          event={item.event}
          highlight={item.highlight}
          isLast={i === items.length - 1}
        />
      ))}
    </View>
  </View>
)

export default Timeline

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
    paddingTop: 14,
    paddingBottom: 4,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Left — year + line
  left: {
    alignItems: 'center',
    width: 60,
    marginRight: 12,
  },
  yearBadge: {
    backgroundColor: '#E8EAF6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C5CAE9',
    minWidth: 52,
    alignItems: 'center',
  },
  yearBadgeHL: {
    backgroundColor: '#3949AB',
    borderColor: '#3949AB',
  },
  yearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3949AB',
  },
  yearTextHL: {
    color: '#FFFFFF',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: '#C5CAE9',
    marginVertical: 3,
  },

  // Right — event
  right: {
    flex: 1,
    paddingBottom: 16,
    paddingTop: 3,
    borderRadius: 6,
  },
  rightLast: {
    paddingBottom: 14,
  },
  rightHL: {
    backgroundColor: '#F0F2FF',
    borderWidth: 1,
    borderColor: '#C5CAE9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
    marginTop: 0,
    paddingTop: 6,
  },
  eventText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  eventTextHL: {
    color: '#1A237E',
    fontWeight: '600',
  },
})