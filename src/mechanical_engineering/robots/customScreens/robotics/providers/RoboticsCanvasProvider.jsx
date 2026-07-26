import React from 'react';
import { RoboticsEngineProvider, useRoboticsEngine } from './RoboticsEngineProvider';

export function RoboticsCanvasProvider({ presetId = 'pick_drop_arm', children }) {
  return (
    <RoboticsEngineProvider presetId={presetId}>
      {children}
    </RoboticsEngineProvider>
  );
}

export function useRoboticsCanvas() {
  return useRoboticsEngine();
}

export default RoboticsCanvasProvider;
