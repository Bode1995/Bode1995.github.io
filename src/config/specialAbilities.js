export const SPECIAL_ABILITY_DEFS = [
  {
    id: 'focus_mark',
    name: 'Focus Mark',
    label: 'Focus Mark',
    shortLabel: 'Mark',
    description: 'Markiert priorisierte Ziele und verstärkt eingehenden Präzisionsschaden deutlich.',
    category: 'Target Control',
    icon: '◉',
    symbol: 'FM',
    hudColor: 0x69f0ff,
    visualStyle: {
      primary: 0x69f0ff,
      secondary: 0xd9fdff,
      tertiary: 0x13384a,
      aura: 0x8ef8ff,
    },
    balanceTags: ['precision', 'mark', 'single-target'],
    unlock: { defaultUnlocked: true },
    baseStats: {
      cooldown: 7.5,
      duration: 4.8,
      retargetGrace: 0.4,
      range: 34,
      frontBias: 0.9,
      damageMultiplier: 1.55,
    },
    upgradeTracks: [
      { id: 'cooldown', label: 'Cooldown Tuning', shortLabel: 'CD', description: 'Senkt die Abklingzeit.', baseCost: 70, costStep: 40, maxLevel: 6, format: (v) => `${v.toFixed(1)}s` },
      { id: 'duration', label: 'Mark Lock', shortLabel: 'Dur', description: 'Verlängert die Markierungsdauer.', baseCost: 65, costStep: 36, maxLevel: 5, format: (v) => `${v.toFixed(1)}s` },
      { id: 'potency', label: 'Kill Window', shortLabel: 'Dmg', description: 'Erhöht den Schadensmultiplikator.', baseCost: 90, costStep: 55, maxLevel: 5, format: (v) => `${v.toFixed(2)}x` },
    ],
    resolveConfig(levels = {}) {
      return {
        cooldown: Math.max(3.8, 7.5 - (levels.cooldown || 0) * 0.55),
        duration: 4.8 + (levels.duration || 0) * 0.7,
        retargetGrace: 0.4,
        range: 34,
        frontBias: 0.9,
        damageMultiplier: 1.55 + (levels.potency || 0) * 0.14,
      };
    },
    getTrackValue(trackId, levels = {}) {
      const config = this.resolveConfig(levels);
      if (trackId === 'cooldown') return config.cooldown;
      if (trackId === 'duration') return config.duration;
      if (trackId === 'potency') return config.damageMultiplier;
      return 0;
    },
  },
  {
    id: 'holo_decoy',
    name: 'Holo Decoy',
    label: 'Holo Decoy',
    shortLabel: 'Decoy',
    description: 'Projiziert eigenständige Lockvögel, die Gegner umleiten und Raumfenster öffnen.',
    category: 'Utility Distraction',
    icon: '⬡',
    symbol: 'HD',
    hudColor: 0x72f2cf,
    visualStyle: {
      primary: 0x72f2cf,
      secondary: 0xcffdf3,
      tertiary: 0x17373a,
      aura: 0x8ffff3,
    },
    balanceTags: ['decoy', 'utility', 'positioning'],
    unlock: { defaultUnlocked: true },
    baseStats: {
      cooldown: 9,
      duration: 4.2,
      influenceRadius: 18,
      lockDuration: 1.05,
      spawnTrailDelay: 0.32,
      decoyCount: 1,
    },
    upgradeTracks: [
      { id: 'cooldown', label: 'Signal Refresh', shortLabel: 'CD', description: 'Senkt die Abklingzeit.', baseCost: 70, costStep: 38, maxLevel: 6, format: (v) => `${v.toFixed(1)}s` },
      { id: 'duration', label: 'Echo Lifetime', shortLabel: 'Dur', description: 'Hält die Projektion länger aktiv.', baseCost: 65, costStep: 34, maxLevel: 5, format: (v) => `${v.toFixed(1)}s` },
      { id: 'utility', label: 'Lure Radius', shortLabel: 'Rad', description: 'Erhöht Reichweite und freischaltbare Doppel-Decoys.', baseCost: 95, costStep: 60, maxLevel: 5, format: (v, levels) => `${v.toFixed(1)}m · ${levels.utility >= 5 ? '2 Decoys' : '1 Decoy'}` },
    ],
    resolveConfig(levels = {}) {
      const utilityLevel = levels.utility || 0;
      return {
        cooldown: Math.max(4.8, 9 - (levels.cooldown || 0) * 0.6),
        duration: 4.2 + (levels.duration || 0) * 0.7,
        influenceRadius: 18 + utilityLevel * 1.8,
        lockDuration: 1.05 + utilityLevel * 0.05,
        spawnTrailDelay: 0.32,
        decoyCount: utilityLevel >= 5 ? 2 : 1,
      };
    },
    getTrackValue(trackId, levels = {}) {
      const config = this.resolveConfig(levels);
      if (trackId === 'cooldown') return config.cooldown;
      if (trackId === 'duration') return config.duration;
      if (trackId === 'utility') return config.influenceRadius;
      return 0;
    },
  },
  {
    id: 'shield_ram',
    name: 'Shield Ram',
    label: 'Shield Ram',
    shortLabel: 'Ram',
    description: 'Entlädt einen frontalen Stoß mit eigenem Wave-Look, Knockback und Impact-Damage.',
    category: 'Breach Impact',
    icon: '▰',
    symbol: 'SR',
    hudColor: 0xffb25e,
    visualStyle: {
      primary: 0xffb25e,
      secondary: 0xffe5b9,
      tertiary: 0x4f2910,
      aura: 0xffcf86,
    },
    balanceTags: ['frontline', 'impact', 'interrupt'],
    unlock: { defaultUnlocked: true },
    baseStats: {
      cooldown: 8.5,
      duration: 0.55,
      range: 8.2,
      coneDot: 0.54,
      knockback: 8.5,
      interrupt: 1.2,
      impactDamage: 5.5,
    },
    upgradeTracks: [
      { id: 'cooldown', label: 'Rearm Cycle', shortLabel: 'CD', description: 'Senkt die Abklingzeit.', baseCost: 72, costStep: 40, maxLevel: 6, format: (v) => `${v.toFixed(1)}s` },
      { id: 'potency', label: 'Impact Core', shortLabel: 'Dmg', description: 'Erhöht Stoßschaden und Knockback.', baseCost: 90, costStep: 52, maxLevel: 5, format: (v) => `${v.toFixed(1)} dmg` },
      { id: 'range', label: 'Shock Front', shortLabel: 'Rng', description: 'Vergrößert Reichweite und Trefferkegel.', baseCost: 80, costStep: 48, maxLevel: 5, format: (v) => `${v.toFixed(1)}m` },
    ],
    resolveConfig(levels = {}) {
      return {
        cooldown: Math.max(4.5, 8.5 - (levels.cooldown || 0) * 0.6),
        duration: 0.55,
        range: 8.2 + (levels.range || 0) * 0.7,
        coneDot: Math.max(0.36, 0.54 - (levels.range || 0) * 0.025),
        knockback: 8.5 + (levels.potency || 0) * 1.1,
        interrupt: 1.2 + (levels.range || 0) * 0.08,
        impactDamage: 5.5 + (levels.potency || 0) * 1.35,
      };
    },
    getTrackValue(trackId, levels = {}) {
      const config = this.resolveConfig(levels);
      if (trackId === 'cooldown') return config.cooldown;
      if (trackId === 'potency') return config.impactDamage;
      if (trackId === 'range') return config.range;
      return 0;
    },
  },
  {
    id: 'guardian_orbit',
    name: 'Guardian Orbit',
    label: 'Guardian Orbit',
    shortLabel: 'Orbit',
    description: 'Beschwört autonome Orbiter mit fester Sentinel-Optik, die Gegner kreisend beschädigen.',
    category: 'Area Control',
    icon: '◌',
    symbol: 'GO',
    hudColor: 0xc698ff,
    visualStyle: {
      primary: 0xc698ff,
      secondary: 0xf4ebff,
      tertiary: 0x2f174a,
      aura: 0xe0c9ff,
    },
    balanceTags: ['orbit', 'aoe', 'control'],
    unlock: { defaultUnlocked: true },
    baseStats: {
      cooldown: 10,
      duration: 5.5,
      orbCount: 3,
      orbitRadius: 2.15,
      orbitHeight: 1.25,
      orbitSpeed: 2.8,
      hitRadius: 1.25,
      hitInterval: 0.28,
      damage: 3.4,
    },
    upgradeTracks: [
      { id: 'cooldown', label: 'Orbit Refresh', shortLabel: 'CD', description: 'Senkt die Abklingzeit.', baseCost: 78, costStep: 44, maxLevel: 6, format: (v) => `${v.toFixed(1)}s` },
      { id: 'duration', label: 'Sustain Loop', shortLabel: 'Dur', description: 'Verlängert die Orbit-Dauer.', baseCost: 72, costStep: 40, maxLevel: 5, format: (v) => `${v.toFixed(1)}s` },
      { id: 'potency', label: 'Orb Lattice', shortLabel: 'Orb', description: 'Mehr Orbs und mehr Schaden.', baseCost: 110, costStep: 64, maxLevel: 5, format: (v, levels) => `${v.toFixed(1)} dmg · ${3 + Math.floor((levels.potency || 0) / 2)} Orbs` },
    ],
    resolveConfig(levels = {}) {
      const potencyLevel = levels.potency || 0;
      return {
        cooldown: Math.max(5.4, 10 - (levels.cooldown || 0) * 0.7),
        duration: 5.5 + (levels.duration || 0) * 0.8,
        orbCount: 3 + Math.floor(potencyLevel / 2),
        orbitRadius: 2.15 + potencyLevel * 0.08,
        orbitHeight: 1.25,
        orbitSpeed: 2.8 + potencyLevel * 0.08,
        hitRadius: 1.25 + potencyLevel * 0.06,
        hitInterval: Math.max(0.18, 0.28 - potencyLevel * 0.015),
        damage: 3.4 + potencyLevel * 0.65,
      };
    },
    getTrackValue(trackId, levels = {}) {
      const config = this.resolveConfig(levels);
      if (trackId === 'cooldown') return config.cooldown;
      if (trackId === 'duration') return config.duration;
      if (trackId === 'potency') return config.damage;
      return 0;
    },
  },
  {
    id: 'execution_mode',
    name: 'Execution Mode',
    label: 'Execution Mode',
    shortLabel: 'Exec',
    description: 'Aktiviert eine eigenständige Execution-Aura, die Finish-Schaden und Kill-Fenster verbessert.',
    category: 'Finisher Burst',
    icon: '✦',
    symbol: 'EX',
    hudColor: 0xff86ac,
    visualStyle: {
      primary: 0xff86ac,
      secondary: 0xffdbe9,
      tertiary: 0x4d1527,
      aura: 0xffa9c3,
    },
    balanceTags: ['finisher', 'burst', 'execute'],
    unlock: { defaultUnlocked: true },
    baseStats: {
      cooldown: 8,
      duration: 4,
      thresholdRatio: 0.38,
      thresholdFlat: 18,
      bonusRatio: 0.42,
      minimumBonus: 4,
    },
    upgradeTracks: [
      { id: 'cooldown', label: 'Cycle Compression', shortLabel: 'CD', description: 'Senkt die Abklingzeit.', baseCost: 74, costStep: 42, maxLevel: 6, format: (v) => `${v.toFixed(1)}s` },
      { id: 'duration', label: 'Blood Window', shortLabel: 'Dur', description: 'Verlängert die aktive Aura.', baseCost: 68, costStep: 38, maxLevel: 5, format: (v) => `${v.toFixed(1)}s` },
      { id: 'potency', label: 'Kill Pressure', shortLabel: 'Exec', description: 'Erhöht Finisher-Bonus und Threshold.', baseCost: 96, costStep: 58, maxLevel: 5, format: (v) => `+${Math.round(v * 100)}% bonus` },
    ],
    resolveConfig(levels = {}) {
      const potencyLevel = levels.potency || 0;
      return {
        cooldown: Math.max(4.2, 8 - (levels.cooldown || 0) * 0.58),
        duration: 4 + (levels.duration || 0) * 0.65,
        thresholdRatio: 0.38 + potencyLevel * 0.03,
        thresholdFlat: 18 + potencyLevel * 2.4,
        bonusRatio: 0.42 + potencyLevel * 0.07,
        minimumBonus: 4 + potencyLevel * 1.3,
      };
    },
    getTrackValue(trackId, levels = {}) {
      const config = this.resolveConfig(levels);
      if (trackId === 'cooldown') return config.cooldown;
      if (trackId === 'duration') return config.duration;
      if (trackId === 'potency') return config.bonusRatio;
      return 0;
    },
  },
];

