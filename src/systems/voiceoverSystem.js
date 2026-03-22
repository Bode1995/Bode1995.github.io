import { getAllMissionStories } from '../config/missionStories.js';

const VOICEOVER_ROUTE_PREFIX = './__voiceovers__/';
const VOICEOVER_ROUTE_VERSION = 'v1';
const PUBLIC_TTS_BASE_URL = 'https://translate.google.com/translate_tts';
const PUBLIC_TTS_QUERY_BASE = 'ie=UTF-8&client=tw-ob&tl=de';
const PRELOAD_MESSAGE_TYPE = 'VOICEOVER_PRELOAD';
const PRELOAD_TIMEOUT_MS = 20000;

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

function createStoryHash(text = '') {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function createExternalTtsUrl(text) {
  const params = new URLSearchParams(PUBLIC_TTS_QUERY_BASE);
  params.set('q', text);
  return `${PUBLIC_TTS_BASE_URL}?${params.toString()}`;
}

function createCacheUrl(storyKey, storyText) {
  const storyHash = createStoryHash(storyText);
  const relativePath = `${VOICEOVER_ROUTE_PREFIX}${VOICEOVER_ROUTE_VERSION}/${storyKey}.mp3?story=${storyHash}`;
  return new URL(relativePath, window.location.href).toString();
}

function createVoiceoverDescriptor(story) {
  return {
    key: story.key,
    title: story.title,
    text: story.text,
    cacheUrl: createCacheUrl(story.key, story.text),
    sourceUrl: createExternalTtsUrl(story.text),
  };
}

function getServiceWorkerMessageTarget(registration) {
  return navigator.serviceWorker.controller || registration?.active || registration?.waiting || registration?.installing || null;
}

function requestServiceWorkerPreload(registration, descriptor) {
  const target = getServiceWorkerMessageTarget(registration);
  if (!target) {
    return Promise.resolve({
      key: descriptor.key,
      status: 'fallback',
      source: 'speechSynthesis',
      reason: 'service-worker-unavailable',
      cacheUrl: descriptor.cacheUrl,
      sourceUrl: descriptor.sourceUrl,
    });
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      resolve({
        key: descriptor.key,
        status: 'fallback',
        source: 'speechSynthesis',
        reason: 'service-worker-timeout',
        cacheUrl: descriptor.cacheUrl,
        sourceUrl: descriptor.sourceUrl,
      });
    }, PRELOAD_TIMEOUT_MS);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeoutId);
      const result = event?.data?.result;
      if (result?.status) {
        resolve({
          ...result,
          cacheUrl: descriptor.cacheUrl,
          sourceUrl: descriptor.sourceUrl,
        });
        return;
      }

      resolve({
        key: descriptor.key,
        status: 'fallback',
        source: 'speechSynthesis',
        reason: 'service-worker-invalid-response',
        cacheUrl: descriptor.cacheUrl,
        sourceUrl: descriptor.sourceUrl,
      });
    };

    try {
      target.postMessage({ type: PRELOAD_MESSAGE_TYPE, descriptor }, [channel.port2]);
    } catch (_error) {
      window.clearTimeout(timeoutId);
      resolve({
        key: descriptor.key,
        status: 'fallback',
        source: 'speechSynthesis',
        reason: 'service-worker-postmessage-failed',
        cacheUrl: descriptor.cacheUrl,
        sourceUrl: descriptor.sourceUrl,
      });
    }
  });
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

export function createMissionStoryVoiceover({ serviceWorkerRegistrationPromise = Promise.resolve(null) } = {}) {
  const storyEntries = getAllMissionStories();
  const storyDescriptors = new Map(storyEntries.map((story) => [story.key, createVoiceoverDescriptor(story)]));
  const readiness = new Map();
  let initPromise = null;
  let activeAudio = null;

  function stopMissionStoryVoiceover() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.src = '';
      activeAudio = null;
    }

    const synthesis = getSpeechSynthesisApi();
    if (!synthesis) return;
    if (synthesis.speaking || synthesis.pending) synthesis.cancel();
  }

  function playSpeechSynthesisFallback(text) {
    const synthesis = getSpeechSynthesisApi();
    const storyText = typeof text === 'string' ? text.trim() : '';
    if (!synthesis || !storyText || typeof SpeechSynthesisUtterance === 'undefined') return false;

    if (synthesis.speaking || synthesis.pending) synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(storyText);
    const selectedVoice = pickPreferredGermanVoice(synthesis.getVoices());

    utterance.lang = selectedVoice?.lang || 'de-DE';
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

  function resolveDescriptor(story) {
    if (!story?.key) return null;
    return storyDescriptors.get(story.key) || null;
  }

  async function initializeMissionStoryVoiceovers(onProgress) {
    if (!initPromise) {
      initPromise = (async () => {
        const registration = await serviceWorkerRegistrationPromise.catch(() => null);
        const results = [];
        const total = storyEntries.length;
        let completed = 0;

        for (const story of storyEntries) {
          const descriptor = storyDescriptors.get(story.key);
          const result = await requestServiceWorkerPreload(registration, descriptor);
          readiness.set(story.key, {
            ...result,
            key: story.key,
            cacheUrl: descriptor.cacheUrl,
            sourceUrl: descriptor.sourceUrl,
          });
          results.push(readiness.get(story.key));
          completed += 1;
          if (typeof onProgress === 'function') {
            onProgress({
              completed,
              total,
              story,
              result: readiness.get(story.key),
            });
          }
        }

        const readyCount = results.filter((entry) => entry.status === 'ready').length;
        const fallbackCount = results.length - readyCount;
        return {
          total,
          readyCount,
          fallbackCount,
          results,
        };
      })();
    }

    return initPromise;
  }

  async function playMissionStoryVoiceover(story) {
    const storyText = typeof story === 'string' ? story.trim() : String(story?.text || '').trim();
    if (!storyText) return false;

    stopMissionStoryVoiceover();

    const descriptor = typeof story === 'object' ? resolveDescriptor(story) : null;
    const cachedState = descriptor ? readiness.get(descriptor.key) : null;
    const playbackUrl = cachedState?.status === 'ready' ? cachedState.cacheUrl : cachedState?.sourceUrl || descriptor?.sourceUrl || null;

    if (playbackUrl) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = playbackUrl;
      audio.addEventListener('ended', () => {
        if (activeAudio === audio) activeAudio = null;
      }, { once: true });
      activeAudio = audio;
      try {
        await audio.play();
        return true;
      } catch (_error) {
        if (activeAudio === audio) activeAudio = null;
        if (descriptor) {
          readiness.set(descriptor.key, {
            ...(cachedState || {}),
            key: descriptor.key,
            status: 'fallback',
            source: 'speechSynthesis',
            reason: 'audio-playback-failed',
            cacheUrl: descriptor.cacheUrl,
            sourceUrl: descriptor.sourceUrl,
          });
        }
      }
    }

    return playSpeechSynthesisFallback(storyText);
  }

  function getVoiceoverStatus(storyKey) {
    return readiness.get(storyKey) || null;
  }

  return {
    getVoiceoverStatus,
    initializeMissionStoryVoiceovers,
    playMissionStoryVoiceover,
    stopMissionStoryVoiceover,
  };
}
