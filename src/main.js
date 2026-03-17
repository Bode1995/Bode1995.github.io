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

const ENEMY_TYPES = {
  runner: { role: 'field', hp: 2, speed: 4.9, damage: 22, radius: 0.72, score: 11 },
  tank: { role: 'field', hp: 8, speed: 1.6, damage: 34, radius: 1.2, score: 16 },
  shooter: { role: 'field', hp: 4, speed: 2.4, damage: 18, radius: 0.92, score: 14, range: 13.5, keepDistance: 8.5, fireRate: 1.4 },
  swarm: { role: 'field', hp: 1, speed: 5.6, damage: 12, radius: 0.42, score: 7 },
  charger: { role: 'field', hp: 5, speed: 2.5, damage: 26, radius: 0.95, score: 15, chargeSpeed: 9.8, chargeCooldown: 2.2, chargeDuration: 0.45 },
  splitter: { role: 'field', hp: 5, speed: 2.3, damage: 20, radius: 0.95, score: 15, splitCount: 3 },
  bossHeavy: { role: 'boss', hp: 48, speed: 1.15, damage: 52, radius: 1.95, score: 110 },
  bossAgile: { role: 'boss', hp: 36, speed: 3.25, damage: 38, radius: 1.65, score: 125, chargeSpeed: 10.5, chargeCooldown: 1.65, chargeDuration: 0.35 },
};

const ENEMY_MATERIALS = {
  shell: new THREE.MeshStandardMaterial({ color: 0xc94661, roughness: 0.52, metalness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3e1020, roughness: 0.72, metalness: 0.08 }),
  mech: new THREE.MeshStandardMaterial({ color: 0x647088, roughness: 0.42, metalness: 0.5 }),
  glow: new THREE.MeshStandardMaterial({ color: 0x6ce6ff, emissive: 0x1f94a8, roughness: 0.35, metalness: 0.35 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xf2d3bb, roughness: 0.6, metalness: 0.06 }),
};

