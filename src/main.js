import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const CHARACTER_STORAGE_KEY = 'skyBlaster.selectedCharacterId';

const CHARACTER_DEFS = [
  {
    id: 'char_01',
    name: 'Vanguard',
    base: 0x66e8ff,
    dark: 0x163a5a,
    accent: 0xd6fbff,
    emissive: 0x0b2e47,
    bodyScale: [1, 1.1, 1],
    head: 'visor',
    shoulderPads: true,
    legType: 'balanced',
    weapon: 'rifle',
  },
  {
    id: 'char_02',
    name: 'Strider',
    base: 0x8df07c,
    dark: 0x1f4f2f,
    accent: 0xe7ffd9,
    emissive: 0x1b3b16,
    bodyScale: [0.92, 1.05, 1.2],
    head: 'antenna',
    shoulderPads: false,
    legType: 'long',
    weapon: 'carbine',
  },
  {
    id: 'char_03',
    name: 'Bulwark',
    base: 0xffba66,
    dark: 0x6f3a19,
    accent: 0xffeed2,
    emissive: 0x51270d,
    bodyScale: [1.2, 1.25, 0.94],
    head: 'heavy',
    shoulderPads: true,
    legType: 'heavy',
    weapon: 'cannon',
  },
  {
    id: 'char_04',
    name: 'Warden',
    base: 0xc698ff,
    dark: 0x422563,
    accent: 0xf4ebff,
    emissive: 0x2f174a,
    bodyScale: [1.05, 1, 0.9],
    head: 'crest',
    shoulderPads: false,
    legType: 'angled',
    weapon: 'bladegun',
  },
  {
    id: 'char_05',
    name: 'Rogue',
    base: 0xff86ac,
    dark: 0x62223b,
    accent: 0xffe2ee,
    emissive: 0x4d1527,
    bodyScale: [0.86, 1.02, 1.08],
    head: 'split',
    shoulderPads: true,
    legType: 'runner',
    weapon: 'smg',
  },
];

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
  moveStick: document.getElementById('moveStick'),
  moveKnob: document.getElementById('moveKnob'),
  characterGrid: document.getElementById('characterGrid'),
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

const sharedGeometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  arm: new THREE.BoxGeometry(0.28, 1.05, 0.28),
  leg: new THREE.BoxGeometry(0.32, 1.1, 0.32),
  foot: new THREE.BoxGeometry(0.42, 0.24, 0.72),
  head: new THREE.BoxGeometry(0.78, 0.62, 0.72),
  visor: new THREE.BoxGeometry(0.46, 0.18, 0.08),
  cylinder: new THREE.CylinderGeometry(0.2, 0.2, 1, 8),
  cone: new THREE.ConeGeometry(0.24, 0.8, 8),
  weaponBarrel: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8),
};

function createMaterialPalette(def) {
  return {
    base: new THREE.MeshStandardMaterial({ color: def.base, emissive: def.emissive, roughness: 0.42, metalness: 0.18 }),
    dark: new THREE.MeshStandardMaterial({ color: def.dark, roughness: 0.7, metalness: 0.08 }),
    accent: new THREE.MeshStandardMaterial({ color: def.accent, emissive: 0x223344, roughness: 0.35, metalness: 0.26 }),
  };
}

function addMesh(parent, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], castShadow = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = castShadow;
  parent.add(mesh);
  return mesh;
}

