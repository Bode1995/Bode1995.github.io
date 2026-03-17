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
  shieldValue: document.getElementById('shieldValue'),
  powerSummary: document.getElementById('powerSummary'),
  pickupFeed: document.getElementById('pickupFeed'),
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const gameplayConfig = {
  controls: {
    rotationDeadZone: 0.32,
    moveStartRadius: 0.38,
    fineMoveRadius: 0.56,
    highSpeedRadius: 0.88,
    maxInputRadius: 88,
    speedExponent: 1.8,
    minMoveSpeed: 1.4,
    maxMoveSpeed: 10.8,
  },
  camera: {
    fov: 64,
    height: 39,
    forwardOffset: 0.001,
    lookAtHeight: 0.2,
  },
  arena: {
    size: 112,
    gridDivisions: 36,
    padding: 3,
    spawnMinDistance: 24,
    spawnMaxDistance: 46,
  },
  enemies: {
    waveSpeedScale: {
      field: 0.06,
      boss: 0.04,
    },
    randomVariance: 0.08,
    baseSpeedMultiplier: {
      runner: 1,
      tank: 1,
      shooter: 1,
      swarm: 0.95,
      charger: 1,
      splitter: 1,
      bossHeavy: 1,
      bossAgile: 1,
    },
  },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08121f);
scene.fog = new THREE.Fog(0x08121f, 24, 126);

const camera = new THREE.PerspectiveCamera(gameplayConfig.camera.fov, window.innerWidth / window.innerHeight, 0.1, 220);

const hemi = new THREE.HemisphereLight(0x9fd9ff, 0x1b273b, 0.75);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 18, 4);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.near = 0.1;
dir.shadow.camera.far = 90;
dir.shadow.camera.left = -40;
dir.shadow.camera.right = 40;
dir.shadow.camera.top = 40;
dir.shadow.camera.bottom = -40;
dir.shadow.bias = -0.00025;
scene.add(dir);

const fillLight = new THREE.DirectionalLight(0x8ec5ff, 0.35);
fillLight.position.set(-16, 10, -9);
scene.add(fillLight);

const arena = new THREE.Mesh(
  new THREE.PlaneGeometry(gameplayConfig.arena.size, gameplayConfig.arena.size, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0x243f35, metalness: 0.03, roughness: 0.96, wireframe: false })
);
arena.rotation.x = -Math.PI / 2;
arena.receiveShadow = true;
scene.add(arena);

const mapRoot = new THREE.Group();
scene.add(mapRoot);
const worldColliders = [];
const PLAYER_COLLISION_RADIUS = 0.72;

const POWER_UP_DEFS = {
  fire: { kind: 'projectile', label: 'Fire', color: 0xff7f4d, icon: '🔥' },
  ice: { kind: 'projectile', label: 'Ice', color: 0x8de0ff, icon: '❄️' },
  lightning: { kind: 'projectile', label: 'Lightning', color: 0x95a8ff, icon: '⚡' },
  poison: { kind: 'projectile', label: 'Poison', color: 0x7bdf64, icon: '☠️' },
  rockets: { kind: 'projectile', label: 'Rockets', color: 0xffa34a, icon: '🚀' },
  doubler: { kind: 'projectile', label: 'Doubler', color: 0xfff38c, icon: '✖️' },
  health: { kind: 'player', label: 'Health', color: 0xff8faf, icon: '❤️' },
  movementSpeed: { kind: 'player', label: 'Move Speed', color: 0x66ffd8, icon: '🏃' },
  shield: { kind: 'player', label: 'Shield', color: 0x79d7ff, icon: '🛡️' },
};

const POWER_UP_KEYS = Object.keys(POWER_UP_DEFS);
const powerPickups = [];
const pickupNotices = [];

const RUN_BASE = {
  moveSpeedMultiplier: 1,
  projectileCount: 1,
};

const SAFETY_LIMITS = {
  maxProjectileCount: 128,
  maxActiveBullets: 900,
};

const runPowers = {
  stacks: {
    fire: 0,
    ice: 0,
    lightning: 0,
    poison: 0,
    rockets: 0,
    doubler: 0,
    movementSpeed: 0,
    shield: 0,
  },
  shieldHp: 0,
};

function addCollider(x, z, radius) {
  worldColliders.push({ x, z, radius });
}

function resolveWorldCollision(position, radius) {
  for (let i = 0; i < worldColliders.length; i++) {
    const c = worldColliders[i];
    const dx = position.x - c.x;
    const dz = position.z - c.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const overlap = radius + c.radius - dist;
    if (overlap > 0) {
      position.x += (dx / dist) * overlap;
      position.z += (dz / dist) * overlap;
    }
  }
}

