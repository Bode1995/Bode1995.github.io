import { LEVELS_PER_WORLD, STAT_DEFS, UPGRADE_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';

export function createMenuController({ ui, profile, state, helpers, actions }) {
  const upgradeDefMap = new Map(UPGRADE_DEFS.map((def) => [def.id, def]));

  function setMenuScreen(screenId) {
    state.ui.activeMenuScreen = screenId;
    const isHub = screenId === 'hub';
    ui.menu.classList.toggle('menu--hub', isHub);
    ui.menu.classList.toggle('menu--detail', !isHub);
    ui.menuShell.dataset.screen = screenId;
    ui.menuScreens.forEach((screen) => {
      const active = screen.dataset.screen === screenId;
      screen.classList.toggle('hidden', !active);
      screen.classList.toggle('is-active', active);
    });
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

  function renderUpgradeDetails(def) {
    if (!def) return;
    const level = helpers.getUpgradeLevel(def.id);
    const maxLevel = helpers.getUpgradeMaxLevel(def.id);
    const cost = helpers.getUpgradeCost(def.id);
    const purchasable = cost != null && profile.credits >= cost;
    const detail = ui.upgradeDetail;
    detail.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'skill-detail__header';
    header.innerHTML = `
      <div class="skill-detail__icon">${def.icon || '✦'}</div>
      <div>
        <div class="card-label">${def.group}</div>
        <h3>${def.shortLabel || def.label}</h3>
        <p>${def.description}</p>
      </div>
    `;

    const metrics = document.createElement('div');
    metrics.className = 'skill-detail__metrics';
    metrics.innerHTML = `
      <div class="skill-detail__metric"><span>Level</span><strong>${level}${Number.isFinite(maxLevel) ? ` / ${maxLevel}` : ' / ∞'}</strong></div>
      <div class="skill-detail__metric"><span>Aktuell</span><strong>${def.format(level)}</strong></div>
      <div class="skill-detail__metric"><span>Nächster Kauf</span><strong>${cost == null ? 'MAX' : `${cost} Cr`}</strong></div>
    `;

    const footer = document.createElement('div');
    footer.className = 'skill-detail__footer';
    const buyButton = document.createElement('button');
    buyButton.type = 'button';
    buyButton.className = 'btn';
    buyButton.textContent = cost == null ? 'Maxed' : `Upgrade kaufen · ${cost} Cr`;
    buyButton.disabled = !purchasable;
    buyButton.addEventListener('click', () => actions.purchaseUpgrade(def.id));
    footer.appendChild(buyButton);

    const info = document.createElement('p');
    info.className = 'skill-detail__hint';
    info.textContent = def.id === 'limitOverclock'
      ? 'Jeder Kauf erhöht das Max-Level aller anderen Upgrades dauerhaft um +1.'
      : `Status: ${cost == null ? 'Max-Level erreicht' : purchasable ? 'Kaufbar' : 'Mehr Credits benötigt'}`;
    footer.appendChild(info);

    detail.append(header, metrics, footer);
  }

  function renderUpgradesScreen() {
    ui.upgradeCredits.textContent = String(profile.credits);
    ui.skillTree.innerHTML = '';
    ui.skillTreeSvg.innerHTML = '';

    const treeBounds = { cols: 0, rows: 0 };
    UPGRADE_DEFS.forEach((def) => {
      treeBounds.cols = Math.max(treeBounds.cols, def.tree.col);
      treeBounds.rows = Math.max(treeBounds.rows, def.tree.row);
    });
    ui.skillTree.style.setProperty('--tree-cols', String(treeBounds.cols));
    ui.skillTree.style.setProperty('--tree-rows', String(treeBounds.rows));

    UPGRADE_DEFS.forEach((def) => {
      const level = helpers.getUpgradeLevel(def.id);
      const maxLevel = helpers.getUpgradeMaxLevel(def.id);
      const cost = helpers.getUpgradeCost(def.id);
      const purchasable = cost != null && profile.credits >= cost;
      const locked = cost == null;
      const article = document.createElement('article');
      article.className = `skill-node card-surface${state.ui.selectedUpgradeId === def.id ? ' is-selected' : ''}${purchasable ? ' is-available' : ''}${locked ? ' is-maxed' : ''}`;
      article.style.gridColumn = String(def.tree.col);
      article.style.gridRow = String(def.tree.row);
      article.dataset.upgradeId = def.id;
      article.innerHTML = `
        <div class="skill-node__topline">
          <span class="skill-node__icon">${def.icon || '✦'}</span>
          <span class="skill-node__badge">${locked ? 'MAX' : purchasable ? 'LIVE' : 'LOCK'}</span>
        </div>
        <strong>${def.shortLabel || def.label}</strong>
        <span class="skill-node__group">${def.group}</span>
        <div class="skill-node__stats">
          <span>Lv ${level}${Number.isFinite(maxLevel) ? `/${maxLevel}` : '/∞'}</span>
          <span>${cost == null ? 'MAX' : `${cost} Cr`}</span>
        </div>
      `;
      article.addEventListener('click', () => {
        state.ui.selectedUpgradeId = def.id;
        renderUpgradesScreen();
      });

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skill-node__action';
      button.textContent = cost == null ? 'Maxed' : '+';
      button.disabled = !purchasable;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        actions.purchaseUpgrade(def.id);
      });
      article.appendChild(button);

      ui.skillTree.appendChild(article);
    });

    const svgWidth = treeBounds.cols * 100;
    const svgHeight = treeBounds.rows * 100;
    ui.skillTreeSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    ui.skillTreeSvg.setAttribute('preserveAspectRatio', 'none');

    UPGRADE_DEFS.forEach((def) => {
      const connections = def.tree.connectsTo || [];
      connections.forEach((targetId) => {
        const target = upgradeDefMap.get(targetId);
        if (!target) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String((def.tree.col - 0.5) * 100));
        line.setAttribute('y1', String((def.tree.row - 0.5) * 100));
        line.setAttribute('x2', String((target.tree.col - 0.5) * 100));
        line.setAttribute('y2', String((target.tree.row - 0.5) * 100));
        line.setAttribute('class', 'skill-tree__line');
        ui.skillTreeSvg.appendChild(line);
      });
    });

    const selectedDef = upgradeDefMap.get(state.ui.selectedUpgradeId) || UPGRADE_DEFS[0];
    state.ui.selectedUpgradeId = selectedDef.id;
    renderUpgradeDetails(selectedDef);
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
    ui.hubMissionButton.textContent = `Mission W${mission.world} · L${mission.level} öffnen`;
    ui.hubCharacterButton.textContent = `${actions.getSelectedCharacterName()} anpassen`;
    ui.hubUpgradeButton.textContent = `Skill-Tree (${profile.credits} Cr)`;
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
