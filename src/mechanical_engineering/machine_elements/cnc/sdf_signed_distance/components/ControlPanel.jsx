import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';

const Slider = ({ value, minimumValue, maximumValue, minimumTrackTintColor }) => (
  <View style={styles.sliderTrack}>
    <View style={[
      styles.sliderFill,
      {
        width: `${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%`,
        backgroundColor: minimumTrackTintColor || '#4CAF50'
      }
    ]} />
  </View>
);

export const ControlPanel = ({
  simulation,
  tool,
  dimensions,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  onFeedChange
}) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>CNC Simulator</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: simulation.isRunning ? '#4CAF50' : '#f44336' }
          ]}>
            <Text style={styles.statusText}>
              {simulation.isRunning ? 'RUNNING' : 'STOPPED'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.startButton, simulation.isRunning && styles.disabledButton]}
            onPress={onStart}
            disabled={simulation.isRunning}
          >
            <Text style={styles.buttonText}>START</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.stopButton, !simulation.isRunning && styles.disabledButton]}
            onPress={onStop}
            disabled={!simulation.isRunning}
          >
            <Text style={styles.buttonText}>STOP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={onReset}
          >
            <Text style={styles.buttonText}>RESET</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.label}>Progress: {(simulation.progress * 100).toFixed(1)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${simulation.progress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Tool Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{tool.type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Diameter:</Text>
            <Text style={styles.infoValue}>{tool.diameter}mm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Length:</Text>
            <Text style={styles.infoValue}>{tool.length}mm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Flutes:</Text>
            <Text style={styles.infoValue}>{tool.fluteCount}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Workpiece</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dimensions:</Text>
            <Text style={styles.infoValue}>
              {dimensions.width}x{dimensions.height}x{dimensions.depth}mm
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Real-time Metrics</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tool Position</Text>
            <Text style={styles.metricValue}>
              X:{simulation.currentToolPosition.x.toFixed(1)}{' '}
              Y:{simulation.currentToolPosition.y.toFixed(1)}{' '}
              Z:{simulation.currentToolPosition.z.toFixed(1)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Material Removed</Text>
            <Text style={styles.metricValue}>
              {simulation.removedVolume.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Temperature</Text>
            <Text style={[
              styles.metricValue,
              { color: simulation.temperature > 100 ? '#ff4444' : '#4CAF50' }
            ]}>
              {simulation.temperature.toFixed(1)}C
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tool Wear</Text>
            <Text style={styles.metricValue}>
              {(simulation.toolWear * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Path Points</Text>
            <Text style={styles.metricValue}>
              {simulation.totalPoints || 0}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Parameters</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.label}>Spindle Speed (RPM)</Text>
            <Slider
              value={3000}
              minimumValue={500}
              maximumValue={10000}
              minimumTrackTintColor="#4CAF50"
            />
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.label}>Feed Rate (mm/min)</Text>
            <Slider
              value={500}
              minimumValue={50}
              maximumValue={2000}
              minimumTrackTintColor="#2196F3"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 35, 0.95)',
    borderLeftWidth: 1,
    borderLeftColor: '#333355',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333355',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  label: {
    color: '#aaaacc',
    fontSize: 12,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333355',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  infoCard: {
    backgroundColor: 'rgba(40, 40, 60, 0.8)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444466',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#8888aa',
    fontSize: 12,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#333355',
  },
  metricLabel: {
    color: '#8888aa',
    fontSize: 11,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  sliderContainer: {
    marginBottom: 12,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#333355',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
});