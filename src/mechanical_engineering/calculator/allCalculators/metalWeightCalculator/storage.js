import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

const HISTORY_KEY = '@metal_calc_history';
const SETTINGS_KEY = '@metal_calc_settings';

export const DEFAULT_SETTINGS = {
  unitSystem: 'metric',
  theme: 'light',
  currency: '',
};

// ── History ──────────────────────────────────────────────────────────────────

export function loadHistory() {
  try {
    const raw = storage.getString(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries) {
  try {
    storage.set(HISTORY_KEY, JSON.stringify(entries));
  } catch {}
}

export function addHistoryEntry(entry) {
  const existing = loadHistory();
  const updated = [entry, ...existing].slice(0, 200);

  saveHistory(updated);
  return updated;
}

export function deleteHistoryEntry(id) {
  const existing = loadHistory();
  const updated = existing.filter(e => e.id !== id);

  saveHistory(updated);
  return updated;
}

export function clearAllHistory() {
  storage.delete(HISTORY_KEY);
  return [];
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function loadSettings() {
  try {
    const raw = storage.getString(SETTINGS_KEY);

    return raw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    storage.set(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatDate(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(2);

  let h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';

  h = h % 12 || 12;

  return `${d}/${m}/${y} ${h}:${min} ${ampm}`;
}

export function buildShareText(entry) {
  const dimLines = entry.dims
    .filter(d => d.value && !['pieces', 'kgPrice'].includes(d.id))
    .map(d => `${d.label} : ${d.value}${d.unit || 'mm'}`)
    .join('\n');

  return (
    `${entry.shapeName} - ${entry.date}\n\n` +
    `${dimLines}\n\n` +
    `Piece Weight : ${entry.weight} kg\n` +
    `Paint area : ${entry.area} m²\n` +
    (entry.total ? `Total : ${entry.total}\n` : '') +
    `\n----`
  );
}