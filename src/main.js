import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const CHARACTER_STORAGE_KEY = 'skyBlaster.selectedCharacterId';
const PROFILE_STORAGE_KEY = 'skyBlaster.profile.v2';
const WORLDS_COUNT = 4;
const LEVELS_PER_WORLD = 5;
const WAVES_PER_LEVEL = 10;

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
  quickWorldsBtn: document.getElementById('quickWorldsBtn'),
  startSelectedLevelBtn: document.getElementById('startSelectedLevelBtn'),
  restartBtn: document.getElementById('restartBtn'),
  menuBtn: document.getElementById('menuBtn'),
  nextLevelBtn: document.getElementById('nextLevelBtn'),
  wave: document.getElementById('wave'),
  score: document.getElementById('score'),
  hpBar: document.getElementById('hpBar'),
  shieldValue: document.getElementById('shieldValue'),
  powerSummary: document.getElementById('powerSummary'),
  pickupFeed: document.getElementById('pickupFeed'),
  missionLabel: document.getElementById('missionLabel'),
  creditsValue: document.getElementById('creditsValue'),
  menuCredits: document.getElementById('menuCredits'),
  menuHighestWave: document.getElementById('menuHighestWave'),
  selectedMissionLabel: document.getElementById('selectedMissionLabel'),
  selectedMissionStatus: document.getElementById('selectedMissionStatus'),
  selectedCharacterLabel: document.getElementById('selectedCharacterLabel'),
  unlockedSummary: document.getElementById('unlockedSummary'),
  worldGrid: document.getElementById('worldGrid'),
  levelGrid: document.getElementById('levelGrid'),
  upgradeGroups: document.getElementById('upgradeGroups'),
  upgradeCredits: document.getElementById('upgradeCredits'),
  statsGrid: document.getElementById('statsGrid'),
  menuTabs: Array.from(document.querySelectorAll('.menu-tab')),
  menuScreens: Array.from(document.querySelectorAll('.menu-screen')),
  finalWave: document.getElementById('finalWave'),
  finalScore: document.getElementById('finalScore'),
  finalCredits: document.getElementById('finalCredits'),
  resultEyebrow: document.getElementById('resultEyebrow'),
  resultTitle: document.getElementById('resultTitle'),
  resultSummary: document.getElementById('resultSummary'),
  moveZone: document.getElementById('moveZone'),
  moveStick: document.getElementById('moveStick'),
  moveKnob: document.getElementById('moveKnob'),
  characterGrid: document.getElementById('characterGrid'),
};

const UPGRADE_DEFS = [
  { id: 'baseDamage', group: 'Pilot Upgrades', label: 'Base Damage', description: 'Erhöht den Schaden jeder Kugel.', baseCost: 60, costStep: 35, maxLevel: 12, format: (lvl) => `${(1 + lvl * 0.22).toFixed(2)}x` },
  { id: 'attackSpeed', group: 'Pilot Upgrades', label: 'Attack Speed', description: 'Senkt das Feuerintervall deines Blasters.', baseCost: 70, costStep: 40, maxLevel: 10, format: (lvl) => `${Math.max(0.07, 0.18 * Math.pow(0.94, lvl)).toFixed(2)}s` },
  { id: 'maxHealth', group: 'Pilot Upgrades', label: 'Max Health', description: 'Mehr Lebenspunkte pro Run.', baseCost: 80, costStep: 45, maxLevel: 12, format: (lvl) => `${100 + lvl * 14} HP` },
  { id: 'movementSpeed', group: 'Pilot Upgrades', label: 'Movement Speed', description: 'Schnelleres Traversieren der Arena.', baseCost: 55, costStep: 30, maxLevel: 12, format: (lvl) => `${(1 + lvl * 0.05).toFixed(2)}x` },
  { id: 'burnDamage', group: 'Power-up Upgrades', label: 'Burn Damage', description: 'Verstärkt Feuer-DOT.', baseCost: 65, costStep: 36, maxLevel: 10, format: (lvl) => `${(1 + lvl * 0.18).toFixed(2)}x` },
  { id: 'poisonDamage', group: 'Power-up Upgrades', label: 'Poison Damage', description: 'Verstärkt Gift-DOT.', baseCost: 65, costStep: 36, maxLevel: 10, format: (lvl) => `${(1 + lvl * 0.18).toFixed(2)}x` },
  { id: 'slowDuration', group: 'Power-up Upgrades', label: 'Slow Duration', description: 'Verlängert die Wirkzeit von Ice.', baseCost: 60, costStep: 34, maxLevel: 10, format: (lvl) => `${(1.2 + lvl * 0.16).toFixed(1)}s` },
  { id: 'lightningRange', group: 'Power-up Upgrades', label: 'Lightning Range', description: 'Längere Kettenreichweite für Blitz-Treffer.', baseCost: 72, costStep: 42, maxLevel: 10, format: (lvl) => `${(6.5 + lvl * 0.45).toFixed(1)}m` },
  { id: 'rocketRadius', group: 'Power-up Upgrades', label: 'Rocket Radius', description: 'Größere Explosionsradien.', baseCost: 72, costStep: 42, maxLevel: 10, format: (lvl) => `${(1.8 + lvl * 0.18).toFixed(1)}m` },
  { id: 'shieldCapacity', group: 'Power-up Upgrades', label: 'Shield Capacity', description: 'Shields absorbieren mehr Schaden.', baseCost: 68, costStep: 38, maxLevel: 10, format: (lvl) => `${26 + lvl * 6} HP` },
];

const STAT_DEFS = [
  { id: 'totalKills', label: 'Total kills', format: (v) => String(v) },
  { id: 'totalRuns', label: 'Total runs', format: (v) => String(v) },
  { id: 'highestWaveReached', label: 'Highest wave reached', format: (v) => String(v) },
  { id: 'damageDealt', label: 'Damage dealt', format: (v) => String(Math.round(v)) },
  { id: 'timePlayed', label: 'Time played', format: (v) => formatDuration(v) },
  { id: 'powerUpsCollected', label: 'Power-ups collected', format: (v) => String(v) },
  { id: 'bossesDefeated', label: 'Bosses defeated', format: (v) => String(v) },
];

function createDefaultProfile() {
  const unlockedLevels = {};
  for (let world = 1; world <= WORLDS_COUNT; world++) unlockedLevels[world] = world === 1 ? 1 : 0;
  return {
    version: 2,
    credits: 0,
    upgrades: Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, 0])),
    stats: {
      totalKills: 0,
      totalRuns: 0,
      highestWaveReached: 1,
      damageDealt: 0,
      timePlayed: 0,
      powerUpsCollected: 0,
      bossesDefeated: 0,
    },
    progression: {
      selectedWorld: 1,
      selectedLevel: 1,
      unlockedLevels,
      completedLevels: {},
    },
  };
}

function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null');
    const base = createDefaultProfile();
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base,
      ...raw,
      upgrades: { ...base.upgrades, ...(raw.upgrades || {}) },
      stats: { ...base.stats, ...(raw.stats || {}) },
      progression: {
        ...base.progression,
        ...(raw.progression || {}),
        unlockedLevels: { ...base.progression.unlockedLevels, ...((raw.progression || {}).unlockedLevels || {}) },
        completedLevels: { ...base.progression.completedLevels, ...((raw.progression || {}).completedLevels || {}) },
      },
    };
  } catch {
    return createDefaultProfile();
  }
}

function saveProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const profile = loadProfile();
let activeMenuScreen = 'home';

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
  maxProjectileCount: 4096,
  maxVisualProjectilesPerShot: 10,
  maxVisualProjectilesPerShotLowQuality: 6,
  maxBulletsSpawnPerFrame: 14,
  maxActiveBullets: 180,
  maxActiveBulletsSoft: 132,
  maxChainBeams: 80,
  maxDamageNumbers: 42,
  maxEnemyStatusEffects: 90,
  maxLightningChainsPerHit: 6,
  maxLightningChainsPerFrame: 20,
  maxVfxSpawnPerFrame: 96,
  maxDamageNumbersPerFrame: 10,
  maxDotTicksPerFrame: 24,
  maxSplashDamageEventsPerFrame: 18,
  maxHitResolutionsPerFrame: 72,
  maxStatusVfxPerFrame: 28,
  maxRocketSplashTargets: 10,
  maxRocketSplashSearchCells: 16,
  maxBulletLifetime: 0.95,
  bulletSoftRange: gameplayConfig.arena.spawnMaxDistance + 14,
  bulletHardRange: gameplayConfig.arena.spawnMaxDistance + 24,
  broadphaseCellSize: 7,
  broadphaseMaxCellsPerQuery: 16,
};

