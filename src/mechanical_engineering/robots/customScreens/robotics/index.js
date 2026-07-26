/**
 * robotics/index.js
 *
 * Public entry point for the Robotics module. Mount RoboticsNavigator
 * as a screen inside the app's existing root navigator, e.g.:
 *
 *   import { RoboticsNavigator } from './robotics';
 *   <RootStack.Screen name="Robotics" component={RoboticsNavigator} />
 *
 * Future content-renderer integration point: a "robot_simulator" or
 * "robot_builder" content block can import RobotSimulatorScreen /
 * RobotBuilderScreen (or a thin wrapper around them) directly, without
 * touching engine/model/scene internals.
 */

export { RoboticsNavigator } from './navigation/RoboticsNavigator';

export { RoboticsHomeScreen } from './screens/RoboticsHomeScreen';
export { RobotSimulatorScreen } from './screens/RobotSimulatorScreen';
export { RobotBuilderScreen } from './screens/RobotBuilderScreen';

export { RoboticsEngineProvider, useRoboticsEngine } from './providers/RoboticsEngineProvider';
export { RoboticsCanvasProvider, useRoboticsCanvas } from './providers/RoboticsCanvasProvider';

export { RobotEngine, createRobotEngine } from './engine/RobotEngine';
export { MotionController, createMotionController } from './engine/MotionController';
export { parseProgram, INSTRUCTION_TYPES } from './engine/ProgramInterpreter';

export { RobotProgramEditor } from './ui/RobotProgramEditor';

export { PickableBox, DropZoneMarker } from './scene/PickableBox';

export { robotPresets, getRobotPreset, threeDofArmPreset, pickDropArmPreset } from './core/robotPresets';
export {
  JOINT_TYPES,
  SIMULATION_MODES,
  GRIP_STATES,
  DEFAULT_BOX_START_POSITION,
  DEFAULT_DROP_ZONE_POSITION,
} from './core/robotConstants';
