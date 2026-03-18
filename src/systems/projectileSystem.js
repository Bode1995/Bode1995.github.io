import { getEnemyData, logInvalidEnemyReference } from './enemyRuntimeUtils.js';

export function createProjectileSystem({
  THREE,
  scene,
  state,
  performance,
  collision,
  vfx,
  temp,
  playerRigHolder,
  getAttackCooldown,
  getBaseDamage,
  getProjectileEffects,
  sceneResources,
}) {
  const bulletAssets = {
    standardGeometry: new THREE.SphereGeometry(0.18, 10, 10),
    rocketGeometry: new THREE.ConeGeometry(0.18, 0.52, 8),
    materialCache: new Map(),
  };

  function sanitizeProjectileCount(value) {
    if (Number.isNaN(value) || value <= 0) return sceneResources.RUN_BASE.projectileCount;
    if (!Number.isFinite(value)) return sceneResources.SAFETY_LIMITS.maxProjectileCount;
    return Math.min(sceneResources.SAFETY_LIMITS.maxProjectileCount, Math.floor(value));
  }

  function getSafeProjectileCountFromDoublers(stacks) {
    if (!Number.isFinite(stacks) || stacks <= 0) return sceneResources.RUN_BASE.projectileCount;
    const clampedStacks = Math.max(0, Math.floor(stacks));
    const maxDoublers = Math.floor(Math.log2(sceneResources.SAFETY_LIMITS.maxProjectileCount));
    if (clampedStacks >= maxDoublers) return sceneResources.SAFETY_LIMITS.maxProjectileCount;
    return sanitizeProjectileCount(sceneResources.RUN_BASE.projectileCount * (2 ** clampedStacks));
  }

  function getVolleyProfile(projectileCount = state.projectileCount) {
    const requestedCount = sanitizeProjectileCount(projectileCount);
    const perShotCap = state.performance.qualityLevel >= 2
      ? sceneResources.SAFETY_LIMITS.maxVisualProjectilesPerShotLowQuality
      : sceneResources.SAFETY_LIMITS.maxVisualProjectilesPerShot;
    const visualCount = Math.min(requestedCount, perShotCap);
    const volleyWeight = requestedCount / Math.max(1, visualCount);
    return {
      requestedCount,
      visualCount,
      volleyWeight,
      spread: Math.min(0.75, 0.11 * Math.log2(requestedCount)),
    };
  }

  function getBulletMaterial(effects) {
    const key = [effects.fire ? 1 : 0, effects.ice ? 1 : 0, effects.poison ? 1 : 0, effects.lightning ? 1 : 0, effects.rockets ? 1 : 0].join('');
    if (bulletAssets.materialCache.has(key)) return bulletAssets.materialCache.get(key);
    const bulletColor = new THREE.Color(0x9df9ff);
    if (effects.fire) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.fire), 0.5);
    if (effects.ice) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.ice), 0.42);
    if (effects.poison) bulletColor.lerp(new THREE.Color(0x86f46a), 0.38);
    if (effects.lightning) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.lightning), 0.35);
    if (effects.rockets) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.rockets), 0.45);
    const material = new THREE.MeshStandardMaterial({
      color: bulletColor,
      emissive: bulletColor,
      emissiveIntensity: effects.rockets ? 0.9 : 0.55,
      metalness: effects.rockets ? 0.35 : 0.1,
      roughness: 0.35,
    });
    bulletAssets.materialCache.set(key, material);
    return material;
  }

  function removeBulletAtIndex(index) {
    const bullet = state.entities.bullets[index];
    if (!bullet) return;
    scene.remove(bullet);
    state.entities.bullets.splice(index, 1);
  }

  function trimBulletsToLimit(limit) {
    while (state.entities.bullets.length > limit) removeBulletAtIndex(0);
  }

  function shoot() {
    if (state.fireCooldown > 0) return;
    state.fireCooldown = getAttackCooldown();
    const volley = getVolleyProfile(state.projectileCount);
    const baseYaw = state.yaw;
    const fx = getProjectileEffects();
    const perFrameSpawnCap = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxBulletsSpawnPerFrame, 0.7, 0.4);
    const remainingFrameBudget = Math.max(0, perFrameSpawnCap - state.performance.frameBudgets.bulletsSpawned);
    const maxActiveBullets = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxActiveBullets, 0.68, 0.42);
    const softActiveBullets = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxActiveBulletsSoft, 0.72, 0.48);
    const projectedSoftOverflow = Math.max(0, state.entities.bullets.length - softActiveBullets);
    const allowedVisualCount = Math.min(
      volley.visualCount,
      remainingFrameBudget,
      maxActiveBullets - state.entities.bullets.length,
      Math.max(1, volley.visualCount - projectedSoftOverflow),
    );

    if (allowedVisualCount <= 0) return;
    if (state.entities.bullets.length >= softActiveBullets) trimBulletsToLimit(softActiveBullets - 1);

    const yawSpread = Math.min(volley.spread, state.performance.qualityLevel >= 2 ? volley.spread * 0.9 : volley.spread);
    const geometry = fx.rockets ? bulletAssets.rocketGeometry : bulletAssets.standardGeometry;
    const material = getBulletMaterial(fx);
    const volleyWeight = volley.requestedCount / allowedVisualCount;

    for (let shot = 0; shot < allowedVisualCount; shot++) {
      const t = allowedVisualCount === 1 ? 0.5 : shot / Math.max(1, allowedVisualCount - 1);
      const yaw = baseYaw + THREE.MathUtils.lerp(-yawSpread, yawSpread, t - 0.5 + (allowedVisualCount === 1 ? 0 : 0.5));
      temp.vec3A.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      const bullet = new THREE.Mesh(geometry, material);
      bullet.position.copy(playerRigHolder.position).addScaledVector(temp.vec3A, 1.15).setY(1.35);
      if (fx.rockets) {
        bullet.rotation.x = Math.PI / 2;
        temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, temp.vec3A);
        bullet.quaternion.copy(temp.quatA);
      }
      bullet.userData.vel = temp.vec3B.copy(temp.vec3A).multiplyScalar(30).clone();
      bullet.userData.life = Math.min(sceneResources.SAFETY_LIMITS.maxBulletLifetime, 0.9 + Math.min(0.05, allowedVisualCount * 0.004));
      bullet.userData.damage = getBaseDamage() * volleyWeight;
      bullet.userData.effects = fx;
      bullet.userData.trailTick = state.performance.qualityLevel >= 2 ? 0.06 : 0.04;
      bullet.userData.volleyWeight = volleyWeight;
      scene.add(bullet);
      state.entities.bullets.push(bullet);
      state.performance.frameBudgets.bulletsSpawned += 1;
      if (state.entities.bullets.length >= maxActiveBullets) break;
    }

    trimBulletsToLimit(maxActiveBullets);
  }

  function update(dt, callbacks) {
    const bulletSoftRangeSq = sceneResources.SAFETY_LIMITS.bulletSoftRange * sceneResources.SAFETY_LIMITS.bulletSoftRange;
    const bulletHardRangeSq = sceneResources.SAFETY_LIMITS.bulletHardRange * sceneResources.SAFETY_LIMITS.bulletHardRange;

    for (let i = state.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = state.entities.bullets[i];
      if (!bullet?.userData?.vel) {
        removeBulletAtIndex(i);
        continue;
      }
      const prevX = bullet.position.x;
      const prevZ = bullet.position.z;
      bullet.userData.life -= dt;
      bullet.position.addScaledVector(bullet.userData.vel, dt);

      const worldImpact = collision.getProjectileWorldImpact({ x: prevX, z: prevZ }, bullet.position, 0.22);
      if (worldImpact) {
        bullet.position.set(worldImpact.x, bullet.position.y, worldImpact.z);
        vfx.spawnImpactEffects(bullet.position, bullet.userData.effects || getProjectileEffects());
        removeBulletAtIndex(i);
        continue;
      }

      const dxPlayer = bullet.position.x - playerRigHolder.position.x;
      const dzPlayer = bullet.position.z - playerRigHolder.position.z;
      const distPlayerSq = dxPlayer * dxPlayer + dzPlayer * dzPlayer;
      if (bullet.userData.life <= 0 || distPlayerSq > bulletHardRangeSq || collision.isOutsideArenaBounds(bullet.position, -0.75)) {
        removeBulletAtIndex(i);
        continue;
      }
      if (state.entities.bullets.length > performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxActiveBulletsSoft, 0.72, 0.48) && distPlayerSq > bulletSoftRangeSq) {
        removeBulletAtIndex(i);
        continue;
      }

      bullet.userData.trailTick -= dt;
      if (bullet.userData.trailTick <= 0) {
        bullet.userData.trailTick = state.performance.qualityLevel >= 2 ? 0.075 : 0.045;
        const fx = bullet.userData.effects || getProjectileEffects();
        const pos = bullet.position;
        if (fx.fire) vfx.maybeSpawnStatusVfx(pos, temp.vec3A.set((Math.random() - 0.5) * 0.35, 0.35 + Math.random() * 0.35, (Math.random() - 0.5) * 0.35), vfx.EFFECT_COLORS.fire, 0.3, 0.82);
        if (fx.ice && state.performance.qualityLevel <= 1) vfx.maybeSpawnStatusVfx(pos, temp.vec3A.set((Math.random() - 0.5) * 0.28, 0.16 + Math.random() * 0.22, (Math.random() - 0.5) * 0.28), vfx.EFFECT_COLORS.ice, 0.24, 0.74);
        if (fx.poison && state.performance.qualityLevel <= 1) vfx.maybeSpawnStatusVfx(pos, temp.vec3A.set((Math.random() - 0.5) * 0.22, 0.14 + Math.random() * 0.2, (Math.random() - 0.5) * 0.22), Math.random() > 0.5 ? 0x74ff5f : 0x8a4cd8, 0.34, 0.82);
        if (fx.rockets) vfx.maybeSpawnStatusVfx(pos, temp.vec3A.set((Math.random() - 0.5) * 0.18, 0.45 + Math.random() * 0.3, (Math.random() - 0.5) * 0.18), 0xc7cdd6, 0.42, 0.92);
        if (fx.lightning && state.performance.qualityLevel === 0) vfx.maybeSpawnStatusVfx(pos, temp.vec3A.set((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 1.1), vfx.EFFECT_COLORS.lightning, 0.16, 0.5);
      }
    }

    collision.rebuildEnemySpatialGrid();
    const hitBudget = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxHitResolutionsPerFrame, 0.62, 0.38);
    for (let i = state.entities.bullets.length - 1; i >= 0; i--) {
      if (state.performance.frameBudgets.hitResolutions >= hitBudget) break;
      const bullet = state.entities.bullets[i];
      if (!bullet?.userData) {
        removeBulletAtIndex(i);
        continue;
      }
      let hitEnemy = null;
      let bestDistSq = Infinity;
      const queryRadius = bullet.userData.effects?.rockets ? 2.6 : 1.9;
      collision.forEachEnemyNearPosition(bullet.position, queryRadius, (enemy) => {
        const data = getEnemyData(enemy);
        if (!data) {
          logInvalidEnemyReference(state, 'projectile.hitResolution', enemy);
          return;
        }
        if (data.dead) return;
        const dx = enemy.position.x - bullet.position.x;
        const dz = enemy.position.z - bullet.position.z;
        const horizontalDistSq = dx * dx + dz * dz;
        if (horizontalDistSq > data.hitboxRadius * data.hitboxRadius) return;
        const yCenter = enemy.position.y + data.hitboxCenterOffsetY;
        if (Math.abs(bullet.position.y - yCenter) > data.hitboxHalfHeight) return;
        if (horizontalDistSq < bestDistSq) {
          bestDistSq = horizontalDistSq;
          hitEnemy = enemy;
        }
      });
      if (!hitEnemy) continue;
      state.performance.frameBudgets.hitResolutions += 1;
      callbacks.damageEnemy(hitEnemy, bullet.userData.damage, { impactEffects: bullet.userData.effects || getProjectileEffects() });
      callbacks.applyProjectilePower(hitEnemy, bullet);
      removeBulletAtIndex(i);
    }
  }

  function clear() {
    state.entities.bullets.forEach((bullet) => scene.remove(bullet));
    state.entities.bullets.length = 0;
  }

  return {
    sanitizeProjectileCount,
    getSafeProjectileCountFromDoublers,
    getVolleyProfile,
    shoot,
    update,
    clear,
  };
}
