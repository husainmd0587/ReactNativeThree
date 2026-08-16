/**
 * JointControlPanel.jsx
 *
 * Shows ONE joint's control at a time (the selected joint), not a long
 * list of every joint's slider at once. Which joint is "selected" is
 * shared robot state (state.selectedJointId, already tracked by
 * RobotState/RobotEngine) - a dropdown on the right lets the user pick
 * a different joint to jog.
 *
 * The joint value itself is set with the app's real draggable Slider
 * component (utils/ThreeJs_Utils/slider.js), imported the same way as
 * CanvaProvider. Its min/max are bound to the selected joint's limits,
 * and it stays in sync with engine-driven motion too (program
 * execution, HOME, etc.) since its `value` prop tracks live state, not
 * just manual drags.
 *
 * The -/+ buttons alongside it still behave like a TV remote's channel
 * button (tap = one STEP, hold = repeat) for fine single-degree
 * nudges the slider's drag precision can't easily hit. Uses Reanimated
 * for the press-scale feedback and the dropdown's open animation - the
 * app already has Reanimated available (see CanvaProvider's gesture
 * handling), so this stays on the same animation system.
 *
 * IMPORT PATH NOTE: adjust to match this file's actual location if it
 * differs from what's shown here (same depth as CanvaProvider's import
 * in the screens).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import Slider from '../../../../../utils/ThreeJs_Utils/slider';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, TOUCH_TARGET_MIN } from '../core/theme';

const STEP = 5;
const HOLD_DELAY_MS = 350; // time before repeat kicks in, like a remote button
const REPEAT_INTERVAL_MS = 90; // repeat rate once held

/** Remote-style button: tap-and-hold-repeat behavior plus a Reanimated press-scale. */
function RemoteButton({ label, onPressIn, onPressOut }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 14, stiffness: 320 });
    onPressIn();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
    onPressOut();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text style={styles.buttonText}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function JointControlPanel() {
  const { engine, state } = useRoboticsCanvas();
  const { definition, jointValues, selectedJointId } = state;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Kept fresh every render so the hold-repeat interval always reads
  // the latest joint value instead of one captured when the press began.
  const jointValuesRef = useRef(jointValues);
  jointValuesRef.current = jointValues;

  const holdRef = useRef({ timeoutId: null, intervalId: null });

  const dropdownProgress = useSharedValue(0);

  useEffect(() => stopHold, []);

  const selectedJoint = definition
    ? definition.joints.find((j) => j.id === selectedJointId) ?? definition.joints[0]
    : null;
  const value = selectedJoint ? Math.round(jointValues[selectedJoint.id] ?? 0) : 0;

  useEffect(() => {
    dropdownProgress.value = withTiming(dropdownOpen ? 1 : 0, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dropdownProgress.value * 90}deg` }],
  }));
  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownProgress.value,
    transform: [{ translateY: (1 - dropdownProgress.value) * -6 }],
  }));

  if (!definition || !selectedJoint) return null;

  function applyStep(direction) {
    const current = jointValuesRef.current[selectedJoint.id] ?? 0;
    engine.setJointValue(selectedJoint.id, current + direction * STEP);
  }

  function stopHold() {
    clearTimeout(holdRef.current.timeoutId);
    clearInterval(holdRef.current.intervalId);
    holdRef.current.timeoutId = null;
    holdRef.current.intervalId = null;
  }

  function startHold(direction) {
    applyStep(direction); // immediate single-tap step
    holdRef.current.timeoutId = setTimeout(() => {
      holdRef.current.intervalId = setInterval(() => applyStep(direction), REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  const selectJoint = (jointId) => {
    engine.setSelectedJoint(jointId);
    setDropdownOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>
          {selectedJoint.name} ({value}°)
        </Text>

        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setDropdownOpen((open) => !open)}
        >
          <Text style={styles.dropdownTriggerText}>{selectedJoint.name}</Text>
          <Animated.Text style={[styles.chevron, chevronStyle]}>›</Animated.Text>
        </TouchableOpacity>
      </View>

      {dropdownOpen && (
        <Animated.View style={[styles.dropdownList, dropdownStyle]}>
          {definition.joints.map((joint) => {
            const isActive = joint.id === selectedJoint.id;
            return (
              <TouchableOpacity
                key={joint.id}
                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                onPress={() => selectJoint(joint.id)}
              >
                <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                  {joint.name}
                </Text>
                <Text style={styles.dropdownItemValue}>
                  {Math.round(jointValues[joint.id] ?? 0)}°
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      <View style={styles.controls}>
        <RemoteButton label="-" onPressIn={() => startHold(-1)} onPressOut={stopHold} />

        <View style={styles.sliderWrap}>
          <Slider
            key={selectedJoint.id}
            value={value}
            minimumValue={selectedJoint.limits.min}
            maximumValue={selectedJoint.limits.max}
            step={1}
            minimumTrackTintColor={COLORS.accent2}
            maximumTrackTintColor={COLORS.surfaceRaised}
            thumbTintColor={COLORS.accent2}
            trackThickness={8}
            thumbWidth={18}
            thumbHeight={28}
            thumbBorderRadius={6}
            onValueChange={(v) => engine.setJointValue(selectedJoint.id, v)}
          />
        </View>

        <RemoteButton label="+" onPressIn={() => startHold(1)} onPressOut={stopHold} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET_MIN,
    backgroundColor: COLORS.surfaceRaised,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  dropdownTriggerText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  chevron: {
    color: COLORS.accentText,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  dropdownList: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.accentSoft,
  },
  dropdownItemText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  dropdownItemTextActive: {
    color: COLORS.accentText,
    fontWeight: FONT_WEIGHT.bold,
  },
  dropdownItemValue: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  sliderWrap: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
});
