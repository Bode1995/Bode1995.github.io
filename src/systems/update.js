import { clamp } from '../core/utils.js';
import { createBullet } from '../entities/bullet.js';
import { createEnemy, enemiesForWave } from '../entities/enemy.js';
import { burst, spawnShootParticles } from './particles.js';

export function updateState(state, viewport, onGameOver, dt) {
  const p = state.player;
  if (!p) return;

  p.inv = Math.max(0, p.inv - dt);
  state.flash = Math.max(0, state.flash - dt);
  state.fireCooldown -= dt;

  const mv = state.touch.moveVec;
  const mLen = Math.hypot(mv.x, mv.y);
  const deadZone = 0.18;
  const movePower = clamp((mLen - deadZone) / (1 - deadZone), 0, 1);
  const nx = mLen > 0 ? mv.x / mLen : 0;
  const ny = mLen > 0 ? mv.y / mLen : 0;

  p.x = clamp(p.x + nx * p.speed * movePower * dt, p.r, viewport.width() - p.r);
  p.y = clamp(p.y + ny * p.speed * movePower * dt, p.r, viewport.height() - p.r);

  if (movePower > 0) {
    p.angle = Math.atan2(ny, nx);
    if (state.fireCooldown <= 0) {
      state.bullets.push(createBullet(p, nx, ny));
      spawnShootParticles(state, nx, ny);
      state.fireCooldown = 0.24 - movePower * 0.16;
    }
  }

  if (state.spawnLeft > 0) {
    const maxEnemies = Math.min(4 + state.wave, 18);
    if (state.enemies.length < maxEnemies && Math.random() < dt * (2.2 + state.wave * 0.16)) {
      state.enemies.push(createEnemy(viewport.width(), viewport.height(), state.wave));
      state.spawnLeft--;
    }
  } else if (state.enemies.length === 0) {
    state.wave++;
    state.spawnLeft = enemiesForWave(state.wave);
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > viewport.width() + 20 || b.y < -20 || b.y > viewport.height() + 20) {
      state.bullets.splice(i, 1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;

    if (d < e.r + p.r) {
      if (p.inv <= 0) {
        p.hp -= e.damage;
        p.inv = 0.35;
        state.flash = 0.18;
        if (p.hp <= 0) {
          p.hp = 0;
          state.running = false;
          onGameOver();
        }
      }
      state.enemies.splice(i, 1);
      continue;
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      const bd = Math.hypot(e.x - b.x, e.y - b.y);
      if (bd < e.r + b.r) {
        e.hp -= 24;
        state.bullets.splice(j, 1);
        burst(state, e.x, e.y, 8, '#ff9ab0');
        if (e.hp <= 0) {
          state.score += 10;
          burst(state, e.x, e.y, 14, e.color);
          state.enemies.splice(i, 1);
        }
        break;
      }
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const n = state.particles[i];
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    n.vx *= 0.95;
    n.vy *= 0.95;
    n.life -= dt;
    if (n.life <= 0) state.particles.splice(i, 1);
  }
}

export { enemiesForWave };
