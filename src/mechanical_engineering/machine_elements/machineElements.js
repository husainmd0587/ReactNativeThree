import React,{useEffect} from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView,
} from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Animated, { useSharedValue,
    useAnimatedStyle,  
    withSpring,
    withRepeat,
    withTiming,
    withDecay,
    withDelay,
    withClamp,
    withSequence,
    Easing
    
} from 'react-native-reanimated'
import AllGears from './gears/GearHome'
import EngineHome from './engine/engineHome'
import CNCHome from './cnc/cncHome'
import AllBearings from './bearings/allbearings'



const Stack = createNativeStackNavigator()
const MODULES = [
  {
    name: 'AllGears',
    label: 'All gears',
    screen: AllGears,
    description: 'Spur, helical, bevel & worm gear design and calculations.',
    badge: 'Gears',
    icon: '⚙️',
    
    accent: '#534AB7',
    accentBg: '#EEEDFE',
  },
  {
    name: 'AllBearings',
    label: 'All bearings',
    screen: AllBearings,
    description: 'Ball, roller, thrust, tapered, and spherical bearing types.',
    badge: 'Bearings',
    icon: '🛞',
    accent: '#B73E3E',
    accentBg: '#FDEDED',
  },
  {
    name: 'EngineHome',
    label: 'Engine',
    screen: EngineHome,
    description: 'Piston, bore, stroke, and thermodynamic engine parameters.',
    badge: 'Engine',
    icon: '🔩',
    accent: '#0F6E56',
    accentBg: '#E1F5EE',
  },
  {
    name: 'CNCHome',
    label: 'CNC',
    screen: CNCHome,
    description: 'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    badge: 'CNC',
    icon: '🛠️',
    accent: '#854F0B',
    accentBg: '#FAEEDA',
  },

]

const ModuleCard = ({ item, onPress }) => {
     
    const val=useSharedValue(0)
    const animStyle=useAnimatedStyle(()=>{return {transform:[{rotate:`${val.value}deg`}]}})
    useEffect(()=>{
      val.value=withRepeat(withTiming(2000,{duration:10000,easing: Easing.linear,}),-1)
    },[])
  return (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.iconBox, { backgroundColor: item.accentBg }]}>
      <Animated.Text style={[styles.iconText,animStyle]}>{item.icon}</Animated.Text>
    </View>
    <Text style={styles.cardTitle}>{item.label}</Text>
    <Text style={styles.cardDesc}>{item.description}</Text>
    <View style={[styles.badge, { backgroundColor: item.accentBg }]}>
      <Text style={[styles.badgeText, { color: item.accent }]}>{item.badge}</Text>
    </View>
    <Text style={styles.arrow}>→</Text>
  </TouchableOpacity>
)}

const MAinScreen = ({ navigation }) => (
  <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.heading}>Machine elements</Text>
      <Text style={styles.subheading}>Select a module to get started</Text>
    </View>
    <FlatList
      data={MODULES}
      keyExtractor={(item) => item.name}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      renderItem={({ item }) => (
        <ModuleCard
          item={item}
          onPress={() => navigation.navigate(item.name)}
        />
      )}
    />
  </SafeAreaView>
)

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
  },
  subheading: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    padding: 16,
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 25,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  cardDesc: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  arrow: {
    alignSelf: 'flex-end',
    fontSize: 16,
    color: '#aaa',
    marginTop: 4,
  },
})

const MachineElements = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MAinScreen"
      component={MAinScreen}
      options={{ title: 'Machine Elements', headerShown:true }}
    />
    {MODULES.map((mod) => (
      <Stack.Screen
        key={mod.name}
        name={mod.name}
        component={mod.screen}
        options={{ title: mod.label,headerShown: false }}
      />
    ))}
  </Stack.Navigator>
)

export default MachineElements