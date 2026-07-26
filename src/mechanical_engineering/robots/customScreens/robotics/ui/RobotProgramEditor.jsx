/**
 * RobotProgramEditor.jsx
 *
 * Lets the user write a small robot program (HOME / MOVEJ / WAIT /
 * GRIP) and run it against the simulated arm. Talks only to the
 * RobotEngine via useRoboticsCanvas - loadProgram() parses+validates,
 * runProgram() starts stepping through it (RobotEngine.update() does
 * the actual stepping every frame; see engine/RobotEngine.js).
 *
 * A plain TextInput can't highlight individual lines, so while a
 * program is running this swaps to a read-only line-by-line view
 * (CodeViewer below). Instead of toggling a style per row, the active
 * line is a single Reanimated bar that slides to the active line's
 * position (withTiming) and auto-scrolls into view - like a CNC
 * controller's moving line indicator. Editing resumes automatically
 * once the program stops. Also shows a Reanimated progress bar for how
 * far through the program execution is.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRoboticsCanvas } from '../providers/RoboticsCanvasProvider';

const EXAMPLE_PROGRAM = `HOME
MOVEJ J1=-41 J2=-76 J3=-136 J4=96 SPEED=60
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ J1=-146 J2=-73 J3=-138 J4=74 SPEED=60
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`;

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

export function RobotProgramEditor() {
  const { engine, programState } = useRoboticsCanvas();
  const [text, setText] = useState(EXAMPLE_PROGRAM);

  const handleLoad = () => engine.loadProgram(text);
  const handleRun = () => {
    engine.loadProgram(text);
    engine.runProgram();
  };
  const handleStop = () => engine.stopProgram();

  const currentLine = programState.running
    ? programState.instructions[programState.pointer]?.line
    : null;

  const errorLines = new Set(programState.errors.map((e) => e.line));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Robot Program</Text>

      {programState.running ? (
        <CodeViewer text={text} activeLine={currentLine} errorLines={errorLines} />
      ) : (
        <TextInput
          style={styles.editor}
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={'HOME\nMOVEJ J1=30 SPEED=50\nWAIT 1\nGRIP OPEN'}
          placeholderTextColor="#5a6272"
        />
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
