/**
 * SimHeaderBar.jsx
 *
 * ONE compact header row replacing the previous stack of
 * RoboticsToolbar + SimulationControlsBar. Now floats as a
 * semi-transparent overlay on top of a full-bleed 3D canvas (see
 * RobotSimulatorScreen.jsx) rather than sitting in a docked opaque bar
 * above it - the model should be visible through it, not pushed down
 * by it. This is also now the ONLY header shown on the simulator
 * screen - the native stack header is hidden there (headerShown:
 * false in the navigator), so this includes its own back button.
 *
 * Deliberately dense: icon-only transport buttons, short labels,
 * COMPACT_TOUCH_TARGET-sized controls. Speed presets (Slow motion/
 * Normal/2x/5x/10x) are hidden behind a small "Speed" chip that
 * expands a row of choices on tap and collapses again on selection -
 * they don't need to be permanently visible taking up screen space
 * the model should have.
 *
 * `showActions` (default true) hides the Grip/Reset buttons - used in
 * program mode, where there's no manual override of what a running
 * program is doing; only the simulation clock (Play/Pause/Stop/Step/
 * Speed) stays relevant there.
 *
 * Still drives the exact same engine calls as before: play/pause/
 * stop/stepFrame/setSpeed for the simulation clock, setGrip/resetBox
 * for the gripper and box.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { GRIP_STATES, PLAYBACK_STATES, SPEED_PRESETS } from '../core/robotConstants';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, COMPACT_TOUCH_TARGET } from '../core/theme';

function IconButton({ icon, active, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.iconButton, active && styles.iconButtonActive, disabled && styles.iconButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.iconText, disabled && styles.disabledText]}>{icon}</Text>
    </TouchableOpacity>
  );
}

function SpeedChip({ speed, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = SPEED_PRESETS.find((p) => p.value === speed) || SPEED_PRESETS[1];

  return (
    <View>
      <TouchableOpacity style={styles.speedChip} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.speedChipText}>{current.label}</Text>
        <Text style={styles.speedChevron}>{open ? '⌄' : '›'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.speedDropdown}>
          {SPEED_PRESETS.map((preset) => {
            const isActive = preset.value === speed;
            return (
              <TouchableOpacity
                key={preset.value}
                style={[styles.speedOption, isActive && styles.speedOptionActive]}
                onPress={() => {
                  onSelect(preset.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.speedOptionText, isActive && styles.speedOptionTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function SimHeaderBar({ onResetBox, showActions = true }) {
  const navigation = useNavigation();
  const { engine, state, playbackState } = useRoboticsCanvas();
  const { state: clockState, speed } = playbackState;
  const isPlaying = clockState === PLAYBACK_STATES.PLAYING;

  const toggleGrip = () => {
    engine.setGrip(state.grip === GRIP_STATES.OPEN ? GRIP_STATES.CLOSED : GRIP_STATES.OPEN);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.transportGroup}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <IconButton icon="▶" active={isPlaying} onPress={() => engine.play()} />
        <IconButton
          icon="⏸"
          active={clockState === PLAYBACK_STATES.PAUSED}
          disabled={!isPlaying}
          onPress={() => engine.pause()}
        />
        <IconButton
          icon="■"
          active={clockState === PLAYBACK_STATES.STOPPED}
          onPress={() => engine.stop()}
        />
        <IconButton icon="⏭" disabled={isPlaying} onPress={() => engine.stepFrame()} />
        <SpeedChip speed={speed} onSelect={(v) => engine.setSpeed(v)} />
      </View>

      {showActions && (
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.smallButton} onPress={onResetBox}>
            <Text style={styles.smallButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gripButton} onPress={toggleGrip}>
            <Text style={styles.gripButtonText}>
              {state.grip === GRIP_STATES.OPEN ? 'Close Grip' : 'Open Grip'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.overlay,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
    borderRadius: RADII.md,
  },
  transportGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backButton: {
    width: COMPACT_TOUCH_TARGET,
    height: COMPACT_TOUCH_TARGET,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceRaised,
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  iconButton: {
    width: COMPACT_TOUCH_TARGET,
    height: COMPACT_TOUCH_TARGET,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceRaised,
  },
  iconButtonActive: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  iconText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
  },
  disabledText: {
    opacity: 0.6,
  },
  speedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: COMPACT_TOUCH_TARGET,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
    gap: 2,
  },
  speedChipText: {
    color: COLORS.accent2Text,
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.bold,
  },
  speedChevron: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  speedDropdown: {
    position: 'absolute',
    top: COMPACT_TOUCH_TARGET + 2,
    left: 0,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 20,
    minWidth: 110,
  },
  speedOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  speedOptionActive: {
    backgroundColor: COLORS.accentSoft,
  },
  speedOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  speedOptionTextActive: {
    color: COLORS.accentText,
    fontWeight: FONT_WEIGHT.bold,
  },
  smallButton: {
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
  },
  smallButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.bold,
  },
  gripButton: {
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.accent,
  },
  gripButtonText: {
    color: '#1a0f05',
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.black,
  },
});
