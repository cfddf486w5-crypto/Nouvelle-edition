const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function validateRemise(remise) {
  const errors = [];
  if (!ID_RE.test(remise.id || '')) errors.push('id invalide');
  if (!['draft', 'pending', 'in_progress', 'completed', 'cancelled'].includes(remise.status)) errors.push('status invalide');
  if (!Array.isArray(remise.items)) errors.push('items requis');
  remise.items?.forEach((item, idx) => {
    if (!ID_RE.test(item.sku || '')) errors.push(`item[${idx}] sku invalide`);
    if (!(item.qtyTotal > 0)) errors.push(`item[${idx}] qtyTotal invalide`);
    if (item.qtyRemaining < 0) errors.push(`item[${idx}] qtyRemaining invalide`);
  });
  return { valid: errors.length === 0, errors };
}

export function validateSyncOperation(op) {
  const ok = op?.opId && Array.isArray(op.patch) && op.patch.length > 0;
  return { valid: Boolean(ok), errors: ok ? [] : ['syncOperation invalide'] };
}
