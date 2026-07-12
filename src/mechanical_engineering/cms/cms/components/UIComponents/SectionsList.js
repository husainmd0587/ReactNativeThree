// SectionsList/SectionsList.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import ProgressRing from './utils/progressRing';

const SectionsList = ({ title, items = [], accent, navigation, }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const renderListItem = (sec, i) => (
    <TouchableOpacity
      key={i}
      style={[
        styles.sectionRow,
        styles.sectionShadow
      ]}
      activeOpacity={0.8}
      onPress={() => 
        {
          sec.navigation?navigation.push(sec.navigation) : navigation.push('ItemScreen', { item: sec,needToFetchBlock:false })
        
        }}
    >
      <View style={[styles.sectionIconBox, { backgroundColor: sec.iconBg || '#F5F5F5' }]}>
        <Text style={styles.sectionIcon}>{sec.icon}</Text>
      </View>
      <View style={styles.sectionContent}>
        <Text style={styles.sectionRowTitle}>{sec.title}</Text>
        <Text style={styles.sectionRowSub}>{sec.subtitle}</Text>
      </View>
      <ProgressRing progress={sec.progress} accent={accent} />
      <Text style={styles.sectionArrow}>›</Text>
    </TouchableOpacity>
  );

  const renderGridItem = (sec, i) => (
    <TouchableOpacity
      key={i}
      style={[
        styles.gridItem,
        styles.sectionShadow
      ]}
      activeOpacity={0.8}
          onPress={() => 
        {
          sec.navigation?navigation.push(sec.navigation) : navigation.push('ItemScreen', { item: sec })
        
        }}
    >
      <View style={[styles.gridIconBox, { backgroundColor: sec.iconBg || '#F5F5F5' }]}>
        <Text style={styles.gridIcon}>{sec.icon}</Text>
      </View>
      <View style={styles.gridContent}>
        <Text style={styles.gridTitle} numberOfLines={1}>{sec.title}</Text>
        <Text style={styles.gridSub} numberOfLines={2}>{sec.subtitle}</Text>
      </View>
      <View style={styles.gridProgressWrapper}>
        <ProgressRing progress={sec.progress} accent={accent} size={30} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.sectionsWrap}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionListTitle}>{title}</Text>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'list' && styles.toggleButtonTextActive
            ]}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'grid' && styles.toggleButtonActive
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'grid' && styles.toggleButtonTextActive
            ]}>⊞</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <ScrollView style={styles.listContainer}>

          
          {items.map((sec, i) => renderListItem(sec, i))}
        </ScrollView>
      ) : (
        <View style={styles.gridContainer}>
          {items.map((sec, i) => renderGridItem(sec, i))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionsWrap: {
    marginHorizontal: 10,
    marginBottom: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
    gap: 5,
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#222',
  },
  
  // List View Styles
  listContainer: {
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Vintage/old shadow effect
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  sectionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: { fontSize: 22 },
  sectionContent: { flex: 1, marginHorizontal: 12 },
  sectionRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  sectionRowSub: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },
  sectionArrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },

  // Grid View Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%', // 2 items per row with spacing
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Vintage shadow for grid
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  gridIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridIcon: { fontSize: 28 },
  gridContent: {
    alignItems: 'center',
    width: '100%',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 15,
  },
  gridProgressWrapper: {
    marginTop: 8,
  },
});

export default SectionsList;