const frameBudgets = {
  lightningChains: 0,
  vfxSpawns: 0,
  damageNumbers: 0,
  bulletsSpawned: 0,
  dotTicks: 0,
  splashDamageEvents: 0,
  hitResolutions: 0,
  statusVfx: 0,
};

const perfFlags = new URLSearchParams(window.location.search);

const performanceState = {
  frameMs: 16.7,
  fps: 60,
  qualityLevel: 0,
  debugEnabled: perfFlags.has('debugPerf'),
  activeEnemyEffects: 0,
  enemyEffectSoftCap: SAFETY_LIMITS.maxEnemyStatusEffects,
};

const tempVec3A = new THREE.Vector3();
const tempVec3B = new THREE.Vector3();
const tempVec3C = new THREE.Vector3();
const tempVec2A = new THREE.Vector2();
const tempQuatA = new THREE.Quaternion();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const enemySpatialGrid = new Map();
const bulletAssets = {
  standardGeometry: new THREE.SphereGeometry(0.18, 10, 10),
  rocketGeometry: new THREE.ConeGeometry(0.18, 0.52, 8),
  materialCache: new Map(),
};

const perfDebugEl = document.createElement('div');
perfDebugEl.id = 'perfDebug';
perfDebugEl.style.cssText = 'position:fixed;top:12px;right:12px;z-index:40;min-width:220px;padding:10px 12px;border:1px solid rgba(160,220,255,0.28);border-radius:12px;background:rgba(6,16,28,0.82);color:#dff6ff;font:12px/1.45 Inter,Arial,sans-serif;white-space:pre-line;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,0.28)';
perfDebugEl.classList.toggle('hidden', !performanceState.debugEnabled);
document.body.appendChild(perfDebugEl);

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

function getCharacterDef(characterId = selectedCharacterId) {
  return CHARACTER_DEFS.find((character) => character.id === characterId) || CHARACTER_DEFS[0];
}

function getSelectedMission() {
  const { selectedWorld, selectedLevel } = profile.progression;
  return { world: selectedWorld, level: selectedLevel };
}

function getUnlockedLevelCount() {
  return Object.values(profile.progression.unlockedLevels).reduce((sum, count) => sum + Math.max(0, count), 0);
}

function isLevelUnlocked(world, level) {
  return level <= (profile.progression.unlockedLevels[world] || 0);
}

function selectMission(world, level) {
  if (!isLevelUnlocked(world, level)) return;
  profile.progression.selectedWorld = world;
  profile.progression.selectedLevel = level;
  saveProfile();
  renderMenu();
}

function setPlayerCharacter(characterId) {
  selectedCharacterId = resolveCharacterId(characterId);
  saveSelectedCharacterId(selectedCharacterId);
  if (playerRig) {
    playerRigHolder.remove(playerRig.root);
  }
  const def = getCharacterDef(selectedCharacterId);
  playerRig = createCharacterRig(def);
  playerRigHolder.add(playerRig.root);
  if (ui.selectedCharacterLabel) ui.selectedCharacterLabel.textContent = def.name;
}

function getUpgradeLevel(id) {
  return profile.upgrades[id] || 0;
}

function getUpgradeCost(id) {
  const def = UPGRADE_DEFS.find((entry) => entry.id === id);
  const level = getUpgradeLevel(id);
  if (!def || level >= def.maxLevel) return null;
  return def.baseCost + level * def.costStep;
}

function getPlayerMaxHp() {
  return 100 + getUpgradeLevel('maxHealth') * 14;
}

function getBaseDamage() {
  return 1 + getUpgradeLevel('baseDamage') * 0.22;
}

function getAttackCooldown() {
  return Math.max(0.07, 0.18 * Math.pow(0.94, getUpgradeLevel('attackSpeed')));
}

function getBaseMoveSpeedMultiplier() {
  return 1 + getUpgradeLevel('movementSpeed') * 0.05;
}

function getShieldPickupCapacity() {
  return 26 + getUpgradeLevel('shieldCapacity') * 6;
}

function getDifficultyIndex(world = state.worldIndex, level = state.levelIndex, waveInLevel = state.waveInLevel) {
  return ((world - 1) * LEVELS_PER_WORLD + (level - 1)) * WAVES_PER_LEVEL + waveInLevel;
}

function getMissionLabel(world = state.worldIndex, level = state.levelIndex) {
  return `W${world} · L${level}`;
}

function getLevelKey(world, level) {
  return `${world}-${level}`;
}

function unlockNextMission(world, level) {
  profile.progression.completedLevels[getLevelKey(world, level)] = true;
  if (level < LEVELS_PER_WORLD) {
    profile.progression.unlockedLevels[world] = Math.max(profile.progression.unlockedLevels[world] || 0, level + 1);
  } else if (world < WORLDS_COUNT) {
    profile.progression.unlockedLevels[world + 1] = Math.max(profile.progression.unlockedLevels[world + 1] || 0, 1);
  }
  saveProfile();
}

function getNextMission(world, level) {
  if (level < LEVELS_PER_WORLD) return { world, level: level + 1 };
  if (world < WORLDS_COUNT) return { world: world + 1, level: 1 };
  return null;
}

function addCredits(amount) {
  profile.credits += amount;
}

function trackStat(id, amount) {
  profile.stats[id] = (profile.stats[id] || 0) + amount;
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
  hp: getPlayerMaxHp(),
  score: 0,
  wave: 1,
  waveInLevel: 1,
  worldIndex: profile.progression.selectedWorld,
  levelIndex: profile.progression.selectedLevel,
  spawnLeft: 0,
  fireCooldown: 0,
  wavePause: 1,
  yaw: 0,
  totalKills: 0,
  waveKills: 0,
  pickupSpawnTimer: 5,
  pickupSpawnInterval: 10,
  moveSpeedMultiplier: getBaseMoveSpeedMultiplier(),
  projectileCount: 1,
  runCredits: 0,
  damageDealt: 0,
  elapsedRunTime: 0,
  savedRunTime: 0,
  lastProfileSaveAt: 0,
  pendingResult: null,
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
  chainGeometry: new THREE.CylinderGeometry(0.07, 0.07, 1, 6),
};

const EFFECT_COLORS = {
  fire: 0xff8a4f,
  ice: 0x97e8ff,
  lightning: 0xb3b7ff,
  poison: 0x88ff73,
  rockets: 0xffb067,
};

function getAdaptiveLimit(base, lowQualityFactor = 0.65, criticalFactor = 0.42) {
  if (performanceState.qualityLevel >= 3) return Math.max(1, Math.round(base * criticalFactor));
  if (performanceState.qualityLevel >= 2) return Math.max(1, Math.round(base * lowQualityFactor));
  if (performanceState.qualityLevel >= 1) return Math.max(1, Math.round(base * 0.82));
  return base;
}

function updatePerformanceGuard(dt) {
  const frameMs = dt * 1000;
  performanceState.frameMs = THREE.MathUtils.lerp(performanceState.frameMs, frameMs, 0.12);
  performanceState.fps = 1000 / Math.max(1, performanceState.frameMs);

  const pressureScore =
    (bullets.length / Math.max(1, SAFETY_LIMITS.maxActiveBulletsSoft)) +
    (vfxParticles.length / Math.max(1, VFX.maxParticles)) * 0.55 +
    (chainBeams.length / Math.max(1, SAFETY_LIMITS.maxChainBeams)) * 0.45;

  if (performanceState.frameMs > 37 || pressureScore > 2.1) performanceState.qualityLevel = 3;
  else if (performanceState.frameMs > 29 || pressureScore > 1.55) performanceState.qualityLevel = 2;
  else if (performanceState.frameMs > 23 || pressureScore > 1.05) performanceState.qualityLevel = 1;
  else performanceState.qualityLevel = 0;

  performanceState.enemyEffectSoftCap = getAdaptiveLimit(SAFETY_LIMITS.maxEnemyStatusEffects, 0.72, 0.45);
}

