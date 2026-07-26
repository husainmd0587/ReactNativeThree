/**
 * gcodeReference.js
 *
 * Source of truth for "what does latheInterpreter.js actually understand" - used by
 * ProgrammEdit's autocomplete and live linter. If you add support for a new G/M code
 * in latheInterpreter.js, add it here too or the editor will flag it as unrecognized.
 */

export const G_CODES = [
  { code: 'G0', label: 'G0', desc: 'Rapid positioning' },
  { code: 'G1', label: 'G1', desc: 'Linear feed move' },
  { code: 'G2', label: 'G2', desc: 'Clockwise arc' },
  { code: 'G3', label: 'G3', desc: 'Counter-clockwise arc' },
  { code: 'G4', label: 'G4', desc: 'Dwell' },
  { code: 'G20', label: 'G20', desc: 'Inch units' },
  { code: 'G21', label: 'G21', desc: 'Metric (mm) units' },
  { code: 'G32', label: 'G32', desc: 'Single-pass threading' },
  { code: 'G70', label: 'G70', desc: 'Finishing cycle (references P/Q contour)' },
  { code: 'G71', label: 'G71', desc: 'Rough turning stock-removal cycle' },
  { code: 'G72', label: 'G72', desc: 'Rough facing cycle' },
  { code: 'G74', label: 'G74', desc: 'Peck drilling cycle' },
  { code: 'G75', label: 'G75', desc: 'Peck grooving cycle' },
  { code: 'G76', label: 'G76', desc: 'Threading cycle' },
  { code: 'G90', label: 'G90', desc: 'Absolute positioning' },
  { code: 'G91', label: 'G91', desc: 'Incremental positioning' },
  { code: 'G94', label: 'G94', desc: 'Feed per minute' },
  { code: 'G95', label: 'G95', desc: 'Feed per revolution' },
  { code: 'G97', label: 'G97', desc: 'Constant spindle speed (RPM)' },
  { code: 'G184', label: 'G184', desc: 'Radial/cross-drilling (simulator-only cycle - see engine/radialCSG.js)' },
];

export const M_CODES = [
  { code: 'M0', label: 'M0', desc: 'Program stop' },
  { code: 'M3', label: 'M3', desc: 'Spindle on, clockwise' },
  { code: 'M4', label: 'M4', desc: 'Spindle on, counter-clockwise' },
  { code: 'M5', label: 'M5', desc: 'Spindle stop' },
  { code: 'M6', label: 'M6', desc: 'Tool change' },
  { code: 'M8', label: 'M8', desc: 'Coolant on' },
  { code: 'M9', label: 'M9', desc: 'Coolant off' },
  { code: 'M30', label: 'M30', desc: 'Program end and rewind' },
];

// Address words the editor understands for parameter-hint purposes.
export const ADDRESS_WORDS = [
  { code: 'X', desc: 'X axis position (diameter)' },
  { code: 'Z', desc: 'Z axis position (axial)' },
  { code: 'U', desc: 'Incremental X move' },
  { code: 'W', desc: 'Incremental Z move' },
  { code: 'I', desc: 'Arc center radius-offset in X / G75 peck depth' },
  { code: 'J', desc: 'G75 retreat amount between pecks' },
  { code: 'K', desc: 'Arc center offset in Z / G74 peck depth' },
  { code: 'F', desc: 'Feed rate' },
  { code: 'S', desc: 'Spindle speed (RPM)' },
  { code: 'T', desc: 'Tool number' },
  { code: 'P', desc: 'Cycle start block reference (line number)' },
  { code: 'Q', desc: 'Cycle end block reference (G70/71/72) or hole depth (G184)' },
  { code: 'R', desc: 'Retract amount / arc radius' },
  { code: 'D', desc: 'Drill diameter (simulator extension for G74/G184)' },
  { code: 'N', desc: 'Line/block number' },
  { code: 'O', desc: 'Program number' },
  { code: 'C', desc: 'Angular position in degrees (simulator extension for G184 radial drilling)' },
  { code: 'A', desc: 'Thread flank angle in degrees, default 60 (simulator extension for G76)' },
];

export const ALL_SUGGESTIONS = [...G_CODES, ...M_CODES];

const KNOWN_G = new Set(G_CODES.map((g) => Number(g.code.slice(1))));
const KNOWN_M = new Set(M_CODES.map((m) => Number(m.code.slice(1))));

export function isKnownGCode(n) {
  return KNOWN_G.has(n);
}
export function isKnownMCode(n) {
  return KNOWN_M.has(n);
}
