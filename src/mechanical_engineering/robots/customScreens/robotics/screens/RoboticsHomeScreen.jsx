/**
 * RoboticsHomeScreen.jsx
 *
 * Entry point for the Robotics module. Three cards: Learn Robotics
 * (placeholder - hook up to the app's content renderer later),
 * Robot Simulator, and Robot Builder.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function HomeCard({ title, description, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export function RoboticsHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Robotics</Text>

      <HomeCard
        title="Learn Robotics"
        description="Lessons on joints, kinematics, and robot programming"
        disabled
      />

      <HomeCard
        title="Robot Simulator"
        description="Control a 3-DOF robot arm in real time"
        onPress={() => navigation.navigate('RobotSimulator')}
      />

      <HomeCard
        title="Interactive Robot Builder"
        description="Build a custom robot from joints and links"
        onPress={() => navigation.navigate('RobotBuilder')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f1115',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1c1f26',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#9aa4b2',
  },
});
