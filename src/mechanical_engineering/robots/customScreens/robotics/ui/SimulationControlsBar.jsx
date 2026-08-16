/**
 * SimulationControlsBar.jsx
 *
 * Global simulation clock controls - Play, Pause, Stop, Step frame,
 * and speed presets (Slow motion / Normal / 2x / 5x / 10x). Governs
 * the overall simulation clock via RobotEngine's play()/pause()/
 * stop()/stepFrame()/setSpeed() - separate from (and sits above) the
 * Program tab's own Run/Stop. Pausing here freezes motion
 * interpolation, box physics, AND program execution together, not
 * just a running program - works the same in Manual or Program tabs.
 *
 * Step frame is disabled while playing (advancing one tick only makes
 * sense once the clock is already stopped/paused).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { PLAYBACK_STATES, SPEED_PRESETS } from '../core/robotConstants';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, TOUCH_TARGET_MIN } from '../core/theme';

export function SimulationControlsBar() {
  const { engine, playbackState } = useRoboticsCanvas();
  const { state, speed } = playbackState;

  const isPlaying = state === PLAYBACK_STATES.PLAYING;

  return (
    <View style={styles.container}>
      <View style={styles.transportRow}>
        <TouchableOpacity
          style={[styles.transportButton, isPlaying && styles.transportButtonActive]}
          onPress={() => engine.play()}
        >
          <Text style={styles.transportIcon}>▶</Text>
          <Text style={styles.transportLabel}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.transportButton,
            state === PLAYBACK_STATES.PAUSED && styles.transportButtonActive,
          ]}
          onPress={() => engine.pause()}
          disabled={!isPlaying}
        >
          <Text style={[styles.transportIcon, !isPlaying && styles.disabledText]}>⏸</Text>
          <Text style={[styles.transportLabel, !isPlaying && styles.disabledText]}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.transportButton,
            state === PLAYBACK_STATES.STOPPED && styles.transportButtonActive,
          ]}
          onPress={() => engine.stop()}
        >
          <Text style={styles.transportIcon}>■</Text>
          <Text style={styles.transportLabel}>Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.transportButton}
          onPress={() => engine.stepFrame()}
          disabled={isPlaying}
        >
          <Text style={[styles.transportIcon, isPlaying && styles.disabledText]}>⏭</Text>
          <Text style={[styles.transportLabel, isPlaying && styles.disabledText]}>Step</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.speedRow}>
        {SPEED_PRESETS.map((preset) => {
          const isActive = speed === preset.value;
          return (
            <TouchableOpacity
              key={preset.value}
              style={[styles.speedButton, isActive && styles.speedButtonActive]}
              onPress={() => engine.setSpeed(preset.value)}
            >
              <Text style={[styles.speedButtonText, isActive && styles.speedButtonTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transportRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  transportButton: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transportButtonActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  transportIcon: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  transportLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  disabledText: {
    opacity: 0.35,
  },
  speedRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  speedButton: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN - 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  speedButtonActive: {
    backgroundColor: COLORS.accent2Soft,
    borderColor: COLORS.accent2,
  },
  speedButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  speedButtonTextActive: {
    color: COLORS.accent2Text,
  },
});
