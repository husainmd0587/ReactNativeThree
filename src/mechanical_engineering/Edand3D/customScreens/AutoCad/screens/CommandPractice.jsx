import React from 'react';
import { getCommandById } from '../commands/registry';
import CommandPractice2D from './CommandPractice2D';
import CommandPractice3D from './CommandPractice3D';

// The 3D commands need a completely different screen — a Three.js/CSG
// viewport with camera controls, not a 2D Skia canvas with tap/drag
// gestures — so this just decides which one to render. Everything else
// (registration in index.js, navigation.navigate('CommandPractice', ...)
// from CADPracticeHome) is unchanged; both screens live behind the one
// route name.
const THREE_D_TYPES = new Set(['extrude', 'revolve', 'union', 'subtract', 'intersect', 'sweep', 'loft']);

export default function CommandPractice({ route }) {
  const commandId = route?.params?.commandId;
  const command = getCommandById(commandId);
  const practiceType = command?.practice?.type;

  if (THREE_D_TYPES.has(practiceType)) {
    return <CommandPractice3D route={route} />;
  }
  return <CommandPractice2D route={route} />;
}
