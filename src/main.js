import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const ui = {
  canvas: document.getElementById('game'),
  hud: document.getElementById('hud'),
  controls: document.getElementById('controls'),
  menu: document.getElementById('menu'),
  gameOver: document.getElementById('gameOver'),
  startBtn: document.getElementById('startBtn'),
  restartBtn: document.getElementById('restartBtn'),
  wave: document.getElementById('wave'),
  score: document.getElementById('score'),
  hpBar: document.getElementById('hpBar'),
  finalWave: document.getElementById('finalWave'),
  finalScore: document.getElementById('finalScore'),
  moveZone: document.getElementById('moveZone'),
  aimZone: document.getElementById('aimZone'),
  moveStick: document.getElementById('moveStick'),
  aimStick: document.getElementById('aimStick'),
  moveKnob: document.getElementById('moveKnob'),
  aimKnob: document.getElementById('aimKnob'),
};

const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08121f);
scene.fog = new THREE.Fog(0x08121f, 20, 95);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 180);

const hemi = new THREE.HemisphereLight(0x9fd9ff, 0x1b273b, 0.75);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 18, 4);
dir.castShadow = true;
scene.add(dir);

const arena = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 90, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0x153047, metalness: 0.1, roughness: 0.9, wireframe: false })
);
arena.rotation.x = -Math.PI / 2;
scene.add(arena);

const grid = new THREE.GridHelper(90, 28, 0x4fd4ff, 0x244965);
grid.position.y = 0.02;
scene.add(grid);

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.7, 1.1, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0x66e8ff, emissive: 0x0b2e47, roughness: 0.5 })
);
player.castShadow = true;
player.position.set(0, 1.15, 0);
scene.add(player);

const enemies = [];
const bullets = [];
const clock = new THREE.Clock();

const state = {
  running: false,
  hp: 100,
  score: 0,
  wave: 1,
  spawnLeft: 0,
  fireCooldown: 0,
  wavePause: 1,
  yaw: 0,
  pitch: 0.55,
};

const input = {
  move: new THREE.Vector2(),
  look: new THREE.Vector2(),
  shooting: false,
  keys: new Set(),
  moveTouch: null,
  aimTouch: null,
};

function updateHUD() {
  ui.wave.textContent = String(state.wave);
  ui.score.textContent = String(state.score);
  ui.hpBar.style.width = `${Math.max(0, state.hp)}%`;
}

function spawnWave() {
  state.spawnLeft = 4 + state.wave * 2;
  for (let i = 0; i < state.spawnLeft; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 18;
    const enemy = new THREE.Mesh(
      new THREE.SphereGeometry(0.8 + Math.random() * 0.25, 18, 16),
      new THREE.MeshStandardMaterial({ color: 0xff6a8d, emissive: 0x381021, roughness: 0.35 })
    );
    enemy.position.set(Math.cos(angle) * dist, 0.85, Math.sin(angle) * dist);
    enemy.castShadow = true;
    enemy.userData.speed = 2.2 + Math.random() * 0.8 + state.wave * 0.12;
    enemy.userData.hp = 1 + Math.floor(state.wave / 3);
    scene.add(enemy);
    enemies.push(enemy);
  }
}

function shoot() {
  if (state.fireCooldown > 0) return;
  state.fireCooldown = 0.18;
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x9df9ff, emissive: 0x2d8ea0 })
  );
  const dirVec = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw)).normalize();
  bullet.position.copy(player.position).addScaledVector(dirVec, 1.3);
  bullet.userData.vel = dirVec.multiplyScalar(30);
  bullet.userData.life = 1.3;
  scene.add(bullet);
  bullets.push(bullet);
}

function destroyEnemy(enemy, index) {
  scene.remove(enemy);
  enemies.splice(index, 1);
  state.score += 10;
}

function gameOver() {
  state.running = false;
  ui.controls.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.gameOver.classList.remove('hidden');
  ui.finalWave.textContent = String(state.wave);
  ui.finalScore.textContent = String(state.score);
}

function startGame() {
  state.running = true;
  state.hp = 100;
  state.score = 0;
  state.wave = 1;
  state.fireCooldown = 0;
  state.wavePause = 0;
  player.position.set(0, 1.15, 0);
  enemies.forEach((e) => scene.remove(e));
  bullets.forEach((b) => scene.remove(b));
  enemies.length = 0;
  bullets.length = 0;
  spawnWave();
  updateHUD();
  ui.menu.classList.add('hidden');
  ui.gameOver.classList.add('hidden');
  ui.controls.classList.remove('hidden');
  ui.hud.classList.remove('hidden');
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

window.addEventListener('keydown', (e) => {
  input.keys.add(e.code);
  if (e.code === 'Space') input.shooting = true;
});
window.addEventListener('keyup', (e) => {
  input.keys.delete(e.code);
  if (e.code === 'Space') input.shooting = false;
});

window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button === 0) input.shooting = true;
});
window.addEventListener('pointerup', () => { input.shooting = false; });