function createWorldMap() {
  const shared = {
    building: new THREE.MeshStandardMaterial({ color: 0x4e6078, roughness: 0.84, metalness: 0.08 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x7f99b8, roughness: 0.65, metalness: 0.12 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xa6e5d2, roughness: 0.4, metalness: 0.2, emissive: 0x10211c }),
    wall: new THREE.MeshStandardMaterial({ color: 0x334753, roughness: 0.9, metalness: 0.06 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5f4e41, roughness: 0.92, metalness: 0.02 }),
    foliageA: new THREE.MeshStandardMaterial({ color: 0x2f8758, roughness: 0.9, metalness: 0.02 }),
    foliageB: new THREE.MeshStandardMaterial({ color: 0x53a76b, roughness: 0.86, metalness: 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x717d8d, roughness: 0.82, metalness: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x88613f, roughness: 0.88, metalness: 0.03 }),
  };

  const half = gameplayConfig.arena.size * 0.5;
  const wallThickness = 2.4;
  const wallHeight = 4.8;

  const perimeter = [
    { x: 0, z: -half, sx: gameplayConfig.arena.size, sz: wallThickness },
    { x: 0, z: half, sx: gameplayConfig.arena.size, sz: wallThickness },
    { x: -half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size },
    { x: half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size },
  ];

  for (const side of perimeter) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(side.sx, wallHeight, side.sz), shared.wall);
    wall.position.set(side.x, wallHeight * 0.5, side.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    mapRoot.add(wall);
  }

  const buildingSpots = [
    [-35, -33, 8, 6, 4.4], [-15, -35, 9, 7, 5], [10, -30, 7, 7, 4], [32, -32, 8, 6, 4.8],
    [-32, -12, 9, 8, 5.2], [34, -10, 8, 8, 4.5], [-36, 14, 10, 7, 5], [-10, 30, 7, 7, 4],
    [15, 28, 9, 6, 4.6], [36, 18, 8, 8, 5.2], [-20, 8, 8, 6, 4.1], [6, 10, 7, 9, 4.6],
  ];

  for (const [x, z, sx, sz, h] of buildingSpots) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), shared.building);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.88, 0.45, sz * 0.88), shared.roof);
    roof.position.y = h + 0.22;
    roof.castShadow = true;
    const glow = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.15, 1, 0.22), shared.trim);
    glow.position.set(0, h * 0.5 + 0.3, sz * 0.5 + 0.08);
    b.add(body, roof, glow);
    mapRoot.add(b);
    addCollider(x, z, Math.max(sx, sz) * 0.58);
  }

  for (let i = -3; i <= 3; i++) {
    const planters = [
      { x: i * 8, z: -4, size: 2.4 },
      { x: i * 8 + 2.5, z: 4, size: 2.1 },
    ];
    for (const planter of planters) {
      const p = new THREE.Group();
      p.position.set(planter.x, 0, planter.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(planter.size * 0.55, planter.size * 0.68, 0.8, 7), shared.stone);
      base.position.y = 0.4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 6), shared.wood);
      trunk.position.y = 1.2;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(planter.size * 0.8, 2.2, 7), i % 2 === 0 ? shared.foliageA : shared.foliageB);
      crown.position.y = 2.7;
      base.castShadow = trunk.castShadow = crown.castShadow = true;
      base.receiveShadow = true;
      p.add(base, trunk, crown);
      mapRoot.add(p);
      addCollider(planter.x, planter.z, planter.size * 0.42);
    }
  }

  for (let i = 0; i < 22; i++) {
    const x = -44 + (i % 11) * 8.8;
    const z = i < 11 ? -47 : 47;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.6), shared.crate);
    crate.position.set(x, 0.75, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    mapRoot.add(crate);
    addCollider(x, z, 0.95);
  }

  const statues = [
    [-5, -20], [20, -14], [-24, 22], [26, 22], [0, 33],
  ];
  for (const [x, z] of statues) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 1.1, 8), shared.stone);
    pedestal.position.y = 0.55;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 3.4, 6), shared.wall);
    obelisk.position.y = 2.55;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.1, 6), shared.trim);
    cap.position.y = 4.8;
    pedestal.castShadow = obelisk.castShadow = cap.castShadow = true;
    pedestal.receiveShadow = true;
    g.add(pedestal, obelisk, cap);
    mapRoot.add(g);
    addCollider(x, z, 1.2);
  }
}

createWorldMap();

function randomArenaPoint(padding = 4) {
  const half = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - padding;
  return new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(half * 2),
    0,
    THREE.MathUtils.randFloatSpread(half * 2)
  );
}

function isOutsideArenaBounds(position, padding = 0) {
  const half = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding + padding;
  return Math.abs(position.x) > half || Math.abs(position.z) > half;
}

function isPointValidForPickup(point, radius = 1.1) {
  for (let i = 0; i < worldColliders.length; i++) {
    const c = worldColliders[i];
    if (Math.hypot(point.x - c.x, point.z - c.z) < c.radius + radius) return false;
  }
  if (Math.hypot(point.x - playerRigHolder.position.x, point.z - playerRigHolder.position.z) < 5) return false;
  return true;
}

function createPickupMesh(type) {
  const def = POWER_UP_DEFS[type];
  const root = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.09, 10, 26),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.25 })
  );
  ring.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: def.color, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.35 })
  );
  root.add(ring, core);
  root.userData.ring = ring;
  root.userData.core = core;
  return root;
}

