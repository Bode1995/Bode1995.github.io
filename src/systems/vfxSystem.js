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
  const DAMAGE_NUMBER_PULSE_LIFETIME = 0.22;
  const damageNumberPool = [];
  const vfxParticlePool = [];

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

  function createParticleMaterial(color = 0xffffff) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
  }

  function resetVfxParticle(entry) {
    if (!entry) return entry;
    entry.vel.set(0, 0, 0);
    entry.life = 0;
    entry.maxLife = 0;
    entry.drag = 1;
    entry.baseScale = 1;
    entry.spin = 0;
    entry.kind = 'orb';
    entry.effectTag = null;
    entry.mesh.visible = false;
    entry.mesh.position.set(0, 0, 0);
    entry.mesh.rotation.set(0, 0, 0);
    entry.mesh.scale.setScalar(1);
    entry.mesh.geometry = VFX.particleGeometry;
    entry.mesh.material.color.setHex(0xffffff);
    entry.mesh.material.opacity = 0;
    return entry;
  }

  function createVfxParticlePoolEntry() {
    const material = createParticleMaterial();
    const mesh = new THREE.Mesh(VFX.particleGeometry, material);
    return resetVfxParticle({
      mesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0,
      drag: 1,
      baseScale: 1,
      spin: 0,
      kind: 'orb',
    });
  }

  function recycleVfxParticle(entry) {
    if (!entry) return;
    scene.remove(entry.mesh);
    resetVfxParticle(entry);
    vfxParticlePool.push(entry);
  }

  function acquireVfxParticle(position, velocity, color, life, scale, kind, effectTag = null) {
    const entry = vfxParticlePool.pop() || createVfxParticlePoolEntry();
    const resolvedLife = getImpactVisualLifetime(life);
    entry.mesh.geometry = kind === 'shard' ? VFX.shardGeometry : VFX.particleGeometry;
    entry.mesh.visible = true;
    entry.mesh.position.copy(position);
    entry.mesh.rotation.set(0, 0, 0);
    entry.mesh.scale.setScalar(scale);
    entry.mesh.material.color.set(color);
    entry.mesh.material.opacity = 0.95;
    entry.vel.copy(velocity);
    entry.life = resolvedLife;
    entry.maxLife = resolvedLife;
    entry.drag = 0.88 + Math.random() * 0.08;
    entry.baseScale = scale;
    entry.spin = (Math.random() - 0.5) * 8;
    entry.kind = kind;
    entry.effectTag = effectTag;
    scene.add(entry.mesh);
    return entry;
  }

  function spawnVfxParticle(position, velocity, color, life = 0.35, scale = 1, kind = 'orb', effectTag = null) {
    const budgets = state.performance.frameBudgets;
    if (budgets.vfxSpawns >= performance.getAdaptiveLimit(SAFETY_LIMITS.maxVfxSpawnPerFrame, 0.58, 0.34)) return;
    budgets.vfxSpawns += 1;

    const maxParticles = performance.getAdaptiveLimit(VFX.maxParticles, 0.62, 0.36);
    if (state.entities.vfxParticles.length >= maxParticles) {
      const oldest = state.entities.vfxParticles.shift();
      if (oldest) recycleVfxParticle(oldest);
    }

    state.entities.vfxParticles.push(acquireVfxParticle(position, velocity, color, life, scale, kind, effectTag));
  }

  function maybeSpawnStatusVfx(position, velocity, color, life, scale, kind = 'orb', effectTag = null) {
    const budgets = state.performance.frameBudgets;
    if (budgets.statusVfx >= performance.getAdaptiveLimit(SAFETY_LIMITS.maxStatusVfxPerFrame, 0.55, 0.28)) return;
    budgets.statusVfx += 1;
    spawnVfxParticle(position, velocity, color, life, scale, kind, effectTag);
  }

  function maybeSpawnImpactVfx(position, velocity, color, life, scale, kind = 'orb', effectTag = null) {
    maybeSpawnStatusVfx(position, velocity, color, getImpactVisualLifetime(life), scale, kind, effectTag);
  }

  function spawnBurst(position, color, count, speed, life = 0.3, scale = 1, kind = 'orb', effectTag = null) {
    const burstCount = Math.min(count, performance.getAdaptiveLimit(count, 0.6, 0.34));
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.5) * 0.7;
      temp.vec3B.set(Math.cos(angle), up, Math.sin(angle)).multiplyScalar(speed * (0.35 + Math.random() * 0.85));
      spawnVfxParticle(position, temp.vec3B, color, life * (0.8 + Math.random() * 0.5), scale * (0.65 + Math.random() * 0.65), kind, effectTag);
    }
  }

  function spawnImpactBurst(position, color, count, speed, life = MAX_IMPACT_VISUAL_LIFETIME, scale = 1, kind = 'orb', effectTag = null) {
    spawnBurst(position, color, count, speed, getImpactVisualLifetime(life), scale, kind, effectTag);
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
      spawnImpactBurst(position, EFFECT_COLORS.lightning, 5, 4.6, 0.26, 0.82, 'shard', 'lightning');
      spawnImpactBurst(position, 0xffffff, 2, 2.5, 0.14, 0.38, 'orb', 'lightning');
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

  function getEnemyDamageNumberMetrics(enemy, data = getEnemyData(enemy)) {
    if (!data || data.dead) return null;
    const baseHeight = data.hitboxCenterOffsetY + data.hitboxHalfHeight + Math.max(0.35, data.hitboxRadius * 0.5);
    const mergeRadius = Math.max(0.24, Math.min(data.hitboxRadius * 0.58 + 0.12, data.hitboxRadius * 0.85));
    return {
      enemy,
      data,
      anchorX: enemy.position.x,
      anchorY: enemy.position.y + baseHeight,
      anchorZ: enemy.position.z,
      baseHeight,
      mergeRadius,
      hitboxRadius: data.hitboxRadius,
      hitboxHalfHeight: data.hitboxHalfHeight,
    };
  }

  function getDamageNumberMergeDistance(entry, metrics) {
    const entryRadius = entry?.mergeRadius ?? 0;
    const metricsRadius = metrics?.mergeRadius ?? 0;
    const largerRadius = Math.max(entryRadius, metricsRadius);
    const smallerRadius = Math.min(entryRadius, metricsRadius);
    return THREE.MathUtils.clamp(0.42 + largerRadius * 1.45 + smallerRadius * 0.45, 0.42, 1.05);
  }

  function getDamageNumberMergeVerticalAllowance(entry, metrics) {
    const entryHeight = entry?.baseHeight ?? 0;
    const metricsHeight = metrics?.baseHeight ?? 0;
    return THREE.MathUtils.clamp(Math.max(0.3, Math.min(entryHeight, metricsHeight) * 0.28), 0.3, 0.75);
  }

  function getDamageNumberMergeFit(entry, metrics) {
    if (!entry || !metrics) return null;
    const dx = (entry.anchorX ?? 0) - metrics.anchorX;
    const dz = (entry.anchorZ ?? 0) - metrics.anchorZ;
    const xzDistanceSq = dx * dx + dz * dz;
    const mergeDistance = getDamageNumberMergeDistance(entry, metrics);
    if (xzDistanceSq > mergeDistance * mergeDistance) return null;

    const dy = Math.abs((entry.anchorY ?? metrics.anchorY) - metrics.anchorY);
    if (dy > getDamageNumberMergeVerticalAllowance(entry, metrics)) return null;

    return { xzDistanceSq, dy };
  }

  function removeEnemyFromDamageNumberEntry(entry, enemy, data = getEnemyData(enemy)) {
    if (!entry?.members || !enemy) return;
    entry.members.delete(enemy);
    if (data?.damageNumberEntry === entry) data.damageNumberEntry = null;
  }

  function recalculateDamageNumberAnchor(entry, dt = 0) {
    if (!entry) return 0;
    const memberMetrics = [];

    if (entry.members?.size) {
      for (const enemy of [...entry.members]) {
        const metrics = getEnemyDamageNumberMetrics(enemy);
        if (!metrics) {
          removeEnemyFromDamageNumberEntry(entry, enemy);
          continue;
        }
        memberMetrics.push(metrics);
      }
    }

    if (memberMetrics.length <= 0) return 0;

    let clusteredMetrics = memberMetrics;
    if (memberMetrics.length > 1) {
      let centroidX = 0;
      let centroidZ = 0;
      let averageMergeRadius = 0;
      for (const metrics of memberMetrics) {
        centroidX += metrics.anchorX;
        centroidZ += metrics.anchorZ;
        averageMergeRadius += metrics.mergeRadius;
      }
      centroidX /= memberMetrics.length;
      centroidZ /= memberMetrics.length;
      averageMergeRadius /= memberMetrics.length;

      const splitDistance = THREE.MathUtils.clamp(averageMergeRadius * 2.15 + 0.22, 0.55, 1.18);
      const splitDistanceSq = splitDistance * splitDistance;
      clusteredMetrics = memberMetrics.filter((metrics) => {
        const dx = metrics.anchorX - centroidX;
        const dz = metrics.anchorZ - centroidZ;
        return dx * dx + dz * dz <= splitDistanceSq;
      });

      if (clusteredMetrics.length <= 0) clusteredMetrics = memberMetrics;
      if (clusteredMetrics.length < memberMetrics.length) {
        const clusteredEnemies = new Set(clusteredMetrics.map((metrics) => metrics.enemy));
        for (const metrics of memberMetrics) {
          if (!clusteredEnemies.has(metrics.enemy)) {
            removeEnemyFromDamageNumberEntry(entry, metrics.enemy, metrics.data);
          }
        }
      }
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let sumBaseHeight = 0;
    let sumMergeRadius = 0;
    let sumHitboxRadius = 0;

    for (const metrics of clusteredMetrics) {
      sumX += metrics.anchorX;
      sumY += metrics.anchorY;
      sumZ += metrics.anchorZ;
      sumBaseHeight += metrics.baseHeight;
      sumMergeRadius += metrics.mergeRadius;
      sumHitboxRadius += metrics.hitboxRadius;
    }

    const liveCount = clusteredMetrics.length;
    const inv = 1 / liveCount;
    const targetAnchorX = sumX * inv;
    const targetAnchorY = sumY * inv;
    const targetAnchorZ = sumZ * inv;
    const smoothing = dt > 0 ? 1 - Math.exp(-dt * 12) : 1;

    if (entry.anchorX == null) {
      entry.anchorX = targetAnchorX;
      entry.anchorY = targetAnchorY;
      entry.anchorZ = targetAnchorZ;
    } else if (smoothing >= 1) {
      entry.anchorX = targetAnchorX;
      entry.anchorY = targetAnchorY;
      entry.anchorZ = targetAnchorZ;
    } else {
      entry.anchorX = THREE.MathUtils.lerp(entry.anchorX, targetAnchorX, smoothing);
      entry.anchorY = THREE.MathUtils.lerp(entry.anchorY, targetAnchorY, smoothing);
      entry.anchorZ = THREE.MathUtils.lerp(entry.anchorZ, targetAnchorZ, smoothing);
    }

    entry.baseHeight = sumBaseHeight * inv;
    entry.mergeRadius = sumMergeRadius * inv;
    entry.hitboxRadius = sumHitboxRadius * inv;
    return liveCount;
  }

  function findDamageNumberMergeCandidate(metrics, preferredEntry = null) {
    if (!metrics) return null;

    const matchesEntry = (entry) => getDamageNumberMergeFit(entry, metrics);

    if (matchesEntry(preferredEntry)) return preferredEntry;

    let bestEntry = null;
    let bestScore = Infinity;
    for (let i = 0; i < state.entities.damageNumbers.length; i++) {
      const entry = state.entities.damageNumbers[i];
      if (entry === preferredEntry) continue;
      const fit = matchesEntry(entry);
      if (!fit) continue;
      const score = fit.xzDistanceSq + fit.dy * 0.08;
      if (score < bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }
    return bestEntry;
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
    state.entities.chainBeams.push({ mesh: beam, life: beamLife, maxLife: beamLife, baseScale: beam.scale.clone(), effectTag: 'lightning' });
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

  function resetDamageNumberEntry(entry, metrics = null) {
    entry.totalDamage = 0;
    entry.life = DAMAGE_NUMBER_LIFETIME;
    entry.maxLife = DAMAGE_NUMBER_LIFETIME;
    entry.pulse = 0;
    entry.pulseStrength = 0;
    entry.floatPhase = Math.random() * Math.PI * 2;
    entry.baseHeight = metrics?.baseHeight ?? 0;
    entry.anchorX = metrics?.anchorX ?? 0;
    entry.anchorY = metrics?.anchorY ?? 0;
    entry.anchorZ = metrics?.anchorZ ?? 0;
    entry.mergeRadius = metrics?.mergeRadius ?? 0;
    entry.hitboxRadius = metrics?.hitboxRadius ?? 0;
    entry.driftX = (Math.random() - 0.5) * 0.22;
    entry.driftZ = (Math.random() - 0.5) * 0.22;
    entry.members.clear();

    const { canvas, context, texture, sprite } = entry;
    context.clearRect(0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
    sprite.visible = false;
    sprite.position.set(0, 0, 0);
    sprite.scale.set(1, 1, 1);
    sprite.material.opacity = 1;
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

  function createDamageNumberPoolEntry() {
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

    const entry = {
      sprite,
      members: new Set(),
      ...spriteData,
    };
    resetDamageNumberEntry(entry);
    return entry;
  }

  function acquireDamageNumberEntry(metrics) {
    const entry = damageNumberPool.pop() || createDamageNumberPoolEntry();
    resetDamageNumberEntry(entry, metrics);
    entry.sprite.visible = true;
    scene.add(entry.sprite);
    return entry;
  }

  function releaseDamageNumberEntry(entry) {
    if (!entry) return;
    scene.remove(entry.sprite);
    if (entry.members?.size) {
      for (const enemy of entry.members) {
        const enemyData = getEnemyData(enemy);
        if (enemyData?.damageNumberEntry === entry) enemyData.damageNumberEntry = null;
      }
    }
    resetDamageNumberEntry(entry);
    damageNumberPool.push(entry);
  }

  function disposeDamageNumberEntry(entry) {
    if (!entry) return;
    scene.remove(entry.sprite);
    if (entry.members?.size) {
      for (const enemy of entry.members) {
        const enemyData = getEnemyData(enemy);
        if (enemyData?.damageNumberEntry === entry) enemyData.damageNumberEntry = null;
      }
      entry.members.clear();
    }
    entry.sprite.material.map?.dispose();
    entry.sprite.material.dispose();
  }

  function removeDamageNumberAtIndex(index) {
    const entry = state.entities.damageNumbers[index];
    if (!entry) return;
    state.entities.damageNumbers.splice(index, 1);
    releaseDamageNumberEntry(entry);
  }

  function clearEnemyDamageNumber(enemy) {
    const data = getEnemyData(enemy);
    const entry = data?.damageNumberEntry;
    if (!entry) return;
    const index = state.entities.damageNumbers.indexOf(entry);
    if (index < 0) {
      if (data) data.damageNumberEntry = null;
      return;
    }

    removeEnemyFromDamageNumberEntry(entry, enemy, data);
    if (!entry.members?.size) removeDamageNumberAtIndex(index);
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

    const metrics = getEnemyDamageNumberMetrics(enemy, data);
    if (!metrics) return;

    let entry = data.damageNumberEntry;
    if (entry && !state.entities.damageNumbers.includes(entry)) {
      data.damageNumberEntry = null;
      entry = null;
    }
    if (entry && !getDamageNumberMergeFit(entry, metrics)) {
      removeEnemyFromDamageNumberEntry(entry, enemy, data);
      entry = null;
    }
    entry = findDamageNumberMergeCandidate(metrics, entry);
    if (!entry) {
      const maxDamageNumbers = performance.getAdaptiveLimit(SAFETY_LIMITS.maxDamageNumbers || 24, 0.75, 0.5);
      if (state.entities.damageNumbers.length >= maxDamageNumbers) removeDamageNumberAtIndex(0);

      entry = acquireDamageNumberEntry(metrics);
      state.entities.damageNumbers.push(entry);
    }

    if (data.damageNumberEntry && data.damageNumberEntry !== entry) {
      removeEnemyFromDamageNumberEntry(data.damageNumberEntry, enemy, data);
    }
    entry.members.add(enemy);
    data.damageNumberEntry = entry;

    entry.totalDamage += resolvedAmount;
    entry.life = DAMAGE_NUMBER_LIFETIME;
    entry.maxLife = DAMAGE_NUMBER_LIFETIME;
    entry.pulse = DAMAGE_NUMBER_PULSE_LIFETIME;
    entry.pulseStrength = Math.min(1.45, 0.55 + Math.log10(entry.totalDamage + 10) * 0.48);
    recalculateDamageNumberAnchor(entry);
    redrawDamageNumber(entry);
  }

  function updateDamageNumbers(dt) {
    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) {
      const entry = state.entities.damageNumbers[i];
      const liveMembers = recalculateDamageNumberAnchor(entry, dt);
      if (liveMembers <= 0) {
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
      const pulseT = 1 - (entry.pulse / DAMAGE_NUMBER_PULSE_LIFETIME);
      const pulseWave = entry.pulse > 0 ? Math.sin(pulseT * Math.PI) : 0;
      const pulseBoost = 1 + pulseWave * entry.pulseStrength * 0.32;
      const driftLift = (1 - alpha) * 0.55;
      const hover = Math.sin(entry.floatPhase) * 0.12;
      const scale = getDamageNumberScale(entry.totalDamage) * pulseBoost;

      entry.sprite.position.set(
        entry.anchorX + entry.driftX,
        entry.anchorY + driftLift + hover,
        entry.anchorZ + entry.driftZ,
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
        state.entities.vfxParticles.splice(i, 1);
        recycleVfxParticle(fx);
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

  function hasActiveLightningChains() {
    return state.entities.chainBeams.some((entry) => entry?.effectTag === 'lightning' && entry.life > 0);
  }

  function hasActiveLightningVisuals() {
    return hasActiveLightningChains()
      || state.entities.vfxParticles.some((entry) => entry?.effectTag === 'lightning' && entry.life > 0);
  }

  function clear() {
    while (state.entities.vfxParticles.length > 0) recycleVfxParticle(state.entities.vfxParticles.pop());
    state.entities.chainBeams.forEach(disposeChainBeam);
    for (let i = state.entities.damageNumbers.length - 1; i >= 0; i--) removeDamageNumberAtIndex(i);
    state.entities.chainBeams.length = 0;
    state.entities.damageNumbers.length = 0;
  }

  function dispose() {
    clear();
    while (vfxParticlePool.length > 0) {
      const entry = vfxParticlePool.pop();
      entry.mesh.material.dispose();
    }
    VFX.particleGeometry.dispose();
    VFX.shardGeometry.dispose();
    VFX.ringGeometry.dispose();
    VFX.chainGeometry.dispose();
    while (damageNumberPool.length > 0) disposeDamageNumberEntry(damageNumberPool.pop());
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
    hasActiveLightningChains,
    hasActiveLightningVisuals,
    update,
    clear,
    dispose,
  };
}
