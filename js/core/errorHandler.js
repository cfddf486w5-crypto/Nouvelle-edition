import { eventBus } from './eventBus.js';

export function guard(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    handleError(error);
    return fallback;
  }
}

export function handleError(error) {
  console.error('[DLWMS]', error);
  eventBus.publish('error', { message: error?.message || 'Unknown error', stack: error?.stack || '' });
}
