const listeners = new Map();

export const eventBus = {
  subscribe(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => this.unsubscribe(event, handler);
  },
  publish(event, payload) {
    if (!listeners.has(event)) return;
    listeners.get(event).forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[eventBus]', event, error);
      }
    });
  },
  unsubscribe(event, handler) {
    if (!listeners.has(event)) return;
    listeners.get(event).delete(handler);
    if (!listeners.get(event).size) listeners.delete(event);
  }
};
