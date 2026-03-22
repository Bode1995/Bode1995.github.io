import { getAllMissionStoryEntries, getMissionStoryKey } from './missionStories.js';

export const VOICEOVER_LANGUAGE = 'de-DE';
export const VOICEOVER_LANGUAGE_LABEL = 'de';
export const VOICEOVER_VERSION = '2026-03-voice-v1';
export const VOICEOVER_CACHE_NAME = `sky-blaster-voiceovers-${VOICEOVER_VERSION}`;
export const VOICEOVER_CACHE_PATH_PREFIX = `./__voiceover__/${VOICEOVER_LANGUAGE_LABEL}/${VOICEOVER_VERSION}`;
export const VOICEOVER_CACHE_READY_TIMEOUT_MS = 2800;
export const VOICEOVER_BACKGROUND_CONCURRENCY = 2;
export const VOICEOVER_PRIMARY_COUNT = 3;

export const PREMIUM_OPENAI_TTS_CONFIG = Object.freeze({
  endpoint: 'https://api.openai.com/v1/audio/speech',
  model: 'gpt-4o-mini-tts',
  voice: 'ash',
  responseFormat: 'mp3',
  speed: 0.94,
  instructions: 'Sprich auf Deutsch mit ruhiger, klarer, natürlicher, eher tiefer Stimme. Klinge gelassen, warm und nüchtern. Keine Übertreibung, keine Radio-Show, keine Theatralik.',
});

export const EXTERNAL_VOICEOVER_PROVIDERS = Object.freeze({
  openAiCompatible: 'openai-compatible',
  googleTranslate: 'google-translate',
});

export const DEFAULT_VOICEOVER_PROVIDER_ORDER = Object.freeze([
  EXTERNAL_VOICEOVER_PROVIDERS.openAiCompatible,
  EXTERNAL_VOICEOVER_PROVIDERS.googleTranslate,
]);

export const BUNDLED_VOICEOVER_ASSETS = Object.freeze({
});

export function getVoiceoverCatalog() {
  return getAllMissionStoryEntries().map((entry) => ({
    ...entry,
    cacheKey: buildVoiceoverCacheKey(entry.key),
    assetUrl: BUNDLED_VOICEOVER_ASSETS[entry.key] || null,
  }));
}

export function buildVoiceoverCacheKey(missionKey) {
  return `${VOICEOVER_LANGUAGE}:${VOICEOVER_VERSION}:${missionKey}`;
}

export function buildVoiceoverCacheUrl(missionKey) {
  return `${VOICEOVER_CACHE_PATH_PREFIX}/${encodeURIComponent(buildVoiceoverCacheKey(missionKey))}.mp3`;
}

export function getMissionVoiceoverDescriptor(mission) {
  const missionKey = getMissionStoryKey(mission);
  if (!missionKey) return null;
  const entry = getVoiceoverCatalog().find((candidate) => candidate.key === missionKey);
  return entry || null;
}
