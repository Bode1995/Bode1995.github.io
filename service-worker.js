const CACHE_NAME = 'sky-blaster-3d-v15';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/audio/Background1.mp3',
  './assets/audio/Background2.mp3',
  './assets/audio/Background3.mp3',
  './assets/audio/Laufen.mp3',
  './assets/audio/Power up sammeln.mp3',
  './assets/audio/Spieler tot.mp3',
  './assets/audio/Gegner tot.mp3',
  './assets/audio/Welt 1.mp3',
  './assets/audio/Welt2.mp3',
  './assets/audio/Welt3.mp3',
  './assets/audio/Welt4.mp3',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/icons/apple-touch-icon.svg',
  './src/main.js',
  './src/config/gameConfig.js',
  './src/config/campaigns.js',
  './src/config/bosses.js',
  './src/config/missionStories.js',
  './src/config/specialAbilities.js',
  './src/config/worlds.js',
  './src/config/worldLayouts.js',
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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requests = ASSETS.map((asset) => new Request(asset, { cache: 'reload' }));
    await cache.addAll(requests);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function isAppShellRequest(requestUrl, request) {
  return request.mode === 'navigate'
    || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.css')
    || requestUrl.pathname.endsWith('.html')
    || requestUrl.pathname.endsWith('.webmanifest')
    || requestUrl.pathname.endsWith('.mp3')
    || requestUrl.pathname.endsWith('.svg');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isAppShellRequest(requestUrl, event.request)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request, { ignoreSearch: requestUrl.pathname === '/' || requestUrl.pathname.endsWith('/index.html') });
        if (cached) return cached;

        try {
          const response = await fetch(event.request, { cache: 'no-store' });
          if (response && response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch (_error) {
          if (event.request.mode === 'navigate') return cache.match('./index.html');
          throw _error;
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.ok) cache.put(event.request, response.clone());
        return response;
      });
    })
  );
});
