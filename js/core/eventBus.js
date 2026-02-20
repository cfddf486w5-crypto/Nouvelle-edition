const listeners = new Map();

export const eventBus = {
  subscribe(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => this.unsubscribe(event, handler);
  },
  publish(event, payload) {
    const direct = listeners.get(event) || new Set();
    const wildcard = listeners.get('*') || new Set();
    [...direct, ...wildcard].forEach((handler) => {
      try {
        handler(payload, event);
      } catch (error) {
        console.error('[eventBus]', event, error);
      }
    });
  },
  unsubscribe(event, handler) {
    const scope = listeners.get(event);
    if (!scope) return;
    scope.delete(handler);
    if (!scope.size) listeners.delete(event);
  }
};
