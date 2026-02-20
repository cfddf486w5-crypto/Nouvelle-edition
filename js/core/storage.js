const STORAGE_KEY = 'dlwms_state_v1';

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

export function loadPersistedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const payload = safeParseJSON(raw, null);
  if (!payload || !payload.state || !payload.checksum) return null;
  const serialized = JSON.stringify(payload.state);
  if (checksum(serialized) !== payload.checksum) return null;
  return payload.state;
}

export function savePersistedState(state) {
  const serialized = JSON.stringify(state);
  const payload = { state, checksum: checksum(serialized), savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function withStorageGuard(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
