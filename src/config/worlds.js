export const WORLD_STATUS_KEYS = {
  fire: 'fireDot',
  ice: 'iceSlowTimer',
  poison: 'poisonDot',
  lightning: 'shockTimer',
};

function createResistanceProfile({ application = 1, tickDamage = 1, slowEffect = 1, duration = 1, synergy = 1 } = {}) {
  return { application, tickDamage, slowEffect, duration, synergy };
}

function createWorldDefinition(config) {
  return {
    hudBadge: 'Standard',
    menuLabel: 'Orbital Cluster',
    campaignGroupId: 'earth',
    enemyVisuals: {
      variant: 'standard',
      palette: {
        shell: 0xffffff,
        dark: 0xffffff,
        main: 0xffffff,
        glow: 0xffffff,
        aura: 0xffffff,
      },
      emissiveBoost: 1,
      projectileColor: 0xff8cf6,
    },
    enemyModifiers: {
      healthMultiplier: 1,
      speedMultiplier: 1,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      projectileSpeedMultiplier: 1,
      aggression: 1,
      signalIntensity: 1,
    },
    resistances: {
      fireDot: createResistanceProfile(),
      iceSlowTimer: createResistanceProfile(),
      poisonDot: createResistanceProfile(),
      shockTimer: createResistanceProfile(),
    },
    ...config,
  };
}

