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
export { LanguageReferenceScreen } from './screens/LanguageReferenceScreen';
export { NewProgramScreen } from './screens/NewProgramScreen';
export { PickDropWizardScreen } from './screens/PickDropWizardScreen';

export { RoboticsEngineProvider, useRoboticsEngine } from './providers/RoboticsEngineProvider';
export { RoboticsCanvasProvider, useRoboticsCanvas } from './providers/RoboticsCanvasProvider';

export { RobotEngine, createRobotEngine } from './engine/RobotEngine';
export { MotionController, createMotionController } from './engine/MotionController';
export { parseProgram, INSTRUCTION_TYPES } from './engine/ProgramInterpreter';
export { DIALECTS, getDialect } from './engine/dialects';

export { RobotProgramEditor } from './ui/RobotProgramEditor';
export { ProgramFileManager } from './ui/ProgramFileManager';
export { SimHeaderBar } from './ui/SimHeaderBar';

export {
  listSavedPrograms,
  getSavedProgram,
  saveProgram,
  deleteSavedProgram,
} from './core/programStorage';

export { DIALECT_DOCS, getDialectDocs } from './core/dialectDocs';
export { PROGRAM_TEMPLATES, getTemplate, listTemplates } from './core/programTemplates';
export { generatePickDropProgram } from './core/programGenerator';
export * as THEME from './core/theme';

export { PickableBox, DropZoneMarker } from './scene/PickableBox';
export { GlbRobotArm } from './scene/GlbRobotArm';

export { createRobotController } from './engine/glbRobotController';
export {
  industrialRobotConfig,
  buildJointsFromGlbConfig,
  ROBOT_MODEL_URL,
} from './core/glbRobotConfig';

export { robotPresets, getRobotPreset, industrialGlbArmPreset } from './core/robotPresets';
export {
  JOINT_TYPES,
  SIMULATION_MODES,
  GRIP_STATES,
  DEFAULT_BOX_START_POSITION,
  DEFAULT_DROP_ZONE_POSITION,
  PICK_RADIUS,
  GRAVITY,
  BOX_REST_HEIGHT,
  PLAYBACK_STATES,
  SPEED_PRESETS,
} from './core/robotConstants';