function createEnemyModel(type) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const anim = { body, legs: [], extras: [] };

  const add = (geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], parent = body) => addMesh(parent, geo, mat, pos, rot, scale);

  if (type === 'runner') {
    body.rotation.x = -0.22;
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 0.95, 0], [0, 0, 0], [0.92, 0.58, 1.55]);
    add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.02, 0.65], [0.15, 0, 0], [0.5, 0.2, 0.45]);
    const l = new THREE.Group(); const r = new THREE.Group();
    l.position.set(-0.3, 0.7, 0.08); r.position.set(0.3, 0.7, 0.08); body.add(l, r);
    add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0.35, 0, 0], [0.58, 1.25, 0.58], l);
    add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0.35, 0, 0], [0.58, 1.25, 0.58], r);
    anim.legs.push(l, r);
  } else if (type === 'tank') {
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.2, 0], [0, 0, 0], [1.8, 1.15, 1.55]);
    add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 1.95, -0.08], [0.12, 0, 0], [1.35, 0.45, 1.2]);
    add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.45, 0.75], [0, 0, 0], [0.58, 0.25, 0.35]);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.82, 0.72, 0);
      body.add(leg);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.52, 0], [0.05, 0, 0], [1.2, 1, 1.2], leg);
      anim.legs.push(leg);
    }
  } else if (type === 'shooter') {
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.05, 0], [0, 0.1, 0], [1.05, 0.86, 1.05]);
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.62, -0.12], [0.18, 0, 0], [0.82, 0.35, 0.8]);
    const gun = new THREE.Group();
    gun.position.set(0, 1.2, 0.92);
    body.add(gun);
    add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, 0, 0], [0.3, 0.25, 1.35], gun);
    add(sharedGeometries.weaponBarrel, ENEMY_MATERIALS.glow, [0, -0.03, 0.84], [Math.PI / 2, 0, 0], [1, 1, 0.88], gun);
    anim.extras.push(gun);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.36, 0.64, 0);
      body.add(leg);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0, 0, 0], [0.65, 1, 0.65], leg);
      anim.legs.push(leg);
    }
  } else if (type === 'swarm') {
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 0.5, 0], [0, 0.5, 0], [0.48, 0.42, 0.62]);
    add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 0.55, 0.25], [0.2, 0, 0], [0.3, 0.14, 0.2]);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.16, 0.33, 0);
      body.add(leg);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.18, 0], [0.45, 0, 0], [0.24, 0.7, 0.24], leg);
      anim.legs.push(leg);
    }
  } else if (type === 'charger') {
    body.rotation.x = -0.1;
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.05, 0], [0.1, 0, 0], [1.08, 0.7, 1.48]);
    add(sharedGeometries.cone, ENEMY_MATERIALS.bone, [0, 1.18, 0.92], [Math.PI / 2, 0, 0], [0.62, 0.75, 0.62]);
    for (const side of [-1, 1]) {
      add(sharedGeometries.cone, ENEMY_MATERIALS.dark, [side * 0.62, 1.05, 0.66], [Math.PI / 2, side * 0.3, 0], [0.38, 0.55, 0.38]);
      const leg = new THREE.Group();
      leg.position.set(side * 0.4, 0.66, 0.1);
      body.add(leg);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.4, 0], [0.18, 0, 0], [0.7, 1.05, 0.7], leg);
      anim.legs.push(leg);
    }
  } else if (type === 'splitter') {
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.02, 0], [0, 0.25, 0], [0.84, 0.76, 1.15]);
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.02, 0], [0, -0.2, 0], [0.82, 0.2, 1.25]);
    add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.15, 0.72], [0, 0, 0], [0.34, 0.2, 0.26]);
    for (const side of [-1, 1]) {
      const segment = new THREE.Group();
      segment.position.set(side * 0.5, 0.84, 0);
      body.add(segment);
      add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, side * 0.35, 0], [0.34, 0.68, 0.5], segment);
      anim.extras.push(segment);
    }
  } else if (type === 'bossHeavy') {
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.85, 0], [0, 0, 0], [2.85, 1.8, 2.25]);
    add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 3.1, -0.2], [0.18, 0, 0], [2.25, 0.65, 1.85]);
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 2.45, 1.32], [0.2, 0, 0], [1.2, 0.95, 0.8]);
    for (const side of [-1, 1]) {
      const tower = new THREE.Group();
      tower.position.set(side * 1.35, 2.62, 0.2);
      body.add(tower);
      add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, 0, 0], [0.62, 1.15, 0.62], tower);
      add(sharedGeometries.visor, ENEMY_MATERIALS.glow, [0, 0.38, 0.24], [0, 0, 0], [1.2, 1, 1.3], tower);
      anim.extras.push(tower);
    }
  } else if (type === 'bossAgile') {
    add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.6, 0], [0.08, 0, 0], [1.8, 1.2, 1.7]);
    add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 2.4, -0.2], [0.18, 0, 0], [1.05, 0.55, 1.18]);
    for (const side of [-1, 1]) {
      const limb = new THREE.Group();
      limb.position.set(side * 1.05, 1.5, 0.1);
      body.add(limb);
      add(sharedGeometries.arm, ENEMY_MATERIALS.dark, [0, -0.35, 0], [0.2, 0, side * 0.25], [0.9, 1.4, 0.9], limb);
      add(sharedGeometries.cone, ENEMY_MATERIALS.bone, [0, -1, 0.25], [Math.PI, 0, 0], [0.34, 0.55, 0.34], limb);
      anim.legs.push(limb);
    }
    const rotor = new THREE.Group();
    rotor.position.set(0, 2.95, 0);
    body.add(rotor);
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 0, 0], [0, 0, 0], [1.85, 0.1, 0.2], rotor);
    add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 0, 0], [0, Math.PI / 2, 0], [1.85, 0.1, 0.2], rotor);
    anim.extras.push(rotor);
  }

  return { root, anim };
}

