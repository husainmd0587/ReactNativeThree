// ResourceList/Audio.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';

const Audio = ({ url, title, size, navigation }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => navigation.navigate("AudioPlayer", { url, title })}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isPlaying ? '⏸️' : '🎵'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Audio • {size}</Text>
      </View>
      <Text style={styles.actionIcon}>➜</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  meta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  actionIcon: {
    fontSize: 18,
    color: '#235dfc',
  },
});

export default Audio;