// utils/suppressWarnings.js
import { LogBox } from 'react-native';

/**
 * Suppress specific warnings
 * Add any warning messages you want to hide here
 */
const WARNINGS_TO_SUPPRESS = [
  'THREE.WebGLRenderer: WEBGL_lose_context extension not supported.',
];

/**
 * Initialize warning suppression
 * Call this once in your App.js or index.js
 */
export const suppressWarnings = () => {
  LogBox.ignoreLogs(WARNINGS_TO_SUPPRESS);
  console.log('✅ Warnings suppression initialized');
};

/**
 * Add a warning to suppress at runtime
 */
export const addWarningToSuppress = (warning) => {
  LogBox.ignoreLogs([warning]);
  console.log(`✅ Added warning to suppression: ${warning}`);
};