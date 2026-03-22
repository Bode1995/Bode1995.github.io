const AUDIO_CONTEXT_CTOR = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext || null)
  : null;

const AUDIO_ASSET_BASE_URL = new URL('../../assets/audio/', import.meta.url);
const MUSIC_TRACK_FILES = [
  'Background1.mp3',
  'Background2.mp3',
  'Background3.mp3',
];
const MUSIC_TRACKS = MUSIC_TRACK_FILES.map((file) => ({
  file,
  src: new URL(file, AUDIO_ASSET_BASE_URL).href,
}));
const BACKGROUND_MUSIC_VOLUME = 0.18;

function tone(ctx, type, freq, duration, gain = 0.04) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol).connect(ctx.destination);
  const now = ctx.currentTime;
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function shuffleTracks(tracks) {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createAudio() {
  let ctx = null;
  let unlocked = false;
  let musicEl = null;
  let shuffledPlaylist = shuffleTracks(MUSIC_TRACKS);
  let playlistIndex = 0;
  let musicEnabled = false;
  let musicPausedForAppState = false;
  let advancingTrack = false;

  function ensure() {
    if (AUDIO_CONTEXT_CTOR) {
      if (!ctx) ctx = new AUDIO_CONTEXT_CTOR();
      if (ctx.state === 'suspended') ctx.resume();
    }
    unlocked = typeof window !== 'undefined';
    return unlocked;
  }

  function getCurrentTrack() {
    if (!shuffledPlaylist.length) return null;
    return shuffledPlaylist[playlistIndex] || shuffledPlaylist[0] || null;
  }

  function prepareNextPlaylistCycle() {
    shuffledPlaylist = shuffleTracks(MUSIC_TRACKS);
    playlistIndex = 0;
  }

  function ensureMusicElement() {
    if (musicEl) return musicEl;
    musicEl = new Audio();
    musicEl.preload = 'auto';
    musicEl.loop = false;
    musicEl.volume = BACKGROUND_MUSIC_VOLUME;
    musicEl.playsInline = true;
    musicEl.setAttribute('playsinline', 'true');

    musicEl.addEventListener('ended', () => {
      void playNextTrack();
    });

    musicEl.addEventListener('error', () => {
      void playNextTrack();
    });

    return musicEl;
  }

  function loadTrack(track) {
    const audioElement = ensureMusicElement();
    if (!track) return audioElement;
    if (audioElement.dataset.trackSrc === track.src) return audioElement;
    audioElement.pause();
    audioElement.src = track.src;
    audioElement.dataset.trackSrc = track.src;
    audioElement.load();
    return audioElement;
  }

  function resetMediaElement(mediaElement) {
    if (!mediaElement) return;
    mediaElement.pause();
    mediaElement.currentTime = 0;
  }

  function resetDomMediaElements() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('audio, video').forEach((mediaElement) => {
      resetMediaElement(mediaElement);
    });
  }

  async function tryPlayCurrentTrack() {
    if (!unlocked || !musicEnabled || musicPausedForAppState) return false;
    const track = getCurrentTrack();
    if (!track) return false;
    const audioElement = loadTrack(track);
    audioElement.volume = BACKGROUND_MUSIC_VOLUME;
    try {
      await audioElement.play();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function playNextTrack() {
    if (advancingTrack) return false;
    advancingTrack = true;
    try {
      if (!shuffledPlaylist.length) prepareNextPlaylistCycle();
      playlistIndex += 1;
      if (playlistIndex >= shuffledPlaylist.length) prepareNextPlaylistCycle();
      return await tryPlayCurrentTrack();
    } finally {
      advancingTrack = false;
    }
  }

  return {
    async unlock() {
      const ready = ensure();
      if (!ready) return false;
      musicEnabled = true;
      musicPausedForAppState = false;
      return tryPlayCurrentTrack();
    },
    pauseBackgroundMusic() {
      musicPausedForAppState = true;
      if (!musicEl) return;
      musicEl.pause();
    },
    resumeBackgroundMusic() {
      if (!unlocked) return false;
      musicEnabled = true;
      musicPausedForAppState = false;
      void tryPlayCurrentTrack();
      return true;
    },
    stopAllAudio({ suspendContext = false } = {}) {
      musicEnabled = false;
      musicPausedForAppState = true;
      resetMediaElement(musicEl);
      resetDomMediaElements();
      if (suspendContext && ctx && ctx.state === 'running') {
        void ctx.suspend().catch(() => {});
      }
    },
    shoot() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'triangle', 640, 0.08, 0.035);
    },
    hit() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'square', 210, 0.06, 0.04);
    },
    kill() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'sawtooth', 160, 0.16, 0.045);
      tone(ctx, 'triangle', 330, 0.14, 0.028);
    },
    wave() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'triangle', 390, 0.12, 0.05);
      setTimeout(() => tone(ctx, 'triangle', 520, 0.14, 0.04), 60);
    },
    hurt() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'square', 120, 0.1, 0.05);
    },
    gameOver() {
      if (!unlocked || !ctx) return;
      tone(ctx, 'sawtooth', 170, 0.26, 0.05);
      setTimeout(() => tone(ctx, 'triangle', 100, 0.34, 0.04), 120);
    },
  };
}
