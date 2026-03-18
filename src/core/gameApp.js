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
  WAVE_INTERVAL_SECONDS,
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
import { createSynergySystem } from '../systems/synergySystem.js';
import { createVfxSystem } from '../systems/vfxSystem.js';
import { registerServiceWorker } from '../pwa/register-sw.js';

export function startGameApp() {
  const ui = getUI();
  const REQUIRED_UI_KEYS = [
    'canvas', 'hud', 'controls', 'menu', 'gameOver', 'pauseOverlay', 'startBtn', 'quickWorldsBtn', 'startSelectedLevelBtn',
    'restartBtn', 'menuBtn', 'nextLevelBtn', 'pauseBtn', 'pauseResumeBtn', 'pauseRestartBtn', 'pauseMenuBtn', 'pauseDescription',
    'wave', 'score', 'hpBar', 'hpValue', 'shieldValue', 'activePowers', 'pickupFeed', 'missionLabel', 'creditsValue', 'menuCredits', 'menuHighestWave', 'selectedMissionLabel',
    'selectedMissionStatus', 'selectedCharacterLabel', 'unlockedSummary', 'worldGrid', 'levelGrid',
    'upgradeGroups', 'upgradeCredits', 'statsGrid', 'finalWave', 'finalScore', 'finalCredits', 'resultEyebrow',
    'resultTitle', 'resultSummary', 'moveZone', 'moveStick', 'moveKnob', 'characterGrid',
  ];
  const missingUi = REQUIRED_UI_KEYS.filter((key) => !ui[key]);
  const startErrorEl = document.createElement('div');
  startErrorEl.id = 'runtimeErrorBanner';
  startErrorEl.className = 'hidden';
  startErrorEl.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:60;padding:12px 14px;border:1px solid rgba(255,122,122,0.55);border-radius:12px;background:rgba(42,10,16,0.94);color:#ffe6e6;font:13px/1.45 Inter,Arial,sans-serif;white-space:pre-wrap;box-shadow:0 10px 30px rgba(0,0,0,0.28)';
  document.body.appendChild(startErrorEl);

  function formatErrorDetails(err) {
    if (!err) return 'Unknown error';
    if (err instanceof Error) return err.stack || `${err.name}: ${err.message}`;
    return typeof err === 'string' ? err : JSON.stringify(err, null, 2);
  }

  function reportRuntimeError(context, err, extra = null) {
    const detailText = extra ? `\nContext: ${extra}` : '';
    const formatted = `[Sky Blaster] ${context}${detailText}\n${formatErrorDetails(err)}`;
    console.error(formatted);
    startErrorEl.textContent = `Start-/Laufzeitfehler: ${context}\n${err instanceof Error ? err.message : String(err)}${extra ? `\n${extra}` : ''}`;
    startErrorEl.classList.remove('hidden');
  }

  function clearRuntimeError() {
    startErrorEl.textContent = '';
    startErrorEl.classList.add('hidden');
  }

  if (missingUi.length) {
    reportRuntimeError('UI initialisation', new Error(`Missing DOM nodes: ${missingUi.join(', ')}`));
    throw new Error(`Missing required UI nodes: ${missingUi.join(', ')}`);
  }

  const profile = loadProfile();
  const profileApi = createProfileApi(profile);
  const initialCharacterId = loadSelectedCharacterId();
  let currentCharacterId = initialCharacterId;
  const characterModule = createCharacterModule(THREE, CHARACTER_DEFS);

  const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9d7d7);
  scene.fog = new THREE.Fog(0xc9d7d7, 60, 162);

  const camera = new THREE.PerspectiveCamera(gameplayConfig.camera.fov, window.innerWidth / window.innerHeight, 0.1, 220);
  const clock = new THREE.Clock();
  const temp = {
    vec3A: new THREE.Vector3(),
    vec3B: new THREE.Vector3(),
    vec3C: new THREE.Vector3(),
    vec3D: new THREE.Vector3(),
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

  const hemi = new THREE.HemisphereLight(0xeaf3ff, 0x8b7a65, 1.05);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff0d2, 2.1);
  keyLight.position.set(28, 36, 16);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1536, 1536);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 130;
  keyLight.shadow.camera.left = -58;
  keyLight.shadow.camera.right = 58;
  keyLight.shadow.camera.top = 58;
  keyLight.shadow.camera.bottom = -58;
  keyLight.shadow.bias = -0.00018;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc6dcff, 0.62);
  fillLight.position.set(-22, 21, -24);
  scene.add(fillLight);

  const warmBounceLight = new THREE.DirectionalLight(0xf1c89d, 0.28);
  warmBounceLight.position.set(10, 9, -30);
  scene.add(warmBounceLight);

  const arenaRoot = new THREE.Group();
  const arenaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(gameplayConfig.arena.size * 0.72, gameplayConfig.arena.size * 0.7, 0.9, 64),
    new THREE.MeshStandardMaterial({ color: 0x8a816f, roughness: 1, metalness: 0.01 }),
  );
  arenaBase.position.y = -0.46;
  arenaBase.receiveShadow = true;
  arenaRoot.add(arenaBase);

  const arenaUnderside = new THREE.Mesh(
    new THREE.CylinderGeometry(gameplayConfig.arena.size * 0.78, gameplayConfig.arena.size * 0.75, 0.55, 64),
    new THREE.MeshStandardMaterial({ color: 0x645b4d, roughness: 1, metalness: 0.01, transparent: true, opacity: 0.92 }),
  );
  arenaUnderside.position.y = -0.96;
  arenaUnderside.receiveShadow = true;
  arenaRoot.add(arenaUnderside);

  const arena = new THREE.Mesh(
    new THREE.PlaneGeometry(gameplayConfig.arena.size, gameplayConfig.arena.size, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x66675f, metalness: 0.02, roughness: 0.99 }),
  );
  arena.rotation.x = -Math.PI / 2;
  arena.receiveShadow = true;
  arenaRoot.add(arena);

  const skirtRing = new THREE.Mesh(
    new THREE.CircleGeometry(gameplayConfig.arena.size * 0.72, 72),
    new THREE.MeshBasicMaterial({ color: 0x746c5e, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  skirtRing.rotation.x = -Math.PI / 2;
  skirtRing.position.y = -0.03;
  arenaRoot.add(skirtRing);

  scene.add(arenaRoot);

  const mapRoot = new THREE.Group();
  const collisionDebugRoot = new THREE.Group();
  const playerRigHolder = new THREE.Group();
  scene.add(mapRoot, collisionDebugRoot, playerRigHolder);

  const state = createGameState(profile, {
    getPlayerMaxHp,
    getBaseMoveSpeedMultiplier,
  });
  state.selection.characterId = currentCharacterId;
  playerRigHolder.position.set(0, state.world.playerGroundY, 0);

  const collision = createCollisionSystem({
    THREE,
    gameplayConfig,
    state,
    getPlayerPosition: () => playerRigHolder.position,
    SAFETY_LIMITS,
    debugRoot: collisionDebugRoot,
  });
  createWorldMap({ THREE, gameplayConfig, mapRoot, collision });

  const performance = createPerformanceSystem({
    THREE,
    state,
    ui,
    SAFETY_LIMITS,
    getCounts: () => ({
      bullets: state.entities.bullets.length,
      enemyProjectiles: state.entities.enemyProjectiles.length,
      enemies: state.entities.enemies.length,
      vfx: state.entities.vfxParticles.length,
      damageNumbers: state.entities.damageNumbers.length,
      chainBeams: state.entities.chainBeams.length,
    }),
    getExtraDebugLines: () => collision.getWorldDebugLines(),
  });

  const vfx = createVfxSystem({
    THREE,
    scene,
    state,
    performance,
    SAFETY_LIMITS,
    temp,
    sceneResources,
  });

  const synergySystem = createSynergySystem({
    state,
    runPowers: state.runPowers,
    collision,
    performance,
    vfx,
    sceneResources,
  });
  synergySystem.applyThresholdUnlocks();

  let finishRun = () => {};
  const combat = createCombatSystem({
    state,
    profile,
    performance,
    collision,
    vfx,
    runPowers: state.runPowers,
    synergySystem,
    getUpgradeLevel,
    getShieldPickupCapacity,
    getBaseMoveSpeedMultiplier,
    getPlayerMaxHp,
    getSafeProjectileCountFromDoublers: (stacks) => projectileSystem.getSafeProjectileCountFromDoublers(stacks),
    getCharacterCombatProfile,
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
    SAFETY_LIMITS,
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
    getCharacterCombatProfile,
    getProjectileEffects: combat.getProjectileEffects,
    getWeaponSynergyProfile: synergySystem.getWeaponSynergyProfile,
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
  function getCharacterDef(characterId = currentCharacterId) {
    return characterModule.getCharacterDef(characterId, currentCharacterId);
  }

  function getCharacterCombatProfile(characterId = currentCharacterId) {
    return getCharacterDef(characterId).combatProfile;
  }

  function setPlayerCharacter(characterId) {
    const characterDef = getCharacterDef(characterId);
    if (!characterDef) {
      reportRuntimeError('Character selection', new Error(`Unknown character: ${characterId}`));
      return;
    }
    currentCharacterId = characterDef.id;
    state.selection.characterId = characterDef.id;
    saveSelectedCharacterId(characterDef.id);
    if (playerRig) playerRigHolder.remove(playerRig.root);
    playerRig = characterModule.createCharacterRig(characterDef);
    playerRigHolder.add(playerRig.root);
    state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + state.runPowers.stacks.movementSpeed * 0.05;
    state.weaponState.burstShotsRemaining = 0;
    state.weaponState.burstTimer = 0;
    state.runPowers.lastWeaponTag = characterDef.combatProfile.weaponTag;
    synergySystem.rebuildActiveSynergies(characterDef.combatProfile);
    ui.selectedCharacterLabel.textContent = characterDef.name;
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
    return (1 + getUpgradeLevel('baseDamage') * 0.22) * getCharacterCombatProfile().baseDamageModifier;
  }

  function getAttackCooldown() {
    const combatProfile = getCharacterCombatProfile();
    const baseCooldown = combatProfile.baseAttackCooldown || 0.18;
    const fireRateModifier = combatProfile.fireRateModifier || 1;
    return Math.max(0.055, baseCooldown * fireRateModifier * Math.pow(0.94, getUpgradeLevel('attackSpeed')));
  }

  function getBaseMoveSpeedMultiplier() {
    return (1 + getUpgradeLevel('movementSpeed') * 0.05) * getCharacterCombatProfile().baseMoveSpeedModifier;
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

  function getPauseDescription(reason = state.pauseReason) {
    if (reason === 'hidden') return 'Automatisch pausiert, weil die App im Hintergrund oder ausgeblendet war.';
    if (reason === 'pagehide') return 'Automatisch pausiert, weil die Seite verlassen oder eingefroren wurde.';
    if (reason === 'blur') return 'Automatisch pausiert, weil das Fenster den Fokus verloren hat.';
    return 'Das Spiel bleibt stehen, bis du fortsetzt.';
  }

  function formatPowerBadge(def, count) {
    const colorHex = `#${def.color.toString(16).padStart(6, '0')}`;
    return `
      <span class="power-badge__icon" style="background:${colorHex}" title="${def.label} x${count}">${def.symbol || def.icon}</span>
      <span class="power-badge__meta">
        <span class="power-badge__name">${def.shortLabel || def.label}</span>
      </span>
      <span class="power-badge__count">${count}</span>
    `;
  }

  function formatPickupNotice(notice) {
    const def = POWER_UP_DEFS[notice.type];
    const colorHex = def ? `#${def.color.toString(16).padStart(6, '0')}` : '#ffffff';
    const icon = notice.category === 'synergy' || notice.category === 'reaction' || notice.type === 'synergy' ? '∞' : (def?.symbol || def?.icon || '+');
    return `
      <span class="pickup-line__icon" style="background:${colorHex}">${icon}</span>
      <span class="pickup-line__meta">
        <span class="pickup-line__name">${notice.text}</span>
      </span>
    `;
  }

  function createPickupTokenMaterial(def) {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: def.color,
      emissiveIntensity: 0.52,
      roughness: 0.22,
      metalness: 0.32,
    });
  }

  function createPickupToken(def) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const colorHex = `#${def.color.toString(16).padStart(6, '0')}`;
    const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 56);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.38, colorHex);
    gradient.addColorStop(1, 'rgba(6,10,18,0.08)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.symbol || def.icon || '?', 64, 66);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.78, 0.78, 0.78);
    return sprite;
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
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.07, 12, 28),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.5, roughness: 0.28, metalness: 0.32 }),
    );
    halo.rotation.x = Math.PI / 2;
    const shell = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      createPickupTokenMaterial(def),
    );
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.92, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: def.color, emissiveIntensity: 0.26, roughness: 0.18, metalness: 0.28 }),
    );
    beacon.position.y = -0.06;
    const token = createPickupToken(def);
    if (token) token.position.y = 0.02;
    mesh.add(halo, shell, beacon);
    if (token) mesh.add(token);
    mesh.userData.halo = halo;
    mesh.userData.shell = shell;
    mesh.userData.token = token;
    mesh.position.copy(position).setY(0.92);
    scene.add(mesh);
    state.entities.powerPickups.push({ mesh, type, pulse: Math.random() * Math.PI * 2, radius: 0.98 });
  }

  function randomPowerKey() {
    const keys = Object.keys(POWER_UP_DEFS);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function disposePickupMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.traverse((child) => {
      if (child.material?.map) child.material.map.dispose?.();
      child.material?.dispose?.();
    });
  }

  function removeAllPickups() {
    state.entities.powerPickups.forEach((pickup) => disposePickupMesh(pickup.mesh));
    state.entities.powerPickups.length = 0;
  }

  function updateHUD() {
    const hpPercent = THREE.MathUtils.clamp((Math.max(0, state.hp) / getPlayerMaxHp()) * 100, 0, 100);
    const roundedHp = Math.max(0, Math.round(state.hp));
    const roundedShield = Math.max(0, Math.round(state.runPowers.shieldHp));
    const activePowerEntries = Object.entries(state.runPowers.stacks)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => [POWER_UP_DEFS[key], count, false])
      .filter(([def]) => !!def);
    const activeSynergyEntries = (state.runPowers.activeSynergies || [])
      .map((entry) => [
        {
          label: entry.hudLabel,
          shortLabel: entry.hudLabel,
          symbol: '∞',
          color: 0xffdc73,
        },
        entry.priority || 1,
        true,
      ]);

    ui.wave.textContent = `${state.waveInLevel}/${WAVES_PER_LEVEL}`;
    ui.score.textContent = String(state.score);
    ui.hpValue.textContent = String(roundedHp);
    ui.hpBar.style.width = `${hpPercent}%`;
    ui.shieldValue.textContent = String(roundedShield);
    ui.missionLabel.textContent = getMissionLabel();
    ui.creditsValue.textContent = String(profile.credits + state.runCredits);
    ui.pauseBtn.setAttribute('aria-label', state.paused ? 'Spiel ist pausiert' : 'Spiel pausieren');
    ui.pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');

    ui.activePowers.innerHTML = '';
    for (const [def, count, isSynergy] of [...activePowerEntries, ...activeSynergyEntries]) {
      const badge = document.createElement('div');
      badge.className = 'power-badge';
      badge.innerHTML = formatPowerBadge(def, count);
      if (isSynergy) badge.classList.add('power-badge--synergy');
      ui.activePowers.appendChild(badge);
    }
    if (!ui.activePowers.children.length) {
      const emptyBadge = document.createElement('div');
      emptyBadge.className = 'power-badge';
      emptyBadge.innerHTML = '<span class="power-badge__icon" style="background:#2a3044" title="Keine aktiven Power-ups">+</span><span class="power-badge__count">0</span>';
      ui.activePowers.appendChild(emptyBadge);
    }

    ui.pickupFeed.innerHTML = '';
    for (const notice of state.ui.pickupNotices.slice(0, 3)) {
      const el = document.createElement('div');
      el.className = 'pickup-line';
      el.style.opacity = `${Math.max(0, notice.life / notice.maxLife)}`;
      el.innerHTML = formatPickupNotice(notice);
      ui.pickupFeed.appendChild(el);
    }
  }

  function syncPauseOverlay() {
    ui.pauseDescription.textContent = getPauseDescription();
    ui.pauseOverlay.classList.toggle('hidden', !state.paused);
  }

  function pauseRun(reason = 'manual') {
    if (!state.running || state.paused) return false;
    state.paused = true;
    state.pauseReason = reason;
    resetTransientInputState();
    ui.controls.classList.add('hidden');
    syncPauseOverlay();
    updateHUD();
    return true;
  }

  function resumeRun() {
    if (!state.running || !state.paused) return false;
    state.paused = false;
    state.pauseReason = null;
    resetTransientInputState();
    ui.pauseOverlay.classList.add('hidden');
    ui.controls.classList.remove('hidden');
    updateHUD();
    return true;
  }

  function abandonRunToMenu(screenId = 'home') {
    state.running = false;
    state.paused = false;
    state.pauseReason = null;
    resetTransientInputState();
    clearRunObjects();
    combat.resetRunPowerUps();
    ui.pauseOverlay.classList.add('hidden');
    ui.controls.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.gameOver.classList.add('hidden');
    menuController.openMenu(screenId);
  }

  function autoPauseGame(reason) {
    if (!state.running || state.paused) return;
    pauseRun(reason);
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
    state.paused = false;
    state.pauseReason = null;
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
    ui.pauseOverlay.classList.add('hidden');
    menuController.showRunResult(success);
    ui.gameOver.classList.remove('hidden');
  };

  function resetTransientInputState() {
    state.input.shooting = false;
    state.input.moveTouch = null;
    state.movement.velocityX = 0;
    state.movement.velocityZ = 0;
    state.weaponState.burstShotsRemaining = 0;
    state.weaponState.burstTimer = 0;
    if (state.input.move) state.input.move.set(0, 0);
    if (state.input.keys) state.input.keys.clear();
  }

  function validateMission(world, level) {
    if (!Number.isInteger(world) || !Number.isInteger(level)) {
      throw new Error(`Invalid mission selection: world=${world}, level=${level}`);
    }
    if (world < 1 || world > WORLDS_COUNT || level < 1 || level > LEVELS_PER_WORLD) {
      throw new Error(`Mission out of range: world=${world}, level=${level}`);
    }
    if (!profileApi.isLevelUnlocked(world, level)) {
      throw new Error(`Mission is locked: world=${world}, level=${level}`);
    }
  }

  function handleRunCrash(context, err, extra = null) {
    state.running = false;
    state.paused = false;
    state.pauseReason = null;
    resetTransientInputState();
    ui.controls.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.pauseOverlay.classList.add('hidden');
    ui.gameOver.classList.add('hidden');
    ui.menu.classList.remove('hidden');
    menuController.setMenuScreen('home');
    menuController.renderMenu();
    reportRuntimeError(context, err, extra);
  }

  function startGame(world = profile.progression.selectedWorld, level = profile.progression.selectedLevel) {
    try {
      clearRuntimeError();
      validateMission(world, level);
      const characterDef = getCharacterDef(state.selection.characterId);
      if (!characterDef) throw new Error('No character definition available for run start.');
      if (!playerRig) setPlayerCharacter(characterDef.id);
      if (!playerRig) throw new Error('Player rig could not be created.');

      profileApi.selectMission(world, level);
      profile.stats.totalRuns += 1;
      profileApi.save();

      state.running = true;
      state.paused = false;
      state.pauseReason = null;
      state.worldIndex = world;
      state.levelIndex = level;
      state.hp = getPlayerMaxHp();
      state.score = 0;
      state.waveInLevel = 1;
      state.wave = getDifficultyIndex(world, level, 1);
      state.spawnLeft = 0;
      state.fireCooldown = 0;
      state.waveTimer = WAVE_INTERVAL_SECONDS;
      state.totalKills = 0;
      state.waveKills = 0;
      state.pickupSpawnTimer = 3.5;
      state.runCredits = 0;
      state.damageDealt = 0;
      state.elapsedRunTime = 0;
      state.savedRunTime = 0;
      state.lastProfileSaveAt = 0;
      state.pendingResult = null;
      state.weaponState.burstShotsRemaining = 0;
      state.weaponState.burstTimer = 0;
      state.movement.velocityX = 0;
      state.movement.velocityZ = 0;
      playerRigHolder.position.set(0, 0.2, 0);
      resetTransientInputState();
      clearRunObjects();
      combat.resetRunPowerUps();
      synergySystem.applyThresholdUnlocks();
      synergySystem.rebuildActiveSynergies(getCharacterCombatProfile());
      spawnWave();
      if (state.entities.enemies.length === 0) throw new Error('Wave spawn returned no enemies.');
      updateHUD();
      ui.menu.classList.add('hidden');
      ui.gameOver.classList.add('hidden');
      ui.pauseOverlay.classList.add('hidden');
      ui.controls.classList.remove('hidden');
      ui.hud.classList.remove('hidden');
    } catch (err) {
      handleRunCrash('Run start failed', err, `world=${world}, level=${level}, character=${state.selection.characterId}`);
    }
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
    const characterDef = getCharacterDef();
    const locomotion = characterDef.locomotionProfile || {};
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

    let targetSpeed = 0;
    let targetBlend = 0;
    if (usingTouchMove) {
      const moveRange = Math.max(0.001, 1 - gameplayConfig.controls.moveStartRadius);
      const normalized = THREE.MathUtils.clamp((moveStrength - gameplayConfig.controls.moveStartRadius) / moveRange, 0, 1);
      const curved = Math.pow(normalized, gameplayConfig.controls.speedExponent);
      targetSpeed = THREE.MathUtils.lerp(gameplayConfig.controls.minMoveSpeed, gameplayConfig.controls.maxMoveSpeed, curved) * state.moveSpeedMultiplier;
      if (inputZone === 'rotation' || normalized <= 0) {
        targetSpeed = 0;
      } else if (inputZone === 'fine') {
        targetSpeed *= 0.68;
        targetBlend = THREE.MathUtils.clamp(curved * 0.78, 0.08, 0.45);
      } else if (inputZone === 'standard') {
        targetBlend = THREE.MathUtils.clamp(curved * 1.05, 0.35, 0.84);
      } else {
        targetSpeed *= 1.06;
        targetBlend = THREE.MathUtils.clamp(curved * 1.2, 0.74, 1);
      }
    } else {
      const keyMoving = temp.vec2A.lengthSq() > 0;
      targetSpeed = keyMoving ? gameplayConfig.controls.maxMoveSpeed * 0.88 * state.moveSpeedMultiplier : 0;
      targetBlend = keyMoving ? 0.92 : 0;
    }

    let targetVelocityX = 0;
    let targetVelocityZ = 0;
    if (targetSpeed > 0 && moveStrength > 0) {
      temp.vec3A.set(finalMove.x, 0, finalMove.y).normalize();
      targetVelocityX = temp.vec3A.x * targetSpeed;
      targetVelocityZ = temp.vec3A.z * targetSpeed;
    }

    const response = targetSpeed > 0 ? (locomotion.acceleration || 14) : (locomotion.deceleration || 16);
    const damping = 1 - Math.exp(-response * dt);
    state.movement.velocityX = THREE.MathUtils.lerp(state.movement.velocityX, targetVelocityX, damping);
    state.movement.velocityZ = THREE.MathUtils.lerp(state.movement.velocityZ, targetVelocityZ, damping);
    playerRigHolder.position.x += state.movement.velocityX * dt;
    playerRigHolder.position.z += state.movement.velocityZ * dt;

    collision.resolveWorldCollision(playerRigHolder.position, state.world.playerCollisionRadius);
    playerRigHolder.position.y = state.world.playerGroundY;
    const halfArena = gameplayConfig.arena.size * 0.5 - gameplayConfig.arena.padding - 1.8;
    playerRigHolder.position.x = THREE.MathUtils.clamp(playerRigHolder.position.x, -halfArena, halfArena);
    playerRigHolder.position.z = THREE.MathUtils.clamp(playerRigHolder.position.z, -halfArena, halfArena);
    playerRigHolder.rotation.y = state.yaw;
    temp.player.position.copy(playerRigHolder.position);

    const velocityMagnitude = Math.hypot(state.movement.velocityX, state.movement.velocityZ);
    const normalizedBlend = targetSpeed > 0 ? THREE.MathUtils.clamp(velocityMagnitude / Math.max(0.001, gameplayConfig.controls.maxMoveSpeed * state.moveSpeedMultiplier), 0, 1) : 0;
    const moveBlend = Math.max(targetBlend * 0.45, normalizedBlend);
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
      pickup.mesh.position.y = 0.9 + Math.sin(pickup.pulse) * 0.12;
      pickup.mesh.rotation.y += dt * 1.4;
      const halo = pickup.mesh.userData.halo;
      const shell = pickup.mesh.userData.shell;
      const token = pickup.mesh.userData.token;
      if (halo) halo.scale.setScalar(1 + Math.sin(pickup.pulse * 1.2) * 0.1);
      if (shell) shell.rotation.y -= dt * 0.8;
      if (token) token.material.opacity = 0.82 + Math.sin(pickup.pulse * 1.8) * 0.12;
      if (pickup.mesh.position.distanceTo(playerRigHolder.position) <= pickup.radius) {
        combat.applyRunPower(pickup.type, POWER_UP_DEFS);
        disposePickupMesh(pickup.mesh);
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
    const simulationActive = state.running && !state.paused;

    if (simulationActive) vfx.update(dt);
    performance.update(simulationActive ? dt : 0, vfx.VFX.maxParticles);
    performance.resetFrameBudgets();

    if (simulationActive) {
      try {
        updatePlayer(dt);
        state.elapsedRunTime += dt;
        state.lastProfileSaveAt += dt;
        state.fireCooldown -= dt;
        state.weaponState.burstTimer = Math.max(0, state.weaponState.burstTimer - dt);
        projectileSystem.shoot();
        updatePickups(dt);
        enemySystem.update(dt, elapsed, state.runPowers);
        projectileSystem.update(dt, { damageEnemy: combat.damageEnemy, applyProjectilePower: combat.applyProjectilePower });

        state.waveTimer -= dt;
        if (state.waveTimer <= 0) {
          if (state.waveInLevel >= WAVES_PER_LEVEL) finishRun(true);
          else {
            state.waveInLevel += 1;
            state.waveTimer = WAVE_INTERVAL_SECONDS;
            spawnWave();
          }
        }

        if (state.lastProfileSaveAt >= 2) {
          profile.stats.timePlayed += state.lastProfileSaveAt;
          state.savedRunTime += state.lastProfileSaveAt;
          state.lastProfileSaveAt = 0;
          profileApi.save();
        }

        updateHUD();
      } catch (err) {
        handleRunCrash('Game loop failed', err, `wave=${state.wave}, enemies=${state.entities.enemies.length}, bullets=${state.entities.bullets.length}`);
      }
    } else if (playerRig && !state.paused) {
      characterModule.animateCharacterRig(playerRig, 0, elapsed);
    }

    characterSelection.renderPreviews(elapsed);
    inputSystem.updateStick(ui.moveStick, ui.moveKnob, state.input.moveTouch);
    collision.syncDebugVisualization(state.performance.debugEnabled);
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
          enemyProjectiles: state.entities.enemyProjectiles.length,
          enemies: state.entities.enemies.length,
          vfx: state.entities.vfxParticles.length,
          damageNumbers: state.entities.damageNumbers.length,
          chainBeams: state.entities.chainBeams.length,
          fps: state.performance.fps,
          frameMs: state.performance.frameMs,
          qualityLevel: state.performance.qualityLevel,
          activeEnemyEffects: state.performance.activeEnemyEffects,
          worldAudit: collision.getWorldAuditSnapshot(),
        };
      },
      grantPowerUps(stacks = 3) {
        for (const key of ['fire', 'ice', 'lightning', 'poison', 'rockets', 'doubler']) state.runPowers.stacks[key] = Math.max(state.runPowers.stacks[key], stacks);
        state.projectileCount = projectileSystem.getSafeProjectileCountFromDoublers(state.runPowers.stacks.doubler);
        state.moveSpeedMultiplier = getBaseMoveSpeedMultiplier() + state.runPowers.stacks.movementSpeed * 0.05;
        synergySystem.applyThresholdUnlocks();
        synergySystem.rebuildActiveSynergies(getCharacterCombatProfile());
        updateHUD();
        return this.snapshot();
      },
      spawnEnemyRing(count = 24, type = 'runner', radius = 18) {
        for (let i = 0; i < count; i++) enemySystem.spawnEnemy(type, (i / Math.max(1, count)) * Math.PI * 2, radius + (Math.random() - 0.5) * 4, Math.max(state.wave, 4));
        return this.snapshot();
      },
      setPlayerPose(x = 0, z = 0, yaw = state.yaw) {
        playerRigHolder.position.set(x, state.world.playerGroundY, z);
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

  const registerSwOnReady = () => registerServiceWorker().catch((err) => reportRuntimeError('Service worker registration', err));
  if (document.readyState === 'complete') registerSwOnReady();
  else window.addEventListener('load', registerSwOnReady, { once: true });
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
  ui.pauseBtn.addEventListener('click', () => pauseRun('manual'));
  ui.pauseResumeBtn.addEventListener('click', () => resumeRun());
  ui.pauseRestartBtn.addEventListener('click', () => startGame(state.worldIndex, state.levelIndex));
  ui.pauseMenuBtn.addEventListener('click', () => abandonRunToMenu('home'));

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' || !state.running) return;
    event.preventDefault();
    if (state.paused) resumeRun();
    else pauseRun('manual');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoPauseGame('hidden');
  });
  window.addEventListener('pagehide', () => autoPauseGame('pagehide'));
  window.addEventListener('blur', () => autoPauseGame('blur'));

  menuController.renderMenu();
  updateHUD();
  requestAnimationFrame(animate);
}
