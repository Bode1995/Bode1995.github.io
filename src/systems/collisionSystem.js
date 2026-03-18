import { getEnemyData, logInvalidEnemyReference, removeInvalidEnemiesFromList } from './enemyRuntimeUtils.js';

export function createCollisionSystem({ THREE, gameplayConfig, state, getPlayerPosition, SAFETY_LIMITS }) {
  const enemySpatialGrid = new Map();

  function addCollider(x, z, radius) {
    state.world.colliders.push({ x, z, radius });
  }

  function resolveWorldCollision(position, radius) {
    for (const collider of state.world.colliders) {
      const dx = position.x - collider.x;
      const dz = position.z - collider.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const overlap = radius + collider.radius - dist;
      if (overlap > 0) {
        position.x += (dx / dist) * overlap;
        position.z += (dz / dist) * overlap;
      }
    }
  }

  function randomArenaPoint(padding = 4) {
    const half = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - padding;
    return new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(half * 2),
      0,
      THREE.MathUtils.randFloatSpread(half * 2),
    );
  }

  function isOutsideArenaBounds(position, padding = 0) {
    const half = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding + padding;
    return Math.abs(position.x) > half || Math.abs(position.z) > half;
  }

  function isPointValidForPickup(point, radius = 1.1) {
    for (const collider of state.world.colliders) {
      if (Math.hypot(point.x - collider.x, point.z - collider.z) < collider.radius + radius) return false;
    }
    const playerPosition = getPlayerPosition();
    return Math.hypot(point.x - playerPosition.x, point.z - playerPosition.z) >= 5;
  }

  function getProjectileWorldImpact(from, to, radius = 0.18) {
    const segX = to.x - from.x;
    const segZ = to.z - from.z;
    const segLenSq = segX * segX + segZ * segZ;
    let nearestHit = null;
    let nearestT = Infinity;

    for (const collider of state.world.colliders) {
      const combinedRadius = collider.radius + radius;
      let t = 0;
      if (segLenSq > 0.000001) {
        t = ((collider.x - from.x) * segX + (collider.z - from.z) * segZ) / segLenSq;
        t = THREE.MathUtils.clamp(t, 0, 1);
      }
      const hitX = from.x + segX * t;
      const hitZ = from.z + segZ * t;
      const dx = hitX - collider.x;
      const dz = hitZ - collider.z;
      if ((dx * dx) + (dz * dz) > combinedRadius * combinedRadius || t >= nearestT) continue;
      nearestT = t;
      nearestHit = { x: hitX, z: hitZ };
    }

    return nearestHit;
  }

  function getGridCellCoord(value) {
    return Math.floor(value / SAFETY_LIMITS.broadphaseCellSize);
  }

  function rebuildEnemySpatialGrid() {
    enemySpatialGrid.clear();
    removeInvalidEnemiesFromList(state.entities.enemies, state, 'collision.rebuildEnemySpatialGrid');
    for (const enemy of state.entities.enemies) {
      const data = getEnemyData(enemy);
      if (!data) {
        logInvalidEnemyReference(state, 'collision.rebuildEnemySpatialGrid.loop', enemy);
        continue;
      }
      if (data.dead) continue;
      const cellX = getGridCellCoord(enemy.position.x);
      const cellZ = getGridCellCoord(enemy.position.z);
      const key = `${cellX}:${cellZ}`;
      const bucket = enemySpatialGrid.get(key);
      if (bucket) bucket.push(enemy);
      else enemySpatialGrid.set(key, [enemy]);
      data.gridCellX = cellX;
      data.gridCellZ = cellZ;
    }
  }

  function forEachEnemyNearPosition(position, radius, callback, maxCells = SAFETY_LIMITS.broadphaseMaxCellsPerQuery) {
    const minX = getGridCellCoord(position.x - radius);
    const maxX = getGridCellCoord(position.x + radius);
    const minZ = getGridCellCoord(position.z - radius);
    const maxZ = getGridCellCoord(position.z + radius);
    let visitedCells = 0;
    for (let cellX = minX; cellX <= maxX; cellX++) {
      for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
        visitedCells += 1;
        if (visitedCells > maxCells) return;
        const bucket = enemySpatialGrid.get(`${cellX}:${cellZ}`);
        if (!bucket) continue;
        for (let idx = bucket.length - 1; idx >= 0; idx--) {
          const enemy = bucket[idx];
          const data = getEnemyData(enemy);
          if (!data || data.dead) {
            if (!data) logInvalidEnemyReference(state, 'collision.forEachEnemyNearPosition.bucket', enemy);
            bucket.splice(idx, 1);
            continue;
          }
          if (callback(enemy) === false) return;
        }
        if (bucket.length === 0) enemySpatialGrid.delete(`${cellX}:${cellZ}`);
      }
    }
  }

  function clearEnemySpatialGrid() {
    enemySpatialGrid.clear();
  }

  return {
    addCollider,
    resolveWorldCollision,
    randomArenaPoint,
    isOutsideArenaBounds,
    isPointValidForPickup,
    getProjectileWorldImpact,
    rebuildEnemySpatialGrid,
    forEachEnemyNearPosition,
    clearEnemySpatialGrid,
  };
}
