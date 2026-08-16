/**
 * RobotSimulatorScreen.jsx
 *
 * Two control panels below the same canvas/scene: Manual (joint
 * control) and Program (write/run in Simple/Fanuc/ABB/KUKA syntax).
 * Switching tabs doesn't change how the robot is rendered - both
 * panels drive the same RobotEngine. SimulationControlsBar sits above
 * the canvas and governs the whole simulation clock regardless of
 * which tab is active.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RoboticsCanvasProvider, useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { RoboticsScene } from '../scene/RoboticsScene';
import { RoboticsToolbar } from '../ui/RoboticsToolbar';
import { JointControlPanel } from '../ui/JointControlPanel';
import { RobotProgramEditor } from '../ui/RobotProgramEditor';
import { SimulationControlsBar } from '../ui/SimulationControlsBar';
import { DEFAULT_CAM_POSITION, GRIP_STATES } from '../core/robotConstants';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, TOUCH_TARGET_MIN } from '../core/theme';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';

const TABS = { MANUAL: 'manual', PROGRAM: 'program' };

function ControlTabs({ activeTab, onChange }) {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === TABS.MANUAL && styles.tabActive]}
        onPress={() => onChange(TABS.MANUAL)}
      >
        <Text style={[styles.tabText, activeTab === TABS.MANUAL && styles.tabTextActive]}>
          Manual
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === TABS.PROGRAM && styles.tabActive]}
        onPress={() => onChange(TABS.PROGRAM)}
      >
        <Text style={[styles.tabText, activeTab === TABS.PROGRAM && styles.tabTextActive]}>
          Program
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SimulatorContent() {
  const { engine, state } = useRoboticsCanvas();
  const [activeTab, setActiveTab] = useState(TABS.MANUAL);

  const toggleGrip = () => {
    engine.setGrip(state.grip === GRIP_STATES.OPEN ? GRIP_STATES.CLOSED : GRIP_STATES.OPEN);
  };

  return (
    <View style={styles.container}>
      <RoboticsToolbar
        mode={state.mode}
        grip={state.grip}
        onToggleGrip={toggleGrip}
        onResetBox={() => engine.resetBox()}
      />

      <SimulationControlsBar />

      <View style={styles.canvasArea}>
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

      <ControlTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === TABS.MANUAL ? <JointControlPanel /> : <RobotProgramEditor />}
    </View>
  );
}

export function RobotSimulatorScreen() {
  return (
    <RoboticsCanvasProvider presetId="pick_drop_arm">
      <SimulatorContent />
    </RoboticsCanvasProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  canvasArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tab: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN + 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
});
