import { LEVELS_PER_WORLD, STAT_DEFS, UPGRADE_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';

export function createMenuController({ ui, profile, state, helpers, actions }) {
  function setMenuScreen(screenId) {
    state.ui.activeMenuScreen = screenId;
    ui.menuTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.screen === screenId));
    ui.menuScreens.forEach((screen) => screen.classList.toggle('hidden', screen.dataset.screen !== screenId));
  }

  function openMenu(screenId = state.ui.activeMenuScreen) {
    setMenuScreen(screenId);
    renderMenu();
    ui.menu.classList.remove('hidden');
    ui.gameOver.classList.add('hidden');
  }

  function renderWorldsScreen() {
    ui.worldGrid.innerHTML = '';
    ui.levelGrid.innerHTML = '';
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const unlockedCount = profile.progression.unlockedLevels[world] || 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `world-card card-surface${profile.progression.selectedWorld === world ? ' is-selected' : ''}${unlockedCount === 0 ? ' is-locked' : ''}`;
      button.disabled = unlockedCount === 0;
      button.innerHTML = `
        <div class="card-topline"><span class="card-chip">W${world}</span><span class="card-state">${unlockedCount > 0 ? 'Online' : 'Locked'}</span></div>
        <div class="card-label">Orbital Cluster</div>
        <strong>World ${world}</strong>
        <span>${Math.max(unlockedCount, 0)} / ${LEVELS_PER_WORLD} Levels freigeschaltet</span>
      `;
      button.addEventListener('click', () => actions.selectMission(world, Math.min(profile.progression.selectedLevel, Math.max(1, unlockedCount || 1))));
      ui.worldGrid.appendChild(button);
    }
    const selectedWorld = profile.progression.selectedWorld;
    for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
      const unlocked = helpers.isLevelUnlocked(selectedWorld, level);
      const completed = !!profile.progression.completedLevels[helpers.getLevelKey(selectedWorld, level)];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `level-card card-surface${profile.progression.selectedLevel === level ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}${completed ? ' is-complete' : ''}`;
      button.disabled = !unlocked;
      button.innerHTML = `
        <div class="card-topline"><span class="card-chip">L${level}</span><span class="card-state">${completed ? 'Cleared' : unlocked ? 'Ready' : 'Locked'}</span></div>
        <div class="card-label">Strike Route</div>
        <strong>Level ${level}</strong>
        <span>${WAVES_PER_LEVEL} Waves · ${completed ? 'Bonus route cleared' : 'Clear to unlock next'}</span>
      `;
      button.addEventListener('click', () => actions.selectMission(selectedWorld, level));
      ui.levelGrid.appendChild(button);
    }
  }

  function renderUpgradesScreen() {
    ui.upgradeCredits.textContent = String(profile.credits);
    ui.upgradeGroups.innerHTML = '';
    const defsById = Object.fromEntries(UPGRADE_DEFS.map((def) => [def.id, def]));
    const selectedUpgradeId = defsById[state.ui.selectedUpgradeId] ? state.ui.selectedUpgradeId : UPGRADE_DEFS[0].id;
    state.ui.selectedUpgradeId = selectedUpgradeId;
    const grouped = UPGRADE_DEFS.reduce((map, def) => {
      (map[def.group] ||= []).push(def);
      return map;
    }, {});

    const rootSection = document.createElement('section');
    rootSection.className = 'skill-tree-group skill-tree-group--root';
    rootSection.innerHTML = `
      <div class="skill-tree-group__header">
        <div class="card-label">Core</div>
        <h3>Global Matrix</h3>
      </div>
      <div class="skill-tree-lane skill-tree-lane--root"></div>
    `;
    const rootLane = rootSection.querySelector('.skill-tree-lane');
    const rootDef = defsById.upgradeLimit;
    if (rootDef) rootLane.appendChild(createUpgradeNode(rootDef, true));
    ui.upgradeGroups.appendChild(rootSection);

    ['Pilot Upgrades', 'Power-up Upgrades'].forEach((groupName, groupIndex) => {
      const defs = grouped[groupName] || [];
      if (!defs.length) return;
      const section = document.createElement('section');
      section.className = 'skill-tree-group';
      section.innerHTML = `
        <div class="skill-tree-group__header">
          <div class="card-label">Branch ${groupIndex + 1}</div>
          <h3>${groupName}</h3>
        </div>
        <div class="skill-tree-lane"></div>
      `;
      const lane = section.querySelector('.skill-tree-lane');
      defs.forEach((def, index) => {
        lane.appendChild(createUpgradeNode(def, index === 0));
      });
      ui.upgradeGroups.appendChild(section);
    });

    renderUpgradeDetail(defsById[selectedUpgradeId]);
  }

  function createUpgradeNode(def, isBranchStart = false) {
    const level = helpers.getUpgradeLevel(def.id);
    const maxLevel = helpers.getUpgradeMaxLevel(def.id);
    const cost = helpers.getUpgradeCost(def.id);
    const affordable = cost != null && profile.credits >= cost;
    const isMaxed = cost == null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `skill-node${state.ui.selectedUpgradeId === def.id ? ' is-selected' : ''}${affordable ? ' is-affordable' : ''}${isMaxed ? ' is-maxed' : ''}${cost != null && !affordable ? ' is-locked' : ''}${isBranchStart ? ' skill-node--branch-start' : ''}${def.isLimitExtender ? ' skill-node--core' : ''}`;
    button.innerHTML = `
      <span class="skill-node__icon">${def.icon || '⬢'}</span>
      <span class="skill-node__title">${def.shortLabel || def.label}</span>
      <span class="skill-node__level">Lv ${level}${maxLevel != null ? ` / ${maxLevel}` : ''}</span>
      <span class="skill-node__status">${isMaxed ? 'MAX' : affordable ? `${cost} ¤` : 'Locked'}</span>
    `;
    button.addEventListener('click', () => {
      state.ui.selectedUpgradeId = def.id;
      renderUpgradesScreen();
    });
    return button;
  }

  function renderUpgradeDetail(def) {
    if (!def || !ui.upgradeDetail) return;
    const level = helpers.getUpgradeLevel(def.id);
    const maxLevel = helpers.getUpgradeMaxLevel(def.id);
    const cost = helpers.getUpgradeCost(def.id);
    const affordable = cost != null && profile.credits >= cost;
    const nextLevel = level + 1;
    const currentValue = def.format(level);
    const nextValue = def.format(nextLevel);
    ui.upgradeDetail.innerHTML = `
      <div class="card-topline">
        <span class="card-chip">${def.icon || '⬢'} ${def.group}</span>
        <span class="card-state">${cost == null ? 'Maxed' : affordable ? 'Available' : 'Insufficient'}</span>
      </div>
      <div class="skill-tree-detail__title-row">
        <div class="skill-tree-detail__icon">${def.icon || '⬢'}</div>
        <div>
          <div class="card-label">Selected Node</div>
          <strong>${def.label}</strong>
        </div>
      </div>
      <p>${def.description}</p>
      <div class="skill-tree-detail__stats">
        <div class="skill-tree-detail__stat"><span>Current</span><strong>${currentValue}</strong></div>
        <div class="skill-tree-detail__stat"><span>Next</span><strong>${cost == null ? 'MAX' : nextValue}</strong></div>
        <div class="skill-tree-detail__stat"><span>Level</span><strong>${level}${maxLevel != null ? ` / ${maxLevel}` : ''}</strong></div>
        <div class="skill-tree-detail__stat"><span>Cost</span><strong>${cost == null ? '—' : `${cost} ¤`}</strong></div>
      </div>
      <div class="skill-tree-detail__note">${def.detail ? def.detail(level) : currentValue}</div>
    `;

    const actionRow = document.createElement('div');
    actionRow.className = 'skill-tree-detail__actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = affordable ? 'btn' : 'ghost-btn';
    button.textContent = cost == null ? 'Maxed' : 'Upgrade kaufen';
    button.disabled = cost == null || !affordable;
    button.addEventListener('click', () => actions.purchaseUpgrade(def.id));
    actionRow.appendChild(button);
    ui.upgradeDetail.appendChild(actionRow);
  }

  function renderStatisticsScreen() {
    ui.statsGrid.innerHTML = '';
    STAT_DEFS.forEach((def) => {
      const card = document.createElement('article');
      card.className = 'stat-card card-surface';
      card.innerHTML = `<div class="card-topline"><span class="card-chip">LOG</span></div><div class="card-label">${def.label}</div><strong>${def.format(profile.stats[def.id] || 0)}</strong><span>Persistent progression stat</span>`;
      ui.statsGrid.appendChild(card);
    });
  }

  function renderHomeScreen() {
    const mission = actions.getSelectedMission();
    ui.menuCredits.textContent = String(profile.credits);
    ui.menuHighestWave.textContent = String(profile.stats.highestWaveReached);
    ui.selectedMissionLabel.textContent = `World ${mission.world} · Level ${mission.level}`;
    ui.selectedMissionStatus.textContent = `${WAVES_PER_LEVEL} Waves · ${helpers.isLevelUnlocked(mission.world, mission.level) ? 'Unlocked' : 'Locked'}`;
    ui.unlockedSummary.textContent = `${actions.getUnlockedLevelCount()} / ${WORLDS_COUNT * LEVELS_PER_WORLD} Levels`;
    ui.selectedCharacterLabel.textContent = actions.getSelectedCharacterName();
  }

  function renderMenu() {
    renderHomeScreen();
    renderWorldsScreen();
    renderUpgradesScreen();
    renderStatisticsScreen();
    actions.refreshCharacterSelection();
  }

  function showRunResult(success) {
    ui.resultEyebrow.textContent = success ? 'MISSION COMPLETE' : 'EINSATZ BEENDET';
    ui.resultTitle.textContent = success ? `World ${state.worldIndex} · Level ${state.levelIndex} gesichert` : 'Outpost verloren';
    ui.resultSummary.textContent = success
      ? `Alle ${WAVES_PER_LEVEL} Waves abgeschlossen. Höchste Schwierigkeitswelle: ${state.wave}`
      : `Erreichte Welle: ${state.wave}`;
    ui.finalWave.textContent = String(state.wave);
    ui.finalScore.textContent = String(state.score);
    ui.finalCredits.textContent = String(state.runCredits);
    const nextMission = actions.getNextMission(state.worldIndex, state.levelIndex);
    ui.nextLevelBtn.classList.toggle('hidden', !success || !nextMission || !helpers.isLevelUnlocked(nextMission.world, nextMission.level));
  }

  return { setMenuScreen, openMenu, renderMenu, showRunResult };
}
