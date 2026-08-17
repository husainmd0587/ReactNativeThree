import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import CommandList from '../components/CommandList';
import { COMMAND_CATEGORIES } from '../commands/registry';

export default function CADPracticeHome({ navigation }) {
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
        <CommandList
          categories={COMMAND_CATEGORIES}
          onSelectCommand={handleSelectCommand}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#F4F3F8' },
  body: { padding: 14, paddingBottom: 32 },
});