let dragging = false;
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => { if (e.button === 2) dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  state.yaw -= e.movementX * 0.004;
  state.pitch = THREE.MathUtils.clamp(state.pitch + e.movementY * 0.003, 0.2, 1.1);
});

function updateStick(stick, knob, touchData) {
  if (!touchData) {
    stick.style.opacity = '0';
    knob.style.transform = 'translate(0px, 0px)';
    return;
  }
  stick.style.opacity = '1';
  stick.style.left = `${touchData.startX}px`;
  stick.style.top = `${touchData.startY}px`;
  knob.style.transform = `translate(${touchData.dx}px, ${touchData.dy}px)`;
}

function zoneTouch(zone, kind) {
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    input[`${kind}Touch`] = { id: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    if (kind === 'aim') input.shooting = true;
  });

  zone.addEventListener('pointermove', (e) => {
    const touch = input[`${kind}Touch`];
    if (!touch || touch.id !== e.pointerId) return;
    const dx = THREE.MathUtils.clamp(e.clientX - touch.startX, -42, 42);
    const dy = THREE.MathUtils.clamp(e.clientY - touch.startY, -42, 42);
    touch.dx = dx;
    touch.dy = dy;
    if (kind === 'move') {
      input.move.set(dx / 42, dy / 42);
    } else {
      input.look.set(dx / 42, dy / 42);
      state.yaw -= input.look.x * 0.06;
      state.pitch = THREE.MathUtils.clamp(state.pitch + input.look.y * 0.035, 0.2, 1.1);
    }
  });

  const clear = (e) => {
    const touch = input[`${kind}Touch`];
    if (!touch || touch.id !== e.pointerId) return;
    input[`${kind}Touch`] = null;
    if (kind === 'move') input.move.set(0, 0);
    if (kind === 'aim') {
      input.look.set(0, 0);
      input.shooting = false;
    }
  };

  zone.addEventListener('pointerup', clear);
  zone.addEventListener('pointercancel', clear);
}

zoneTouch(ui.moveZone, 'move');
zoneTouch(ui.aimZone, 'aim');

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (state.running) {
    const keyboardMove = new THREE.Vector2(
      (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0),
      (input.keys.has('KeyW') ? 1 : 0) - (input.keys.has('KeyS') ? 1 : 0)
    );
    if (keyboardMove.lengthSq() > 0) keyboardMove.normalize();
    const finalMove = input.move.lengthSq() > 0 ? input.move.clone() : keyboardMove;

    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const velocity = new THREE.Vector3();
    velocity.addScaledVector(right, finalMove.x * 11 * dt);
    velocity.addScaledVector(forward, finalMove.y * 11 * dt);
    player.position.add(velocity);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -42, 42);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -42, 42);

    state.fireCooldown -= dt;
    if (input.shooting) shoot();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.position.addScaledVector(b.userData.vel, dt);
      b.userData.life -= dt;
      if (b.userData.life <= 0) {
        scene.remove(b);
        bullets.splice(i, 1);
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const toPlayer = player.position.clone().sub(e.position);
      const dist = toPlayer.length();
      toPlayer.normalize();
      e.position.addScaledVector(toPlayer, e.userData.speed * dt);
      e.position.y = 0.85 + Math.sin(performance.now() * 0.005 + i) * 0.05;

      if (dist < 1.4) {
        state.hp -= 28 * dt;
        if (state.hp <= 0) gameOver();
      }

      for (let j = bullets.length - 1; j >= 0; j--) {
        if (e.position.distanceTo(bullets[j].position) < 1) {
          e.userData.hp -= 1;
          scene.remove(bullets[j]);
          bullets.splice(j, 1);
          if (e.userData.hp <= 0) {
            destroyEnemy(e, i);
            break;
          }
        }
      }
    }

    if (enemies.length === 0) {
      state.wavePause -= dt;
      if (state.wavePause <= 0) {
        state.wave += 1;
        state.wavePause = 1;
        spawnWave();
      }
    }

    updateHUD();
  }

  updateStick(ui.moveStick, ui.moveKnob, input.moveTouch);
  updateStick(ui.aimStick, ui.aimKnob, input.aimTouch);

  const camOffset = new THREE.Vector3(
    Math.sin(state.yaw) * -9,
    7 + state.pitch * 4,
    Math.cos(state.yaw) * -9,
  );
  camera.position.copy(player.position).add(camOffset);
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);

updateHUD();
requestAnimationFrame(animate);
