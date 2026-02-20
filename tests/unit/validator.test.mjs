import assert from 'node:assert/strict';
import { validateAiSuggestion, validateRemise, validateSyncOperation } from '../../js/core/validator.js';

const validRemise = {
  id: 'LAVREM0001',
  warehouse: 'LAVAL',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [{ sku: 'SKU123', qtyTotal: 2, qtyRemaining: 2, flags: { scrap: false, rebox: false, forced: false } }],
  cursor: { index: 0 }
};

assert.equal(validateRemise(validRemise).valid, true);
assert.equal(validateRemise({ ...validRemise, id: '***' }).valid, false);
assert.equal(
  validateRemise({
    ...validRemise,
    items: [{ sku: 'SKU123', qtyTotal: 1, qtyRemaining: 0, flags: { scrap: false, rebox: false, forced: true } }]
  }).valid,
  false
);

assert.equal(
  validateAiSuggestion({ source: 'heuristic', suggestion: 'Prioriser zone A', confidence: 0.6 }).valid,
  true
);
assert.equal(validateAiSuggestion({ source: 'heuristic', suggestion: '', confidence: 1.2 }).valid, false);

assert.equal(validateSyncOperation({ opId: 'op1', patch: [{ op: 'replace', path: '/status', value: 'pending' }] }).valid, true);
assert.equal(validateSyncOperation({ opId: 'op2', patch: [] }).valid, false);
console.log('validator.test.mjs passed');