function updatePerformanceDebug() {
  if (!performanceState.debugEnabled) return;
  perfDebugEl.textContent = [
    `FPS ${performanceState.fps.toFixed(1)} · ${performanceState.frameMs.toFixed(1)} ms`,
    `Quality ${performanceState.qualityLevel}`,
    `Bullets ${bullets.length}/${getAdaptiveLimit(SAFETY_LIMITS.maxActiveBullets)}`,
    `Enemies ${enemies.length}`,
    `VFX ${vfxParticles.length}/${getAdaptiveLimit(VFX.maxParticles)}`,
    `Damage # ${damageNumbers.length}/${getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbers)}`,
    `Chain beams ${chainBeams.length}/${getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams)}`,
    `Enemy FX ${performanceState.activeEnemyEffects}/${performanceState.enemyEffectSoftCap}`,
  ].join('\n');
}

function getBulletMaterial(effects) {
  const key = [effects.fire ? 1 : 0, effects.ice ? 1 : 0, effects.poison ? 1 : 0, effects.lightning ? 1 : 0, effects.rockets ? 1 : 0].join('');
  if (bulletAssets.materialCache.has(key)) return bulletAssets.materialCache.get(key);
  const bulletColor = new THREE.Color(0x9df9ff);
  if (effects.fire) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.fire), 0.5);
  if (effects.ice) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.ice), 0.42);
  if (effects.poison) bulletColor.lerp(new THREE.Color(0x86f46a), 0.38);
  if (effects.lightning) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.lightning), 0.35);
  if (effects.rockets) bulletColor.lerp(new THREE.Color(EFFECT_COLORS.rockets), 0.45);
  const material = new THREE.MeshStandardMaterial({
    color: bulletColor,
    emissive: bulletColor,
    emissiveIntensity: effects.rockets ? 0.9 : 0.55,
    metalness: effects.rockets ? 0.35 : 0.1,
    roughness: 0.35,
  });
  bulletAssets.materialCache.set(key, material);
  return material;
}

function getGridCellCoord(value) {
  return Math.floor(value / SAFETY_LIMITS.broadphaseCellSize);
}

function getGridKey(x, z) {
  return `${x}:${z}`;
}

function rebuildEnemySpatialGrid() {
  enemySpatialGrid.clear();
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.userData.dead) continue;
    const cellX = getGridCellCoord(enemy.position.x);
    const cellZ = getGridCellCoord(enemy.position.z);
    const key = getGridKey(cellX, cellZ);
    const bucket = enemySpatialGrid.get(key);
    if (bucket) bucket.push(enemy);
    else enemySpatialGrid.set(key, [enemy]);
    enemy.userData.gridCellX = cellX;
    enemy.userData.gridCellZ = cellZ;
  }
}

function forEachEnemyNearPosition(position, radius, callback, maxCells = SAFETY_LIMITS.broadphaseMaxCellsPerQuery) {
  const minX = getGridCellCoord(position.x - radius);
  const maxX = getGridCellCoord(position.x + radius);
  const minZ = getGridCellCoord(position.z - radius);
  const maxZ = getGridCellCoord(position.z + radius);
  let visitedCells = 0;
  for (let cellX = minX; cellX <= maxX; cellX++) {
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      visitedCells += 1;
      if (visitedCells > maxCells) return;
      const bucket = enemySpatialGrid.get(getGridKey(cellX, cellZ));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        if (callback(bucket[i]) === false) return;
      }
    }
  }
}

function removeBulletAtIndex(index) {
  const bullet = bullets[index];
  if (!bullet) return;
  scene.remove(bullet);
  bullets.splice(index, 1);
}

function trimBulletsToLimit(limit) {
  while (bullets.length > limit) removeBulletAtIndex(0);
}

function canSpawnStatusEffects(enemy) {
  if (performanceState.activeEnemyEffects < performanceState.enemyEffectSoftCap) return true;
  return enemy.userData.fireDot > 0 || enemy.userData.poisonDot > 0 || enemy.userData.iceSlowTimer > 0 || enemy.userData.shockTimer > 0;
}

function maybeSpawnStatusVfx(position, velocity, color, life, scale) {
  if (frameBudgets.statusVfx >= getAdaptiveLimit(SAFETY_LIMITS.maxStatusVfxPerFrame, 0.55, 0.28)) return;
  frameBudgets.statusVfx += 1;
  spawnVfxParticle(position, velocity, color, life, scale);
}

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
  if (frameBudgets.vfxSpawns >= getAdaptiveLimit(SAFETY_LIMITS.maxVfxSpawnPerFrame, 0.58, 0.34)) return;
  frameBudgets.vfxSpawns += 1;
  const maxParticles = getAdaptiveLimit(VFX.maxParticles, 0.62, 0.36);
  if (vfxParticles.length >= maxParticles) {
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
  vfxParticles.push({
    mesh,
    vel: velocity.clone(),
    life,
    maxLife: life,
    drag: 0.9 + Math.random() * 0.08,
  });
}

function spawnBurst(position, color, count, speed, life = 0.3, scale = 1) {
  const burstCount = Math.min(count, getAdaptiveLimit(count, 0.6, 0.34));
  for (let i = 0; i < burstCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const up = (Math.random() - 0.5) * 0.5;
    tempVec3B.set(Math.cos(angle), up, Math.sin(angle)).multiplyScalar(speed * (0.35 + Math.random() * 0.85));
    spawnVfxParticle(position, tempVec3B, color, life * (0.8 + Math.random() * 0.5), scale * (0.65 + Math.random() * 0.65));
  }
}

function spawnImpactEffects(position, effects) {
  if (effects.fire) spawnBurst(position, EFFECT_COLORS.fire, 7, 4.1, 0.42, 1);
  if (effects.ice) spawnBurst(position, EFFECT_COLORS.ice, 6, 3.5, 0.4, 0.9);
  if (effects.poison) spawnBurst(position, 0x94ff73, 6, 2.7, 0.44, 1);
  if (effects.lightning) spawnBurst(position, EFFECT_COLORS.lightning, 5, 4.6, 0.26, 0.82);
  if (effects.rockets) spawnBurst(position, EFFECT_COLORS.rockets, 10, 5.3, 0.45, 1.08);
}

function createChainBeam(from, to) {
  const maxChainsPerFrame = getAdaptiveLimit(SAFETY_LIMITS.maxLightningChainsPerFrame, 0.65, 0.4);
  if (frameBudgets.lightningChains >= maxChainsPerFrame) return false;
  frameBudgets.lightningChains += 1;
  const maxChainBeams = getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams, 0.68, 0.38);
  if (chainBeams.length >= maxChainBeams) {
    const oldest = chainBeams.shift();
    if (oldest) {
      scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
  }
  const beam = new THREE.Mesh(
    VFX.chainGeometry,
    new THREE.MeshBasicMaterial({ color: 0xc7ccff, transparent: true, opacity: 0.95, depthWrite: false })
  );
  beam.position.copy(from).lerp(to, 0.5);
  beam.position.y += 1.2;
  tempVec3A.subVectors(to, from);
  const len = Math.max(0.5, tempVec3A.length());
  beam.scale.set(1, len, 1);
  tempQuatA.setFromUnitVectors(WORLD_UP, tempVec3A.normalize());
  beam.quaternion.copy(tempQuatA);
  scene.add(beam);
  chainBeams.push({ mesh: beam, life: 0.12, maxLife: 0.12 });
  return true;
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
    role: cfg.role,
    hp: Math.ceil((cfg.hp + waveScale * (cfg.role === 'boss' ? 1.2 : 0.45)) * (1 + state.worldIndex * 0.04 + state.levelIndex * 0.03)),
    speed:
      (cfg.speed * gameplayConfig.enemies.baseSpeedMultiplier[type] +
        waveScale *
          (cfg.role === 'boss'
            ? gameplayConfig.enemies.waveSpeedScale.boss
            : gameplayConfig.enemies.waveSpeedScale.field)) *
      (1 - gameplayConfig.enemies.randomVariance + Math.random() * gameplayConfig.enemies.randomVariance * 2),
    damage: cfg.damage * (1 + state.worldIndex * 0.05 + state.levelIndex * 0.035 + state.waveInLevel * 0.02),
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
    fireTickTimer: 0.12 + Math.random() * 0.08,
    poisonDot: 0,
    poisonTickTimer: 0.14 + Math.random() * 0.08,
    iceSlowTimer: 0,
    shockTimer: 0,
    statusPulse: Math.random() * Math.PI * 2,
  };
  scene.add(enemy);
  enemies.push(enemy);
}

