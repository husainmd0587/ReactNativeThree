import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

// Like AutoCAD's Properties palette: editable fields that push a change
// back into the drawing. `properties` is [{ key, label, value, unit,
// editable }]. Non-editable rows (e.g. a derived value) render as plain
// text.
export default function PropertiesPanel({ properties, onEditValue }) {
  if (!properties || properties.length === 0) return null;

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Properties</Text>
      {properties.map((p) => (
        <PropertyRow key={p.key} property={p} onEditValue={onEditValue} />
      ))}
    </View>
  );
}

function PropertyRow({ property, onEditValue }) {
  const [text, setText] = useState(String(property.value));

  // Keep the field in sync when the shape changes from elsewhere (drawn
  // fresh, or another field's edit recomputed this one).
  useEffect(() => {
    setText(String(property.value));
  }, [property.value]);

  const commit = () => {
    const num = parseFloat(text);
    // Angle fields (unit '°') can legitimately be 0 — a 0° rectangle is
    // just axis-aligned, not degenerate the way a 0mm length/radius/width
    // would be, so only those keep the "must be positive" requirement.
    const minValue = property.unit === '°' ? 0 : Number.EPSILON;
    if (Number.isFinite(num) && num >= minValue) {
      onEditValue(property.key, num);
    } else {
      setText(String(property.value)); // revert invalid input
    }
  };

  if (property.editable === false) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{property.label}</Text>
        <Text style={styles.readOnlyValue}>
          {property.value} {property.unit}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{property.label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          onEndEditing={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Text style={styles.unit}>{property.unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    backgroundColor: '#FBFBFD',
    padding: 14,
  },
  heading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: { fontSize: 12, color: '#6B6B78' },
  readOnlyValue: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    minWidth: 64,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#DCEAF3',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  unit: { fontSize: 12, color: '#8A8A9A' },
});
