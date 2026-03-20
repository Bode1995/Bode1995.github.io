import { POWER_STACK_THRESHOLDS, POWER_SYNERGY_DEFS } from '../config/gameConfig.js';
import { applyWorldStatusSynergy } from '../config/worlds.js';
import { getEnemyData } from './enemyRuntimeUtils.js';

function clampPositive(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function hasRequiredStacks(runPowers, requiredStacks = {}) {
  return Object.entries(requiredStacks).every(([powerId, minStacks]) => (runPowers.stacks?.[powerId] || 0) >= minStacks);
}

function hasRequiredPowers(runPowers, requiredPowers = []) {
  return requiredPowers.every((powerId) => (runPowers.stacks?.[powerId] || 0) > 0);
}

function hasRequiredFlags(runPowers, requiredFlags = []) {
  return requiredFlags.every((flag) => !!runPowers.synergyFlags?.[flag]);
}

function targetHasStatuses(data, statuses = []) {
  return statuses.every((statusKey) => clampPositive(data?.[statusKey]) > 0);
}

function ensureEnemyReactionState(data) {
  if (!data.reactionStates) data.reactionStates = {};
  if (!data.lastReactionById) data.lastReactionById = {};
  if (!data.killFlags) data.killFlags = {};
  if (!data.statusSourceWeapon) data.statusSourceWeapon = {};
  if (!data.statusIntensity) data.statusIntensity = {};
  if (!data.primedEffects) data.primedEffects = {};
}

export function createSynergySystem({ state, runPowers, collision, performance, vfx, sceneResources }) {
  function rebuildActiveSynergies(weaponProfile = null) {
    const active = [];
    const weaponTag = weaponProfile?.weaponTag || state.runPowers?.lastWeaponTag || null;
    for (const def of Object.values(POWER_SYNERGY_DEFS)) {
      if (!hasRequiredPowers(runPowers, def.requiredPowers)) continue;
      if (!hasRequiredStacks(runPowers, def.requiredStacks)) continue;
      if (!hasRequiredFlags(runPowers, def.requiredFlags)) continue;
      if (weaponTag && Array.isArray(def.weaponTags) && def.weaponTags.length > 0 && !def.weaponTags.includes(weaponTag)) continue;
      active.push({
        id: def.id,
        triggerType: def.triggerType,
        priority: def.priority || 0,
        hudLabel: def.hudLabel,
        weaponTags: def.weaponTags || null,
      });
    }
    active.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    runPowers.activeSynergies = active;
    return active;
  }

  function applyThresholdUnlocks() {
    const previousThresholds = { ...(runPowers.thresholdUnlocks || {}) };
    const previousActiveIds = new Set((runPowers.activeSynergies || []).map((entry) => entry.id));
    runPowers.thresholdUnlocks = {};
    runPowers.synergyFlags = {};

    for (const [powerId, thresholdDefs] of Object.entries(POWER_STACK_THRESHOLDS)) {
      const stackCount = runPowers.stacks?.[powerId] || 0;
      for (const [thresholdId, thresholdDef] of Object.entries(thresholdDefs)) {
        if (stackCount < thresholdDef.stacks) continue;
        const unlockKey = `${powerId}:${thresholdId}`;
        runPowers.thresholdUnlocks[unlockKey] = true;
        for (const [flagId, flagValue] of Object.entries(thresholdDef.flags || {})) {
          runPowers.synergyFlags[flagId] = flagValue;
        }
      }
    }

    const activeSynergies = rebuildActiveSynergies();

    return {
      activeSynergies,
      unlockedNotices: [],
      stateChanged:
        Object.keys(runPowers.thresholdUnlocks).some((unlockKey) => !previousThresholds[unlockKey]) ||
        activeSynergies.some((entry) => !previousActiveIds.has(entry.id)),
    };
  }

  function getWeaponSynergyProfile(combatProfile, projectileEffects) {
    const weaponTag = combatProfile.weaponTag || combatProfile.weaponType || 'default';
    const activeSynergies = rebuildActiveSynergies(combatProfile);
    const secondaryTriggerRules = {
      allowStatusToReaction: true,
      allowExplosionReactions: true,
      allowChainReactions: !!runPowers.synergyFlags.chainOverload,
      maxChainDepth: runPowers.synergyFlags.multiCascade ? 2 : 1,
    };

    return {
      weaponTag,
      synergyProfile: {
        activeSynergies: activeSynergies.map((entry) => entry.id),
        reactionBias: combatProfile.reactionBias || 1,
        aoeBias: combatProfile.aoeBias || 1,
        chainBias: combatProfile.chainBias || 1,
        dotBias: combatProfile.dotBias || 1,
        burstBias: combatProfile.burstBias || 1,
        precisionBias: combatProfile.precisionBias || 1,
        statusApplicationMode: combatProfile.statusApplicationMode || 'default',
      },
      statusBias: {
        fire: projectileEffects.fire ? (combatProfile.dotBias || 1) : 0,
        poison: projectileEffects.poison ? (combatProfile.dotBias || 1) : 0,
        ice: projectileEffects.ice ? ((combatProfile.precisionBias || 1) * 0.92) : 0,
        lightning: projectileEffects.lightning ? (combatProfile.chainBias || 1) : 0,
        rockets: projectileEffects.rockets ? (combatProfile.aoeBias || 1) : 0,
      },
      reactionBias: combatProfile.reactionBias || 1,
      secondaryTriggerRules,
    };
  }

  function canTriggerReaction(data, reactionId, frameIndex, cooldownFrames) {
    ensureEnemyReactionState(data);
    const lastFrame = data.lastReactionById[reactionId] ?? -Infinity;
    if (frameIndex - lastFrame < cooldownFrames) return false;
    data.lastReactionById[reactionId] = frameIndex;
    data.lastReactionFrame = frameIndex;
    return true;
  }

  function noteReactionTrigger(data, reactionId, result) {
    ensureEnemyReactionState(data);
    data.reactionStates[reactionId] = {
      triggeredAt: state.performance.frameIndex,
      ...result,
    };
  }

  function stampReactionCache(enemy, reactionId, bullet) {
    const cacheKey = `${enemy.uuid}:${reactionId}:${bullet?.uuid || 'no-bullet'}`;
    runPowers.recentReactionCache.set(cacheKey, state.performance.frameIndex);
    return cacheKey;
  }

  function reactionSeenThisFrame(enemy, reactionId, bullet) {
    const cacheKey = `${enemy.uuid}:${reactionId}:${bullet?.uuid || 'no-bullet'}`;
    return runPowers.recentReactionCache.get(cacheKey) === state.performance.frameIndex;
  }

  function trimReactionCache() {
    for (const [cacheKey, frameIndex] of runPowers.recentReactionCache.entries()) {
      if (state.performance.frameIndex - frameIndex > sceneResources.SAFETY_LIMITS.reactionInternalCooldownFrames) {
        runPowers.recentReactionCache.delete(cacheKey);
      }
    }
  }

  function spawnReactionFeedback(position, effectKey, scale = 1) {
    if (!position) return;
    const color = vfx.EFFECT_COLORS[effectKey] || 0xffffff;
    tempPosition.copy(position).setY(position.y + 0.55);
    vfx.spawnImpactBurst(tempPosition, color, Math.max(1, Math.round(2 * scale)), 1.6 * scale, 0.18, 0.68);
  }

  const tempPosition = state.tempSynergyPosition || (state.tempSynergyPosition = { copy(vec) { this.x = vec.x; this.y = vec.y; this.z = vec.z; return this; }, setY(y) { this.y = y; return this; } });

  function applyStatusMetadata(enemyData, bullet, statusKey, amount) {
    ensureEnemyReactionState(enemyData);
    enemyData.statusSourceWeapon[statusKey] = bullet?.userData?.weaponTag || 'default';
    enemyData.statusIntensity[statusKey] = clampPositive(amount);
  }

  function getTriggeredSynergyDefs(triggerType, bullet) {
    const activeIds = new Set(bullet?.userData?.synergyProfile?.activeSynergies || (runPowers.activeSynergies || []).map((entry) => entry.id));
    return (runPowers.activeSynergies || [])
      .filter((entry) => entry.triggerType === triggerType && activeIds.has(entry.id))
      .map((entry) => POWER_SYNERGY_DEFS[entry.id])
      .filter(Boolean)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  function amplifyTargetStatuses(data, effectConfig, scale) {
    for (const [statusKey, delta] of Object.entries(effectConfig.statusAmplify || {})) {
      data[statusKey] = clampPositive(data[statusKey]) + applyWorldStatusSynergy(state.worldIndex, statusKey, delta * scale);
    }
    for (const [statusKey, ratio] of Object.entries(effectConfig.consumeStatuses || {})) {
      data[statusKey] = clampPositive(data[statusKey]) * Math.max(0, 1 - ratio);
    }
  }

  function resolveHitSynergies(enemy, bullet, context) {
    trimReactionCache();
    const data = getEnemyData(enemy);
    if (!data) return [];
    ensureEnemyReactionState(data);
    const frameBudget = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxSynergyEventsPerFrame, 0.7, 0.45);
    const results = [];
    let triggered = 0;
    const triggerTypes = context.triggerTypes || ['onStatusApply', 'onHit'];
    for (const triggerType of triggerTypes) {
      const defs = getTriggeredSynergyDefs(triggerType, bullet);
      for (const def of defs) {
        if (triggered >= sceneResources.SAFETY_LIMITS.maxSynergyReactionsPerHit) return results;
        if ((runPowers.synergyCounters.frameEvents || 0) >= frameBudget) return results;
        if (reactionSeenThisFrame(enemy, def.id, bullet)) continue;
        const effectConfig = def.effectConfig || {};
        if (!targetHasStatuses(data, effectConfig.requiresTargetStatuses)) continue;
        const cooldownFrames = effectConfig.cooldownFrames || sceneResources.SAFETY_LIMITS.reactionInternalCooldownFrames;
        if (!canTriggerReaction(data, def.id, state.performance.frameIndex, cooldownFrames)) continue;
        const scale = (bullet?.userData?.reactionBias || 1) * (bullet?.userData?.synergyProfile?.reactionBias || 1);
        const stackTotal = Object.values(def.requiredStacks || {}).reduce((sum, value) => sum + value, 0);
        const bonusDamage = (effectConfig.bonusDamage || 0) + stackTotal * (effectConfig.bonusDamagePerStack || 0);
        if (bonusDamage > 0) context.damageEnemy(enemy, Math.max(1, Math.round(bonusDamage * scale)), {
          allowLightningChain: false,
          isSecondaryEffect: true,
          isSynergyEffect: true,
          synergyId: def.id,
          secondaryChainDepth: (bullet?.userData?.secondaryChainDepth || 0) + 1,
          impactEffects: { [effectConfig.reactionVfx || 'lightning']: true },
        });
        amplifyTargetStatuses(data, effectConfig, scale);
        if (effectConfig.addPrimedEffect) data.primedEffects[effectConfig.addPrimedEffect] = true;
        if (effectConfig.splashRadius && effectConfig.splashDamage) {
          const maxTargets = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxDeathBurstTargets, 0.72, 0.5);
          let hitCount = 0;
          collision.forEachEnemyNearPosition(enemy.position, effectConfig.splashRadius * (bullet?.userData?.synergyProfile?.aoeBias || 1), (other) => {
            if (other === enemy) return;
            const otherData = getEnemyData(other);
            if (!otherData || otherData.dead || hitCount >= maxTargets) return false;
            hitCount += 1;
            context.damageEnemy(other, Math.max(1, Math.round(effectConfig.splashDamage * scale)), {
              allowLightningChain: false,
              isSecondaryEffect: true,
              isSynergyEffect: true,
              synergyId: def.id,
              secondaryChainDepth: (bullet?.userData?.secondaryChainDepth || 0) + 1,
              impactEffects: { [effectConfig.reactionVfx || 'fire']: true },
            });
            return hitCount < maxTargets;
          }, sceneResources.SAFETY_LIMITS.maxRocketSplashSearchCells);
        }
        stampReactionCache(enemy, def.id, bullet);
        noteReactionTrigger(data, def.id, { triggerType, sourceWeapon: bullet?.userData?.weaponTag || 'default' });
        runPowers.synergyCounters.frameEvents = (runPowers.synergyCounters.frameEvents || 0) + 1;
        runPowers.synergyCounters.totalReactions = (runPowers.synergyCounters.totalReactions || 0) + 1;
        spawnReactionFeedback(enemy.position, effectConfig.reactionVfx || 'lightning', scale);
        results.push({ id: def.id, triggerType });
        triggered += 1;
      }
    }
    return results;
  }

  function propagateStatuses(target, transferStatus, sourceWeapon = 'default') {
    const data = getEnemyData(target);
    if (!data) return;
    ensureEnemyReactionState(data);
    for (const [statusKey, amount] of Object.entries(transferStatus || {})) {
      data[statusKey] = clampPositive(data[statusKey]) + applyWorldStatusSynergy(state.worldIndex, statusKey, amount);
      data.statusSourceWeapon[statusKey] = sourceWeapon;
      data.statusIntensity[statusKey] = Math.max(data.statusIntensity[statusKey] || 0, amount);
    }
  }

  function resolveKillSynergies(enemy, context) {
    const data = getEnemyData(enemy);
    if (!data) return [];
    ensureEnemyReactionState(data);
    const results = [];
    const killDefs = (runPowers.activeSynergies || []).map((entry) => POWER_SYNERGY_DEFS[entry.id]).filter((def) => def && ['onKill', 'onDeathBurst'].includes(def.triggerType));
    const frameBudget = performance.getAdaptiveLimit(sceneResources.SAFETY_LIMITS.maxKillSynergyEventsPerFrame, 0.72, 0.5);
    for (const def of killDefs) {
      if ((runPowers.synergyCounters.killFrameEvents || 0) >= frameBudget) break;
      const effectConfig = def.effectConfig || {};
      if (!targetHasStatuses(data, effectConfig.requiresTargetStatuses)) continue;
      if (data.killFlags[def.id]) continue;
      data.killFlags[def.id] = true;
      let affected = 0;
      const radius = (effectConfig.radius || 0) * (context.weaponProfile?.aoeBias || 1);
      collision.forEachEnemyNearPosition(enemy.position, radius, (other) => {
        const otherData = getEnemyData(other);
        if (!otherData || otherData.dead || other === enemy) return;
        if (affected >= Math.min(effectConfig.maxTargets || sceneResources.SAFETY_LIMITS.maxDeathBurstTargets, sceneResources.SAFETY_LIMITS.maxDeathBurstTargets)) return false;
        affected += 1;
        if (effectConfig.burstDamage) {
          context.damageEnemy(other, Math.max(1, Math.round(effectConfig.burstDamage * (context.weaponProfile?.burstBias || 1))), {
            allowLightningChain: false,
            isSecondaryEffect: true,
            isSynergyEffect: true,
            synergyId: def.id,
            secondaryChainDepth: 1,
            impactEffects: { [effectConfig.reactionVfx || 'poison']: true },
          });
        }
        propagateStatuses(other, effectConfig.transferStatus, data.statusSourceWeapon.poisonDot || context.weaponProfile?.weaponTag || 'default');
        return affected < sceneResources.SAFETY_LIMITS.maxStatusPropagationPerEvent;
      }, sceneResources.SAFETY_LIMITS.maxRocketSplashSearchCells);
      runPowers.synergyCounters.killFrameEvents = (runPowers.synergyCounters.killFrameEvents || 0) + 1;
      spawnReactionFeedback(enemy.position, effectConfig.reactionVfx || 'poison', 1.1);
      results.push({ id: def.id, affectedTargets: affected });
    }
    return results;
  }

  function getSynergyHudState() {
    return {
      activeSynergies: runPowers.activeSynergies || [],
      thresholdUnlocks: runPowers.thresholdUnlocks || {},
      counters: runPowers.synergyCounters || {},
    };
  }

  return {
    applyThresholdUnlocks,
    rebuildActiveSynergies,
    getWeaponSynergyProfile,
    getSynergyHudState,
    resolveHitSynergies,
    resolveKillSynergies,
    applyStatusMetadata,
    ensureEnemyReactionState,
  };
}
