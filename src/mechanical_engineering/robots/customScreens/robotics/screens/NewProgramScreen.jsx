/**
 * NewProgramScreen.jsx
 *
 * A dedicated program-creation flow: pick a starter template (Blank /
 * Pick and Place / Welding Pass), pick a language, name it, and save.
 * This is separate from the inline "New" button in RobotProgramEditor
 * (which just clears the current editor to a blank example) - this is
 * the guided path for creating a proper named, saved program from a
 * template.
 *
 * Saves directly via core/programStorage.js (same storage the
 * Program tab's file manager reads from), then returns to the
 * Robotics home screen - open the new program from there via the
 * Simulator's Program tab -> Open. (Deep-linking straight into the
 * editor with the new program pre-loaded would need the editor's
 * text/dialect state lifted out of RobotProgramEditor into shared
 * context - a reasonable next step, not done here to keep this screen
 * decoupled from the editor's internals.)
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { DIALECTS } from '../engine/dialects';
import { listTemplates, getTemplate } from '../core/programTemplates';
import { saveProgram } from '../core/programStorage';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT } from '../core/theme';

function TemplateCard({ template, isActive, onPress }) {
  return (
    <TouchableOpacity style={[styles.templateCard, isActive && styles.templateCardActive]} onPress={onPress}>
      <Text style={styles.templateIcon}>{template.icon}</Text>
      <View style={styles.templateInfo}>
        <Text style={styles.templateLabel}>{template.label}</Text>
        <Text style={styles.templateDescription}>{template.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

function DialectPicker({ dialectId, onSelect }) {
  return (
    <View style={styles.dialectRow}>
      {Object.values(DIALECTS).map((dialect) => {
        const isActive = dialect.id === dialectId;
        return (
          <TouchableOpacity
            key={dialect.id}
            style={[styles.dialectChip, isActive && styles.dialectChipActive]}
            onPress={() => onSelect(dialect.id)}
          >
            <Text style={[styles.dialectChipText, isActive && styles.dialectChipTextActive]}>
              {dialect.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function NewProgramScreen({ navigation }) {
  const [templateId, setTemplateId] = useState('pick_place');
  const [dialectId, setDialectId] = useState('simple');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const templates = listTemplates();
  const selectedTemplate = getTemplate(templateId);

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);

    const record = await saveProgram({
      name: name.trim() || selectedTemplate.label,
      dialect: dialectId,
      text: selectedTemplate.textByDialect[dialectId],
    });

    setSaving(false);

    Alert.alert(
      'Program Created',
      `"${record.name}" was saved. Open it from the Simulator's Program tab \u2192 Open.`,
      [{ text: 'OK', onPress: () => navigation?.goBack?.() }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Program</Text>
      <Text style={styles.subtitle}>Start from a template, pick a language, name it</Text>

      <Text style={styles.sectionLabel}>Template</Text>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isActive={template.id === templateId}
          onPress={() => setTemplateId(template.id)}
        />
      ))}

      <Text style={styles.sectionLabel}>Language</Text>
      <DialectPicker dialectId={dialectId} onSelect={setDialectId} />

      <Text style={styles.sectionLabel}>Name</Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder={selectedTemplate.label}
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.sectionLabel}>Preview</Text>
      <ScrollView style={styles.previewBox} nestedScrollEnabled>
        <Text style={styles.previewText}>{selectedTemplate.textByDialect[dialectId]}</Text>
      </ScrollView>

      <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={saving}>
        <Text style={styles.createButtonText}>{saving ? 'Saving…' : 'Create Program'}</Text>
      </TouchableOpacity>
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
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.black,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
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
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  templateCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  templateIcon: {
    fontSize: FONT_SIZE.xxl,
    marginRight: SPACING.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  templateDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  dialectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dialectChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialectChipActive: {
    backgroundColor: COLORS.accent2Soft,
    borderColor: COLORS.accent2,
  },
  dialectChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  dialectChipTextActive: {
    color: COLORS.accent2Text,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
  },
  previewBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    maxHeight: 220,
  },
  previewText: {
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.sm,
    lineHeight: 19,
  },
  createButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  createButtonText: {
    color: '#1a0f05',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.black,
  },
});
