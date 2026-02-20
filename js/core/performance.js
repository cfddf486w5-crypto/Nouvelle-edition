export function batchFrame(callback) {
  requestAnimationFrame(() => callback());
}

export function startLongTaskObserver() {
  if (!('PerformanceObserver' in window)) return null;
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration >= 50) console.warn('[LongTask]', entry.duration.toFixed(1), 'ms');
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
    return observer;
  } catch {
    return null;
  }
}
