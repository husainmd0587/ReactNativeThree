/**
 * SimulatorModeSelectScreen.jsx
 *
 * Manual vs Program is now decided HERE, before entering the
 * simulator - not via in-screen tabs. RobotSimulatorScreen reads
 * route.params.mode and renders accordingly; there's no way to switch
 * modes once inside (matches the "decide before enter in screen"
 * request, and avoids the layout ever needing to accommodate both a
 * manual jog panel AND a program view competing for the same screen).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, CARD_SHADOW } from '../core/theme';

function ModeCard({ icon, title, description, onPress, accentColor }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export function SimulatorModeSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Robot Simulator</Text>
      <Text style={styles.subheader}>Choose how you want to work with the arm</Text>

      <ModeCard
        icon="🕹"
        title="Manual Control"
        description="Jog joints directly with live sliders - full-screen model view"
        accentColor={COLORS.accent2}
        onPress={() => navigation.navigate('RobotSimulator', { mode: 'manual' })}
      />

      <ModeCard
        icon="▶"
        title="Run a Program"
        description="Pick a saved program and watch it run - Fanuc, ABB, KUKA, or Simple"
        accentColor={COLORS.success}
        onPress={() => navigation.navigate('ProgramPicker')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.lg,
  },
  header: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.textPrimary,
  },
  subheader: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...CARD_SHADOW,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: FONT_SIZE.xl,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});
