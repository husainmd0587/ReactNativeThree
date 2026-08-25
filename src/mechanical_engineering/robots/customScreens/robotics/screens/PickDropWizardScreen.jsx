/**
 * PickDropWizardScreen.jsx
 *
 * The honest way to get a working pick-and-drop program without
 * guessing reach coordinates for geometry nobody has measured: jog
 * the REAL rig (live 3D model, same canvas/engine as the Simulator)
 * to the box, capture that exact joint pose; jog to the drop zone,
 * capture that; then generate a real multi-joint program from those
 * two captured poses in whichever dialect you want (core/
 * programGenerator.js). Every joint moves together, because the
 * captured pose already reflects however many joints the real reach
 * actually needs - nothing here is invented.
 *
 * The live "distance to target" readout comes from
 * RobotEngine.getGripperWorldPosition() (the end effector's real
 * reported world position, same value the pick/drop proximity check
 * already uses) polled on an interval rather than made part of
 * reactive state - it changes every frame during motion, and making
 * it reactive would re-render the whole tree every frame just for
 * this readout.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { RoboticsCanvasProvider, useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { RoboticsScene } from '../scene/RoboticsScene';
import { SimHeaderBar } from '../ui/SimHeaderBar';
import { JointControlPanel } from '../ui/JointControlPanel';
import { DIALECTS } from '../engine/dialects';
import { generatePickDropProgram } from '../core/programGenerator';
import { saveProgram } from '../core/programStorage';
import { DEFAULT_CAM_POSITION, PICK_RADIUS } from '../core/robotConstants';
import {
  COLORS,
  SPACING,
  RADII,
  FONT_SIZE,
  FONT_WEIGHT,
  COMPACT_TOUCH_TARGET,
  CANVAS_HEIGHT_RATIO,
  CONTROLS_HEIGHT_RATIO,
} from '../core/theme';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';

const STEPS = { PICK: 'pick', DROP: 'drop', GENERATE: 'generate' };
const POLL_INTERVAL_MS = 200;

function distance3(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Polls the engine's live gripper position vs a target every 200ms - not reactive state, see file header. */
function useLiveDistance(engine, targetPosition) {
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!targetPosition) return undefined;
    const id = setInterval(() => {
      const gripperPos = engine.getGripperWorldPosition();
      setDistance(distance3(gripperPos, targetPosition));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [engine, targetPosition]);

  return distance;
}

function StepHeader({ step }) {
  const labels = {
    [STEPS.PICK]: ['Step 1 of 3', 'Jog to the box, then capture'],
    [STEPS.DROP]: ['Step 2 of 3', 'Jog to the drop zone, then capture'],
    [STEPS.GENERATE]: ['Step 3 of 3', 'Generate and save the program'],
  };
  const [eyebrow, title] = labels[step];
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.stepEyebrow}>{eyebrow}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function DistanceReadout({ distance }) {
  if (distance === null) return null;
  const inRange = distance <= PICK_RADIUS;
  return (
    <View style={[styles.distanceBox, inRange && styles.distanceBoxInRange]}>
      <Text style={[styles.distanceText, inRange && styles.distanceTextInRange]}>
        Distance to target: {distance.toFixed(3)} {inRange ? '✓ within pick radius' : ''}
      </Text>
    </View>
  );
}

