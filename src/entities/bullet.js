export function createBullet(player, ax, ay) {
  const speed = 620;
  return {
    x: player.x + ax * 22,
    y: player.y + ay * 22,
    vx: ax * speed,
    vy: ay * speed,
    life: 0.95,
    r: 5,
  };
}
