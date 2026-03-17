const CACHE_NAME = 'sky-blaster-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/icons/apple-touch-icon.svg',
  './src/main.js',
  './src/core/config.js',
  './src/core/state.js',
  './src/core/utils.js',
  './src/entities/player.js',
  './src/entities/enemy.js',
  './src/entities/bullet.js',
  './src/systems/input.js',
  './src/systems/particles.js',
  './src/systems/render.js',
  './src/systems/update.js',
  './src/ui/dom.js',
  './src/pwa/register-sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
