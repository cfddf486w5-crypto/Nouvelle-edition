import { rafBatch } from './performance.js';

export function setHTML(selector, html) {
  const node = document.querySelector(selector);
  if (!node) return;
  rafBatch(() => {
    node.innerHTML = html;
  });
}

export function setText(selector, text) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.textContent = text;
}

export function toast(message) {
  window.alert(message);
}