export const WORLD_DEFS = {
  1: createWorldDefinition({
    id: 1,
    key: 'frontier',
    themeName: 'Frontier Outpost',
    menuLabel: 'Orbital Cluster',
    hudBadge: 'Standard',
    environment: {
      style: 'frontier',
      groundBase: 0x6b665d,
      detailA: 0xb9b1a2,
      detailB: 0x6f8758,
      accent: 0xf0d6a0,
      atmosphere: {
        background: 0xc9d7d7,
        fogNear: 60,
        fogFar: 162,
        hemisphereSky: 0xeaf3ff,
        hemisphereGround: 0x8b7a65,
        hemisphereIntensity: 1.05,
        keyLightColor: 0xfff0d2,
        keyLightIntensity: 2.1,
        fillLightColor: 0xc6dcff,
        fillLightIntensity: 0.62,
        bounceLightColor: 0xf1c89d,
        bounceLightIntensity: 0.28,
        exposure: 1.16,
      },
      arena: {
        base: 0x8a816f,
        underside: 0x645b4d,
        ring: 0x746c5e,
      },
    },
    enemyVisuals: {
      variant: 'standard',
      palette: {
        shell: 0xf3cdb0,
        dark: 0x3b2f3b,
        main: 0x7282a1,
        glow: 0xc5f2ff,
        aura: 0xffd78a,
      },
      emissiveBoost: 1,
      projectileColor: 0xff8cf6,
    },
  }),
  2: createWorldDefinition({
    id: 2,
    key: 'lava',
    themeName: 'Ember Caldera',
    menuLabel: 'Lava',
    hudBadge: 'Feuerresistenz',
    environment: {
      style: 'lava',
      groundBase: 0x221814,
      detailA: 0x4d3328,
      detailB: 0xff6b24,
      accent: 0xffc35b,
      atmosphere: {
        background: 0x2a1714,
        fogNear: 28,
        fogFar: 112,
        hemisphereSky: 0xffc28a,
        hemisphereGround: 0x2c130f,
        hemisphereIntensity: 0.92,
        keyLightColor: 0xff9556,
        keyLightIntensity: 2.45,
        fillLightColor: 0xff5c2f,
        fillLightIntensity: 0.48,
        bounceLightColor: 0xffb15a,
        bounceLightIntensity: 0.46,
        exposure: 1.08,
      },
      arena: {
        base: 0x4a2b20,
        underside: 0x2c1714,
        ring: 0xff6d2d,
      },
    },
    enemyVisuals: {
      variant: 'lava',
      palette: {
        shell: 0xff7a38,
        dark: 0x220f0b,
        main: 0x6e3d2e,
        glow: 0xffd16c,
        aura: 0xff6224,
      },
      emissiveBoost: 1.35,
      projectileColor: 0xff8346,
    },
    enemyModifiers: {
      healthMultiplier: 1.12,
      speedMultiplier: 1.02,
      damageMultiplier: 1.08,
      fireRateMultiplier: 1.08,
      projectileSpeedMultiplier: 1.12,
      aggression: 1.12,
      signalIntensity: 1.2,
    },
    elementalResistance: 'fireDot',
    resistances: {
      fireDot: createResistanceProfile({ application: 0.38, tickDamage: 0.42, duration: 0.62, synergy: 0.76 }),
      iceSlowTimer: createResistanceProfile(),
      poisonDot: createResistanceProfile(),
      shockTimer: createResistanceProfile(),
    },
  }),
  3: createWorldDefinition({
    id: 3,
    key: 'ice',
    themeName: 'Cryo Shelf',
    menuLabel: 'Eis',
    hudBadge: 'Eisresistenz',
    environment: {
      style: 'ice',
      groundBase: 0x516274,
      detailA: 0x93aec4,
      detailB: 0x7cd8ff,
      accent: 0xd4ebf7,
      atmosphere: {
        background: 0x9fb6cb,
        fogNear: 40,
        fogFar: 150,
        hemisphereSky: 0xf2fbff,
        hemisphereGround: 0x6a87a3,
        hemisphereIntensity: 1.18,
        keyLightColor: 0xe9f7ff,
        keyLightIntensity: 1.86,
        fillLightColor: 0x98cbff,
        fillLightIntensity: 0.82,
        bounceLightColor: 0xd7f2ff,
        bounceLightIntensity: 0.34,
        exposure: 1.08,
      },
      arena: {
        base: 0x5b6f82,
        underside: 0x3e5367,
        ring: 0xb8d5e6,
      },
    },
    enemyVisuals: {
      variant: 'ice',
      palette: {
        shell: 0xa3e6ff,
        dark: 0x152a46,
        main: 0x5b88b8,
        glow: 0xeafcff,
        aura: 0x87d7ff,
      },
      emissiveBoost: 1.1,
      projectileColor: 0x92dcff,
    },
    enemyModifiers: {
      healthMultiplier: 1.06,
      speedMultiplier: 0.92,
      damageMultiplier: 1.02,
      fireRateMultiplier: 0.94,
      projectileSpeedMultiplier: 0.92,
      aggression: 0.9,
      signalIntensity: 0.96,
    },
    elementalResistance: 'iceSlowTimer',
    resistances: {
      fireDot: createResistanceProfile(),
      iceSlowTimer: createResistanceProfile({ application: 0.32, slowEffect: 0.4, duration: 0.52, synergy: 0.7 }),
      poisonDot: createResistanceProfile(),
      shockTimer: createResistanceProfile(),
    },
  }),
  4: createWorldDefinition({
    id: 4,
    key: 'poison',
    themeName: 'Venom Bloom',
    menuLabel: 'Gift',
    hudBadge: 'Giftresistenz',
    environment: {
      style: 'poison',
      groundBase: 0x1a2316,
      detailA: 0x30432a,
      detailB: 0x8aff5f,
      accent: 0xc9ff84,
      atmosphere: {
        background: 0x172215,
        fogNear: 24,
        fogFar: 108,
        hemisphereSky: 0x96ff9c,
        hemisphereGround: 0x121b10,
        hemisphereIntensity: 0.98,
        keyLightColor: 0xb6ff7a,
        keyLightIntensity: 1.95,
        fillLightColor: 0x4ad468,
        fillLightIntensity: 0.56,
        bounceLightColor: 0x7cf28a,
        bounceLightIntensity: 0.38,
        exposure: 1.04,
      },
      arena: {
        base: 0x38462d,
        underside: 0x1d2818,
        ring: 0x96ff67,
      },
    },
    enemyVisuals: {
      variant: 'poison',
      palette: {
        shell: 0x8eff62,
        dark: 0x101d11,
        main: 0x37653c,
        glow: 0xc6ff7f,
        aura: 0x52f08a,
      },
      emissiveBoost: 1.18,
      projectileColor: 0x8cff80,
    },
    enemyModifiers: {
      healthMultiplier: 0.98,
      speedMultiplier: 1.08,
      damageMultiplier: 1.04,
      fireRateMultiplier: 1.12,
      projectileSpeedMultiplier: 1.02,
      aggression: 1.18,
      signalIntensity: 1.14,
    },
    elementalResistance: 'poisonDot',
    resistances: {
      fireDot: createResistanceProfile(),
      iceSlowTimer: createResistanceProfile(),
      poisonDot: createResistanceProfile({ application: 0.36, tickDamage: 0.4, duration: 0.58, synergy: 0.74 }),
      shockTimer: createResistanceProfile(),
    },
  }),
};

export function getWorldDefinition(worldIndex = 1) {
  return WORLD_DEFS[worldIndex] || WORLD_DEFS[1];
}

export function getWorldStatusResistance(worldIndex, statusKey) {
  return getWorldDefinition(worldIndex).resistances?.[statusKey] || createResistanceProfile();
}

export function applyWorldStatusApplication(worldIndex, statusKey, amount) {
  return amount * getWorldStatusResistance(worldIndex, statusKey).application;
}

export function applyWorldStatusTickDamage(worldIndex, statusKey, amount) {
  return amount * getWorldStatusResistance(worldIndex, statusKey).tickDamage;
}

export function applyWorldStatusDuration(worldIndex, statusKey, amount) {
  return amount * getWorldStatusResistance(worldIndex, statusKey).duration;
}

export function applyWorldStatusSlow(worldIndex, statusKey, amount) {
  return amount * getWorldStatusResistance(worldIndex, statusKey).slowEffect;
}

export function applyWorldStatusSynergy(worldIndex, statusKey, amount) {
  return amount * getWorldStatusResistance(worldIndex, statusKey).synergy;
}
