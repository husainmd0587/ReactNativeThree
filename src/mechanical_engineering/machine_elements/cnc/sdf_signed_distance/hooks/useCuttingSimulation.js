import { useRef, useCallback, useEffect } from 'react';
import { useSDFTexture } from './useSDFTexture';
import { useToolPath } from './useToolPath';

export const useCuttingSimulation = (dimensions, tool) => {
  const { initializeSDF, applyCutting, getTexture, getSDF } = useSDFTexture(dimensions);
  const { generateDemoPath, getNextPosition, getProgress, reset: resetPath, getTotalPoints } = useToolPath();
  
  // All mutable state in refs to avoid stale closures
  const isRunningRef = useRef(false);
  const stateRef = useRef({
    isRunning: false,
    progress: 0,
    currentToolPosition: { x: 0, y: 0, z: 0 },
    removedVolume: 0,
    temperature: 20,
    toolWear: 0,
    totalPoints: 0
  });
  
  const initialize = useCallback(() => {
    initializeSDF();
    generateDemoPath(tool);
    const total = getTotalPoints();
    isRunningRef.current = false;
    stateRef.current = {
      isRunning: false,
      progress: 0,
      currentToolPosition: { x: 0, y: 0, z: 0 },
      removedVolume: 0,
      temperature: 20,
      toolWear: 0,
      totalPoints: total
    };
  }, [initializeSDF, generateDemoPath, tool, getTotalPoints]);

  // This is called from useFrame inside the Canvas - runs every frame!
  const tick = useCallback((delta) => {
    if (!isRunningRef.current) return false;
    
    const point = getNextPosition();
    
    if (point) {
      applyCutting(point.position, tool.radius, tool.length);
      
      const sdf = getSDF();
      let removedPercent = 0;
      if (sdf) {
        const removedVoxels = sdf.data.filter(d => d > 0).length;
        removedPercent = (removedVoxels / sdf.data.length) * 100;
      }
      
      stateRef.current.currentToolPosition = point.position;
      stateRef.current.progress = getProgress();
      stateRef.current.removedVolume = removedPercent;
      stateRef.current.temperature = 20 + (point.feedRate / 1000) * 80 + Math.random() * 10;
      stateRef.current.toolWear += 0.001 * delta * 60;
      stateRef.current.isRunning = true;
      
      return true; // Still running
    } else {
      // Finished
      isRunningRef.current = false;
      stateRef.current.isRunning = false;
      return false; // Finished
    }
  }, [getNextPosition, applyCutting, tool, getProgress, getSDF]);

  const start = useCallback(() => {
    if (stateRef.current.progress >= 1) {
      resetPath();
      stateRef.current.progress = 0;
      stateRef.current.toolWear = 0;
      stateRef.current.removedVolume = 0;
    }
    isRunningRef.current = true;
    stateRef.current.isRunning = true;
  }, [resetPath]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    stateRef.current.isRunning = false;
  }, []);

  const reset = useCallback(() => {
    isRunningRef.current = false;
    resetPath();
    initialize();
  }, [resetPath, initialize]);

  const getState = useCallback(() => ({ ...stateRef.current }), []);
  const getIsRunning = useCallback(() => isRunningRef.current, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { start, stop, reset, getState, getTexture, getIsRunning, tick };
};