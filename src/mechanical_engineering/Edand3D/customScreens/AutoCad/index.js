import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CADPracticeHome from './screens/CADPracticeHome';
import CommandPractice from './screens/CommandPractice';
import SettingsScreen from './screens/SettingsScreen';
import { SettingsProvider } from './state/SettingsContext';

const Stack = createNativeStackNavigator();

function AutoCadPractice() {
  return (
    <SettingsProvider>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="CADPracticeHome"
          component={CADPracticeHome}
          options={({ navigation }) => ({
            title: 'CAD Practice',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ paddingHorizontal: 4 }}
              >
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="CommandPractice"
          component={CommandPractice}
          options={{ title: 'Command Practice' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </SettingsProvider>
  );
}

export default AutoCadPractice;