function spawnPowerPickup(type = POWER_UP_KEYS[Math.floor(Math.random() * POWER_UP_KEYS.length)]) {
  let position = null;
  for (let tries = 0; tries < 24; tries++) {
    const p = randomArenaPoint();
    if (isPointValidForPickup(p)) {
      position = p;
      break;
    }
  }
  if (!position) return;
  const mesh = createPickupMesh(type);
  mesh.position.copy(position).setY(0.9);
  scene.add(mesh);
  powerPickups.push({ mesh, type, pulse: Math.random() * Math.PI * 2, radius: 0.95 });
}

function removeAllPickups() {
  for (const pickup of powerPickups) {
    scene.remove(pickup.mesh);
  }
  powerPickups.length = 0;
}

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
const damageNumbers = [];
const vfxParticles = [];
const chainBeams = [];
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
  totalKills: 0,
  waveKills: 0,
  pickupSpawnTimer: 5,
  pickupSpawnInterval: 10,
  moveSpeedMultiplier: 1,
  projectileCount: 1,
};

const ENEMY_TYPES = {
  runner: { role: 'field', hp: 2, speed: 4.6, damage: 22, radius: 0.72, score: 11 },
  tank: { role: 'field', hp: 8, speed: 1.75, damage: 34, radius: 1.2, score: 16 },
  shooter: { role: 'field', hp: 4, speed: 2.55, damage: 18, radius: 0.92, score: 14, range: 13.5, keepDistance: 8.5, fireRate: 1.4 },
  swarm: { role: 'field', hp: 1, speed: 5.1, damage: 12, radius: 0.42, score: 7 },
  charger: { role: 'field', hp: 5, speed: 2.6, damage: 26, radius: 0.95, score: 15, chargeSpeed: 9.2, chargeCooldown: 2.2, chargeDuration: 0.45 },
  splitter: { role: 'field', hp: 5, speed: 2.35, damage: 20, radius: 0.95, score: 15, splitCount: 3 },
  bossHeavy: { role: 'boss', hp: 48, speed: 1.25, damage: 52, radius: 1.95, score: 110 },
  bossAgile: { role: 'boss', hp: 36, speed: 2.95, damage: 38, radius: 1.65, score: 125, chargeSpeed: 9.7, chargeCooldown: 1.65, chargeDuration: 0.35 },
};

const ENEMY_MATERIALS = {
  shell: new THREE.MeshStandardMaterial({ color: 0xc94661, roughness: 0.52, metalness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3e1020, roughness: 0.72, metalness: 0.08 }),
  mech: new THREE.MeshStandardMaterial({ color: 0x647088, roughness: 0.42, metalness: 0.5 }),
  glow: new THREE.MeshStandardMaterial({ color: 0x6ce6ff, emissive: 0x1f94a8, roughness: 0.35, metalness: 0.35 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xf2d3bb, roughness: 0.6, metalness: 0.06 }),
};

const VFX = {
  maxParticles: 340,
  particleGeometry: new THREE.SphereGeometry(0.085, 6, 6),
  ringGeometry: new THREE.TorusGeometry(0.92, 0.08, 8, 20),
};

const EFFECT_COLORS = {
  fire: 0xff8a4f,
  ice: 0x97e8ff,
  lightning: 0xb3b7ff,
  poison: 0x88ff73,
  rockets: 0xffb067,
};

function getProjectileEffects() {
  return {
    fire: runPowers.stacks.fire > 0,
    ice: runPowers.stacks.ice > 0,
    lightning: runPowers.stacks.lightning > 0,
    poison: runPowers.stacks.poison > 0,
    rockets: runPowers.stacks.rockets > 0,
  };
}

function spawnVfxParticle(position, velocity, color, life = 0.35, scale = 1) {
  if (vfxParticles.length > VFX.maxParticles) {
    const oldest = vfxParticles.shift();
    if (oldest) scene.remove(oldest.mesh);
  }
  const mesh = new THREE.Mesh(
    VFX.particleGeometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false })
  );
  mesh.position.copy(position);
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  vfxParticles.push({ mesh, vel: velocity, life, maxLife: life, drag: 0.9 + Math.random() * 0.08 });
}

function spawnBurst(position, color, count, speed, life = 0.3, scale = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const up = (Math.random() - 0.5) * 0.5;
    const vel = new THREE.Vector3(Math.cos(angle), up, Math.sin(angle)).multiplyScalar(speed * (0.35 + Math.random() * 0.85));
    spawnVfxParticle(position, vel, color, life * (0.8 + Math.random() * 0.5), scale * (0.65 + Math.random() * 0.65));
  }
}

function spawnImpactEffects(position, effects) {
  if (effects.fire) spawnBurst(position, EFFECT_COLORS.fire, 9, 4.4, 0.45, 1.05);
  if (effects.ice) spawnBurst(position, EFFECT_COLORS.ice, 8, 3.7, 0.42, 0.95);
  if (effects.poison) spawnBurst(position, 0x94ff73, 8, 2.9, 0.5, 1.15);
  if (effects.lightning) spawnBurst(position, EFFECT_COLORS.lightning, 7, 5.2, 0.3, 0.85);
  if (effects.rockets) spawnBurst(position, EFFECT_COLORS.rockets, 15, 5.8, 0.5, 1.25);
}

