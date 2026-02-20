const MAX_LOGS = 500;

export function addLog(state, action, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    action,
    details,
    timestamp: new Date().toISOString()
  };
  state.logs.unshift(entry);
  if (state.logs.length > MAX_LOGS) state.logs.length = MAX_LOGS;
}
