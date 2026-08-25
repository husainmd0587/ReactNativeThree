import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function ToolbarButton({ label, onPress, disabled, active }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.btn, disabled && styles.btnDisabled, active && styles.btnActive]}
    >
      <Text style={[styles.btnText, disabled && styles.btnTextDisabled, active && styles.btnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function Toolbar({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  showDimensions,
  onToggleDimensions,
  onDelete,
  canDelete,
  onClearAll,
  canClearAll,
  onFinish,
  showFinish,
  canFinish,
}) {
  return (
    <View style={styles.row}>
      {showFinish && (
        <ToolbarButton label="Finish" onPress={onFinish} disabled={!canFinish} active={canFinish} />
      )}
      <ToolbarButton label="Undo" onPress={onUndo} disabled={!canUndo} />
      <ToolbarButton label="Redo" onPress={onRedo} disabled={!canRedo} />
      <ToolbarButton
        label={showDimensions ? 'Dimensions: On' : 'Dimensions: Off'}
        onPress={onToggleDimensions}
        active={showDimensions}
      />
      <ToolbarButton label="Delete" onPress={onDelete} disabled={!canDelete} />
      <ToolbarButton label="Clear all" onPress={onClearAll} disabled={!canClearAll} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    backgroundColor: '#FFFFFF',
  },
  btnDisabled: { opacity: 0.4 },
  btnActive: { backgroundColor: '#E7F3FA', borderColor: '#BFE0F2' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#2E7DAF' },
  btnTextDisabled: { color: '#A6A6B2' },
  btnTextActive: { color: '#1D6FA5' },
});
