import { getEnemyData, logInvalidEnemyReference, removeInvalidEnemiesFromList } from './enemyRuntimeUtils.js';

const COLLIDER_EPSILON = 0.0001;
const DEBUG_COLORS = {
  blocking: 0xff6b6b,
  decorative: 0x4cc9f0,
  warning: 0xffc857,
};

export function createCollisionSystem({ THREE, gameplayConfig, state, getPlayerPosition, SAFETY_LIMITS, debugRoot = null }) {
  const enemySpatialGrid = new Map();
  const debugGroup = new THREE.Group();
  debugGroup.name = 'worldColliderDebug';
  debugGroup.visible = false;
  if (debugRoot) debugRoot.add(debugGroup);

  let debugDirty = false;

  function clearDebugMeshes() {
    while (debugGroup.children.length) {
      const child = debugGroup.children[debugGroup.children.length - 1];
      debugGroup.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
  }

  function resetWorldAudit() {
    state.world.objects = [];
    state.world.audit = {
      blockingObjects: 0,
      decorativeObjects: 0,
      blockingColliders: 0,
      totalColliders: 0,
      missingColliderObjects: [],
      colliderWarnings: [],
    };
  }

  function clearColliders() {
    state.world.colliders.length = 0;
    clearDebugMeshes();
    resetWorldAudit();
    debugDirty = true;
  }

  function normalizeCollider(descriptorOrX, z, radius) {
    if (typeof descriptorOrX === 'number') {
      return {
        type: 'circle',
        x: descriptorOrX,
        z,
        radius,
        source: 'legacy-circle',
        blocking: true,
        rotation: 0,
      };
    }

    const descriptor = { ...descriptorOrX };
    descriptor.type = descriptor.type === 'rect' ? 'rect' : 'circle';
    descriptor.blocking = descriptor.blocking !== false;
    descriptor.rotation = descriptor.rotation ?? 0;
    descriptor.source = descriptor.source ?? 'world';

    if (descriptor.type === 'circle') {
      descriptor.radius = Math.max(COLLIDER_EPSILON, descriptor.radius ?? 0);
    } else {
      descriptor.width = Math.max(COLLIDER_EPSILON, descriptor.width ?? 0);
      descriptor.depth = Math.max(COLLIDER_EPSILON, descriptor.depth ?? 0);
    }

    return descriptor;
  }

  function cloneShape(shape) {
    if (!shape) return null;
    return { ...shape };
  }

  function addAuditWarning(source, message) {
    state.world.audit.colliderWarnings.push({ source, message });
  }

  function getShapeCenterOffset(a, b) {
    return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
  }

  function validateColliderAgainstFootprint(source, collider, footprint) {
    if (!footprint) return;
    const offset = getShapeCenterOffset(collider, footprint);
    if (offset > 0.45) addAuditWarning(source, `Collider center offset ${offset.toFixed(2)}m exceeds tolerance.`);

    if (collider.type === 'circle' && footprint.type === 'circle') {
      const ratio = collider.radius / Math.max(COLLIDER_EPSILON, footprint.radius);
      if (ratio < 0.55 || ratio > 1.35) addAuditWarning(source, `Circle collider radius ratio ${ratio.toFixed(2)} looks implausible.`);
      return;
    }

    if (collider.type === 'rect' && footprint.type === 'rect') {
      const widthRatio = collider.width / Math.max(COLLIDER_EPSILON, footprint.width);
      const depthRatio = collider.depth / Math.max(COLLIDER_EPSILON, footprint.depth);
      const angleDelta = Math.abs(Math.atan2(Math.sin(collider.rotation - footprint.rotation), Math.cos(collider.rotation - footprint.rotation)));
      if (widthRatio < 0.55 || widthRatio > 1.35 || depthRatio < 0.55 || depthRatio > 1.35) {
        addAuditWarning(source, `Rect collider size ratios ${widthRatio.toFixed(2)} / ${depthRatio.toFixed(2)} look implausible.`);
      }
      if (angleDelta > 0.3) addAuditWarning(source, `Rect collider rotation offset ${(angleDelta * 180 / Math.PI).toFixed(1)}° exceeds tolerance.`);
      return;
    }

    addAuditWarning(source, `Collider type ${collider.type} differs from footprint type ${footprint.type}.`);
  }

  function registerCollider(descriptorOrX, z, radius) {
    const collider = normalizeCollider(descriptorOrX, z, radius);
    state.world.colliders.push(collider);
    state.world.audit.totalColliders = state.world.colliders.length;
    state.world.audit.blockingColliders = state.world.colliders.filter((entry) => entry.blocking).length;
    debugDirty = true;
    return collider;
  }

  function registerWorldObject({ source, blocking = false, footprint = null, collider = null }) {
    const record = {
      source,
      blocking: Boolean(blocking),
      footprint: cloneShape(footprint),
      collider: null,
      hasCollider: false,
    };

    if (record.blocking) state.world.audit.blockingObjects += 1;
    else state.world.audit.decorativeObjects += 1;

    if (collider) {
      const registeredCollider = registerCollider({ ...collider, source, blocking });
      record.collider = cloneShape(registeredCollider);
      record.hasCollider = true;
      validateColliderAgainstFootprint(source, registeredCollider, footprint);
    } else if (record.blocking) {
      state.world.audit.missingColliderObjects.push(source);
    }

    state.world.objects.push(record);
    return record;
  }

  function finalizeWorldAudit() {
    state.world.audit.totalColliders = state.world.colliders.length;
    state.world.audit.blockingColliders = state.world.colliders.filter((entry) => entry.blocking).length;
    state.world.audit.missingColliderObjects = [...new Set(state.world.audit.missingColliderObjects)];
    return getWorldAuditSnapshot();
  }

  function getWorldAuditSnapshot() {
    return {
      blockingObjects: state.world.audit.blockingObjects,
      decorativeObjects: state.world.audit.decorativeObjects,
      blockingColliders: state.world.audit.blockingColliders,
      totalColliders: state.world.audit.totalColliders,
      missingColliderObjects: [...state.world.audit.missingColliderObjects],
      colliderWarnings: state.world.audit.colliderWarnings.map((entry) => ({ ...entry })),
    };
  }

  function rotateIntoLocalSpace(x, z, collider) {
    const dx = x - collider.x;
    const dz = z - collider.z;
    const cos = Math.cos(collider.rotation);
    const sin = Math.sin(collider.rotation);
    return {
      x: (dx * cos) + (dz * sin),
      z: (-dx * sin) + (dz * cos),
    };
  }

  function rotateIntoWorldSpace(x, z, collider) {
    const cos = Math.cos(collider.rotation);
    const sin = Math.sin(collider.rotation);
    return {
      x: (x * cos) - (z * sin),
      z: (x * sin) + (z * cos),
    };
  }

  function resolveCircleCollider(position, radius, collider) {
    const dx = position.x - collider.x;
    const dz = position.z - collider.z;
    const dist = Math.hypot(dx, dz) || COLLIDER_EPSILON;
    const overlap = radius + collider.radius - dist;
    if (overlap <= 0) return false;
    position.x += (dx / dist) * overlap;
    position.z += (dz / dist) * overlap;
    return true;
  }

  function resolveRectCollider(position, radius, collider) {
    const local = rotateIntoLocalSpace(position.x, position.z, collider);
    const halfWidth = (collider.width * 0.5) + radius;
    const halfDepth = (collider.depth * 0.5) + radius;
    const overlapX = halfWidth - Math.abs(local.x);
    const overlapZ = halfDepth - Math.abs(local.z);

    if (overlapX <= 0 || overlapZ <= 0) return false;

    let pushLocalX = 0;
    let pushLocalZ = 0;
    if (overlapX < overlapZ) pushLocalX = local.x >= 0 ? overlapX : -overlapX;
    else pushLocalZ = local.z >= 0 ? overlapZ : -overlapZ;

    if (pushLocalX === 0 && pushLocalZ === 0) pushLocalX = halfWidth;

    const pushWorld = rotateIntoWorldSpace(pushLocalX, pushLocalZ, collider);
    position.x += pushWorld.x;
    position.z += pushWorld.z;
    return true;
  }

  function resolveWorldCollision(position, radius) {
    for (let iteration = 0; iteration < 3; iteration++) {
      let moved = false;
      for (const collider of state.world.colliders) {
        if (!collider.blocking) continue;
        const collided = collider.type === 'rect'
          ? resolveRectCollider(position, radius, collider)
          : resolveCircleCollider(position, radius, collider);
        if (collided) moved = true;
      }
      if (!moved) break;
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

  function intersectsCollider(x, z, radius, collider) {
    if (!collider.blocking) return false;
    if (collider.type === 'circle') {
      const dx = x - collider.x;
      const dz = z - collider.z;
      const combined = collider.radius + radius;
      return (dx * dx) + (dz * dz) < combined * combined;
    }

    const local = rotateIntoLocalSpace(x, z, collider);
    return Math.abs(local.x) < (collider.width * 0.5) + radius
      && Math.abs(local.z) < (collider.depth * 0.5) + radius;
  }

  function isPointValidForPickup(point, radius = 1.1) {
    for (const collider of state.world.colliders) {
      if (intersectsCollider(point.x, point.z, radius, collider)) return false;
    }
    const playerPosition = getPlayerPosition();
    return Math.hypot(point.x - playerPosition.x, point.z - playerPosition.z) >= 5;
  }

  function intersectSegmentCircle(from, to, radius, collider) {
    const combinedRadius = collider.radius + radius;
    const dX = to.x - from.x;
    const dZ = to.z - from.z;
    const fX = from.x - collider.x;
    const fZ = from.z - collider.z;

    const a = (dX * dX) + (dZ * dZ);
    const b = 2 * ((fX * dX) + (fZ * dZ));
    const c = (fX * fX) + (fZ * fZ) - (combinedRadius * combinedRadius);
    const discriminant = (b * b) - (4 * a * c);
    if (a <= COLLIDER_EPSILON || discriminant < 0) return null;

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const invDenominator = 1 / (2 * a);
    const t1 = (-b - sqrtDiscriminant) * invDenominator;
    const t2 = (-b + sqrtDiscriminant) * invDenominator;
    const t = [t1, t2].find((value) => value >= 0 && value <= 1);
    if (t === undefined) return null;

    return {
      t,
      x: from.x + (dX * t),
      z: from.z + (dZ * t),
    };
  }

  function intersectSegmentRect(from, to, radius, collider) {
    const localFrom = rotateIntoLocalSpace(from.x, from.z, collider);
    const localTo = rotateIntoLocalSpace(to.x, to.z, collider);
    const dX = localTo.x - localFrom.x;
    const dZ = localTo.z - localFrom.z;
    const halfWidth = (collider.width * 0.5) + radius;
    const halfDepth = (collider.depth * 0.5) + radius;

    let tMin = 0;
    let tMax = 1;

    const slabs = [
      { start: localFrom.x, delta: dX, min: -halfWidth, max: halfWidth },
      { start: localFrom.z, delta: dZ, min: -halfDepth, max: halfDepth },
    ];

    for (const slab of slabs) {
      if (Math.abs(slab.delta) <= COLLIDER_EPSILON) {
        if (slab.start < slab.min || slab.start > slab.max) return null;
        continue;
      }

      const invDelta = 1 / slab.delta;
      let t1 = (slab.min - slab.start) * invDelta;
      let t2 = (slab.max - slab.start) * invDelta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }

    if (tMin < 0 || tMin > 1) return null;

    const hitLocalX = localFrom.x + (dX * tMin);
    const hitLocalZ = localFrom.z + (dZ * tMin);
    const hitWorld = rotateIntoWorldSpace(hitLocalX, hitLocalZ, collider);
    return {
      t: tMin,
      x: collider.x + hitWorld.x,
      z: collider.z + hitWorld.z,
    };
  }

  function getProjectileWorldImpact(from, to, radius = 0.18) {
    let nearestHit = null;
    let nearestT = Infinity;

    for (const collider of state.world.colliders) {
      if (!collider.blocking) continue;
      const hit = collider.type === 'rect'
        ? intersectSegmentRect(from, to, radius, collider)
        : intersectSegmentCircle(from, to, radius, collider);
      if (!hit || hit.t >= nearestT) continue;
      nearestT = hit.t;
      nearestHit = { x: hit.x, z: hit.z, source: collider.source, type: collider.type };
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

  function buildDebugMeshForCollider(collider) {
    const color = collider.blocking ? DEBUG_COLORS.blocking : DEBUG_COLORS.decorative;
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });

    if (collider.type === 'circle') {
      const points = [];
      const segments = 24;
      for (let idx = 0; idx <= segments; idx++) {
        const angle = (idx / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * collider.radius,
          0.05,
          Math.sin(angle) * collider.radius,
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const loop = new THREE.LineLoop(geometry, material);
      loop.position.set(collider.x, 0, collider.z);
      return loop;
    }

    const halfWidth = collider.width * 0.5;
    const halfDepth = collider.depth * 0.5;
    const points = [
      new THREE.Vector3(-halfWidth, 0.05, -halfDepth),
      new THREE.Vector3(halfWidth, 0.05, -halfDepth),
      new THREE.Vector3(halfWidth, 0.05, halfDepth),
      new THREE.Vector3(-halfWidth, 0.05, halfDepth),
      new THREE.Vector3(-halfWidth, 0.05, -halfDepth),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const loop = new THREE.Line(geometry, material);
    loop.position.set(collider.x, 0, collider.z);
    loop.rotation.y = collider.rotation;
    return loop;
  }

  function rebuildDebugMeshes() {
    clearDebugMeshes();
    for (const collider of state.world.colliders) debugGroup.add(buildDebugMeshForCollider(collider));

    for (const issue of state.world.audit.missingColliderObjects) {
      const markerMaterial = new THREE.MeshBasicMaterial({ color: DEBUG_COLORS.warning, transparent: true, opacity: 0.4 });
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), markerMaterial);
      const objectRecord = state.world.objects.find((entry) => entry.source === issue);
      const footprint = objectRecord?.footprint;
      marker.position.set(footprint?.x ?? 0, 0.06, footprint?.z ?? 0);
      debugGroup.add(marker);
    }

    debugDirty = false;
  }

  function syncDebugVisualization(enabled = state.performance.debugEnabled) {
    debugGroup.visible = Boolean(enabled);
    if (!debugGroup.visible) return;
    if (debugDirty) rebuildDebugMeshes();
  }

  function getWorldDebugLines() {
    const audit = getWorldAuditSnapshot();
    const missing = audit.missingColliderObjects.length
      ? audit.missingColliderObjects.slice(0, 3).join(', ')
      : 'none';
    return [
      `World block ${audit.blockingObjects}`,
      `World colliders ${audit.blockingColliders}/${audit.totalColliders}`,
      `Missing colliders ${audit.missingColliderObjects.length} (${missing})`,
      `Collider warnings ${audit.colliderWarnings.length}`,
    ];
  }

  clearColliders();

  return {
    addCollider: registerCollider,
    registerCollider,
    registerWorldObject,
    finalizeWorldAudit,
    getWorldAuditSnapshot,
    getWorldDebugLines,
    clearColliders,
    resolveWorldCollision,
    randomArenaPoint,
    isOutsideArenaBounds,
    isPointValidForPickup,
    getProjectileWorldImpact,
    rebuildEnemySpatialGrid,
    forEachEnemyNearPosition,
    clearEnemySpatialGrid,
    syncDebugVisualization,
  };
}
