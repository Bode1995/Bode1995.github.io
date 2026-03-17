import { createInitialState } from './core/state.js';
import { createPlayer } from './entities/player.js';
import { enemiesForWave } from './entities/enemy.js';
import { wireInput, resetTouch } from './systems/input.js';
import { updateState } from './systems/update.js';
import { createRenderer } from './systems/render.js';
import { getUI, showGameOverUI, showInGameUI, syncHUD } from './ui/dom.js';
import { registerServiceWorker } from './pwa/register-sw.js';

const ui = getUI();
const ctx = ui.canvas.getContext('2d');
const state = createInitialState();

const viewport = {
  width: () => window.innerWidth,
  height: () => window.innerHeight,
};

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ui.canvas.width = Math.floor(window.innerWidth * dpr);
  ui.canvas.height = Math.floor(window.innerHeight * dpr);
  ui.canvas.style.width = `${window.innerWidth}px`;
  ui.canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

const render = createRenderer(ctx, state, viewport);
wireInput(state, ui);
registerServiceWorker();

function startGame() {
  state.running = true;
  state.player = createPlayer(viewport.width(), viewport.height());
  state.bullets = [];
  state.enemies = [];
  state.particles = [];
  state.score = 0;
  state.wave = 1;
  state.spawnLeft = enemiesForWave(state.wave);
  state.fireCooldown = 0;
  state.flash = 0;
  resetTouch(state, ui);
  showInGameUI(ui);
  state.last = performance.now();
  requestAnimationFrame(loop);
}

function loop(ts) {
  if (!state.running) return;
  const dt = Math.min(0.033, (ts - state.last) / 1000);
  state.last = ts;
  updateState(state, viewport, () => showGameOverUI(ui, state), dt);
  syncHUD(ui, state);
  render();
  if (state.running) requestAnimationFrame(loop);
}

ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);

render();
