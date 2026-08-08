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
            minimumTrackTintColor="#5b8dd6"
            maximumTrackTintColor="#2a2f3a"
            thumbTintColor="#5b8dd6"
            trackThickness={6}
            thumbWidth={14}
            thumbHeight={22}
            thumbBorderRadius={5}
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
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2f3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  dropdownTriggerText: {
    color: '#c7cdd6',
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    color: '#e8791a',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownList: {
    backgroundColor: '#14161b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f3a',
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1f26',
  },
  dropdownItemActive: {
    backgroundColor: '#e8791a22',
  },
  dropdownItemText: {
    color: '#c7cdd6',
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: '#e8791a',
    fontWeight: '700',
  },
  dropdownItemValue: {
    color: '#6b7280',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2f3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  sliderWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
});