function spawnDamageNumber(enemy, amount) {
  const maxPerFrame = getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbersPerFrame, 0.6, 0.25);
  const maxTotal = getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbers, 0.62, 0.34);
  if (frameBudgets.damageNumbers >= maxPerFrame) return;
  if (performanceState.qualityLevel >= 2 && Math.random() > 0.45) return;
  if (damageNumbers.length >= maxTotal) {
    const oldest = damageNumbers.shift();
    if (oldest) {
      scene.remove(oldest.sprite);
      oldest.sprite.material.map?.dispose();
      oldest.sprite.material.dispose();
    }
  }
  frameBudgets.damageNumbers += 1;
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
  profile.stats.powerUpsCollected += 1;
  if (type === 'health') {
    state.hp = Math.min(getPlayerMaxHp(), state.hp + 20);
    showPickupNotice(type);
    return;
  }

  runPowers.stacks[type] = (runPowers.stacks[type] || 0) + 1;
  if (type === 'movementSpeed') {
    state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + runPowers.stacks.movementSpeed * 0.05;
  } else if (type === 'doubler') {
    state.projectileCount = getSafeProjectileCountFromDoublers(runPowers.stacks.doubler);
  } else if (type === 'shield') {
    runPowers.shieldHp += getShieldPickupCapacity();
  }
  showPickupNotice(type);
}

function sanitizeProjectileCount(value) {
  if (Number.isNaN(value) || value <= 0) return RUN_BASE.projectileCount;
  if (!Number.isFinite(value)) return SAFETY_LIMITS.maxProjectileCount;
  return Math.min(SAFETY_LIMITS.maxProjectileCount, Math.floor(value));
}

function getSafeProjectileCountFromDoublers(stacks) {
  if (!Number.isFinite(stacks) || stacks <= 0) return RUN_BASE.projectileCount;
  const clampedStacks = Math.max(0, Math.floor(stacks));
  const maxDoublers = Math.floor(Math.log2(SAFETY_LIMITS.maxProjectileCount));
  if (clampedStacks >= maxDoublers) return SAFETY_LIMITS.maxProjectileCount;
  return sanitizeProjectileCount(RUN_BASE.projectileCount * (2 ** clampedStacks));
}

function getVolleyProfile(projectileCount = state.projectileCount) {
  const requestedCount = sanitizeProjectileCount(projectileCount);
  const perShotCap = performanceState.qualityLevel >= 2 ? SAFETY_LIMITS.maxVisualProjectilesPerShotLowQuality : SAFETY_LIMITS.maxVisualProjectilesPerShot;
  const visualCount = Math.min(requestedCount, perShotCap);
  const volleyWeight = requestedCount / Math.max(1, visualCount);
  return {
    requestedCount,
    visualCount,
    volleyWeight,
    spread: Math.min(0.75, 0.11 * Math.log2(requestedCount)),
  };
}

function resetRunPowerUps() {
  for (const key of Object.keys(runPowers.stacks)) runPowers.stacks[key] = 0;
  runPowers.shieldHp = 0;
  state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier();
  state.projectileCount = RUN_BASE.projectileCount;
}

function damagePlayer(amount) {
  if (runPowers.shieldHp > 0) {
    const absorbed = Math.min(runPowers.shieldHp, amount);
    runPowers.shieldHp -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) state.hp -= amount;
  if (state.hp <= 0) finishRun(false);
}

function updateHUD() {
  ui.wave.textContent = `${state.waveInLevel} / ${WAVES_PER_LEVEL}`;
  ui.score.textContent = String(state.score);
  ui.hpBar.style.width = `${THREE.MathUtils.clamp((Math.max(0, state.hp) / getPlayerMaxHp()) * 100, 0, 100)}%`;
  ui.shieldValue.textContent = `${Math.max(0, Math.round(runPowers.shieldHp))}`;
  ui.powerSummary.textContent = `Power-ups: ${getPowerSummaryText()}`;
  ui.missionLabel.textContent = getMissionLabel();
  ui.creditsValue.textContent = String(profile.credits + state.runCredits);

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

function getSpawnBudget() {
  return Math.round(5 + state.waveInLevel * 1.5 + state.levelIndex * 1.2 + state.worldIndex * 1.8);
}

function spawnWave() {
  state.wave = getDifficultyIndex();
  state.spawnLeft = getSpawnBudget();
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
  profile.stats.highestWaveReached = Math.max(profile.stats.highestWaveReached, state.wave);
}

function damageEnemy(enemy, amount, options = {}) {
  if (enemy.userData.dead) return;
  const { allowLightningChain = true, isSecondaryEffect = false } = options;
  enemy.userData.hp -= amount;
  state.damageDealt += amount;
  profile.stats.damageDealt += amount;
  spawnDamageNumber(enemy, amount);

  if (runPowers.stacks.lightning > 0) {
    enemy.userData.shockTimer = Math.max(enemy.userData.shockTimer, 0.18 + runPowers.stacks.lightning * 0.04);
    if (frameBudgets.statusVfx < getAdaptiveLimit(SAFETY_LIMITS.maxStatusVfxPerFrame, 0.55, 0.28)) {
      tempVec3A.copy(enemy.position).setY(enemy.position.y + 1.1);
      spawnBurst(tempVec3A, EFFECT_COLORS.lightning, isSecondaryEffect ? 1 : 3, 2.2, 0.2, 0.7);
    }
  }

  if (enemy.userData.hp <= 0) {
    const idx = enemies.indexOf(enemy);
    if (idx >= 0) destroyEnemy(enemy, idx);
    return;
  }

  if (!allowLightningChain || runPowers.stacks.lightning <= 0) return;

  let chains = Math.min(runPowers.stacks.lightning, getAdaptiveLimit(SAFETY_LIMITS.maxLightningChainsPerHit, 0.66, 0.34));
  const lightningRange = 6.5 + getUpgradeLevel('lightningRange') * 0.45;
  let source = enemy;
  const visited = new Set([enemy]);

  while (chains > 0) {
    if (frameBudgets.lightningChains >= getAdaptiveLimit(SAFETY_LIMITS.maxLightningChainsPerFrame, 0.65, 0.4)) break;
    let nearest = null;
    let nearestDistSq = lightningRange * lightningRange;

    forEachEnemyNearPosition(source.position, lightningRange, (candidate) => {
      if (candidate.userData.dead || visited.has(candidate)) return;
      const dx = source.position.x - candidate.position.x;
      const dz = source.position.z - candidate.position.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq;
        nearest = candidate;
      }
    });

    if (!nearest) break;
    visited.add(nearest);
    if (!createChainBeam(source.position, nearest.position)) break;
    const chainDamage = Math.max(1, Math.round(0.7 + runPowers.stacks.lightning * 0.8));
    damageEnemy(nearest, chainDamage, { allowLightningChain: false, isSecondaryEffect: true });
    source = nearest;
    chains -= 1;
  }
}

