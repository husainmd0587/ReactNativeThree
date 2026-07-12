// Outcomes/Outcomes.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const Outcomes = ({ title, items = [], accent = '#FF6B6B' }) => {
  return (
    <View style={styles.outcomesWrap}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        <TouchableOpacity hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={[styles.viewAll, { color: accent }]}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.outcomesScroll}
      >
        {items.map((outcome, i) => (
          <View key={i} style={styles.outcomeItem}>
            <View style={[styles.ring, { borderColor: outcome.color || accent }]}>
              <View style={[styles.outcomeIconWrap, { backgroundColor: outcome.color || accent }]}>
                <Text style={styles.outcomeIcon}>{outcome.icon}</Text>
              </View>
            </View>
            <Text style={styles.outcomeLabel} numberOfLines={2}>
              {outcome.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outcomesWrap: {
    marginHorizontal: 10,
    marginBottom: 6,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
  },
  outcomesScroll: {
    gap: 10,
    paddingBottom: 2,
  },
  outcomeItem: {
    alignItems: 'center',
    width: 56,
  },
  // Insta-style ring: a thin colored border circle slightly larger than
  // the icon circle, with a small gap, mimicking the "story" border.
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeIconWrap: {
    width: 52,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeIcon: { fontSize: 18 },
  outcomeLabel: {
    fontSize: 8,
    color: '#444',
    textAlign: 'center',
    lineHeight:8,
    width: 56,
  },
});

export default Outcomes;