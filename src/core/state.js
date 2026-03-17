export function createInitialState() {
  return {
    running: false,
    player: null,
    bullets: [],
    enemies: [],
    particles: [],
    score: 0,
    wave: 1,
    spawnLeft: 0,
    fireCooldown: 0,
    flash: 0,
    last: 0,
    touch: {
      moveId: null,
      aimId: null,
      moveBase: { x: 0, y: 0 },
      aimBase: { x: 0, y: 0 },
      moveVec: { x: 0, y: 0 },
      aimVec: { x: 0, y: 0 },
      aiming: false,
    },
  };
}
