/**
 * programStorage.js
 *
 * Persists saved robot programs via AsyncStorage - same dependency and
 * same "single JSON blob under one key" pattern CanvaProvider already
 * uses for its settings (see saveSettings/loadSettings there), so this
 * doesn't introduce a new storage approach to the app.
 *
 * All programs live under one key as { [id]: ProgramRecord }. Fine for
 * the realistic number of saved programs a user would keep in a
 * teaching/simulation tool - no need for per-item keys or an index.
 *
 * ProgramRecord shape:
 *   { id, name, dialect, text, updatedAt }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@robotics_saved_programs';

async function readAll() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading saved programs:', error);
    return {};
  }
}

async function writeAll(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error saving programs:', error);
  }
}

/** Returns all saved programs, most recently updated first. */
export async function listSavedPrograms() {
  const all = await readAll();
  return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSavedProgram(id) {
  const all = await readAll();
  return all[id] || null;
}

/**
 * Creates a new saved program, or updates an existing one if `id` is
 * given and already exists. Returns the saved record (with its id, so
 * the caller can track it for future re-saves).
 */
export async function saveProgram({ id, name, dialect, text }) {
  const all = await readAll();
  const programId = id || generateId();

  const record = {
    id: programId,
    name: (name || '').trim() || 'Untitled Program',
    dialect,
    text,
    updatedAt: Date.now(),
  };

  all[programId] = record;
  await writeAll(all);
  return record;
}

export async function deleteSavedProgram(id) {
  const all = await readAll();
  delete all[id];
  await writeAll(all);
}

function generateId() {
  return `prog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