function createChainBeam(from, to) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xc7ccff, transparent: true, opacity: 0.95, depthWrite: false })
  );
  beam.position.copy(from).lerp(to, 0.5);
  beam.position.y += 1.2;
  const dirVec = new THREE.Vector3().subVectors(to, from);
  const len = Math.max(0.5, dirVec.length());
  beam.scale.set(1, len, 1);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec.normalize());
  scene.add(beam);
  chainBeams.push({ mesh: beam, life: 0.12, maxLife: 0.12 });
}

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
    speed:
      (cfg.speed * gameplayConfig.enemies.baseSpeedMultiplier[type] +
        waveScale *
          (cfg.role === 'boss'
            ? gameplayConfig.enemies.waveSpeedScale.boss
            : gameplayConfig.enemies.waveSpeedScale.field)) *
      (1 - gameplayConfig.enemies.randomVariance + Math.random() * gameplayConfig.enemies.randomVariance * 2),
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
    dead: false,
    hitboxRadius: cfg.radius * (type === 'swarm' ? 1.25 : 1.05),
    hitboxHalfHeight: Math.max(0.45, cfg.radius * (cfg.role === 'boss' ? 1.2 : 0.95)),
    hitboxCenterOffsetY: cfg.role === 'boss' ? 1.05 : type === 'swarm' ? 0.5 : 0.88,
    fireDot: 0,
    poisonDot: 0,
    iceSlowTimer: 0,
    shockTimer: 0,
    statusPulse: Math.random() * Math.PI * 2,
  };
  scene.add(enemy);
  enemies.push(enemy);
}

function spawnDamageNumber(enemy, amount) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 64px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(20, 30, 46, 0.9)';
  ctx.strokeText(String(amount), canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = '#ffe28b';
  ctx.fillText(String(amount), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.7, 1);
  sprite.position.copy(enemy.position);
  sprite.position.y += enemy.userData.hitboxCenterOffsetY + enemy.userData.hitboxHalfHeight + 0.3;
  scene.add(sprite);
  damageNumbers.push({
    sprite,
    life: 0.3,
    maxLife: 0.3,
    riseSpeed: 0.9,
  });
}

const input = {
  move: new THREE.Vector2(),
  shooting: false,
  keys: new Set(),
  moveTouch: null,
};

function getPowerSummaryText() {
  const active = [];
  for (const key of Object.keys(runPowers.stacks)) {
    const count = runPowers.stacks[key];
    if (count > 0) active.push(`${POWER_UP_DEFS[key].label} x${count}`);
  }
  return active.length ? active.join(' · ') : 'none';
}

function showPickupNotice(type) {
  const def = POWER_UP_DEFS[type];
  pickupNotices.push({ text: `${def.icon} ${def.label} +1`, life: 1.4, maxLife: 1.4 });
}

function applyRunPower(type) {
  if (type === 'health') {
    state.hp = Math.min(100, state.hp + 20);
    showPickupNotice(type);
    return;
  }

  runPowers.stacks[type] = (runPowers.stacks[type] || 0) + 1;
  if (type === 'movementSpeed') {
    state.moveSpeedMultiplier = RUN_BASE.moveSpeedMultiplier + runPowers.stacks.movementSpeed * 0.05;
  } else if (type === 'doubler') {
    const rawProjectileCount = RUN_BASE.projectileCount * Math.pow(2, runPowers.stacks.doubler);
    state.projectileCount = sanitizeProjectileCount(rawProjectileCount);
  } else if (type === 'shield') {
    runPowers.shieldHp += 26;
  }
  showPickupNotice(type);
}

function sanitizeProjectileCount(value) {
  if (!Number.isFinite(value) || value <= 0) return RUN_BASE.projectileCount;
  return Math.min(SAFETY_LIMITS.maxProjectileCount, Math.floor(value));
}

function resetRunPowerUps() {
  for (const key of Object.keys(runPowers.stacks)) runPowers.stacks[key] = 0;
  runPowers.shieldHp = 0;
  state.moveSpeedMultiplier = RUN_BASE.moveSpeedMultiplier;
  state.projectileCount = RUN_BASE.projectileCount;
}

function damagePlayer(amount) {
  if (runPowers.shieldHp > 0) {
    const absorbed = Math.min(runPowers.shieldHp, amount);
    runPowers.shieldHp -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) state.hp -= amount;
  if (state.hp <= 0) gameOver();
}

