import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ALL_SUGGESTIONS } from '../gcodeReference';

const FONT_SIZE = 13;
const LINE_HEIGHT = 20;

/**
 * Tokenize one line for display-only syntax coloring. Deliberately separate from
 * engine/tokenizer.js - that one produces structured data for the interpreter,
 * this one just needs to slice a string into colored spans.
 */
function colorizeLine(line) {
  const spans = [];
  let rest = line;
  let cursor = 0;

  // Comment: everything from '(' or ';' to end-of-relevant-segment.
  const commentMatch = rest.match(/\(([^)]*)\)?|;.*$/);
  let codePart = rest;
  let commentPart = '';
  if (commentMatch) {
    codePart = rest.slice(0, commentMatch.index);
    commentPart = rest.slice(commentMatch.index);
  }

  const re = /([A-Za-z])([+-]?\d*\.?\d+)/g;
  let m;
  let last = 0;
  while ((m = re.exec(codePart)) !== null) {
    if (m.index > last) spans.push({ text: codePart.slice(last, m.index), color: '#6b7178' });
    const letter = m[1].toUpperCase();
    let color = '#c7ccd4';
    if (letter === 'G') color = '#5aa8ff';
    else if (letter === 'M') color = '#c084fc';
    else if (letter === 'N') color = '#6b7178';
    else if (['X', 'Z', 'U', 'W'].includes(letter)) color = '#4ade80';
    else if (['F', 'S', 'T'].includes(letter)) color = '#f5a524';
    spans.push({ text: m[0], color });
    last = m.index + m[0].length;
  }
  if (last < codePart.length) spans.push({ text: codePart.slice(last), color: '#c7ccd4' });
  if (commentPart) spans.push({ text: commentPart, color: '#5a606a', italic: true });

  return spans;
}

function wordAtCursor(text, cursor) {
  let start = cursor;
  let end = cursor;
  while (start > 0 && /\S/.test(text[start - 1])) start -= 1;
  while (end < text.length && /\S/.test(text[end])) end += 1;
  return { word: text.slice(start, end), start, end };
}

export default function CodeEditor({ value, onChangeText, issuesByLine = {} }) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef(null);
  const [inputHeight, setInputHeight] = useState(LINE_HEIGHT * 12);

  const lines = useMemo(() => value.split('\n'), [value]);

  const { word: currentWord, start: wordStart, end: wordEnd } = useMemo(
    () => wordAtCursor(value, selection.start),
    [value, selection.start]
  );

  const suggestions = useMemo(() => {
    if (!/^[GgMm]\d*$/.test(currentWord) || currentWord.length === 0) return [];
    return ALL_SUGGESTIONS.filter((s) => s.code.toLowerCase().startsWith(currentWord.toLowerCase())).slice(0, 8);
  }, [currentWord]);

  function insertSuggestion(code) {
    const before = value.slice(0, wordStart);
    const after = value.slice(wordEnd);
    const insertion = `${code} `;
    const next = before + insertion + after;
    onChangeText(next);
    const newCursor = before.length + insertion.length;
    setSelection({ start: newCursor, end: newCursor });
    // RN needs a tick before a controlled selection update sticks.
    requestAnimationFrame(() => inputRef.current?.setNativeProps?.({ selection: { start: newCursor, end: newCursor } }));
  }

  return (
    <View style={styles.wrap}>
      {suggestions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestBar} contentContainerStyle={{ paddingHorizontal: 6 }}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s.code} style={styles.suggestChip} onPress={() => insertSuggestion(s.code)}>
              <Text style={styles.suggestCode}>{s.code}</Text>
              <Text style={styles.suggestDesc} numberOfLines={1}>
                {s.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView style={styles.editorScroll}>
        <View style={styles.row}>
          <View style={styles.gutter}>
            {lines.map((_, i) => {
              const lineNum = i + 1;
              const lineIssues = issuesByLine[lineNum];
              const severity = lineIssues?.some((x) => x.severity === 'error')
                ? 'error'
                : lineIssues?.length
                ? 'warning'
                : null;
              return (
                <View key={i} style={styles.gutterRow}>
                  {severity ? <View style={[styles.dot, severity === 'error' ? styles.dotError : styles.dotWarning]} /> : <View style={styles.dotSpacer} />}
                  <Text style={styles.gutterText}>{lineNum}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.codeArea}>
            <View pointerEvents="none" style={styles.highlightLayer}>
              {lines.map((line, i) => (
                <Text key={i} style={styles.codeLine}>
                  {colorizeLine(line).map((span, j) => (
                    <Text key={j} style={{ color: span.color, fontStyle: span.italic ? 'italic' : 'normal' }}>
                      {span.text}
                    </Text>
                  ))}
                  {line.length === 0 ? ' ' : ''}
                </Text>
              ))}
            </View>

            <TextInput
              ref={inputRef}
              multiline
              scrollEnabled={false}
              value={value}
              onChangeText={onChangeText}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              style={[styles.input, { height: Math.max(inputHeight, LINE_HEIGHT * 12) }]}
              placeholder="Type G-code here..."
              placeholderTextColor="#4b5158"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0c0e' },
  suggestBar: { maxHeight: 44, backgroundColor: '#15171b', borderBottomWidth: 1, borderBottomColor: '#22252b' },
  suggestChip: {
    backgroundColor: '#1c2027',
    borderWidth: 1,
    borderColor: '#2f333b',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginVertical: 6,
    marginRight: 6,
    maxWidth: 160,
  },
  suggestCode: { color: '#5aa8ff', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  suggestDesc: { color: '#8a919c', fontSize: 9, marginTop: 1 },
  editorScroll: { flex: 1 },
  row: { flexDirection: 'row' },
  gutter: { backgroundColor: '#0e1013', paddingTop: 8, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#1c1f24' },
  gutterRow: { height: LINE_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  gutterText: { color: '#4b5158', fontSize: FONT_SIZE - 2, fontFamily: 'monospace', minWidth: 22, textAlign: 'right' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  dotSpacer: { width: 5, height: 5, marginRight: 4 },
  dotError: { backgroundColor: '#ef4444' },
  dotWarning: { backgroundColor: '#f5a524' },
  codeArea: { flex: 1, position: 'relative' },
  highlightLayer: { position: 'absolute', top: 8, left: 8, right: 0 },
  codeLine: { height: LINE_HEIGHT, lineHeight: LINE_HEIGHT, fontSize: FONT_SIZE, fontFamily: 'monospace' },
  input: {
    color: 'transparent',
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'monospace',
    paddingTop: 8,
    paddingLeft: 8,
    paddingRight: 8,
    textAlignVertical: 'top',
  },
});
