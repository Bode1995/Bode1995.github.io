import {
  CHARACTER_DEFS,
  CHARACTER_STORAGE_KEY,
  LEVELS_PER_WORLD,
  PROFILE_STORAGE_KEY,
  UPGRADE_DEFS,
  WORLDS_COUNT,
} from '../config/gameConfig.js';
import { EARTH_BOSS_ID, getBossDefinition } from '../config/bosses.js';
import {
  createDefaultSpecialAbilityLevels,
  createDefaultSpecialAbilityProfile,
  resolveSpecialAbilityId,
} from '../config/specialAbilities.js';

export function createDefaultProfile() {
  const unlockedLevels = {};
  for (let world = 1; world <= WORLDS_COUNT; world++) unlockedLevels[world] = world === 1 ? 1 : 0;
  return {
    version: 3,
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
      selectedMissionType: 'level',
      selectedBossMissionId: null,
      unlockedLevels,
      completedLevels: {},
      unlockedBossMissions: {},
      completedBossMissions: {},
      campaignsCompleted: {},
    },
    specialAbilities: createDefaultSpecialAbilityProfile(),
  };
}

export function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null');
    const base = createDefaultProfile();
    if (!raw || typeof raw !== 'object') return base;
    const specialBase = createDefaultSpecialAbilityProfile();
    const rawSpecial = raw.specialAbilities || {};
    const resolvedProfile = {
      version: Math.max(3, Number(raw.version) || 0),
      credits: Number.isFinite(raw.credits) ? raw.credits : base.credits,
      upgrades: { ...base.upgrades, ...(raw.upgrades || {}) },
      stats: { ...base.stats, ...(raw.stats || {}) },
      progression: {
        ...base.progression,
        ...(raw.progression || {}),
        unlockedLevels: { ...base.progression.unlockedLevels, ...((raw.progression || {}).unlockedLevels || {}) },
        completedLevels: { ...base.progression.completedLevels, ...((raw.progression || {}).completedLevels || {}) },
        unlockedBossMissions: { ...base.progression.unlockedBossMissions, ...((raw.progression || {}).unlockedBossMissions || {}) },
        completedBossMissions: { ...base.progression.completedBossMissions, ...((raw.progression || {}).completedBossMissions || {}) },
        campaignsCompleted: { ...base.progression.campaignsCompleted, ...((raw.progression || {}).campaignsCompleted || {}) },
      },
      specialAbilities: {
        ...specialBase,
        ...rawSpecial,
        selectedId: resolveSpecialAbilityId(rawSpecial.selectedId),
        levels: { ...createDefaultSpecialAbilityLevels(), ...specialBase.levels, ...(rawSpecial.levels || {}) },
      },
    };
    if (resolvedProfile.progression.completedLevels?.['1-5'] || (resolvedProfile.progression.unlockedLevels?.[2] || 0) >= 1) {
      resolvedProfile.progression.unlockedBossMissions[EARTH_BOSS_ID] = true;
    }
    if (resolvedProfile.progression.completedBossMissions?.[EARTH_BOSS_ID]) {
      resolvedProfile.progression.campaignsCompleted[1] = true;
      resolvedProfile.progression.unlockedBossMissions[EARTH_BOSS_ID] = true;
    }
    return resolvedProfile;
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
    isBossMissionUnlocked(bossId = EARTH_BOSS_ID) {
      return !!profile.progression.unlockedBossMissions[bossId];
    },
    selectMission(world, level) {
      profile.progression.selectedWorld = world;
      profile.progression.selectedLevel = level;
      profile.progression.selectedMissionType = 'level';
      profile.progression.selectedBossMissionId = null;
    },
    selectBossMission(bossId = EARTH_BOSS_ID) {
      const boss = getBossDefinition(bossId);
      profile.progression.selectedWorld = boss.worldIndex;
      profile.progression.selectedMissionType = 'boss';
      profile.progression.selectedBossMissionId = boss.id;
    },
    getSelectedMission() {
      if (profile.progression.selectedMissionType === 'boss' && profile.progression.selectedBossMissionId) {
        const boss = getBossDefinition(profile.progression.selectedBossMissionId);
        return {
          type: 'boss',
          id: boss.id,
          world: boss.worldIndex,
          level: null,
          name: boss.name,
        };
      }
      return {
        type: 'level',
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
      if (world === 1 && level >= LEVELS_PER_WORLD) {
        profile.progression.unlockedBossMissions[EARTH_BOSS_ID] = true;
      }
      saveProfile(profile);
    },
    unlockBossMission(bossId = EARTH_BOSS_ID) {
      profile.progression.unlockedBossMissions[bossId] = true;
      saveProfile(profile);
    },
    completeBossMission(bossId = EARTH_BOSS_ID) {
      const boss = getBossDefinition(bossId);
      profile.progression.unlockedBossMissions[bossId] = true;
      profile.progression.completedBossMissions[bossId] = true;
      profile.progression.campaignsCompleted[boss.worldIndex] = true;
      saveProfile(profile);
    },
  };
}
