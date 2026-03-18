import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import {
  CHARACTER_DEFS,
  ENEMY_TYPES,
  LEVELS_PER_WORLD,
  POWER_UP_DEFS,
  RUN_BASE,
  SAFETY_LIMITS,
  UPGRADE_DEFS,
  WAVES_PER_LEVEL,
  WORLDS_COUNT,
  gameplayConfig,
} from '../config/gameConfig.js';
import { createGameState } from './state.js';
import { createProfileApi, loadProfile, loadSelectedCharacterId, saveSelectedCharacterId } from './profile.js';
import { getUI } from '../ui/dom.js';
import { createMenuController } from '../ui/menu.js';
import { setupCharacterSelection } from '../ui/characterSelection.js';
import { createCharacterModule } from '../entities/characters.js';
import { createWorldMap } from '../systems/worldSystem.js';
import { createCollisionSystem } from '../systems/collisionSystem.js';
import { createCombatSystem } from '../systems/combatSystem.js';
import { createEnemySystem } from '../systems/enemySystem.js';
import { createInputSystem } from '../systems/inputSystem.js';
import { createPerformanceSystem } from '../systems/performanceSystem.js';
import { createProjectileSystem } from '../systems/projectileSystem.js';
import { createVfxSystem } from '../systems/vfxSystem.js';
import { registerServiceWorker } from '../pwa/register-sw.js';

