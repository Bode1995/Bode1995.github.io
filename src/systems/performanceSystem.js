export function createPerformanceSystem({ THREE, state, ui, SAFETY_LIMITS, getCounts, getExtraDebugLines = null }) {
  const perfFlags = new URLSearchParams(window.location.search);
  state.performance.debugEnabled = perfFlags.has('debugPerf');
  state.performance.enemyEffectSoftCap = SAFETY_LIMITS.maxEnemyStatusEffects;

  const debugEl = document.createElement('div');
  debugEl.id = 'perfDebug';
  debugEl.style.cssText = 'position:fixed;top:12px;right:12px;z-index:40;min-width:220px;padding:10px 12px;border:1px solid rgba(160,220,255,0.28);border-radius:12px;background:rgba(6,16,28,0.82);color:#dff6ff;font:12px/1.45 Inter,Arial,sans-serif;white-space:pre-line;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,0.28)';
  debugEl.classList.toggle('hidden', !state.performance.debugEnabled);
  document.body.appendChild(debugEl);

  function getAdaptiveLimit(base, lowQualityFactor = 0.65, criticalFactor = 0.42) {
    if (state.performance.qualityLevel >= 3) return Math.max(1, Math.round(base * criticalFactor));
    if (state.performance.qualityLevel >= 2) return Math.max(1, Math.round(base * lowQualityFactor));
    if (state.performance.qualityLevel >= 1) return Math.max(1, Math.round(base * 0.82));
    return base;
  }

  function resetFrameBudgets() {
    state.performance.frameIndex += 1;
    const budgets = state.performance.frameBudgets;
    budgets.lightningChains = 0;
    budgets.vfxSpawns = 0;
    budgets.bulletsSpawned = 0;
    budgets.dotTicks = 0;
    budgets.splashDamageEvents = 0;
    budgets.hitResolutions = 0;
    budgets.statusVfx = 0;
    if (state.runPowers?.synergyCounters) {
      state.runPowers.synergyCounters.frameEvents = 0;
      state.runPowers.synergyCounters.killFrameEvents = 0;
    }
  }

  function update(dt, maxParticles) {
    const frameMs = dt * 1000;
    state.performance.frameMs = THREE.MathUtils.lerp(state.performance.frameMs, frameMs, 0.12);
    state.performance.fps = 1000 / Math.max(1, state.performance.frameMs);

    const counts = getCounts();
    const pressureScore =
      ((counts.bullets + (counts.enemyProjectiles || 0)) / Math.max(1, SAFETY_LIMITS.maxActiveBulletsSoft)) +
      (counts.vfx / Math.max(1, maxParticles)) * 0.55 +
      (counts.chainBeams / Math.max(1, SAFETY_LIMITS.maxChainBeams)) * 0.45 +
      ((counts.damageNumbers || 0) / Math.max(1, SAFETY_LIMITS.maxDamageNumbers || 1)) * 0.18;

    if (state.performance.frameMs > 37 || pressureScore > 2.1) state.performance.qualityLevel = 3;
    else if (state.performance.frameMs > 29 || pressureScore > 1.55) state.performance.qualityLevel = 2;
    else if (state.performance.frameMs > 23 || pressureScore > 1.05) state.performance.qualityLevel = 1;
    else state.performance.qualityLevel = 0;

    state.performance.enemyEffectSoftCap = getAdaptiveLimit(SAFETY_LIMITS.maxEnemyStatusEffects, 0.72, 0.45);
  }

  function renderDebug(maxParticles) {
    if (!state.performance.debugEnabled) return;
    const counts = getCounts();
    const lines = [
      `FPS ${state.performance.fps.toFixed(1)} · ${state.performance.frameMs.toFixed(1)} ms`,
      `Quality ${state.performance.qualityLevel}`,
      `Bullets ${counts.bullets}/${getAdaptiveLimit(SAFETY_LIMITS.maxActiveBullets)}`,
      `Enemy shots ${counts.enemyProjectiles || 0}`,
      `Enemies ${counts.enemies}`,
      `VFX ${counts.vfx}/${getAdaptiveLimit(maxParticles)}`,
      `Chain beams ${counts.chainBeams}/${getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams)}`,
      `Damage numbers ${counts.damageNumbers || 0}/${getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbers || 1)}`,
      `Enemy FX ${state.performance.activeEnemyEffects}/${state.performance.enemyEffectSoftCap}`,
    ];
    if (typeof getExtraDebugLines === 'function') lines.push(...getExtraDebugLines());
    debugEl.textContent = lines.join('\n');
  }

  function toggleDebug() {
    state.performance.debugEnabled = !state.performance.debugEnabled;
    debugEl.classList.toggle('hidden', !state.performance.debugEnabled);
  }

  return { getAdaptiveLimit, resetFrameBudgets, update, renderDebug, toggleDebug };
}
