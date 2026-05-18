import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Scene } from './Scene';
import { ControlPanel } from './ControlPanel';
import { useCuttingSimulation } from '../hooks/useCuttingSimulation';

const { height: screenHeight } = Dimensions.get('window');
const PANEL_WIDTH = 140;

const DEFAULT_DIMENSIONS = { width: 40, height: 20, depth: 40 };
const DEFAULT_TOOL = { type: 'endmill', diameter: 6, length: 25, radius: 3, fluteCount: 4 };

export const CNCSimulator = () => {
  const [spindleSpeed, setSpindleSpeed] = useState(3000);
  const [simulationState, setSimulationState] = useState({
    isRunning: false,
    progress: 0,
    currentToolPosition: { x: 0, y: 0, z: 0 },
    removedVolume: 0,
    temperature: 20,
    toolWear: 0,
    totalPoints: 0
  });

  const { start, stop, reset, getState, getTexture, tick } = useCuttingSimulation(DEFAULT_DIMENSIONS, DEFAULT_TOOL);

  // Poll state from ref every 100ms for UI updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = getState();
      setSimulationState(prev => ({ ...prev, ...currentState }));
    }, 100);
    return () => clearInterval(interval);
  }, [getState]);

  const texture = getTexture();
  const toolPos = [
    simulationState.currentToolPosition.x,
    simulationState.currentToolPosition.y,
    simulationState.currentToolPosition.z
  ];

  return (
    <View style={styles.container}>
      {/* 3D Scene */}
      <View style={styles.sceneContainer}>
        <Scene
          dimensions={DEFAULT_DIMENSIONS}
          tool={DEFAULT_TOOL}
          sdfTexture={texture}
          toolPosition={toolPos}
          isRunning={simulationState.isRunning}
          spindleSpeed={spindleSpeed}
          cutDepth={Math.abs(simulationState.currentToolPosition.y) / 10}
          tick={tick}
        />
      </View>
      
      {/* Control Panel */}
      <View style={styles.panelContainer}>
        <ControlPanel
          simulation={simulationState}
          tool={DEFAULT_TOOL}
          dimensions={DEFAULT_DIMENSIONS}
          onStart={start}
          onStop={stop}
          onReset={reset}
          onSpeedChange={setSpindleSpeed}
          onFeedChange={() => {}}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a0a1a',
  },
  sceneContainer: {
    flex: 1,
    height: screenHeight,
  },
  panelContainer: {
    width: PANEL_WIDTH,
    height: screenHeight,
  },
});