export function createEnemySystem({
  THREE,
  scene,
  state,
  gameplayConfig,
  ENEMY_TYPES,
  SAFETY_LIMITS,
  performance,
  collision,
  vfx,
  temp,
  profile,
  onDamagePlayer,
}) {
  const sharedGeometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    leg: new THREE.CapsuleGeometry(0.18, 0.65, 5, 8),
    arm: new THREE.CapsuleGeometry(0.22, 0.8, 5, 8),
    cone: new THREE.ConeGeometry(0.5, 1, 6),
    visor: new THREE.BoxGeometry(0.35, 0.18, 0.08),
    weaponBarrel: new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8),
  };

  const ENEMY_MATERIALS = {
    shell: new THREE.MeshStandardMaterial({ color: 0xc94661, roughness: 0.52, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3e1020, roughness: 0.72, metalness: 0.08 }),
    mech: new THREE.MeshStandardMaterial({ color: 0x647088, roughness: 0.42, metalness: 0.5 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x6ce6ff, emissive: 0x1f94a8, roughness: 0.35, metalness: 0.35 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xf2d3bb, roughness: 0.6, metalness: 0.06 }),
  };

  function addMesh(parent, geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function createEnemyModel(type) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const anim = { body, legs: [], extras: [] };
    const add = (geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], parent = body) => addMesh(parent, geo, mat, pos, rot, scale);

    if (type === 'runner') {
      body.rotation.x = -0.22;
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 0.95, 0], [0, 0, 0], [0.92, 0.58, 1.55]);
      add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.02, 0.65], [0.15, 0, 0], [0.5, 0.2, 0.45]);
      const left = new THREE.Group(); const right = new THREE.Group();
      left.position.set(-0.3, 0.7, 0.08); right.position.set(0.3, 0.7, 0.08); body.add(left, right);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0.35, 0, 0], [0.58, 1.25, 0.58], left);
      add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0.35, 0, 0], [0.58, 1.25, 0.58], right);
      anim.legs.push(left, right);
    } else if (type === 'tank') {
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.2, 0], [0, 0, 0], [1.8, 1.15, 1.55]);
      add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 1.95, -0.08], [0.12, 0, 0], [1.35, 0.45, 1.2]);
      add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.45, 0.75], [0, 0, 0], [0.58, 0.25, 0.35]);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.82, 0.72, 0);
        body.add(leg);
        add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.52, 0], [0.05, 0, 0], [1.2, 1, 1.2], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'shooter') {
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.05, 0], [0, 0.1, 0], [1.05, 0.86, 1.05]);
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.62, -0.12], [0.18, 0, 0], [0.82, 0.35, 0.8]);
      const gun = new THREE.Group();
      gun.position.set(0, 1.2, 0.92);
      body.add(gun);
      add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, 0, 0], [0.3, 0.25, 1.35], gun);
      add(sharedGeometries.weaponBarrel, ENEMY_MATERIALS.glow, [0, -0.03, 0.84], [Math.PI / 2, 0, 0], [1, 1, 0.88], gun);
      anim.extras.push(gun);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.36, 0.64, 0);
        body.add(leg);
        add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.45, 0], [0, 0, 0], [0.65, 1, 0.65], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'swarm') {
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 0.5, 0], [0, 0.5, 0], [0.48, 0.42, 0.62]);
      add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 0.55, 0.25], [0.2, 0, 0], [0.3, 0.14, 0.2]);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.16, 0.33, 0);
        body.add(leg);
        add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.18, 0], [0.45, 0, 0], [0.24, 0.7, 0.24], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'charger') {
      body.rotation.x = -0.1;
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.05, 0], [0.1, 0, 0], [1.08, 0.7, 1.48]);
      add(sharedGeometries.cone, ENEMY_MATERIALS.bone, [0, 1.18, 0.92], [Math.PI / 2, 0, 0], [0.62, 0.75, 0.62]);
      for (const side of [-1, 1]) {
        add(sharedGeometries.cone, ENEMY_MATERIALS.dark, [side * 0.62, 1.05, 0.66], [Math.PI / 2, side * 0.3, 0], [0.38, 0.55, 0.38]);
        const leg = new THREE.Group();
        leg.position.set(side * 0.4, 0.66, 0.1);
        body.add(leg);
        add(sharedGeometries.leg, ENEMY_MATERIALS.dark, [0, -0.4, 0], [0.18, 0, 0], [0.7, 1.05, 0.7], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'splitter') {
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.02, 0], [0, 0.25, 0], [0.84, 0.76, 1.15]);
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.02, 0], [0, -0.2, 0], [0.82, 0.2, 1.25]);
      add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 1.15, 0.72], [0, 0, 0], [0.34, 0.2, 0.26]);
      for (const side of [-1, 1]) {
        const segment = new THREE.Group();
        segment.position.set(side * 0.5, 0.84, 0);
        body.add(segment);
        add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, side * 0.35, 0], [0.34, 0.68, 0.5], segment);
        anim.extras.push(segment);
      }
    } else if (type === 'bossHeavy') {
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 1.85, 0], [0, 0, 0], [2.85, 1.8, 2.25]);
      add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 3.1, -0.2], [0.18, 0, 0], [2.25, 0.65, 1.85]);
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 2.45, 1.32], [0.2, 0, 0], [1.2, 0.95, 0.8]);
      for (const side of [-1, 1]) {
        const tower = new THREE.Group();
        tower.position.set(side * 1.35, 2.62, 0.2);
        body.add(tower);
        add(sharedGeometries.box, ENEMY_MATERIALS.dark, [0, 0, 0], [0, 0, 0], [0.62, 1.15, 0.62], tower);
        add(sharedGeometries.visor, ENEMY_MATERIALS.glow, [0, 0.38, 0.24], [0, 0, 0], [1.2, 1, 1.3], tower);
        anim.extras.push(tower);
      }
    } else if (type === 'bossAgile') {
      add(sharedGeometries.box, ENEMY_MATERIALS.shell, [0, 1.6, 0], [0.08, 0, 0], [1.8, 1.2, 1.7]);
      add(sharedGeometries.box, ENEMY_MATERIALS.glow, [0, 2.4, -0.2], [0.18, 0, 0], [1.05, 0.55, 1.18]);
      for (const side of [-1, 1]) {
        const limb = new THREE.Group();
        limb.position.set(side * 1.05, 1.5, 0.1);
        body.add(limb);
        add(sharedGeometries.arm, ENEMY_MATERIALS.dark, [0, -0.35, 0], [0.2, 0, side * 0.25], [0.9, 1.4, 0.9], limb);
        add(sharedGeometries.cone, ENEMY_MATERIALS.bone, [0, -1, 0.25], [Math.PI, 0, 0], [0.34, 0.55, 0.34], limb);
        anim.legs.push(limb);
      }
      const rotor = new THREE.Group();
      rotor.position.set(0, 2.95, 0);
      body.add(rotor);
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 0, 0], [0, 0, 0], [1.85, 0.1, 0.2], rotor);
      add(sharedGeometries.box, ENEMY_MATERIALS.mech, [0, 0, 0], [0, Math.PI / 2, 0], [1.85, 0.1, 0.2], rotor);
      anim.extras.push(rotor);
    }

    return { root, anim };
  }

  function pickEnemyType(wave, indexInWave) {
    if (wave >= 5 && indexInWave === 0) return wave % 2 === 0 ? 'bossAgile' : 'bossHeavy';
    const pool = ['runner', 'runner', 'swarm', 'tank', 'shooter', 'charger', 'splitter'];
    if (wave < 2) return 'runner';
    if (wave < 3) return pool[Math.floor(Math.random() * 3)];
    if (wave < 5) return pool[Math.floor(Math.random() * 5)];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnEnemy(type, angle, dist, waveScale) {
    const model = createEnemyModel(type);
    const cfg = ENEMY_TYPES[type];
    const enemy = model.root;
    enemy.position.set(Math.cos(angle) * dist, cfg.role === 'boss' ? 0.7 : 0.45, Math.sin(angle) * dist);
    enemy.userData = {
      type,
      role: cfg.role,
      hp: Math.ceil((cfg.hp + waveScale * (cfg.role === 'boss' ? 1.2 : 0.45)) * (1 + state.worldIndex * 0.04 + state.levelIndex * 0.03)),
      speed:
        (cfg.speed * gameplayConfig.enemies.baseSpeedMultiplier[type] +
          waveScale * (cfg.role === 'boss' ? gameplayConfig.enemies.waveSpeedScale.boss : gameplayConfig.enemies.waveSpeedScale.field)) *
        (1 - gameplayConfig.enemies.randomVariance + Math.random() * gameplayConfig.enemies.randomVariance * 2),
      damage: cfg.damage * (1 + state.worldIndex * 0.05 + state.levelIndex * 0.035 + state.waveInLevel * 0.02),
      radius: cfg.radius,
      score: cfg.score,
      range: cfg.range || 0,
      keepDistance: cfg.keepDistance || 0,
      fireRate: cfg.fireRate || 0,
      fireCooldown: Math.random(),
      chargeSpeed: cfg.chargeSpeed || 0,
      chargeCooldown: cfg.chargeCooldown || 0,
      chargeTimer: 0,
      chargeDuration: cfg.chargeDuration || 0,
      splitCount: cfg.splitCount || 0,
      anim: model.anim,
      spawnTick: Math.random() * Math.PI * 2,
      dead: false,
      hitboxRadius: cfg.radius * (type === 'swarm' ? 1.25 : 1.05),
      hitboxHalfHeight: Math.max(0.45, cfg.radius * (cfg.role === 'boss' ? 1.2 : 0.95)),
      hitboxCenterOffsetY: cfg.role === 'boss' ? 1.05 : type === 'swarm' ? 0.5 : 0.88,
      fireDot: 0,
      fireTickTimer: 0.12 + Math.random() * 0.08,
      poisonDot: 0,
      poisonTickTimer: 0.14 + Math.random() * 0.08,
      iceSlowTimer: 0,
      shockTimer: 0,
      statusPulse: Math.random() * Math.PI * 2,
      impactVisualTimer: 0,
      impactVisualEffects: null,
      damageNumberRef: null,
    };
    scene.add(enemy);
    state.entities.enemies.push(enemy);
    return enemy;
  }

  function destroyEnemy(enemy, index) {
    if (enemy.userData.dead) return;
    enemy.userData.dead = true;
    scene.remove(enemy);
    state.entities.enemies.splice(index, 1);
    if (enemy.userData.type === 'splitter') {
      for (let i = 0; i < enemy.userData.splitCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.9 + Math.random() * 1.4;
        spawnEnemy('swarm', angle, dist, Math.max(1, state.wave * 0.5)).position.add(enemy.position);
      }
    }
    state.totalKills += 1;
    state.waveKills += 1;
    state.score += enemy.userData.score || 10;
    profile.stats.totalKills += 1;
    if (enemy.userData.role === 'boss') profile.stats.bossesDefeated += 1;
    state.runCredits += enemy.userData.role === 'boss' ? 25 : 3;
  }

  function update(dt, elapsed, runPowers) {
    state.performance.activeEnemyEffects = 0;
    const dotBudget = performance.getAdaptiveLimit(SAFETY_LIMITS.maxDotTicksPerFrame, 0.62, 0.38);

    for (let i = state.entities.enemies.length - 1; i >= 0; i--) {
      const enemy = state.entities.enemies[i];
      const data = enemy.userData;
      if (data.dead) continue;

      temp.vec3A.set(temp.player.position.x - enemy.position.x, 0, temp.player.position.z - enemy.position.z);
      const dist = Math.max(0.0001, temp.vec3A.length());
      temp.vec3A.multiplyScalar(1 / dist);
      temp.vec3B.set(-temp.vec3A.z, 0, temp.vec3A.x);
      temp.vec3C.copy(temp.vec3A);
      let moveSpeedEnemy = data.speed;

      if (data.iceSlowTimer > 0) {
        data.iceSlowTimer = Math.max(0, data.iceSlowTimer - dt);
        const slowPct = Math.min(0.72, runPowers.stacks.ice * 0.12);
        moveSpeedEnemy *= (1 - slowPct);
      }

      data.statusPulse += dt * 5.2;
      const body = data.anim?.body;
      const hasFire = data.fireDot > 0.01;
      const hasPoison = data.poisonDot > 0.01;
      const hasIce = data.iceSlowTimer > 0;
      const hasShock = data.shockTimer > 0;
      if (hasFire || hasPoison || hasIce || hasShock) state.performance.activeEnemyEffects += 1;
      data.impactVisualTimer = Math.max(0, data.impactVisualTimer - dt);

      const showStatusVisuals = data.impactVisualTimer > 0;
      if (body) {
        body.scale.setScalar(1);
        if (hasFire && showStatusVisuals) body.scale.x *= 1.01;
        if (hasPoison && showStatusVisuals) body.scale.z *= 1.008;
        if (hasIce && showStatusVisuals) {
          const pulse = 0.94 + Math.sin(data.statusPulse) * 0.02;
          body.scale.set(pulse, pulse, pulse);
        }
        if (hasShock && showStatusVisuals) body.scale.y *= 1.012;
      }

      if (hasFire) {
        data.fireDot = Math.max(0, data.fireDot - dt * (0.85 + runPowers.stacks.fire * 0.08));
        data.fireTickTimer -= dt;
        const tickInterval = state.performance.qualityLevel >= 2 ? 0.2 : 0.14;
        if (data.fireTickTimer <= 0 && state.performance.frameBudgets.dotTicks < dotBudget) {
          data.fireTickTimer += tickInterval;
          state.performance.frameBudgets.dotTicks += 1;
          temp.callbacks.damageEnemy(enemy, Math.max(1, Math.round(data.fireDot * 0.72)), { allowLightningChain: false, isSecondaryEffect: true, impactEffects: { fire: true } });
        }
      }

      if (hasPoison) {
        data.poisonDot = Math.max(0, data.poisonDot - dt * (0.72 + runPowers.stacks.poison * 0.06));
        data.poisonTickTimer -= dt;
        const tickInterval = state.performance.qualityLevel >= 2 ? 0.24 : 0.16;
        if (data.poisonTickTimer <= 0 && state.performance.frameBudgets.dotTicks < dotBudget) {
          data.poisonTickTimer += tickInterval;
          state.performance.frameBudgets.dotTicks += 1;
          temp.callbacks.damageEnemy(enemy, Math.max(1, Math.round(data.poisonDot * 0.58)), { allowLightningChain: false, isSecondaryEffect: true, impactEffects: { poison: true } });
        }
      }

      if (hasShock) data.shockTimer = Math.max(0, data.shockTimer - dt);

      if (data.type === 'shooter') {
        if (dist < data.keepDistance) {
          temp.vec3C.copy(temp.vec3A).multiplyScalar(-0.65).addScaledVector(temp.vec3B, Math.sin(elapsed + i) * 0.7).normalize();
        } else if (dist < data.range) {
          temp.vec3C.copy(temp.vec3B).multiplyScalar(Math.sin(elapsed * 0.8 + i) > 0 ? 1 : -1);
        }
        data.fireCooldown -= dt;
        if (dist < data.range && data.fireCooldown <= 0) {
          onDamagePlayer(data.damage * 0.18);
          data.fireCooldown = data.fireRate;
        }
      }

      if (data.chargeCooldown > 0) {
        data.chargeTimer -= dt;
        if (data.chargeTimer <= -data.chargeCooldown) data.chargeTimer = data.chargeDuration;
        if (data.chargeTimer > 0) moveSpeedEnemy = data.chargeSpeed;
      }

      enemy.position.addScaledVector(temp.vec3C, moveSpeedEnemy * dt);
      collision.resolveWorldCollision(enemy.position, data.radius * 0.88);
      const enemyHalfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.9;
      enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -enemyHalfArena, enemyHalfArena);
      enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -enemyHalfArena, enemyHalfArena);
      enemy.lookAt(temp.player.position.x, enemy.position.y, temp.player.position.z);

      const step = elapsed * (2.8 + moveSpeedEnemy * 0.9) + data.spawnTick;
      const bobAmp = data.type.includes('boss') ? 0.12 : data.type === 'swarm' ? 0.06 : 0.08;
      enemy.position.y = (data.type.includes('boss') ? 0.75 : 0.45) + Math.sin(step) * bobAmp;
      if (data.anim?.body) data.anim.body.rotation.z = Math.sin(step * 0.5) * 0.04;
      data.anim.legs.forEach((leg, legIdx) => {
        leg.rotation.x = Math.sin(step * 1.7 + legIdx * Math.PI) * 0.45;
      });
      data.anim.extras.forEach((extra, extraIdx) => {
        extra.rotation.y = Math.sin(step + extraIdx) * 0.28;
      });

      if (dist < data.radius + 0.7) onDamagePlayer(data.damage * dt);
    }
  }

  function clear() {
    state.entities.enemies.forEach((enemy) => scene.remove(enemy));
    state.entities.enemies.length = 0;
  }

  return {
    pickEnemyType,
    spawnEnemy,
    destroyEnemy,
    update,
    clear,
    registerCallbacks(callbacks) {
      temp.callbacks = callbacks;
    },
  };
}
