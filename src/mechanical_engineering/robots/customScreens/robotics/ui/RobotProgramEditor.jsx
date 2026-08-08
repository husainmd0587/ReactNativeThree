/**
 * RobotProgramEditor.jsx
 *
 * Lets the user write a robot program in one of several syntaxes
 * (Simple/Fanuc/ABB/KUKA - see engine/dialects/) and run it against
 * the simulated arm. Talks only to the RobotEngine via
 * useRoboticsCanvas - loadProgram(text, dialectId) parses+validates
 * using the selected dialect's parser, runProgram() starts stepping
 * through the resulting instructions (RobotEngine.update() does the
 * actual stepping every frame; see engine/RobotEngine.js). Every
 * dialect compiles down to the same instruction set, so switching
 * dialects never changes how the engine runs the program.
 *
 * A plain TextInput can't highlight individual lines, so while a
 * program is running this swaps to a read-only line-by-line view
 * (CodeViewer below). Instead of toggling a style per row, the active
 * line is a single Reanimated bar that slides to the active line's
 * position (withTiming) and auto-scrolls into view - like a CNC
 * controller's moving line indicator. Editing resumes automatically
 * once the program stops. Also shows a Reanimated progress bar for how
 * far through the program execution is.
 *
 * Programs can be saved/opened via AsyncStorage (core/programStorage.js)
 * - same dependency and single-JSON-blob-per-key pattern CanvaProvider
 * already uses for its own settings persistence. ProgramFileManager
 * provides the list/open/delete UI.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';
import { DIALECTS, getDialect } from '../engine/dialects';
import { saveProgram } from '../core/programStorage';
import { ProgramFileManager } from './ProgramFileManager';

const LINE_HEIGHT = 22;

function CodeViewer({ text, activeLine, errorLines }) {
  const scrollRef = useRef(null);
  const lines = text.split('\n');

  const highlightTop = useSharedValue(0);
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (!activeLine) {
      highlightOpacity.value = withTiming(0, { duration: 150 });
      return;
    }
    highlightTop.value = withTiming((activeLine - 1) * LINE_HEIGHT, { duration: 160 });
    highlightOpacity.value = withTiming(1, { duration: 150 });

    if (scrollRef.current) {
      const y = Math.max(0, (activeLine - 1) * LINE_HEIGHT - LINE_HEIGHT * 2);
      scrollRef.current.scrollTo({ y, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLine]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: highlightTop.value }],
    opacity: highlightOpacity.value,
  }));

  return (
    <ScrollView ref={scrollRef} style={styles.codeViewer} showsVerticalScrollIndicator>
      <View style={{ height: lines.length * LINE_HEIGHT }}>
        <Animated.View style={[styles.highlightBar, highlightStyle]} pointerEvents="none" />

        {lines.map((line, i) => {
          const lineNumber = i + 1;
          const isError = errorLines.has(lineNumber);

          return (
            <View
              key={i}
              style={[styles.codeLine, isError && styles.codeLineError]}
            >
              <Text style={styles.lineNumber}>{lineNumber}</Text>
              <Text style={styles.codeText}>{line || ' '}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ProgramProgressBar({ pointer, total }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const pct = total > 0 ? ((pointer + 1) / total) * 100 : 0;
    progress.value = withTiming(pct, { duration: 200 });
  }, [pointer, total, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

/** Same dropdown pattern as JointControlPanel's joint selector, for consistency. */
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

