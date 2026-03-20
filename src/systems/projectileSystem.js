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
  getCharacterCombatProfile,
  getProjectileEffects,
  getWeaponSynergyProfile,
  resolveSpecialHitDamage = null,
  sceneResources,
}) {
  const bulletAssets = {
    standardGeometry: new THREE.SphereGeometry(0.18, 10, 10),
    rocketGeometry: new THREE.ConeGeometry(0.18, 0.52, 8),
    bladeGeometry: new THREE.BoxGeometry(0.12, 0.42, 0.78),
    slugGeometry: new THREE.IcosahedronGeometry(0.24, 0),
    dartGeometry: new THREE.CapsuleGeometry(0.09, 0.34, 4, 8),
    needleGeometry: new THREE.CapsuleGeometry(0.06, 0.24, 4, 8),
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

  function getPatternOffsets(weaponProfile) {
    const spread = weaponProfile.spread || 0;
    switch (weaponProfile.shotPattern) {
      case 'fan':
        return [-spread, 0, spread].map((yawOffset) => ({ yawOffset, lateralOffset: yawOffset * 0.85 }));
      case 'dual':
        return [
          { yawOffset: -spread * 0.45, lateralOffset: -(weaponProfile.muzzleWidth || 0.26) },
          { yawOffset: spread * 0.45, lateralOffset: weaponProfile.muzzleWidth || 0.26 },
        ];
      default:
        return [{ yawOffset: 0, lateralOffset: 0 }];
    }
  }

  function getVolleyProfile(projectileCount = state.projectileCount) {
    const weaponProfile = getCharacterCombatProfile().weaponProfile;
    const requestedCount = sanitizeProjectileCount(projectileCount);
    const patternOffsets = getPatternOffsets(weaponProfile);
    const totalRequestedProjectiles = requestedCount * patternOffsets.length;
    const perShotCap = state.performance.qualityLevel >= 2
      ? sceneResources.SAFETY_LIMITS.maxVisualProjectilesPerShotLowQuality
      : sceneResources.SAFETY_LIMITS.maxVisualProjectilesPerShot;
    const visualCount = Math.min(totalRequestedProjectiles, perShotCap);
    const volleyWeight = totalRequestedProjectiles / Math.max(1, visualCount);
    return {
      requestedCount,
      totalRequestedProjectiles,
      visualCount,
      volleyWeight,
      patternOffsets,
      groupSpread: Math.min(0.82, 0.11 * Math.log2(requestedCount) + (weaponProfile.shotPattern === 'fan' ? 0.08 : 0)),
    };
  }

  function getBulletMaterial(effects, combatProfile) {
    const key = [
      combatProfile.weaponType,
      effects.fire ? 1 : 0,
      effects.ice ? 1 : 0,
      effects.poison ? 1 : 0,
      effects.lightning ? 1 : 0,
      effects.rockets ? 1 : 0,
    ].join('');
    if (bulletAssets.materialCache.has(key)) return bulletAssets.materialCache.get(key);

    const bulletColor = new THREE.Color(combatProfile.projectileColor || 0x9df9ff);
    if (effects.fire) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.fire), 0.5);
    if (effects.ice) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.ice), 0.42);
    if (effects.poison) bulletColor.lerp(new THREE.Color(0x86f46a), 0.38);
    if (effects.lightning) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.lightning), 0.35);
    if (effects.rockets) bulletColor.lerp(new THREE.Color(vfx.EFFECT_COLORS.rockets), 0.45);
    const material = new THREE.MeshStandardMaterial({
      color: bulletColor,
      emissive: bulletColor,
      emissiveIntensity: effects.rockets ? 0.9 : 0.55,
      metalness: effects.rockets ? 0.35 : 0.18,
      roughness: 0.28,
    });
    bulletAssets.materialCache.set(key, material);
    return material;
  }

  function getProjectileGeometry(weaponProfile, effects) {
    if (effects.rockets) return bulletAssets.rocketGeometry;
    switch (weaponProfile.projectileGeometry) {
      case 'blade':
        return bulletAssets.bladeGeometry;
      case 'slug':
        return bulletAssets.slugGeometry;
      case 'dart':
        return bulletAssets.dartGeometry;
      case 'needle':
        return bulletAssets.needleGeometry;
      default:
        return bulletAssets.standardGeometry;
    }
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

  function configureBulletTransform(bullet, forward, right, weaponProfile, effects) {
    if (effects.rockets) {
      bullet.rotation.x = Math.PI / 2;
      temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, forward);
      bullet.quaternion.copy(temp.quatA);
      return;
    }
    if (weaponProfile.projectileGeometry === 'blade') {
      temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, forward);
      bullet.quaternion.copy(temp.quatA);
      bullet.rotateZ(Math.PI / 2);
      return;
    }
    if (weaponProfile.projectileGeometry === 'dart' || weaponProfile.projectileGeometry === 'needle') {
      temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, forward);
      bullet.quaternion.copy(temp.quatA);
      bullet.rotateX(Math.PI / 2);
      return;
    }
    if (weaponProfile.projectileGeometry === 'slug') {
      temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, forward);
      bullet.quaternion.copy(temp.quatA);
      bullet.rotateX(Math.PI / 2);
      bullet.rotateZ(Math.PI / 4);
      return;
    }
    temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, forward);
    bullet.quaternion.copy(temp.quatA);
    bullet.rotateX(Math.PI / 2);
    bullet.position.addScaledVector(right, 0);
  }

  function spawnProjectileSet() {
    const combatProfile = getCharacterCombatProfile();
    const weaponProfile = combatProfile.weaponProfile;
    const volley = getVolleyProfile(state.projectileCount);
    const baseYaw = state.yaw;
    const fx = getProjectileEffects();
    const perFrameSpawnCap = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxBulletsSpawnPerFrame, 0.7, 0.4);
    const projectileSynergy = getWeaponSynergyProfile(combatProfile, fx);
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

    const geometry = getProjectileGeometry(weaponProfile, fx);
    const material = getBulletMaterial(fx, combatProfile);
    const volleyWeight = volley.totalRequestedProjectiles / allowedVisualCount;
    const patternOffsets = volley.patternOffsets;
    const groups = Math.max(1, Math.ceil(allowedVisualCount / patternOffsets.length));
    const muzzleForward = weaponProfile.muzzleForward || 1.15;
    const muzzleHeight = weaponProfile.muzzleHeight || 1.35;
    const weaponSpeed = 30 * (weaponProfile.projectileSpeedModifier || 1);

    for (let shot = 0; shot < allowedVisualCount; shot++) {
      const patternIndex = shot % patternOffsets.length;
      const groupIndex = Math.floor(shot / patternOffsets.length);
      const groupYaw = groups === 1 ? 0 : THREE.MathUtils.lerp(-volley.groupSpread, volley.groupSpread, groupIndex / Math.max(1, groups - 1));
      const offset = patternOffsets[patternIndex];
      const yaw = baseYaw + offset.yawOffset + groupYaw;
      temp.vec3A.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      temp.vec3B.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

      const bullet = new THREE.Mesh(geometry, material);
      bullet.position.copy(playerRigHolder.position)
        .addScaledVector(temp.vec3A, muzzleForward)
        .addScaledVector(temp.vec3B, offset.lateralOffset || 0)
        .setY(muzzleHeight);
      bullet.scale.setScalar(weaponProfile.projectileScale || 1);
      configureBulletTransform(bullet, temp.vec3A, temp.vec3B, weaponProfile, fx);
      bullet.userData.forward = temp.vec3A.clone();
      bullet.userData.speed = weaponSpeed;
      bullet.userData.life = Math.min(sceneResources.SAFETY_LIMITS.maxBulletLifetime * (weaponProfile.projectileLifeMultiplier || 1), 1.25);
      bullet.userData.damage = getBaseDamage() * volleyWeight;
      bullet.userData.effects = fx;
      bullet.userData.trailTick = state.performance.qualityLevel >= 2 ? 0.06 : 0.04;
      bullet.userData.volleyWeight = volleyWeight;
      bullet.userData.age = 0;
      bullet.userData.spinRate = weaponProfile.projectileSpin || 0;
      bullet.userData.hitRadius = weaponProfile.hitRadius || 0.18;
      bullet.userData.pierceRemaining = weaponProfile.pierce || 0;
      bullet.userData.hitEnemies = new Set();
      bullet.userData.weaponTag = projectileSynergy.weaponTag;
      bullet.userData.statusBias = projectileSynergy.statusBias;
      bullet.userData.reactionBias = projectileSynergy.reactionBias;
      bullet.userData.secondaryTriggerRules = projectileSynergy.secondaryTriggerRules;
      bullet.userData.synergyProfile = projectileSynergy.synergyProfile;
      bullet.userData.weaponCombatProfile = combatProfile;
      bullet.userData.secondaryChainDepth = 0;
      scene.add(bullet);
      state.entities.bullets.push(bullet);
      state.performance.frameBudgets.bulletsSpawned += 1;
      if (state.entities.bullets.length >= maxActiveBullets) break;
    }

    trimBulletsToLimit(maxActiveBullets);
  }

  function getPointToSegmentDistanceSq(pointX, pointZ, fromX, fromZ, toX, toZ) {
    const dX = toX - fromX;
    const dZ = toZ - fromZ;
    const segmentLengthSq = (dX * dX) + (dZ * dZ);
    if (segmentLengthSq <= 0.0001) {
      const deltaX = pointX - toX;
      const deltaZ = pointZ - toZ;
      return (deltaX * deltaX) + (deltaZ * deltaZ);
    }
    const t = THREE.MathUtils.clamp((((pointX - fromX) * dX) + ((pointZ - fromZ) * dZ)) / segmentLengthSq, 0, 1);
    const closestX = fromX + (dX * t);
    const closestZ = fromZ + (dZ * t);
    const deltaX = pointX - closestX;
    const deltaZ = pointZ - closestZ;
    return (deltaX * deltaX) + (deltaZ * deltaZ);
  }

  function shoot() {
    const combatProfile = getCharacterCombatProfile();
    const weaponProfile = combatProfile.weaponProfile;
    if (state.weaponState.burstShotsRemaining > 0) {
      if (state.weaponState.burstTimer > 0) return;
      spawnProjectileSet();
      state.weaponState.burstShotsRemaining -= 1;
      if (state.weaponState.burstShotsRemaining > 0) state.weaponState.burstTimer = weaponProfile.burstInterval || 0.05;
      return;
    }

    if (state.fireCooldown > 0) return;
    state.fireCooldown = getAttackCooldown();
    spawnProjectileSet();

    const burstCount = Math.max(1, weaponProfile.burstCount || 1);
    if (burstCount > 1) {
      state.weaponState.burstShotsRemaining = burstCount - 1;
      state.weaponState.burstTimer = weaponProfile.burstInterval || 0.05;
    }
  }

  function update(dt, callbacks) {
    const bulletSoftRangeSq = sceneResources.SAFETY_LIMITS.bulletSoftRange * sceneResources.SAFETY_LIMITS.bulletSoftRange;
    const bulletHardRangeSq = sceneResources.SAFETY_LIMITS.bulletHardRange * sceneResources.SAFETY_LIMITS.bulletHardRange;

    for (let i = state.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = state.entities.bullets[i];
      if (!bullet?.userData?.forward) {
        removeBulletAtIndex(i);
        continue;
      }
      const prevX = bullet.position.x;
      const prevZ = bullet.position.z;
      bullet.userData.prevX = prevX;
      bullet.userData.prevZ = prevZ;
      bullet.userData.life -= dt;
      bullet.userData.age += dt;
      bullet.position.addScaledVector(bullet.userData.forward, bullet.userData.speed * dt);
      if (bullet.userData.spinRate) bullet.rotation.z += bullet.userData.spinRate * dt;

      const worldImpact = collision.getProjectileWorldImpact({ x: prevX, z: prevZ }, bullet.position, bullet.userData.hitRadius || 0.22);
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
      const prevX = bullet.userData.prevX ?? bullet.position.x;
      const prevZ = bullet.userData.prevZ ?? bullet.position.z;
      const travelX = bullet.position.x - prevX;
      const travelZ = bullet.position.z - prevZ;
      const travelDistance = Math.hypot(travelX, travelZ);
      const collisionForgiveness = bullet.userData.effects?.rockets ? 0.26 : 0.22;
      temp.vec3A.set((prevX + bullet.position.x) * 0.5, bullet.position.y, (prevZ + bullet.position.z) * 0.5);
      const queryRadius = Math.max((bullet.userData.hitRadius || 0.18) + 1.35 + travelDistance + collisionForgiveness, bullet.userData.effects?.rockets ? 2.75 : 2.05);
      collision.forEachEnemyNearPosition(temp.vec3A, queryRadius, (enemy) => {
        const data = getEnemyData(enemy);
        if (!data) {
          logInvalidEnemyReference(state, 'projectile.hitResolution', enemy);
          return;
        }
        if (data.dead || bullet.userData.hitEnemies?.has(enemy)) return;
        const horizontalDistSq = getPointToSegmentDistanceSq(
          enemy.position.x,
          enemy.position.z,
          prevX,
          prevZ,
          bullet.position.x,
          bullet.position.z,
        );
        const hitRadius = data.hitboxRadius + (bullet.userData.hitRadius || 0.18) + collisionForgiveness;
        if (horizontalDistSq > hitRadius * hitRadius) return;
        const yCenter = enemy.position.y + data.hitboxCenterOffsetY;
        const verticalTolerance = data.hitboxHalfHeight + 0.18 + Math.min(0.18, travelDistance * 0.2);
        if (Math.abs(bullet.position.y - yCenter) > verticalTolerance) return;
        if (horizontalDistSq < bestDistSq) {
          bestDistSq = horizontalDistSq;
          hitEnemy = enemy;
        }
      });
      if (!hitEnemy) continue;
      state.performance.frameBudgets.hitResolutions += 1;
      const specialDamage = resolveSpecialHitDamage
        ? resolveSpecialHitDamage(hitEnemy, bullet, bullet.userData.damage)
        : { amount: bullet.userData.damage };
      callbacks.damageEnemy(hitEnemy, specialDamage.amount, { impactEffects: specialDamage.impactEffects || bullet.userData.effects || getProjectileEffects() });
      callbacks.applyProjectilePower(hitEnemy, bullet);
      bullet.userData.hitEnemies?.add(hitEnemy);
      if ((bullet.userData.pierceRemaining || 0) > 0) {
        bullet.userData.pierceRemaining -= 1;
        bullet.position.addScaledVector(bullet.userData.forward, 0.42);
        continue;
      }
      removeBulletAtIndex(i);
    }
  }

  function clear() {
    state.entities.bullets.forEach((bullet) => scene.remove(bullet));
    state.entities.bullets.length = 0;
    state.weaponState.burstShotsRemaining = 0;
    state.weaponState.burstTimer = 0;
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
