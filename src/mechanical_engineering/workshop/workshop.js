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
    name:'BlackSmithy',
    label:'BlackSmithy',
    screen:BlackSmithy,
 },
 {
  name:'Fitting',
  label:'Fittings',
  screen:Fitting
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
    padding: 14,
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