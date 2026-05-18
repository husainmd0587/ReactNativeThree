import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, StatusBar,
} from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FiveSScreen from './5s'
import SixSigmaScreen from './six_sigma'
import { KaizenScreen,QualityAssuranceScreen,QualityControlScreen,TQMScreen } from './kaizen_and_others'
import Safety from './safety'
const Stack = createNativeStackNavigator()

const MODULES = [
  {
    name: 'FiveS',
    label: '5S System',
    screen: FiveSScreen,
    description: 'Sort, Set in order, Shine, Standardise, Sustain.',
    badge: 'Lean',
    emoji: '📋',
    accent: '#D4537E',
    accentBg: '#FBEAF0',
    badgeText: '#993556',
  },
  {
    name: 'Safety',
    label: 'Safety',
    screen: Safety,
    description: 'Workplace safety protocols and best practices.',
    badge: 'Safety',
    emoji: '⚠️',
    accent: '#FF5722',
    accentBg: '#FBE9E7',
    badgeText: '#D32F2F',
  },
  {
    name: 'SixSigma',
    label: 'Six Sigma',
    screen: SixSigmaScreen,
    description: 'A data-driven approach to eliminate defects and improve processes.',
    badge: 'Quality',
    emoji: '🎯',
    accent: '#4A90E2',
    accentBg: '#E1F0FA',
    badgeText: '#2C5DA0',
  },
  {
    name: 'Kaizen',
    label: 'Kaizen',
    screen: KaizenScreen,
    description: 'Continuous improvement methodology.',
    badge: 'Lean',
    emoji: '🌱',
    accent: '#7CB342',
    accentBg: '#E8F5E9',
    badgeText: '#388E3C',
  },
  {
    name: 'QualityAssurance',
    label: 'Quality Assurance',
    screen: QualityAssuranceScreen,
    description: 'Ensuring products meet specified requirements.',
    badge: 'Quality',
    emoji: '✅',
    accent: '#50C878',
    accentBg: '#E8F5E9',
    badgeText: '#388E3C',
  },
  {
    name: 'QualityControl',
    label: 'Quality Control',
    screen: QualityControlScreen,
    description: 'Monitoring and testing products to ensure they meet quality standards.',
    badge: 'Quality',
    emoji: '🔍',
    accent: '#FFA07A',
    accentBg: '#FFF5F0',
    badgeText: '#D32F2F',
  },
  {
    name: 'TQM',
    label: 'Total Quality Management',
    screen: TQMScreen,
    description: 'A comprehensive approach to quality management across the entire organization.',
    badge: 'Quality',
    emoji: '📊',
    accent: '#9C27B0',
    accentBg: '#F3E5F5',
    badgeText: '#7B1FA2',
  }

]

// ── Row card — full width, compact height ──────────────────────────────────
const ModuleCard = ({ item, onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.78}>

    {/* Left: tinted icon zone + right-edge accent bar */}
    <View style={[s.cardLeft, { backgroundColor: item.accentBg }]}>
      <View style={[s.accentBar, { backgroundColor: item.accent }]} />
      <Text style={s.cardEmoji}>{item.emoji}</Text>
    </View>

    {/* Centre: title + description */}
    <View style={s.cardMid}>
      <Text style={s.cardTitle}>{item.label}</Text>
      <Text style={s.cardDesc}>{item.description}</Text>
    </View>

    {/* Right: badge + arrow */}
    <View style={s.cardRight}>
      <View style={[s.badge, { backgroundColor: item.accentBg }]}>
        <Text style={[s.badgeText, { color: item.badgeText }]}>{item.badge}</Text>
      </View>
      <Text style={[s.arrow, { color: item.accent }]}>›</Text>
    </View>

  </TouchableOpacity>
)

// ── Main screen ────────────────────────────────────────────────────────────
const MAinScreen = ({ navigation }) => (
  <SafeAreaView style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

    <View style={s.header}>
      <View>
        <Text style={s.heading}>production management</Text>
        <Text style={s.subheading}>Select a module to get started</Text>
      </View>
      <View style={s.headerIcon}>
        <Text style={{ fontSize: 18 }}>⚙️</Text>
      </View>
    </View>

    <FlatList
      data={MODULES}
      keyExtractor={(item) => item.name}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <ModuleCard
          item={item}
          onPress={() => navigation.navigate(item.name)}
        />
      )}
    />
  </SafeAreaView>
)

// ── Stack navigator ────────────────────────────────────────────────────────
const ProductionManagement = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MAinScreen"
      component={MAinScreen}
      options={{ headerShown: false }}
    />
    {MODULES.map((mod) => (
      <Stack.Screen
        key={mod.name}
        name={mod.name}
        component={mod.screen}
         options={{ headerShown: false }}
      />
    ))}
  </Stack.Navigator>
)

export default ProductionManagement

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: '#F5F5F7' },

  header:     { backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading:    { fontSize: 20, fontWeight: '700', color: '#111118', letterSpacing: -0.3 },
  subheading: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0EFF8', borderWidth: 1, borderColor: '#DAD9EF', alignItems: 'center', justifyContent: 'center' },

  list:       { padding: 12, paddingBottom: 32 },

  // card — horizontal strip
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 0.5, borderColor: '#E8E8EC', marginBottom: 9, overflow: 'hidden' },

  // left icon zone
  cardLeft:   { width: 54, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  accentBar:  { position: 'absolute', top: 0, bottom: 0, right: 0, width: 2 },
  cardEmoji:  { fontSize: 22 },

  // centre text
  cardMid:    { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: '#111118', marginBottom: 2 },
  cardDesc:   { fontSize: 10, color: '#9898AA', lineHeight: 14 },

  // right actions
  cardRight:  { paddingRight: 14, alignItems: 'flex-end', gap: 5 },
  badge:      { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 },
  badgeText:  { fontSize: 10, fontWeight: '600' },
  arrow:      { fontSize: 20, fontWeight: '300' },
})