function createCharacterRig(def) {
  const palette = createMaterialPalette(def);
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  addMesh(bodyPivot, sharedGeometries.box, palette.base, [0, 1.45, 0], [0, 0, 0], [1.05 * def.bodyScale[0], 1.25 * def.bodyScale[1], 0.84 * def.bodyScale[2]]);
  addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 2.1, -0.12], [0.14, 0, 0], [0.92, 0.3, 0.6]);

  const head = new THREE.Group();
  head.position.set(0, 2.35, 0.02);
  bodyPivot.add(head);
  addMesh(head, sharedGeometries.head, palette.base, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
  addMesh(head, sharedGeometries.visor, palette.accent, [0, 0.02, 0.37]);

  if (def.head === 'antenna') {
    addMesh(head, sharedGeometries.cylinder, palette.dark, [0.12, 0.52, -0.12], [0, 0, 0], [0.22, 0.5, 0.22]);
    addMesh(head, sharedGeometries.cone, palette.accent, [0.12, 0.9, -0.12], [0, 0, Math.PI], [0.28, 0.3, 0.28]);
  } else if (def.head === 'heavy') {
    addMesh(head, sharedGeometries.box, palette.dark, [0, 0.42, -0.08], [0, 0, 0], [1.15, 0.36, 0.86]);
  } else if (def.head === 'crest') {
    addMesh(head, sharedGeometries.box, palette.accent, [0, 0.54, -0.16], [0.2, 0, 0], [0.22, 0.6, 0.82]);
  } else if (def.head === 'split') {
    addMesh(head, sharedGeometries.box, palette.dark, [-0.25, 0.28, 0], [0, 0.2, 0], [0.2, 0.8, 0.6]);
    addMesh(head, sharedGeometries.box, palette.dark, [0.25, 0.28, 0], [0, -0.2, 0], [0.2, 0.8, 0.6]);
  }

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.78 * def.bodyScale[0], 1.88, 0);
  rightArm.position.set(0.78 * def.bodyScale[0], 1.88, 0);
  bodyPivot.add(leftArm, rightArm);

  addMesh(leftArm, sharedGeometries.arm, palette.dark, [0, -0.52, 0]);
  addMesh(rightArm, sharedGeometries.arm, palette.dark, [0, -0.52, 0]);

  if (def.shoulderPads) {
    addMesh(leftArm, sharedGeometries.box, palette.base, [0, 0.1, 0], [0, 0, 0.4], [0.4, 0.3, 0.8]);
    addMesh(rightArm, sharedGeometries.box, palette.base, [0, 0.1, 0], [0, 0, -0.4], [0.4, 0.3, 0.8]);
  }

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.32, 0.9, 0);
  rightLeg.position.set(0.32, 0.9, 0);
  bodyPivot.add(leftLeg, rightLeg);

  const legScale = def.legType === 'long' ? [0.9, 1.3, 0.9] : def.legType === 'heavy' ? [1.2, 0.95, 1.2] : [1, 1, 1];
  const legTilt = def.legType === 'angled' ? 0.2 : def.legType === 'runner' ? 0.12 : 0;
  addMesh(leftLeg, sharedGeometries.leg, palette.dark, [0, -0.56, 0.04], [legTilt, 0, 0], legScale);
  addMesh(rightLeg, sharedGeometries.leg, palette.dark, [0, -0.56, 0.04], [-legTilt, 0, 0], legScale);
  addMesh(leftLeg, sharedGeometries.foot, palette.base, [0, -1.14, 0.17], [0, 0, 0], [0.95, 1, 0.85]);
  addMesh(rightLeg, sharedGeometries.foot, palette.base, [0, -1.14, 0.17], [0, 0, 0], [0.95, 1, 0.85]);

  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.36, 1.58, 0.62);
  bodyPivot.add(weaponPivot);
  addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0, 0], [0, 0, 0], [0.24, 0.28, 1.4]);
  addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.02, 0.82], [Math.PI / 2, 0, 0], [1, 1, 0.8]);

  if (def.weapon === 'cannon') {
    addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.22, 0.18], [0, 0, 0], [0.5, 0.36, 0.8]);
  } else if (def.weapon === 'bladegun') {
    addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, -0.24, 0.32], [0.6, 0, 0], [0.12, 0.7, 0.5]);
  } else if (def.weapon === 'smg') {
    addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.2, -0.2], [0, 0, 0], [0.28, 0.5, 0.25]);
  } else if (def.weapon === 'carbine') {
    addMesh(weaponPivot, sharedGeometries.cone, palette.accent, [0, -0.02, 1.18], [Math.PI / 2, 0, 0], [0.22, 0.4, 0.22]);
  }

  return {
    id: def.id,
    root,
    bodyPivot,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponPivot,
  };
}

