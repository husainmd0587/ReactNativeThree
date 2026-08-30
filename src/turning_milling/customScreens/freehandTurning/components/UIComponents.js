import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

export function PowerToggleButton({ isOn, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.powerToggle, isOn ? styles.powerOn : styles.powerOff]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.powerToggleInner}>
        <Text style={[styles.powerToggleText, isOn ? styles.powerTextOn : styles.powerTextOff]}>
          {isOn ? 'I' : 'O'}
        </Text>
      </View>
      <View style={[styles.powerIndicator, isOn ? styles.powerIndicatorOn : styles.powerIndicatorOff]} />
    </TouchableOpacity>
  );
}

// ── Power switch, mounted at the machine ──────────────────────
// The header toggle was disconnected from the thing it controls --
// on a real lathe the power switch lives on the machine, not in a
// menu bar. This renders the same I/O toggle but positioned by the
// caller (via `style`) right next to the motor housing in the 2D
// view, with a small "POWER" plate label so it still reads as a
// control and not stray UI floating over the workshop background.
export function MotorPowerSwitch({ isOn, onPress, style }) {
  return (
    <View style={[styles.motorSwitchWrap, style]} pointerEvents="box-none">
      <Text style={styles.motorSwitchLabel}>Power</Text>
      <PowerToggleButton isOn={isOn} onPress={onPress} />
    </View>
  );
}

export function MagazineToggleButton({ isOpen, onPress, tool }) {
  return (
    <TouchableOpacity
      style={[styles.magazineToggle, isOpen && styles.magazineToggleOpen]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.toggleContent}>
        <Text style={styles.toggleIcon}>🛠️</Text>
        <Text style={styles.toggleLabel}>Tool Magazine</Text>
        <View style={styles.toggleBadge}>
          <Text style={styles.toggleBadgeText}>{tool.name}</Text>
        </View>
        <Text style={[styles.toggleArrow, isOpen && styles.toggleArrowOpen]}>▼</Text>
      </View>
    </TouchableOpacity>
  );
}

export function MagazineCloseButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.magazineCloseBtn} onPress={onPress}>
      <Text style={styles.magazineCloseText}>✕</Text>
    </TouchableOpacity>
  );
}