function updateHUD() {
  ui.wave.textContent = String(state.wave);
  ui.score.textContent = String(state.score);
  ui.hpBar.style.width = `${Math.max(0, state.hp)}%`;
  ui.shieldValue.textContent = `${Math.max(0, Math.round(runPowers.shieldHp))}`;
  ui.powerSummary.textContent = `Power-ups: ${getPowerSummaryText()}`;

  while (ui.pickupFeed.firstChild) {
    ui.pickupFeed.removeChild(ui.pickupFeed.firstChild);
  }
  for (const notice of pickupNotices) {
    const el = document.createElement('div');
    el.className = 'pickup-line';
    el.style.opacity = `${Math.max(0, notice.life / notice.maxLife)}`;
    el.textContent = notice.text;
    ui.pickupFeed.appendChild(el);
  }
}

function spawnWave() {
  state.spawnLeft = 4 + state.wave * 2;
  for (let i = 0; i < state.spawnLeft; i++) {
    const type = pickEnemyType(state.wave, i);
    const angle = Math.random() * Math.PI * 2;
    const dist = gameplayConfig.arena.spawnMinDistance + Math.random() * (gameplayConfig.arena.spawnMaxDistance - gameplayConfig.arena.spawnMinDistance);
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

function damageEnemy(enemy, amount, fromChain = false) {
  if (enemy.userData.dead) return;
  enemy.userData.hp -= amount;
  spawnDamageNumber(enemy, amount);
  if (runPowers.stacks.lightning > 0 || fromChain) {
    enemy.userData.shockTimer = Math.max(enemy.userData.shockTimer, 0.22 + runPowers.stacks.lightning * 0.04);
    spawnBurst(enemy.position.clone().setY(enemy.position.y + 1.1), EFFECT_COLORS.lightning, 3, 2.2, 0.2, 0.7);
  }
  if (enemy.userData.hp <= 0) {
    const idx = enemies.indexOf(enemy);
    if (idx >= 0) destroyEnemy(enemy, idx);
  }
  if (!fromChain && runPowers.stacks.lightning > 0) {
    let chains = runPowers.stacks.lightning;
    let source = enemy;
    const visited = new Set([enemy]);
    while (chains > 0) {
      let nearest = null;
      let nearestDist = 6.5;
      for (const candidate of enemies) {
        if (candidate.userData.dead || visited.has(candidate)) continue;
        const d = source.position.distanceTo(candidate.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = candidate;
        }
      }
      if (!nearest) break;
      visited.add(nearest);
      createChainBeam(source.position, nearest.position);
      const chainDamage = Math.max(1, Math.round(0.7 + runPowers.stacks.lightning * 0.8));
      damageEnemy(nearest, chainDamage, true);
      source = nearest;
      chains -= 1;
    }
  }
}

function applyProjectilePower(enemy, bullet) {
  const hitPos = bullet.position.clone();
  spawnImpactEffects(hitPos, bullet.userData.effects || getProjectileEffects());
  if (runPowers.stacks.fire > 0) {
    enemy.userData.fireDot += runPowers.stacks.fire * 0.7;
    spawnBurst(hitPos, EFFECT_COLORS.fire, 3, 1.9, 0.28, 0.8);
  }
  if (runPowers.stacks.poison > 0) {
    enemy.userData.poisonDot += runPowers.stacks.poison * 0.9;
    spawnBurst(hitPos, 0x7dff74, 3, 1.4, 0.36, 0.95);
  }
  if (runPowers.stacks.ice > 0) {
    enemy.userData.iceSlowTimer = Math.max(enemy.userData.iceSlowTimer, 1.2 + runPowers.stacks.ice * 0.2);
    spawnBurst(hitPos, EFFECT_COLORS.ice, 3, 1.5, 0.28, 0.8);
  }
  if (runPowers.stacks.rockets > 0) {
    const radius = 1.8 + runPowers.stacks.rockets * 0.6;
    const splash = Math.max(1, Math.round(0.5 + runPowers.stacks.rockets * 0.8));
    const blastRing = new THREE.Mesh(
      VFX.ringGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff9d5f, transparent: true, opacity: 0.75, depthWrite: false })
    );
    blastRing.position.copy(hitPos).setY(0.25);
    blastRing.rotation.x = Math.PI / 2;
    blastRing.scale.setScalar(Math.max(0.8, radius * 0.45));
    scene.add(blastRing);
    chainBeams.push({ mesh: blastRing, life: 0.18, maxLife: 0.18, ring: true });
    for (const other of enemies) {
      if (other.userData.dead) continue;
      if (other.position.distanceTo(bullet.position) <= radius) {
        damageEnemy(other, splash, true);
      }
    }
  }
}

