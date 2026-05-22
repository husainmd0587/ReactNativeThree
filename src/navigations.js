import React, { useEffect, useRef, useState } from 'react';
import {  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,  StatusBar, ScrollView, Animated, } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeCad from './create3D/home';
import HomeTurningMilling from './turning_milling/home';
import AllMeasuringTools from './mechanical_engineering/measurings/allmeasuringTools';
import MetalWeightCalculator from './mechanical_engineering/calculator/home';
import MachineElements from './mechanical_engineering/machine_elements/machineElements';
import Robots from './mechanical_engineering/robots/robotsHome';
import Workshop from './mechanical_engineering/workshop/workshop';
import ProductionManagement from './mechanical_engineering/management/management';


const Stack = createNativeStackNavigator();
// ── Animated slogan ────────────────────────────────────────────────────────
const AnimatedSlogan = ({ slogans, delay = 0 }) => {
  const [index, setIndex] = useState(0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start();

      const interval = setInterval(() => {
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -10, duration: 350, useNativeDriver: true }),
        ]).start(() => {
          setIndex(prev => (prev + 1) % slogans.length);
          slideAnim.setValue(10);
          Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]).start();
        });
      }, 3000);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.Text style={[s.slogan, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {slogans[index]}
    </Animated.Text>
  );
};

// ── Module card (square, for 2-col grid) ──────────────────────────────────
const ModuleCard = ({ screen, onPress, wide = false }) => (
  <TouchableOpacity
    style={[s.card, wide && s.cardWide]}
    onPress={onPress}
    activeOpacity={0.82}
  >
    {/* Coloured image / illustration area */}
    <View style={[s.cardImg, { backgroundColor: screen.accentBg }, wide && s.cardImgWide]}>
      <Text style={s.cardEmoji}>{screen.emoji}</Text>
      <View style={[s.colorBar, { backgroundColor: screen.accent }]} />
      {screen.slogen && (
        <View style={s.sloganWrap}>
          <AnimatedSlogan slogans={screen.slogen} delay={screen.delay ?? 0} />
        </View>
      )}
    </View>

    {/* Text body */}
    <View style={[s.cardBody, wide && s.cardBodyWide]}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardName}>{screen.label}</Text>
        <Text style={s.cardDesc}>{screen.desc}</Text>
      </View>
      <Text style={[s.cardArrow, { color: screen.accent }]}>→</Text>
    </View>
  </TouchableOpacity>
);

