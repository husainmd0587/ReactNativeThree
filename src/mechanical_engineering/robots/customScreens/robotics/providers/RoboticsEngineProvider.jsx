/**
 * RoboticsEngineProvider.jsx
 *
 * Exposes the RobotEngine (and its state) to the robotics screens via
 * React Context. Uses plain React state + the engine's subscribe
 * mechanism - no external state library, matching the "no new state
 * library" rule.
 *
 * Usage:
 *   <RoboticsEngineProvider presetId="three_dof_arm">
 *     <RobotSimulatorScreen />
 *   </RoboticsEngineProvider>
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRobotEngine } from '../engine/RobotEngine';
import { getRobotPreset } from '../core/robotPresets';

const RoboticsEngineContext = createContext(null);

export function RoboticsEngineProvider({ presetId = 'pick_drop_arm', children }) {
  const engine = useMemo(() => {
    const definition = getRobotPreset(presetId);
    return createRobotEngine(definition);
  }, [presetId]);

  const [state, setState] = useState(engine.getState());

  useEffect(() => {
    setState(engine.getState());
    const unsubscribe = engine.subscribe(setState);
    return unsubscribe;
  }, [engine]);

  const value = useMemo(
    () => ({ engine, state, programState: engine.getProgramState() }),
    [engine, state]
  );

  return (
    <RoboticsEngineContext.Provider value={value}>
      {children}
    </RoboticsEngineContext.Provider>
  );
}

export function useRoboticsEngine() {
  const context = useContext(RoboticsEngineContext);
  if (!context) {
    throw new Error('useRoboticsEngine must be used within a RoboticsEngineProvider');
  }
  return context;
}
