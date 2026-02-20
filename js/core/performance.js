export function debounce(fn, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last < wait) return;
    last = now;
    fn(...args);
  };
}

export function rafBatch(callback) {
  requestAnimationFrame(callback);
}

export function renderVirtualRows(rows, rowRenderer, container, start = 0, chunkSize = 200) {
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  rows.slice(start, start + chunkSize).forEach((row, idx) => fragment.appendChild(rowRenderer(row, idx + start)));
  container.appendChild(fragment);
}
