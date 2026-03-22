const AUDIO_CONTEXT_CTOR = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext || null)
  : null;

const AUDIO_ASSET_BASE_URL = new URL('../../assets/audio/', import.meta.url);
const AUDIO_FILES = {
  background1: 'Background1.mp3',
  background2: 'Background2.mp3',
  background3: 'Background3.mp3',
  movementLoop: 'Laufen.mp3',
  powerupPickup: 'Power up sammeln.mp3',
  playerDeath: 'Spieler tot.mp3',
  enemyDeath: 'Gegner tot.mp3',
};
const AUDIO_TRACKS = Object.fromEntries(
  Object.entries(AUDIO_FILES).map(([key, file]) => [key, { file, src: new URL(file, AUDIO_ASSET_BASE_URL).href }]),
);
const MUSIC_TRACKS = [AUDIO_TRACKS.background1, AUDIO_TRACKS.background2, AUDIO_TRACKS.background3];
const BACKGROUND_MUSIC_VOLUME = 0.18;
const MOVEMENT_LOOP_GAIN = 0.32;
const POWERUP_PICKUP_GAIN = 0.315;
const PLAYER_DEATH_GAIN = 0.42;
const PLAYER_DEATH_MAX_DURATION_SECONDS = 1.0;
const ENEMY_DEATH_GAIN = 0.26;
const ENEMY_DEATH_MAX_DURATION_SECONDS = 1.0;
const MOVEMENT_STOP_FADE_SECONDS = 0.08;

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
  let movementLoopRequested = false;
  let movementLoopInstance = null;
  let playerDeathInstance = null;
  let playerDeathTriggeredForCurrentRun = false;
  const audioBufferCache = new Map();
  const activeSfxSources = new Set();

  function ensureAudioContext() {
    if (!AUDIO_CONTEXT_CTOR) return null;
    if (!ctx) ctx = new AUDIO_CONTEXT_CTOR();
    return ctx;
  }

  function ensure() {
    ensureAudioContext();
    unlocked = typeof window !== 'undefined';
    return unlocked;
  }

  async function resumeAudioContext() {
    const audioContext = ensureAudioContext();
    if (!audioContext || audioContext.state !== 'suspended') return true;
    try {
      await audioContext.resume();
      return audioContext.state === 'running';
    } catch (_error) {
      return false;
    }
  }

  async function loadAudioBuffer(track) {
    const audioContext = ensureAudioContext();
    if (!audioContext || !track?.src) return null;
    if (audioBufferCache.has(track.src)) return audioBufferCache.get(track.src);

    const loadPromise = fetch(track.src)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load audio asset: ${track.file}`);
        const arrayBuffer = await response.arrayBuffer();
        return new Promise((resolve, reject) => {
          audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
        });
      })
      .catch((error) => {
        audioBufferCache.delete(track.src);
        console.warn('[audio] Could not decode audio asset', track.file, error);
        return null;
      });

    audioBufferCache.set(track.src, loadPromise);
    return loadPromise;
  }

  function cleanupSourceRegistration(source) {
    if (!source) return;
    source.onended = null;
    activeSfxSources.delete(source);
  }

  function stopMovementLoop({ immediate = false } = {}) {
    movementLoopRequested = false;
    const instance = movementLoopInstance;
    if (!instance) return;
    movementLoopInstance = null;
    const now = ctx?.currentTime ?? 0;
    const stopAt = immediate ? now : now + MOVEMENT_STOP_FADE_SECONDS;

    try {
      instance.source.loop = false;
      if (instance.gainNode) {
        const currentGain = Math.max(instance.gainNode.gain.value, 0.0001);
        instance.gainNode.gain.cancelScheduledValues(now);
        instance.gainNode.gain.setValueAtTime(currentGain, now);
        if (immediate) instance.gainNode.gain.setValueAtTime(0.0001, now);
        else instance.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      }
      instance.source.stop(immediate ? now : stopAt + 0.01);
    } catch (_error) {
      cleanupSourceRegistration(instance.source);
    }
  }

  function stopTrackedInstance(instance, { immediate = false } = {}) {
    if (!instance) return;
    const now = ctx?.currentTime ?? 0;
    const stopAt = immediate ? now : now + 0.02;
    try {
      if (instance.gainNode) {
        const currentGain = Math.max(instance.gainNode.gain.value, 0.0001);
        instance.gainNode.gain.cancelScheduledValues(now);
        instance.gainNode.gain.setValueAtTime(currentGain, now);
        if (immediate) instance.gainNode.gain.setValueAtTime(0.0001, now);
        else instance.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      }
      instance.source.loop = false;
      instance.source.stop(immediate ? now : stopAt + 0.01);
    } catch (_error) {
      cleanupSourceRegistration(instance.source);
    }
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

  async function startMovementLoop() {
    movementLoopRequested = true;
    if (!unlocked) return false;
    const audioContext = ensureAudioContext();
    if (!audioContext) return false;
    if (movementLoopInstance) return true;
    const resumed = await resumeAudioContext();
    if (!resumed || !movementLoopRequested || movementLoopInstance) return false;
    const buffer = await loadAudioBuffer(AUDIO_TRACKS.movementLoop);
    if (!buffer || !movementLoopRequested || movementLoopInstance) return false;

    const gainNode = audioContext.createGain();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode).connect(audioContext.destination);
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(MOVEMENT_LOOP_GAIN, now + 0.03);

    const instance = { source, gainNode };
    movementLoopInstance = instance;
    activeSfxSources.add(source);
    source.onended = () => {
      cleanupSourceRegistration(source);
      if (movementLoopInstance?.source === source) movementLoopInstance = null;
    };

    try {
      source.start(now);
      return true;
    } catch (_error) {
      cleanupSourceRegistration(source);
      if (movementLoopInstance?.source === source) movementLoopInstance = null;
      return false;
    }
  }

  function playBufferedSfx(track, { gain = 1, maxDurationSeconds = null } = {}) {
    if (!unlocked) return false;
    const audioContext = ensureAudioContext();
    if (!audioContext) return false;

    void resumeAudioContext().then(async (resumed) => {
      if (!resumed) return;
      const buffer = await loadAudioBuffer(track);
      if (!buffer) return;
      const playbackDuration = maxDurationSeconds == null
        ? buffer.duration
        : Math.max(0.01, Math.min(buffer.duration, maxDurationSeconds));
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = buffer;
      source.loop = false;
      gainNode.gain.value = gain;
      source.connect(gainNode).connect(audioContext.destination);
      activeSfxSources.add(source);
      source.onended = () => cleanupSourceRegistration(source);
      try {
        const startAt = audioContext.currentTime;
        source.start(startAt, 0, playbackDuration);
        if (playbackDuration < buffer.duration) source.stop(startAt + playbackDuration);
      } catch (_error) {
        cleanupSourceRegistration(source);
      }
    });

    return true;
  }

  return {
    async unlock() {
      const ready = ensure();
      if (!ready) return false;
      await resumeAudioContext();
      musicEnabled = true;
      musicPausedForAppState = false;
      return tryPlayCurrentTrack();
    },
    notifyRunStarted() {
      playerDeathTriggeredForCurrentRun = false;
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
      void resumeAudioContext().then(() => {
        void tryPlayCurrentTrack();
      });
      return true;
    },
    startMovementLoop() {
      return startMovementLoop();
    },
    stopMovementLoop({ immediate = false } = {}) {
      stopMovementLoop({ immediate });
    },
    syncMovementLoop(isMoving) {
      if (isMoving) {
        void startMovementLoop();
        return true;
      }
      stopMovementLoop();
      return false;
    },
    playPowerupPickup() {
      return playBufferedSfx(AUDIO_TRACKS.powerupPickup, { gain: POWERUP_PICKUP_GAIN });
    },
    playPlayerDeath() {
      if (playerDeathTriggeredForCurrentRun) return false;
      playerDeathTriggeredForCurrentRun = true;
      stopMovementLoop({ immediate: true });
      if (!unlocked) return false;
      const audioContext = ensureAudioContext();
      if (!audioContext) return false;

      void resumeAudioContext().then(async (resumed) => {
        if (!resumed) return;
        const buffer = await loadAudioBuffer(AUDIO_TRACKS.playerDeath);
        if (!buffer) return;

        stopTrackedInstance(playerDeathInstance, { immediate: true });
        playerDeathInstance = null;

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const playbackDuration = Math.max(0.01, Math.min(buffer.duration, PLAYER_DEATH_MAX_DURATION_SECONDS));
        source.buffer = buffer;
        source.loop = false;
        gainNode.gain.value = PLAYER_DEATH_GAIN;
        source.connect(gainNode).connect(audioContext.destination);

        const instance = { source, gainNode };
        playerDeathInstance = instance;
        activeSfxSources.add(source);
        source.onended = () => {
          cleanupSourceRegistration(source);
          if (playerDeathInstance?.source === source) playerDeathInstance = null;
        };

        try {
          const startAt = audioContext.currentTime;
          source.start(startAt, 0, playbackDuration);
          source.stop(startAt + playbackDuration);
        } catch (_error) {
          cleanupSourceRegistration(source);
          if (playerDeathInstance?.source === source) playerDeathInstance = null;
        }
      });

      return true;
    },
    playEnemyDeath() {
      return playBufferedSfx(AUDIO_TRACKS.enemyDeath, {
        gain: ENEMY_DEATH_GAIN,
        maxDurationSeconds: ENEMY_DEATH_MAX_DURATION_SECONDS,
      });
    },
    stopAllAudio({ suspendContext = false } = {}) {
      musicEnabled = false;
      musicPausedForAppState = true;
      stopMovementLoop({ immediate: true });
      stopTrackedInstance(playerDeathInstance, { immediate: true });
      playerDeathInstance = null;
      resetMediaElement(musicEl);
      resetDomMediaElements();
      activeSfxSources.forEach((source) => {
        try {
          source.stop();
        } catch (_error) {
          cleanupSourceRegistration(source);
        }
      });
      activeSfxSources.clear();
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
