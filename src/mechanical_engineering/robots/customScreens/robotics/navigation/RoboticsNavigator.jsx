/**
 * RoboticsNavigator.jsx
 *
 * Stack navigator for the Robotics module, built on
 * @react-navigation/native-stack.
 *
 * RobotSimulator has headerShown: false - it's a full-bleed 3D canvas
 * with its own floating SimHeaderBar (including its own back button),
 * so the native stack header would just be a second, redundant header
 * eating into the screen space the model is supposed to have.
 *
 * Mode (Manual vs Program) is chosen BEFORE entering RobotSimulator,
 * via SimulatorModeSelectScreen -> (ProgramPickerScreen if Program) ->
 * RobotSimulator with route.params.mode/programId/autorun already
 * set. There's no in-screen mode switch anymore.
 *
 * ProgramEditorScreen is the only place editing happens now - reached
 * from ProgramPickerScreen's "+ New"/"Edit" or NewProgramScreen's
 * template flow, never from inside the simulator.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoboticsHomeScreen } from '../screens/RoboticsHomeScreen';
import { SimulatorModeSelectScreen } from '../screens/SimulatorModeSelectScreen';
import { ProgramPickerScreen } from '../screens/ProgramPickerScreen';
import { ProgramEditorScreen } from '../screens/ProgramEditorScreen';
import { RobotSimulatorScreen } from '../screens/RobotSimulatorScreen';
import { RobotBuilderScreen } from '../screens/RobotBuilderScreen';
import { LanguageReferenceScreen } from '../screens/LanguageReferenceScreen';
import { NewProgramScreen } from '../screens/NewProgramScreen';
import { PickDropWizardScreen } from '../screens/PickDropWizardScreen';

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
        name="SimulatorModeSelect"
        component={SimulatorModeSelectScreen}
        options={{ title: 'Robot Simulator' }}
      />
      <Stack.Screen
        name="ProgramPicker"
        component={ProgramPickerScreen}
        options={{ title: 'Choose a Program' }}
      />
      <Stack.Screen
        name="ProgramEditor"
        component={ProgramEditorScreen}
        options={{ title: 'Program Editor' }}
      />
      <Stack.Screen
        name="RobotSimulator"
        component={RobotSimulatorScreen}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="PickDropWizard"
        component={PickDropWizardScreen}
        options={{ title: 'Pick & Drop Wizard' }}
      />
    </Stack.Navigator>
  );
}
