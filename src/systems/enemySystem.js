import { getEnemyData, logInvalidEnemyReference, removeInvalidEnemiesFromList } from './enemyRuntimeUtils.js';

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
    spike: new THREE.CylinderGeometry(0.08, 0.18, 0.7, 6),
    weaponBarrel: new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8),
    enemyProjectile: new THREE.SphereGeometry(0.16, 10, 10),
  };
  const enemyProjectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8cf6,
    emissive: 0xff8cf6,
    emissiveIntensity: 1.35,
    roughness: 0.18,
    metalness: 0.18,
  });
  const enemyStyle = {
    runner: { shell: 0xff6d78, dark: 0x30111d, main: 0x5d2030, glow: 0xffb39d },
    tank: { shell: 0xffb85c, dark: 0x251918, main: 0x635349, glow: 0xffdf8d },
    shooter: { shell: 0xa66bff, dark: 0x1e1332, main: 0x49516f, glow: 0x86dfff },
    swarm: { shell: 0x35f3d1, dark: 0x0d2a27, main: 0x15534a, glow: 0xb1fff2 },
    charger: { shell: 0xff8c5f, dark: 0x311711, main: 0x6a3123, glow: 0xffe3ae },
    splitter: { shell: 0x7e8cff, dark: 0x1a1d39, main: 0x394165, glow: 0x73ffb0 },
    bossHeavy: { shell: 0xff7b92, dark: 0x200f1b, main: 0x545f7a, glow: 0xffd470 },
    bossAgile: { shell: 0x35f3d1, dark: 0x112437, main: 0x3f3f74, glow: 0xc6b7ff },
  };

  function createMaterials(type) {
    const style = enemyStyle[type] || enemyStyle.runner;
    return {
      shell: new THREE.MeshStandardMaterial({ color: style.shell, emissive: style.shell, emissiveIntensity: 0.14, roughness: 0.38, metalness: 0.24 }),
      dark: new THREE.MeshStandardMaterial({ color: style.dark, roughness: 0.7, metalness: 0.1 }),
      main: new THREE.MeshStandardMaterial({ color: style.main, roughness: 0.46, metalness: 0.34 }),
      glow: new THREE.MeshStandardMaterial({ color: style.glow, emissive: style.glow, emissiveIntensity: 0.32, roughness: 0.2, metalness: 0.34 }),
      bone: new THREE.MeshStandardMaterial({ color: 0xf1d6bf, roughness: 0.6, metalness: 0.06 }),
    };
  }

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

  function removeEnemyProjectileAtIndex(index) {
    const projectile = state.entities.enemyProjectiles[index];
    if (!projectile) return;
    scene.remove(projectile.mesh);
    state.entities.enemyProjectiles.splice(index, 1);
  }

  function spawnEnemyProjectile(enemy, data) {
    const projectile = new THREE.Mesh(sharedGeometries.enemyProjectile, enemyProjectileMaterial);
    const muzzleOffset = data.type === 'shooter'
      ? data.hitboxRadius + 0.55
      : data.hitboxRadius + 0.35;
    const spawnY = enemy.position.y + data.hitboxCenterOffsetY * 0.52;
    temp.vec3C.set(state.movement.velocityX, 0, state.movement.velocityZ);
    temp.vec3D.copy(temp.player.position)
      .addScaledVector(temp.vec3C, 0.08)
      .sub(temp.vec3B.set(enemy.position.x, spawnY, enemy.position.z));
    temp.vec3D.y = THREE.MathUtils.clamp(temp.vec3D.y, -0.16, 0.3);
    if (temp.vec3D.lengthSq() < 0.0001) temp.vec3D.set(0, 0, 1);
    temp.vec3D.normalize();

    projectile.position.set(enemy.position.x, spawnY, enemy.position.z)
      .addScaledVector(temp.vec3D, muzzleOffset);
    projectile.scale.setScalar(1);
    scene.add(projectile);
    state.entities.enemyProjectiles.push({
      mesh: projectile,
      velocity: temp.vec3D.clone().multiplyScalar(12.5 + Math.min(3.5, data.range * 0.12)),
      damage: data.damage * 0.18,
      life: 1.8,
      radius: 0.22,
      trailTick: 0.035,
    });
  }

  function updateEnemyProjectiles(dt) {
    for (let i = state.entities.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.entities.enemyProjectiles[i];
      if (!projectile?.mesh) {
        state.entities.enemyProjectiles.splice(i, 1);
        continue;
      }

      projectile.life -= dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.trailTick -= dt;

      if (projectile.trailTick <= 0) {
        projectile.trailTick = 0.045;
        vfx.spawnVfxParticle(
          projectile.mesh.position,
          temp.vec3D.copy(projectile.velocity).multiplyScalar(-0.04),
          0xffb7ff,
          0.16,
          0.3,
        );
      }

      const dx = projectile.mesh.position.x - temp.player.position.x;
      const dz = projectile.mesh.position.z - temp.player.position.z;
      const dy = projectile.mesh.position.y - (state.world.playerGroundY + 0.95);
      const hitRadius = state.world.playerCollisionRadius + projectile.radius;
      if ((dx * dx) + (dz * dz) + (dy * dy) <= hitRadius * hitRadius) {
        vfx.spawnImpactEffects(projectile.mesh.position, { lightning: true });
        onDamagePlayer(projectile.damage);
        removeEnemyProjectileAtIndex(i);
        continue;
      }

      if (
        projectile.life <= 0 ||
        collision.isOutsideArenaBounds(projectile.mesh.position, -0.4)
      ) {
        removeEnemyProjectileAtIndex(i);
      }
    }
  }

  function createEnemyModel(type) {
    const mats = createMaterials(type);
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const anim = { body, legs: [], extras: [] };
    const add = (geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], parent = body) => addMesh(parent, geo, mat, pos, rot, scale);

    if (type === 'runner') {
      body.rotation.x = -0.22;
      add(sharedGeometries.box, mats.shell, [0, 0.98, 0], [0, 0, 0], [0.92, 0.58, 1.65]);
      add(sharedGeometries.box, mats.main, [0, 1.14, -0.08], [0.14, 0, 0], [0.74, 0.26, 1.15]);
      add(sharedGeometries.box, mats.glow, [0, 1.04, 0.72], [0.15, 0, 0], [0.54, 0.22, 0.52]);
      for (const side of [-1, 1]) {
        add(sharedGeometries.spike, mats.glow, [side * 0.42, 1.18, 0.28], [Math.PI * 0.45, 0, side * 0.18], [0.8, 1, 0.8]);
        const leg = new THREE.Group();
        leg.position.set(side * 0.3, 0.7, 0.08);
        body.add(leg);
        add(sharedGeometries.leg, mats.dark, [0, -0.45, 0], [0.35, 0, 0], [0.58, 1.25, 0.58], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'tank') {
      add(sharedGeometries.box, mats.main, [0, 1.2, 0], [0, 0, 0], [1.8, 1.15, 1.55]);
      add(sharedGeometries.box, mats.dark, [0, 1.95, -0.08], [0.12, 0, 0], [1.35, 0.45, 1.2]);
      add(sharedGeometries.box, mats.shell, [0, 1.42, 0.74], [0, 0, 0], [0.68, 0.26, 0.4]);
      add(sharedGeometries.visor, mats.glow, [0, 2.05, 0.58], [0, 0, 0], [2.4, 1.2, 1.2]);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.82, 0.72, 0);
        body.add(leg);
        add(sharedGeometries.leg, mats.dark, [0, -0.52, 0], [0.05, 0, 0], [1.2, 1, 1.2], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'shooter') {
      add(sharedGeometries.box, mats.main, [0, 1.05, 0], [0, 0.1, 0], [1.05, 0.86, 1.05]);
      add(sharedGeometries.box, mats.shell, [0, 1.62, -0.12], [0.18, 0, 0], [0.82, 0.35, 0.8]);
      add(sharedGeometries.visor, mats.glow, [0, 1.28, 0.56], [0, 0, 0], [2.1, 1.1, 1.2]);
      const gun = new THREE.Group();
      gun.position.set(0, 1.2, 0.92);
      body.add(gun);
      add(sharedGeometries.box, mats.dark, [0, 0, 0], [0, 0, 0], [0.3, 0.25, 1.35], gun);
      add(sharedGeometries.weaponBarrel, mats.glow, [0, -0.03, 0.84], [Math.PI / 2, 0, 0], [1, 1, 0.88], gun);
      anim.extras.push(gun);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.36, 0.64, 0);
        body.add(leg);
        add(sharedGeometries.leg, mats.dark, [0, -0.45, 0], [0, 0, 0], [0.65, 1, 0.65], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'swarm') {
      add(sharedGeometries.box, mats.shell, [0, 0.5, 0], [0, 0.5, 0], [0.48, 0.42, 0.62]);
      add(sharedGeometries.box, mats.glow, [0, 0.55, 0.25], [0.2, 0, 0], [0.3, 0.14, 0.2]);
      add(sharedGeometries.spike, mats.glow, [0, 0.68, 0.06], [Math.PI * 0.45, 0, 0], [0.7, 0.8, 0.7]);
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.16, 0.33, 0);
        body.add(leg);
        add(sharedGeometries.leg, mats.dark, [0, -0.18, 0], [0.45, 0, 0], [0.24, 0.7, 0.24], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'charger') {
      body.rotation.x = -0.1;
      add(sharedGeometries.box, mats.shell, [0, 1.05, 0], [0.1, 0, 0], [1.08, 0.7, 1.48]);
      add(sharedGeometries.cone, mats.bone, [0, 1.18, 0.92], [Math.PI / 2, 0, 0], [0.62, 0.75, 0.62]);
      add(sharedGeometries.box, mats.main, [0, 1.18, -0.18], [0.14, 0, 0], [0.78, 0.28, 1.08]);
      for (const side of [-1, 1]) {
        add(sharedGeometries.cone, mats.dark, [side * 0.62, 1.05, 0.66], [Math.PI / 2, side * 0.3, 0], [0.38, 0.55, 0.38]);
        const leg = new THREE.Group();
        leg.position.set(side * 0.4, 0.66, 0.1);
        body.add(leg);
        add(sharedGeometries.leg, mats.dark, [0, -0.4, 0], [0.18, 0, 0], [0.7, 1.05, 0.7], leg);
        anim.legs.push(leg);
      }
    } else if (type === 'splitter') {
      add(sharedGeometries.box, mats.main, [0, 1.02, 0], [0, 0.25, 0], [0.84, 0.76, 1.15]);
      add(sharedGeometries.box, mats.shell, [0, 1.02, 0], [0, -0.2, 0], [0.82, 0.2, 1.25]);
      add(sharedGeometries.box, mats.glow, [0, 1.15, 0.72], [0, 0, 0], [0.34, 0.2, 0.26]);
      for (const side of [-1, 1]) {
        const segment = new THREE.Group();
        segment.position.set(side * 0.5, 0.84, 0);
        body.add(segment);
        add(sharedGeometries.box, mats.dark, [0, 0, 0], [0, side * 0.35, 0], [0.34, 0.68, 0.5], segment);
        add(sharedGeometries.visor, mats.glow, [0, 0.14, 0.28], [0, 0, 0], [0.85, 0.7, 0.7], segment);
        anim.extras.push(segment);
      }
    } else if (type === 'bossHeavy') {
      add(sharedGeometries.box, mats.main, [0, 1.85, 0], [0, 0, 0], [2.85, 1.8, 2.25]);
      add(sharedGeometries.box, mats.dark, [0, 3.1, -0.2], [0.18, 0, 0], [2.25, 0.65, 1.85]);
      add(sharedGeometries.box, mats.shell, [0, 2.45, 1.32], [0.2, 0, 0], [1.2, 0.95, 0.8]);
      add(sharedGeometries.visor, mats.glow, [0, 2.18, 1.26], [0, 0, 0], [2.8, 1.3, 1.1]);
      for (const side of [-1, 1]) {
        const tower = new THREE.Group();
        tower.position.set(side * 1.35, 2.62, 0.2);
        body.add(tower);
        add(sharedGeometries.box, mats.dark, [0, 0, 0], [0, 0, 0], [0.62, 1.15, 0.62], tower);
        add(sharedGeometries.visor, mats.glow, [0, 0.38, 0.24], [0, 0, 0], [1.2, 1, 1.3], tower);
        add(sharedGeometries.spike, mats.shell, [0, 0.88, 0.18], [0, 0, 0], [1.1, 1.2, 1.1], tower);
        anim.extras.push(tower);
      }
    } else if (type === 'bossAgile') {
      add(sharedGeometries.box, mats.shell, [0, 1.6, 0], [0.08, 0, 0], [1.8, 1.2, 1.7]);
      add(sharedGeometries.box, mats.glow, [0, 2.4, -0.2], [0.18, 0, 0], [1.05, 0.55, 1.18]);
      add(sharedGeometries.visor, mats.main, [0, 1.9, 0.96], [0, 0, 0], [2.4, 1.2, 1.1]);
      for (const side of [-1, 1]) {
        const limb = new THREE.Group();
        limb.position.set(side * 1.05, 1.5, 0.1);
        body.add(limb);
        add(sharedGeometries.arm, mats.dark, [0, -0.35, 0], [0.2, 0, side * 0.25], [0.9, 1.4, 0.9], limb);
        add(sharedGeometries.cone, mats.bone, [0, -1, 0.25], [Math.PI, 0, 0], [0.34, 0.55, 0.34], limb);
        anim.legs.push(limb);
      }
      const rotor = new THREE.Group();
      rotor.position.set(0, 2.95, 0);
      body.add(rotor);
      add(sharedGeometries.box, mats.main, [0, 0, 0], [0, 0, 0], [1.85, 0.1, 0.2], rotor);
      add(sharedGeometries.box, mats.main, [0, 0, 0], [0, Math.PI / 2, 0], [1.85, 0.1, 0.2], rotor);
      add(sharedGeometries.box, mats.glow, [0, 0, 0], [0, Math.PI / 4, 0], [1.1, 0.08, 0.12], rotor);
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
      reactionStates: {},
      lastReactionFrame: -1,
      lastReactionById: {},
      killFlags: {},
      statusSourceWeapon: {},
      statusIntensity: {},
      primedEffects: {},
      statusPulse: Math.random() * Math.PI * 2,
      impactVisualTimer: 0,
      impactVisualEffects: null,
      damageNumberEntry: null,
    };
    scene.add(enemy);
    state.entities.enemies.push(enemy);
    return enemy;
  }

  function destroyEnemy(enemy, index) {
    const data = getEnemyData(enemy);
    if (!data) {
      logInvalidEnemyReference(state, 'enemy.destroyEnemy', enemy);
      return;
    }
    if (data.dead) return;
    data.dead = true;
    vfx.clearEnemyDamageNumber(enemy);
    scene.remove(enemy);
    const resolvedIndex = Number.isInteger(index) && state.entities.enemies[index] === enemy
      ? index
      : state.entities.enemies.indexOf(enemy);
    if (resolvedIndex >= 0) state.entities.enemies.splice(resolvedIndex, 1);
    if (data.type === 'splitter') {
      for (let i = 0; i < data.splitCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.9 + Math.random() * 1.4;
        spawnEnemy('swarm', angle, dist, Math.max(1, state.wave * 0.5)).position.add(enemy.position);
      }
    }
    state.totalKills += 1;
    state.waveKills += 1;
    state.score += data.score || 10;
    profile.stats.totalKills += 1;
    if (data.role === 'boss') profile.stats.bossesDefeated += 1;
    state.runCredits += data.role === 'boss' ? 25 : 3;
  }

  function update(dt, elapsed, runPowers) {
    state.performance.activeEnemyEffects = 0;
    const dotBudget = performance.getAdaptiveLimit(SAFETY_LIMITS.maxDotTicksPerFrame, 0.62, 0.38);
    updateEnemyProjectiles(dt);
    removeInvalidEnemiesFromList(state.entities.enemies, state, 'enemy.update.prepass');

    for (let i = state.entities.enemies.length - 1; i >= 0; i--) {
      const enemy = state.entities.enemies[i];
      const data = getEnemyData(enemy);
      if (!data) {
        logInvalidEnemyReference(state, 'enemy.update.loop', enemy);
        state.entities.enemies.splice(i, 1);
        continue;
      }
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
          if (data.dead) continue;
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
          if (data.dead) continue;
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
          spawnEnemyProjectile(enemy, data);
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
    state.entities.enemyProjectiles.forEach((projectile) => {
      if (projectile?.mesh) scene.remove(projectile.mesh);
    });
    state.entities.enemyProjectiles.length = 0;
    state.entities.enemies.forEach((enemy) => {
      if (enemy) scene.remove(enemy);
    });
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
