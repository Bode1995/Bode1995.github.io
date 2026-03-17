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

export function createAudio() {
  let ctx = null;
  let unlocked = false;

  function ensure() {
    if (!ctx) ctx = new window.AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
  }

  return {
    unlock() {
      ensure();
    },
    shoot() {
      if (!unlocked) return;
      tone(ctx, 'triangle', 640, 0.08, 0.035);
    },
    hit() {
      if (!unlocked) return;
      tone(ctx, 'square', 210, 0.06, 0.04);
    },
    kill() {
      if (!unlocked) return;
      tone(ctx, 'sawtooth', 160, 0.16, 0.045);
      tone(ctx, 'triangle', 330, 0.14, 0.028);
    },
    wave() {
      if (!unlocked) return;
      tone(ctx, 'triangle', 390, 0.12, 0.05);
      setTimeout(() => tone(ctx, 'triangle', 520, 0.14, 0.04), 60);
    },
    hurt() {
      if (!unlocked) return;
      tone(ctx, 'square', 120, 0.1, 0.05);
    },
    gameOver() {
      if (!unlocked) return;
      tone(ctx, 'sawtooth', 170, 0.26, 0.05);
      setTimeout(() => tone(ctx, 'triangle', 100, 0.34, 0.04), 120);
    },
  };
}
