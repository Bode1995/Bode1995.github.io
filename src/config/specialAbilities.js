export const SPECIAL_ABILITY_STORAGE_VERSION = 1;
export const DEFAULT_SPECIAL_ABILITY_ID = 'grenade';

const COLOR = {
  grenade: '#ff9c5b',
  clone: '#73d5ff',
  backfire: '#ff78d8',
  slowMow: '#8dffd5',
};

export const SPECIAL_ABILITY_DEFS = [
  {
    id: 'grenade',
    name: 'Granate',
    shortLabel: 'GRN',
    description: 'Wirft automatisch eine Granate ab, die kurz darauf explodiert und Flächenschaden verursacht.',
    icon: '✹',
    hudColor: COLOR.grenade,
    cooldown: 5,
    upgradeType: 'damage',
    baseValues: {
      damage: 18,
      radius: 3.8,
      fuse: 0.85,
      maxActive: 2,
    },
    upgrade: {
      label: 'Explosionsschaden',
      baseCost: 90,
      costStep: 55,
      maxLevel: 10,
      baseValue: 18,
      scaling: 8,
      format: (value) => `${Math.round(value)} Schaden`,
    },
    visualStyle: {
      primary: COLOR.grenade,
      secondary: '#fff1cc',
      trail: '#ffb26c',
      pulse: 1.15,
    },
  },
  {
    id: 'clone',
    name: 'Klon',
    shortLabel: 'CLN',
    description: 'Beschwört einen stationären Klon, der Gegner und Projektilfokus zuverlässig umlenkt.',
    icon: '◭',
    hudColor: COLOR.clone,
    cooldown: 10,
    upgradeType: 'health',
    baseValues: {
      health: 60,
      lifetime: 12,
      radius: 1.1,
      maxActive: 1,
    },
    upgrade: {
      label: 'Klon-Leben',
      baseCost: 110,
      costStep: 60,
      maxLevel: 10,
      baseValue: 60,
      scaling: 20,
      format: (value) => `${Math.round(value)} HP`,
    },
    visualStyle: {
      primary: COLOR.clone,
      secondary: '#d8f7ff',
      trail: '#9cecff',
      pulse: 0.92,
    },
  },
  {
    id: 'backfire',
    name: 'Backfire',
    shortLabel: 'BCK',
    description: 'Aktiviert ein kurzes Zeitfenster, in dem jede normale Salve zusätzlich nach hinten gespiegelt wird.',
    icon: '⇋',
    hudColor: COLOR.backfire,
    cooldown: 3,
    upgradeType: 'duration',
    baseValues: {
      duration: 0.5,
    },
    upgrade: {
      label: 'Backfire-Dauer',
      baseCost: 100,
      costStep: 58,
      maxLevel: 10,
      baseValue: 0.5,
      scaling: 0.12,
      format: (value) => `${value.toFixed(2)}s`,
    },
    visualStyle: {
      primary: COLOR.backfire,
      secondary: '#ffe0fb',
      trail: '#ff9df0',
      pulse: 1.3,
    },
  },
  {
    id: 'slowMow',
    name: 'Slow Mow',
    shortLabel: 'SLW',
    description: 'Verlangsamt regelmäßig alle aktiven Gegner für eine klar begrenzte Dauer.',
    icon: '❄',
    hudColor: COLOR.slowMow,
    cooldown: 5,
    upgradeType: 'duration',
    baseValues: {
      duration: 1,
      slowMultiplier: 0.42,
    },
    upgrade: {
      label: 'Slow-Dauer',
      baseCost: 95,
      costStep: 52,
      maxLevel: 10,
      baseValue: 1,
      scaling: 0.25,
      format: (value) => `${value.toFixed(2)}s`,
    },
    visualStyle: {
      primary: COLOR.slowMow,
      secondary: '#ebfffa',
      trail: '#9effdb',
      pulse: 0.86,
    },
  },
];

export function getSpecialAbilityDef(id = DEFAULT_SPECIAL_ABILITY_ID) {
  return SPECIAL_ABILITY_DEFS.find((ability) => ability.id === id) || SPECIAL_ABILITY_DEFS[0];
}

export function resolveSpecialAbilityId(rawId) {
  return getSpecialAbilityDef(rawId).id;
}

export function createDefaultSpecialAbilityLevels() {
  return Object.fromEntries(SPECIAL_ABILITY_DEFS.map((ability) => [ability.id, 0]));
}

export function getSpecialAbilityLevel(levels, abilityId) {
  const resolvedId = resolveSpecialAbilityId(abilityId);
  const value = levels?.[resolvedId];
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function getSpecialAbilityUpgradeValue(abilityId, level = 0) {
  const def = getSpecialAbilityDef(abilityId);
  return def.upgrade.baseValue + (Math.max(0, Math.floor(level)) * def.upgrade.scaling);
}

export function getSpecialAbilityUpgradeCost(abilityId, level = 0) {
  const def = getSpecialAbilityDef(abilityId);
  if (Math.max(0, Math.floor(level)) >= def.upgrade.maxLevel) return null;
  return def.upgrade.baseCost + Math.max(0, Math.floor(level)) * def.upgrade.costStep;
}

export function createDefaultSpecialAbilityProfile() {
  return {
    version: SPECIAL_ABILITY_STORAGE_VERSION,
    selectedId: DEFAULT_SPECIAL_ABILITY_ID,
    levels: createDefaultSpecialAbilityLevels(),
  };
}
