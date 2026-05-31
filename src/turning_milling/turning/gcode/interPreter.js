import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import CustomGCodeParser from './parser2';

const defaultCode = `G21 G90
M3 S1000
G0 X10 Z5
G1 X20 Z-10 F100
M5`;

const Interpreter = () => {
  const [gcode, setGcode] = useState(defaultCode);
  const [report, setReport] = useState(null);

  const parseCode = () => {
    const parser = new CustomGCodeParser();
    const result = parser.parse(gcode);
    setReport(result);
  };

  useEffect(() => {
    parseCode();
  }, []);

  const getColor = (type) => {
    switch (type) {
      case 'error':
        return '#ff4d4d';
      case 'warning':
        return '#ffcc00';
      case 'success':
        return '#2ecc71';
      default:
        return '#4da6ff';
    }
  };

  const renderHighlightedCode = () => {
    return gcode.split('\n').map((line, index) => (
      <View key={index} style={styles.codeRow}>
        <Text style={styles.lineNumber}>{index + 1}</Text>

        <Text style={styles.codeText}>
          {line.split(' ').map((word, i) => {
            let color = '#fff';

            if (word.startsWith('G')) color = '#00d4ff';
            else if (word.startsWith('M')) color = '#ff7b00';
            else if (
              word.startsWith('X') ||
              word.startsWith('Y') ||
              word.startsWith('Z')
            )
              color = '#2ecc71';
            else if (word.startsWith('F'))
              color = '#f1c40f';
            else if (word.startsWith('S'))
              color = '#9b59b6';

            return (
              <Text key={i} style={{ color }}>
                {word + ' '}
              </Text>
            );
          })}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CNC G-Code Editor</Text>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ToolbarButton
          title="Parse"
          onPress={parseCode}
        />
        <ToolbarButton
          title="Clear"
          onPress={() => setGcode('')}
        />
        <ToolbarButton
          title="Example"
          onPress={() => setGcode(defaultCode)}
        />
      </View>

      {/* Code Editor */}
      <View style={styles.editorContainer}>
        <Text style={styles.sectionTitle}>
          G-Code Editor
        </Text>

        <ScrollView style={styles.codePreview}>
          {renderHighlightedCode()}
        </ScrollView>

        <TextInput
          multiline
          value={gcode}
          onChangeText={setGcode}
          style={styles.input}
          placeholder="Enter G-code..."
          placeholderTextColor="#777"
        />
      </View>

      {/* Report */}
      {report && (
        <ScrollView
          style={styles.resultContainer}
        >
          <Text style={styles.sectionTitle}>
            Interpreter Result
          </Text>

          <View style={styles.statsCard}>
            <Text style={styles.statText}>
              Commands:{' '}
              {report.commands?.length || 0}
            </Text>

            <Text style={styles.statText}>
              Errors:{' '}
              {report.errors?.length || 0}
            </Text>

            <Text style={styles.statText}>
              Success:{' '}
              {report.success ? 'YES' : 'NO'}
            </Text>
          </View>

          {/* Errors */}
          {report.errors?.map(
            (error, index) => (
              <View
                key={index}
                style={[
                  styles.messageCard,
                  {
                    borderLeftColor:
                      '#ff4d4d',
                  },
                ]}
              >
                <Text
                  style={{
                    color: '#ff4d4d',
                    fontWeight: 'bold',
                  }}
                >
                  ERROR
                </Text>

                <Text
                  style={styles.messageText}
                >
                  {error.message ||
                    JSON.stringify(error)}
                </Text>
              </View>
            )
          )}

          {/* Commands */}
          <Text style={styles.sectionTitle}>
            Parsed Commands
          </Text>

          {report.commands?.map(
            (cmd, index) => (
              <View
                key={index}
                style={styles.commandCard}
              >
                <Text
                  style={styles.commandText}
                >
                  {JSON.stringify(
                    cmd,
                    null,
                    2
                  )}
                </Text>
              </View>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
};

const ToolbarButton = ({
  title,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default Interpreter;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
    paddingTop: 50,
    paddingHorizontal: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },

  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },

  button: {
    backgroundColor: '#1e2633',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  editorContainer: {
    backgroundColor: '#181c23',
    borderRadius: 20,
    padding: 15,
  },

  sectionTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
  },

  codePreview: {
    maxHeight: 150,
    backgroundColor: '#11161f',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },

  codeRow: {
    flexDirection: 'row',
  },

  lineNumber: {
    width: 35,
    color: '#666',
  },

  codeText: {
    color: '#fff',
  },

  input: {
    backgroundColor: '#0f1115',
    color: '#fff',
    minHeight: 180,
    borderRadius: 14,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 14,
  },

  resultContainer: {
    marginTop: 20,
  },

  statsCard: {
    backgroundColor: '#181c23',
    padding: 15,
    borderRadius: 18,
    marginBottom: 15,
  },

  statText: {
    color: '#fff',
    marginBottom: 5,
  },

  messageCard: {
    backgroundColor: '#181c23',
    padding: 15,
    borderRadius: 14,
    borderLeftWidth: 5,
    marginBottom: 10,
  },

  messageText: {
    color: '#ddd',
    marginTop: 5,
  },

  commandCard: {
    backgroundColor: '#181c23',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  commandText: {
    color: '#aaa',
    fontFamily: 'monospace',
  },
});