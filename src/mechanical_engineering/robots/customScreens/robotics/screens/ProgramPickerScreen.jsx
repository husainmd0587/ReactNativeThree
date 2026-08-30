/**
 * ProgramPickerScreen.jsx
 *
 * Reached only via SimulatorModeSelectScreen's "Run a Program" card.
 * Lists saved programs; tapping one navigates straight into
 * RobotSimulatorScreen in program mode with autorun - no editing
 * happens from here. "Edit" opens ProgramEditorScreen instead (the
 * only place editing happens). "+ New" also goes to ProgramEditorScreen,
 * since a brand new program needs writing before it can run.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listSavedPrograms } from '../core/programStorage';
import { getDialect } from '../engine/dialects';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT, COMPACT_TOUCH_TARGET } from '../core/theme';

export function ProgramPickerScreen({ navigation }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refresh every time this screen comes back into focus (e.g. after
  // saving a new one in ProgramEditorScreen and navigating back).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listSavedPrograms().then((list) => {
        if (!cancelled) {
          setPrograms(list);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Program</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('ProgramEditor', { programId: null })}
        >
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {!loading && programs.length === 0 && (
        <Text style={styles.emptyText}>No saved programs yet - tap + New to write one.</Text>
      )}

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowInfo}
              onPress={() =>
                navigation.navigate('RobotSimulator', {
                  mode: 'program',
                  programId: item.id,
                  autorun: true,
                })
              }
            >
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>{getDialect(item.dialect).label}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('ProgramEditor', { programId: item.id })}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.black,
  },
  newButton: {
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.accent,
  },
  newButtonText: {
    color: '#1a0f05',
    fontWeight: FONT_WEIGHT.black,
    fontSize: FONT_SIZE.xs,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  rowInfo: {
    flex: 1,
    paddingVertical: SPACING.md,
  },
  rowName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  rowMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  editButton: {
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
  },
  editButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
});
