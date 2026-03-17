import { PLAYER_MAX_HP } from '../core/config.js';

export function createPlayer(width, height) {
  return {
    x: width / 2,
    y: height / 2,
    r: 18,
    speed: 255,
    hp: PLAYER_MAX_HP,
    angle: -Math.PI / 2,
    inv: 0,
  };
}
