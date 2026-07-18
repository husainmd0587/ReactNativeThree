// cad/CadNavigator.js
//
// Drop-in nested navigator for the whole CAD module. This is the ONE file
// your app's existing navigator needs to import:
//
//   import CadNavigator from './SolidCad/cad/CadNavigator'
//   ...
//   <Stack.Screen name="CAD" component={CadNavigator} options={{ headerShown: false }} />
//
// Everything else (the Sketcher, the old THREE-only 3D preview, and the new
// native-first Extrude -> Manifold screen) lives inside this nested stack, so
// none of the Sketcher's internal `navigation.navigate(...)` calls need any
// further changes — React Navigation resolves route names against the
// nearest navigator first.
//
// main.js's "go to 3D" button now points at 'SketchToSolid' (the native
// screen) instead of 'Main3D' (the old THREE-only preview) — that one-line
// change is already made in main.js. 'Main3D' is still registered below in
// case you want it reachable some other way (e.g. a fast low-fidelity
// preview while sketching, before committing to the native build).
//
// Uses @react-navigation/native-stack. If your app is on the older
// @react-navigation/stack instead, swap that one import — nothing else in
// this file needs to change.

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import Sketching2D from '../main.js'
import Main3D from '../3d/main.js'
import SketchToSolidScreen from './SketchToSolidScreen.js'

const Stack = createNativeStackNavigator()

export default function CadNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Sketch2D"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Sketch2D" component={Sketching2D} />

      {/* Old fast preview — plain THREE.ExtrudeGeometry, not a real Manifold solid. */}
      <Stack.Screen name="Main3D" component={Main3D} />

      {/* New default — Extrude -> Manifold, features cut natively. */}
      <Stack.Screen name="SketchToSolid" component={SketchToSolidScreen} />
    </Stack.Navigator>
  )
}
