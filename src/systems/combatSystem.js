import { getEnemyData, isValidEnemyReference, logInvalidEnemyReference } from './enemyRuntimeUtils.js';

export function createCombatSystem({
  state,
  profile,
  performance,
  collision,
  vfx,
  runPowers,
  getUpgradeLevel,
  getShieldPickupCapacity,
  getBaseMoveSpeedMultiplier,
  getPlayerMaxHp,
  getSafeProjectileCountFromDoublers,
  finishRun,
  sceneResources,
  temp,
}) {
  const api = {
    damageEnemy: null,
    spawnEnemy: null,
    destroyEnemy: null,
  };

  function getProjectileEffects() {
    return {
      fire: runPowers.stacks.fire > 0,
      ice: runPowers.stacks.ice > 0,
      lightning: runPowers.stacks.lightning > 0,
      poison: runPowers.stacks.poison > 0,
      rockets: runPowers.stacks.rockets > 0,
    };
  }

  function getPowerSummaryText(POWER_UP_DEFS) {
    const active = [];
    for (const key of Object.keys(runPowers.stacks)) {
      const count = runPowers.stacks[key];
      if (count > 0) active.push(`${POWER_UP_DEFS[key].label} x${count}`);
    }
    return active.length ? active.join(' · ') : 'none';
  }

  function showPickupNotice(type, POWER_UP_DEFS) {
    const def = POWER_UP_DEFS[type];
    state.ui.pickupNotices.push({ type, text: `${def.label} +1`, life: 1.4, maxLife: 1.4 });
  }

  function applyRunPower(type, POWER_UP_DEFS) {
    profile.stats.powerUpsCollected += 1;
    if (type === 'health') {
      state.hp = Math.min(getPlayerMaxHp(), state.hp + 20);
      showPickupNotice(type, POWER_UP_DEFS);
      return;
    }

    runPowers.stacks[type] = (runPowers.stacks[type] || 0) + 1;
    if (type === 'movementSpeed') {
      state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + runPowers.stacks.movementSpeed * 0.05;
    } else if (type === 'doubler') {
      state.projectileCount = getSafeProjectileCountFromDoublers(runPowers.stacks.doubler);
    } else if (type === 'shield') {
      runPowers.shieldHp += getShieldPickupCapacity();
    }
    showPickupNotice(type, POWER_UP_DEFS);
  }

  function resetRunPowerUps() {
    for (const key of Object.keys(runPowers.stacks)) runPowers.stacks[key] = 0;
    runPowers.shieldHp = 0;
    state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier();
    state.projectileCount = 1;
  }

  function damagePlayer(amount) {
    if (runPowers.shieldHp > 0) {
      const absorbed = Math.min(runPowers.shieldHp, amount);
      runPowers.shieldHp -= absorbed;
      amount -= absorbed;
    }
    if (amount > 0) state.hp -= amount;
    if (state.hp <= 0) finishRun(false);
  }

  function canSpawnStatusEffects(enemy) {
    const data = getEnemyData(enemy);
    if (!data) return false;
    if (state.performance.activeEnemyEffects < state.performance.enemyEffectSoftCap) return true;
    return data.fireDot > 0 || data.poisonDot > 0 || data.iceSlowTimer > 0 || data.shockTimer > 0;
  }

  function markEnemyImpactVisuals(enemy, effects = null) {
    const data = getEnemyData(enemy);
    if (!data) return;
    data.impactVisualTimer = vfx.MAX_IMPACT_VISUAL_LIFETIME;
    data.impactVisualEffects = effects || data.impactVisualEffects || null;
  }

  function damageEnemy(enemy, amount, options = {}) {
    const data = getEnemyData(enemy);
    if (!data) {
      logInvalidEnemyReference(state, 'combat.damageEnemy', enemy);
      return;
    }
    if (data.dead) return;
    const { allowLightningChain = true, isSecondaryEffect = false, impactEffects = null } = options;
    data.hp -= amount;
    state.damageDealt += amount;
    profile.stats.damageDealt += amount;
    if (!isSecondaryEffect || impactEffects) vfx.spawnDamageNumber(enemy, amount);
    if (impactEffects) markEnemyImpactVisuals(enemy, impactEffects);

    if (runPowers.stacks.lightning > 0) {
      data.shockTimer = Math.max(data.shockTimer, 0.18 + runPowers.stacks.lightning * 0.04);
      if (impactEffects && state.performance.frameBudgets.statusVfx < performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxStatusVfxPerFrame, 0.55, 0.28)) {
        temp.vec3A.copy(enemy.position).setY(enemy.position.y + 1.1);
        vfx.spawnImpactBurst(temp.vec3A, vfx.EFFECT_COLORS.lightning, isSecondaryEffect ? 1 : 3, 2.2, 0.2, 0.7);
      }
    }

    if (data.hp <= 0) {
      const idx = state.entities.enemies.indexOf(enemy);
      if (idx >= 0) api.destroyEnemy(enemy, idx);
      else data.dead = true;
      return;
    }

    if (!allowLightningChain || runPowers.stacks.lightning <= 0) return;

    let chains = Math.min(runPowers.stacks.lightning, performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxLightningChainsPerHit, 0.66, 0.34));
    const lightningRange = 6.5 + getUpgradeLevel('lightningRange') * 0.45;
    let source = enemy;
    const visited = new Set([enemy]);

    while (chains > 0) {
      if (state.performance.frameBudgets.lightningChains >= performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxLightningChainsPerFrame, 0.65, 0.4)) break;
      let nearest = null;
      let nearestDistSq = lightningRange * lightningRange;

      collision.forEachEnemyNearPosition(source.position, lightningRange, (candidate) => {
        const candidateData = getEnemyData(candidate);
        if (!candidateData) {
          logInvalidEnemyReference(state, 'combat.damageEnemy.lightningChain', candidate);
          return;
        }
        if (candidateData.dead || visited.has(candidate)) return;
        const dx = source.position.x - candidate.position.x;
        const dz = source.position.z - candidate.position.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < nearestDistSq) {
          nearestDistSq = dSq;
          nearest = candidate;
        }
      });

      if (!nearest) break;
      visited.add(nearest);
      if (!vfx.createChainBeam(source.position, nearest.position)) break;
      const chainDamage = Math.max(1, Math.round(0.7 + runPowers.stacks.lightning * 0.8));
      damageEnemy(nearest, chainDamage, { allowLightningChain: false, isSecondaryEffect: true, impactEffects: { lightning: true } });
      source = nearest;
      chains -= 1;
    }
  }

  function applyProjectilePower(enemy, bullet) {
    const data = getEnemyData(enemy);
    if (!data) {
      logInvalidEnemyReference(state, 'combat.applyProjectilePower', enemy);
      return;
    }
    const hitPos = temp.vec3A.copy(bullet.position);
    const volleyWeight = Math.max(1, bullet.userData.volleyWeight || 1);
    const weightBoost = 1 + Math.log2(volleyWeight) * 0.18;
    const impactEffects = bullet.userData.effects || getProjectileEffects();
    vfx.spawnImpactEffects(hitPos, impactEffects);
    markEnemyImpactVisuals(enemy, impactEffects);

    if (canSpawnStatusEffects(enemy) && runPowers.stacks.fire > 0) {
      data.fireDot = Math.min(14, data.fireDot + runPowers.stacks.fire * 0.55 * (1 + getUpgradeLevel('burnDamage') * 0.18) * Math.min(3.2, volleyWeight));
      vfx.maybeSpawnImpactVfx(hitPos, temp.vec3B.set((Math.random() - 0.5) * 0.22, 0.35, (Math.random() - 0.5) * 0.22), vfx.EFFECT_COLORS.fire, 0.22, 0.72);
    }
    if (canSpawnStatusEffects(enemy) && runPowers.stacks.poison > 0) {
      data.poisonDot = Math.min(16, data.poisonDot + runPowers.stacks.poison * 0.7 * (1 + getUpgradeLevel('poisonDamage') * 0.18) * Math.min(3.2, volleyWeight));
      vfx.maybeSpawnImpactVfx(hitPos, temp.vec3B.set((Math.random() - 0.5) * 0.14, 0.16, (Math.random() - 0.5) * 0.14), 0x7dff74, 0.28, 0.88);
    }
    if (canSpawnStatusEffects(enemy) && runPowers.stacks.ice > 0) {
      data.iceSlowTimer = Math.max(data.iceSlowTimer, (1.2 + getUpgradeLevel('slowDuration') * 0.16 + runPowers.stacks.ice * 0.2) * Math.min(2.1, weightBoost));
      vfx.maybeSpawnImpactVfx(hitPos, temp.vec3B.set((Math.random() - 0.5) * 0.15, 0.18, (Math.random() - 0.5) * 0.15), vfx.EFFECT_COLORS.ice, 0.22, 0.72);
    }

    if (runPowers.stacks.rockets <= 0) return;
    const splashBudget = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxSplashDamageEventsPerFrame, 0.55, 0.34);
    if (state.performance.frameBudgets.splashDamageEvents >= splashBudget) return;

    const radius = (1.8 + getUpgradeLevel('rocketRadius') * 0.18 + runPowers.stacks.rockets * 0.55) * Math.min(2.1, weightBoost);
    const splash = Math.max(1, Math.round((0.45 + runPowers.stacks.rockets * 0.7) * Math.min(3, volleyWeight)));
    vfx.spawnExplosionRing(hitPos, radius);

    let splashTargets = 0;
    collision.forEachEnemyNearPosition(hitPos, radius, (other) => {
      if (!isValidEnemyReference(other, { allowDead: false })) {
        if (!getEnemyData(other)) logInvalidEnemyReference(state, 'combat.applyProjectilePower.splash', other);
        return;
      }
      if (state.performance.frameBudgets.splashDamageEvents >= splashBudget) return false;
      const dx = other.position.x - hitPos.x;
      const dz = other.position.z - hitPos.z;
      if ((dx * dx) + (dz * dz) > radius * radius) return;
      state.performance.frameBudgets.splashDamageEvents += 1;
      splashTargets += 1;
      damageEnemy(other, splash, { allowLightningChain: false, isSecondaryEffect: true, impactEffects: { rockets: true } });
      if (splashTargets >= performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxRocketSplashTargets, 0.7, 0.45)) return false;
    }, sceneResources.SAFETY_LIMITS.maxRocketSplashSearchCells);
  }

  return {
    api,
    getProjectileEffects,
    getPowerSummaryText,
    applyRunPower,
    resetRunPowerUps,
    damagePlayer,
    damageEnemy,
    applyProjectilePower,
  };
}
