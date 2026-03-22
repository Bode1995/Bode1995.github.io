import {
  BUNDLED_VOICEOVER_ASSETS,
  DEFAULT_VOICEOVER_PROVIDER_ORDER,
  EXTERNAL_VOICEOVER_PROVIDERS,
  PREMIUM_OPENAI_TTS_CONFIG,
  VOICEOVER_BACKGROUND_CONCURRENCY,
  VOICEOVER_CACHE_NAME,
  VOICEOVER_CACHE_READY_TIMEOUT_MS,
  VOICEOVER_LANGUAGE,
  VOICEOVER_PRIMARY_COUNT,
  buildVoiceoverCacheUrl,
  getVoiceoverCatalog,
} from '../config/voiceovers.js';

const DEEP_VOICE_HINTS = [
  'male',
  'mann',
  'man',
  'andreas',
  'markus',
  'thomas',
  'stefan',
  'michael',
  'christoph',
  'hans',
  'ralf',
  'daniel',
  'alex',
];

function normalizeVoiceName(value) {
  return String(value || '').trim().toLowerCase();
}

function getSpeechSynthesisApi() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

function canUseCacheStorage() {
  return typeof window !== 'undefined' && 'caches' in window;
}

async function openVoiceoverCache() {
  if (!canUseCacheStorage()) return null;
  return window.caches.open(VOICEOVER_CACHE_NAME);
}

function waitForTimeout(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    waitForTimeout(timeoutMs).then(() => ({ timedOut: true })),
  ]);
}

function buildVoiceoverRequest(missionKey) {
  return new Request(buildVoiceoverCacheUrl(missionKey), { method: 'GET' });
}

function hasServiceWorkerController() {
  return typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
}

function getReadableAudioMimeType(contentType) {
  const normalized = String(contentType || '').toLowerCase();
  if (normalized.includes('audio/ogg')) return 'audio/ogg';
  if (normalized.includes('audio/wav')) return 'audio/wav';
  if (normalized.includes('audio/flac')) return 'audio/flac';
  if (normalized.includes('audio/aac')) return 'audio/aac';
  return 'audio/mpeg';
}

async function cloneIntoObjectUrl(response) {
  if (!response || response.type === 'opaque') return null;
  const contentType = getReadableAudioMimeType(response.headers.get('content-type'));
  const buffer = await response.arrayBuffer();
  const blob = new Blob([buffer], { type: contentType });
  return URL.createObjectURL(blob);
}

function getRuntimeVoiceoverConfig() {
  const config = window.__SKY_BLASTER_RUNTIME_CONFIG__?.voiceover || {};
  const openAi = config.openAiCompatible || {};
  return {
    providerOrder: Array.isArray(config.providerOrder) && config.providerOrder.length ? config.providerOrder : DEFAULT_VOICEOVER_PROVIDER_ORDER,
    openAiCompatible: {
      ...PREMIUM_OPENAI_TTS_CONFIG,
      ...openAi,
      enabled: Boolean(openAi.enabled && openAi.apiKey),
      apiKey: typeof openAi.apiKey === 'string' ? openAi.apiKey.trim() : '',
      endpoint: typeof openAi.endpoint === 'string' && openAi.endpoint.trim() ? openAi.endpoint.trim() : PREMIUM_OPENAI_TTS_CONFIG.endpoint,
    },
    googleTranslate: {
      enabled: config.googleTranslate?.enabled !== false,
      host: typeof config.googleTranslate?.host === 'string' && config.googleTranslate.host.trim()
        ? config.googleTranslate.host.trim()
        : 'https://translate.google.com/translate_tts',
      client: config.googleTranslate?.client || 'tw-ob',
      language: config.googleTranslate?.language || 'de',
      textLengthLimit: Math.max(80, Number(config.googleTranslate?.textLengthLimit) || 190),
    },
  };
}

function buildGoogleTranslateUrl(text, config) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const params = new URLSearchParams({
    ie: 'UTF-8',
    tl: config.language,
    client: config.client,
    total: '1',
    idx: '0',
    textlen: String(trimmed.length),
    q: trimmed.slice(0, config.textLengthLimit),
  });
  return `${config.host}?${params.toString()}`;
}