function animateCharacterRig(rig, motion, time, isPreview = false) {
  const runPhase = time * 11;
  const runStrength = THREE.MathUtils.clamp(motion, 0, 1);
  const bounce = Math.sin(runPhase * 2) * 0.11 * runStrength;
  const idleSway = Math.sin(time * 2.3 + (isPreview ? 1.5 : 0)) * 0.035;

  rig.bodyPivot.position.y = 0.95 + bounce;
  rig.bodyPivot.rotation.x = -0.18 * runStrength + idleSway * 0.6;
  rig.bodyPivot.rotation.z = idleSway;

  rig.leftLeg.rotation.x = Math.sin(runPhase) * 0.9 * runStrength;
  rig.rightLeg.rotation.x = Math.sin(runPhase + Math.PI) * 0.9 * runStrength;
  rig.leftArm.rotation.x = Math.sin(runPhase + Math.PI) * 0.55 * runStrength - 0.1;
  rig.rightArm.rotation.x = Math.sin(runPhase) * 0.55 * runStrength - 0.1;

  const breathe = Math.sin(time * 2.2) * (0.045 + 0.04 * (1 - runStrength));
  rig.head.position.y = 2.35 + breathe;
  rig.head.rotation.y = Math.sin(time * 1.7) * 0.08;
  rig.weaponPivot.rotation.x = -0.05 + Math.sin(time * 6.2) * 0.015 * (1 - runStrength);
}

function resolveCharacterId(rawId) {
  return CHARACTER_DEFS.some((character) => character.id === rawId) ? rawId : CHARACTER_DEFS[0].id;
}

function loadSelectedCharacterId() {
  return resolveCharacterId(localStorage.getItem(CHARACTER_STORAGE_KEY));
}

function saveSelectedCharacterId(characterId) {
  localStorage.setItem(CHARACTER_STORAGE_KEY, resolveCharacterId(characterId));
}

const playerRigHolder = new THREE.Group();
playerRigHolder.position.set(0, 0.2, 0);
scene.add(playerRigHolder);

let selectedCharacterId = loadSelectedCharacterId();
let playerRig = null;

function setPlayerCharacter(characterId) {
  selectedCharacterId = resolveCharacterId(characterId);
  saveSelectedCharacterId(selectedCharacterId);
  if (playerRig) {
    playerRigHolder.remove(playerRig.root);
  }
  const def = CHARACTER_DEFS.find((character) => character.id === selectedCharacterId) || CHARACTER_DEFS[0];
  playerRig = createCharacterRig(def);
  playerRigHolder.add(playerRig.root);
}

setPlayerCharacter(selectedCharacterId);

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
};

