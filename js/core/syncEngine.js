import { storageEngine } from './storageEngine.js';
import { validateSyncOperation } from './validator.js';

export const syncEngine = {
  async enqueue(operation) {
    const check = validateSyncOperation(operation);
    if (!check.valid) throw new Error(check.errors.join(', '));
    await storageEngine.put('syncOps', operation);
    return operation;
  },
  async flush() {
    return { flushed: 0, mode: 'stub', reason: 'server_api_unspecified' };
  }
};