function applyProjectilePower(enemy, bullet) {
  const hitPos = tempVec3A.copy(bullet.position);
  const volleyWeight = Math.max(1, bullet.userData.volleyWeight || 1);
  const weightBoost = 1 + Math.log2(volleyWeight) * 0.18;
  spawnImpactEffects(hitPos, bullet.userData.effects || getProjectileEffects());

  if (canSpawnStatusEffects(enemy) && runPowers.stacks.fire > 0) {
    enemy.userData.fireDot = Math.min(14, enemy.userData.fireDot + runPowers.stacks.fire * 0.55 * (1 + getUpgradeLevel('burnDamage') * 0.18) * Math.min(3.2, volleyWeight));
    maybeSpawnStatusVfx(hitPos, tempVec3B.set((Math.random() - 0.5) * 0.22, 0.35, (Math.random() - 0.5) * 0.22), EFFECT_COLORS.fire, 0.22, 0.72);
  }
  if (canSpawnStatusEffects(enemy) && runPowers.stacks.poison > 0) {
    enemy.userData.poisonDot = Math.min(16, enemy.userData.poisonDot + runPowers.stacks.poison * 0.7 * (1 + getUpgradeLevel('poisonDamage') * 0.18) * Math.min(3.2, volleyWeight));
    maybeSpawnStatusVfx(hitPos, tempVec3B.set((Math.random() - 0.5) * 0.14, 0.16, (Math.random() - 0.5) * 0.14), 0x7dff74, 0.28, 0.88);
  }
  if (canSpawnStatusEffects(enemy) && runPowers.stacks.ice > 0) {
    enemy.userData.iceSlowTimer = Math.max(enemy.userData.iceSlowTimer, (1.2 + getUpgradeLevel('slowDuration') * 0.16 + runPowers.stacks.ice * 0.2) * Math.min(2.1, weightBoost));
    maybeSpawnStatusVfx(hitPos, tempVec3B.set((Math.random() - 0.5) * 0.15, 0.18, (Math.random() - 0.5) * 0.15), EFFECT_COLORS.ice, 0.22, 0.72);
  }

  if (runPowers.stacks.rockets <= 0) return;
  const splashBudget = getAdaptiveLimit(SAFETY_LIMITS.maxSplashDamageEventsPerFrame, 0.55, 0.34);
  if (frameBudgets.splashDamageEvents >= splashBudget) return;

  const radius = (1.8 + getUpgradeLevel('rocketRadius') * 0.18 + runPowers.stacks.rockets * 0.55) * Math.min(2.1, weightBoost);
  const splash = Math.max(1, Math.round((0.45 + runPowers.stacks.rockets * 0.7) * Math.min(3, volleyWeight)));
  const maxChainBeams = getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams, 0.68, 0.38);
  if (chainBeams.length >= maxChainBeams) {
    const oldest = chainBeams.shift();
    if (oldest) {
      scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
  }
  const blastRing = new THREE.Mesh(
    VFX.ringGeometry,
    new THREE.MeshBasicMaterial({ color: 0xff9d5f, transparent: true, opacity: 0.75, depthWrite: false })
  );
  blastRing.position.copy(hitPos).setY(0.25);
  blastRing.rotation.x = Math.PI / 2;
  blastRing.scale.setScalar(Math.max(0.8, radius * 0.45));
  scene.add(blastRing);
  chainBeams.push({ mesh: blastRing, life: 0.18, maxLife: 0.18, ring: true });

  let splashTargets = 0;
  forEachEnemyNearPosition(hitPos, radius, (other) => {
    if (other.userData.dead) return;
    if (frameBudgets.splashDamageEvents >= splashBudget) return false;
    const dx = other.position.x - hitPos.x;
    const dz = other.position.z - hitPos.z;
    if ((dx * dx) + (dz * dz) > radius * radius) return;
    frameBudgets.splashDamageEvents += 1;
    splashTargets += 1;
    damageEnemy(other, splash, { allowLightningChain: false, isSecondaryEffect: true, hitPosition: hitPos });
    if (splashTargets >= getAdaptiveLimit(SAFETY_LIMITS.maxRocketSplashTargets, 0.7, 0.45)) return false;
  }, SAFETY_LIMITS.maxRocketSplashSearchCells);
}

function shoot() {
  if (state.fireCooldown > 0) return;
  state.fireCooldown = getAttackCooldown();
  const volley = getVolleyProfile(state.projectileCount);
  const baseYaw = state.yaw;
  const fx = getProjectileEffects();
  const perFrameSpawnCap = getAdaptiveLimit(SAFETY_LIMITS.maxBulletsSpawnPerFrame, 0.7, 0.4);
  const remainingFrameBudget = Math.max(0, perFrameSpawnCap - frameBudgets.bulletsSpawned);
  const maxActiveBullets = getAdaptiveLimit(SAFETY_LIMITS.maxActiveBullets, 0.68, 0.42);
  const softActiveBullets = getAdaptiveLimit(SAFETY_LIMITS.maxActiveBulletsSoft, 0.72, 0.48);
  const projectedSoftOverflow = Math.max(0, bullets.length - softActiveBullets);
  const allowedVisualCount = Math.min(volley.visualCount, remainingFrameBudget, maxActiveBullets - bullets.length, Math.max(1, volley.visualCount - projectedSoftOverflow));

  if (allowedVisualCount <= 0) return;
  if (bullets.length >= softActiveBullets) trimBulletsToLimit(softActiveBullets - 1);

  const yawSpread = Math.min(volley.spread, performanceState.qualityLevel >= 2 ? volley.spread * 0.9 : volley.spread);
  const geometry = fx.rockets ? bulletAssets.rocketGeometry : bulletAssets.standardGeometry;
  const material = getBulletMaterial(fx);
  const volleyWeight = volley.requestedCount / allowedVisualCount;

  for (let shot = 0; shot < allowedVisualCount; shot++) {
    const t = allowedVisualCount === 1 ? 0.5 : shot / Math.max(1, allowedVisualCount - 1);
    const yaw = baseYaw + THREE.MathUtils.lerp(-yawSpread, yawSpread, t - 0.5 + (allowedVisualCount === 1 ? 0 : 0.5));
    tempVec3A.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(playerRigHolder.position).addScaledVector(tempVec3A, 1.15).setY(1.35);
    if (fx.rockets) {
      bullet.rotation.x = Math.PI / 2;
      tempQuatA.setFromUnitVectors(WORLD_UP, tempVec3A);
      bullet.quaternion.copy(tempQuatA);
    }
    bullet.userData.vel = tempVec3B.copy(tempVec3A).multiplyScalar(30).clone();
    bullet.userData.life = Math.min(SAFETY_LIMITS.maxBulletLifetime, 0.9 + Math.min(0.05, allowedVisualCount * 0.004));
    bullet.userData.damage = getBaseDamage() * volleyWeight;
    bullet.userData.effects = fx;
    bullet.userData.trailTick = performanceState.qualityLevel >= 2 ? 0.06 : 0.04;
    bullet.userData.volleyWeight = volleyWeight;
    scene.add(bullet);
    bullets.push(bullet);
    frameBudgets.bulletsSpawned += 1;
    if (bullets.length >= maxActiveBullets) break;
  }

  trimBulletsToLimit(maxActiveBullets);
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
  profile.stats.totalKills += 1;
  if (enemy.userData.role === 'boss') profile.stats.bossesDefeated += 1;
  const creditsEarned = enemy.userData.role === 'boss' ? 25 : 3;
  state.runCredits += creditsEarned;
}

function clearRunObjects() {
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
  enemySpatialGrid.clear();
  performanceState.activeEnemyEffects = 0;
  removeAllPickups();
  pickupNotices.length = 0;
}

function setMenuScreen(screenId) {
  activeMenuScreen = screenId;
  ui.menuTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.screen === screenId));
  ui.menuScreens.forEach((screen) => screen.classList.toggle('hidden', screen.dataset.screen !== screenId));
}

function openMenu(screenId = activeMenuScreen) {
  setMenuScreen(screenId);
  renderMenu();
  ui.menu.classList.remove('hidden');
  ui.gameOver.classList.add('hidden');
}

