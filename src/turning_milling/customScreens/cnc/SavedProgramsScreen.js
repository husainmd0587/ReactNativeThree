import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { listPrograms, deleteProgram } from './programStorage';
import { EXAMPLE_PROGRAMS } from './exampleLibrary';

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * SavedProgramsScreen
 *
 * Props:
 *  - onBack: () => void
 *  - onSelectProgram: (program: {id,name,gcode,updatedAt,stockConfig?,isExample?}) => void
 *  - onNewProgram: () => void
 *  - currentProgramId?: string - highlights the currently-open program, if any
 */
export default function SavedProgramsScreen({ onBack, onSelectProgram, onNewProgram, currentProgramId }) {
  const [programs, setPrograms] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listPrograms();
      setPrograms(list);
    } catch (err) {
      setError(String(err?.message || err));
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = (program) => {
    Alert.alert('Delete program?', `"${program.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProgram(program.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Programs</Text>
          <Text style={styles.subtitle}>{programs?.length ?? 0} saved</Text>
        </View>
        <TouchableOpacity onPress={onNewProgram} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>EXAMPLES</Text>
        {EXAMPLE_PROGRAMS.map((example) => (
          <TouchableOpacity
            key={example.id}
            style={styles.card}
            onPress={() => onSelectProgram({ ...example, isExample: true })}
          >
            <View style={styles.cardMain}>
              <Text style={styles.cardName} numberOfLines={1}>
                {example.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={2}>
                {example.description}
              </Text>
            </View>
            <View style={styles.exampleTag}>
              <Text style={styles.exampleTagText}>LOAD</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>MY SAVED PROGRAMS</Text>
        {programs === null ? (
          <View style={styles.center}>
            <ActivityIndicator color="#5aa8ff" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>Couldn't load saved programs: {error}</Text>
        ) : programs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No saved programs yet.</Text>
            <TouchableOpacity onPress={onNewProgram} style={styles.emptyNewBtn}>
              <Text style={styles.emptyNewBtnText}>+ Create your first program</Text>
            </TouchableOpacity>
          </View>
        ) : (
          programs.map((program) => {
            const isOpen = program.id === currentProgramId;
            const lineCount = program.gcode ? program.gcode.split('\n').length : 0;
            return (
              <TouchableOpacity key={program.id} style={[styles.card, isOpen && styles.cardActive]} onPress={() => onSelectProgram(program)}>
                <View style={styles.cardMain}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {program.name}
                    {isOpen ? ' •' : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {lineCount} lines · {fmtDate(program.updatedAt)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(program)}>
                  <Text style={styles.deleteIcon}>🗑</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0b0c0e' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1013',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#22252b',
  },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { color: '#e8eaed', fontSize: 18 },
  titleWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#6b7178', fontSize: 10, marginTop: 1 },
  newBtn: { backgroundColor: '#22c55e', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  newBtnText: { color: '#0b0c0e', fontSize: 11, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  emptyText: { color: '#6b7178', fontSize: 12, marginBottom: 14 },
  emptyNewBtn: { backgroundColor: '#15171b', borderWidth: 1, borderColor: '#22252b', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  emptyNewBtnText: { color: '#5aa8ff', fontSize: 12, fontWeight: '600' },
  list: { padding: 10 },
  sectionLabel: { color: '#6b7178', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  exampleTag: { backgroundColor: '#182131', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 8, marginLeft: 8 },
  exampleTagText: { color: '#5aa8ff', fontSize: 9, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15171b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22252b',
    padding: 12,
    marginBottom: 8,
  },
  cardActive: { borderColor: '#5aa8ff' },
  cardMain: { flex: 1 },
  cardName: { color: '#e8eaed', fontSize: 13, fontWeight: '700' },
  cardMeta: { color: '#6b7178', fontSize: 10, marginTop: 3 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  deleteIcon: { fontSize: 15 },
});
