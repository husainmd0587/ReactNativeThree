import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertProgram, removeProgram, sortByRecent } from './programStorageCore.js';

const STORAGE_KEY = 'cnc:savedPrograms:v1';

async function readList() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('programStorage: failed to read saved programs, starting empty.', err);
    return [];
  }
}

async function writeList(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function listPrograms() {
  const list = await readList();
  return sortByRecent(list);
}

/** Save (create or update) a program. Returns the saved program's id. */
export async function saveProgram({ id, name, gcode }) {
  const list = await readList();
  const { list: next, id: savedId } = upsertProgram(list, { id, name, gcode });
  await writeList(next);
  return savedId;
}

export async function deleteProgram(id) {
  const list = await readList();
  await writeList(removeProgram(list, id));
}

export async function getProgram(id) {
  const list = await readList();
  return list.find((p) => p.id === id) ?? null;
}

export default { listPrograms, saveProgram, deleteProgram, getProgram };