function DialectPicker({ dialectId, onSelect }) {
  return (
    <View style={styles.dialectRow}>
      {Object.values(DIALECTS).map((dialect) => {
        const isActive = dialect.id === dialectId;
        return (
          <TouchableOpacity
            key={dialect.id}
            style={[styles.dialectChip, isActive && styles.dialectChipActive]}
            onPress={() => onSelect(dialect.id)}
          >
            <Text style={[styles.dialectChipText, isActive && styles.dialectChipTextActive]}>
              {dialect.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function WizardContent({ navigation }) {
  const { engine, state } = useRoboticsCanvas();
  const [step, setStep] = useState(STEPS.PICK);
  const [pickPose, setPickPose] = useState(null);
  const [dropPose, setDropPose] = useState(null);
  const [dialectId, setDialectId] = useState('simple');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const jointOrder = useMemo(() => state.definition.joints.map((j) => j.id), [state.definition]);

  const target =
    step === STEPS.PICK ? state.box?.position : step === STEPS.DROP ? state.dropZonePosition : null;
  const distance = useLiveDistance(engine, target);

  const capturePose = () => {
    const pose = {};
    jointOrder.forEach((id) => {
      pose[id] = state.jointValues[id] ?? 0;
    });
    if (step === STEPS.PICK) {
      setPickPose(pose);
      setStep(STEPS.DROP);
    } else if (step === STEPS.DROP) {
      setDropPose(pose);
      setStep(STEPS.GENERATE);
    }
  };

  const restart = () => {
    setStep(STEPS.PICK);
    setPickPose(null);
    setDropPose(null);
  };

  const generatedText = useMemo(() => {
    if (!pickPose || !dropPose) return '';
    return generatePickDropProgram(dialectId, jointOrder, pickPose, dropPose, 40);
  }, [dialectId, jointOrder, pickPose, dropPose]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const record = await saveProgram({
      name: name.trim() || 'Pick and Drop',
      dialect: dialectId,
      text: generatedText,
    });
    setSaving(false);
    navigation?.navigate?.('RobotSimulator', { savedProgramId: record.id });
  };

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
        <ScrollView style={styles.controlsScroll} keyboardShouldPersistTaps="handled">
          <StepHeader step={step} />

          {(step === STEPS.PICK || step === STEPS.DROP) && (
            <>
              <DistanceReadout distance={distance} />
              <JointControlPanel />
              <TouchableOpacity style={styles.captureButton} onPress={capturePose}>
                <Text style={styles.captureButtonText}>
                  {step === STEPS.PICK ? 'Capture Pick Pose' : 'Capture Drop Pose'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === STEPS.GENERATE && (
            <View style={styles.generateSection}>
              <Text style={styles.sectionLabel}>Language</Text>
              <DialectPicker dialectId={dialectId} onSelect={setDialectId} />

              <Text style={styles.sectionLabel}>Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Pick and Drop"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.sectionLabel}>Generated Program</Text>
              <ScrollView style={styles.previewBox} nestedScrollEnabled>
                <Text style={styles.previewText}>{generatedText}</Text>
              </ScrollView>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Program'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.restartButton} onPress={restart}>
                <Text style={styles.restartButtonText}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export function PickDropWizardScreen({ navigation }) {
  return (
    <RoboticsCanvasProvider presetId="industrial_glb_arm">
      <WizardContent navigation={navigation} />
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
  stepHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  stepEyebrow: {
    color: COLORS.accentText,
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  distanceBox: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distanceBoxInRange: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.success,
  },
  distanceText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'monospace',
  },
  distanceTextInRange: {
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.bold,
  },
  captureButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    height: COMPACT_TOUCH_TARGET + 6,
    borderRadius: RADII.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonText: {
    color: '#1a0f05',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.black,
  },
  generateSection: {
    padding: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dialectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  dialectChip: {
    paddingHorizontal: SPACING.md,
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialectChipActive: {
    backgroundColor: COLORS.accent2Soft,
    borderColor: COLORS.accent2,
  },
  dialectChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  dialectChipTextActive: {
    color: COLORS.accent2Text,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: COMPACT_TOUCH_TARGET + 6,
    fontSize: FONT_SIZE.sm,
  },
  previewBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    maxHeight: 140,
  },
  previewText: {
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
  },
  saveButton: {
    marginTop: SPACING.md,
    height: COMPACT_TOUCH_TARGET + 6,
    borderRadius: RADII.md,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#062315',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.black,
  },
  restartButton: {
    marginTop: SPACING.sm,
    height: COMPACT_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
});
