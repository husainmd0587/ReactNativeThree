import { useRef, useCallback } from 'react';

export const useToolPath = () => {
  const pathRef = useRef([]);
  const currentIndexRef = useRef(0);
  
  const generateDemoPath = useCallback((tool) => {
    const path = [];
    const steps = 300;
    const radius = 15;
    
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 6;
      const depth = -2 - (i / steps) * 8;
      
      path.push({
        position: { 
          x: Math.cos(t) * radius, 
          y: depth, 
          z: Math.sin(t) * radius 
        },
        feedRate: 500,
        spindleSpeed: 3000
      });
    }
    
    pathRef.current = path;
    currentIndexRef.current = 0;
    return path;
  }, []);
  
  const getNextPosition = useCallback(() => {
    if (currentIndexRef.current >= pathRef.current.length) {
      return null;
    }
    return pathRef.current[currentIndexRef.current++];
  }, []);
  
  const reset = useCallback(() => {
    currentIndexRef.current = 0;
  }, []);
  
  const getProgress = useCallback(() => 
    pathRef.current.length === 0 ? 0 : currentIndexRef.current / pathRef.current.length, 
  []);
  
  const getTotalPoints = useCallback(() => pathRef.current.length, []);
  const getCurrentIndex = useCallback(() => currentIndexRef.current, []);
  
  return {
    generateDemoPath, getNextPosition, reset, getProgress, 
    getTotalPoints, getCurrentIndex 
  };
};