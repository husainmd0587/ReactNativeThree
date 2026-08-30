/**
 * RoboticsHomeScreen.jsx
 *
 * Entry point for the Robotics module. Cards for the Simulator,
 * Builder, Language Reference (dialect syntax docs), and New Program
 * (template-based program creation). Uses the shared theme tokens
 * (core/theme.js) for consistent sizing across the whole module.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, CARD_SHADOW } from '../core/theme';

function HomeCard({ icon, title, description, onPress, disabled, accentColor = COLORS.accent }) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      {!disabled && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

export function RoboticsHomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Robotics</Text>
      <Text style={styles.subheader}>Simulate, program, and learn industrial robot arms</Text>

      <Text style={styles.sectionLabel}>Simulate</Text>
      <HomeCard
        icon="🦾"
        title="Robot Simulator"
        description="Jog joints manually or run a program - Fanuc, ABB, KUKA, or the built-in language"
        onPress={() => navigation.navigate('SimulatorModeSelect')}
      />
      <HomeCard
        icon="🛠"
        title="Interactive Robot Builder"
        description="Preview and inspect a robot's joints and links"
        onPress={() => navigation.navigate('RobotBuilder')}
        accentColor={COLORS.accent2}
      />

      <Text style={styles.sectionLabel}>Program</Text>
      <HomeCard
        icon="🤖"
        title="Pick & Drop Wizard"
        description="Jog the real arm to the box and drop zone, capture both poses, auto-generate a working program"
        onPress={() => navigation.navigate('PickDropWizard')}
        accentColor={COLORS.success}
      />
      <HomeCard
        icon="✚"
        title="New Program"
        description="Start from a template - Pick and Place, Welding Pass, or blank"
        onPress={() => navigation.navigate('NewProgram')}
        accentColor={COLORS.success}
      />
      <HomeCard
        icon="📖"
        title="Language Reference"
        description="Full syntax for Simple, Fanuc, ABB, and KUKA"
        onPress={() => navigation.navigate('LanguageReference')}
        accentColor={COLORS.accent2}
      />

      <Text style={styles.sectionLabel}>Learn</Text>
      <HomeCard
        icon="🎓"
        title="Learn Robotics"
        description="Lessons on joints, kinematics, and robot programming"
        disabled
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.textPrimary,
  },
  subheader: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...CARD_SHADOW,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: FONT_SIZE.xl,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});
