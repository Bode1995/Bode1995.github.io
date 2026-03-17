import { ENTITY_SPEED_MULTIPLIER } from '../core/config.js';
import { rand } from '../core/utils.js';

const ARCHETYPES = [
  {
    kind: 'scout',
    chance: 0.52,
    bodyRadius: [12, 15],
    hp: [20, 32],
    speed: [120, 155],
    damage: 9,
    color: '#ff756e',
    accent: '#ffd4bc',
    wobble: 0.8,
  },
  {
    kind: 'brute',
    chance: 0.28,
    bodyRadius: [17, 21],
    hp: [55, 82],
    speed: [72, 96],
    damage: 18,
    color: '#a856ff',
    accent: '#f1ceff',
    wobble: 0.35,
  },
  {
    kind: 'spitter',
    chance: 0.2,
    bodyRadius: [13, 16],
    hp: [28, 42],
    speed: [88, 122],
    damage: 13,
    color: '#48d6a8',
    accent: '#b5ffde',
    wobble: 1.15,
  },
];

export function enemiesForWave(wave) {
  return 5 + Math.floor(wave * 2);
}

function pickArchetype(wave) {
  const unlocked = ARCHETYPES.filter((a) => {
    if (a.kind === 'brute') return wave >= 2;
    if (a.kind === 'spitter') return wave >= 3;
    return true;
  });

  const total = unlocked.reduce((sum, a) => sum + a.chance, 0);
  let roll = Math.random() * total;
  for (const a of unlocked) {
    roll -= a.chance;
    if (roll <= 0) return a;
  }
  return unlocked[0];
}

export function createEnemy(width, height, wave) {
  const side = Math.floor(rand(0, 4));
  let x;
  let y;
  if (side === 0) {
    x = rand(-100, width + 100);
    y = -85;
  } else if (side === 1) {
    x = width + 85;
    y = rand(-100, height + 100);
  } else if (side === 2) {
    x = rand(-100, width + 100);
    y = height + 85;
  } else {
    x = -85;
    y = rand(-100, height + 100);
  }

  const a = pickArchetype(wave);
  const r = rand(a.bodyRadius[0], a.bodyRadius[1]);

  return {
    kind: a.kind,
    x,
    y,
    r,
    hp: rand(a.hp[0], a.hp[1]) + wave * (a.kind === 'brute' ? 5 : 3),
    speed: (rand(a.speed[0], a.speed[1]) + wave * 2) * ENTITY_SPEED_MULTIPLIER,
    damage: a.damage,
    color: a.color,
    accent: a.accent,
    wobble: a.wobble,
    t: Math.random() * 10,
  };
}
