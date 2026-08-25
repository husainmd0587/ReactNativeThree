/**
 * RobotBuilderScreen.jsx
 *
 * Base builder screen: preview area (reuses the same canvas/scene
 * pipeline as the simulator) plus a read-only properties panel, with
 * the same SimHeaderBar the simulator has (the preview still runs box
 * physics/motion, so pausing it here is meaningful too). Actual
 * add/edit joint & link operations (RobotBuilder engine) are added in
 * the next phase - this only proves the layout and data flow.
 *
 * Same CANVAS_HEIGHT_RATIO:CONTROLS_HEIGHT_RATIO layout fix as
 * RobotSimulatorScreen - see that file's header comment for why plain
 * flex:1 broke.
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
import { SimHeaderBar } from '../ui/SimHeaderBar';
import { DEFAULT_CAM_POSITION } from '../core/robotConstants';
import { COLORS, CANVAS_HEIGHT_RATIO, CONTROLS_HEIGHT_RATIO } from '../core/theme';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';

function BuilderContent() {
  const { engine, state } = useRoboticsCanvas();

  return (
    <View style={styles.container}>
      <SimHeaderBar onResetBox={() => engine.resetBox()} />

      <View style={styles.previewArea}>
        <CanvaProvider camPosition={DEFAULT_CAM_POSITION}>
          <RoboticsScene
            definition={state.definition}
            jointValues={state.jointValues}
            grip={state.grip}
            box={state.box}
            dropZonePosition={state.dropZonePosition}
            onFrame={(dt) => engine.update(dt)}
            onGripperFrame={(pos, quat) => engine.reportGripperWorldPosition(pos, quat)}
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
    <RoboticsCanvasProvider presetId="industrial_glb_arm">
      <BuilderContent />
    </RoboticsCanvasProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  previewArea: {
    flex: CANVAS_HEIGHT_RATIO,
  },
  panelArea: {
    flex: CONTROLS_HEIGHT_RATIO,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
