/**
 * theme.js
 *
 * Shared design tokens for the robotics module. The earlier screens
 * hand-rolled hex colors and font sizes per-component, which is how
 * things ended up inconsistent and cramped (small buttons, small
 * text) as more features got added. Everything from here on pulls
 * from this file instead, so raising a font size or a touch target
 * happens once, not per-component.
 *
 * Sizing philosophy for an "advanced/professional" tool (not a toy
 * demo): body text starts at 14, never below 11 (for secondary meta
 * only); every tappable control is at least 40px tall; primary
 * actions are visually distinct (accent color) from secondary ones
 * (neutral surface).
 */

export const COLORS = {
  bg: '#0b0d12',
  surface: '#151822',
  surfaceAlt: '#1c2029',
  surfaceRaised: '#20242f',
  border: '#2a2f3d',
  borderStrong: '#3a4156',

  accent: '#ff8a3d',
  accentSoft: 'rgba(255,138,61,0.16)',
  accentText: '#ffb37a',

  accent2: '#5b8dd6',
  accent2Soft: 'rgba(91,141,214,0.16)',
  accent2Text: '#8fb6e8',

  success: '#3ecf8e',
  successSoft: 'rgba(62,207,142,0.16)',

  danger: '#ef5350',
  dangerSoft: 'rgba(239,83,80,0.16)',

  textPrimary: '#f5f7fa',
  textSecondary: '#aab2c5',
  textMuted: '#6b7385',

  // Semi-transparent panels for chrome floating ON TOP of a full-bleed
  // 3D canvas (see RobotSimulatorScreen) - the model must stay visible
  // through them, not be covered by an opaque bar.
  overlayStrong: 'rgba(10,12,18,0.78)',
  overlay: 'rgba(15,17,24,0.62)',
  overlayLight: 'rgba(21,24,34,0.45)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const FONT_SIZE = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 30,
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '600',
  bold: '700',
  black: '800',
};

export const TOUCH_TARGET_MIN = 40;

// Deliberately smaller than TOUCH_TARGET_MIN - used only for the
// simulator's always-visible control chrome (header/transport bar),
// where screen space must be prioritized for the 3D model rather than
// the controls. Still large enough to tap reliably, just dense.
export const COMPACT_TOUCH_TARGET = 30;

// Fraction of the simulator screen's height given to the 3D canvas vs
// the controls below it - see RobotSimulatorScreen.jsx. Using explicit
// flex ratios (not flex:1 on both) is what actually guarantees this;
// flex:1 on the canvas competing against a non-flex, content-sized
// controls area is what caused the model to disappear entirely when
// the Program tab's content got tall enough to squeeze it to zero.
export const CANVAS_HEIGHT_RATIO = 7;
export const CONTROLS_HEIGHT_RATIO = 3;

export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.28,
  shadowRadius: 12,
  elevation: 6,
};
