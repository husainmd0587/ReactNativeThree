/**
 * RobotPropertiesPanel.jsx
 *
 * Placeholder properties panel for the Robot Builder screen. This phase
 * only shows the selected joint's name and limits, read-only. Editing
 * (add/remove/update joint & link, edit limits/axis, attach end
 * effector) is implemented in the next phase's RobotBuilder module.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoboticsEngine } from '../providers/RoboticsEngineProvider';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT } from '../core/theme';

export function RobotPropertiesPanel() {
  const { state } = useRoboticsEngine();
  const { definition, selectedJointId } = state;

  const selectedJoint = definition?.joints.find((j) => j.id === selectedJointId) ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Properties</Text>

      {selectedJoint ? (
        <View style={styles.card}>
          <PropertyRow label="Name" value={selectedJoint.name} />
          <PropertyRow label="Type" value={selectedJoint.type} />
          <PropertyRow label="Limits" value={`${selectedJoint.limits.min}° to ${selectedJoint.limits.max}°`} />
        </View>
      ) : (
        <Text style={styles.placeholder}>No joint selected</Text>
      )}
    </View>
  );
}

function PropertyRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs + 2,
  },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'monospace',
  },
  placeholder: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    fontStyle: 'italic',
  },
});
