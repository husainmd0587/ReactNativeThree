/**
 * RobotBuilderScreen.jsx
 *
 * Base builder screen: preview area (reuses the same canvas/scene
 * pipeline as the simulator) plus a read-only properties panel. Actual
 * add/edit joint & link operations (RobotBuilder engine) are added in
 * the next phase - this only proves the layout and data flow.
 *
 * Uses the app's existing shared CanvaProvider directly (no robotics-
 * specific wrapper).
 *
 * IMPORT PATH NOTE: adjust to match this file's actual location if it
 * differs from what's shown here.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RoboticsCanvasProvider, useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { RoboticsScene } from '../scene/RoboticsScene';
import { RobotPropertiesPanel } from '../ui/RobotPropertiesPanel';
import { DEFAULT_CAM_POSITION } from '../core/robotConstants';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';

function BuilderContent() {
  const { engine, state } = useRoboticsCanvas();

  return (
    <View style={styles.container}>
      <View style={styles.previewArea}>
        <CanvaProvider camPosition={DEFAULT_CAM_POSITION}>
          <RoboticsScene
            definition={state.definition}
            jointValues={state.jointValues}
            grip={state.grip}
            box={state.box}
            dropZonePosition={state.dropZonePosition}
            onFrame={(dt) => engine.update(dt)}
            onGripperFrame={(pos) => engine.reportGripperWorldPosition(pos)}
          />
        </CanvaProvider>
      </View>

      <View style={styles.panelArea}>
        <RobotPropertiesPanel />
      </View>
    </View>
  );
}

export function RobotBuilderScreen() {
  return (
    <RoboticsCanvasProvider presetId="pick_drop_arm">
      <BuilderContent />
    </RoboticsCanvasProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  previewArea: {
    flex: 2,
  },
  panelArea: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#1c1f26',
  },
});
