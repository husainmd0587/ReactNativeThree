import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CADPracticeHome from './screens/CADPracticeHome';
import CommandPractice from './screens/CommandPractice';


const Stack = createNativeStackNavigator();

function AutoCadPractice() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="CADPracticeHome"
        component={CADPracticeHome}
        options={{ title: 'CAD Practice' }}
      />
      <Stack.Screen
        name="CommandPractice"
        component={CommandPractice}
        options={{ title: 'Command Practice' }}
      />
    </Stack.Navigator>
  );
}



export default AutoCadPractice;
