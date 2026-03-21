import {
  DEFAULT_SPECIAL_ABILITY_ID,
  getSpecialAbilityDef,
  getSpecialAbilityLevel,
  getSpecialAbilityUpgradeValue,
  resolveSpecialAbilityId,
} from '../config/specialAbilities.js';
import { getEnemyData } from './enemyRuntimeUtils.js';

const FALLBACK_HUD_COLOR = '#ffffff';

export function createSpecialAbilitySystem({
  THREE,
  scene,
  state,
  collision,
  vfx,
  temp,
  playerRigHolder,
  profile,
  getCharacterCombatProfile,
  spawnBonusVolley,
  damageEnemy,
}) {
  const runtime = {
    activeAbilityId: DEFAULT_SPECIAL_ABILITY_ID,
    cooldownRemaining: 0,
    activeRemaining: 0,
    grenadeMeshes: [],
    clone: null,
  };

  const meshAssets = {
    grenadeGeometry: new THREE.IcosahedronGeometry(0.3, 0),
    grenadeCoreGeometry: new THREE.SphereGeometry(0.12, 12, 12),
    cloneBodyGeometry: new THREE.CapsuleGeometry(0.42, 0.88, 6, 10),
    cloneHaloGeometry: new THREE.TorusGeometry(0.78, 0.08, 10, 32),
    grenadeMaterial: new THREE.MeshStandardMaterial({ color: 0xff9c5b, emissive: 0xff9c5b, emissiveIntensity: 0.5, roughness: 0.26, metalness: 0.28 }),
    grenadeCoreMaterial: new THREE.MeshStandardMaterial({ color: 0xfff0bf, emissive: 0xffcc7a, emissiveIntensity: 0.88, roughness: 0.12, metalness: 0.42 }),
    cloneBodyMaterial: new THREE.MeshStandardMaterial({ color: 0x73d5ff, emissive: 0x73d5ff, emissiveIntensity: 0.32, roughness: 0.18, metalness: 0.16, transparent: true, opacity: 0.78 }),
    cloneHaloMaterial: new THREE.MeshStandardMaterial({ color: 0xd6f6ff, emissive: 0x8ee8ff, emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.24, transparent: true, opacity: 0.55 }),
  };

  function getSelectedAbilityId() {
    return resolveSpecialAbilityId(profile.specialAbilities?.selectedId);
  }

  function getActiveDef() {
    return getSpecialAbilityDef(runtime.activeAbilityId || getSelectedAbilityId());
  }

  function getActiveLevel() {
    return getSpecialAbilityLevel(profile.specialAbilities?.levels, runtime.activeAbilityId);
  }

  function syncHudState(statusOverride = null) {
    const def = getActiveDef();
    state.specialAbility.selectedId = getSelectedAbilityId();
    state.specialAbility.activeId = def.id;
    state.specialAbility.name = def.name;
    state.specialAbility.shortLabel = def.shortLabel;
    state.specialAbility.icon = def.icon;
    state.specialAbility.hudColor = def.hudColor || FALLBACK_HUD_COLOR;
    state.specialAbility.cooldownRemaining = Math.max(0, runtime.cooldownRemaining);
    state.specialAbility.activeRemaining = Math.max(0, runtime.activeRemaining);
    state.specialAbility.status = statusOverride || (runtime.activeRemaining > 0 ? 'active' : runtime.cooldownRemaining > 0 ? 'cooldown' : 'ready');
    state.specialAbility.detail = runtime.activeRemaining > 0
      ? `Aktiv ${runtime.activeRemaining.toFixed(1)}s`
      : runtime.cooldownRemaining > 0
        ? `Bereit in ${runtime.cooldownRemaining.toFixed(1)}s`
        : 'Bereit';
  }

  function removeGrenade(grenade) {
    if (!grenade?.mesh) return;
    scene.remove(grenade.mesh);
    const index = runtime.grenadeMeshes.indexOf(grenade);
    if (index >= 0) runtime.grenadeMeshes.splice(index, 1);
  }

  function clearGrenades() {
    runtime.grenadeMeshes.slice().forEach((grenade) => removeGrenade(grenade));
  }

  function createGrenadeMesh() {
    const root = new THREE.Group();
    const shell = new THREE.Mesh(meshAssets.grenadeGeometry, meshAssets.grenadeMaterial);
    const core = new THREE.Mesh(meshAssets.grenadeCoreGeometry, meshAssets.grenadeCoreMaterial);
    core.position.y = 0.02;
    root.add(shell, core);
    return root;
  }

  function detonateGrenade(grenade) {
    if (!grenade || grenade.detonated) return;
    grenade.detonated = true;
    const level = getActiveLevel();
    const def = getSpecialAbilityDef('grenade');
    const radius = def.baseValues.radius;
    const damage = getSpecialAbilityUpgradeValue('grenade', level);
    const hitPosition = grenade.mesh.position.clone();
    hitPosition.y = 0.6;
    vfx.spawnExplosionRing(hitPosition, radius);
    vfx.spawnImpactBurst(hitPosition, 0xffb26c, 10, 4.2, 0.35, 1.4);
    collision.forEachEnemyNearPosition(hitPosition, radius, (enemy) => {
      const data = getEnemyData(enemy);
      if (!data || data.dead) return;
      const dx = enemy.position.x - hitPosition.x;
      const dz = enemy.position.z - hitPosition.z;
      if ((dx * dx) + (dz * dz) > radius * radius) return;
      damageEnemy(enemy, damage, {
        allowLightningChain: true,
        impactEffects: { rockets: true },
        weaponProfile: getCharacterCombatProfile(),
      });
    });
    removeGrenade(grenade);
  }

  function triggerGrenade() {
    const def = getSpecialAbilityDef('grenade');
    if (runtime.grenadeMeshes.length >= def.baseValues.maxActive) removeGrenade(runtime.grenadeMeshes[0]);
    const mesh = createGrenadeMesh();
    mesh.position.copy(playerRigHolder.position).setY(state.world.playerGroundY + 0.38);
    mesh.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    scene.add(mesh);
    runtime.grenadeMeshes.push({
      mesh,
      fuse: def.baseValues.fuse,
      detonated: false,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function destroyClone() {
    if (!runtime.clone?.mesh) {
      runtime.clone = null;
      return;
    }
    scene.remove(runtime.clone.mesh);
    runtime.clone = null;
  }

  function createCloneMesh() {
    const root = new THREE.Group();
    const body = new THREE.Mesh(meshAssets.cloneBodyGeometry, meshAssets.cloneBodyMaterial);
    const halo = new THREE.Mesh(meshAssets.cloneHaloGeometry, meshAssets.cloneHaloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.18;
    root.add(body, halo);
    root.userData.body = body;
    root.userData.halo = halo;
    return root;
  }

  function triggerClone() {
    destroyClone();
    const mesh = createCloneMesh();
    mesh.position.copy(playerRigHolder.position).setY(state.world.playerGroundY + 0.88);
    scene.add(mesh);
    runtime.clone = {
      mesh,
      radius: getSpecialAbilityDef('clone').baseValues.radius,
      hp: getSpecialAbilityUpgradeValue('clone', getActiveLevel()),
      maxHp: getSpecialAbilityUpgradeValue('clone', getActiveLevel()),
      lifetime: getSpecialAbilityDef('clone').baseValues.lifetime,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function triggerBackfire() {
    runtime.activeRemaining = getSpecialAbilityUpgradeValue('backfire', getActiveLevel());
  }

  function triggerSlowMow() {
    const def = getSpecialAbilityDef('slowMow');
    const duration = getSpecialAbilityUpgradeValue('slowMow', getActiveLevel());
    state.entities.enemies.forEach((enemy) => {
      const data = getEnemyData(enemy);
      if (!data || data.dead) return;
      data.specialSlowTimer = Math.max(data.specialSlowTimer || 0, duration);
      data.specialSlowMultiplier = def.baseValues.slowMultiplier;
    });
    runtime.activeRemaining = duration;
    vfx.spawnImpactBurst(playerRigHolder.position.clone().setY(state.world.playerGroundY + 1), 0x8dffd5, 12, 5.5, 0.28, 1.2);
  }

  function triggerActiveAbility() {
    const def = getActiveDef();
    runtime.cooldownRemaining = def.cooldown;
    runtime.activeRemaining = 0;
    if (def.id === 'grenade') triggerGrenade();
    else if (def.id === 'clone') triggerClone();
    else if (def.id === 'backfire') triggerBackfire();
    else if (def.id === 'slowMow') triggerSlowMow();
    syncHudState(def.id === 'grenade' || def.id === 'clone' ? 'cooldown' : 'active');
  }

  function initRun() {
    clear();
    runtime.activeAbilityId = getSelectedAbilityId();
    runtime.cooldownRemaining = getActiveDef().cooldown;
    runtime.activeRemaining = 0;
    syncHudState('cooldown');
  }

  function updateGrenades(dt) {
    for (let index = runtime.grenadeMeshes.length - 1; index >= 0; index -= 1) {
      const grenade = runtime.grenadeMeshes[index];
      if (!grenade?.mesh) {
        runtime.grenadeMeshes.splice(index, 1);
        continue;
      }
      grenade.fuse -= dt;
      grenade.pulse += dt * 5;
      grenade.mesh.rotation.x += dt * 2.4;
      grenade.mesh.rotation.y += dt * 5.1;
      grenade.mesh.position.y = state.world.playerGroundY + 0.28 + Math.sin(grenade.pulse) * 0.06;
      if (grenade.fuse <= 0) detonateGrenade(grenade);
    }
  }

  function updateClone(dt, elapsed) {
    if (!runtime.clone?.mesh) return;
    runtime.clone.lifetime -= dt;
    runtime.clone.pulse += dt * 3.6;
    runtime.clone.mesh.position.y = state.world.playerGroundY + 0.88 + Math.sin(runtime.clone.pulse) * 0.08;
    runtime.clone.mesh.rotation.y += dt * 1.4;
    const body = runtime.clone.mesh.userData.body;
    const halo = runtime.clone.mesh.userData.halo;
    if (body) body.scale.setScalar(0.95 + Math.sin(elapsed * 5) * 0.04);
    if (halo) halo.scale.setScalar(0.94 + Math.sin(runtime.clone.pulse * 1.2) * 0.08);
    if (runtime.clone.lifetime <= 0 || runtime.clone.hp <= 0) destroyClone();
    runtime.activeRemaining = runtime.clone ? Math.max(runtime.activeRemaining, runtime.clone.lifetime) : 0;
  }

  function update(dt, elapsed) {
    runtime.activeAbilityId = getSelectedAbilityId();
    runtime.cooldownRemaining = Math.max(0, runtime.cooldownRemaining - dt);
    runtime.activeRemaining = Math.max(0, runtime.activeRemaining - dt);
    updateGrenades(dt);
    updateClone(dt, elapsed);
    if (runtime.cooldownRemaining <= 0) triggerActiveAbility();
    syncHudState();
  }

  function onPlayerPrimaryVolley() {
    if (runtime.activeAbilityId !== 'backfire' || runtime.activeRemaining <= 0) return false;
    spawnBonusVolley({
      yawOverride: state.yaw + Math.PI,
      originOverride: playerRigHolder.position,
      weaponProfile: getCharacterCombatProfile().weaponProfile,
    });
    return true;
  }

  function getEnemyTargetInfo() {
    if (runtime.clone?.mesh) {
      return {
        kind: 'clone',
        position: runtime.clone.mesh.position,
        radius: runtime.clone.radius,
        damage(amount) {
          if (!runtime.clone) return;
          runtime.clone.hp = Math.max(0, runtime.clone.hp - amount);
          if (runtime.clone.hp <= 0) destroyClone();
        },
      };
    }

    return {
      kind: 'player',
      position: playerRigHolder.position,
      radius: state.world.playerCollisionRadius,
      damage: null,
    };
  }

  function clear() {
    clearGrenades();
    destroyClone();
    runtime.activeAbilityId = getSelectedAbilityId();
    runtime.cooldownRemaining = 0;
    runtime.activeRemaining = 0;
    state.entities.enemies.forEach((enemy) => {
      const data = getEnemyData(enemy);
      if (!data) return;
      data.specialSlowTimer = 0;
      data.specialSlowMultiplier = null;
      data.currentTargetPosition = null;
    });
    syncHudState('ready');
  }

  return {
    initRun,
    update,
    clear,
    onPlayerPrimaryVolley,
    getEnemyTargetInfo,
  };
}
