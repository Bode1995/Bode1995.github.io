export const CHARACTER_STORAGE_KEY = 'skyBlaster.selectedCharacterId';
export const PROFILE_STORAGE_KEY = 'skyBlaster.profile.v2';
export const WORLDS_COUNT = 4;
export const LEVELS_PER_WORLD = 5;
export const WAVES_PER_LEVEL = 10;

export const CHARACTER_DEFS = [
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

export const UPGRADE_DEFS = [
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

export const STAT_DEFS = [
  { id: 'totalKills', label: 'Total kills', format: (v) => String(v) },
  { id: 'totalRuns', label: 'Total runs', format: (v) => String(v) },
  { id: 'highestWaveReached', label: 'Highest wave reached', format: (v) => String(v) },
  { id: 'damageDealt', label: 'Damage dealt', format: (v) => String(Math.round(v)) },
  { id: 'timePlayed', label: 'Time played', format: (v) => formatDuration(v) },
  { id: 'powerUpsCollected', label: 'Power-ups collected', format: (v) => String(v) },
  { id: 'bossesDefeated', label: 'Bosses defeated', format: (v) => String(v) },
];

export const gameplayConfig = {
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

export const POWER_UP_DEFS = {
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

export const RUN_BASE = {
  moveSpeedMultiplier: 1,
  projectileCount: 1,
};

export const ENEMY_TYPES = {
  runner: { role: 'field', hp: 2, speed: 4.6, damage: 22, radius: 0.72, score: 11 },
  tank: { role: 'field', hp: 8, speed: 1.75, damage: 34, radius: 1.2, score: 16 },
  shooter: { role: 'field', hp: 4, speed: 2.55, damage: 18, radius: 0.92, score: 14, range: 13.5, keepDistance: 8.5, fireRate: 1.4 },
  swarm: { role: 'field', hp: 1, speed: 5.1, damage: 12, radius: 0.42, score: 7 },
  charger: { role: 'field', hp: 5, speed: 2.6, damage: 26, radius: 0.95, score: 15, chargeSpeed: 9.2, chargeCooldown: 2.2, chargeDuration: 0.45 },
  splitter: { role: 'field', hp: 5, speed: 2.35, damage: 20, radius: 0.95, score: 15, splitCount: 3 },
  bossHeavy: { role: 'boss', hp: 48, speed: 1.25, damage: 52, radius: 1.95, score: 110 },
  bossAgile: { role: 'boss', hp: 36, speed: 2.95, damage: 38, radius: 1.65, score: 125, chargeSpeed: 9.7, chargeCooldown: 1.65, chargeDuration: 0.35 },
};

export const SAFETY_LIMITS = {
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

export function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
