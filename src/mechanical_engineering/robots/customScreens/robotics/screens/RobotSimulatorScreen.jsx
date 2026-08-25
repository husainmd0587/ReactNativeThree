/**
 * RobotSimulatorScreen.jsx
 *
 * LAYOUT FIX: the canvas area previously used `flex: 1` sitting next
 * to a non-flex controls region (tabs + Manual/Program panel) whose
 * natural content height could exceed the screen. In React Native
 * flexbox, a flex:1 sibling loses that fight and gets squeezed toward
 * zero - which is exactly why the 3D model disappeared entirely once
 * the Program tab's content (editor + buttons + status + progress +
 * errors) got tall enough. Fixed by giving the canvas and the controls
 * region explicit flex RATIOS (CANVAS_HEIGHT_RATIO : CONTROLS_HEIGHT_
 * RATIO, currently 7:3) inside a flex:1 parent - this guarantees the
 * ~70/30 split regardless of content, and the controls region is now
 * wrapped in a ScrollView so any overflow scrolls internally instead
 * of pushing into the canvas's share.
 *
 * Also consolidated what used to be two separate bars (RoboticsToolbar
 * + SimulationControlsBar) into one compact SimHeaderBar - "only one
 * header" per the redesign request, with the speed-preset row hidden
 * behind a collapsible chip instead of permanently visible.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { RoboticsCanvasProvider, useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { RoboticsScene } from '../scene/RoboticsScene';
import { SimHeaderBar } from '../ui/SimHeaderBar';
import { JointControlPanel } from '../ui/JointControlPanel';
import { RobotProgramEditor } from '../ui/RobotProgramEditor';
import { DEFAULT_CAM_POSITION } from '../core/robotConstants';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  COMPACT_TOUCH_TARGET,
  CANVAS_HEIGHT_RATIO,
  CONTROLS_HEIGHT_RATIO,
} from '../core/theme';
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

  return (
    <View style={styles.container}>
      <SimHeaderBar onResetBox={() => engine.resetBox()} />

      <View style={styles.canvasArea}>
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

      <View style={styles.controlsArea}>
        <ControlTabs activeTab={activeTab} onChange={setActiveTab} />
        <ScrollView style={styles.controlsScroll} keyboardShouldPersistTaps="handled">
          {activeTab === TABS.MANUAL ? <JointControlPanel /> : <RobotProgramEditor />}
        </ScrollView>
      </View>
    </View>
  );
}

export function RobotSimulatorScreen() {
  return (
    <RoboticsCanvasProvider presetId="industrial_glb_arm">
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
    flex: CANVAS_HEIGHT_RATIO,
  },
  controlsArea: {
    flex: CONTROLS_HEIGHT_RATIO,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlsScroll: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
  },
  tab: {
    flex: 1,
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.sm,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
});
