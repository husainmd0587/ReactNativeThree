/**
 * RoboticsToolbar.jsx
 *
 * Displays the current mode plus a gripper open/close toggle and a box
 * reset button - the simplest possible "pick and drop" controls until
 * real pick/place task logic exists. Buttons use Reanimated for a
 * quick press-scale, consistent with the other robotics UI (see
 * JointControlPanel's RemoteButton and RobotProgramEditor's animated
 * bars).
 *
 * NOTE: styling here uses plain React Native primitives. Swap in the
 * app's real theme/UI components once this module is wired into the
 * existing app.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GRIP_STATES } from '../core/robotConstants';

function PressScaleButton({ style, textStyle, label, onPress }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 14, stiffness: 320 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  };

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[style, animatedStyle]}>
        <Text style={textStyle}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function RoboticsToolbar({ mode, grip, onToggleGrip, onResetBox }) {
  return (
    <View style={styles.container}>
      <View style={styles.modeGroup}>
        <Text style={styles.label}>Mode:</Text>
        <Text style={styles.value}>{mode}</Text>
      </View>

      <View style={styles.actions}>
        {onResetBox && (
          <PressScaleButton
            style={styles.resetButton}
            textStyle={styles.resetButtonText}
            label="Reset Box"
            onPress={onResetBox}
          />
        )}

        {onToggleGrip && (
          <PressScaleButton
            style={styles.gripButton}
            textStyle={styles.gripButtonText}
            label={grip === GRIP_STATES.OPEN ? 'Close Gripper' : 'Open Gripper'}
            onPress={onToggleGrip}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1c1f26',
  },
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#2a2f3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#c7cdd6',
    fontWeight: '700',
    fontSize: 12,
  },
  label: {
    color: '#9aa4b2',
    marginRight: 6,
  },
  value: {
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  gripButton: {
    backgroundColor: '#e8791a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gripButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
