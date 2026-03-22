const APP_CACHE_NAME = 'sky-blaster-3d-v11';
const VOICEOVER_CACHE_NAME = 'sky-blaster-voiceovers-v1';
const VOICEOVER_ROUTE_SEGMENT = '/__voiceovers__/';
const VOICEOVER_PRELOAD_MESSAGE = 'VOICEOVER_PRELOAD';
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

async function addShellAssets() {
  const cache = await caches.open(APP_CACHE_NAME);
  await cache.addAll(ASSETS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(addShellAssets());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== APP_CACHE_NAME && key !== VOICEOVER_CACHE_NAME)
        .filter((key) => !key.startsWith('sky-blaster-voiceovers-'))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === VOICEOVER_PRELOAD_MESSAGE) {
    event.waitUntil((async () => {
      const result = await preloadVoiceoverDescriptor(event.data.descriptor);
      event.ports?.[0]?.postMessage({ result });
    })());
  }
});

function isAppShellRequest(requestUrl, request) {
  return request.mode === 'navigate'
    || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.css')
    || requestUrl.pathname.endsWith('.html')
    || requestUrl.pathname.endsWith('.webmanifest');
}

function isVoiceoverRequest(requestUrl) {
  return requestUrl.origin === self.location.origin && requestUrl.pathname.includes(VOICEOVER_ROUTE_SEGMENT);
}

async function preloadVoiceoverDescriptor(descriptor) {
  if (!descriptor?.cacheUrl || !descriptor?.sourceUrl || !descriptor?.key) {
    return {
      key: descriptor?.key || 'unknown',
      status: 'fallback',
      source: 'speechSynthesis',
      reason: 'invalid-descriptor',
    };
  }

  const cache = await caches.open(VOICEOVER_CACHE_NAME);
  const cacheRequest = new Request(descriptor.cacheUrl, { method: 'GET' });
  const cached = await cache.match(cacheRequest);
  if (cached) {
    return {
      key: descriptor.key,
      status: 'ready',
      source: 'cache',
    };
  }

  try {
    const response = await fetch(descriptor.sourceUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    });

    await cache.put(cacheRequest, response.clone());

    return {
      key: descriptor.key,
      status: 'ready',
      source: 'network',
    };
  } catch (_error) {
    return {
      key: descriptor.key,
      status: 'fallback',
      source: 'speechSynthesis',
      reason: 'network-fetch-failed',
    };
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  if (isVoiceoverRequest(requestUrl)) {
    event.respondWith((async () => {
      const cache = await caches.open(VOICEOVER_CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return new Response('', { status: 404, statusText: 'Voiceover not cached' });
    })());
    return;
  }

  if (requestUrl.origin !== self.location.origin) return;

  if (isAppShellRequest(requestUrl, event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE_NAME).then((cache) => cache.put(event.request, copy));
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
        caches.open(APP_CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
