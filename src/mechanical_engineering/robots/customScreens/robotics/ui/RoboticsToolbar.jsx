/**
 * RoboticsToolbar.jsx
 *
 * Displays the current mode plus a gripper open/close toggle and a box
 * reset button. Buttons use Reanimated for a quick press-scale.
 * Uses shared theme tokens (core/theme.js) for sizing/colors.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GRIP_STATES } from '../core/robotConstants';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, TOUCH_TARGET_MIN } from '../core/theme';

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
        <Text style={styles.label}>Mode</Text>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resetButton: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
  },
  resetButtonText: {
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.sm,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
    textTransform: 'capitalize',
  },
  gripButton: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
  },
  gripButtonText: {
    color: '#1a0f05',
    fontWeight: FONT_WEIGHT.black,
    fontSize: FONT_SIZE.sm,
  },
});