function shoot() {
  if (state.fireCooldown > 0) return;
  state.fireCooldown = 0.18;
  const count = sanitizeProjectileCount(state.projectileCount);
  const baseYaw = state.yaw;
  const spread = Math.min(0.75, 0.11 * Math.log2(count));
  const fx = getProjectileEffects();

  if (bullets.length > SAFETY_LIMITS.maxActiveBullets) {
    const overflow = bullets.length - SAFETY_LIMITS.maxActiveBullets;
    for (let i = 0; i < overflow; i++) {
      const old = bullets.shift();
      if (old) scene.remove(old);
    }
  }

  for (let shot = 0; shot < count; shot++) {
    const t = count === 1 ? 0 : shot / (count - 1);
    const yaw = baseYaw + THREE.MathUtils.lerp(-spread, spread, t);
    const bulletColor = new THREE.Color(0x9df9ff);
    if (fx.fire) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.fire), 0.5);
    if (fx.ice) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.ice), 0.42);
    if (fx.poison) bulletColor.lerp(new THREE.Color(0x86f46a), 0.38);
    if (fx.lightning) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.lightning), 0.35);
    if (fx.rockets) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.rockets), 0.45);
    const bullet = new THREE.Mesh(
      fx.rockets ? new THREE.ConeGeometry(0.18, 0.52, 8) : new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({ color: bulletColor, emissive: bulletColor, emissiveIntensity: fx.rockets ? 0.9 : 0.55, metalness: fx.rockets ? 0.35 : 0.1, roughness: 0.35 })
    );
    const dirVec = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    bullet.position.copy(playerRigHolder.position).addScaledVector(dirVec, 1.3).setY(1.35);
    if (fx.rockets) {
      bullet.rotation.x = Math.PI / 2;
      bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec.clone());
    }
    bullet.userData.vel = dirVec.multiplyScalar(30);
    bullet.userData.life = 1.3;
    bullet.userData.damage = 1;
    bullet.userData.effects = fx;
    bullet.userData.trailTick = 0;
    scene.add(bullet);
    bullets.push(bullet);
  }
}

function destroyEnemy(enemy, index) {
  if (enemy.userData.dead) return;
  enemy.userData.dead = true;
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
  state.totalKills += 1;
  state.waveKills += 1;
  state.score += enemy.userData.score || 10;
}

