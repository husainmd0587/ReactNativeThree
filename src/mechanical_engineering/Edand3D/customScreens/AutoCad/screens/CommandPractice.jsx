import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCommandById } from '../commands/registry';
import { computeLineGeometry } from '../engine/operations/line';
import { computeCircleGeometry } from '../engine/operations/circle';
import { computeRectangleGeometry } from '../engine/operations/rectangle';
import { applyLineEdit, applyCircleEdit, applyRectangleEdit } from '../engine/operations/edit';
import PracticeCanvas from '../components/PracticeCanvas';
import PropertiesPanel from '../components/PropertiesPanel';

// Touch points in -> measured geometry out. No target, no tolerance, no
// pass/fail — just a measurement, same as AutoCAD's command line reporting
// back whatever you actually drew.
const GEOMETRY_BUILDERS = {
  line: computeLineGeometry,
  circle: computeCircleGeometry,
  rectangle: computeRectangleGeometry,
};

// Edited property value -> new pixel points (start stays fixed).
const EDIT_APPLIERS = {
  line: applyLineEdit,
  circle: applyCircleEdit,
  rectangle: applyRectangleEdit,
};

function toProperties(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'line') {
    return [
      { key: 'lengthMm', label: 'Length', value: geometry.lengthMm, unit: 'mm' },
      { key: 'angleDeg', label: 'Angle', value: geometry.angleDeg, unit: '°' },
    ];
  }
  if (geometry.type === 'circle') {
    return [
      { key: 'radiusMm', label: 'Radius', value: geometry.radiusMm, unit: 'mm' },
      {
        key: 'diameterMm',
        label: 'Diameter',
        value: Math.round(geometry.radiusMm * 2 * 10) / 10,
        unit: 'mm',
        editable: false,
      },
    ];
  }
  if (geometry.type === 'rectangle') {
    return [
      { key: 'widthMm', label: 'Width', value: geometry.widthMm, unit: 'mm' },
      { key: 'heightMm', label: 'Height', value: geometry.heightMm, unit: 'mm' },
    ];
  }
  return [];
}

export default function CommandPractice({ route }) {
  const commandId = route?.params?.commandId;
  const command = getCommandById(commandId);
  const practiceType = command?.practice?.type;
  const hasEngine = Boolean(practiceType && GEOMETRY_BUILDERS[practiceType]);

  // `points` are the raw pixel points the shape is built from; `geometry`
  // is their measured (mm) form. Both are kept so an edited property can
  // be turned back into new points without losing the other axis.
  const [points, setPoints] = useState(null);
  const [geometry, setGeometry] = useState(null);
  // Bumping this remounts PracticeCanvas — used both to clear ("New") and
  // to re-seed the canvas with edited points (see handleEditProperty).
  const [attempt, setAttempt] = useState(0);

  const handleComplete = useCallback(
    (startPx, endPx) => {
      if (!hasEngine) return;
      setPoints({ start: startPx, end: endPx });
      setGeometry(GEOMETRY_BUILDERS[practiceType](startPx, endPx));
    },
    [practiceType, hasEngine],
  );

  const handleEditProperty = useCallback(
    (key, value) => {
      if (!points || !geometry || !hasEngine) return;
      const applyEdit = EDIT_APPLIERS[practiceType];
      const edited = { ...geometry, [key]: value };
      const newPoints = applyEdit(points, edited);
      const newGeometry = GEOMETRY_BUILDERS[practiceType](newPoints.start, newPoints.end);
      setPoints(newPoints);
      setGeometry(newGeometry);
      setAttempt((n) => n + 1); // re-seed the canvas with the edited shape
    },
    [points, geometry, practiceType, hasEngine],
  );

  const handleClear = useCallback(() => {
    setPoints(null);
    setGeometry(null);
    setAttempt((n) => n + 1);
  }, []);

  if (!command) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Command not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasEngine) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Text style={styles.title}>{command.name}</Text>
          <Text style={styles.desc}>{command.description}</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Practice canvas coming soon.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{command.name}</Text>
        <Text style={styles.desc}>{command.description}</Text>
        {command.steps?.length > 0 && (
          <View style={styles.steps}>
            {command.steps.map((step, i) => (
              <Text key={step} style={styles.stepText}>{i + 1}. {step}</Text>
            ))}
          </View>
        )}

        <PracticeCanvas
          key={attempt}
          practiceType={practiceType}
          initialPoints={points}
          onComplete={handleComplete}
        />

        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
          <Text style={styles.clearText}>New</Text>
        </TouchableOpacity>

        <PropertiesPanel
          properties={toProperties(geometry)}
          onEditValue={handleEditProperty}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  desc: { fontSize: 13, color: '#8A8A9A', marginTop: 6, lineHeight: 18 },
  steps: { marginTop: 10, marginBottom: 4 },
  stepText: { fontSize: 12, color: '#6B6B78', marginTop: 2 },
  clearBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E6F0',
  },
  clearText: { fontSize: 12, fontWeight: '700', color: '#2E7DAF' },
  placeholder: {
    flex: 1,
    minHeight: 220,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 13, color: '#B7B7C0' },
});
