/**
 * machineLimits.js
 *
 * Default machine envelope used by programValidator.js for safety checks.
 * Override per-machine by passing your own limits object wherever
 * validateProgram() is called - these are just sensible defaults for a small
 * training lathe, not universal truths.
 */
export const DEFAULT_MACHINE_LIMITS = {
  maxDiameter: 150, // mm - largest X (diameter) the carriage can reach
  minZ: -500, // mm - most negative Z (deepest into the machine) the carriage can reach
  maxZ: 50, // mm - most positive Z (closest to the tailstock/operator) the carriage can reach
  maxSpindleRPM: 4000,
  maxFeedRate: 2.0, // mm/rev
};

export default { DEFAULT_MACHINE_LIMITS };
