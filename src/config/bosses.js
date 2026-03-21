export const EARTH_BOSS_ID = 'earthTitan';

function createBossDefinition(config) {
  return {
    id: config.id,
    key: config.key || config.id,
    name: config.name,
    internalName: config.internalName || config.id,
    campaignGroupId: config.campaignGroupId || 'earth',
    menuWorldIndex: config.menuWorldIndex || 1,
    presentationWorldIndex: config.presentationWorldIndex || config.menuWorldIndex || 1,
    menuLabel: config.menuLabel || 'Boss Mission',
    menuChip: config.menuChip || 'BOSS',
    subtitle: config.subtitle || '',
    description: config.description || '',
    rewardCredits: config.rewardCredits || 250,
    repeatRewardCredits: config.repeatRewardCredits || config.rewardCredits || 250,
    phases: config.phases || 4,
    ...config,
  };
}

export const BOSS_DEFS = {
  [EARTH_BOSS_ID]: createBossDefinition({
    id: EARTH_BOSS_ID,
    key: 'earthBoss',
    internalName: 'worldBossEarth',
    campaignGroupId: 'earth',
    menuWorldIndex: 4,
    presentationWorldIndex: 1,
    name: 'Der Titan des Kerns',
    menuLabel: 'Der Zerfall der Erde',
    menuChip: 'EARTH BOSS',
    subtitle: 'Das Herz der sterbenden Welt',
    description: 'Gigantischer Wächter der Erd-Welten mit Plattform-Arena, 4 Phasen und massiven Erdattacken.',
    rewardCredits: 420,
    repeatRewardCredits: 260,
    phases: 4,
  }),
};

export function getBossDefinition(bossId = EARTH_BOSS_ID) {
  return BOSS_DEFS[bossId] || BOSS_DEFS[EARTH_BOSS_ID];
}

export function getBossesForWorld(worldIndex = 1) {
  return Object.values(BOSS_DEFS).filter((boss) => boss.menuWorldIndex === worldIndex);
}

export function isBossMissionUnlocked(profile, bossId) {
  return !!profile?.progression?.unlockedBossMissions?.[bossId];
}