function purchaseUpgrade(upgradeId) {
  const def = UPGRADE_DEFS.find((entry) => entry.id === upgradeId);
  const cost = getUpgradeCost(upgradeId);
  if (!def || cost == null || profile.credits < cost) return;
  profile.credits -= cost;
  profile.upgrades[upgradeId] = getUpgradeLevel(upgradeId) + 1;
  saveProfile();
  renderMenu();
}

function renderWorldsScreen() {
  ui.worldGrid.innerHTML = '';
  ui.levelGrid.innerHTML = '';
  for (let world = 1; world <= WORLDS_COUNT; world++) {
    const unlockedCount = profile.progression.unlockedLevels[world] || 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `world-card${profile.progression.selectedWorld === world ? ' is-selected' : ''}${unlockedCount === 0 ? ' is-locked' : ''}`;
    button.disabled = unlockedCount === 0;
    button.innerHTML = `<div class="card-label">World ${world}</div><strong>${unlockedCount > 0 ? 'Unlocked' : 'Locked'}</strong><span>${Math.max(unlockedCount, 0)} / ${LEVELS_PER_WORLD} Levels freigeschaltet</span>`;
    button.addEventListener('click', () => selectMission(world, Math.min(profile.progression.selectedLevel, Math.max(1, unlockedCount || 1))));
    ui.worldGrid.appendChild(button);
  }
  const selectedWorld = profile.progression.selectedWorld;
  for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
    const unlocked = isLevelUnlocked(selectedWorld, level);
    const completed = !!profile.progression.completedLevels[getLevelKey(selectedWorld, level)];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `level-card${profile.progression.selectedLevel === level ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`;
    button.disabled = !unlocked;
    button.innerHTML = `<div class="card-label">Level ${level}</div><strong>${completed ? 'Completed' : unlocked ? 'Ready' : 'Locked'}</strong><span>${WAVES_PER_LEVEL} Waves · ${completed ? 'Bonus route cleared' : 'Clear to unlock next'}</span>`;
    button.addEventListener('click', () => selectMission(selectedWorld, level));
    ui.levelGrid.appendChild(button);
  }
}

