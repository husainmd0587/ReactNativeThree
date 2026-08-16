/**
 * RoboticsNavigator.jsx
 *
 * Stack navigator for the Robotics module, built on
 * @react-navigation/native-stack (the standard RN navigation library).
 *
 * NOTE: no existing project navigation setup was available to inspect,
 * so this assumes React Navigation's native-stack. If the existing app
 * uses a different navigator (e.g. a different stack config, a custom
 * header, or is nested under another navigator), swap the
 * createNativeStackNavigator() call for the app's existing pattern and
 * mount <RoboticsNavigator /> as a screen/route in the app's root
 * navigator.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoboticsHomeScreen } from '../screens/RoboticsHomeScreen';
import { RobotSimulatorScreen } from '../screens/RobotSimulatorScreen';
import { RobotBuilderScreen } from '../screens/RobotBuilderScreen';
import { LanguageReferenceScreen } from '../screens/LanguageReferenceScreen';
import { NewProgramScreen } from '../screens/NewProgramScreen';

const Stack = createNativeStackNavigator();

export function RoboticsNavigator() {
  return (
    <Stack.Navigator initialRouteName="RoboticsHome">
      <Stack.Screen
        name="RoboticsHome"
        component={RoboticsHomeScreen}
        options={{ title: 'Robotics' }}
      />
      <Stack.Screen
        name="RobotSimulator"
        component={RobotSimulatorScreen}
        options={{ title: 'Robot Simulator' }}
      />
      <Stack.Screen
        name="RobotBuilder"
        component={RobotBuilderScreen}
        options={{ title: 'Robot Builder' }}
      />
      <Stack.Screen
        name="LanguageReference"
        component={LanguageReferenceScreen}
        options={{ title: 'Language Reference' }}
      />
      <Stack.Screen
        name="NewProgram"
        component={NewProgramScreen}
        options={{ title: 'New Program' }}
      />
    </Stack.Navigator>
  );
}
