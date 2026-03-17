const TILE = 120;

export function createRenderer(ctx, state, viewport) {
  function project(x, y, z = 0) {
    const sx = x - state.cam.x + viewport.width() / 2;
    const sy = (y - state.cam.y) * 0.58 + viewport.height() * 0.26 - z;
    return { sx, sy };
  }

  function drawGround() {
    const grad = ctx.createLinearGradient(0, 0, 0, viewport.height());
    grad.addColorStop(0, '#0f2638');
    grad.addColorStop(0.45, '#16334b');
    grad.addColorStop(1, '#0a1725');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewport.width(), viewport.height());

    const camX = state.cam.x - viewport.width() * 0.5;
    const camY = state.cam.y - viewport.height() * 0.5;
    const startX = Math.floor(camX / TILE) * TILE;
    const endX = startX + viewport.width() + TILE * 3;
    const startY = Math.floor(camY / TILE) * TILE;
    const endY = startY + viewport.height() + TILE * 3;

    for (let y = startY; y < endY; y += TILE) {
      for (let x = startX; x < endX; x += TILE) {
        const idx = ((x / TILE) ^ (y / TILE)) & 1;
        const p = project(x + TILE / 2, y + TILE / 2);
        ctx.fillStyle = idx ? '#204458' : '#1a394c';
        ctx.fillRect(p.sx - TILE / 2, p.sy - TILE * 0.34, TILE, TILE * 0.68);
      }
    }
  }

  function drawProp(prop) {
    const p = project(prop.x, prop.y, 0);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.rotate(prop.rot);

    if (prop.kind === 'plant') {
      ctx.fillStyle = '#184c38';
      ctx.fillRect(-5 * prop.scale, -14 * prop.scale, 10 * prop.scale, 14 * prop.scale);
      ctx.fillStyle = '#45c084';
      ctx.beginPath();
      ctx.moveTo(0, -32 * prop.scale);
      ctx.lineTo(-14 * prop.scale, -8 * prop.scale);
      ctx.lineTo(0, -14 * prop.scale);
      ctx.lineTo(14 * prop.scale, -8 * prop.scale);
      ctx.closePath();
      ctx.fill();
    } else if (prop.kind === 'pillar') {
      ctx.fillStyle = '#384d63';
      ctx.fillRect(-12 * prop.scale, -30 * prop.scale, 24 * prop.scale, 30 * prop.scale);
      ctx.fillStyle = '#5f7690';
      ctx.fillRect(-15 * prop.scale, -35 * prop.scale, 30 * prop.scale, 8 * prop.scale);
      ctx.fillStyle = '#8fe9ff';
      ctx.fillRect(-4 * prop.scale, -24 * prop.scale, 8 * prop.scale, 12 * prop.scale);
    } else {
      ctx.fillStyle = '#2e344d';
      ctx.fillRect(-24 * prop.scale, -20 * prop.scale, 48 * prop.scale, 20 * prop.scale);
      ctx.fillStyle = '#6375a2';
      ctx.fillRect(-18 * prop.scale, -34 * prop.scale, 36 * prop.scale, 16 * prop.scale);
      ctx.fillStyle = '#7df4ff';
      ctx.fillRect(-6 * prop.scale, -30 * prop.scale, 12 * prop.scale, 12 * prop.scale);
    }

    ctx.restore();
  }

  function drawEnemy(e) {
    const bob = Math.sin(state.menuTime * 4 + e.t * 2) * 4;
    const p = project(e.x, e.y, 12 + bob);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.rotate(Math.atan2(state.player.y - e.y, state.player.x - e.x));

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r * 1.2, e.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = e.accent;
    ctx.fillRect(e.r * 0.2, -e.r * 0.22, e.r * 0.9, e.r * 0.44);

    if (e.kind === 'brute') {
      ctx.fillStyle = '#2f1f4f';
      ctx.fillRect(-e.r * 0.8, -e.r * 0.4, e.r * 0.6, e.r * 0.8);
      ctx.fillRect(-e.r * 0.2, -e.r * 0.62, e.r * 0.4, e.r * 0.28);
    }

    if (e.kind === 'spitter') {
      ctx.fillStyle = '#0c4735';
      ctx.beginPath();
      ctx.arc(e.r * 0.5, 0, e.r * 0.33, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    const pp = project(p.x, p.y, 14 + Math.sin(state.menuTime * 6) * 2);
    ctx.save();
    ctx.translate(pp.sx, pp.sy);
    ctx.rotate(p.angle);

    ctx.fillStyle = '#0f1f33';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 1.35, p.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#66e8ff';
    ctx.fillRect(-p.r * 0.7, -p.r * 0.56, p.r * 1.4, p.r * 1.1);
    ctx.fillStyle = '#d6fbff';
    ctx.fillRect(p.r * 0.2, -p.r * 0.22, p.r * 1.1, p.r * 0.44);
    ctx.fillStyle = '#7a9ac8';
    ctx.fillRect(-p.r * 0.3, -p.r * 0.84, p.r * 0.6, p.r * 0.3);
    ctx.restore();
  }

  function drawMenuAmbient() {
    for (let i = 0; i < 7; i++) {
      const t = state.menuTime * (0.5 + i * 0.08);
      const x = (Math.sin(t + i * 2.2) * 0.4 + 0.5) * viewport.width();
      const y = (Math.cos(t * 0.9 + i) * 0.35 + 0.52) * viewport.height();
      const p = project(x, y, 18 + Math.sin(t * 3) * 6);
      ctx.fillStyle = i % 2 ? '#ff8ea6' : '#8deaff';
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 18, 13, t, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(222,247,255,0.7)';
      ctx.fillRect(p.sx + 6, p.sy - 3, 12, 6);
    }
  }

  return function render(dt = 0.016) {
    state.menuTime += dt;
    if (state.player) {
      state.cam.x += (state.player.x - state.cam.x) * 0.09;
      state.cam.y += (state.player.y - state.cam.y) * 0.09;
    }

    drawGround();

    const world = state.world;
    if (world) {
      for (const prop of world.props) drawProp(prop);
    }

    if (!state.running) drawMenuAmbient();

    for (const b of state.bullets) {
      const q = project(b.x, b.y, 9);
      ctx.fillStyle = '#92f7ff';
      ctx.beginPath();
      ctx.arc(q.sx, q.sy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of state.enemies) drawEnemy(e);

    for (const n of state.particles) {
      const p = project(n.x, n.y, n.s * 2.3);
      ctx.fillStyle = n.c;
      ctx.globalAlpha = Math.max(0, n.life * 2.2);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, n.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state.player) drawPlayer();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,80,120,${state.flash * 0.26})`;
      ctx.fillRect(0, 0, viewport.width(), viewport.height());
    }
  };
}