function renderUpgradesScreen() {
  ui.upgradeCredits.textContent = String(profile.credits);
  ui.upgradeGroups.innerHTML = '';
  const grouped = UPGRADE_DEFS.reduce((map, def) => {
    (map[def.group] ||= []).push(def);
    return map;
  }, {});
  for (const [group, defs] of Object.entries(grouped)) {
    const groupEl = document.createElement('section');
    groupEl.className = 'upgrade-group';
    const title = document.createElement('h3');
    title.textContent = group;
    groupEl.appendChild(title);
    defs.forEach((def) => {
      const level = getUpgradeLevel(def.id);
      const cost = getUpgradeCost(def.id);
      const card = document.createElement('article');
      card.className = `upgrade-card${cost == null || profile.credits < cost ? ' is-disabled' : ''}`;
      card.innerHTML = `<div class="card-label">${def.label}</div><strong>Level ${level}${def.maxLevel ? ` / ${def.maxLevel}` : ''}</strong><p>${def.description}</p><div class="card-row"><span>Current: ${def.format(level)}</span><span>${cost == null ? 'MAX' : `Next cost: ${cost}`}</span></div>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = cost == null ? 'Maxed' : 'Upgrade';
      button.disabled = cost == null || profile.credits < cost;
      button.addEventListener('click', () => purchaseUpgrade(def.id));
      card.appendChild(button);
      groupEl.appendChild(card);
    });
    ui.upgradeGroups.appendChild(groupEl);
  }
}

function renderStatisticsScreen() {
  ui.statsGrid.innerHTML = '';
  STAT_DEFS.forEach((def) => {
    const card = document.createElement('article');
    card.className = 'stat-card';
    card.innerHTML = `<div class="card-label">${def.label}</div><strong>${def.format(profile.stats[def.id] || 0)}</strong><span>Persistent progression stat</span>`;
    ui.statsGrid.appendChild(card);
  });
}

function renderHomeScreen() {
  const mission = getSelectedMission();
  ui.menuCredits.textContent = String(profile.credits);
  ui.menuHighestWave.textContent = String(profile.stats.highestWaveReached);
  ui.selectedMissionLabel.textContent = `World ${mission.world} · Level ${mission.level}`;
  ui.selectedMissionStatus.textContent = `${WAVES_PER_LEVEL} Waves · ${isLevelUnlocked(mission.world, mission.level) ? 'Unlocked' : 'Locked'}`;
  ui.unlockedSummary.textContent = `${getUnlockedLevelCount()} / ${WORLDS_COUNT * LEVELS_PER_WORLD} Levels`;
  ui.selectedCharacterLabel.textContent = getCharacterDef().name;
}

function renderMenu() {
  renderHomeScreen();
  renderWorldsScreen();
  renderUpgradesScreen();
  renderStatisticsScreen();
  refreshCharacterSelection();
}

function showRunResult(success) {
  ui.resultEyebrow.textContent = success ? 'MISSION COMPLETE' : 'EINSATZ BEENDET';
  ui.resultTitle.textContent = success ? `World ${state.worldIndex} · Level ${state.levelIndex} gesichert` : 'Outpost verloren';
  ui.resultSummary.textContent = success
    ? `Alle ${WAVES_PER_LEVEL} Waves abgeschlossen. Höchste Schwierigkeitswelle: ${state.wave}`
    : `Erreichte Welle: ${state.wave}`;
  ui.finalWave.textContent = String(state.wave);
  ui.finalScore.textContent = String(state.score);
  ui.finalCredits.textContent = String(state.runCredits);
  const nextMission = getNextMission(state.worldIndex, state.levelIndex);
  ui.nextLevelBtn.classList.toggle('hidden', !success || !nextMission || !isLevelUnlocked(nextMission.world, nextMission.level));
}

function finishRun(success) {
  if (!state.running) return;
  state.running = false;
  if (success) unlockNextMission(state.worldIndex, state.levelIndex);
  addCredits(state.runCredits + (success ? 40 + state.levelIndex * 10 + state.worldIndex * 15 : 0));
  profile.stats.timePlayed += Math.max(0, state.elapsedRunTime - state.savedRunTime);
  profile.stats.highestWaveReached = Math.max(profile.stats.highestWaveReached, state.wave);
  if (success) {
    const nextMission = getNextMission(state.worldIndex, state.levelIndex);
    if (nextMission && isLevelUnlocked(nextMission.world, nextMission.level)) {
      profile.progression.selectedWorld = nextMission.world;
      profile.progression.selectedLevel = nextMission.level;
    }
  }
  saveProfile();
  resetRunPowerUps();
  clearRunObjects();
  ui.controls.classList.add('hidden');
  ui.hud.classList.add('hidden');
  showRunResult(success);
  ui.gameOver.classList.remove('hidden');
}

function startGame(world = profile.progression.selectedWorld, level = profile.progression.selectedLevel) {
  if (!isLevelUnlocked(world, level)) return;
  profile.progression.selectedWorld = world;
  profile.progression.selectedLevel = level;
  profile.stats.totalRuns += 1;
  saveProfile();
  state.running = true;
  state.worldIndex = world;
  state.levelIndex = level;
  state.hp = getPlayerMaxHp();
  state.score = 0;
  state.waveInLevel = 1;
  state.wave = getDifficultyIndex(world, level, 1);
  state.fireCooldown = 0;
  state.wavePause = 0;
  state.totalKills = 0;
  state.waveKills = 0;
  state.pickupSpawnTimer = 3.5;
  state.runCredits = 0;
  state.damageDealt = 0;
  state.elapsedRunTime = 0;
  state.savedRunTime = 0;
  state.lastProfileSaveAt = 0;
  playerRigHolder.position.set(0, 0.2, 0);
  clearRunObjects();
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
  if (e.code === 'F3') {
    performanceState.debugEnabled = !performanceState.debugEnabled;
    perfDebugEl.classList.toggle('hidden', !performanceState.debugEnabled);
  }
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

  updatePerformanceGuard(dt);
  frameBudgets.lightningChains = 0;
  frameBudgets.vfxSpawns = 0;
  frameBudgets.damageNumbers = 0;
  frameBudgets.bulletsSpawned = 0;
  frameBudgets.dotTicks = 0;
  frameBudgets.splashDamageEvents = 0;
  frameBudgets.hitResolutions = 0;
  frameBudgets.statusVfx = 0;

  let moveBlend = 0;
  if (state.running) {
    tempVec2A.set(
      (input.keys.has('KeyA') ? 1 : 0) - (input.keys.has('KeyD') ? 1 : 0),
      (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0)
    );
    if (tempVec2A.lengthSq() > 0) tempVec2A.normalize();
    const usingTouchMove = input.move.lengthSq() > 0;
    const finalMove = usingTouchMove ? input.move : tempVec2A;
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
      const keyMoving = tempVec2A.lengthSq() > 0;
      moveSpeed = keyMoving ? gameplayConfig.controls.maxMoveSpeed * 0.88 * state.moveSpeedMultiplier : 0;
      moveBlend = keyMoving ? 0.9 : 0;
    }

    if (moveSpeed > 0 && moveStrength > 0) {
      tempVec3A.set(finalMove.x, 0, finalMove.y).normalize();
      playerRigHolder.position.addScaledVector(tempVec3A, moveSpeed * dt);
    }

    resolveWorldCollision(playerRigHolder.position, PLAYER_COLLISION_RADIUS);
    const halfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.8;
    playerRigHolder.position.x = THREE.MathUtils.clamp(playerRigHolder.position.x, -halfArena, halfArena);
    playerRigHolder.position.z = THREE.MathUtils.clamp(playerRigHolder.position.z, -halfArena, halfArena);
    playerRigHolder.rotation.y = state.yaw;

    state.elapsedRunTime += dt;
    state.lastProfileSaveAt += dt;
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

    const bulletSoftRangeSq = SAFETY_LIMITS.bulletSoftRange * SAFETY_LIMITS.bulletSoftRange;
    const bulletHardRangeSq = SAFETY_LIMITS.bulletHardRange * SAFETY_LIMITS.bulletHardRange;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.userData.life -= dt;
      b.position.addScaledVector(b.userData.vel, dt);
      const dxPlayer = b.position.x - playerRigHolder.position.x;
      const dzPlayer = b.position.z - playerRigHolder.position.z;
      const distPlayerSq = dxPlayer * dxPlayer + dzPlayer * dzPlayer;
      if (b.userData.life <= 0 || distPlayerSq > bulletHardRangeSq || isOutsideArenaBounds(b.position, -0.75)) {
        removeBulletAtIndex(i);
        continue;
      }
      if (bullets.length > getAdaptiveLimit(SAFETY_LIMITS.maxActiveBulletsSoft, 0.72, 0.48) && distPlayerSq > bulletSoftRangeSq) {
        removeBulletAtIndex(i);
        continue;
      }
      b.userData.trailTick -= dt;
      if (b.userData.trailTick <= 0) {
        b.userData.trailTick = performanceState.qualityLevel >= 2 ? 0.075 : 0.045;
        const fx = b.userData.effects || getProjectileEffects();
        const pos = b.position;
        if (fx.fire) maybeSpawnStatusVfx(pos, tempVec3A.set((Math.random() - 0.5) * 0.35, 0.35 + Math.random() * 0.35, (Math.random() - 0.5) * 0.35), EFFECT_COLORS.fire, 0.3, 0.82);
        if (fx.ice && performanceState.qualityLevel <= 1) maybeSpawnStatusVfx(pos, tempVec3A.set((Math.random() - 0.5) * 0.28, 0.16 + Math.random() * 0.22, (Math.random() - 0.5) * 0.28), EFFECT_COLORS.ice, 0.24, 0.74);
        if (fx.poison && performanceState.qualityLevel <= 1) maybeSpawnStatusVfx(pos, tempVec3A.set((Math.random() - 0.5) * 0.22, 0.14 + Math.random() * 0.2, (Math.random() - 0.5) * 0.22), Math.random() > 0.5 ? 0x74ff5f : 0x8a4cd8, 0.34, 0.82);
        if (fx.rockets) maybeSpawnStatusVfx(pos, tempVec3A.set((Math.random() - 0.5) * 0.18, 0.45 + Math.random() * 0.3, (Math.random() - 0.5) * 0.18), 0xc7cdd6, 0.42, 0.92);
        if (fx.lightning && performanceState.qualityLevel === 0) maybeSpawnStatusVfx(pos, tempVec3A.set((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 1.1), EFFECT_COLORS.lightning, 0.16, 0.5);
      }
    }

    performanceState.activeEnemyEffects = 0;
    const dotBudget = getAdaptiveLimit(SAFETY_LIMITS.maxDotTicksPerFrame, 0.62, 0.38);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const data = e.userData;
      if (data.dead) continue;

      tempVec3A.set(playerRigHolder.position.x - e.position.x, 0, playerRigHolder.position.z - e.position.z);
      const dist = Math.max(0.0001, tempVec3A.length());
      tempVec3A.multiplyScalar(1 / dist);
      tempVec3B.set(-tempVec3A.z, 0, tempVec3A.x);
      tempVec3C.copy(tempVec3A);
      let moveSpeedEnemy = data.speed;

      if (data.iceSlowTimer > 0) {
        data.iceSlowTimer = Math.max(0, data.iceSlowTimer - dt);
        const slowPct = Math.min(0.72, runPowers.stacks.ice * 0.12);
        moveSpeedEnemy *= (1 - slowPct);
      }

      data.statusPulse += dt * 5.2;
      const body = data.anim?.body;
      const hasFire = data.fireDot > 0.01;
      const hasPoison = data.poisonDot > 0.01;
      const hasIce = data.iceSlowTimer > 0;
      const hasShock = data.shockTimer > 0;
      if (hasFire || hasPoison || hasIce || hasShock) performanceState.activeEnemyEffects += 1;

      if (body) {
        body.scale.setScalar(1);
        if (hasFire) {
          body.scale.x *= 1.01;
          if (performanceState.qualityLevel <= 1 && Math.random() > 0.45) maybeSpawnStatusVfx(tempVec3B.copy(e.position).setY(e.position.y + 0.95), tempVec3A.set((Math.random() - 0.5) * 0.16, 0.35 + Math.random() * 0.22, (Math.random() - 0.5) * 0.16), EFFECT_COLORS.fire, 0.22, 0.62);
        }
        if (hasPoison && performanceState.qualityLevel <= 1 && Math.random() > 0.58) {
          maybeSpawnStatusVfx(tempVec3B.copy(e.position).setY(e.position.y + 0.8), tempVec3A.set((Math.random() - 0.5) * 0.12, 0.14, (Math.random() - 0.5) * 0.12), 0x7dff69, 0.28, 0.6);
        }
        if (hasIce) {
          const pulse = 0.94 + Math.sin(data.statusPulse) * 0.02;
          body.scale.set(pulse, pulse, pulse);
        }
        if (hasShock && performanceState.qualityLevel === 0 && Math.random() > 0.5) {
          maybeSpawnStatusVfx(tempVec3B.copy(e.position).setY(e.position.y + 1.15), tempVec3A.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.5), EFFECT_COLORS.lightning, 0.14, 0.46);
        }
      }

      if (hasFire) {
        data.fireDot = Math.max(0, data.fireDot - dt * (0.85 + runPowers.stacks.fire * 0.08));
        data.fireTickTimer -= dt;
        const tickInterval = performanceState.qualityLevel >= 2 ? 0.2 : 0.14;
        if (data.fireTickTimer <= 0 && frameBudgets.dotTicks < dotBudget) {
          data.fireTickTimer += tickInterval;
          frameBudgets.dotTicks += 1;
          damageEnemy(e, Math.max(1, Math.round(data.fireDot * 0.72)), { allowLightningChain: false, isSecondaryEffect: true, hitPosition: e.position });
        }
      }

      if (hasPoison) {
        data.poisonDot = Math.max(0, data.poisonDot - dt * (0.72 + runPowers.stacks.poison * 0.06));
        data.poisonTickTimer -= dt;
        const tickInterval = performanceState.qualityLevel >= 2 ? 0.24 : 0.16;
        if (data.poisonTickTimer <= 0 && frameBudgets.dotTicks < dotBudget) {
          data.poisonTickTimer += tickInterval;
          frameBudgets.dotTicks += 1;
          damageEnemy(e, Math.max(1, Math.round(data.poisonDot * 0.58)), { allowLightningChain: false, isSecondaryEffect: true, hitPosition: e.position });
        }
      }

      if (hasShock) data.shockTimer = Math.max(0, data.shockTimer - dt);

      if (data.type === 'shooter') {
        if (dist < data.keepDistance) {
          tempVec3C.copy(tempVec3A).multiplyScalar(-0.65).addScaledVector(tempVec3B, Math.sin(elapsed + i) * 0.7).normalize();
        } else if (dist < data.range) {
          tempVec3C.copy(tempVec3B).multiplyScalar(Math.sin(elapsed * 0.8 + i) > 0 ? 1 : -1);
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
        if (data.chargeTimer > 0) moveSpeedEnemy = data.chargeSpeed;
      }

      e.position.addScaledVector(tempVec3C, moveSpeedEnemy * dt);
      resolveWorldCollision(e.position, data.radius * 0.88);
      const enemyHalfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.9;
      e.position.x = THREE.MathUtils.clamp(e.position.x, -enemyHalfArena, enemyHalfArena);
      e.position.z = THREE.MathUtils.clamp(e.position.z, -enemyHalfArena, enemyHalfArena);
      e.lookAt(playerRigHolder.position.x, e.position.y, playerRigHolder.position.z);

      const step = elapsed * (2.8 + moveSpeedEnemy * 0.9) + data.spawnTick;
      const bobAmp = data.type.includes('boss') ? 0.12 : data.type === 'swarm' ? 0.06 : 0.08;
      e.position.y = (data.type.includes('boss') ? 0.75 : 0.45) + Math.sin(step) * bobAmp;
      if (data.anim?.body) data.anim.body.rotation.z = Math.sin(step * 0.5) * 0.04;
      for (let legIdx = 0; legIdx < data.anim.legs.length; legIdx++) {
        data.anim.legs[legIdx].rotation.x = Math.sin(step * 1.7 + legIdx * Math.PI) * 0.45;
      }
      for (let extraIdx = 0; extraIdx < data.anim.extras.length; extraIdx++) {
        data.anim.extras[extraIdx].rotation.y = Math.sin(step + extraIdx) * 0.28;
      }

      if (dist < data.radius + 0.7) damagePlayer(data.damage * dt);
    }

    rebuildEnemySpatialGrid();

    const hitBudget = getAdaptiveLimit(SAFETY_LIMITS.maxHitResolutionsPerFrame, 0.62, 0.38);
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (frameBudgets.hitResolutions >= hitBudget) break;
      const bullet = bullets[i];
      let hitEnemy = null;
      let bestDistSq = Infinity;
      const queryRadius = (bullet.userData.effects?.rockets ? 2.6 : 1.9);
      forEachEnemyNearPosition(bullet.position, queryRadius, (enemy) => {
        if (enemy.userData.dead) return;
        const data = enemy.userData;
        const dx = enemy.position.x - bullet.position.x;
        const dz = enemy.position.z - bullet.position.z;
        const horizontalDistSq = dx * dx + dz * dz;
        if (horizontalDistSq > data.hitboxRadius * data.hitboxRadius) return;
        const yCenter = enemy.position.y + data.hitboxCenterOffsetY;
        if (Math.abs(bullet.position.y - yCenter) > data.hitboxHalfHeight) return;
        if (horizontalDistSq < bestDistSq) {
          bestDistSq = horizontalDistSq;
          hitEnemy = enemy;
        }
      });
      if (!hitEnemy) continue;
      frameBudgets.hitResolutions += 1;
      damageEnemy(hitEnemy, bullet.userData.damage, { hitPosition: bullet.position });
      applyProjectilePower(hitEnemy, bullet);
      removeBulletAtIndex(i);
    }

    for (let i = pickupNotices.length - 1; i >= 0; i--) {
      pickupNotices[i].life -= dt;
      if (pickupNotices[i].life <= 0) pickupNotices.splice(i, 1);
    }

    if (enemies.length === 0) {
      state.wavePause -= dt;
      if (state.wavePause <= 0) {
        if (state.waveInLevel >= WAVES_PER_LEVEL) {
          finishRun(true);
        } else {
          state.waveInLevel += 1;
          state.wavePause = 1;
          spawnWave();
        }
      }
    }

    if (state.lastProfileSaveAt >= 2) {
      profile.stats.timePlayed += state.lastProfileSaveAt;
      state.savedRunTime += state.lastProfileSaveAt;
      state.lastProfileSaveAt = 0;
      saveProfile();
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
  updatePerformanceDebug();

  tempVec3A.set(0, gameplayConfig.camera.height, gameplayConfig.camera.forwardOffset);
  camera.position.copy(playerRigHolder.position).add(tempVec3A);
  camera.lookAt(playerRigHolder.position.x, playerRigHolder.position.y + gameplayConfig.camera.lookAtHeight, playerRigHolder.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function installDebugApi() {
  window.__skyBlasterDebug = {
    snapshot() {
      return {
        bullets: bullets.length,
        enemies: enemies.length,
        vfx: vfxParticles.length,
        damageNumbers: damageNumbers.length,
        chainBeams: chainBeams.length,
        fps: performanceState.fps,
        frameMs: performanceState.frameMs,
        qualityLevel: performanceState.qualityLevel,
        activeEnemyEffects: performanceState.activeEnemyEffects,
      };
    },
    grantPowerUps(stacks = 3) {
      const projectileKeys = ['fire', 'ice', 'lightning', 'poison', 'rockets', 'doubler'];
      for (const key of projectileKeys) runPowers.stacks[key] = Math.max(runPowers.stacks[key], stacks);
      state.projectileCount = getSafeProjectileCountFromDoublers(runPowers.stacks.doubler);
      state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + runPowers.stacks.movementSpeed * 0.05;
      updateHUD();
      return this.snapshot();
    },
    spawnEnemyRing(count = 24, type = 'runner', radius = 18) {
      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(1, count)) * Math.PI * 2;
        spawnEnemy(type, angle, radius + (Math.random() - 0.5) * 4, Math.max(state.wave, 4));
      }
      rebuildEnemySpatialGrid();
      return this.snapshot();
    },
    stressRun() {
      this.grantPowerUps(4);
      this.spawnEnemyRing(18, 'runner', 15);
      this.spawnEnemyRing(12, 'shooter', 20);
      this.spawnEnemyRing(10, 'charger', 24);
      return this.snapshot();
    },
  };
}

if (performanceState.debugEnabled) installDebugApi();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

ui.menuTabs.forEach((tab) => tab.addEventListener('click', () => setMenuScreen(tab.dataset.screen)));
ui.startBtn.addEventListener('click', () => startGame());
ui.quickWorldsBtn.addEventListener('click', () => openMenu('worlds'));
ui.startSelectedLevelBtn.addEventListener('click', () => {
  const mission = getSelectedMission();
  startGame(mission.world, mission.level);
});
ui.restartBtn.addEventListener('click', () => startGame(state.worldIndex, state.levelIndex));
ui.menuBtn.addEventListener('click', () => openMenu('home'));
ui.nextLevelBtn.addEventListener('click', () => {
  const nextMission = getNextMission(state.worldIndex, state.levelIndex);
  if (!nextMission) {
    openMenu('worlds');
    return;
  }
  startGame(nextMission.world, nextMission.level);
});

renderMenu();
updateHUD();
requestAnimationFrame(animate);
