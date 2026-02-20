export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function toPositiveNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}
