import { EARTH_BOSS_ID, getBossDefinition } from '../config/bosses.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createBossSystem({
  THREE,
  scene,
  state,
  collision,
  vfx,
  temp,
  enemySystem,
  onDamagePlayer,
  onBossDefeated,
}) {
  const telegraphRoot = new THREE.Group();
  telegraphRoot.name = 'bossTelegraphs';
  scene.add(telegraphRoot);

  const projectileRoot = new THREE.Group();
  projectileRoot.name = 'bossProjectiles';
  scene.add(projectileRoot);

  const telegraphs = [];
  const projectiles = [];
  const pillars = [];
  let encounter = null;

  function setBossLabel(label = '', duration = 1.3) {
    state.boss.telegraphLabel = label;
    if (encounter) encounter.labelTimer = Math.max(encounter.labelTimer || 0, duration);
  }

  function clearTelegraphs() {
    while (telegraphRoot.children.length) {
      const child = telegraphRoot.children[telegraphRoot.children.length - 1];
      telegraphRoot.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    telegraphs.length = 0;
    pillars.length = 0;
  }

  function clearProjectiles() {
    while (projectileRoot.children.length) {
      const child = projectileRoot.children[projectileRoot.children.length - 1];
      projectileRoot.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    projectiles.length = 0;
  }

  function resetBossUi() {
    state.boss.active = false;
    state.boss.id = null;
    state.boss.name = '';
    state.boss.phase = 1;
    state.boss.phaseCount = 4;
    state.boss.hp = 0;
    state.boss.maxHp = 0;
    state.boss.telegraphLabel = '';
    state.boss.vulnerable = false;
    state.boss.defeated = false;
  }

  function disposeAll() {
    encounter = null;
    clearTelegraphs();
    clearProjectiles();
    resetBossUi();
  }

  function createTelegraphMesh(kind, color = 0xc8b89a, opacity = 0.35) {
    if (kind === 'ring') {
      return new THREE.Mesh(
        new THREE.RingGeometry(0.94, 1.08, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
      );
    }
    if (kind === 'line') {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
      );
    }
    return new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
    );
  }

  function addTelegraph(entry) {
    telegraphRoot.add(entry.mesh);
    telegraphs.push(entry);
    return entry;
  }

  function addRingTelegraph({ radius = 2, x = 0, z = 0, color = 0xd6c19f, duration = 1.1, damage = 20, speed = 20, width = 1.3 }) {
    const mesh = createTelegraphMesh('ring', color, 0.42);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.scale.set(radius, radius, radius);
    return addTelegraph({
      type: 'ring',
      mesh,
      x,
      z,
      radius,
      damage,
      speed,
      width,
      duration,
      life: duration,
      armed: false,
      didDamage: false,
    });
  }

  function addLineTelegraph({ angle = 0, length = 32, width = 3.8, delay = 1, color = 0xf1c28d, damage = 24 }) {
    const mesh = createTelegraphMesh('line', color, 0.26);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = angle;
    mesh.position.set(Math.cos(angle) * (length * 0.5), 0.05, Math.sin(angle) * (length * 0.5));
    mesh.scale.set(length, width, 1);
    return addTelegraph({
      type: 'line',
      mesh,
      angle,
      length,
      width,
      delay,
      life: delay + 0.25,
      damage,
      armed: false,
      didDamage: false,
    });
  }

  function addCircleTelegraph({ x, z, radius = 2.6, delay = 0.9, color = 0xb7ffdc, damage = 22, riseHeight = 4.2 }) {
    const mesh = createTelegraphMesh('circle', color, 0.3);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    mesh.scale.set(radius, radius, radius);
    return addTelegraph({
      type: 'circle',
      mesh,
      x,
      z,
      radius,
      delay,
      life: delay + 0.85,
      damage,
      riseHeight,
      armed: false,
      didDamage: false,
      pillarSpawned: false,
    });
  }

  function spawnBoulder({ origin, target, speed = 18, arc = 6, damage = 18, radius = 1.6 }) {
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({
        color: 0x8f7a58,
        emissive: 0x6ff0b0,
        emissiveIntensity: 0.18,
        roughness: 0.94,
        metalness: 0.06,
      }),
    );
    mesh.position.copy(origin);
    projectileRoot.add(mesh);
    const direction = temp.vec3A.copy(target).sub(origin);
    const flatDistance = Math.max(0.001, Math.hypot(direction.x, direction.z));
    direction.multiplyScalar(1 / Math.max(0.001, direction.length()));
    projectiles.push({
      mesh,
      velocity: new THREE.Vector3(direction.x * speed, arc, direction.z * speed),
      gravity: Math.max(9, 14 - flatDistance * 0.08),
      radius,
      damage,
      life: 3.2,
    });
  }

  function spawnPillarVisual(x, z, height = 4.2) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.35, height, 10),
      new THREE.MeshStandardMaterial({
        color: 0x7a684d,
        emissive: 0x8affc6,
        emissiveIntensity: 0.14,
        roughness: 0.92,
        metalness: 0.08,
      }),
    );
    pillar.position.set(x, height * 0.5 - 1.8, z);
    telegraphRoot.add(pillar);
    pillars.push({ mesh: pillar, life: 0.6 });
    return pillar;
  }

  function pointInLineDanger(position, angle, length, width) {
    const dx = position.x;
    const dz = position.z;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localX = (dx * cos) + (dz * sin);
    const localZ = (-dx * sin) + (dz * cos);
    return localX >= 0 && localX <= length && Math.abs(localZ) <= width * 0.5;
  }

  function damagePlayerIfNear(x, z, radius, damage) {
    const px = temp.player.position.x - x;
    const pz = temp.player.position.z - z;
    if ((px * px) + (pz * pz) <= radius * radius) onDamagePlayer(damage);
  }

  function spawnAdds(count = 2) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 16 + Math.random() * 10;
      const type = index % 2 === 0 ? 'tank' : 'splitter';
      enemySystem.spawnEnemy(type, angle, dist, Math.max(8, state.wave));
    }
  }

  function setVulnerable(active, duration = 1.4) {
    if (!encounter?.bossEnemy?.userData) return;
    encounter.vulnerableTimer = active ? duration : 0;
    encounter.bossEnemy.userData.damageTakenMultiplier = active ? 1.3 : 0.52;
    state.boss.vulnerable = active;
  }

  function updateTelegraphs(dt) {
    for (let index = telegraphs.length - 1; index >= 0; index -= 1) {
      const entry = telegraphs[index];
      entry.life -= dt;
      if (entry.type === 'ring') {
        entry.armed = true;
        entry.radius += entry.speed * dt;
        entry.mesh.scale.set(entry.radius, entry.radius, entry.radius);
        entry.mesh.material.opacity = clamp(entry.life / Math.max(0.001, entry.duration), 0.1, 0.55);
        const distance = Math.hypot(temp.player.position.x - entry.x, temp.player.position.z - entry.z);
        if (!entry.didDamage && Math.abs(distance - entry.radius) <= entry.width) {
          onDamagePlayer(entry.damage);
          entry.didDamage = true;
        }
      } else if (entry.type === 'line') {
        entry.delay -= dt;
        entry.mesh.material.opacity = entry.delay > 0 ? 0.12 + (Math.sin((entry.life + dt) * 18) * 0.08 + 0.16) : 0.46;
        if (entry.delay <= 0 && !entry.didDamage) {
          if (pointInLineDanger(temp.player.position, entry.angle, entry.length, entry.width)) onDamagePlayer(entry.damage);
          entry.didDamage = true;
          vfx.spawnExplosionRing(entry.mesh.position, entry.width * 0.5);
        }
      } else if (entry.type === 'circle') {
        entry.delay -= dt;
        entry.mesh.material.opacity = entry.delay > 0 ? 0.16 + (Math.sin(entry.life * 16) * 0.08 + 0.12) : 0.44;
        if (entry.delay <= 0 && !entry.didDamage) {
          damagePlayerIfNear(entry.x, entry.z, entry.radius, entry.damage);
          vfx.spawnExplosionRing(temp.vec3A.set(entry.x, 0.18, entry.z), entry.radius);
          spawnPillarVisual(entry.x, entry.z, entry.riseHeight);
          entry.didDamage = true;
        }
      }

      if (entry.life <= 0) {
        telegraphRoot.remove(entry.mesh);
        entry.mesh.geometry?.dispose?.();
        entry.mesh.material?.dispose?.();
        telegraphs.splice(index, 1);
      }
    }

    for (let index = pillars.length - 1; index >= 0; index -= 1) {
      const pillar = pillars[index];
      pillar.life -= dt;
      pillar.mesh.position.y += Math.min(4.4, 8.6 * dt);
      if (pillar.life <= 0) {
        telegraphRoot.remove(pillar.mesh);
        pillar.mesh.geometry?.dispose?.();
        pillar.mesh.material?.dispose?.();
        pillars.splice(index, 1);
      }
    }
  }

  function updateProjectiles(dt) {
    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = projectiles[index];
      projectile.life -= dt;
      projectile.velocity.y -= projectile.gravity * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 3.4;
      projectile.mesh.rotation.y += dt * 2.8;

      if (projectile.mesh.position.y <= 0.4 || projectile.life <= 0) {
        vfx.spawnExplosionRing(projectile.mesh.position, projectile.radius);
        damagePlayerIfNear(projectile.mesh.position.x, projectile.mesh.position.z, projectile.radius, projectile.damage);
        projectileRoot.remove(projectile.mesh);
        projectile.mesh.geometry?.dispose?.();
        projectile.mesh.material?.dispose?.();
        projectiles.splice(index, 1);
      }
    }
  }

  function getPhaseFromRatio(hpRatio) {
    if (hpRatio <= 0.25) return 4;
    if (hpRatio <= 0.5) return 3;
    if (hpRatio <= 0.75) return 2;
    return 1;
  }

  function beginAttack(type) {
    if (!encounter) return;
    encounter.attack = { type, time: 0, step: 0 };
    if (type === 'shockwaveSlam') setBossLabel('Shockwave Slam');
    if (type === 'fissureLine') setBossLabel('Fissure Line');
    if (type === 'boulderVolley') setBossLabel('Boulder Volley');
    if (type === 'pillarRise') setBossLabel('Pillar Rise');
    if (type === 'addSummon') setBossLabel('Add Summon');
    if (type === 'coreBurst') setBossLabel('Core Burst');
    setVulnerable(false, 0);
  }

  function finishAttack(recovery = 1.2, vulnerableDuration = 1.4) {
    if (!encounter) return;
    encounter.attack = null;
    encounter.attackCooldown = recovery;
    if (vulnerableDuration > 0) setVulnerable(true, vulnerableDuration);
  }

  function chooseNextAttack() {
    if (!encounter) return;
    const phase = encounter.phase;
    const patterns = {
      1: ['shockwaveSlam', 'boulderVolley', 'fissureLine'],
      2: ['fissureLine', 'pillarRise', 'shockwaveSlam', 'boulderVolley'],
      3: ['pillarRise', 'addSummon', 'coreBurst', 'boulderVolley', 'shockwaveSlam'],
      4: ['coreBurst', 'fissureLine', 'shockwaveSlam', 'pillarRise', 'boulderVolley', 'addSummon'],
    };
    const list = patterns[phase] || patterns[1];
    const attackType = list[encounter.patternIndex % list.length];
    encounter.patternIndex += 1;
    beginAttack(attackType);
  }

  function updateBossVisual(enemy, data, dt, elapsed) {
    enemy.position.set(0, 2.35 + Math.sin(elapsed * 1.05) * 0.08, 0);
    enemy.lookAt(temp.player.position.x, enemy.position.y + 1, temp.player.position.z);
    if (data.anim?.body) data.anim.body.rotation.z = Math.sin(elapsed * 0.7) * 0.025;
    data.anim?.legs?.forEach((leg, index) => {
      leg.rotation.x = Math.sin(elapsed * 1.1 + index * 0.8) * 0.08;
      leg.rotation.z = Math.sin(elapsed * 0.6 + index) * 0.04;
    });
    data.anim?.extras?.forEach((extra, index) => {
      extra.rotation.y += dt * (0.08 + index * 0.01);
      extra.rotation.x = Math.sin(elapsed * 1.45 + index * 0.5) * 0.05;
    });
  }

  function updateAttack(dt, elapsed) {
    const attack = encounter?.attack;
    if (!attack || !encounter?.bossEnemy) return;
    const bossPos = encounter.bossEnemy.position;
    attack.time += dt;

    if (attack.type === 'shockwaveSlam') {
      if (attack.step === 0) {
        addRingTelegraph({ radius: 3.2, x: 0, z: 0, damage: encounter.phase >= 4 ? 26 : 20, speed: encounter.phase >= 4 ? 26 : 20, width: 1.6 });
        if (encounter.phase >= 4) addRingTelegraph({ radius: 7.4, x: 0, z: 0, damage: 22, speed: 22, width: 1.3, duration: 1.2, color: 0xb9ffd2 });
        attack.step = 1;
      }
      if (attack.time >= (encounter.phase >= 4 ? 1.55 : 1.2)) finishAttack(1.05, 1.5);
      return;
    }

    if (attack.type === 'fissureLine') {
      if (attack.step === 0) {
        const lineCount = encounter.phase >= 4 ? 3 : encounter.phase >= 2 ? 2 : 1;
        const baseAngle = Math.atan2(temp.player.position.z, temp.player.position.x);
        for (let index = 0; index < lineCount; index += 1) {
          const spread = lineCount === 1 ? 0 : (index - (lineCount - 1) * 0.5) * 0.42;
          addLineTelegraph({ angle: baseAngle + spread, length: 34, width: encounter.phase >= 4 ? 5.2 : 4.2, delay: 0.95 - encounter.phase * 0.05 });
        }
        attack.step = 1;
      }
      if (attack.time >= 1.45) finishAttack(0.95, 1.25);
      return;
    }

    if (attack.type === 'boulderVolley') {
      if (attack.time >= attack.step * 0.28 && attack.step < (encounter.phase >= 4 ? 6 : 4)) {
        const target = temp.vec3A.copy(temp.player.position).add(new THREE.Vector3((Math.random() - 0.5) * 6, 0.25, (Math.random() - 0.5) * 6));
        const origin = new THREE.Vector3((Math.random() - 0.5) * 7, bossPos.y + 3.5 + Math.random() * 1.2, 1.5 + Math.random() * 2.4);
        spawnBoulder({ origin, target, speed: 11 + attack.step * 0.6, arc: 8.5, damage: 16 + encounter.phase * 2, radius: 2 + Math.random() * 0.5 });
        attack.step += 1;
      }
      if (attack.time >= 2.05) finishAttack(0.85, 1.2);
      return;
    }

    if (attack.type === 'pillarRise') {
      if (attack.step === 0) {
        const count = encounter.phase >= 4 ? 7 : encounter.phase >= 2 ? 5 : 4;
        for (let index = 0; index < count; index += 1) {
          const angle = (index / count) * Math.PI * 2 + elapsed * 0.35;
          const radius = 10 + (index % 2) * 7 + Math.random() * 3;
          addCircleTelegraph({
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius,
            radius: 2.4 + Math.random() * 1.1,
            delay: 0.8 + Math.random() * 0.4,
            damage: 18 + encounter.phase * 2,
          });
        }
        attack.step = 1;
      }
      if (attack.time >= 1.85) finishAttack(1.1, 1.45);
      return;
    }

    if (attack.type === 'addSummon') {
      if (attack.step === 0) {
        addRingTelegraph({ radius: 5.2, x: 0, z: 0, damage: 18, speed: 16, width: 1.4, duration: 0.9, color: 0x9cffd0 });
        attack.step = 1;
      }
      if (attack.time >= 0.95 && attack.step === 1) {
        spawnAdds(encounter.phase >= 4 ? 4 : 3);
        attack.step = 2;
      }
      if (attack.time >= 1.55) finishAttack(1.2, 1.6);
      return;
    }

    if (attack.type === 'coreBurst') {
      if (attack.step === 0) {
        addCircleTelegraph({ x: 0, z: 0, radius: 8.8, delay: 1.05, damage: 32, color: 0xffd58e, riseHeight: 5.2 });
        attack.step = 1;
      }
      if (attack.time >= 1.08 && attack.step === 1) {
        addRingTelegraph({ radius: 4.6, x: 0, z: 0, damage: 26, speed: encounter.phase >= 4 ? 28 : 22, width: 1.8, duration: 1.2, color: 0xffe0a4 });
        if (encounter.phase >= 4) addRingTelegraph({ radius: 10.8, x: 0, z: 0, damage: 22, speed: 25, width: 1.5, duration: 1.1, color: 0xc3ffdd });
        attack.step = 2;
      }
      if (attack.time >= 1.85) finishAttack(0.9, 1.75);
    }
  }

  function startMission(mission) {
    disposeAll();
    if (!mission || mission.type !== 'boss' || mission.id !== EARTH_BOSS_ID) return;

    const bossDef = getBossDefinition(mission.id);
    const bossEnemy = enemySystem.spawnEnemy('earthTitan', 0, 0, 1);
    const bossData = bossEnemy.userData;
    bossEnemy.position.set(0, 2.35, 0);
    bossData.maxHp = 1650;
    bossData.hp = bossData.maxHp;
    bossData.damage = 74;
    bossData.bodyCollisionRadius = 7.4;
    bossData.hitboxRadius = 6.1;
    bossData.hitboxHalfHeight = 6.4;
    bossData.hitboxCenterOffsetY = 4.3;
    bossData.damageTakenMultiplier = 0.52;
    bossData.behaviorController = {
      update({ enemy, data, dt, elapsed }) {
        updateBossVisual(enemy, data, dt, elapsed);
      },
    };

    encounter = {
      id: bossDef.id,
      bossEnemy,
      phase: 1,
      patternIndex: 0,
      attack: null,
      attackCooldown: 1.25,
      labelTimer: 1.2,
      vulnerableTimer: 0,
      defeatedHandled: false,
    };

    state.boss.active = true;
    state.boss.id = bossDef.id;
    state.boss.name = bossDef.name;
    state.boss.phase = 1;
    state.boss.phaseCount = bossDef.phases;
    state.boss.hp = bossData.hp;
    state.boss.maxHp = bossData.maxHp;
    state.boss.defeated = false;
    setBossLabel('Earth Titan erwacht', 1.8);
  }

  function update(dt, elapsed) {
    updateTelegraphs(dt);
    updateProjectiles(dt);
    if (!encounter?.bossEnemy) return;

    const bossData = encounter.bossEnemy.userData;
    if (!bossData || bossData.dead) {
      if (!encounter.defeatedHandled) {
        encounter.defeatedHandled = true;
        state.boss.defeated = true;
        state.boss.telegraphLabel = 'Earth Titan gefallen';
        onBossDefeated(encounter.id);
      }
      return;
    }

    const hpRatio = clamp(bossData.hp / Math.max(1, bossData.maxHp), 0, 1);
    const nextPhase = getPhaseFromRatio(hpRatio);
    if (nextPhase !== encounter.phase) {
      encounter.phase = nextPhase;
      encounter.attackCooldown = 0.8;
      setBossLabel(`Phase ${nextPhase} / 4`, 1.9);
      addRingTelegraph({ radius: 5.2, x: 0, z: 0, damage: 0, speed: 18, width: 1.1, duration: 0.9, color: 0x9effd4 });
    }

    encounter.labelTimer = Math.max(0, encounter.labelTimer - dt);
    if (encounter.labelTimer <= 0) state.boss.telegraphLabel = '';

    encounter.vulnerableTimer = Math.max(0, encounter.vulnerableTimer - dt);
    if (encounter.vulnerableTimer <= 0 && state.boss.vulnerable) setVulnerable(false, 0);

    if (!encounter.attack) {
      encounter.attackCooldown -= dt;
      if (encounter.attackCooldown <= 0) chooseNextAttack();
    } else {
      updateAttack(dt, elapsed);
    }

    state.boss.phase = encounter.phase;
    state.boss.hp = bossData.hp;
    state.boss.maxHp = bossData.maxHp;
  }

  return {
    startMission,
    update,
    clear: disposeAll,
    isBossMissionActive() {
      return !!encounter;
    },
  };
}
