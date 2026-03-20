import { LEVELS_PER_WORLD, STAT_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

  function createTreeLink(from, to, xGap, yGap) {
    const startX = 36 + (from.tree.x * xGap);
    const startY = 36 + ((from.tree.y + 3) * yGap);
    const endX = 36 + (to.tree.x * xGap);
    const endY = 36 + ((to.tree.y + 3) * yGap);
    const midX = startX + ((endX - startX) * 0.5);
    return `<path class="skill-tree__path" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" />`;
  }

  function renderUpgradesScreen() {
    const defs = helpers.getUpgradeDefs();
    const selectedId = defs.some((def) => def.id === state.ui.selectedUpgradeId) ? state.ui.selectedUpgradeId : defs[0]?.id;
    state.ui.selectedUpgradeId = selectedId;
    const selectedDef = defs.find((def) => def.id === selectedId) || defs[0];
    const columns = Math.max(...defs.map((def) => def.tree?.x || 0), 0) + 1;
    const xGap = 154;
    const yGap = 92;
    const viewBoxWidth = Math.max(1, columns) * xGap;
    const viewBoxHeight = 7 * yGap;
    const links = [];

    for (const def of defs) {
      for (const targetId of def.tree?.links || []) {
        const target = defs.find((entry) => entry.id === targetId);
        if (target) links.push(createTreeLink(def, target, xGap, yGap));
      }
    }

    const nodes = defs.map((def) => {
      const level = helpers.getUpgradeLevel(def.id);
      const cost = helpers.getUpgradeCost(def.id);
      const maxLevel = helpers.getUpgradeMaxLevel(def.id);
      const available = cost != null && profile.credits >= cost;
      const isSelected = def.id === selectedDef.id;
      const atCap = cost == null;
      const top = `${((def.tree?.y || 0) + 3) * yGap}px`;
      const left = `${(def.tree?.x || 0) * xGap}px`;
      const maxLabel = maxLevel == null ? '∞' : String(maxLevel);
      return `
        <button
          type="button"
          class="skill-node${available ? ' is-available' : ''}${atCap ? ' is-maxed' : ''}${isSelected ? ' is-selected' : ''}"
          data-upgrade-id="${def.id}"
          style="--node-accent:${def.accent};left:${left};top:${top};"
          aria-pressed="${isSelected ? 'true' : 'false'}"
        >
          <span class="skill-node__icon">${escapeHtml(def.icon || '⬢')}</span>
          <span class="skill-node__title">${escapeHtml(def.shortLabel || def.label)}</span>
          <span class="skill-node__levels">Lv ${level}<span>/ ${maxLabel}</span></span>
          <span class="skill-node__cost">${cost == null ? 'MAX' : `${cost}¤`}</span>
        </button>
      `;
    }).join('');

    const detailLevel = helpers.getUpgradeLevel(selectedDef.id);
    const detailCost = helpers.getUpgradeCost(selectedDef.id);
    const detailMaxLevel = helpers.getUpgradeMaxLevel(selectedDef.id);
    const canPurchase = detailCost != null && profile.credits >= detailCost;
    const detailCurrent = selectedDef.format(detailLevel);
    const detailNext = selectedDef.format(detailLevel + 1);
    const detailCapLabel = detailMaxLevel == null ? '∞' : String(detailMaxLevel);

    ui.upgradeCredits.textContent = String(profile.credits);
    ui.upgradeGroups.innerHTML = `
      <section class="skill-tree-shell card-surface">
        <div class="skill-tree-intro">
          <span class="card-chip">TREE</span>
          <strong>Arsenal Matrix</strong>
          <span>${defs.length} Nodes · globale Limits dynamisch</span>
        </div>
        <div class="skill-tree-scroll">
          <div class="skill-tree" style="--tree-width:${viewBoxWidth}px;--tree-height:${viewBoxHeight}px;">
            <svg class="skill-tree__links" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="none" aria-hidden="true">
              ${links.join('')}
            </svg>
            ${nodes}
          </div>
        </div>
      </section>
      <aside class="skill-detail card-surface" style="--node-accent:${selectedDef.accent};">
        <div class="skill-detail__icon">${escapeHtml(selectedDef.icon || '⬢')}</div>
        <div class="card-label">${escapeHtml(selectedDef.group)}</div>
        <h3>${escapeHtml(selectedDef.label)}</h3>
        <p>${escapeHtml(selectedDef.description)}</p>
        <div class="skill-detail__stats">
          <div><span>Level</span><strong>${detailLevel} / ${detailCapLabel}</strong></div>
          <div><span>Aktuell</span><strong>${escapeHtml(detailCurrent)}</strong></div>
          <div><span>Nächstes</span><strong>${escapeHtml(detailNext)}</strong></div>
          <div><span>Kosten</span><strong>${detailCost == null ? 'MAX' : `${detailCost} Credits`}</strong></div>
        </div>
        <div class="skill-detail__status ${detailCost == null ? 'is-maxed' : canPurchase ? 'is-available' : 'is-locked'}">
          ${detailCost == null ? 'Limit erreicht' : canPurchase ? 'Kaufbereit' : 'Zu wenig Credits'}
        </div>
        <button class="btn skill-detail__buy" type="button" data-purchase-upgrade="${selectedDef.id}" ${canPurchase ? '' : 'disabled'}>${detailCost == null ? 'Maxed' : 'Node upgraden'}</button>
      </aside>
    `;

    ui.upgradeGroups.querySelectorAll('[data-upgrade-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state.ui.selectedUpgradeId = button.dataset.upgradeId;
        renderUpgradesScreen();
      });
    });

    const buyButton = ui.upgradeGroups.querySelector('[data-purchase-upgrade]');
    if (buyButton) buyButton.addEventListener('click', () => actions.purchaseUpgrade(selectedDef.id));
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
