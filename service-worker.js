const CACHE_NAME = 'sky-blaster-3d-v11';
const VOICEOVER_CACHE_NAME = 'sky-blaster-voiceovers-2026-03-voice-v1';
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
  './src/config/campaigns.js',
  './src/config/bosses.js',
  './src/config/missionStories.js',
  './src/config/voiceovers.js',
  './src/config/specialAbilities.js',
  './src/config/worlds.js',
  './src/core/gameApp.js',
  './src/core/profile.js',
  './src/core/state.js',
  './src/core/utils.js',
  './src/pwa/register-sw.js',
  './src/ui/dom.js',
  './src/ui/menu.js',
  './src/ui/characterSelection.js',
  './src/entities/bullet.js',
  './src/entities/characters.js',
  './src/systems/audio.js',
  './src/systems/bossSystem.js',
  './src/systems/collisionSystem.js',
  './src/systems/combatSystem.js',
  './src/systems/enemyRuntimeUtils.js',
  './src/systems/enemySystem.js',
  './src/systems/inputSystem.js',
  './src/systems/particles.js',
  './src/systems/performanceSystem.js',
  './src/systems/projectileSystem.js',
  './src/systems/specialAbilitySystem.js',
  './src/systems/synergySystem.js',
  './src/systems/voiceoverSystem.js',
  './src/systems/vfxSystem.js',
  './src/systems/worldSystem.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME && key !== VOICEOVER_CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function isAppShellRequest(requestUrl, request) {
  return request.mode === 'navigate'
    || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.css')
    || requestUrl.pathname.endsWith('.html')
    || requestUrl.pathname.endsWith('.webmanifest');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.includes('/__voiceover__/')) {
    event.respondWith(
      caches.open(VOICEOVER_CACHE_NAME)
        .then((cache) => cache.match(event.request))
        .then((cached) => cached || new Response('', { status: 404, statusText: 'Voiceover not cached' }))
    );
    return;
  }

  if (isAppShellRequest(requestUrl, event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
