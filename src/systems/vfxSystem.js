import { getEnemyData } from './enemyRuntimeUtils.js';

export function createVfxSystem({ THREE, scene, state, performance, SAFETY_LIMITS, temp, sceneResources }) {
  const VFX = {
    maxParticles: 340,
    particleGeometry: new THREE.SphereGeometry(0.085, 6, 6),
    shardGeometry: new THREE.BoxGeometry(0.08, 0.08, 0.24),
    ringGeometry: new THREE.TorusGeometry(0.92, 0.08, 8, 20),
    chainGeometry: new THREE.CylinderGeometry(0.07, 0.07, 1, 6),
  };
  const MAX_IMPACT_VISUAL_LIFETIME = 0.5;
  const DAMAGE_NUMBER_LIFETIME = 2;

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

  function removeDamageNumberAtIndex(index) {
    const entry = state.entities.damageNumbers[index];
    if (!entry) return;
    scene.remove(entry.sprite);
    entry.sprite.material.map?.dispose();
    entry.sprite.material.dispose();
    const enemyData = getEnemyData(entry.enemy);
    if (enemyData?.damageNumberEntry === entry) enemyData.damageNumberEntry = null;
    state.entities.damageNumbers.splice(index, 1);
  }

  function clearEnemyDamageNumber(enemy) {
    const data = getEnemyData(enemy);
    const entry = data?.damageNumberEntry;
    if (!entry) return;
    const index = state.entities.damageNumbers.indexOf(entry);
    if (index >= 0) removeDamageNumberAtIndex(index);
    else if (data) data.damageNumberEntry = null;
  }

  function createDamageNumberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { canvas, context, texture };
  }

  function formatDamageNumber(value) {
    return Math.round(value).toLocaleString('de-DE');
  }

  function getDamageNumberScale(totalDamage) {
    const emphasis = THREE.MathUtils.clamp(Math.log2(Math.max(1, totalDamage) + 1), 1, 8);
    return 1.2 + emphasis * 0.22;
  }

  function redrawDamageNumber(entry) {
    const { canvas, context, texture } = entry;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const totalDamage = Math.max(1, Math.round(entry.totalDamage));
    const text = formatDamageNumber(totalDamage);
    const emphasis = THREE.MathUtils.clamp(Math.log2(totalDamage + 1), 1, 10);
    const fontSize = Math.round(108 + emphasis * 12);
    const y = canvas.height * 0.62;

    const fill = context.createLinearGradient(0, 32, 0, canvas.height - 20);
    fill.addColorStop(0, '#fff9ef');
    fill.addColorStop(0.48, totalDamage >= 100 ? '#ffd27a' : '#fdf7ef');
    fill.addColorStop(1, totalDamage >= 250 ? '#ff9870' : '#f0d7ff');

    context.font = `900 ${fontSize}px Inter, Arial Black, Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.shadowColor = totalDamage >= 250 ? 'rgba(255, 138, 92, 0.85)' : 'rgba(116, 66, 255, 0.7)';
    context.shadowBlur = 28 + emphasis * 4;
    context.strokeStyle = 'rgba(35, 18, 70, 0.96)';
    context.lineWidth = 20 + emphasis * 1.2;
    context.strokeText(text, canvas.width * 0.5, y);

    context.shadowBlur = 0;
    context.fillStyle = fill;
    context.fillText(text, canvas.width * 0.5, y);

    context.lineWidth = 4;
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    context.strokeText(text, canvas.width * 0.5, y - 4);
    texture.needsUpdate = true;
  }

  function showEnemyDamageNumber(enemy, amount) {
    const data = getEnemyData(enemy);
    const resolvedAmount = Math.max(0, amount);
    if (!data || data.dead || resolvedAmount <= 0) return;

    let entry = data.damageNumberEntry;
    if (!entry) {
      const maxDamageNumbers = performance.getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbers || 24, 0.75, 0.5);
      if (state.entities.damageNumbers.length >= maxDamageNumbers) removeDamageNumberAtIndex(0);

      const spriteData = createDamageNumberTexture();
      const material = new THREE.SpriteMaterial({
        map: spriteData.texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: 1,
      });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 18;
      scene.add(sprite);
      entry = {
        enemy,
        sprite,
        totalDamage: 0,
        life: DAMAGE_NUMBER_LIFETIME,
        maxLife: DAMAGE_NUMBER_LIFETIME,
        pulse: 0,
        pulseStrength: 0,
        floatPhase: Math.random() * Math.PI * 2,
        baseHeight: 0,
        driftX: (Math.random() - 0.5) * 0.22,
        driftZ: (Math.random() - 0.5) * 0.22,
        ...spriteData,
      };
      state.entities.damageNumbers.push(entry);
      data.damageNumberEntry = entry;
    }

    entry.totalDamage += resolvedAmount;
    entry.life = DAMAGE_NUMBER_LIFETIME;
    entry.maxLife = DAMAGE_NUMBER_LIFETIME;
    entry.pulse = 0.22;
    entry.pulseStrength = Math.min(1.45, 0.55 + Math.log10(entry.totalDamage + 10) * 0.48);
    entry.baseHeight = data.hitboxCenterOffsetY + data.hitboxHalfHeight + Math.max(0.35, data.hitboxRadius * 0.5);
    redrawDamageNumber(entry);
  }

  function updateDamageNumbers(dt) {
    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) {
      const entry = state.entities.damageNumbers[i];
      const data = getEnemyData(entry.enemy);
      if (!data || data.dead) {
        removeDamageNumberAtIndex(i);
        continue;
      }

      entry.life -= dt;
      if (entry.life <= 0) {
        removeDamageNumberAtIndex(i);
        continue;
      }

      entry.floatPhase += dt * 4.8;
      entry.pulse = Math.max(0, entry.pulse - dt);
      const alpha = THREE.MathUtils.clamp(entry.life / entry.maxLife, 0, 1);
      const fade = alpha < 0.32 ? alpha / 0.32 : 1;
      const pulseT = 1 - (entry.pulse / 0.22);
      const pulseWave = entry.pulse > 0 ? Math.sin(pulseT * Math.PI) : 0;
      const pulseBoost = 1 + pulseWave * entry.pulseStrength * 0.32;
      const driftLift = (1 - alpha) * 0.55;
      const hover = Math.sin(entry.floatPhase) * 0.12;
      const scale = getDamageNumberScale(entry.totalDamage) * pulseBoost;

      entry.sprite.position.set(
        entry.enemy.position.x + entry.driftX,
        entry.enemy.position.y + entry.baseHeight + driftLift + hover,
        entry.enemy.position.z + entry.driftZ,
      );
      entry.sprite.material.opacity = THREE.MathUtils.clamp(0.25 + fade * 0.95, 0, 1);
      entry.sprite.scale.set(1.85 * scale, 0.96 * scale, 1);
    }
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

    updateDamageNumbers(dt);
  }

  function clear() {
    state.entities.vfxParticles.forEach((fx) => {
      scene.remove(fx.mesh);
      fx.mesh.material.dispose();
    });
    state.entities.chainBeams.forEach(disposeChainBeam);
    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) removeDamageNumberAtIndex(i);
    state.entities.vfxParticles.length = 0;
    state.entities.chainBeams.length = 0;
    state.entities.damageNumbers.length = 0;
  }

  return {
    VFX,
    EFFECT_COLORS,
    MAX_IMPACT_VISUAL_LIFETIME,
    showEnemyDamageNumber,
    clearEnemyDamageNumber,
    spawnVfxParticle,
    maybeSpawnStatusVfx,
    maybeSpawnImpactVfx,
    spawnBurst,
    spawnImpactBurst,
    spawnImpactEffects,
    createChainBeam,
    spawnExplosionRing,
    disposeChainBeam,
    update,
    clear,
  };
}
