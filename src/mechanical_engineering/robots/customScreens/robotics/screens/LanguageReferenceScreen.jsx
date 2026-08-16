/**
 * LanguageReferenceScreen.jsx
 *
 * A dedicated documentation page: pick a robot programming language
 * (Simple/Fanuc/ABB/KUKA), see everything it supports - syntax,
 * description, and a working example line for each statement. Content
 * comes from core/dialectDocs.js, which is kept in lockstep with what
 * the actual parsers in engine/dialects/ accept.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { DIALECTS } from '../engine/dialects';
import { getDialectDocs } from '../core/dialectDocs';
import { COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT } from '../core/theme';

function DialectTabs({ activeId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
      {Object.values(DIALECTS).map((dialect) => {
        const isActive = dialect.id === activeId;
        return (
          <TouchableOpacity
            key={dialect.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(dialect.id)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{dialect.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function StatementCard({ statement }) {
  return (
    <View style={styles.card}>
      <Text style={styles.syntax}>{statement.syntax}</Text>
      <Text style={styles.statementDescription}>{statement.description}</Text>
      <View style={styles.exampleBox}>
        <Text style={styles.exampleLabel}>Example</Text>
        <Text style={styles.exampleText}>{statement.example}</Text>
      </View>
    </View>
  );
}

export function LanguageReferenceScreen() {
  const [dialectId, setDialectId] = useState('simple');
  const docs = getDialectDocs(dialectId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Language Reference</Text>
        <Text style={styles.subtitle}>What each supported syntax actually parses</Text>
      </View>

      <DialectTabs activeId={dialectId} onSelect={setDialectId} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.dialectLabel}>{docs.label}</Text>
        <Text style={styles.dialectSubtitle}>{docs.subtitle}</Text>
        <Text style={styles.dialectDescription}>{docs.description}</Text>

        {docs.statements.map((statement, i) => (
          <StatementCard key={i} statement={statement} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
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
  },
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabTextActive: {
    color: COLORS.accentText,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  dialectLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  dialectSubtitle: {
    color: COLORS.accentText,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: 2,
  },
  dialectDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    lineHeight: 21,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  syntax: {
    color: COLORS.accentText,
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  statementDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 19,
    marginTop: SPACING.xs,
  },
  exampleBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  exampleLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  exampleText: {
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.sm,
  },
});
