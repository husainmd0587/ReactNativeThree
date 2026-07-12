// ── Format helpers ────────────────────────────────────────────────────────────
// Pure functions only — no MMKV, no persistence. History/settings state now
// lives in appData.js (React state via AppDataProvider / useAppData).

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