export function startGameApp() {
  const ui = getUI();
  const profile = loadProfile();
  const profileApi = createProfileApi(profile);
  const characterModule = createCharacterModule(THREE, CHARACTER_DEFS);

  const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08121f);
  scene.fog = new THREE.Fog(0x08121f, 24, 126);

  const camera = new THREE.PerspectiveCamera(gameplayConfig.camera.fov, window.innerWidth / window.innerHeight, 0.1, 220);
  const clock = new THREE.Clock();
  const temp = {
    vec3A: new THREE.Vector3(),
    vec3B: new THREE.Vector3(),
    vec3C: new THREE.Vector3(),
    vec2A: new THREE.Vector2(),
    quatA: new THREE.Quaternion(),
    player: { position: new THREE.Vector3() },
    callbacks: {},
  };
  const sceneResources = {
    WORLD_UP: new THREE.Vector3(0, 1, 0),
    RUN_BASE,
    SAFETY_LIMITS,
  };

  scene.add(new THREE.HemisphereLight(0x9fd9ff, 0x1b273b, 0.75));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(10, 18, 4);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 90;
  dir.shadow.camera.left = -40;
  dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 40;
  dir.shadow.camera.bottom = -40;
  dir.shadow.bias = -0.00025;
  scene.add(dir);

  const fillLight = new THREE.DirectionalLight(0x8ec5ff, 0.35);
  fillLight.position.set(-16, 10, -9);
  scene.add(fillLight);

  const arena = new THREE.Mesh(
    new THREE.PlaneGeometry(gameplayConfig.arena.size, gameplayConfig.arena.size, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x243f35, metalness: 0.03, roughness: 0.96 }),
  );
  arena.rotation.x = -Math.PI / 2;
  arena.receiveShadow = true;
  scene.add(arena);

  const mapRoot = new THREE.Group();
  const playerRigHolder = new THREE.Group();
  playerRigHolder.position.set(0, 0.2, 0);
  scene.add(mapRoot, playerRigHolder);

  const state = createGameState(profile, {
    getPlayerMaxHp,
    getBaseMoveSpeedMultiplier,
  });
  state.selection.characterId = loadSelectedCharacterId();

  const performance = createPerformanceSystem({
    THREE,
    state,
    ui,
    SAFETY_LIMITS,
    getCounts: () => ({
      bullets: state.entities.bullets.length,
      enemies: state.entities.enemies.length,
      vfx: state.entities.vfxParticles.length,
      damageNumbers: state.entities.damageNumbers.length,
      chainBeams: state.entities.chainBeams.length,
    }),
  });

  const collision = createCollisionSystem({
    THREE,
    gameplayConfig,
    state,
    getPlayerPosition: () => playerRigHolder.position,
    SAFETY_LIMITS,
  });
  createWorldMap({ THREE, gameplayConfig, mapRoot, addCollider: collision.addCollider });

  const vfx = createVfxSystem({
    THREE,
    scene,
    state,
    performance,
    SAFETY_LIMITS,
    temp,
    sceneResources,
  });

  let finishRun = () => {};
  const combat = createCombatSystem({
    state,
    profile,
    performance,
    collision,
    vfx,
    runPowers: state.runPowers,
    getUpgradeLevel,
    getShieldPickupCapacity,
    getBaseMoveSpeedMultiplier,
    getPlayerMaxHp,
    getSafeProjectileCountFromDoublers: (stacks) => projectileSystem.getSafeProjectileCountFromDoublers(stacks),
    finishRun: (success) => finishRun(success),
    sceneResources,
    temp,
  });

  const enemySystem = createEnemySystem({
    THREE,
    scene,
    state,
    gameplayConfig,
    ENEMY_TYPES,
    performance,
    collision,
    vfx,
    temp,
    profile,
    onDamagePlayer: combat.damagePlayer,
  });

  const projectileSystem = createProjectileSystem({
    THREE,
    scene,
    state,
    performance,
    collision,
    vfx,
    temp,
    playerRigHolder,
    getAttackCooldown,
    getBaseDamage,
    getProjectileEffects: combat.getProjectileEffects,
    sceneResources,
  });

  combat.api.spawnEnemy = enemySystem.spawnEnemy;
  combat.api.destroyEnemy = enemySystem.destroyEnemy;
  enemySystem.registerCallbacks({ damageEnemy: combat.damageEnemy });

  const inputSystem = createInputSystem({
    THREE,
    ui,
    state,
    gameplayConfig,
    onToggleDebug: performance.toggleDebug,
  });

  let playerRig = null;
  function getCharacterDef(characterId = state.selection.characterId) {
    return characterModule.getCharacterDef(characterId, state.selection.characterId);
  }

  function setPlayerCharacter(characterId) {
    state.selection.characterId = characterId;
    saveSelectedCharacterId(characterId);
    if (playerRig) playerRigHolder.remove(playerRig.root);
    playerRig = characterModule.createCharacterRig(getCharacterDef(characterId));
    playerRigHolder.add(playerRig.root);
    ui.selectedCharacterLabel.textContent = getCharacterDef(characterId).name;
  }

  const characterSelection = setupCharacterSelection({
    THREE,
    ui,
    characterDefs: CHARACTER_DEFS,
    createCharacterRig: characterModule.createCharacterRig,
    animateCharacterRig: characterModule.animateCharacterRig,
    onSelectCharacter: setPlayerCharacter,
    isSelectedCharacter: (characterId) => characterId === state.selection.characterId,
  });
  setPlayerCharacter(state.selection.characterId);

  function getUpgradeLevel(id) {
    return profile.upgrades[id] || 0;
  }

  function getUpgradeCost(id) {
    const def = UPGRADE_DEFS.find((entry) => entry.id === id);
    const level = getUpgradeLevel(id);
    if (!def || level >= def.maxLevel) return null;
    return def.baseCost + level * def.costStep;
  }

  function getPlayerMaxHp() {
    return 100 + getUpgradeLevel('maxHealth') * 14;
  }

  function getBaseDamage() {
    return 1 + getUpgradeLevel('baseDamage') * 0.22;
  }

  function getAttackCooldown() {
    return Math.max(0.07, 0.18 * Math.pow(0.94, getUpgradeLevel('attackSpeed')));
  }

  function getBaseMoveSpeedMultiplier() {
    return 1 + getUpgradeLevel('movementSpeed') * 0.05;
  }

  function getShieldPickupCapacity() {
    return 26 + getUpgradeLevel('shieldCapacity') * 6;
  }

  function getDifficultyIndex(world = state.worldIndex, level = state.levelIndex, waveInLevel = state.waveInLevel) {
    return ((world - 1) * LEVELS_PER_WORLD + (level - 1)) * WAVES_PER_LEVEL + waveInLevel;
  }

  function getMissionLabel(world = state.worldIndex, level = state.levelIndex) {
    return `W${world} · L${level}`;
  }

  function getNextMission(world, level) {
    if (level < LEVELS_PER_WORLD) return { world, level: level + 1 };
    if (world < WORLDS_COUNT) return { world: world + 1, level: 1 };
    return null;
  }

  function spawnPowerPickup(type = randomPowerKey()) {
    let position = null;
    for (let tries = 0; tries < 24; tries++) {
      const candidate = collision.randomArenaPoint();
      if (collision.isPointValidForPickup(candidate)) {
        position = candidate;
        break;
      }
    }
    if (!position) return;

    const def = POWER_UP_DEFS[type];
    const mesh = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.09, 10, 26),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.25 }),
    );
    ring.rotation.x = Math.PI / 2;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: def.color, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.35 }),
    );
    mesh.add(ring, core);
    mesh.userData.ring = ring;
    mesh.position.copy(position).setY(0.9);
    scene.add(mesh);
    state.entities.powerPickups.push({ mesh, type, pulse: Math.random() * Math.PI * 2, radius: 0.95 });
  }

  function randomPowerKey() {
    const keys = Object.keys(POWER_UP_DEFS);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function removeAllPickups() {
    state.entities.powerPickups.forEach((pickup) => scene.remove(pickup.mesh));
    state.entities.powerPickups.length = 0;
  }

  function updateHUD() {
    ui.wave.textContent = `${state.waveInLevel} / ${WAVES_PER_LEVEL}`;
    ui.score.textContent = String(state.score);
    ui.hpBar.style.width = `${THREE.MathUtils.clamp((Math.max(0, state.hp) / getPlayerMaxHp()) * 100, 0, 100)}%`;
    ui.shieldValue.textContent = `${Math.max(0, Math.round(state.runPowers.shieldHp))}`;
    ui.powerSummary.textContent = `Power-ups: ${combat.getPowerSummaryText(POWER_UP_DEFS)}`;
    ui.missionLabel.textContent = getMissionLabel();
    ui.creditsValue.textContent = String(profile.credits + state.runCredits);

    ui.pickupFeed.innerHTML = '';
    for (const notice of state.ui.pickupNotices) {
      const el = document.createElement('div');
      el.className = 'pickup-line';
      el.style.opacity = `${Math.max(0, notice.life / notice.maxLife)}`;
      el.textContent = notice.text;
      ui.pickupFeed.appendChild(el);
    }
  }

  function clearRunObjects() {
    enemySystem.clear();
    projectileSystem.clear();
    vfx.clear();
    collision.clearEnemySpatialGrid();
    removeAllPickups();
    state.ui.pickupNotices.length = 0;
    state.performance.activeEnemyEffects = 0;
  }

  function purchaseUpgrade(upgradeId) {
    const def = UPGRADE_DEFS.find((entry) => entry.id === upgradeId);
    const cost = getUpgradeCost(upgradeId);
    if (!def || cost == null || profile.credits < cost) return;
    profile.credits -= cost;
    profile.upgrades[upgradeId] = getUpgradeLevel(upgradeId) + 1;
    profileApi.save();
    menuController.renderMenu();
    updateHUD();
  }

  function getSpawnBudget() {
    return Math.round(5 + state.waveInLevel * 1.5 + state.levelIndex * 1.2 + state.worldIndex * 1.8);
  }

  function spawnWave() {
    state.wave = getDifficultyIndex();
    state.spawnLeft = getSpawnBudget();
    for (let i = 0; i < state.spawnLeft; i++) {
      const type = enemySystem.pickEnemyType(state.wave, i);
      const angle = Math.random() * Math.PI * 2;
      const dist = gameplayConfig.arena.spawnMinDistance + Math.random() * (gameplayConfig.arena.spawnMaxDistance - gameplayConfig.arena.spawnMinDistance);
      enemySystem.spawnEnemy(type, angle, dist, state.wave);
      if (type === 'swarm' && i < state.spawnLeft - 2) {
        for (let g = 0; g < 2; g++) {
          enemySystem.spawnEnemy('swarm', angle + (Math.random() - 0.5) * 0.25, dist + (Math.random() - 0.5) * 2, state.wave);
        }
        i += 2;
      }
    }
    profile.stats.highestWaveReached = Math.max(profile.stats.highestWaveReached, state.wave);
  }

  finishRun = function finishRunImpl(success) {
    if (!state.running) return;
    state.running = false;
    if (success) profileApi.unlockNextMission(state.worldIndex, state.levelIndex);
    profile.credits += state.runCredits + (success ? 40 + state.levelIndex * 10 + state.worldIndex * 15 : 0);
    profile.stats.timePlayed += Math.max(0, state.elapsedRunTime - state.savedRunTime);
    profile.stats.highestWaveReached = Math.max(profile.stats.highestWaveReached, state.wave);
    if (success) {
      const nextMission = getNextMission(state.worldIndex, state.levelIndex);
      if (nextMission && profileApi.isLevelUnlocked(nextMission.world, nextMission.level)) profileApi.selectMission(nextMission.world, nextMission.level);
    }
    profileApi.save();
    combat.resetRunPowerUps();
    clearRunObjects();
    ui.controls.classList.add('hidden');
    ui.hud.classList.add('hidden');
    menuController.showRunResult(success);
    ui.gameOver.classList.remove('hidden');
  };

  function startGame(world = profile.progression.selectedWorld, level = profile.progression.selectedLevel) {
    if (!profileApi.isLevelUnlocked(world, level)) return;
    profileApi.selectMission(world, level);
    profile.stats.totalRuns += 1;
    profileApi.save();

    state.running = true;
    state.worldIndex = world;
    state.levelIndex = level;
    state.hp = getPlayerMaxHp();
    state.score = 0;
    state.waveInLevel = 1;
    state.wave = getDifficultyIndex(world, level, 1);
    state.fireCooldown = 0;
    state.wavePause = 0;
    state.totalKills = 0;
    state.waveKills = 0;
    state.pickupSpawnTimer = 3.5;
    state.runCredits = 0;
    state.damageDealt = 0;
    state.elapsedRunTime = 0;
    state.savedRunTime = 0;
    state.lastProfileSaveAt = 0;
    playerRigHolder.position.set(0, 0.2, 0);
    clearRunObjects();
    combat.resetRunPowerUps();
    spawnWave();
    updateHUD();
    ui.menu.classList.add('hidden');
    ui.gameOver.classList.add('hidden');
    ui.controls.classList.remove('hidden');
    ui.hud.classList.remove('hidden');
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  const menuController = createMenuController({
    ui,
    profile,
    state,
    helpers: {
      getUpgradeLevel,
      getUpgradeCost,
      isLevelUnlocked: profileApi.isLevelUnlocked,
      getLevelKey: profileApi.getLevelKey,
    },
    actions: {
      selectMission(world, level) {
        profileApi.selectMission(world, level);
        menuController.renderMenu();
      },
      purchaseUpgrade,
      getSelectedMission: () => profileApi.getSelectedMission(),
      getUnlockedLevelCount: () => profileApi.getUnlockedLevelCount(),
      getSelectedCharacterName: () => getCharacterDef().name,
      refreshCharacterSelection: () => characterSelection.refresh(),
      getNextMission,
    },
  });

  function updatePlayer(dt) {
    temp.vec2A.set(
      (state.input.keys.has('KeyA') ? 1 : 0) - (state.input.keys.has('KeyD') ? 1 : 0),
      (state.input.keys.has('KeyS') ? 1 : 0) - (state.input.keys.has('KeyW') ? 1 : 0),
    );
    if (temp.vec2A.lengthSq() > 0) temp.vec2A.normalize();
    const usingTouchMove = state.input.move.lengthSq() > 0;
    const finalMove = usingTouchMove ? state.input.move : temp.vec2A;
    const moveStrength = THREE.MathUtils.clamp(finalMove.length(), 0, 1);
    const inputZone = inputSystem.classifyInputZone(moveStrength);

    if (moveStrength > gameplayConfig.controls.rotationDeadZone) state.yaw = Math.atan2(finalMove.x, finalMove.y);

    let moveSpeed = 0;
    let moveBlend = 0;
    if (usingTouchMove) {
      const moveRange = Math.max(0.001, 1 - gameplayConfig.controls.moveStartRadius);
      const normalized = THREE.MathUtils.clamp((moveStrength - gameplayConfig.controls.moveStartRadius) / moveRange, 0, 1);
      const curved = Math.pow(normalized, gameplayConfig.controls.speedExponent);
      moveSpeed = THREE.MathUtils.lerp(gameplayConfig.controls.minMoveSpeed, gameplayConfig.controls.maxMoveSpeed, curved) * state.moveSpeedMultiplier;
      if (inputZone === 'rotation' || normalized <= 0) {
        moveSpeed = 0;
      } else if (inputZone === 'fine') {
        moveSpeed *= 0.7;
        moveBlend = THREE.MathUtils.clamp(curved * 0.8, 0.08, 0.45);
      } else if (inputZone === 'standard') {
        moveBlend = THREE.MathUtils.clamp(curved * 1.05, 0.35, 0.8);
      } else {
        moveSpeed *= 1.06;
        moveBlend = THREE.MathUtils.clamp(curved * 1.2, 0.72, 1);
      }
    } else {
      const keyMoving = temp.vec2A.lengthSq() > 0;
      moveSpeed = keyMoving ? gameplayConfig.controls.maxMoveSpeed * 0.88 * state.moveSpeedMultiplier : 0;
      moveBlend = keyMoving ? 0.9 : 0;
    }

    if (moveSpeed > 0 && moveStrength > 0) {
      temp.vec3A.set(finalMove.x, 0, finalMove.y).normalize();
      playerRigHolder.position.addScaledVector(temp.vec3A, moveSpeed * dt);
    }

    collision.resolveWorldCollision(playerRigHolder.position, state.world.playerCollisionRadius);
    const halfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.8;
    playerRigHolder.position.x = THREE.MathUtils.clamp(playerRigHolder.position.x, -halfArena, halfArena);
    playerRigHolder.position.z = THREE.MathUtils.clamp(playerRigHolder.position.z, -halfArena, halfArena);
    playerRigHolder.rotation.y = state.yaw;
    temp.player.position.copy(playerRigHolder.position);
    characterModule.animateCharacterRig(playerRig, moveBlend, clock.elapsedTime);
  }

  function updatePickups(dt) {
    state.pickupSpawnTimer -= dt;
    if (state.pickupSpawnTimer <= 0 && state.entities.powerPickups.length < 4) {
      spawnPowerPickup();
      state.pickupSpawnTimer = state.pickupSpawnInterval * (0.75 + Math.random() * 0.45);
    }

    for (let i = state.entities.powerPickups.length - 1; i >= 0; i--) {
      const pickup = state.entities.powerPickups[i];
      pickup.pulse += dt * 2.4;
      pickup.mesh.position.y = 0.86 + Math.sin(pickup.pulse) * 0.12;
      pickup.mesh.rotation.y += dt * 1.8;
      const ring = pickup.mesh.userData.ring;
      if (ring) ring.scale.setScalar(1 + Math.sin(pickup.pulse * 1.2) * 0.08);
      if (pickup.mesh.position.distanceTo(playerRigHolder.position) <= pickup.radius) {
        combat.applyRunPower(pickup.type, POWER_UP_DEFS);
        scene.remove(pickup.mesh);
        state.entities.powerPickups.splice(i, 1);
      }
    }

    for (let i = state.ui.pickupNotices.length - 1; i >= 0; i--) {
      state.ui.pickupNotices[i].life -= dt;
      if (state.ui.pickupNotices[i].life <= 0) state.ui.pickupNotices.splice(i, 1);
    }
  }

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);
    const elapsed = clock.elapsedTime;

    vfx.update(dt);
    performance.update(dt, vfx.VFX.maxParticles);
    performance.resetFrameBudgets();

    if (state.running) {
      updatePlayer(dt);
      state.elapsedRunTime += dt;
      state.lastProfileSaveAt += dt;
      state.fireCooldown -= dt;
      if (state.input.shooting) projectileSystem.shoot();
      updatePickups(dt);
      enemySystem.update(dt, elapsed, state.runPowers);
      projectileSystem.update(dt, { damageEnemy: combat.damageEnemy, applyProjectilePower: combat.applyProjectilePower });

      if (state.entities.enemies.length === 0) {
        state.wavePause -= dt;
        if (state.wavePause <= 0) {
          if (state.waveInLevel >= WAVES_PER_LEVEL) finishRun(true);
          else {
            state.waveInLevel += 1;
            state.wavePause = 1;
            spawnWave();
          }
        }
      }

      if (state.lastProfileSaveAt >= 2) {
        profile.stats.timePlayed += state.lastProfileSaveAt;
        state.savedRunTime += state.lastProfileSaveAt;
        state.lastProfileSaveAt = 0;
        profileApi.save();
      }

      updateHUD();
    } else if (playerRig) {
      characterModule.animateCharacterRig(playerRig, 0, elapsed);
    }

    characterSelection.renderPreviews(elapsed);
    inputSystem.updateStick(ui.moveStick, ui.moveKnob, state.input.moveTouch);
    performance.renderDebug(vfx.VFX.maxParticles);

    temp.vec3A.set(0, gameplayConfig.camera.height, gameplayConfig.camera.forwardOffset);
    camera.position.copy(playerRigHolder.position).add(temp.vec3A);
    camera.lookAt(playerRigHolder.position.x, playerRigHolder.position.y + gameplayConfig.camera.lookAtHeight, playerRigHolder.position.z);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  if (state.performance.debugEnabled) {
    window.__skyBlasterDebug = {
      snapshot() {
        return {
          bullets: state.entities.bullets.length,
          enemies: state.entities.enemies.length,
          vfx: state.entities.vfxParticles.length,
          damageNumbers: state.entities.damageNumbers.length,
          chainBeams: state.entities.chainBeams.length,
          fps: state.performance.fps,
          frameMs: state.performance.frameMs,
          qualityLevel: state.performance.qualityLevel,
          activeEnemyEffects: state.performance.activeEnemyEffects,
        };
      },
      grantPowerUps(stacks = 3) {
        for (const key of ['fire', 'ice', 'lightning', 'poison', 'rockets', 'doubler']) state.runPowers.stacks[key] = Math.max(state.runPowers.stacks[key], stacks);
        state.projectileCount = projectileSystem.getSafeProjectileCountFromDoublers(state.runPowers.stacks.doubler);
        state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + state.runPowers.stacks.movementSpeed * 0.05;
        updateHUD();
        return this.snapshot();
      },
      spawnEnemyRing(count = 24, type = 'runner', radius = 18) {
        for (let i = 0; i < count; i++) enemySystem.spawnEnemy(type, (i / Math.max(1, count)) * Math.PI * 2, radius + (Math.random() - 0.5) * 4, Math.max(state.wave, 4));
        return this.snapshot();
      },
      setPlayerPose(x = 0, z = 0, yaw = state.yaw) {
        playerRigHolder.position.set(x, playerRigHolder.position.y, z);
        state.yaw = yaw;
        playerRigHolder.rotation.y = yaw;
        return this.snapshot();
      },
      setShooting(active = false) {
        state.input.shooting = Boolean(active);
        return this.snapshot();
      },
    };
  }

  window.addEventListener('load', () => registerServiceWorker());
  ui.menuTabs.forEach((tab) => tab.addEventListener('click', () => menuController.setMenuScreen(tab.dataset.screen)));
  ui.startBtn.addEventListener('click', () => startGame());
  ui.quickWorldsBtn.addEventListener('click', () => menuController.openMenu('worlds'));
  ui.startSelectedLevelBtn.addEventListener('click', () => {
    const mission = profileApi.getSelectedMission();
    startGame(mission.world, mission.level);
  });
  ui.restartBtn.addEventListener('click', () => startGame(state.worldIndex, state.levelIndex));
  ui.menuBtn.addEventListener('click', () => menuController.openMenu('home'));
  ui.nextLevelBtn.addEventListener('click', () => {
    const nextMission = getNextMission(state.worldIndex, state.levelIndex);
    if (!nextMission) {
      menuController.openMenu('worlds');
      return;
    }
    startGame(nextMission.world, nextMission.level);
  });

  menuController.renderMenu();
  updateHUD();
  requestAnimationFrame(animate);
}
