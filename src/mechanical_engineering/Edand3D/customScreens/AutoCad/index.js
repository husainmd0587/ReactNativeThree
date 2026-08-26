import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CADPracticeHome from './screens/CADPracticeHome';
import CommandPractice from './screens/CommandPractice';
import SettingsScreen from './screens/SettingsScreen';
import CommandReferenceScreen from './screens/CommandReferenceScreen';
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
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CommandReference')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 20 }}>📖</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ paddingRight: 4 }}
                >
                  <Text style={{ fontSize: 20 }}>⚙️</Text>
                </TouchableOpacity>
              </View>
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
        <Stack.Screen
          name="CommandReference"
          component={CommandReferenceScreen}
          options={{ title: 'Command Reference' }}
        />
      </Stack.Navigator>
    </SettingsProvider>
  );
}

export default AutoCadPractice;
