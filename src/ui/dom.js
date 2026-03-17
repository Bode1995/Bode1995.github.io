export function getUI() {
  return {
    canvas: document.getElementById('game'),
    menu: document.getElementById('menu'),
    gameOver: document.getElementById('gameOver'),
    hud: document.getElementById('hud'),
    controls: document.getElementById('controls'),
    waveEl: document.getElementById('wave'),
    scoreEl: document.getElementById('score'),
    hpBar: document.getElementById('hpBar'),
    finalWave: document.getElementById('finalWave'),
    finalScore: document.getElementById('finalScore'),
    moveZone: document.getElementById('moveZone'),
    aimZone: document.getElementById('aimZone'),
    moveStick: document.getElementById('moveStick'),
    aimStick: document.getElementById('aimStick'),
    moveKnob: document.getElementById('moveKnob'),
    aimKnob: document.getElementById('aimKnob'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
  };
}

export function showInGameUI(ui) {
  ui.menu.classList.add('hidden');
  ui.gameOver.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controls.classList.remove('hidden');
}

export function showGameOverUI(ui, state) {
  ui.finalWave.textContent = String(state.wave);
  ui.finalScore.textContent = String(state.score);
  ui.gameOver.classList.remove('hidden');
}

export function syncHUD(ui, state) {
  ui.waveEl.textContent = String(state.wave);
  ui.scoreEl.textContent = String(state.score);
  ui.hpBar.style.width = `${state.player?.hp ?? 0}%`;
}
