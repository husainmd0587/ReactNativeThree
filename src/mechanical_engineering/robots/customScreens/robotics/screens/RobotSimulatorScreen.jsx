/**
 * RobotSimulatorScreen.jsx
 *
 * Full rewrite for the "models first" redesign: the 3D canvas is now
 * the ONLY flex child of the screen - it fills essentially the entire
 * height (90-100%). Everything else (header, joint controls, the live
 * code HUD) is absolutely positioned ON TOP of it as semi-transparent
 * floating chrome, not laid out beside/below it competing for space.
 * This is a stronger fix than the earlier flex-ratio approach (7:3) -
 * that guaranteed a minimum canvas share, but the model still only got
 * ~70%. Full-bleed + overlays gets the requested 90-100%.
 *
 * Mode is fixed for the whole screen, decided BEFORE entering (via
 * SimulatorModeSelectScreen -> route.params.mode) - there are no
 * in-screen tabs to switch between Manual and Program anymore:
 *
 *   mode: 'manual'  -> floating joint control strip at the bottom,
 *                       Grip/Reset visible in the header.
 *   mode: 'program' -> loads the given programId on mount (auto-runs
 *                       if params.autorun), shows the read-only
 *                       LiveCodeHud floating at the bottom. There is
 *                       NO editing here, ever, running or not -
 *                       editing lives exclusively in
 *                       ProgramEditorScreen. Grip/Reset are hidden in
 *                       this mode (SimHeaderBar showActions=false) -
 *                       only the simulation clock is relevant while a
 *                       program owns what the arm is doing.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { RoboticsCanvasProvider, useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { RoboticsScene } from '../scene/RoboticsScene';
import { SimHeaderBar } from '../ui/SimHeaderBar';
import { JointControlPanel } from '../ui/JointControlPanel';
import { LiveCodeHud } from '../ui/LiveCodeHud';
import { getSavedProgram } from '../core/programStorage';
import { DEFAULT_CAM_POSITION } from '../core/robotConstants';
import { COLORS } from '../core/theme';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';

function SimulatorContent({ route }) {
  const { engine, state, programState } = useRoboticsCanvas();
  const mode = route?.params?.mode ?? 'manual';
  const programId = route?.params?.programId ?? null;
  const autorun = route?.params?.autorun ?? false;

  const [loadedProgramText, setLoadedProgramText] = useState('');

  useEffect(() => {
    if (mode !== 'program' || !programId) return;
    let cancelled = false;
    getSavedProgram(programId).then((record) => {
      if (cancelled || !record) return;
      setLoadedProgramText(record.text);
      engine.loadProgram(record.text, record.dialect);
      if (autorun) engine.runProgram();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, programId, autorun]);

  const currentLine =
    mode === 'program' && programState.running
      ? programState.instructions[programState.pointer]?.line
      : null;
  const errorLines = new Set(programState.errors.map((e) => e.line));

  return (
    <View style={styles.root}>
      <CanvaProvider camPosition={DEFAULT_CAM_POSITION} style={styles.fill}>
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

      <View style={styles.overlay} pointerEvents="box-none">
        <SimHeaderBar onResetBox={() => engine.resetBox()} showActions={mode === 'manual'} />

        <View style={styles.spacer} pointerEvents="box-none" />

        {mode === 'manual' && (
          <View style={styles.manualStrip} pointerEvents="box-none">
            <JointControlPanel />
          </View>
        )}

        {mode === 'program' && (
          <LiveCodeHud text={loadedProgramText} activeLine={currentLine} errorLines={errorLines} />
        )}
      </View>
    </View>
  );
}

export function RobotSimulatorScreen({ route }) {
  return (
    <RoboticsCanvasProvider presetId="industrial_glb_arm">
      <SimulatorContent route={route} />
    </RoboticsCanvasProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  fill: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  spacer: {
    flex: 1,
  },
  manualStrip: {
    backgroundColor: COLORS.overlay,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
});
