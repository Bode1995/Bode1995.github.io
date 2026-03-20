export function createEnemyOverlaySystem({ THREE, state, camera, ui }) {
  const canvas = ui.enemyOverlay;
  const context = canvas.getContext('2d');
  const projected = new THREE.Vector3();

  function resize() {
    const width = Math.max(1, Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)));
    const height = Math.max(1, Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(canvas.width / window.innerWidth, canvas.height / window.innerHeight);
  }

  function clear() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function drawEnemyHpBar(enemy) {
    const data = enemy?.userData;
    if (!data || data.dead || !Number.isFinite(data.hp) || !Number.isFinite(data.maxHp) || data.maxHp <= 0) return;

    projected.set(enemy.position.x, enemy.position.y + data.hitboxCenterOffsetY + data.hitboxHalfHeight + (data.role === 'boss' ? 1.05 : 0.48), enemy.position.z);
    projected.project(camera);

    if (projected.z < -1 || projected.z > 1) return;

    const screenX = ((projected.x + 1) * 0.5) * window.innerWidth;
    const screenY = ((1 - projected.y) * 0.5) * window.innerHeight;
    if (screenX < -60 || screenX > window.innerWidth + 60 || screenY < -40 || screenY > window.innerHeight + 40) return;

    const ratio = THREE.MathUtils.clamp(data.hp / data.maxHp, 0, 1);
    const baseWidth = THREE.MathUtils.clamp((data.hitboxRadius || data.radius || 1) * (data.role === 'boss' ? 52 : 42), data.role === 'boss' ? 84 : 42, data.role === 'boss' ? 154 : 96);
    const barHeight = data.role === 'boss' ? 8 : 5;
    const radius = barHeight * 0.5;
    const x = Math.round(screenX - baseWidth * 0.5);
    const y = Math.round(screenY - (data.role === 'boss' ? 4 : 2));

    context.save();
    context.globalAlpha = ratio >= 0.999 ? 0.72 : 0.96;
    context.fillStyle = 'rgba(7, 11, 20, 0.78)';
    context.strokeStyle = data.role === 'boss' ? 'rgba(255, 214, 120, 0.62)' : 'rgba(255,255,255,0.18)';
    context.lineWidth = data.role === 'boss' ? 1.5 : 1;
    context.beginPath();
    context.roundRect(x, y, baseWidth, barHeight, radius);
    context.fill();
    context.stroke();

    const fillWidth = Math.max(barHeight, baseWidth * ratio);
    const gradient = context.createLinearGradient(x, y, x + baseWidth, y);
    gradient.addColorStop(0, ratio > 0.4 ? '#ff667f' : '#ff4f70');
    gradient.addColorStop(0.55, ratio > 0.4 ? '#ffb85c' : '#ff9c57');
    gradient.addColorStop(1, ratio > 0.4 ? '#73ffb0' : '#ffc766');
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x, y, fillWidth, barHeight, radius);
    context.fill();
    context.restore();
  }

  return {
    resize,
    render() {
      resize();
      clear();
      if (!state.running) {
        ui.enemyCountValue.textContent = '0';
        return;
      }
      ui.enemyCountValue.textContent = String(state.entities.enemies.length);
      for (const enemy of state.entities.enemies) drawEnemyHpBar(enemy);
    },
    clear,
  };
}
