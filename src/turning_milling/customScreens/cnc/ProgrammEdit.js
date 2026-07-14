import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Share, Alert } from 'react-native';
import CodeEditor from './components/CodeEditor';
import GCodeReference from './GCodeReferenceScreen';
import SavedProgramsScreen from './SavedProgramsScreen';
import { saveProgram } from './programStorage';
import { lintProgram, groupIssuesByLine } from './gcodeLinter';

const LINT_DEBOUNCE_MS = 300;

const NEW_PROGRAM_TEMPLATE = `O0000 (NEW PROGRAM)
G21 G90 G95
T0101
G97 S1000 M3

; Write your program here


M5
M30`;

/**
 * ProgrammEdit
 *
 * A full manual G-code editing screen: scrollable syntax-highlighted textarea,
 * G/M-code autocomplete, live error/warning tracking (debounced re-lint on every
 * change), Save, and Download (share sheet export).
 *
 * NAVIGATION: this component is deliberately navigation-library-agnostic. It takes
 * `onSave(newGcode)` and `onCancel()` callbacks rather than assuming React
 * Navigation, Expo Router, or anything else.
 *   - If you're swapping it in via local state (like CncSimulatorPro does by
 *     default), just flip a boolean and pass the callbacks directly.
 *   - If you have a real navigator, wire it as:
 *       navigation.navigate('ProgrammEdit', {
 *         initialGcode: gcode,
 *         onSave: (newGcode, stockConfigOverride) => { setGcode(newGcode); if (stockConfigOverride) setStockConfig(stockConfigOverride); navigation.goBack(); },
 *         onCancel: () => navigation.goBack(),
 *       })
 *     and read `route.params` for the props instead.
 *
 * Props:
 *  - initialGcode: string
 *  - programName?: string
 *  - onSave: (newGcode: string, stockConfigOverride: object|null) => void -
 *    stockConfigOverride is set when the loaded content came from an example
 *    with its own tuned stock size/settings; null means "keep using whatever
 *    stockConfig the simulator is already using"
 *  - onCancel: () => void
 */