async function fetchOpenAiCompatibleAudio({ text, config }) {
  if (!config.enabled || !config.apiKey || !text) return null;
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      voice: config.voice,
      input: text,
      response_format: config.responseFormat,
      speed: config.speed,
      instructions: config.instructions,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI-compatible TTS failed with ${response.status}`);
  return response;
}

async function fetchExternalVoiceoverResponse({ missionEntry, config }) {
  for (const provider of config.providerOrder) {
    if (provider === EXTERNAL_VOICEOVER_PROVIDERS.openAiCompatible) {
      try {
        const response = await fetchOpenAiCompatibleAudio({ text: missionEntry.text, config: config.openAiCompatible });
        if (response) return { response, playbackUrl: null, provider };
      } catch (error) {
        console.warn('[Voiceover] Premium TTS fetch failed.', error);
      }
      continue;
    }

    if (provider === EXTERNAL_VOICEOVER_PROVIDERS.googleTranslate && config.googleTranslate.enabled) {
      const playbackUrl = buildGoogleTranslateUrl(missionEntry.text, config.googleTranslate);
      if (!playbackUrl) continue;
      try {
        const response = await fetch(playbackUrl, { mode: 'no-cors' });
        return { response, playbackUrl, provider };
      } catch (error) {
        console.warn('[Voiceover] Google Translate TTS fetch failed.', error);
      }
    }
  }

  return null;
}

export function pickPreferredGermanVoice(voices = []) {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const scoredVoices = voices.map((voice, index) => {
    const lang = String(voice?.lang || '').toLowerCase();
    const name = normalizeVoiceName(voice?.name);
    let score = 0;

    if (lang.startsWith('de-de')) score += 120;
    else if (lang.startsWith('de')) score += 100;
    else if (lang.startsWith('de-')) score += 95;
    else if (lang.startsWith('en-gb')) score += 10;
    else if (lang.startsWith('en')) score += 5;

    if (voice?.localService) score += 8;
    if (voice?.default) score += 4;
    if (DEEP_VOICE_HINTS.some((hint) => name.includes(hint))) score += 18;
    if (name.includes('google deutsch') || name.includes('microsoft') || name.includes('deutsch')) score += 6;

    return { voice, index, score };
  });

  scoredVoices.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.index - right.index;
  });

  return scoredVoices[0]?.voice || null;
}

export function createMissionStoryVoiceover() {
  const audio = typeof Audio === 'undefined' ? null : new Audio();
  const missionEntryMap = new Map(getVoiceoverCatalog().map((entry) => [entry.key, entry]));
  const runtimeConfig = getRuntimeVoiceoverConfig();
  let currentPlaybackToken = 0;
  let currentObjectUrl = null;
  let warmupPromise = null;
  let lastInitSummary = null;

  if (audio) {
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
  }

  function revokeObjectUrl() {
    if (!currentObjectUrl) return;
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  function stopMissionVoiceover() {
    currentPlaybackToken += 1;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (_error) {
        // Ignore audio reset errors.
      }
    }
    revokeObjectUrl();

    const synthesis = getSpeechSynthesisApi();
    if (synthesis && (synthesis.speaking || synthesis.pending)) synthesis.cancel();
  }

  function playBrowserTtsFallback(text) {
    const synthesis = getSpeechSynthesisApi();
    const storyText = typeof text === 'string' ? text.trim() : '';
    if (!synthesis || !storyText || typeof SpeechSynthesisUtterance === 'undefined') return false;

    if (synthesis.speaking || synthesis.pending) synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(storyText);
    const selectedVoice = pickPreferredGermanVoice(synthesis.getVoices());

    utterance.lang = selectedVoice?.lang || VOICEOVER_LANGUAGE;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.92;
    utterance.pitch = 0.78;
    utterance.volume = 1;

    try {
      synthesis.speak(utterance);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function normalizeMissionEntry(missionKeyOrEntry) {
    if (!missionKeyOrEntry) return null;
    if (typeof missionKeyOrEntry === 'string') return missionEntryMap.get(missionKeyOrEntry) || null;
    if (missionKeyOrEntry.key && missionEntryMap.has(missionKeyOrEntry.key)) {
      return {
        ...missionEntryMap.get(missionKeyOrEntry.key),
        ...missionKeyOrEntry,
      };
    }
    return null;
  }

  async function hasCachedMissionVoiceover(missionKey) {
    const entry = normalizeMissionEntry(missionKey);
    if (!entry) return false;
    const cache = await openVoiceoverCache();
    if (!cache) return false;
    return Boolean(await cache.match(buildVoiceoverRequest(entry.key)));
  }

  async function resolveCachedPlayback(entry) {
    const cache = await openVoiceoverCache();
    if (!cache) return null;
    const response = await cache.match(buildVoiceoverRequest(entry.key));
    if (!response) return null;
    if (hasServiceWorkerController()) return { playbackSrc: buildVoiceoverCacheUrl(entry.key), source: 'cache-storage' };
    const objectUrl = await cloneIntoObjectUrl(response.clone());
    if (objectUrl) return { playbackSrc: objectUrl, source: 'cache-storage-object-url', objectUrl };
    if (runtimeConfig.googleTranslate.enabled) {
      const playbackUrl = buildGoogleTranslateUrl(entry.text, runtimeConfig.googleTranslate);
      if (playbackUrl) return { playbackSrc: playbackUrl, source: 'cache-storage-opaque-fallback' };
    }
    return null;
  }

  async function cacheMissionVoiceover(entry, response) {
    const cache = await openVoiceoverCache();
    if (!cache || !response) return false;
    await cache.put(buildVoiceoverRequest(entry.key), response.clone());
    return true;
  }

  async function cacheBundledVoiceover(entry) {
    const assetUrl = entry.assetUrl || BUNDLED_VOICEOVER_ASSETS[entry.key];
    if (!assetUrl) return null;
    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`Bundled voiceover fetch failed with ${response.status}`);
    await cacheMissionVoiceover(entry, response);
    return { playbackSrc: hasServiceWorkerController() ? buildVoiceoverCacheUrl(entry.key) : assetUrl, source: 'bundled-asset' };
  }

  async function getOrCreateMissionVoiceover(missionKeyOrEntry) {
    const entry = normalizeMissionEntry(missionKeyOrEntry);
    if (!entry) return null;

    const cached = await resolveCachedPlayback(entry);
    if (cached) return { ...cached, entry, cached: true };

    try {
      const bundled = await cacheBundledVoiceover(entry);
      if (bundled) return { ...bundled, entry, cached: false };
    } catch (error) {
      console.warn('[Voiceover] Bundled voiceover warmup failed.', error);
    }

    const externalResult = await fetchExternalVoiceoverResponse({ missionEntry: entry, config: runtimeConfig });
    if (!externalResult?.response) return null;

    try {
      await cacheMissionVoiceover(entry, externalResult.response);
      const cachedPlayback = await resolveCachedPlayback(entry);
      if (cachedPlayback) return { ...cachedPlayback, entry, cached: false, provider: externalResult.provider };
    } catch (error) {
      console.warn('[Voiceover] Failed to store external voiceover in cache.', error);
    }

    if (externalResult.playbackUrl) {
      return { playbackSrc: externalResult.playbackUrl, entry, cached: false, provider: externalResult.provider, source: 'external-direct' };
    }

    const objectUrl = await cloneIntoObjectUrl(externalResult.response.clone());
    if (!objectUrl) return null;
    return { playbackSrc: objectUrl, entry, cached: false, provider: externalResult.provider, source: 'external-object-url', objectUrl };
  }

  async function playMissionVoiceover(missionKeyOrEntry) {
    const entry = normalizeMissionEntry(missionKeyOrEntry);
    if (!entry) return false;

    stopMissionVoiceover();
    const playbackToken = currentPlaybackToken;

    try {
      const result = await getOrCreateMissionVoiceover(entry);
      if (playbackToken !== currentPlaybackToken) return false;
      if (!result?.playbackSrc || !audio) return playBrowserTtsFallback(entry.text);

      revokeObjectUrl();
      currentObjectUrl = result.objectUrl || null;
      audio.src = result.playbackSrc;
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch (error) {
      console.warn('[Voiceover] Audio playback failed, falling back to browser TTS.', error);
      return playBrowserTtsFallback(entry.text);
    }
  }

  async function warmupMissionVoiceover(missionKeyOrEntry) {
    const entry = normalizeMissionEntry(missionKeyOrEntry);
    if (!entry) return false;
    const voiceover = await getOrCreateMissionVoiceover(entry);
    if (voiceover?.objectUrl) URL.revokeObjectURL(voiceover.objectUrl);
    return Boolean(voiceover?.playbackSrc);
  }

  function prioritizeCatalog(missionKey) {
    const catalog = getVoiceoverCatalog();
    if (!missionKey) return catalog;
    const prioritized = [];
    const seen = new Set();
    for (const key of [missionKey, ...catalog.slice(0, VOICEOVER_PRIMARY_COUNT - 1).map((entry) => entry.key)]) {
      if (!key || seen.has(key)) continue;
      const entry = missionEntryMap.get(key);
      if (!entry) continue;
      seen.add(key);
      prioritized.push(entry);
    }
    for (const entry of catalog) {
      if (seen.has(entry.key)) continue;
      seen.add(entry.key);
      prioritized.push(entry);
    }
    return prioritized;
  }

  async function preloadEntries(entries, concurrency = 1) {
    const queue = [...entries];
    const results = [];
    async function worker() {
      while (queue.length) {
        const entry = queue.shift();
        try {
          results.push({ key: entry.key, ready: await warmupMissionVoiceover(entry) });
        } catch (error) {
          console.warn('[Voiceover] Warmup failed.', error);
          results.push({ key: entry.key, ready: false });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
    return results;
  }

  async function prepareVoiceovers({ missionKey } = {}) {
    const orderedCatalog = prioritizeCatalog(missionKey);
    const primaryEntries = orderedCatalog.slice(0, VOICEOVER_PRIMARY_COUNT);
    const backgroundEntries = orderedCatalog.slice(VOICEOVER_PRIMARY_COUNT);

    const primaryWarmup = preloadEntries(primaryEntries, 1).then((results) => ({
      results,
      readyCount: results.filter((entry) => entry.ready).length,
      expectedCount: primaryEntries.length,
    }));

    const primaryResult = await withTimeout(primaryWarmup, VOICEOVER_CACHE_READY_TIMEOUT_MS);
    const fallbackReady = Boolean(getSpeechSynthesisApi());
    const readyCount = primaryResult?.readyCount || 0;
    const expectedCount = primaryResult?.expectedCount || primaryEntries.length;
    const fullyReady = readyCount >= Math.min(1, expectedCount);

    warmupPromise = preloadEntries(backgroundEntries, VOICEOVER_BACKGROUND_CONCURRENCY)
      .catch((error) => console.warn('[Voiceover] Background preload failed.', error));

    lastInitSummary = {
      readyCount,
      expectedCount,
      fullyReady,
      usedFallback: !fullyReady && fallbackReady,
      timedOut: Boolean(primaryResult?.timedOut),
    };
    return lastInitSummary;
  }

  function getInitSummary() {
    return lastInitSummary;
  }

  return {
    getOrCreateMissionVoiceover,
    playMissionStoryVoiceover: playMissionVoiceover,
    playMissionVoiceover,
    stopMissionStoryVoiceover: stopMissionVoiceover,
    stopMissionVoiceover,
    hasCachedMissionVoiceover,
    prepareVoiceovers,
    getInitSummary,
    waitForBackgroundWarmup: () => warmupPromise || Promise.resolve(),
    playBrowserTtsFallback,
  };
}
