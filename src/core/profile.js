import {
  CHARACTER_DEFS,
  CHARACTER_STORAGE_KEY,
  LEVELS_PER_WORLD,
  PROFILE_STORAGE_KEY,
  UPGRADE_DEFS,
  WORLDS_COUNT,
} from '../config/gameConfig.js';

export function createDefaultProfile() {
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

export function loadProfile() {
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

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function resolveCharacterId(rawId) {
  return CHARACTER_DEFS.some((character) => character.id === rawId) ? rawId : CHARACTER_DEFS[0].id;
}

export function loadSelectedCharacterId() {
  return resolveCharacterId(localStorage.getItem(CHARACTER_STORAGE_KEY));
}

export function saveSelectedCharacterId(characterId) {
  localStorage.setItem(CHARACTER_STORAGE_KEY, resolveCharacterId(characterId));
}

export function createProfileApi(profile) {
  return {
    profile,
    save: () => saveProfile(profile),
    getLevelKey(world, level) {
      return `${world}-${level}`;
    },
    isLevelUnlocked(world, level) {
      return level <= (profile.progression.unlockedLevels[world] || 0);
    },
    selectMission(world, level) {
      profile.progression.selectedWorld = world;
      profile.progression.selectedLevel = level;
    },
    getSelectedMission() {
      return {
        world: profile.progression.selectedWorld,
        level: profile.progression.selectedLevel,
      };
    },
    getUnlockedLevelCount() {
      return Object.values(profile.progression.unlockedLevels).reduce((sum, count) => sum + Math.max(0, count || 0), 0);
    },
    unlockNextMission(world, level) {
      profile.progression.completedLevels[this.getLevelKey(world, level)] = true;
      if (level < LEVELS_PER_WORLD) {
        profile.progression.unlockedLevels[world] = Math.max(profile.progression.unlockedLevels[world] || 0, level + 1);
      } else if (world < WORLDS_COUNT) {
        profile.progression.unlockedLevels[world + 1] = Math.max(profile.progression.unlockedLevels[world + 1] || 0, 1);
      }
      saveProfile(profile);
    },
  };
}
