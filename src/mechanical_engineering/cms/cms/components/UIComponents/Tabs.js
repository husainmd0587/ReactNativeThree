import React, { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'

// Data shape:
// { type: "tabs", tabs: [
//   { label: "SMAW",  blocks: [ ...any blocks... ] },
//   { label: "MIG",   blocks: [ ...any blocks... ] },
//   { label: "TIG",   blocks: [ ...any blocks... ] },
// ]}

const Tabs = ({ tabs = [], navigation, accent, rootBlocks, renderBlocks }) => {
  const [active, setActive] = useState(0)

  if (!tabs.length) return null

  return (
    <View style={styles.wrapper}>
      {/* Tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {tabs.map((tab, i) => {
          const isActive = i === active
          return (
            <TouchableOpacity
              key={i}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActive(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Active panel */}
      <View style={styles.panel}>
        {renderBlocks ? (
          renderBlocks(tabs[active]?.blocks || [], navigation, accent, rootBlocks)
        ) : null}
      </View>
    </View>
  )
}

export default Tabs

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
    backgroundColor: '#FFFFFF',
  },
  strip: {
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8E8',
    backgroundColor: '#F8F8FD',
  },
  stripContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    position: 'relative',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#3949AB',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#3949AB',
  },
  panel: {
    padding: 10,
  },
})