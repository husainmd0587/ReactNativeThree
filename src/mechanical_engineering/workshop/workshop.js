import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView,
} from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import Welding from "./welding/welding";
import BlackSmithy from './blacksmithy/blacksmithy';
import Carpentry from './carpentry/carpentry';
import ElectricalWiring from './electrical_wiring/electrical_wiring';
import Fitting from './fitting/fitting';
import Foundry from './foundry/foundry';
import SheetMetal from './sheet_metal/sheetMetal';
import Plumbing from './plumbing/plumbing';
import Machining from './machine_shop/machineshop'

const Stack = createNativeStackNavigator()
const MODULES = [
{
  name: 'WeldingGuide',
  label: 'Welding Guide',
  screen: Welding,
  description: 'Reference for welding techniques and parameters.',
  badge: 'Weld',
  icon: '🔧',
  accent: '#D9534F',
  accentBg: '#FFECEF',
},
{
  name:'MachiningGuide',
  label:'Machining Guide',
  screen: Machining,
  description:'Reference for machining techniques and tools.',
  badge:'Machine',
  icon:'⚙️',
  accent:'#5BC0DE',
  accentBg:'#EAF6FD',
},
{
  name:'SheetMetalGuide',
  label:'Sheet Metal Guide',
  screen: SheetMetal,
  description:'Reference for sheet metal techniques and tools.',
  badge:'Sheet',
  icon:'📄'
  ,accent:'#5CB85C',
  accentBg:'#EAFDEB',
},
{
  name: 'BlackSmithyGuide',
  label: 'Blacksmithy Guide',
  screen: BlackSmithy,
  description: 'Reference for blacksmithing techniques and tools.',
  badge: 'Smith',
  icon: '⚒️',
  accent: '#5BC0DE',
  accentBg: '#EAF6FD',
},{
  name: 'CarpentryGuide',
  label: 'Carpentry Guide',
  screen: Carpentry,
  description: 'Reference for carpentry techniques and tools.',
  badge: 'Carpentry',
  icon: '🪚'
  ,accent: '#5CB85C',
  accentBg: '#EAFDEB',
},
{
  name: 'ElectricalWiringGuide',
  label: 'Electrical Wiring Guide',
  screen: ElectricalWiring,
  description: 'Reference for electrical wiring techniques and tools.',
  badge: 'Wire',
  icon: '⚡',
  accent: '#F0AD4E',
  accentBg: '#FCF8F2',
},{
  name: 'FittingGuide',
  label: 'Fitting Guide',
  screen: Fitting,
  description: 'Reference for fitting techniques and tools.',
  badge: 'Fitting',
  icon: '🔩'
  ,accent: '#5CB85C',
  accentBg: '#EAFDEB',
},
{
  name: 'FoundryGuide',
  label: 'Foundry Guide',
  screen: Foundry,
  description: 'Reference for foundry techniques and tools.',
  badge: 'Foundry',
  icon: '🏭'
  ,accent: '#5BC0DE',
  accentBg: '#EAF6FD',   
},
{
  name: 'PlumbingGuide',
  label: 'Plumbing Guide',
  screen: Plumbing,
  description: 'Reference for plumbing techniques and tools.',
  badge: 'Plumbing',
  icon: '🚰'
  ,accent: '#5CB85C',
  accentBg: '#EAFDEB',  
}
]


const ModuleCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.iconBox, { backgroundColor: item.accentBg }]}>
      <Text style={styles.iconText}>{item.icon}</Text>
    </View>
    <Text style={styles.cardTitle}>{item.label}</Text>
    <Text style={styles.cardDesc}>{item.description}</Text>
    <View style={[styles.badge, { backgroundColor: item.accentBg }]}>
      <Text style={[styles.badgeText, { color: item.accent }]}>{item.badge}</Text>
    </View>
    <Text style={styles.arrow}>→</Text>
  </TouchableOpacity>
)

const MainScreen = ({ navigation }) => (
  <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.heading}>Workshop Tools</Text>
      <Text style={styles.subheading}>Pick a tool or reference</Text>
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
    backgroundColor: '#F7FBFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B3A66',
  },
  subheading: {
    fontSize: 13,
    color: '#4B6B88',
    marginTop: 4,
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  row: {
    gap: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  card: {
    flex: 0,
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0,
    elevation: 2,
    padding: 10,
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
    fontSize: 18,
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
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  arrow: {
    alignSelf: 'flex-end',
    fontSize: 16,
    color: '#9AB0CC',
    marginTop: 4,
  },
})

const Workshop = () => (
  <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F7FBFF' } }}>
    <Stack.Screen
      name="WorkshopHome"
      component={MainScreen}
      options={{ title: 'Workshop', headerShown: true }}
    />
    {MODULES.map((mod) => (
      <Stack.Screen
        key={mod.name}
        name={mod.name}
        component={mod.screen}
        options={{ title: mod.label, headerShown: false }}
      />
    ))}
  </Stack.Navigator>
)

export default Workshop