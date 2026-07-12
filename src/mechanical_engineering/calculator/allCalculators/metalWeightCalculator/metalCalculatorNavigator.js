import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppDataProvider } from './appData';
import HomeScreen from './homeScreen';
import CalculatorScreen from './calculatorScreen';
import HistoryScreen from './historyScreen';
import SettingsScreen from './settingScreen';

const Stack = createNativeStackNavigator();

// This is the missing piece: HomeScreen calls navigation.navigate('Calculator'),
// navigation.navigate('History'), navigation.navigate('Settings') — but none of
// those screens existed in any navigator, hence:
//   "The action 'NAVIGATE' ... was not handled by any navigator.
//    Do you have a screen named 'Calculator'?"
//
// Drop <MetalCalculatorNavigator /> in wherever this section plugs into the
// rest of the app (e.g. as one screen/tab of a parent navigator, or as the
// root component if you're testing it standalone).
export default function MetalCalculatorNavigator() {
  return (
    <AppDataProvider>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </AppDataProvider>
  );
}
