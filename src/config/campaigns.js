import { LEVELS_PER_WORLD } from './gameConfig.js';

function createCampaignDefinition(config) {
  const worldIndexes = [...(config.worldIndexes || [])];
  return {
    id: config.id,
    name: config.name,
    menuLabel: config.menuLabel || config.name,
    worldIndexes,
    requiredLevelKeys: worldIndexes.flatMap((worldIndex) => Array.from({ length: LEVELS_PER_WORLD }, (_, index) => `${worldIndex}-${index + 1}`)),
  };
}

export const CAMPAIGN_GROUP_DEFS = {
  earth: createCampaignDefinition({
    id: 'earth',
    name: 'Erde',
    menuLabel: 'Erd-Kampagne',
    worldIndexes: [1, 2, 3, 4],
  }),
};

export function getCampaignGroupDefinition(groupId = 'earth') {
  return CAMPAIGN_GROUP_DEFS[groupId] || CAMPAIGN_GROUP_DEFS.earth;
}

export function getCampaignGroupForWorld(worldIndex = 1) {
  return Object.values(CAMPAIGN_GROUP_DEFS).find((group) => group.worldIndexes.includes(worldIndex)) || null;
}

export function getCampaignGroupIdForWorld(worldIndex = 1) {
  return getCampaignGroupForWorld(worldIndex)?.id || null;
}

export function getCampaignGroupCompletion(profile, groupId = 'earth') {
  const group = getCampaignGroupDefinition(groupId);
  const completedLevels = profile?.progression?.completedLevels || {};
  const completedCount = group.requiredLevelKeys.reduce((count, key) => count + (completedLevels[key] ? 1 : 0), 0);
  return {
    group,
    completedCount,
    requiredCount: group.requiredLevelKeys.length,
    isComplete: completedCount >= group.requiredLevelKeys.length,
  };
}
