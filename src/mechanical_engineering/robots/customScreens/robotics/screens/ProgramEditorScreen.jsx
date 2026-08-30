/**
 * ProgramEditorScreen.jsx
 *
 * The ONLY place editing happens now - a dedicated, full-height screen
 * with no 3D canvas and no live engine. This is the "professional"
 * separation requested: writing code and watching it run are two
 * different screens, not one screen doing both. Validation uses the
 * robot's static definition (getRobotPreset) directly - the dialect
 * parsers only need joint ids/limits to validate against, not a
 * running RobotEngine instance, so this screen has zero dependency on
 * the simulator's live state.
 *
 * "Run" here means: save (if unsaved), then hand off to
 * RobotSimulatorScreen with { mode: 'program', programId, autorun:
 * true } - actual execution and the live code HUD live over there,
 * never here. This screen is edit-only, always - including while a
 * program by this name happens to be running elsewhere; there is no
 * "running" concept in this screen at all.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { DIALECTS, getDialect } from '../engine/dialects';
import { getRobotPreset } from '../core/robotPresets';
import { saveProgram, getSavedProgram } from '../core/programStorage';
import {
  COLORS,
  SPACING,
  RADII,
  FONT_SIZE,
  FONT_WEIGHT,
  COMPACT_TOUCH_TARGET,
} from '../core/theme';

const ROBOT_DEFINITION = getRobotPreset('industrial_glb_arm');

function DialectSelector({ dialectId, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const current = getDialect(dialectId);

  return (
    <View>
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.dropdownTriggerDisabled]}
        onPress={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <Text style={styles.dropdownTriggerText}>{current.label}</Text>
        <Text style={styles.chevron}>{open ? '⌄' : '›'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {Object.values(DIALECTS).map((dialect) => {
            const isActive = dialect.id === dialectId;
            return (
              <TouchableOpacity
                key={dialect.id}
                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(dialect.id);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                  {dialect.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function ProgramEditorScreen({ route, navigation }) {
  const programId = route?.params?.programId ?? null;

  const [dialectId, setDialectId] = useState('simple');
  const [text, setText] = useState(getDialect('simple').example);
  const [currentProgramId, setCurrentProgramId] = useState(programId);
  const [currentProgramName, setCurrentProgramName] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(!!programId);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    getSavedProgram(programId).then((record) => {
      if (cancelled || !record) return;
      setText(record.text);
      setDialectId(record.dialect);
      setCurrentProgramId(record.id);
      setCurrentProgramName(record.name);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const handleSelectDialect = (id) => {
    setDialectId(id);
    setText(getDialect(id).example);
    setCurrentProgramId(null);
    setCurrentProgramName('');
    setErrors([]);
  };

  const handleValidate = () => {
    const dialect = getDialect(dialectId);
    const { errors: parseErrors } = dialect.parse(text, ROBOT_DEFINITION);
    setErrors(parseErrors);
    return parseErrors;
  };

  const handleSave = async () => {
    const record = await saveProgram({
      id: currentProgramId,
      name: currentProgramName || 'Untitled Program',
      dialect: dialectId,
      text,
    });
    setCurrentProgramId(record.id);
    setCurrentProgramName(record.name);
    return record;
  };

  const handleRunOnSimulator = async () => {
    const parseErrors = handleValidate();
    if (parseErrors.length > 0) return;
    const record = await handleSave();
    navigation?.navigate?.('RobotSimulator', {
      mode: 'program',
      programId: record.id,
      autorun: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const errorLines = new Set(errors.map((e) => e.line));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Program Editor</Text>
          <Text style={styles.subtitle}>{currentProgramName || 'Unsaved'}</Text>
        </View>
        <DialectSelector dialectId={dialectId} onSelect={handleSelectDialect} />
      </View>

      <TextInput
        style={styles.editor}
        value={text}
        onChangeText={setText}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={COLORS.textMuted}
        textAlignVertical="top"
      />

      {errors.length > 0 && (
        <View style={styles.errorList}>
          {errors.slice(0, 4).map((err, i) => (
            <Text key={i} style={styles.errorText}>
              Line {err.line}: {err.message}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleValidate}>
          <Text style={styles.buttonText}>Validate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.runButton]} onPress={handleRunOnSimulator}>
          <Text style={styles.buttonText}>Run on Simulator</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.md,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: COMPACT_TOUCH_TARGET,
    backgroundColor: COLORS.surfaceRaised,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  dropdownTriggerDisabled: {
    opacity: 0.5,
  },
  dropdownTriggerText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  chevron: {
    color: COLORS.accentText,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  dropdownList: {
    position: 'absolute',
    top: COMPACT_TOUCH_TARGET + 4,
    right: 0,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 10,
    minWidth: 150,
  },
  dropdownItem: {
    height: COMPACT_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.accentSoft,
  },
  dropdownItemText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  dropdownItemTextActive: {
    color: COLORS.accentText,
    fontWeight: FONT_WEIGHT.bold,
  },
  editor: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorList: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADII.sm,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  button: {
    flex: 1,
    height: COMPACT_TOUCH_TARGET + 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceRaised,
  },
  runButton: {
    backgroundColor: COLORS.success,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.xs,
  },
});
