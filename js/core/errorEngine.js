export function withErrorBoundary(fn, fallback = () => {}) {
  try { return fn(); } catch (error) { console.error('[errorEngine]', error); return fallback(error); }
}
