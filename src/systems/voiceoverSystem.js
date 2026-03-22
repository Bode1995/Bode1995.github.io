const AUDIO_ASSET_BASE_URL = new URL('../../assets/audio/', import.meta.url);
const WORLD_INTRO_AUDIO_FILES = Object.freeze({
  1: 'Welt 1.mp3',
  2: 'Welt2.mp3',
  3: 'Welt3.mp3',
  4: 'Welt4.mp3',
});

function getWorldNumber(worldOrIntro) {
  if (Number.isInteger(worldOrIntro)) return worldOrIntro;
  if (worldOrIntro && Number.isInteger(worldOrIntro.world)) return worldOrIntro.world;
  return null;
}

function getWorldIntroAudioDescriptor(worldOrIntro) {
  const world = getWorldNumber(worldOrIntro);
  const file = WORLD_INTRO_AUDIO_FILES[world] || null;
  if (!file) return null;
  return {
    world,
    file,
    src: new URL(file, AUDIO_ASSET_BASE_URL).href,
  };
}

export function createWorldIntroVoiceover() {
  let introAudioEl = null;
  let activeWorld = null;
  let activeSrc = '';

  function ensureAudioElement() {
    if (introAudioEl) return introAudioEl;
    introAudioEl = new Audio();
    introAudioEl.preload = 'auto';
    introAudioEl.loop = false;
    introAudioEl.volume = 1;
    introAudioEl.playsInline = true;
    introAudioEl.setAttribute('playsinline', 'true');
    introAudioEl.addEventListener('ended', () => {
      activeWorld = null;
      activeSrc = '';
    });
    introAudioEl.addEventListener('error', () => {
      activeWorld = null;
      activeSrc = '';
    });
    return introAudioEl;
  }

  function hasWorldIntroVoiceover(worldOrIntro) {
    return !!getWorldIntroAudioDescriptor(worldOrIntro);
  }

  function stopWorldIntroVoiceover() {
    if (!introAudioEl) {
      activeWorld = null;
      activeSrc = '';
      return;
    }
    introAudioEl.pause();
    introAudioEl.currentTime = 0;
    activeWorld = null;
    activeSrc = '';
  }

  async function playWorldIntroVoiceover(worldOrIntro) {
    const descriptor = getWorldIntroAudioDescriptor(worldOrIntro);
    if (!descriptor) return false;

    const audioElement = ensureAudioElement();
    const isSameIntroStillRunning = activeWorld === descriptor.world
      && !audioElement.paused
      && !audioElement.ended
      && audioElement.currentTime > 0;
    if (isSameIntroStillRunning) return true;

    if (activeSrc !== descriptor.src) {
      audioElement.pause();
      audioElement.src = descriptor.src;
      audioElement.load();
      activeSrc = descriptor.src;
    } else if (!audioElement.paused) {
      audioElement.pause();
      audioElement.currentTime = 0;
    } else {
      audioElement.currentTime = 0;
    }

    activeWorld = descriptor.world;

    try {
      await audioElement.play();
      return true;
    } catch (_error) {
      activeWorld = null;
      return false;
    }
  }

  return {
    getWorldIntroVoiceoverSource: getWorldIntroAudioDescriptor,
    hasWorldIntroVoiceover,
    playWorldIntroVoiceover,
    stopWorldIntroVoiceover,
  };
}
