/**
 * programStorageCore.js
 *
 * Pure functions only - no AsyncStorage, no side effects. programStorage.js wraps
 * these with actual persistence. Kept separate so the list logic (upsert/remove/
 * sort) can be unit tested in plain Node without a React Native environment.
 */

export function upsertProgram(list, program) {
  const now = Date.now();
  const id = program.id || `prog_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const existingIndex = list.findIndex((p) => p.id === id);
  const entry = { id, name: program.name || 'UNTITLED.NC', gcode: program.gcode || '', updatedAt: now };

  const next = existingIndex >= 0 ? [...list] : [...list, entry];
  if (existingIndex >= 0) next[existingIndex] = entry;
  return { list: next, id };
}

export function removeProgram(list, id) {
  return list.filter((p) => p.id !== id);
}

export function sortByRecent(list) {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

export default { upsertProgram, removeProgram, sortByRecent };
