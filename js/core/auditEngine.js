import { storageEngine } from './storageEngine.js';

export const auditEngine = {
  async log(action, entity, entityId, details = {}) {
    const row = {
      auditId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tsMs: Date.now(),
      ts: new Date().toISOString(),
      action,
      entity,
      entityId,
      details
    };
    await storageEngine.put('audit', row);
    return row;
  }
};