export default function ProgrammEdit({ initialGcode = '', programName = 'UNTITLED.NC', onSave, onCancel }) {
  const [code, setCode] = useState(initialGcode);
  const [baselineCode, setBaselineCode] = useState(initialGcode); // resets whenever a program is loaded/created/saved, NOT the same as initialGcode after switching programs
  const [programId, setProgramId] = useState(null); // null = not yet saved to the library
  const [name, setName] = useState(programName);
  const [editingName, setEditingName] = useState(false);
  const [issues, setIssues] = useState([]);
  const [showIssueList, setShowIssueList] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showProgramsList, setShowProgramsList] = useState(false);
  // Set when an EXAMPLE (not a user-saved program) is loaded - examples carry
  // their own tuned stockConfig (e.g. the boring example needs a different
  // boreThreshold than the app default), which needs to reach the simulator
  // alongside the gcode when Save is pressed.
  const [stockConfigOverride, setStockConfigOverride] = useState(null);
  const dirty = code !== baselineCode;

  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIssues(lintProgram(code));
    }, LINT_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [code]);

  const issuesByLine = useMemo(() => groupIssuesByLine(issues), [issues]);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const handleCancel = () => {
    if (!dirty) return onCancel?.();
    Alert.alert('Discard changes?', 'You have unsaved edits to this program.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => onCancel?.() },
    ]);
  };

  const handleSave = () => {
    const doSave = async () => {
      try {
        const savedId = await saveProgram({ id: programId, name, gcode: code });
        setProgramId(savedId);
        setBaselineCode(code);
      } catch (err) {
        Alert.alert('Could not save to library', String(err?.message || err));
      }
      onSave?.(code, stockConfigOverride);
    };

    if (errorCount > 0) {
      Alert.alert(
        `${errorCount} error${errorCount > 1 ? 's' : ''} in program`,
        'Save anyway? The simulator may not run correctly until these are fixed.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Save anyway', onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  };

  const handleSelectProgram = (program) => {
    setCode(program.gcode);
    setBaselineCode(program.gcode);
    // Examples are read-only templates - loading one is "start from a copy", not
    // "resume editing the original", so it doesn't inherit the example's id.
    setName(program.isExample ? `${program.name} (copy)` : program.name);
    setProgramId(program.isExample ? null : program.id);
    setStockConfigOverride(program.stockConfig ?? null);
    setShowProgramsList(false);
  };

  const handleNewProgram = () => {
    const openBlank = () => {
      setCode(NEW_PROGRAM_TEMPLATE);
      setBaselineCode(NEW_PROGRAM_TEMPLATE);
      setName('NEW_PROGRAM.NC');
      setProgramId(null);
      setStockConfigOverride(null);
      setShowProgramsList(false);
    };
    if (dirty) {
      Alert.alert('Discard changes?', 'Starting a new program will discard your unsaved edits.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: openBlank },
      ]);
    } else {
      openBlank();
    }
  };

  const handleDownload = async () => {
    try {
      await Share.share({ message: code, title: name });
    } catch (err) {
      Alert.alert('Could not share program', String(err?.message || err));
    }
  };

  if (showReference) {
    return <GCodeReference onBack={() => setShowReference(false)} />;
  }

  if (showProgramsList) {
    return (
      <SavedProgramsScreen
        onBack={() => setShowProgramsList(false)}
        onSelectProgram={handleSelectProgram}
        onNewProgram={handleNewProgram}
        currentProgramId={programId}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          {editingName ? (
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => setEditingName(false)}
              onSubmitEditing={() => setEditingName(false)}
              autoFocus
              style={styles.titleInput}
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.title} numberOfLines={1}>
                {name}
                {dirty ? ' •' : ''}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.subtitle}>{code.split('\n').length} lines</Text>
        </View>
        <TouchableOpacity onPress={() => setShowReference(true)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDownload} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>⇩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={[styles.actionBtn, styles.saveBtn]}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowProgramsList(true)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🗁</Text>
        </TouchableOpacity>
      </View>

      <CodeEditor value={code} onChangeText={setCode} issuesByLine={issuesByLine} />

      <TouchableOpacity style={styles.statusBar} onPress={() => setShowIssueList((v) => !v)}>
        <Text style={styles.statusText}>
          {errorCount > 0 ? <Text style={styles.statusError}>{errorCount} error{errorCount !== 1 ? 's' : ''}</Text> : <Text style={styles.statusOk}>No errors</Text>}
          {warningCount > 0 ? <Text style={styles.statusWarning}>  ·  {warningCount} warning{warningCount !== 1 ? 's' : ''}</Text> : null}
        </Text>
        <Text style={styles.statusChevron}>{showIssueList ? '▾' : '▴'}</Text>
      </TouchableOpacity>

      {showIssueList && issues.length > 0 ? (
        <View style={styles.issueList}>
          {issues.map((issue, i) => (
            <View key={i} style={styles.issueRow}>
              <View style={[styles.issueDot, issue.severity === 'error' ? styles.dotError : styles.dotWarning]} />
              <Text style={styles.issueLine}>{issue.line > 0 ? `Ln ${issue.line}` : 'Program'}</Text>
              <Text style={styles.issueMsg} numberOfLines={2}>
                {issue.message}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#22252b',
  },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { color: '#e8eaed', fontSize: 18 },
  titleWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 13, fontWeight: '700' },
  titleInput: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#5aa8ff',
    paddingVertical: 0,
  },
  subtitle: { color: '#6b7178', fontSize: 9, marginTop: 1 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6, borderRadius: 6, backgroundColor: '#1c2027' },
  actionIcon: { color: '#c7ccd4', fontSize: 14 },
  saveBtn: { backgroundColor: '#22c55e' },
  saveText: { color: '#0b0c0e', fontSize: 12, fontWeight: '700' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15171b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#22252b',
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusOk: { color: '#4ade80' },
  statusError: { color: '#ef4444' },
  statusWarning: { color: '#f5a524' },
  statusChevron: { color: '#6b7178', fontSize: 10 },
  issueList: { maxHeight: 160, backgroundColor: '#0e1013', paddingHorizontal: 10, paddingVertical: 4 },
  issueRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  issueDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, marginRight: 6 },
  dotError: { backgroundColor: '#ef4444' },
  dotWarning: { backgroundColor: '#f5a524' },
  issueLine: { color: '#5aa8ff', fontSize: 10, fontFamily: 'monospace', width: 46 },
  issueMsg: { color: '#9aa0aa', fontSize: 10, flex: 1 },
});
