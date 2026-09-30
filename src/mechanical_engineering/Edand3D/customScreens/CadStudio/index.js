import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import CadStudioScreen from './screens/CadStudioScreen';
import CommandReferenceScreen from './screens/CommandReferenceScreen';

const Stack = createNativeStackNavigator();

/**
 * CAD Studio.
 *
 * A separate navigator from the AutoCAD practice module on purpose: the two
 * share an engine's worth of ideas but nothing else, and nesting one inside
 * the other would mean every studio screen carried the practice flow's
 * navigation state with it.
 */
export default function CadStudio() {
  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="CadStudioDrawing"
        component={CadStudioScreen}
        options={{title: 'CAD Studio'}}
      />
      <Stack.Screen
        name="CadStudioReference"
        component={CommandReferenceScreen}
        options={{title: 'Command Reference'}}
      />
    </Stack.Navigator>
  );
}