// ── Navigation main ────────────────────────────────────────────────────────
const NavigationMain = ({ navigation }) => {
  const modules = AllScreens.filter(s => s.showInMenu !== false && s.name !== 'Calculator');
  const mainModules = modules.filter(s => !s.wide);
  const wideModules = modules.filter(s => s.wide);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>ME Studio</Text>
            <Text style={s.subtitle}>Mechanical Engineering · Learn Easily</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>ME</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Modules 2-col grid */}
        <Text style={s.sectionLabel}>MODULES</Text>
        <View style={s.grid}>
          {mainModules.map((screen, i) => (
            <ModuleCard
              key={screen.name}
              screen={{ ...screen, delay: i * 500 }}
              onPress={() => navigation.navigate(screen.name)}
            />
          ))}
        </View>

        {/* Wide (full-width) modules */}
        {wideModules.map(screen => (
          <ModuleCard
            key={screen.name}
            screen={screen}
            onPress={() => navigation.navigate(screen.name)}
            wide
          />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Screens config ─────────────────────────────────────────────────────────
const AllScreens = [
  {
    name: ' Engineering_drawing&CAD',
    label: ' Engineering drawing & CAD',
    desc: 'Sketch, model and export 2D/3D parts',
    component: HomeCad,
    emoji: '✏️',
    accent: '#7F77DD', accentBg: '#EEEDFE',
    slogen: [
      'Unleash your creativity!',
      'Design, build, innovate.',
      'Concept to creation.',
    ],
  },
  {
    name: 'HomeTurningMilling',
    label: 'Turning & Milling',
    desc: 'Simulate CNC turning programs',
    component: HomeTurningMilling,
    emoji: '⚙️',
    accent: '#1D9E75', accentBg: '#E1F5EE',
    slogen: [
      'G-Code made easy.',
      'Test CNC programs virtually.',
      'Precision turning, simulated.',
    ],
  },
  {
    name: 'Mechanical measuring tools',
    label: 'Measuring Tools',
    desc: 'Calipers, micrometers & gauges',
    component: AllMeasuringTools,
    emoji: '📏',
    accent: '#D85A30', accentBg: '#FAECE7',
    slogen: [
      'Measure twice, cut once.',
      'Master precision measurement.',
    ],
  },
  {
    name: 'Machine Elements',
    label: 'Machine Elements',
    desc: 'Gears, shafts, fasteners & bearings',
    component: MachineElements,
    emoji: '🔩',
    accent: '#378ADD', accentBg: '#E6F1FB',
    slogen: [
      'Gears, bearings & more.',
      'Explore mechanical design.',
    ],
  },
  {
    name: 'robots',
    label: 'Robotics',
    desc: 'Kinematics, arms and automation systems',
    component: Robots,
    emoji: '🤖',
    accent: '#D4537E', accentBg: '#FBEAF0',
    slogen: ['Automate the future.', 'Explore robot kinematics.'],
  },
  {
    name: 'Engineering calculators',
    component: MetalWeightCalculator,
    label: 'Calculators',
    desc: 'Material weight & more',
    emoji: '🧮',
    accent: '#FFA500', accentBg: '#FFF5E6',
    slogen: ['Quick calculations.', 'Material weight & more.'],
  },
  {
    name:'Workshop',
    component:Workshop,
    label:'Engineering Workshop'
  },
  {
    name: 'Management',
    label: 'Production management',
    component: ProductionManagement,
    emoji: '📋',
    wide: true,
    accent: '#854F0B', accentBg: '#FAEEDA',
    slogen: ['5S, Kaizen & more.', 'Streamline your workflow.'],
  }
];

// ── Main stack ─────────────────────────────────────────────────────────────
export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home_Main" component={NavigationMain} options={{ headerShown: false }} />
        {AllScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{ headerShown:false }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:     { flex: 1, backgroundColor: '#F4F3F8' },
  body:       { padding: 14, paddingBottom: 32 },

  // header
  header:     { backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:      { fontSize: 22, fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3 },
  subtitle:   { fontSize: 12, color: '#7F77DD', fontWeight: '500', marginTop: 2 },
  avatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEEDFE', borderWidth: 1.5, borderColor: '#AFA9EC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#534AB7' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#AAAAAA', letterSpacing: 1.4, marginBottom: 10, paddingLeft: 2 },

  // 2-col grid
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },

  // card
  card:         { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 0.5, borderColor: '#E8E6F0', overflow: 'hidden' },
  cardWide:     { width: '100%', flexDirection: 'row', marginBottom: 20 },
  cardImg:      { height: 90, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardImgWide:  { width: 110, height: 'auto', flexShrink: 0 },
  cardEmoji:    { fontSize: 30 },
  colorBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  sloganWrap:   { position: 'absolute', bottom: 8, left: 6, right: 6 },
  slogan:       { fontSize: 9, fontWeight: '700', fontStyle: 'italic', color: '#1A1A2E', backgroundColor: 'rgba(255,255,255,0.82)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, textAlign: 'center' },
  cardBody:     { padding: 10 },
  cardBodyWide: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cardName:     { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  cardDesc:     { fontSize: 10, color: '#9898AA', lineHeight: 14 },
  cardArrow:    { fontSize: 18, marginTop: 6 },
  // tool row
  toolRow:      { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 0.5, borderColor: '#E8E6F0', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolIconBox:  { width: 42, height: 42, borderRadius: 10, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F5C96A', alignItems: 'center', justifyContent: 'center' },
  toolName:     { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  toolSub:      { fontSize: 11, color: '#9898AA' },
  toolChip:     { backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F5C96A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  toolChipText: { fontSize: 10, color: '#854F0B', fontWeight: '600' },
});