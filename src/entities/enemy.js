import { rand } from '../core/utils.js';

export function enemiesForWave(wave) {
  return 5 + Math.floor(wave * 1.8);
}

export function createEnemy(width, height, wave) {
  const side = Math.floor(rand(0, 4));
  let x;
  let y;
  if (side === 0) {
    x = rand(-40, width + 40);
    y = -35;
  } else if (side === 1) {
    x = width + 35;
    y = rand(-40, height + 40);
  } else if (side === 2) {
    x = rand(-40, width + 40);
    y = height + 35;
  } else {
    x = -35;
    y = rand(-40, height + 40);
  }

  const elite = Math.random() < Math.min(0.08 + wave * 0.012, 0.34);
  return {
    x,
    y,
    r: elite ? 19 : 14,
    hp: elite ? 55 + wave * 7 : 24 + wave * 4,
    speed: elite ? 70 + wave * 3.5 : 92 + wave * 4,
    damage: elite ? 18 : 11,
    color: elite ? '#ff7fb9' : '#ff5f7a',
  };
}