export function RobotProgramEditor() {
  const { engine, programState } = useRoboticsCanvas();
  const [dialectId, setDialectId] = useState('simple');
  const [text, setText] = useState(getDialect('simple').example);

  const [currentProgramId, setCurrentProgramId] = useState(null);
  const [currentProgramName, setCurrentProgramName] = useState('');
  const [saveBarOpen, setSaveBarOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [fileManagerVisible, setFileManagerVisible] = useState(false);

  const handleSelectDialect = (id) => {
    setDialectId(id);
    setText(getDialect(id).example); // each dialect has its own example - mixing syntaxes in one box doesn't make sense
    setCurrentProgramId(null);
    setCurrentProgramName('');
  };

  const handleLoad = () => engine.loadProgram(text, dialectId);
  const handleRun = () => {
    engine.loadProgram(text, dialectId);
    engine.runProgram();
  };
  const handleStop = () => engine.stopProgram();

  const handleNew = () => {
    setText(getDialect(dialectId).example);
    setCurrentProgramId(null);
    setCurrentProgramName('');
  };

  const openSaveBar = () => {
    setSaveNameInput(currentProgramName || '');
    setSaveBarOpen(true);
  };

  const confirmSave = async () => {
    const record = await saveProgram({
      id: currentProgramId,
      name: saveNameInput,
      dialect: dialectId,
      text,
    });
    setCurrentProgramId(record.id);
    setCurrentProgramName(record.name);
    setSaveBarOpen(false);
  };

  const handleOpenProgram = (record) => {
    setText(record.text);
    setDialectId(record.dialect);
    setCurrentProgramId(record.id);
    setCurrentProgramName(record.name);
    setFileManagerVisible(false);
  };

  const currentLine = programState.running
    ? programState.instructions[programState.pointer]?.line
    : null;

  const errorLines = new Set(programState.errors.map((e) => e.line));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Robot Program</Text>
          <Text style={styles.subtitle}>{currentProgramName || 'Unsaved'}</Text>
        </View>
        <DialectSelector
          dialectId={dialectId}
          onSelect={handleSelectDialect}
          disabled={programState.running}
        />
      </View>

      {programState.running ? (
        <CodeViewer text={text} activeLine={currentLine} errorLines={errorLines} />
      ) : (
        <TextInput
          style={styles.editor}
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#5a6272"
        />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleNew} disabled={programState.running}>
          <Text style={styles.buttonText}>New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={openSaveBar} disabled={programState.running}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setFileManagerVisible(true)}
          disabled={programState.running}
        >
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>

      {saveBarOpen && (
        <View style={styles.saveBar}>
          <TextInput
            style={styles.saveBarInput}
            value={saveNameInput}
            onChangeText={setSaveNameInput}
            placeholder="Program name"
            placeholderTextColor="#5a6272"
            autoFocus
          />
          <TouchableOpacity style={styles.saveBarConfirm} onPress={confirmSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBarCancel} onPress={() => setSaveBarOpen(false)}>
            <Text style={styles.buttonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleLoad} disabled={programState.running}>
          <Text style={styles.buttonText}>Validate</Text>
        </TouchableOpacity>

        {programState.running ? (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.runButton]} onPress={handleRun}>
            <Text style={styles.buttonText}>Run</Text>
          </TouchableOpacity>
        )}
      </View>

      {programState.running && (
        <>
          <Text style={styles.status}>
            Running - line {currentLine} of {programState.instructions.length}
          </Text>
          <ProgramProgressBar
            pointer={programState.pointer}
            total={programState.instructions.length}
          />
        </>
      )}

      {programState.errors.length > 0 && (
        <ScrollView style={styles.errorList}>
          {programState.errors.map((err, i) => (
            <Text key={i} style={styles.errorText}>
              Line {err.line}: {err.message}
            </Text>
          ))}
        </ScrollView>
      )}

      <ProgramFileManager
        visible={fileManagerVisible}
        onClose={() => setFileManagerVisible(false)}
        onSelect={handleOpenProgram}
        currentProgramId={currentProgramId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2f3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  dropdownTriggerDisabled: {
    opacity: 0.5,
  },
  dropdownTriggerText: {
    color: '#c7cdd6',
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    color: '#e8791a',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownList: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#14161b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f3a',
    overflow: 'hidden',
    zIndex: 10,
    minWidth: 140,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1f26',
  },
  dropdownItemActive: {
    backgroundColor: '#e8791a22',
  },
  dropdownItemText: {
    color: '#c7cdd6',
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: '#e8791a',
    fontWeight: '700',
  },
  editor: {
    minHeight: 140,
    maxHeight: 200,
    backgroundColor: '#14161b',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f3a',
    textAlignVertical: 'top',
  },
  codeViewer: {
    height: 200,
    backgroundColor: '#14161b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f3a',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    backgroundColor: '#e8791a33',
    borderLeftWidth: 3,
    borderLeftColor: '#e8791a',
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LINE_HEIGHT,
    paddingHorizontal: 8,
  },
  codeLineError: {
    backgroundColor: '#ff8a8022',
  },
  lineNumber: {
    width: 26,
    color: '#5a6272',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  codeText: {
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2a2f3a',
  },
  runButton: {
    backgroundColor: '#2c8a4f',
  },
  stopButton: {
    backgroundColor: '#a33a2f',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBarInput: {
    flex: 1,
    backgroundColor: '#14161b',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f3a',
    fontSize: 13,
  },
  saveBarConfirm: {
    backgroundColor: '#2c8a4f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBarCancel: {
    backgroundColor: '#2a2f3a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  status: {
    color: '#8fd19e',
    marginTop: 8,
    fontSize: 12,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2a2f3a',
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8fd19e',
  },
  errorList: {
    marginTop: 8,
    maxHeight: 100,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 12,
    marginBottom: 2,
  },
});
