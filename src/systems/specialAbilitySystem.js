import { getEnemyData, isValidEnemyReference } from './enemyRuntimeUtils.js';

function createAbilityMaterial(THREE, color, opacity = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.85,
    transparent: opacity < 1,
    opacity,
    roughness: 0.22,
    metalness: 0.18,
    depthWrite: opacity >= 1,
  });
}

export function createSpecialAbilitySystem({
  THREE,
  scene,
  state,
  collision,
  vfx,
  temp,
  playerRigHolder,
  getAbilityDefinition,
  getAbilityConfig,
  getWeaponProfile,
}) {
  const runtime = {
    abilityId: null,
    abilityDef: null,
    config: null,
    cooldownRemaining: 0,
    activeRemaining: 0,
    mark: { enemy: null, mesh: null },
    decoys: [],
    trail: [],
    waveMesh: null,
    orbitGroup: null,
    orbiters: [],
    orbitHitLocks: new WeakMap(),
    executionAura: null,
    callbacks: {
      damageEnemy: null,
    },
  };

  function syncStateStatus() {
    const { abilityDef: def, config } = runtime;
    const hud = state.specialAbility;
    hud.id = runtime.abilityId;
    hud.label = def?.label || '';
    hud.shortLabel = def?.shortLabel || '';
    hud.icon = def?.icon || '';
    hud.color = def?.hudColor || 0xffffff;
    hud.cooldownRemaining = Math.max(0, runtime.cooldownRemaining);
    hud.activeRemaining = Math.max(0, runtime.activeRemaining);
    hud.isActive = runtime.activeRemaining > 0;
    if (!config || !def) hud.statusText = 'Keine Fähigkeit';
    else if (runtime.activeRemaining > 0) hud.statusText = `Aktiv ${runtime.activeRemaining.toFixed(1)}s`;
    else if (runtime.cooldownRemaining > 0) hud.statusText = `CD ${runtime.cooldownRemaining.toFixed(1)}s`;
    else hud.statusText = 'Bereit';
  }

  function removeMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.traverse?.((child) => {
      if (Array.isArray(child.material)) child.material.forEach((material) => material?.dispose?.());
      else child.material?.dispose?.();
      child.geometry?.dispose?.();
    });
  }

  function clearMarkedTarget() {
    const enemy = runtime.mark.enemy;
    if (enemy) {
      const data = getEnemyData(enemy);
      if (data?.specialStates?.focusMark?.sourceAbilityId === runtime.abilityDef?.id) data.specialStates.focusMark = null;
    }
    runtime.mark.enemy = null;
    if (runtime.mark.mesh) {
      removeMesh(runtime.mark.mesh);
      runtime.mark.mesh = null;
    }
    if (runtime.abilityDef?.id === 'focus_mark') runtime.activeRemaining = 0;
  }

  function ensureMarkMesh() {
    if (runtime.mark.mesh) return runtime.mark.mesh;
    const mesh = new THREE.Group();
    const primary = runtime.abilityDef?.visualStyle?.primary || 0x69f0ff;
    const secondary = runtime.abilityDef?.visualStyle?.secondary || 0xd9fdff;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.82, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 3), new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.94, depthWrite: false }));
    crown.position.y = 0.62;
    crown.rotation.x = Math.PI;
    mesh.add(ring, crown);
    scene.add(mesh);
    runtime.mark.mesh = mesh;
    return mesh;
  }

  function clearDecoys() {
    for (const decoy of runtime.decoys) removeMesh(decoy.mesh);
    runtime.decoys.length = 0;
  }

  function clearOrbiters() {
    if (runtime.orbitGroup) removeMesh(runtime.orbitGroup);
    runtime.orbitGroup = null;
    runtime.orbiters.length = 0;
    runtime.orbitHitLocks = new WeakMap();
  }

  function clearExecutionAura() {
    if (!runtime.executionAura) return;
    removeMesh(runtime.executionAura);
    runtime.executionAura = null;
  }

  function clearWaveMesh() {
    if (!runtime.waveMesh) return;
    removeMesh(runtime.waveMesh);
    runtime.waveMesh = null;
  }

  function clearAllVisuals() {
    clearMarkedTarget();
    clearDecoys();
    clearOrbiters();
    clearExecutionAura();
    clearWaveMesh();
  }

  function resetRuntime() {
    runtime.cooldownRemaining = 0;
    runtime.activeRemaining = 0;
    runtime.trail.length = 0;
    clearAllVisuals();
    syncStateStatus();
  }

  function setAbility(abilityId) {
    const resolvedDef = getAbilityDefinition(abilityId);
    runtime.abilityId = resolvedDef?.id || null;
    runtime.abilityDef = resolvedDef;
    runtime.config = resolvedDef ? getAbilityConfig(resolvedDef.id) : null;
    state.selection.specialAbilityId = runtime.abilityId;
    resetRuntime();
  }

  function clear() {
    resetRuntime();
    runtime.abilityId = null;
    runtime.abilityDef = null;
    runtime.config = null;
    state.selection.specialAbilityId = null;
    syncStateStatus();
  }

  function captureTrailPoint(dt) {
    const last = runtime.trail[runtime.trail.length - 1];
    if (!last || last.age >= 0.08) runtime.trail.push({ position: playerRigHolder.position.clone(), age: 0 });
    for (let i = runtime.trail.length - 1; i >= 0; i -= 1) {
      runtime.trail[i].age += dt;
      if (runtime.trail[i].age > 1.4) runtime.trail.splice(i, 1);
    }
  }

  function getTrailPosition(delay) {
    for (let i = runtime.trail.length - 1; i >= 0; i -= 1) {
      if (runtime.trail[i].age >= delay) return runtime.trail[i].position;
    }
    return null;
  }

  function selectFocusTarget() {
    const config = runtime.config;
    if (!config) return null;
    const currentEnemy = runtime.mark.enemy;
    if (isValidEnemyReference(currentEnemy, { allowDead: false })) {
      const currentData = getEnemyData(currentEnemy);
      if (currentData?.specialStates?.focusMark?.remaining > config.retargetGrace) return currentEnemy;
    }

    const playerPos = playerRigHolder.position;
    const playerForward = temp.vec3A.set(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    let bestEnemy = null;
    let bestScore = -Infinity;
    const maxRangeSq = config.range * config.range;

    for (const enemy of state.entities.enemies) {
      const data = getEnemyData(enemy);
      if (!data || data.dead) continue;
      const dx = enemy.position.x - playerPos.x;
      const dz = enemy.position.z - playerPos.z;
      const distSq = (dx * dx) + (dz * dz);
      if (distSq > maxRangeSq) continue;
      temp.vec3B.set(dx, 0, dz).normalize();
      const front = Math.max(-1, playerForward.dot(temp.vec3B));
      const roleWeight = data.role === 'boss' ? 30 : data.type === 'shooter' ? 14 : data.type === 'tank' ? 12 : 8;
      const hpWeight = Math.min(26, data.hp * 0.12);
      const distanceWeight = Math.max(0, config.range - Math.sqrt(distSq)) * 0.85;
      const score = roleWeight + hpWeight + distanceWeight + front * config.frontBias * 10;
      if (score > bestScore) {
        bestScore = score;
        bestEnemy = enemy;
      }
    }

    return bestEnemy;
  }

  function triggerFocusMark() {
    const config = runtime.config;
    const enemy = selectFocusTarget();
    if (!enemy) return false;
    clearMarkedTarget();
    const data = getEnemyData(enemy);
    data.specialStates = data.specialStates || {};
    data.specialStates.focusMark = {
      sourceAbilityId: runtime.abilityDef.id,
      remaining: config.duration,
      damageMultiplier: config.damageMultiplier,
    };
    runtime.mark.enemy = enemy;
    ensureMarkMesh();
    temp.vec3B.copy(enemy.position).setY(enemy.position.y + data.hitboxCenterOffsetY + data.hitboxHalfHeight + 0.45);
    vfx.spawnImpactBurst(temp.vec3B, runtime.abilityDef.visualStyle.primary, 8, 2.6, 0.36, 0.9, 'shard');
    runtime.activeRemaining = config.duration;
    return true;
  }

  function createDecoyMesh(index = 0, total = 1) {
    const style = runtime.abilityDef?.visualStyle || {};
    const group = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.64, 0), createAbilityMaterial(THREE, style.primary || 0x72f2cf, 0.34));
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), createAbilityMaterial(THREE, style.secondary || 0xcffdf3, 0.88));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.05, 8, 24), new THREE.MeshBasicMaterial({ color: style.aura || 0x8ffff3, transparent: true, opacity: 0.7, depthWrite: false }));
    halo.rotation.x = Math.PI / 2;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), createAbilityMaterial(THREE, style.secondary || 0xcffdf3, 0.78));
    antenna.position.y = 0.58;
    const beacon = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.84, 24), new THREE.MeshBasicMaterial({ color: style.primary || 0x72f2cf, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false }));
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.12;
    group.add(shell, core, halo, antenna, beacon);
    group.userData.spinOffset = total > 1 ? ((Math.PI * 2) / total) * index : 0;
    return group;
  }

  function triggerHoloDecoy() {
    const config = runtime.config;
    const source = getTrailPosition(config.spawnTrailDelay) || playerRigHolder.position;
    clearDecoys();
    for (let index = 0; index < config.decoyCount; index += 1) {
      const mesh = createDecoyMesh(index, config.decoyCount);
      const angle = config.decoyCount > 1 ? (Math.PI * 2 * index) / config.decoyCount : 0;
      mesh.position.copy(source);
      mesh.position.x += Math.cos(angle) * (config.decoyCount > 1 ? 1.15 : 0);
      mesh.position.z += Math.sin(angle) * (config.decoyCount > 1 ? 1.15 : 0);
      mesh.position.y = state.world.playerGroundY + 0.15;
      scene.add(mesh);
      runtime.decoys.push({
        id: `decoy_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 6)}`,
        mesh,
        life: config.duration,
        maxLife: config.duration,
        influenceRadius: config.influenceRadius,
        lockDuration: config.lockDuration,
        pulse: Math.random() * Math.PI * 2,
        baseY: mesh.position.y,
      });
    }
    vfx.spawnImpactBurst(source.clone().setY(state.world.playerGroundY + 1.05), runtime.abilityDef.visualStyle.primary, 10, 2.2, 0.42, 0.78);
    runtime.activeRemaining = config.duration;
    return true;
  }

  function triggerShieldRam() {
    const config = runtime.config;
    const style = runtime.abilityDef.visualStyle || {};
    const forward = temp.vec3A.set(Math.sin(state.yaw), 0, Math.cos(state.yaw)).normalize();
    const playerPos = playerRigHolder.position;
    const wave = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 2.2, 0.14, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: style.primary || config.hudColor, transparent: true, opacity: 0.44, side: THREE.DoubleSide, depthWrite: false }),
    );
    wave.position.copy(playerPos).addScaledVector(forward, config.range * 0.48).setY(state.world.playerGroundY + 1.05);
    wave.rotation.z = Math.PI / 2;
    wave.rotation.y = state.yaw;
    wave.userData.life = config.duration;
    clearWaveMesh();
    runtime.waveMesh = wave;
    scene.add(wave);

    const rangeSq = config.range * config.range;
    for (const enemy of state.entities.enemies) {
      const data = getEnemyData(enemy);
      if (!data || data.dead) continue;
      const dx = enemy.position.x - playerPos.x;
      const dz = enemy.position.z - playerPos.z;
      const distSq = (dx * dx) + (dz * dz);
      if (distSq > rangeSq) continue;
      temp.vec3B.set(dx, 0, dz);
      const dist = Math.max(0.0001, temp.vec3B.length());
      temp.vec3B.multiplyScalar(1 / dist);
      if (forward.dot(temp.vec3B) < config.coneDot) continue;
      data.interruptTimer = Math.max(data.interruptTimer || 0, config.interrupt);
      data.externalImpulseX = (data.externalImpulseX || 0) + temp.vec3B.x * config.knockback;
      data.externalImpulseZ = (data.externalImpulseZ || 0) + temp.vec3B.z * config.knockback;
      runtime.callbacks.damageEnemy?.(enemy, config.impactDamage, {
        allowLightningChain: false,
        isSecondaryEffect: true,
        impactEffects: { rockets: true },
        weaponProfile: getWeaponProfile(),
      });
    }
    temp.vec3C.copy(playerPos).addScaledVector(forward, 2.6).setY(state.world.playerGroundY + 1.1);
    vfx.spawnImpactBurst(temp.vec3C, style.secondary || 0xffd1a2, 14, 5.1, 0.5, 1.18, 'shard');
    runtime.activeRemaining = config.duration;
    return true;
  }

  function ensureOrbiters() {
    if (runtime.orbitGroup) return;
    const config = runtime.config;
    const style = runtime.abilityDef.visualStyle || {};
    const group = new THREE.Group();
    scene.add(group);
    runtime.orbitGroup = group;
    runtime.orbiters = [];
    for (let i = 0; i < config.orbCount; i += 1) {
      const orb = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), createAbilityMaterial(THREE, style.primary || runtime.abilityDef.hudColor, 0.92));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 18), new THREE.MeshBasicMaterial({ color: style.secondary || 0xf6ebff, transparent: true, opacity: 0.72, depthWrite: false }));
      halo.rotation.x = Math.PI / 2;
      orb.add(core, halo);
      group.add(orb);
      runtime.orbiters.push({ mesh: orb, angleOffset: (Math.PI * 2 * i) / config.orbCount });
    }
  }

  function triggerGuardianOrbit() {
    ensureOrbiters();
    runtime.activeRemaining = runtime.config.duration;
    vfx.spawnImpactBurst(playerRigHolder.position.clone().setY(state.world.playerGroundY + 1.2), runtime.abilityDef.visualStyle.primary, 12, 2.8, 0.48, 0.98);
    return true;
  }

  function ensureExecutionAura() {
    if (runtime.executionAura) return;
    const style = runtime.abilityDef.visualStyle || {};
    const aura = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.08, 8, 28), new THREE.MeshBasicMaterial({ color: style.primary || runtime.abilityDef.hudColor, transparent: true, opacity: 0.86, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    const spikes = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.52, 18), new THREE.MeshBasicMaterial({ color: style.secondary || 0xffdbe9, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    spikes.rotation.x = -Math.PI / 2;
    aura.add(ring, spikes);
    scene.add(aura);
    runtime.executionAura = aura;
  }

  function triggerExecutionMode() {
    ensureExecutionAura();
    runtime.activeRemaining = runtime.config.duration;
    vfx.spawnImpactBurst(playerRigHolder.position.clone().setY(state.world.playerGroundY + 1.15), runtime.abilityDef.visualStyle.primary, 10, 2.5, 0.42, 0.82);
    return true;
  }

  function triggerAbility() {
    if (!runtime.config || !runtime.abilityDef) return false;
    switch (runtime.abilityDef.id) {
      case 'focus_mark': return triggerFocusMark();
      case 'holo_decoy': return triggerHoloDecoy();
      case 'shield_ram': return triggerShieldRam();
      case 'guardian_orbit': return triggerGuardianOrbit();
      case 'execution_mode': return triggerExecutionMode();
      default: return false;
    }
  }

  function updateMarkedTarget(dt, elapsed) {
    const enemy = runtime.mark.enemy;
    if (!isValidEnemyReference(enemy, { allowDead: false })) {
      clearMarkedTarget();
      return;
    }
    const data = getEnemyData(enemy);
    if (!data?.specialStates?.focusMark) {
      clearMarkedTarget();
      return;
    }
    data.specialStates.focusMark.remaining = Math.max(0, data.specialStates.focusMark.remaining - dt);
    if (data.specialStates.focusMark.remaining <= 0) {
      clearMarkedTarget();
      return;
    }
    const mesh = ensureMarkMesh();
    mesh.position.set(enemy.position.x, enemy.position.y + data.hitboxCenterOffsetY + data.hitboxHalfHeight + 0.42 + Math.sin(elapsed * 5.5) * 0.08, enemy.position.z);
    mesh.rotation.y += dt * 2;
    mesh.children[0].scale.setScalar(0.96 + Math.sin(elapsed * 8.2) * 0.08);
  }

  function updateDecoys(dt, elapsed) {
    for (let i = runtime.decoys.length - 1; i >= 0; i -= 1) {
      const decoy = runtime.decoys[i];
      decoy.life -= dt;
      if (decoy.life <= 0) {
        removeMesh(decoy.mesh);
        runtime.decoys.splice(i, 1);
        continue;
      }
      decoy.pulse += dt * 5.4;
      const alpha = THREE.MathUtils.clamp(decoy.life / decoy.maxLife, 0, 1);
      decoy.mesh.position.y = decoy.baseY + Math.sin(decoy.pulse) * 0.08;
      decoy.mesh.rotation.y += dt * 0.9;
      decoy.mesh.children.forEach((child, index) => {
        if (!child.material) return;
        if ('opacity' in child.material) child.material.opacity = Math.max(0.12, alpha * (index === 1 ? 0.88 : 0.42) + 0.08 * Math.sin(elapsed * 7.5));
      });
    }
  }

  function updateWaveMesh(dt, elapsed) {
    if (!runtime.waveMesh) return;
    runtime.waveMesh.userData.life = (runtime.waveMesh.userData.life || runtime.config.duration) - dt;
    if (runtime.waveMesh.userData.life <= 0) {
      clearWaveMesh();
      return;
    }
    const alpha = THREE.MathUtils.clamp(runtime.waveMesh.userData.life / runtime.config.duration, 0, 1);
    runtime.waveMesh.material.opacity = alpha * 0.44;
    runtime.waveMesh.scale.set(1 + (1 - alpha) * 1.4, 1, 1 + (1 - alpha) * 0.35 + Math.sin(elapsed * 12) * 0.02);
  }

  function updateOrbiters(elapsed) {
    if (!runtime.orbitGroup || runtime.activeRemaining <= 0) return;
    const config = runtime.config;
    runtime.orbitGroup.position.copy(playerRigHolder.position);
    for (const orbiter of runtime.orbiters) {
      const angle = elapsed * config.orbitSpeed + orbiter.angleOffset;
      const wobble = Math.sin(elapsed * 4 + orbiter.angleOffset) * 0.14;
      orbiter.mesh.position.set(Math.cos(angle) * config.orbitRadius, config.orbitHeight + wobble, Math.sin(angle) * config.orbitRadius);
      orbiter.mesh.rotation.y += 0.06;
      collision.forEachEnemyNearPosition(orbiter.mesh.getWorldPosition(temp.vec3A), config.hitRadius + 1.4, (enemy) => {
        const data = getEnemyData(enemy);
        if (!data || data.dead) return;
        const orbPos = orbiter.mesh.getWorldPosition(temp.vec3B);
        const dx = enemy.position.x - orbPos.x;
        const dz = enemy.position.z - orbPos.z;
        if ((dx * dx) + (dz * dz) > config.hitRadius * config.hitRadius) return;
        const nextHitAt = runtime.orbitHitLocks.get(enemy) || 0;
        if (elapsed < nextHitAt) return;
        runtime.orbitHitLocks.set(enemy, elapsed + config.hitInterval);
        runtime.callbacks.damageEnemy?.(enemy, config.damage, {
          allowLightningChain: false,
          isSecondaryEffect: true,
          impactEffects: { lightning: true },
          weaponProfile: getWeaponProfile(),
        });
        temp.vec3C.copy(orbPos).lerp(enemy.position, 0.55).setY(enemy.position.y + 0.9);
        vfx.spawnImpactBurst(temp.vec3C, runtime.abilityDef.visualStyle.primary, 5, 2.1, 0.2, 0.62);
      });
    }
  }

  function updateExecutionAura(dt, elapsed) {
    if (!runtime.executionAura) return;
    if (runtime.activeRemaining <= 0) {
      clearExecutionAura();
      return;
    }
    runtime.executionAura.position.copy(playerRigHolder.position).setY(state.world.playerGroundY + 0.22);
    runtime.executionAura.rotation.y += dt * 2.8;
    runtime.executionAura.children[0].scale.setScalar(1 + Math.sin(elapsed * 9) * 0.08);
    runtime.executionAura.children[1].scale.setScalar(1 + Math.sin(elapsed * 5.2) * 0.12);
  }

  function update(dt, elapsed) {
    captureTrailPoint(dt);
    if (!runtime.abilityDef) {
      syncStateStatus();
      return;
    }

    runtime.config = getAbilityConfig(runtime.abilityDef.id);
    runtime.cooldownRemaining = Math.max(0, runtime.cooldownRemaining - dt);
    runtime.activeRemaining = Math.max(0, runtime.activeRemaining - dt);

    updateMarkedTarget(dt, elapsed);
    updateDecoys(dt, elapsed);
    updateWaveMesh(dt, elapsed);
    updateOrbiters(elapsed);
    updateExecutionAura(dt, elapsed);

    if (runtime.cooldownRemaining <= 0 && triggerAbility()) runtime.cooldownRemaining = runtime.config.cooldown;

    if (runtime.abilityDef.id === 'guardian_orbit' && runtime.activeRemaining <= 0 && runtime.orbitGroup) clearOrbiters();
    if (runtime.abilityDef.id === 'execution_mode' && runtime.activeRemaining <= 0 && runtime.executionAura) clearExecutionAura();
    if (runtime.abilityDef.id !== 'guardian_orbit' && runtime.orbitGroup) clearOrbiters();
    if (runtime.abilityDef.id !== 'execution_mode' && runtime.executionAura) clearExecutionAura();
    syncStateStatus();
  }

  function getEnemyTarget(enemy, data) {
    if (runtime.abilityDef?.id !== 'holo_decoy' || runtime.decoys.length === 0) {
      data.targetDecoyId = null;
      return temp.player.position;
    }
    const playerPos = temp.player.position;
    let selected = null;
    let bestScore = Infinity;

    for (const decoy of runtime.decoys) {
      const dxDecoy = decoy.mesh.position.x - enemy.position.x;
      const dzDecoy = decoy.mesh.position.z - enemy.position.z;
      const decoyDistSq = (dxDecoy * dxDecoy) + (dzDecoy * dzDecoy);
      if (decoyDistSq > decoy.influenceRadius * decoy.influenceRadius) continue;
      const dxPlayer = playerPos.x - enemy.position.x;
      const dzPlayer = playerPos.z - enemy.position.z;
      const playerDistSq = (dxPlayer * dxPlayer) + (dzPlayer * dzPlayer);
      const score = decoyDistSq - Math.min(playerDistSq * 0.35, 42);
      if (score < bestScore) {
        bestScore = score;
        selected = decoy;
      }
    }

    data.targetDecoyId = selected?.id || null;
    data.currentTargetPosition = selected?.mesh?.position || playerPos;
    return data.currentTargetPosition;
  }

  function resolvePlayerHitDamage(enemy, bullet, amount) {
    const data = getEnemyData(enemy);
    if (!runtime.abilityDef || !data || data.dead) return { amount };

    if (runtime.abilityDef.id === 'focus_mark') {
      const mark = data.specialStates?.focusMark;
      if (mark?.sourceAbilityId === runtime.abilityDef.id) {
        return {
          amount: amount * mark.damageMultiplier,
          impactEffects: { ...(bullet.userData.effects || {}), lightning: true },
        };
      }
    }

    if (runtime.abilityDef.id === 'execution_mode' && runtime.activeRemaining > 0) {
      const missingHp = Math.max(0, data.maxHp ? data.maxHp - data.hp : 0);
      const thresholdHp = Math.max(runtime.config.thresholdFlat, (data.maxHp || data.hp) * runtime.config.thresholdRatio);
      if (data.hp <= thresholdHp || missingHp >= thresholdHp * 0.9 || data.poisonDot > 0 || data.fireDot > 0 || data.iceSlowTimer > 0.25) {
        const bonus = Math.max(runtime.config.minimumBonus, thresholdHp * runtime.config.bonusRatio);
        temp.vec3A.copy(enemy.position).setY(enemy.position.y + data.hitboxCenterOffsetY + 0.35);
        vfx.spawnImpactBurst(temp.vec3A, runtime.abilityDef.visualStyle.primary, 7, 3.2, 0.24, 0.74, 'shard');
        return {
          amount: amount + bonus + Math.max(0, missingHp * 0.12),
          impactEffects: { ...(bullet.userData.effects || {}), fire: true },
        };
      }
    }

    return { amount };
  }

  return {
    setAbility,
    clear,
    resetRuntime,
    update,
    getEnemyTarget,
    resolvePlayerHitDamage,
    registerCallbacks(callbacks) {
      runtime.callbacks = { ...runtime.callbacks, ...callbacks };
    },
  };
}
