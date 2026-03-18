const CACHE_NAME = 'sky-blaster-3d-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/icons/apple-touch-icon.svg',
  './src/main.js',
  './src/config/gameConfig.js',
  './src/core/gameApp.js',
  './src/core/profile.js',
  './src/core/state.js',
  './src/pwa/register-sw.js',
  './src/ui/dom.js',
  './src/ui/menu.js',
  './src/ui/characterSelection.js',
  './src/entities/characters.js',
  './src/systems/worldSystem.js',
  './src/systems/collisionSystem.js',
  './src/systems/combatSystem.js',
  './src/systems/enemySystem.js',
  './src/systems/inputSystem.js',
  './src/systems/performanceSystem.js',
  './src/systems/projectileSystem.js',
  './src/systems/vfxSystem.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
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
          if (!event.request.url.startsWith('http')) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