export const SPECIAL_ABILITY_DEFS_BY_ID = Object.fromEntries(SPECIAL_ABILITY_DEFS.map((def) => [def.id, def]));

export function getDefaultSpecialAbilityId() {
  return SPECIAL_ABILITY_DEFS[0]?.id || null;
}

export function getSpecialAbilityDef(id, fallbackId = getDefaultSpecialAbilityId()) {
  return SPECIAL_ABILITY_DEFS_BY_ID[id]
    || SPECIAL_ABILITY_DEFS_BY_ID[fallbackId]
    || SPECIAL_ABILITY_DEFS[0]
    || null;
}

export function resolveSpecialAbilityId(id, fallbackId = getDefaultSpecialAbilityId()) {
  return getSpecialAbilityDef(id, fallbackId)?.id || null;
}

export function createDefaultSpecialAbilityProfile() {
  return {
    selectedId: getDefaultSpecialAbilityId(),
    unlocked: Object.fromEntries(SPECIAL_ABILITY_DEFS.map((def) => [def.id, !!def.unlock?.defaultUnlocked])),
    upgrades: Object.fromEntries(SPECIAL_ABILITY_DEFS.map((def) => [
      def.id,
      Object.fromEntries((def.upgradeTracks || []).map((track) => [track.id, 0])),
    ])),
  };
}

export function getSpecialAbilityUpgradeTrack(def, trackId) {
  return (def?.upgradeTracks || []).find((track) => track.id === trackId) || null;
}