function pickEnemyType(wave, indexInWave) {
  if (wave >= 5 && indexInWave === 0) return wave % 2 === 0 ? 'bossAgile' : 'bossHeavy';
  const pool = ['runner', 'runner', 'swarm', 'tank', 'shooter', 'charger', 'splitter'];
  if (wave < 2) return 'runner';
  if (wave < 3) return pool[Math.floor(Math.random() * 3)];
  if (wave < 5) return pool[Math.floor(Math.random() * 5)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnEnemy(type, angle, dist, waveScale) {
  const model = createEnemyModel(type);
  const cfg = ENEMY_TYPES[type];
  const enemy = model.root;
  enemy.position.set(Math.cos(angle) * dist, cfg.role === 'boss' ? 0.7 : 0.45, Math.sin(angle) * dist);
  enemy.castShadow = true;
  enemy.userData = {
    type,
    hp: Math.ceil(cfg.hp + waveScale * (cfg.role === 'boss' ? 1.2 : 0.45)),
    speed: (cfg.speed + waveScale * (cfg.role === 'boss' ? 0.05 : 0.08)) * (0.94 + Math.random() * 0.12),
    damage: cfg.damage,
    radius: cfg.radius,
    score: cfg.score,
    range: cfg.range || 0,
    keepDistance: cfg.keepDistance || 0,
    fireRate: cfg.fireRate || 0,
    fireCooldown: Math.random(),
    chargeSpeed: cfg.chargeSpeed || 0,
    chargeCooldown: cfg.chargeCooldown || 0,
    chargeTimer: 0,
    chargeDuration: cfg.chargeDuration || 0,
    splitCount: cfg.splitCount || 0,
    anim: model.anim,
    spawnTick: Math.random() * Math.PI * 2,
  };
  scene.add(enemy);
  enemies.push(enemy);
}

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
    const type = pickEnemyType(state.wave, i);
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 18;
    spawnEnemy(type, angle, dist, state.wave);
    if (type === 'swarm' && i < state.spawnLeft - 2) {
      for (let g = 0; g < 2; g++) {
        const offsetA = angle + (Math.random() - 0.5) * 0.25;
        const offsetD = dist + (Math.random() - 0.5) * 2;
        spawnEnemy('swarm', offsetA, offsetD, state.wave);
      }
      i += 2;
    }
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
  if (enemy.userData.type === 'splitter') {
    for (let i = 0; i < enemy.userData.splitCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.9 + Math.random() * 1.4;
      spawnEnemy('swarm', angle, dist, Math.max(1, state.wave * 0.5));
      enemies[enemies.length - 1].position.add(enemy.position);
    }
  }
  state.score += enemy.userData.score || 10;
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
      const data = e.userData;
      const toPlayer = playerRigHolder.position.clone().sub(e.position);
      const dist = toPlayer.length();
      toPlayer.normalize();
      const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
      let moveDir = toPlayer.clone();
      let moveSpeed = data.speed;

      if (data.type === 'shooter') {
        if (dist < data.keepDistance) {
          moveDir = toPlayer.clone().multiplyScalar(-0.65).addScaledVector(side, Math.sin(elapsed + i) * 0.7).normalize();
        } else if (dist < data.range) {
          moveDir = side.clone().multiplyScalar(Math.sin(elapsed * 0.8 + i) > 0 ? 1 : -1);
        }
        data.fireCooldown -= dt;
        if (dist < data.range && data.fireCooldown <= 0) {
          state.hp -= data.damage * 0.18;
          data.fireCooldown = data.fireRate;
        }
      }

      if (data.chargeCooldown > 0) {
        data.chargeTimer -= dt;
        if (data.chargeTimer <= -data.chargeCooldown) data.chargeTimer = data.chargeDuration;
        if (data.chargeTimer > 0) moveSpeed = data.chargeSpeed;
      }

      e.position.addScaledVector(moveDir, moveSpeed * dt);
      e.lookAt(playerRigHolder.position.x, e.position.y, playerRigHolder.position.z);

      const step = elapsed * (2.8 + moveSpeed * 0.9) + data.spawnTick;
      const bobAmp = data.type.includes('boss') ? 0.12 : data.type === 'swarm' ? 0.06 : 0.08;
      e.position.y = (data.type.includes('boss') ? 0.75 : 0.45) + Math.sin(step) * bobAmp;
      if (data.anim?.body) data.anim.body.rotation.z = Math.sin(step * 0.5) * 0.04;
      for (let legIdx = 0; legIdx < data.anim.legs.length; legIdx++) {
        data.anim.legs[legIdx].rotation.x = Math.sin(step * 1.7 + legIdx * Math.PI) * 0.45;
      }
      for (let extraIdx = 0; extraIdx < data.anim.extras.length; extraIdx++) {
        data.anim.extras[extraIdx].rotation.y = Math.sin(step + extraIdx) * 0.28;
      }

      if (dist < data.radius + 0.7) {
        state.hp -= data.damage * dt;
        if (state.hp <= 0) gameOver();
      }

      for (let j = bullets.length - 1; j >= 0; j--) {
        if (e.position.distanceTo(bullets[j].position) < data.radius) {
          data.hp -= 1;
          scene.remove(bullets[j]);
          bullets.splice(j, 1);
          if (data.hp <= 0) {
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