function gameOver() {
  state.running = false;
  resetRunPowerUps();
  removeAllPickups();
  pickupNotices.length = 0;
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
  state.totalKills = 0;
  state.waveKills = 0;
  state.pickupSpawnTimer = 3.5;
  playerRigHolder.position.set(0, 0.2, 0);
  enemies.forEach((e) => scene.remove(e));
  bullets.forEach((b) => scene.remove(b));
  vfxParticles.forEach((fx) => scene.remove(fx.mesh));
  chainBeams.forEach((beam) => scene.remove(beam.mesh));
  damageNumbers.forEach((dmg) => {
    scene.remove(dmg.sprite);
    dmg.sprite.material.map?.dispose();
    dmg.sprite.material.dispose();
  });
  enemies.length = 0;
  bullets.length = 0;
  vfxParticles.length = 0;
  chainBeams.length = 0;
  damageNumbers.length = 0;
  removeAllPickups();
  pickupNotices.length = 0;
  resetRunPowerUps();
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
    const dx = THREE.MathUtils.clamp(e.clientX - touch.startX, -gameplayConfig.controls.maxInputRadius, gameplayConfig.controls.maxInputRadius);
    const dy = THREE.MathUtils.clamp(e.clientY - touch.startY, -gameplayConfig.controls.maxInputRadius, gameplayConfig.controls.maxInputRadius);
    touch.dx = dx;
    touch.dy = dy;
    input.move.set(dx / gameplayConfig.controls.maxInputRadius, dy / gameplayConfig.controls.maxInputRadius);
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


function classifyInputZone(strength) {
  if (strength <= gameplayConfig.controls.rotationDeadZone) return 'rotation';
  if (strength <= gameplayConfig.controls.fineMoveRadius) return 'fine';
  if (strength <= gameplayConfig.controls.highSpeedRadius) return 'standard';
  return 'high';
}

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
    const usingTouchMove = input.move.lengthSq() > 0;
    const finalMove = usingTouchMove ? input.move.clone() : keyboardMove;
    const moveStrength = THREE.MathUtils.clamp(finalMove.length(), 0, 1);
    const inputZone = classifyInputZone(moveStrength);

    if (moveStrength > gameplayConfig.controls.rotationDeadZone) {
      state.yaw = Math.atan2(finalMove.x, finalMove.y);
    }

    let moveSpeed = 0;
    if (usingTouchMove) {
      const moveRange = Math.max(0.001, 1 - gameplayConfig.controls.moveStartRadius);
      const normalized = THREE.MathUtils.clamp((moveStrength - gameplayConfig.controls.moveStartRadius) / moveRange, 0, 1);
      const curved = Math.pow(normalized, gameplayConfig.controls.speedExponent);
      moveSpeed = THREE.MathUtils.lerp(gameplayConfig.controls.minMoveSpeed, gameplayConfig.controls.maxMoveSpeed, curved) * state.moveSpeedMultiplier;

      if (inputZone === 'rotation' || normalized <= 0) {
        moveSpeed = 0;
        moveBlend = 0;
      } else if (inputZone === 'fine') {
        moveSpeed *= 0.7;
        moveBlend = THREE.MathUtils.clamp(curved * 0.8, 0.08, 0.45);
      } else if (inputZone === 'standard') {
        moveBlend = THREE.MathUtils.clamp(curved * 1.05, 0.35, 0.8);
      } else {
        moveSpeed *= 1.06;
        moveBlend = THREE.MathUtils.clamp(curved * 1.2, 0.72, 1);
      }
    } else {
      const keyMoving = keyboardMove.lengthSq() > 0;
      moveSpeed = keyMoving ? gameplayConfig.controls.maxMoveSpeed * 0.88 * state.moveSpeedMultiplier : 0;
      moveBlend = keyMoving ? 0.9 : 0;
    }

    if (moveSpeed > 0 && moveStrength > 0) {
      finalMove.normalize();
      playerRigHolder.position.addScaledVector(new THREE.Vector3(finalMove.x, 0, finalMove.y), moveSpeed * dt);
    }

    resolveWorldCollision(playerRigHolder.position, PLAYER_COLLISION_RADIUS);
    const halfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.8;
    playerRigHolder.position.x = THREE.MathUtils.clamp(playerRigHolder.position.x, -halfArena, halfArena);
    playerRigHolder.position.z = THREE.MathUtils.clamp(playerRigHolder.position.z, -halfArena, halfArena);
    playerRigHolder.rotation.y = state.yaw;

    state.fireCooldown -= dt;
    if (input.shooting) shoot();

    state.pickupSpawnTimer -= dt;
    if (state.pickupSpawnTimer <= 0 && powerPickups.length < 4) {
      spawnPowerPickup();
      state.pickupSpawnTimer = state.pickupSpawnInterval * (0.75 + Math.random() * 0.45);
    }

    for (let i = powerPickups.length - 1; i >= 0; i--) {
      const pickup = powerPickups[i];
      pickup.pulse += dt * 2.4;
      pickup.mesh.position.y = 0.86 + Math.sin(pickup.pulse) * 0.12;
      pickup.mesh.rotation.y += dt * 1.8;
      const ring = pickup.mesh.userData.ring;
      if (ring) ring.scale.setScalar(1 + Math.sin(pickup.pulse * 1.2) * 0.08);
      if (pickup.mesh.position.distanceTo(playerRigHolder.position) <= pickup.radius) {
        applyRunPower(pickup.type);
        scene.remove(pickup.mesh);
        powerPickups.splice(i, 1);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.position.addScaledVector(b.userData.vel, dt);
      if (isOutsideArenaBounds(b.position, b.geometry?.parameters?.radius ?? 0)) {
        scene.remove(b);
        bullets.splice(i, 1);
        continue;
      }
      b.userData.trailTick -= dt;
      if (b.userData.trailTick <= 0) {
        b.userData.trailTick = 0.032;
        const fx = b.userData.effects || getProjectileEffects();
        const pos = b.position.clone();
        if (fx.fire) spawnVfxParticle(pos, new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.45 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4), EFFECT_COLORS.fire, 0.35, 0.9);
        if (fx.ice) spawnVfxParticle(pos, new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.35), EFFECT_COLORS.ice, 0.38, 0.8);
        if (fx.lightning) spawnVfxParticle(pos, new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.4), EFFECT_COLORS.lightning, 0.18, 0.55);
        if (fx.poison) {
          const poisonColor = Math.random() > 0.5 ? 0x74ff5f : 0x8a4cd8;
          spawnVfxParticle(pos, new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.18 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4), poisonColor, 0.45, 0.95);
        }
        if (fx.rockets) spawnVfxParticle(pos, new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.65 + Math.random() * 0.45, (Math.random() - 0.5) * 0.25), 0xc7cdd6, 0.48, 1.15);
      }
      if (b.userData.effects?.lightning) {
        const pulse = 0.75 + Math.sin(elapsed * 38 + i) * 0.25;
        b.scale.setScalar(pulse);
      }
      b.userData.life -= dt;
      if (b.userData.life <= 0) {
        scene.remove(b);
        bullets.splice(i, 1);
      }
    }

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const hitFx = damageNumbers[i];
      hitFx.life -= dt;
      hitFx.sprite.position.y += hitFx.riseSpeed * dt;
      hitFx.sprite.material.opacity = Math.max(0, hitFx.life / hitFx.maxLife);
      if (hitFx.life <= 0) {
        scene.remove(hitFx.sprite);
        hitFx.sprite.material.map?.dispose();
        hitFx.sprite.material.dispose();
        damageNumbers.splice(i, 1);
      }
    }

    for (let i = vfxParticles.length - 1; i >= 0; i--) {
      const fx = vfxParticles[i];
      fx.life -= dt;
      fx.vel.multiplyScalar(fx.drag);
      fx.mesh.position.addScaledVector(fx.vel, dt);
      fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife);
      if (fx.life <= 0) {
        scene.remove(fx.mesh);
        fx.mesh.material.dispose();
        vfxParticles.splice(i, 1);
      }
    }

    for (let i = chainBeams.length - 1; i >= 0; i--) {
      const beam = chainBeams[i];
      beam.life -= dt;
      const alpha = Math.max(0, beam.life / beam.maxLife);
      beam.mesh.material.opacity = alpha;
      if (beam.ring) beam.mesh.scale.multiplyScalar(1 + dt * 3.3);
      if (beam.life <= 0) {
        scene.remove(beam.mesh);
        beam.mesh.material.dispose();
        chainBeams.splice(i, 1);
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const data = e.userData;
      if (data.dead) continue;
      const toPlayer = playerRigHolder.position.clone().sub(e.position);
      const dist = toPlayer.length();
      toPlayer.normalize();
      const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
      let moveDir = toPlayer.clone();
      let moveSpeed = data.speed;

      if (data.iceSlowTimer > 0) {
        data.iceSlowTimer -= dt;
        const slowPct = Math.min(0.72, runPowers.stacks.ice * 0.12);
        moveSpeed *= (1 - slowPct);
      }
      data.statusPulse += dt * 5.2;
      const body = data.anim?.body;
      if (body) {
        body.scale.setScalar(1);
        if (data.fireDot > 0) {
          body.scale.x *= 1.01;
          spawnVfxParticle(e.position.clone().setY(e.position.y + 0.95), new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.4 + Math.random() * 0.25, (Math.random() - 0.5) * 0.2), EFFECT_COLORS.fire, 0.25, 0.7);
        }
        if (data.poisonDot > 0) {
          spawnVfxParticle(e.position.clone().setY(e.position.y + 0.8), new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.16, (Math.random() - 0.5) * 0.15), 0x7dff69, 0.35, 0.65);
        }
        if (data.iceSlowTimer > 0) {
          const pulse = 0.94 + Math.sin(data.statusPulse) * 0.02;
          body.scale.set(pulse, pulse, pulse);
        }
        if (data.shockTimer > 0) {
          spawnVfxParticle(e.position.clone().setY(e.position.y + 1.15), new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.8), EFFECT_COLORS.lightning, 0.16, 0.55);
        }
      }

      if (data.fireDot > 0) {
        const burnTick = Math.min(data.fireDot, dt * data.fireDot);
        data.fireDot = Math.max(0, data.fireDot - dt * (0.55 + runPowers.stacks.fire * 0.07));
        if (burnTick > 0) damageEnemy(e, Math.max(1, Math.round(burnTick * 1.4)), true);
      }

      if (data.poisonDot > 0) {
        const poisonTick = Math.min(data.poisonDot, dt * data.poisonDot * 0.9);
        data.poisonDot = Math.max(0, data.poisonDot - dt * (0.45 + runPowers.stacks.poison * 0.05));
        if (poisonTick > 0) damageEnemy(e, Math.max(1, Math.round(poisonTick * 1.1)), true);
      }
      if (data.shockTimer > 0) {
        data.shockTimer -= dt;
      }

      if (data.type === 'shooter') {
        if (dist < data.keepDistance) {
          moveDir = toPlayer.clone().multiplyScalar(-0.65).addScaledVector(side, Math.sin(elapsed + i) * 0.7).normalize();
        } else if (dist < data.range) {
          moveDir = side.clone().multiplyScalar(Math.sin(elapsed * 0.8 + i) > 0 ? 1 : -1);
        }
        data.fireCooldown -= dt;
        if (dist < data.range && data.fireCooldown <= 0) {
          damagePlayer(data.damage * 0.18);
          data.fireCooldown = data.fireRate;
        }
      }

      if (data.chargeCooldown > 0) {
        data.chargeTimer -= dt;
        if (data.chargeTimer <= -data.chargeCooldown) data.chargeTimer = data.chargeDuration;
        if (data.chargeTimer > 0) moveSpeed = data.chargeSpeed;
      }

      e.position.addScaledVector(moveDir, moveSpeed * dt);
      resolveWorldCollision(e.position, data.radius * 0.88);
      const enemyHalfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.9;
      e.position.x = THREE.MathUtils.clamp(e.position.x, -enemyHalfArena, enemyHalfArena);
      e.position.z = THREE.MathUtils.clamp(e.position.z, -enemyHalfArena, enemyHalfArena);
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
        damagePlayer(data.damage * dt);
      }

      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        const horizontalDist = Math.hypot(e.position.x - bullet.position.x, e.position.z - bullet.position.z);
        const yCenter = e.position.y + data.hitboxCenterOffsetY;
        const withinHeight = Math.abs(bullet.position.y - yCenter) <= data.hitboxHalfHeight;
        if (horizontalDist <= data.hitboxRadius && withinHeight) {
          const damage = bullet.userData.damage;
          damageEnemy(e, damage);
          applyProjectilePower(e, bullet);
          scene.remove(bullet);
          bullets.splice(j, 1);
          if (e.userData.dead) break;
        }
      }
    }

    for (let i = pickupNotices.length - 1; i >= 0; i--) {
      pickupNotices[i].life -= dt;
      if (pickupNotices[i].life <= 0) pickupNotices.splice(i, 1);
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

  const camOffset = new THREE.Vector3(0, gameplayConfig.camera.height, gameplayConfig.camera.forwardOffset);
  camera.position.copy(playerRigHolder.position).add(camOffset);
  camera.lookAt(playerRigHolder.position.x, playerRigHolder.position.y + gameplayConfig.camera.lookAtHeight, playerRigHolder.position.z);

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
