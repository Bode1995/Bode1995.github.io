import { LEVELS_PER_WORLD, STAT_DEFS, UPGRADE_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';
import { getWorldDefinition } from '../config/worlds.js';

export function createMenuController({ ui, profile, state, helpers, actions }) {
  function setMenuScreen(screenId) {
    state.ui.activeMenuScreen = screenId;
    ui.menu.dataset.activeScreen = screenId;
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
    for (let world = 1; world <= WORLDS_COUNT; world += 1) {
      const unlockedCount = profile.progression.unlockedLevels[world] || 0;
      const worldDef = getWorldDefinition(world);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `world-card card-surface${profile.progression.selectedWorld === world ? ' is-selected' : ''}${unlockedCount === 0 ? ' is-locked' : ''}`;
      button.disabled = unlockedCount === 0;
      button.innerHTML = `
        <div class="card-topline"><span class="card-chip">W${world}</span><span class="card-state">${unlockedCount > 0 ? 'Online' : 'Locked'}</span></div>
        <div class="card-label">${worldDef.menuLabel}</div>
        <strong>World ${world} · ${worldDef.themeName}</strong>
        <span>${Math.max(unlockedCount, 0)} / ${LEVELS_PER_WORLD} Levels freigeschaltet</span>
      `;
      button.addEventListener('click', () => actions.selectMission(world, Math.min(profile.progression.selectedLevel, Math.max(1, unlockedCount || 1))));
      button.title = `${worldDef.themeName} · ${worldDef.hudBadge}`;
      ui.worldGrid.appendChild(button);
    }

    const selectedWorld = profile.progression.selectedWorld;
    for (let level = 1; level <= LEVELS_PER_WORLD; level += 1) {
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
    const grouped = UPGRADE_DEFS.reduce((map, def) => {
      (map[def.group] ||= []).push(def);
      return map;
    }, {});

    for (const [group, defs] of Object.entries(grouped)) {
      const groupEl = document.createElement('section');
      groupEl.className = 'upgrade-group';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'upgrade-group__header';
      const title = document.createElement('h3');
      title.textContent = group;
      const intro = document.createElement('p');
      intro.textContent = 'Dauerhafte Verbesserungen mit sauberer Kosten- und Fortschrittsanzeige.';
      titleWrap.append(title, intro);
      groupEl.appendChild(titleWrap);

      defs.forEach((def) => {
        const level = helpers.getUpgradeLevel(def.id);
        const maxLevel = helpers.getUpgradeMaxLevel(def.id);
        const cost = helpers.getUpgradeCost(def.id);
        const card = document.createElement('article');
        card.className = `upgrade-card card-surface${cost == null || profile.credits < cost ? ' is-disabled' : ''}`;
        card.innerHTML = `
          <div class="card-topline"><span class="card-chip">Mk ${level + 1}</span><span class="card-state">${cost == null ? 'Maxed' : profile.credits >= cost ? 'Available' : 'Insufficient'}</span></div>
          <div class="card-label">${def.label}</div>
          <strong>Level ${level}${maxLevel != null ? ` / ${maxLevel}` : ''}</strong>
          <p>${def.description}</p>
          <div class="card-row"><span>Current: ${def.format(level)}</span><span>${cost == null ? 'MAX' : `Next cost: ${cost}`}</span></div>
        `;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = cost == null ? 'Maxed' : 'Upgrade';
        button.disabled = cost == null || profile.credits < cost;
        button.addEventListener('click', () => actions.purchaseUpgrade(def.id));
        card.appendChild(button);
        groupEl.appendChild(card);
      });

      ui.upgradeGroups.appendChild(groupEl);
    }
  }

  function renderStatisticsScreen() {
    ui.statsGrid.innerHTML = '';
    STAT_DEFS.forEach((def) => {
      const card = document.createElement('article');
      card.className = 'stat-card card-surface';
      card.innerHTML = `
        <div class="card-topline"><span class="card-chip">LOG</span></div>
        <div class="card-label">${def.label}</div>
        <strong>${def.format(profile.stats[def.id] || 0)}</strong>
        <span>Persistent progression stat</span>
      `;
      ui.statsGrid.appendChild(card);
    });
  }

  function renderHomeScreen() {
    const mission = actions.getSelectedMission();
    ui.menuCredits.textContent = String(profile.credits);
    ui.menuHighestWave.textContent = String(profile.stats.highestWaveReached);
    const worldDef = getWorldDefinition(mission.world);
    ui.selectedMissionLabel.textContent = `World ${mission.world} · ${worldDef.themeName} · Level ${mission.level}`;
    ui.selectedMissionStatus.textContent = `${WAVES_PER_LEVEL} Waves · ${helpers.isLevelUnlocked(mission.world, mission.level) ? 'Unlocked' : 'Locked'} · ${worldDef.hudBadge}`;
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
