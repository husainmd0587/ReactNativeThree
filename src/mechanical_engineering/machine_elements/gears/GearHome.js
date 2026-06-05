

import { StyleSheet, Text, View,TouchableOpacity,ScrollView } from 'react-native'
import React from 'react'
import { Canvas } from '@react-three/fiber/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Privider from '../../../provider';
    
import SpurGear from './spurGear';
import BevelGear from './bevelGear';
import HelicalGear from './helicalGear';
import RackAndPinion from './rackAndPinionGear';
import WormGear from './wormGear';
import GearSystem from './gearSystem';

const Stack = createNativeStackNavigator();
const Gears=[
  {
    name:'SpurGear',
    label:'Spur Gear',
    screen:SpurGear,
    description:'Design and calculations for spur gears, including tooth geometry, pitch, and load capacity.',
    badge:'Spur',
    icon:'⚙️',
    accent:'#534AB7',
    accentBg:'#EEEDFE',
    },
    {
    name:'BevelGear',
    label:'Bevel Gear',
    screen:BevelGear,
    description:'Design and calculations for bevel gears, including tooth geometry, pitch, and load capacity.',
    badge:'Bevel',
    icon:'⚙️',
    accent:'#B73E3E',
    accentBg:'#FDEDED',
    },
    {
    name:'HelicalGear',
    label:'Helical Gear',
    screen:HelicalGear,
    description:'Design and calculations for helical gears, including tooth geometry, pitch, and load capacity.',
    badge:'Helical',
    icon:'⚙️',
    accent:'#534AB7',
    accentBg:'#EEEDFE',
    },
    {
    name:'RackAndPinion',
    label:'Rack & Pinion',
    screen:RackAndPinion,
    description:'Design and calculations for rack and pinion gears, including tooth geometry, pitch, and load capacity.',
    badge:'Rack & Pinion',
    icon:'⚙️',
    accent:'#B73E3E',
    accentBg:'#FDEDED',
    },
    {
    name:'WormGear',
    label:'Worm Gear',
    screen:WormGear,
    description:'Design and calculations for worm gears, including tooth geometry, pitch, and load capacity.',
    badge:'Worm',
    icon:'⚙️',
    accent:'#534AB7',
    accentBg:'#EEEDFE',
    },
    {
    name:'GearSystem',
    label:'Gear System',
    screen:GearSystem,
    description:'A complex gear system demonstrating the interaction of multiple gear types in motion.',
    badge:'System',
    icon:'⚙️',
    accent:'#B73E3E',
    accentBg:'#FDEDED',
    },
]

const MainScreen = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={{ flex: 1, backgroundColor: '#f6f6f8'}}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16 }}>Gear Types</Text>
      {Gears.map((gear) => (
        <TouchableOpacity key={gear.name} onPress={() => navigation.navigate(gear.name)}>
          <View style={{ backgroundColor: gear.accentBg, padding: 16, margin: 8, borderRadius: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: gear.accent }}>{gear.icon} {gear.label}</Text>
            <Text style={{ marginTop: 8, color: '#333' }}>{gear.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const AllGears = () => {
  return (
 
   <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainScreen} />
      {Gears.map((gear) => (
        <Stack.Screen key={gear.name} name={gear.name} component={gear.screen} />
      ))}
    </Stack.Navigator>

  )
}

export default AllGears;




const styles = StyleSheet.create({})