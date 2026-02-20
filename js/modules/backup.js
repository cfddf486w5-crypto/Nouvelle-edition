import { DLWMS_STATE, saveState } from '../core/state.js';

let backupTimer = null;

export function runAutoBackup() {
  const snap = structuredClone(DLWMS_STATE);
  DLWMS_STATE.backups.unshift({ createdAt: Date.now(), state: snap });
  if (DLWMS_STATE.backups.length > 5) DLWMS_STATE.backups.length = 5;
  saveState();
}

export function initBackupModule() {
  if (!DLWMS_STATE.settings.autoBackup) return;
  clearInterval(backupTimer);
  backupTimer = setInterval(runAutoBackup, 10 * 60 * 1000);
}
