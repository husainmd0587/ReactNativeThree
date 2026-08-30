import React, { useCallback } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { COMMAND_CATEGORIES } from '../commands/registry';

// One command's full entry: name, implemented/coming-soon status,
// description, and (for implemented commands) the same step-by-step
// "how to draw it" instructions already shown on the practice screen
// itself — this page is just a browsable index of that same data, plus a
// shortcut straight into practicing it.
function CommandEntry({ command, onPress }) {
  const disabled = !command.implemented;

  return (
    <TouchableOpacity
      style={[styles.entry, disabled && styles.entryDisabled]}
      onPress={() => !disabled && onPress(command)}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.entryTop}>
        <Text style={[styles.entryName, disabled && styles.entryNameDisabled]}>
          {command.name}
        </Text>
        {disabled ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming soon</Text>
          </View>
        ) : (
          <Text style={styles.entryLink}>Practice →</Text>
        )}
      </View>

      <Text style={[styles.entryDesc, disabled && styles.entryDescDisabled]}>
        {command.details || command.description}
      </Text>

      {!disabled && command.steps?.length > 0 && (
        <View style={styles.steps}>
          {command.steps.map((step, i) => (
            <Text key={step} style={styles.stepText}>{i + 1}. {step}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function CategorySection({ category, onSelectCommand }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{category.label.toUpperCase()}</Text>
      {category.commands.map((command) => (
        <CommandEntry key={command.id} command={command} onPress={onSelectCommand} />
      ))}
    </View>
  );
}

export default function CommandReferenceScreen({ navigation }) {
  const handleSelectCommand = useCallback(
    (command) => {
      navigation.navigate('CommandPractice', { commandId: command.id });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Every command, what it does, and how to draw it. Tap any implemented
          command to jump straight into practicing it.
        </Text>
        {COMMAND_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            onSelectCommand={handleSelectCommand}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#F4F3F8' },
  body: { padding: 14, paddingBottom: 32 },
  intro: {
    fontSize: 12,
    color: '#8A8A9A',
    lineHeight: 17,
    marginBottom: 16,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 2,
  },
  entry: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8E6F0',
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  entryDisabled: {
    backgroundColor: '#F7F7F9',
    borderColor: '#EDEDF1',
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  entryName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  entryNameDisabled: { color: '#A6A6B2' },
  entryLink: { fontSize: 11, fontWeight: '700', color: '#2E7DAF' },
  entryDesc: { fontSize: 12, color: '#6B6B78', lineHeight: 17 },
  entryDescDisabled: { color: '#B7B7C0' },
  steps: { marginTop: 4 },
  stepText: { fontSize: 12, color: '#8A8A9A', marginTop: 2, lineHeight: 16 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EFEFF3',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#9A9AA6' },
});
