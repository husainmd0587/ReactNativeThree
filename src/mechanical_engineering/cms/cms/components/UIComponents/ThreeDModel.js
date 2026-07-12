// ResourceList/ThreeDModel.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ThreeDModel = ({ url, title, size, navigation }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => navigation.navigate("Modal3DScreen", { modelUrl: url, title })}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🧊</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>3D Model • {size}</Text>
      </View>
      <Text style={styles.actionIcon}>➜</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
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

export default ThreeDModel;