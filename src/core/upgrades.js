import { UPGRADE_DEFS } from '../config/gameConfig.js';

export const GLOBAL_UPGRADE_CAP_ID = 'upgradeCapBoost';

const UPGRADE_DEF_MAP = new Map(UPGRADE_DEFS.map((def) => [def.id, def]));

export function getUpgradeDefs() {
  return UPGRADE_DEFS;
}

export function getUpgradeDef(id) {
  return UPGRADE_DEF_MAP.get(id) || null;
}

export function getUpgradeLevel(profile, id) {
  return profile?.upgrades?.[id] || 0;
}

export function getUpgradeCapBonus(profile) {
  return getUpgradeLevel(profile, GLOBAL_UPGRADE_CAP_ID);
}

export function getUpgradeMaxLevel(profile, id) {
  const def = getUpgradeDef(id);
  if (!def) return null;
  if (def.unlimited) return null;
  const baseMaxLevel = Number.isFinite(def.maxLevel) ? def.maxLevel : 0;
  const bonus = id === GLOBAL_UPGRADE_CAP_ID ? 0 : getUpgradeCapBonus(profile);
  return baseMaxLevel + bonus;
}

export function getUpgradeCost(profile, id) {
  const def = getUpgradeDef(id);
  if (!def) return null;
  const level = getUpgradeLevel(profile, id);
  const maxLevel = getUpgradeMaxLevel(profile, id);
  if (maxLevel != null && level >= maxLevel) return null;
  const curve = typeof def.costCurve === 'function'
    ? def.costCurve(level, def, profile)
    : def.baseCost + (level * def.costStep);
  return Math.max(0, Math.round(curve));
}

export function createDefaultUpgradeState() {
  return Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, 0]));
}
