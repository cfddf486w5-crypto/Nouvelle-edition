const STORAGE_KEY = 'dlwms_state_v2';
const BACKUP_KEY = 'dlwms_backups_v2';

export function safeParseJSON(value, fallback = null) {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function checksum(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function saveStatePayload(state) {
  const serialized = JSON.stringify(state);
  const payload = { state, checksum: checksum(serialized), savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadStatePayload() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const payload = safeParseJSON(raw);
  if (!payload?.state || !payload?.checksum) return null;
  const serialized = JSON.stringify(payload.state);
  if (checksum(serialized) !== payload.checksum) return null;
  return payload.state;
}

export function appendBackup(snapshot, max = 20) {
  const current = safeParseJSON(localStorage.getItem(BACKUP_KEY), []);
  current.unshift(snapshot);
  if (current.length > max) current.length = max;
  localStorage.setItem(BACKUP_KEY, JSON.stringify(current));
  return current;
}

export function loadBackups() {
  return safeParseJSON(localStorage.getItem(BACKUP_KEY), []);
}
