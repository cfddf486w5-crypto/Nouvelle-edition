const CACHE_VERSION = 'dlwms-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/core/eventBus.js',
  '/js/core/stateEngine.js',
  '/js/core/storageEngine.js',
  '/js/core/syncEngine.js',
  '/js/core/aiAdapter.js',
  '/js/core/validator.js',
  '/js/core/auditEngine.js',
  '/js/core/performance.js',
  '/js/modules/remise.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
    return res;
  }).catch(() => cached)));
});
