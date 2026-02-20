const MAX_LOGS = 1000;

export function addLog(state, action, details = {}, severity = 'green') {
  const entry = {
    id: crypto.randomUUID(),
    action,
    details,
    severity,
    timestamp: new Date().toISOString()
  };
  state.logs.unshift(entry);
  if (state.logs.length > MAX_LOGS) state.logs.length = MAX_LOGS;
  return entry;
}
