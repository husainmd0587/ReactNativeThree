import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView,
} from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MetalWeightCalculator from './allCalculators/maetalWaight'
import RPMCalculator from './allCalculators/RPM_cutting_speed'


const Stack = createNativeStackNavigator()
const MODULES = [
{
    name: 'MetalWeightCalculator',
    label: 'Metal Weight Calculator',
    screen: MetalWeightCalculator,
    description: 'Calculate weight of metal parts based on dimensions and material.',
    badge: 'Weight',
    icon: '⚖️',
    accent: '#0F6E56',
    accentBg: '#e1e7f5',
},
{ 
  name:'RPM CalCulator',
  label:'RPM Calculator',
  screen:RPMCalculator
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
      <Text style={styles.heading}>Calculator</Text>
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
    justifyContent: 'space-between',
  },
  card: {
    flex: 0,
    width: '48%',
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
    fontSize: 20,
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
      name="MainScreenCalculator"
      component={MainScreen}
      options={{ title: 'Calculator', headerShown: true }}
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