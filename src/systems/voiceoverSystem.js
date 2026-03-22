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

export const WORLD_INTRO_VOICEOVER_WORLDS = Object.freeze([1, 2, 3, 4]);

function normalizeVoiceName(value) {
  return String(value || '').trim().toLowerCase();
}

function getSpeechSynthesisApi() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
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

export function createWorldIntroVoiceover() {
  function stopWorldIntroVoiceover() {
    const synthesis = getSpeechSynthesisApi();
    if (!synthesis) return;
    if (synthesis.speaking || synthesis.pending) synthesis.cancel();
  }

  function warmWorldIntroVoiceoverCache() {
    const synthesis = getSpeechSynthesisApi();
    if (!synthesis) return [];
    return synthesis.getVoices();
  }

  function playWorldIntroVoiceover(worldIntro) {
    const synthesis = getSpeechSynthesisApi();
    const storyText = typeof worldIntro?.text === 'string' ? worldIntro.text.trim() : '';
    if (!synthesis || !storyText || typeof SpeechSynthesisUtterance === 'undefined') return false;

    if (synthesis.speaking || synthesis.pending) synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(storyText);
    const selectedVoice = pickPreferredGermanVoice(warmWorldIntroVoiceoverCache());

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

  return {
    playWorldIntroVoiceover,
    stopWorldIntroVoiceover,
    warmWorldIntroVoiceoverCache,
  };
}
