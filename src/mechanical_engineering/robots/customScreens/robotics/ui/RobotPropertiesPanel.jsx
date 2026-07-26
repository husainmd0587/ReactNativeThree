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

export function RobotPropertiesPanel() {
  const { state } = useRoboticsEngine();
  const { definition, selectedJointId } = state;

  const selectedJoint = definition?.joints.find((j) => j.id === selectedJointId) ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Properties</Text>

      {selectedJoint ? (
        <View>
          <Text style={styles.row}>Name: {selectedJoint.name}</Text>
          <Text style={styles.row}>Type: {selectedJoint.type}</Text>
          <Text style={styles.row}>
            Limits: {selectedJoint.limits.min}° to {selectedJoint.limits.max}°
          </Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>No joint selected</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    color: '#c7cdd6',
    marginBottom: 4,
  },
  placeholder: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