const input = {
  move: new THREE.Vector2(),
  shooting: false,
  keys: new Set(),
  moveTouch: null,
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
  bullet.position.copy(playerRigHolder.position).addScaledVector(dirVec, 1.3).setY(1.35);
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
  playerRigHolder.position.set(0, 0.2, 0);
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
window.addEventListener('pointerup', () => {
  input.shooting = false;
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

function zoneTouch(zone) {
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    input.moveTouch = { id: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    input.shooting = true;
  });

  zone.addEventListener('pointermove', (e) => {
    const touch = input.moveTouch;
    if (!touch || touch.id !== e.pointerId) return;
    const dx = THREE.MathUtils.clamp(e.clientX - touch.startX, -42, 42);
    const dy = THREE.MathUtils.clamp(e.clientY - touch.startY, -42, 42);
    touch.dx = dx;
    touch.dy = dy;
    input.move.set(dx / 42, dy / 42);
  });

  const clear = (e) => {
    const touch = input.moveTouch;
    if (!touch || touch.id !== e.pointerId) return;
    input.moveTouch = null;
    input.move.set(0, 0);
    input.shooting = false;
  };

  zone.addEventListener('pointerup', clear);
  zone.addEventListener('pointercancel', clear);
}

zoneTouch(ui.moveZone);

const previewCards = [];

function createCharacterCard(def) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'character-card';
  button.dataset.characterId = def.id;

  const label = document.createElement('div');
  label.className = 'character-name';
  label.textContent = def.name;

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'character-preview';
  previewCanvas.width = 180;
  previewCanvas.height = 140;

  button.append(previewCanvas, label);
  ui.characterGrid.append(button);

  const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  previewRenderer.setSize(previewCanvas.width, previewCanvas.height, false);

  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(50, previewCanvas.width / previewCanvas.height, 0.1, 30);
  previewCamera.position.set(0, 3.3, 5.2);
  previewCamera.lookAt(0, 1.2, 0);

  previewScene.add(new THREE.HemisphereLight(0xbfe9ff, 0x10223a, 0.8));
  const pDir = new THREE.DirectionalLight(0xffffff, 0.9);
  pDir.position.set(3, 6, 3);
  previewScene.add(pDir);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x15324b, roughness: 0.85, metalness: 0.05 })
  );
  floor.position.y = -0.1;
  previewScene.add(floor);

  const rig = createCharacterRig(def);
  rig.root.position.y = 0.1;
  previewScene.add(rig.root);

  button.addEventListener('click', () => {
    setPlayerCharacter(def.id);
    refreshCharacterSelection();
  });

  button.addEventListener('pointerenter', () => {
    button.classList.add('is-hovered');
  });

  button.addEventListener('pointerleave', () => {
    button.classList.remove('is-hovered');
  });

  return { def, button, previewRenderer, previewScene, previewCamera, rig };
}

function refreshCharacterSelection() {
  for (const card of previewCards) {
    card.button.classList.toggle('is-selected', card.def.id === selectedCharacterId);
  }
}

for (const def of CHARACTER_DEFS) {
  previewCards.push(createCharacterCard(def));
}
refreshCharacterSelection();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  let moveBlend = 0;
  if (state.running) {
    const keyboardMove = new THREE.Vector2(
      (input.keys.has('KeyA') ? 1 : 0) - (input.keys.has('KeyD') ? 1 : 0),
      (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0)
    );
    if (keyboardMove.lengthSq() > 0) keyboardMove.normalize();
    const finalMove = input.move.lengthSq() > 0 ? input.move.clone() : keyboardMove;
    const deadZone = 0.18;
    const moveStrength = finalMove.length();
    const moveActive = moveStrength > deadZone;

    if (moveActive) {
      finalMove.normalize();
      state.yaw = Math.atan2(finalMove.x, finalMove.y);
    }

    moveBlend = moveActive ? THREE.MathUtils.clamp(moveStrength, 0, 1) : 0;

    const velocity = new THREE.Vector3(finalMove.x * 11 * dt, 0, finalMove.y * 11 * dt);
    playerRigHolder.position.add(velocity);
    playerRigHolder.position.x = THREE.MathUtils.clamp(playerRigHolder.position.x, -42, 42);
    playerRigHolder.position.z = THREE.MathUtils.clamp(playerRigHolder.position.z, -42, 42);
    playerRigHolder.rotation.y = state.yaw;

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
      const toPlayer = playerRigHolder.position.clone().sub(e.position);
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

  animateCharacterRig(playerRig, moveBlend, elapsed);

  for (const card of previewCards) {
    card.rig.root.rotation.y = elapsed * 0.5;
    animateCharacterRig(card.rig, 0.12, elapsed + previewCards.indexOf(card), true);
    card.previewRenderer.render(card.previewScene, card.previewCamera);
  }

  updateStick(ui.moveStick, ui.moveKnob, input.moveTouch);

  const camOffset = new THREE.Vector3(0, 22, 0.001);
  camera.position.copy(playerRigHolder.position).add(camOffset);
  camera.lookAt(playerRigHolder.position.x, playerRigHolder.position.y, playerRigHolder.position.z);

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
