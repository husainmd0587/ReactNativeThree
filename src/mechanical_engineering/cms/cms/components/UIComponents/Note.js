// Note/Note.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Note = ({ text, variant = 'info' }) => {
  const variantStyles = {
    info: styles.info,
    warning: styles.warning,
  };

  return (
    <View style={[styles.note, variantStyles[variant]]}>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  note: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 5,
  },
  info: {
    backgroundColor: '#EAF4FF',
    borderLeftColor: '#2F80ED',
  },
  warning: {
    backgroundColor: '#FFF4E5',
    borderLeftColor: '#F39C12',
  },
  noteText: {
    fontSize: 14,
    color: '#333',
  },
});

export default Note;