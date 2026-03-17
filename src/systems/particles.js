import { rand } from '../core/utils.js';

export function spawnShootParticles(state, ax, ay) {
  for (let i = 0; i < 4; i++) {
    const n = (Math.random() - 0.5) * 0.65;
    state.particles.push({
      x: state.player.x + ax * 18,
      y: state.player.y + ay * 18,
      vx: (ax + n) * rand(60, 160),
      vy: (ay + n) * rand(60, 160),
      life: rand(0.12, 0.2),
      c: '#8df2ff',
      s: rand(2, 4),
    });
  }
}

export function burst(state, x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(70, 220);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.18, 0.48),
      c: color,
      s: rand(2, 5),
    });
  }
}
