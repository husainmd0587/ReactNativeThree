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

export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.28,
  shadowRadius: 12,
  elevation: 6,
};
