import { getEnemyData, logInvalidEnemyReference } from './enemyRuntimeUtils.js';

export function createVfxSystem({ THREE, scene, state, performance, SAFETY_LIMITS, temp, sceneResources }) {
  const VFX = {
    maxParticles: 340,
    particleGeometry: new THREE.SphereGeometry(0.085, 6, 6),
    shardGeometry: new THREE.BoxGeometry(0.08, 0.08, 0.24),
    ringGeometry: new THREE.TorusGeometry(0.92, 0.08, 8, 20),
    chainGeometry: new THREE.CylinderGeometry(0.07, 0.07, 1, 6),
  };
  const MAX_IMPACT_VISUAL_LIFETIME = 0.5;
  const DAMAGE_NUMBER_POP_DURATION = 0.22;
  const DAMAGE_NUMBER_REFRESH_PULSE = 0.16;
  const DAMAGE_NUMBER_BASE_FONT_PX = 192;

  const EFFECT_COLORS = {
    fire: 0xff8a4f,
    ice: 0x97e8ff,
    lightning: 0xb3b7ff,
    poison: 0x88ff73,
    rockets: 0xffb067,
    shield: 0x79d7ff,
    pickup: 0x35f3d1,
  };

  function getImpactVisualLifetime(life = MAX_IMPACT_VISUAL_LIFETIME) {
    return Math.min(MAX_IMPACT_VISUAL_LIFETIME, life);
  }

  function createParticleMaterial(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
  }

  function spawnVfxParticle(position, velocity, color, life = 0.35, scale = 1, kind = 'orb') {
    const budgets = state.performance.frameBudgets;
    if (budgets.vfxSpawns >= performance.getAdaptiveLimit(SAFETY_LIMITS.maxVfxSpawnPerFrame, 0.58, 0.34)) return;
    budgets.vfxSpawns += 1;

    const maxParticles = performance.getAdaptiveLimit(VFX.maxParticles, 0.62, 0.36);
    if (state.entities.vfxParticles.length >= maxParticles) {
      const oldest = state.entities.vfxParticles.shift();
      if (oldest) {
        scene.remove(oldest.mesh);
        oldest.mesh.material.dispose();
      }
    }

    const mesh = new THREE.Mesh(kind === 'shard' ? VFX.shardGeometry : VFX.particleGeometry, createParticleMaterial(color));
    mesh.position.copy(position);
    mesh.scale.setScalar(scale);
    scene.add(mesh);
    state.entities.vfxParticles.push({
      mesh,
      vel: velocity.clone(),
      life: getImpactVisualLifetime(life),
      maxLife: getImpactVisualLifetime(life),
      drag: 0.88 + Math.random() * 0.08,
      baseScale: scale,
      spin: (Math.random() - 0.5) * 8,
      kind,
    });
  }

  function maybeSpawnStatusVfx(position, velocity, color, life, scale, kind = 'orb') {
    const budgets = state.performance.frameBudgets;
    if (budgets.statusVfx >= performance.getAdaptiveLimit(SAFETY_LIMITS.maxStatusVfxPerFrame, 0.55, 0.28)) return;
    budgets.statusVfx += 1;
    spawnVfxParticle(position, velocity, color, life, scale, kind);
  }

  function maybeSpawnImpactVfx(position, velocity, color, life, scale, kind = 'orb') {
    maybeSpawnStatusVfx(position, velocity, color, getImpactVisualLifetime(life), scale, kind);
  }

  function spawnBurst(position, color, count, speed, life = 0.3, scale = 1, kind = 'orb') {
    const burstCount = Math.min(count, performance.getAdaptiveLimit(count, 0.6, 0.34));
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.5) * 0.7;
      temp.vec3B.set(Math.cos(angle), up, Math.sin(angle)).multiplyScalar(speed * (0.35 + Math.random() * 0.85));
      spawnVfxParticle(position, temp.vec3B, color, life * (0.8 + Math.random() * 0.5), scale * (0.65 + Math.random() * 0.65), kind);
    }
  }

  function spawnImpactBurst(position, color, count, speed, life = MAX_IMPACT_VISUAL_LIFETIME, scale = 1, kind = 'orb') {
    spawnBurst(position, color, count, speed, getImpactVisualLifetime(life), scale, kind);
  }

  function spawnImpactEffects(position, effects = {}) {
    spawnImpactBurst(position, 0xf6efe1, 3, 2.8, 0.18, 0.62, 'shard');
    if (effects.fire) {
      spawnImpactBurst(position, EFFECT_COLORS.fire, 7, 4.1, 0.42, 1, 'shard');
      spawnImpactBurst(position, 0xffdd91, 4, 2.4, 0.24, 0.6);
    }
    if (effects.ice) {
      spawnImpactBurst(position, EFFECT_COLORS.ice, 6, 3.5, 0.4, 0.9, 'shard');
      spawnImpactBurst(position, 0xf3ffff, 4, 2.1, 0.18, 0.52);
    }
    if (effects.poison) {
      spawnImpactBurst(position, 0x94ff73, 6, 2.7, 0.44, 1);
      spawnImpactBurst(position, 0xb6ff9f, 3, 1.8, 0.22, 0.58, 'shard');
    }
    if (effects.lightning) {
      spawnImpactBurst(position, EFFECT_COLORS.lightning, 5, 4.6, 0.26, 0.82, 'shard');
      spawnImpactBurst(position, 0xffffff, 2, 2.5, 0.14, 0.38);
    }
    if (effects.rockets) {
      spawnImpactBurst(position, EFFECT_COLORS.rockets, 10, 5.3, 0.45, 1.08, 'shard');
      spawnImpactBurst(position, 0xffe29b, 5, 3.2, 0.2, 0.52);
    }
  }

  function getDamageNumberVisualConfig(amount) {
    const safeAmount = Math.max(1, Math.round(amount));
    const digits = String(safeAmount).length;
    const logAmount = Math.log10(safeAmount + 1);
    const normalized = THREE.MathUtils.clamp(logAmount / 3.4, 0, 1);
    const eased = 1 - Math.pow(1 - normalized, 2.2);
    const fontScale = 1 + eased * 0.95;
    const fontPx = Math.round(THREE.MathUtils.clamp(DAMAGE_NUMBER_BASE_FONT_PX * fontScale, DAMAGE_NUMBER_BASE_FONT_PX, 364));
    const strokePx = Math.round(THREE.MathUtils.clamp(fontPx * 0.14, 18, 40));
    const widthEstimate = fontPx * (0.88 + digits * 0.68) + strokePx * 6;
    const heightEstimate = fontPx * 1.7 + strokePx * 4;
    const canvasWidth = THREE.MathUtils.clamp(Math.ceil(widthEstimate / 64) * 64, 512, 1024);
    const canvasHeight = THREE.MathUtils.clamp(Math.ceil(heightEstimate / 64) * 64, 256, 512);
    const targetScale = 1 + eased * 0.18;
    const spawnScale = targetScale + 0.34 + eased * 0.18;
    const popStrength = 0.55 + eased * 0.65;
    const spriteHeight = 2.28 * fontScale;
    const spriteWidth = spriteHeight * (canvasWidth / canvasHeight) * 0.72;

    return {
      amount: safeAmount,
      digits,
      fontScale,
      fontPx,
      strokePx,
      canvasWidth,
      canvasHeight,
      spriteWidth,
      spriteHeight,
      targetScale,
      spawnScale,
      popStrength,
    };
  }

  function applyDamageNumberVisualConfig(entry, amount) {
    const visual = getDamageNumberVisualConfig(amount);
    entry.amountTotal = visual.amount;
    entry.fontScale = visual.fontScale;
    entry.fontPx = visual.fontPx;
    entry.strokePx = visual.strokePx;
    entry.targetScale = visual.targetScale;
    entry.spawnScale = visual.spawnScale;
    entry.popStrength = visual.popStrength;
    entry.pulseStrength = visual.popStrength;
    entry.baseSpriteWidth = visual.spriteWidth;
    entry.baseSpriteHeight = visual.spriteHeight;
    entry.baseScale = visual.targetScale;
    entry.maxScale = Math.max(entry.maxScale || 0, visual.spawnScale);
    entry.currentScale = entry.currentScale || visual.spawnScale;
    if (entry.canvas.width !== visual.canvasWidth) entry.canvas.width = visual.canvasWidth;
    if (entry.canvas.height !== visual.canvasHeight) entry.canvas.height = visual.canvasHeight;
  }

  function triggerDamageNumberPulse(entry, intensity = 1) {
    entry.age = 0;
    entry.pulseTime = 0;
    entry.pulseStrength = Math.min(1.8, entry.popStrength + DAMAGE_NUMBER_REFRESH_PULSE * intensity);
    entry.spawnScale = Math.max(
      entry.targetScale + 0.22,
      entry.targetScale + entry.pulseStrength * (0.16 + intensity * 0.05)
    );
    entry.currentScale = Math.max(entry.currentScale || 0, entry.spawnScale);
    entry.maxScale = Math.max(entry.maxScale || 0, entry.spawnScale);
  }

  function updateDamageNumberTexture(entry) {
    if (!entry?.ctx) return;
    const { canvas, ctx, amountTotal, texture, fontPx, strokePx } = entry;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `800 ${fontPx}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = strokePx;
    ctx.strokeStyle = 'rgba(20, 10, 30, 0.92)';
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.strokeText(String(amountTotal), centerX, centerY);
    const gradient = ctx.createLinearGradient(0, strokePx, canvas.width, canvas.height - strokePx);
    gradient.addColorStop(0, '#fff4bf');
    gradient.addColorStop(0.55, '#ffd16a');
    gradient.addColorStop(1, '#ff8c5a');
    ctx.fillStyle = gradient;
    ctx.fillText(String(amountTotal), centerX, centerY);
    texture.needsUpdate = true;
  }

  function disposeDamageNumber(entry) {
    if (!entry) return;
    const enemyData = getEnemyData(entry.enemy);
    if (enemyData && enemyData.damageNumberEntry === entry) enemyData.damageNumberEntry = null;
    scene.remove(entry.sprite);
    entry.texture?.dispose?.();
    entry.sprite.material.dispose();
  }

  function removeDamageNumberEntry(entry) {
    if (!entry) return;
    const index = state.entities.damageNumbers.indexOf(entry);
    if (index >= 0) state.entities.damageNumbers.splice(index, 1);
    disposeDamageNumber(entry);
  }

  function updateDamageNumberAnchor(entry, enemyData) {
    const timerProgress = THREE.MathUtils.clamp(enemyData.damageNumberTimer / 3, 0, 1);
    entry.sprite.position.copy(entry.enemy.position);
    entry.sprite.position.y += enemyData.hitboxCenterOffsetY + enemyData.hitboxHalfHeight + 0.34 + timerProgress * entry.riseSpeed;
  }

  function refreshDamageNumberEntry(entry, totalAmount, enemyData) {
    entry.amountTotal = Math.max(1, Math.round(totalAmount));
    entry.hitCount = (entry.hitCount || 0) + 1;
    applyDamageNumberVisualConfig(entry, entry.amountTotal);
    triggerDamageNumberPulse(entry, Math.min(1.45, 0.75 + Math.log10(entry.amountTotal + 1) * 0.22));
    updateDamageNumberTexture(entry);
    updateDamageNumberAnchor(entry, enemyData);
  }

  function createDamageNumberEntry(enemy, totalAmount, enemyData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    scene.add(sprite);

    const entry = {
      sprite,
      texture,
      canvas,
      ctx,
      amountTotal: 0,
      enemy,
      riseSpeed: 1.05,
      age: 0,
      pulseTime: 0,
      pulseStrength: 0.7,
      targetScale: 1,
      spawnScale: 1.35,
      baseScale: 1,
      currentScale: 1.35,
      maxScale: 1.35,
      popStrength: 0.7,
      baseSpriteWidth: 4.4,
      baseSpriteHeight: 2.28,
      fontScale: 1,
      fontPx: DAMAGE_NUMBER_BASE_FONT_PX,
      strokePx: 24,
      hitCount: 0,
    };

    refreshDamageNumberEntry(entry, totalAmount, enemyData);
    sprite.scale.set(entry.baseSpriteWidth * entry.spawnScale, entry.baseSpriteHeight * entry.spawnScale, 1);
    enemyData.damageNumberEntry = entry;
    state.entities.damageNumbers.push(entry);
    return entry;
  }

  function upsertEnemyDamageNumber(enemy, totalAmount) {
    const enemyData = getEnemyData(enemy);
    if (!enemyData) {
      logInvalidEnemyReference(state, 'vfx.upsertEnemyDamageNumber', enemy);
      return;
    }

    const resolvedTotal = Math.max(1, Math.round(totalAmount));
    let entry = enemyData.damageNumberEntry;
    if (entry && (!state.entities.damageNumbers.includes(entry) || entry.enemy !== enemy)) {
      enemyData.damageNumberEntry = null;
      entry = null;
    }

    if (entry) {
      refreshDamageNumberEntry(entry, resolvedTotal, enemyData);
      return;
    }

    createDamageNumberEntry(enemy, resolvedTotal, enemyData);
  }

  function removeEnemyDamageNumber(enemy) {
    if (!enemy) return;
    const enemyData = getEnemyData(enemy);
    const directEntry = enemyData?.damageNumberEntry || null;
    if (directEntry) {
      removeDamageNumberEntry(directEntry);
      if (enemyData) enemyData.damageNumberEntry = null;
      return;
    }
    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) {
      const staleEntry = state.entities.damageNumbers[i];
      if (!staleEntry || staleEntry.enemy !== enemy) continue;
      removeDamageNumberEntry(staleEntry);
    }
    if (enemyData) enemyData.damageNumberEntry = null;
  }

  function getDamageNumberScale(entry) {
    const pulseProgress = THREE.MathUtils.clamp(entry.pulseTime / DAMAGE_NUMBER_POP_DURATION, 0, 1);
    const overshoot = Math.sin(pulseProgress * Math.PI) * entry.pulseStrength * 0.1;
    const rebound = Math.sin(pulseProgress * Math.PI * 2.1) * Math.exp(-4.4 * pulseProgress) * entry.pulseStrength * 0.12;
    const settle = 1 - Math.pow(1 - pulseProgress, 3);
    const pulsedScale = THREE.MathUtils.lerp(entry.spawnScale, entry.targetScale, settle) + overshoot + rebound;
    const driftProgress = Math.min(entry.age, 1.35);
    const lifeDrift = 1 + driftProgress * 0.045;
    const scale = Math.max(entry.targetScale * 0.94, pulsedScale) * lifeDrift;
    entry.currentScale = THREE.MathUtils.lerp(entry.currentScale || scale, scale, 0.35);
    return entry.currentScale;
  }

  function disposeChainBeam(entry) {
    if (!entry) return;
    scene.remove(entry.mesh);
    entry.mesh.material.dispose();
  }

  function createChainBeam(from, to) {
    const budgets = state.performance.frameBudgets;
    const maxChainsPerFrame = performance.getAdaptiveLimit(SAFETY_LIMITS.maxLightningChainsPerFrame, 0.65, 0.4);
    if (budgets.lightningChains >= maxChainsPerFrame) return false;
    budgets.lightningChains += 1;

    const maxChainBeams = performance.getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams, 0.68, 0.38);
    if (state.entities.chainBeams.length >= maxChainBeams) {
      const oldest = state.entities.chainBeams.shift();
      if (oldest) disposeChainBeam(oldest);
    }

    const beam = new THREE.Mesh(
      VFX.chainGeometry,
      new THREE.MeshBasicMaterial({ color: 0xc7ccff, transparent: true, opacity: 0.95, depthWrite: false })
    );
    beam.position.copy(from).lerp(to, 0.5);
    beam.position.y += 1.2;
    temp.vec3A.subVectors(to, from);
    const len = Math.max(0.5, temp.vec3A.length());
    beam.scale.set(1, len, 1);
    temp.quatA.setFromUnitVectors(sceneResources.WORLD_UP, temp.vec3A.normalize());
    beam.quaternion.copy(temp.quatA);
    scene.add(beam);

    const beamLife = getImpactVisualLifetime(0.12);
    state.entities.chainBeams.push({ mesh: beam, life: beamLife, maxLife: beamLife, baseScale: beam.scale.clone() });
    return true;
  }

  function spawnExplosionRing(position, radius) {
    const maxChainBeams = performance.getAdaptiveLimit(SAFETY_LIMITS.maxChainBeams, 0.68, 0.38);
    if (state.entities.chainBeams.length >= maxChainBeams) {
      const oldest = state.entities.chainBeams.shift();
      if (oldest) disposeChainBeam(oldest);
    }
    const blastRing = new THREE.Mesh(
      VFX.ringGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff9d5f, transparent: true, opacity: 0.75, depthWrite: false })
    );
    blastRing.position.copy(position).setY(0.25);
    blastRing.rotation.x = Math.PI / 2;
    blastRing.scale.setScalar(Math.max(0.8, radius * 0.45));
    scene.add(blastRing);
    const ringLife = getImpactVisualLifetime(0.18);
    state.entities.chainBeams.push({ mesh: blastRing, life: ringLife, maxLife: ringLife, ring: true, baseScale: blastRing.scale.clone() });
  }

  function update(dt) {
    for (let i = state.entities.vfxParticles.length - 1; i >= 0; i--) {
      const fx = state.entities.vfxParticles[i];
      fx.life -= dt;
      if (fx.life <= 0) {
        scene.remove(fx.mesh);
        fx.mesh.material.dispose();
        state.entities.vfxParticles.splice(i, 1);
        continue;
      }
      fx.mesh.position.addScaledVector(fx.vel, dt);
      fx.vel.multiplyScalar(Math.pow(fx.drag, dt * 60));
      fx.mesh.rotation.y += fx.spin * dt;
      fx.mesh.rotation.x += fx.spin * 0.55 * dt;
      const alpha = THREE.MathUtils.clamp(fx.life / Math.max(0.001, fx.maxLife), 0, 1);
      fx.mesh.material.opacity = alpha;
      const growth = fx.kind === 'shard' ? 0.7 + (1 - alpha) * 0.34 : 0.55 + alpha * 0.45;
      fx.mesh.scale.setScalar(fx.baseScale * growth);
    }

    for (let i = state.entities.chainBeams.length - 1; i >= 0; i--) {
      const entry = state.entities.chainBeams[i];
      entry.life -= dt;
      if (entry.life <= 0) {
        disposeChainBeam(entry);
        state.entities.chainBeams.splice(i, 1);
        continue;
      }
      const alpha = THREE.MathUtils.clamp(entry.life / Math.max(0.001, entry.maxLife), 0, 1);
      entry.mesh.material.opacity = alpha * (entry.ring ? 0.8 : 0.95);
      if (entry.ring && entry.baseScale) {
        const growth = 1 + (1 - alpha) * 1.15;
        entry.mesh.scale.copy(entry.baseScale).multiplyScalar(growth);
      }
    }

    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) {
      const entry = state.entities.damageNumbers[i];
      const enemy = entry.enemy;
      const enemyData = getEnemyData(enemy);
      if (!enemyData || enemyData.dead) {
        removeDamageNumberEntry(entry);
        continue;
      }

      entry.age += dt;
      entry.pulseTime += dt;

      updateDamageNumberAnchor(entry, enemyData);
      entry.sprite.material.opacity = 1;
      const scale = getDamageNumberScale(entry);
      entry.sprite.scale.set(entry.baseSpriteWidth * scale, entry.baseSpriteHeight * scale, 1);
    }
  }

  function clear() {
    state.entities.vfxParticles.forEach((fx) => {
      scene.remove(fx.mesh);
      fx.mesh.material.dispose();
    });
    state.entities.chainBeams.forEach(disposeChainBeam);
    state.entities.damageNumbers.forEach(disposeDamageNumber);
    state.entities.vfxParticles.length = 0;
    state.entities.chainBeams.length = 0;
    state.entities.damageNumbers.length = 0;
  }

  return {
    VFX,
    EFFECT_COLORS,
    MAX_IMPACT_VISUAL_LIFETIME,
    spawnVfxParticle,
    maybeSpawnStatusVfx,
    maybeSpawnImpactVfx,
    spawnBurst,
    spawnImpactBurst,
    spawnImpactEffects,
    upsertEnemyDamageNumber,
    removeEnemyDamageNumber,
    createChainBeam,
    spawnExplosionRing,
    disposeChainBeam,
    update,
    clear,
  };
}
