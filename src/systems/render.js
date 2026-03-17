export function createRenderer(ctx, state, viewport) {
  function drawGrid() {
    const step = 46;
    ctx.strokeStyle = 'rgba(120,160,215,0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < viewport.width(); x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewport.height());
    }
    for (let y = 0; y < viewport.height(); y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewport.width(), y);
    }
    ctx.stroke();
  }

  return function render() {
    ctx.clearRect(0, 0, viewport.width(), viewport.height());
    drawGrid();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,90,130,${state.flash * 0.26})`;
      ctx.fillRect(0, 0, viewport.width(), viewport.height());
    }

    for (const b of state.bullets) {
      ctx.fillStyle = '#78efff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of state.enemies) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,9,16,0.55)';
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.2, e.y - e.r * 0.24, e.r * 0.28, 0, Math.PI * 2);
      ctx.arc(e.x + e.r * 0.2, e.y - e.r * 0.24, e.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const n of state.particles) {
      ctx.fillStyle = n.c;
      ctx.globalAlpha = Math.max(0, n.life * 2.6);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const p = state.player;
    if (!p) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.inv > 0 && Math.floor(p.inv * 18) % 2 === 0) {
      ctx.globalAlpha = 0.38;
    }
    ctx.fillStyle = '#8be8ff';
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dbf8ff';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, 7);
    ctx.lineTo(-6, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
}
