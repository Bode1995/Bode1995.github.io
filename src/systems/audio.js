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
  hit: 'Treffer.mp3',
  explosion: 'Explosion.mp3',
  lightningLoop: 'Blitz.mp3',
};
const AUDIO_TRACKS = Object.fromEntries(
  Object.entries(AUDIO_FILES).map(([key, file]) => [key, { file, src: new URL(file, AUDIO_ASSET_BASE_URL).href }]),
);
const MUSIC_TRACKS = [AUDIO_TRACKS.background1, AUDIO_TRACKS.background2, AUDIO_TRACKS.background3];
const BACKGROUND_MUSIC_VOLUME = 0.18;
const MOVEMENT_LOOP_GAIN = 0.32;
const MOVEMENT_STOP_FADE_SECONDS = 0.08;
const POWERUP_PICKUP_GAIN = 0.315;
const PLAYER_DEATH_GAIN = 0.84;
const PLAYER_DEATH_MAX_DURATION_SECONDS = 1.0;
const ENEMY_DEATH_GAIN = 0.52;
const ENEMY_DEATH_MAX_DURATION_SECONDS = 1.0;
const HIT_GAIN = 0.24;
const HIT_MAX_DURATION_SECONDS = 0.5;
const HIT_MAX_CONCURRENT = 5;
const EXPLOSION_GAIN = 0.3;
const EXPLOSION_MAX_DURATION_SECONDS = 0.8;
const EXPLOSION_MAX_CONCURRENT = 3;
const EXPLOSION_SUSTAIN_HOLD_SECONDS = 0.9;
const EXPLOSION_SUSTAIN_FADE_SECONDS = 0.12;
const LIGHTNING_LOOP_GAIN = 0.26;
const LIGHTNING_LOOP_SLICE_SECONDS = 1.0;
const LIGHTNING_STOP_FADE_SECONDS = 0.06;

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
  let lightningLoopRequested = false;
  let lightningLoopInstance = null;
  let playerDeathTriggeredForCurrentRun = false;
  let explosionSustainUntil = 0;
  let explosionSustainReleaseTimerId = null;
  const audioBufferCache = new Map();
  const activeSfxSources = new Set();
  const explosionSlots = Array.from({ length: EXPLOSION_MAX_CONCURRENT }, (_, index) => ({
    index,
    token: 0,
    mode: 'idle',
    source: null,
    gainNode: null,
  }));
  const bufferedSfxBuckets = {
    hit: new Set(),
    explosion: new Set(),
  };

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
    const bucketKey = source.__audioBucketKey;
    const explosionSlotIndex = source.__audioExplosionSlotIndex;
    if (Number.isInteger(explosionSlotIndex) && explosionSlots[explosionSlotIndex]?.source === source) {
      const slot = explosionSlots[explosionSlotIndex];
      slot.token += 1;
      slot.mode = 'idle';
      slot.source = null;
      slot.gainNode = null;
    }
    if (bucketKey && bufferedSfxBuckets[bucketKey]) bufferedSfxBuckets[bucketKey].delete(source);
    if (movementLoopInstance?.source === source) movementLoopInstance = null;
    if (lightningLoopInstance?.source === source) lightningLoopInstance = null;
    if (bucketKey === 'explosion' && explosionSustainUntil > (ctx?.currentTime ?? 0)) queueMicrotask(() => { pumpExplosionSustain(); });
  }

  function registerSource(source, { bucketKey = null, startedAt = 0 } = {}) {
    if (!source) return source;
    source.__audioBucketKey = bucketKey;
    source.__audioStartedAt = startedAt;
    activeSfxSources.add(source);
    if (bucketKey && bufferedSfxBuckets[bucketKey]) bufferedSfxBuckets[bucketKey].add(source);
    source.onended = () => cleanupSourceRegistration(source);
    return source;
  }

  function stopBufferedBucketSource(source) {
    if (!source) return;
    try {
      source.stop();
      cleanupSourceRegistration(source);
    } catch (_error) {
      cleanupSourceRegistration(source);
    }
  }

  function stopLoopInstance(instance, { immediate = false, fadeSeconds = MOVEMENT_STOP_FADE_SECONDS } = {}) {
    if (!instance?.source) return;
    const audioContext = ctx;
    const now = audioContext?.currentTime ?? 0;
    const stopAt = immediate ? now : now + fadeSeconds;

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

  function stopMovementLoop({ immediate = false } = {}) {
    movementLoopRequested = false;
    const instance = movementLoopInstance;
    if (!instance) return;
    movementLoopInstance = null;
    stopLoopInstance(instance, { immediate, fadeSeconds: MOVEMENT_STOP_FADE_SECONDS });
  }

  function stopLightningLoop({ immediate = false } = {}) {
    lightningLoopRequested = false;
    const instance = lightningLoopInstance;
    if (!instance) return;
    lightningLoopInstance = null;
    stopLoopInstance(instance, { immediate, fadeSeconds: LIGHTNING_STOP_FADE_SECONDS });
  }

  function clearExplosionSustainReleaseTimer() {
    if (explosionSustainReleaseTimerId == null || typeof window === 'undefined') return;
    window.clearTimeout(explosionSustainReleaseTimerId);
    explosionSustainReleaseTimerId = null;
  }

  function stopExplosionSlot(slot, { immediate = false } = {}) {
    if (!slot?.source) {
      if (slot) {
        slot.token += 1;
        slot.mode = 'idle';
        slot.source = null;
        slot.gainNode = null;
      }
      return;
    }

    const { source, gainNode } = slot;
    slot.token += 1;
    slot.mode = 'idle';
    slot.source = null;
    slot.gainNode = null;

    const now = ctx?.currentTime ?? 0;
    const stopAt = immediate ? now : now + EXPLOSION_SUSTAIN_FADE_SECONDS;

    try {
      source.loop = false;
      if (gainNode) {
        const currentGain = Math.max(gainNode.gain.value, 0.0001);
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(currentGain, now);
        if (immediate) gainNode.gain.setValueAtTime(0.0001, now);
        else gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      }
      source.stop(immediate ? now : stopAt + 0.01);
    } catch (_error) {
      cleanupSourceRegistration(source);
    }
  }

  function stopExplosionSustain({ immediate = false } = {}) {
    explosionSustainUntil = 0;
    clearExplosionSustainReleaseTimer();
    explosionSlots.forEach((slot) => {
      if (slot.mode === 'sustain' || slot.mode === 'starting-sustain') stopExplosionSlot(slot, { immediate });
    });
  }

  function scheduleExplosionSustainRelease() {
    if (typeof window === 'undefined') return;
    clearExplosionSustainReleaseTimer();
    const audioContext = ensureAudioContext();
    if (!audioContext || explosionSustainUntil <= audioContext.currentTime) return;
    const delayMs = Math.max(16, Math.ceil((explosionSustainUntil - audioContext.currentTime) * 1000));
    explosionSustainReleaseTimerId = window.setTimeout(() => {
      explosionSustainReleaseTimerId = null;
      const currentTime = ctx?.currentTime ?? 0;
      if (explosionSustainUntil > currentTime) {
        scheduleExplosionSustainRelease();
        return;
      }
      stopExplosionSustain();
    }, delayMs);
  }

  function refreshExplosionSustainWindow() {
    const audioContext = ensureAudioContext();
    if (!audioContext) return;
    explosionSustainUntil = audioContext.currentTime + EXPLOSION_SUSTAIN_HOLD_SECONDS;
    scheduleExplosionSustainRelease();
  }

  function getIdleExplosionSlot() {
    return explosionSlots.find((slot) => slot.mode === 'idle') || null;
  }

  function startExplosionSlot(slot, { loop = false } = {}) {
    if (!slot || !unlocked) return false;
    const audioContext = ensureAudioContext();
    if (!audioContext) return false;

    const token = slot.token + 1;
    slot.token = token;
    slot.mode = loop ? 'starting-sustain' : 'starting-burst';
    slot.source = null;
    slot.gainNode = null;

    void resumeAudioContext().then(async (resumed) => {
      if (!resumed || slot.token !== token) {
        if (slot.token === token) slot.mode = 'idle';
        return;
      }

      const buffer = await loadAudioBuffer(AUDIO_TRACKS.explosion);
      if (!buffer || slot.token !== token) {
        if (slot.token === token) slot.mode = 'idle';
        return;
      }

      const playbackDuration = Math.max(0.01, Math.min(buffer.duration, EXPLOSION_MAX_DURATION_SECONDS));
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = buffer;
      source.loop = loop;
      if (loop) {
        source.loopStart = 0;
        source.loopEnd = playbackDuration;
      }
      gainNode.gain.value = EXPLOSION_GAIN;
      source.connect(gainNode).connect(audioContext.destination);
      source.__audioExplosionSlotIndex = slot.index;

      slot.source = source;
      slot.gainNode = gainNode;
      slot.mode = loop ? 'sustain' : 'burst';

      const startAt = audioContext.currentTime;
      registerSource(source, { bucketKey: 'explosion', startedAt: startAt });
      try {
        source.start(startAt, loop ? Math.random() * playbackDuration : 0, loop ? undefined : playbackDuration);
        if (!loop && playbackDuration < buffer.duration) source.stop(startAt + playbackDuration);
      } catch (_error) {
        cleanupSourceRegistration(source);
      }
    });

    return true;
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

  async function startLoopTrack(track, {
    loopGain = 1,
    loopSliceSeconds = null,
    assignInstance,
    getCurrentInstance,
    isStillRequested,
  }) {
    if (!unlocked) return false;
    const audioContext = ensureAudioContext();
    if (!audioContext) return false;
    if (getCurrentInstance()) return true;
    const resumed = await resumeAudioContext();
    if (!resumed || !isStillRequested() || getCurrentInstance()) return false;
    const buffer = await loadAudioBuffer(track);
    if (!buffer || !isStillRequested() || getCurrentInstance()) return false;

    const gainNode = audioContext.createGain();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    if (loopSliceSeconds != null) {
      source.loopStart = 0;
      source.loopEnd = Math.max(0.01, Math.min(buffer.duration, loopSliceSeconds));
    }
    source.connect(gainNode).connect(audioContext.destination);
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(loopGain, now + 0.03);

    const instance = { source, gainNode };
    assignInstance(instance);
    registerSource(source, { startedAt: now });

    try {
      source.start(now, 0);
      return true;
    } catch (_error) {
      cleanupSourceRegistration(source);
      if (getCurrentInstance()?.source === source) assignInstance(null);
      return false;
    }
  }

  async function startMovementLoop() {
    movementLoopRequested = true;
    return startLoopTrack(AUDIO_TRACKS.movementLoop, {
      loopGain: MOVEMENT_LOOP_GAIN,
      assignInstance: (instance) => { movementLoopInstance = instance; },
      getCurrentInstance: () => movementLoopInstance,
      isStillRequested: () => movementLoopRequested,
    });
  }

  async function startLightningLoop() {
    lightningLoopRequested = true;
    return startLoopTrack(AUDIO_TRACKS.lightningLoop, {
      loopGain: LIGHTNING_LOOP_GAIN,
      loopSliceSeconds: LIGHTNING_LOOP_SLICE_SECONDS,
      assignInstance: (instance) => { lightningLoopInstance = instance; },
      getCurrentInstance: () => lightningLoopInstance,
      isStillRequested: () => lightningLoopRequested,
    });
  }

  function playBufferedSfx(track, {
    gain = 1,
    maxDurationSeconds = null,
    bucketKey = null,
    maxConcurrent = null,
    reuseMode = 'skip',
  } = {}) {
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
      const bucket = bucketKey ? bufferedSfxBuckets[bucketKey] : null;
      if (bucket && maxConcurrent != null && bucket.size >= maxConcurrent) {
        if (reuseMode === 'skip') return;
        if (reuseMode === 'rotate') {
          const sourceToReuse = [...bucket].sort((a, b) => (a.__audioStartedAt || 0) - (b.__audioStartedAt || 0))[0] || null;
          if (sourceToReuse) stopBufferedBucketSource(sourceToReuse);
          if (bucket.size >= maxConcurrent) return;
        }
      }

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = buffer;
      source.loop = false;
      gainNode.gain.value = gain;
      source.connect(gainNode).connect(audioContext.destination);
      const startAt = audioContext.currentTime;
      registerSource(source, { bucketKey, startedAt: startAt });
      try {
        source.start(startAt, 0, playbackDuration);
        if (playbackDuration < buffer.duration) source.stop(startAt + playbackDuration);
      } catch (_error) {
        cleanupSourceRegistration(source);
      }
    });

    return true;
  }

  function pumpExplosionSustain() {
    const audioContext = ensureAudioContext();
    if (!audioContext || !unlocked || explosionSustainUntil <= audioContext.currentTime) return false;

    let started = false;
    for (const slot of explosionSlots) {
      if (slot.mode !== 'idle') continue;
      if (!startExplosionSlot(slot, { loop: true })) break;
      started = true;
    }
    return started;
  }

  function playExplosionSfx() {
    if (explosionSustainUntil > (ctx?.currentTime ?? 0)) refreshExplosionSustainWindow();
    const idleSlot = getIdleExplosionSlot();
    if (idleSlot) return startExplosionSlot(idleSlot);

    refreshExplosionSustainWindow();
    return pumpExplosionSustain() || true;
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
    startLightningLoop() {
      return startLightningLoop();
    },
    stopLightningLoop({ immediate = false } = {}) {
      stopLightningLoop({ immediate });
    },
    syncLightningLoop(isActive) {
      if (isActive) {
        void startLightningLoop();
        return true;
      }
      stopLightningLoop();
      return false;
    },
    playPowerupPickup() {
      return playBufferedSfx(AUDIO_TRACKS.powerupPickup, { gain: POWERUP_PICKUP_GAIN });
    },
    playPlayerDeath() {
      if (playerDeathTriggeredForCurrentRun) return false;
      playerDeathTriggeredForCurrentRun = true;
      return playBufferedSfx(AUDIO_TRACKS.playerDeath, {
        gain: PLAYER_DEATH_GAIN,
        maxDurationSeconds: PLAYER_DEATH_MAX_DURATION_SECONDS,
      });
    },
    playEnemyDeath() {
      return playBufferedSfx(AUDIO_TRACKS.enemyDeath, {
        gain: ENEMY_DEATH_GAIN,
        maxDurationSeconds: ENEMY_DEATH_MAX_DURATION_SECONDS,
      });
    },
    playHit() {
      return playBufferedSfx(AUDIO_TRACKS.hit, {
        gain: HIT_GAIN,
        maxDurationSeconds: HIT_MAX_DURATION_SECONDS,
        bucketKey: 'hit',
        maxConcurrent: HIT_MAX_CONCURRENT,
        reuseMode: 'skip',
      });
    },
    playExplosion() {
      return playExplosionSfx();
    },
    stopAllAudio({ suspendContext = false } = {}) {
      musicEnabled = false;
      musicPausedForAppState = true;
      stopMovementLoop({ immediate: true });
      stopLightningLoop({ immediate: true });
      stopExplosionSustain({ immediate: true });
      resetMediaElement(musicEl);
      resetDomMediaElements();
      [...activeSfxSources].forEach((source) => {
        try {
          source.stop();
        } catch (_error) {
          cleanupSourceRegistration(source);
        }
      });
      activeSfxSources.clear();
      Object.values(bufferedSfxBuckets).forEach((bucket) => bucket.clear());
      explosionSlots.forEach((slot) => {
        slot.token += 1;
        slot.mode = 'idle';
        slot.source = null;
        slot.gainNode = null;
      });
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
