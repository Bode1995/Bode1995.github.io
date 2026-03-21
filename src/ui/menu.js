import { LEVELS_PER_WORLD, STAT_DEFS, UPGRADE_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';
import {
  SPECIAL_ABILITY_DEFS,
  getSpecialAbilityDef,
  getSpecialAbilityUpgradeCost,
  getSpecialAbilityUpgradeValue,
} from '../config/specialAbilities.js';
import { getWorldDefinition } from '../config/worlds.js';

const SKILL_TREE_BRANCHES = [
  {
    id: 'abilities',
    label: 'Fähigkeiten',
    description: 'Alle Spezialfähigkeiten als auswählbare und upgradebare Nodes.',
    accent: '#73d5ff',
    icon: '✹',
    nodeKeys: SPECIAL_ABILITY_DEFS.map((ability) => `special:${ability.id}`),
  },
  {
    id: 'arsenal',
    label: 'Arsenal',
    description: 'Normale Pilot- und Waffen-Upgrades für deine Kernstärke.',
    accent: '#ffb55b',
    icon: '⬒',
    nodeKeys: ['upgrade:baseDamage', 'upgrade:attackSpeed', 'upgrade:maxHealth', 'upgrade:movementSpeed'],
  },
  {
    id: 'powerUps',
    label: 'Power Ups',
    description: 'Alle persistente Verbesserungen für eingesammelte Power Ups.',
    accent: '#8dffd5',
    icon: '⚡',
    nodeKeys: ['upgrade:burnDamage', 'upgrade:poisonDamage', 'upgrade:slowDuration', 'upgrade:lightningRange', 'upgrade:rocketRadius', 'upgrade:shieldCapacity'],
  },
];

const UPGRADE_NODE_META = {
  upgradeLimit: { icon: '⬢', accent: '#d8b1ff' },
  baseDamage: { icon: '✦', accent: '#ff9f6a' },
  attackSpeed: { icon: '➶', accent: '#ffd36a' },
  maxHealth: { icon: '❤', accent: '#ff7a9d' },
  movementSpeed: { icon: '➤', accent: '#7bffcf' },
  burnDamage: { icon: '🔥', accent: '#ff8a5c' },
  poisonDamage: { icon: '☣', accent: '#9dff80' },
  slowDuration: { icon: '❄', accent: '#8fd9ff' },
  lightningRange: { icon: '⚡', accent: '#d9c6ff' },
  rocketRadius: { icon: '✺', accent: '#ffb15e' },
  shieldCapacity: { icon: '🛡', accent: '#8fdfff' },
};

function formatUpgradeStatus(cost, credits) {
  if (cost == null) return 'Maxed';
  return credits >= cost ? 'Kaufbar' : 'Nicht genug Credits';
}

function createNodeButton(node, selectedKey, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `skill-node card-surface${selectedKey === node.key ? ' is-selected' : ''}${node.canAfford ? ' is-affordable' : ''}${node.isMaxed ? ' is-maxed' : ''}${node.isEquipped ? ' is-equipped' : ''}${node.isLocked ? ' is-locked' : ''}`;
  button.dataset.nodeKey = node.key;
  button.style.setProperty('--node-accent', node.accent);
  button.addEventListener('click', () => onSelect(node.key));

  const meta = document.createElement('div');
  meta.className = 'skill-node__meta';
  meta.innerHTML = `
    <span class="skill-node__icon" aria-hidden="true">${node.icon}</span>
    <span class="skill-node__eyebrow">${node.eyebrow}</span>
    <span class="skill-node__status">${node.status}</span>
  `;

  const title = document.createElement('strong');
  title.className = 'skill-node__title';
  title.textContent = node.title;

  const level = document.createElement('div');
  level.className = 'skill-node__level';
  level.textContent = node.levelLabel;

  const valueRow = document.createElement('div');
  valueRow.className = 'skill-node__row';
  valueRow.innerHTML = `<span>${node.currentLabel}</span><span>${node.costLabel}</span>`;

  const footer = document.createElement('div');
  footer.className = 'skill-node__tags';
  node.tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'skill-node__tag';
    chip.textContent = tag;
    footer.appendChild(chip);
  });

  button.append(meta, title, level, valueRow, footer);
  return button;
}

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

  function buildUpgradeNode(def) {
    const level = helpers.getUpgradeLevel(def.id);
    const maxLevel = helpers.getUpgradeMaxLevel(def.id);
    const cost = helpers.getUpgradeCost(def.id);
    const meta = UPGRADE_NODE_META[def.id] || { icon: '⬒', accent: '#73d5ff' };
    const status = formatUpgradeStatus(cost, profile.credits);
    const maxLabel = maxLevel != null ? ` / ${maxLevel}` : '';
    const isMaxed = cost == null;
    const tags = [isMaxed ? 'Maxed' : 'Upgrade'];
    if (def.id === 'upgradeLimit') tags.unshift('Root');
    else if (profile.credits >= (cost || Infinity)) tags.unshift('Kaufbar');
    else tags.unshift('Credits fehlen');

    return {
      key: `upgrade:${def.id}`,
      type: 'upgrade',
      id: def.id,
      accent: meta.accent,
      icon: meta.icon,
      eyebrow: def.id === 'upgradeLimit' ? 'Root Node' : 'Upgrade Node',
      title: def.label,
      description: def.description,
      status,
      level,
      maxLevel,
      levelLabel: `Level ${level}${maxLabel}`,
      currentLabel: `Aktuell: ${def.format(level)}`,
      costLabel: cost == null ? 'Kosten: MAX' : `Kosten: ${cost}`,
      detailValue: def.format(level),
      nextCost: cost,
      canAfford: cost != null && profile.credits >= cost,
      isMaxed,
      isEquipped: false,
      isLocked: cost != null && profile.credits < cost,
      tags,
      actionLabel: cost == null ? 'Maxed' : 'Upgrade kaufen',
    };
  }

  function buildSpecialAbilityNode(ability) {
    const level = helpers.getSpecialAbilityLevel(ability.id);
    const nextCost = getSpecialAbilityUpgradeCost(ability.id, level);
    const upgradeValue = getSpecialAbilityUpgradeValue(ability.id, level);
    const isEquipped = helpers.getSelectedSpecialAbilityId() === ability.id;
    const isMaxed = nextCost == null;
    const status = isEquipped ? 'Ausgerüstet' : (isMaxed ? 'Maxed' : profile.credits >= nextCost ? 'Bereit' : 'Nicht genug Credits');
    const tags = [isEquipped ? 'Aktiv' : 'Nicht aktiv', isMaxed ? 'Maxed' : 'Upgrade'];

    return {
      key: `special:${ability.id}`,
      type: 'special',
      id: ability.id,
      accent: ability.hudColor,
      icon: ability.icon,
      eyebrow: 'Spezialfähigkeit',
      title: ability.name,
      description: ability.description,
      status,
      level,
      maxLevel: ability.upgrade.maxLevel,
      levelLabel: `Level ${level} / ${ability.upgrade.maxLevel}`,
      currentLabel: `${ability.upgrade.label}: ${ability.upgrade.format(upgradeValue)}`,
      costLabel: nextCost == null ? 'Kosten: MAX' : `Upgrade: ${nextCost}`,
      detailValue: ability.upgrade.format(upgradeValue),
      nextCost,
      canAfford: nextCost != null && profile.credits >= nextCost,
      isMaxed,
      isEquipped,
      isLocked: nextCost != null && profile.credits < nextCost,
      tags,
      cooldownLabel: `Cooldown ${ability.cooldown.toFixed(1)}s`,
      actionLabel: isEquipped ? 'Ausgerüstet' : 'Ausrüsten',
      upgradeLabel: nextCost == null ? 'Maxed' : 'Upgrade kaufen',
      upgradeTitle: ability.upgrade.label,
    };
  }

  function buildSkillTreeData() {
    const nodeMap = new Map();
    const rootNode = buildUpgradeNode(UPGRADE_DEFS.find((def) => def.id === 'upgradeLimit'));
    nodeMap.set(rootNode.key, rootNode);

    const branches = SKILL_TREE_BRANCHES.map((branch) => {
      const nodes = branch.nodeKeys.map((key) => {
        const [type, id] = key.split(':');
        const node = type === 'special'
          ? buildSpecialAbilityNode(getSpecialAbilityDef(id))
          : buildUpgradeNode(UPGRADE_DEFS.find((def) => def.id === id));
        nodeMap.set(node.key, node);
        return node;
      });

      return {
        ...branch,
        nodes,
      };
    });

    return { rootNode, branches, nodeMap };
  }

  function ensureSelectedSkillTreeNode(data) {
    const keys = [data.rootNode.key, ...data.branches.flatMap((branch) => branch.nodes.map((node) => node.key))];
    if (!keys.includes(state.ui.activeSkillTreeNode)) state.ui.activeSkillTreeNode = data.rootNode.key;
    return state.ui.activeSkillTreeNode;
  }

  function selectSkillTreeNode(nodeKey) {
    state.ui.activeSkillTreeNode = nodeKey;
    renderUpgradesScreen();
  }

  function renderSkillTreeDetails(node) {
    ui.skillTreeDetails.innerHTML = '';
    ui.skillTreeDetails.style.setProperty('--detail-accent', node.accent);

    const header = document.createElement('div');
    header.className = 'skill-tree-details__header';
    header.innerHTML = `
      <div class="skill-tree-details__titlewrap">
        <span class="skill-tree-details__icon" aria-hidden="true">${node.icon}</span>
        <div>
          <div class="card-label">${node.eyebrow}</div>
          <h4>${node.title}</h4>
        </div>
      </div>
      <span class="skill-tree-details__state">${node.status}</span>
    `;

    const copy = document.createElement('p');
    copy.className = 'skill-tree-details__copy';
    copy.textContent = node.description;

    const stats = document.createElement('div');
    stats.className = 'skill-tree-details__stats';

    const statEntries = [
      ['Level', node.levelLabel],
      ['Aktuell', node.detailValue],
      ['Nächster Preis', node.nextCost == null ? 'MAX' : `${node.nextCost} Credits`],
    ];

    if (node.type === 'special') {
      statEntries.push(['Cooldown', node.cooldownLabel]);
      statEntries.push(['Status', node.isEquipped ? 'Ausgerüstet' : 'Nicht ausgerüstet']);
    } else if (node.maxLevel == null) {
      statEntries.push(['Limitwirkung', 'Erhöht alle anderen Upgrade-Max-Level']);
    } else {
      statEntries.push(['Max-Level', `${node.maxLevel}`]);
    }

    statEntries.forEach(([label, value]) => {
      const stat = document.createElement('div');
      stat.className = 'skill-tree-details__stat';
      stat.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      stats.appendChild(stat);
    });

    const actionsWrap = document.createElement('div');
    actionsWrap.className = `skill-tree-details__actions${node.type === 'special' ? ' skill-tree-details__actions--dual' : ''}`;

    if (node.type === 'special') {
      const equipButton = document.createElement('button');
      equipButton.type = 'button';
      equipButton.className = node.isEquipped ? 'ghost-btn' : 'btn';
      equipButton.textContent = node.actionLabel;
      equipButton.disabled = node.isEquipped;
      equipButton.addEventListener('click', () => actions.selectSpecialAbility(node.id));

      const upgradeButton = document.createElement('button');
      upgradeButton.type = 'button';
      upgradeButton.className = 'ghost-btn';
      upgradeButton.textContent = node.upgradeLabel;
      upgradeButton.disabled = node.nextCost == null || profile.credits < node.nextCost;
      upgradeButton.addEventListener('click', () => actions.purchaseSpecialAbilityUpgrade(node.id));
      actionsWrap.append(equipButton, upgradeButton);
    } else {
      const upgradeButton = document.createElement('button');
      upgradeButton.type = 'button';
      upgradeButton.className = node.canAfford ? 'btn' : 'ghost-btn';
      upgradeButton.textContent = node.actionLabel;
      upgradeButton.disabled = node.nextCost == null || profile.credits < node.nextCost;
      upgradeButton.addEventListener('click', () => actions.purchaseUpgrade(node.id));
      actionsWrap.appendChild(upgradeButton);
    }

    ui.skillTreeDetails.append(header, copy, stats, actionsWrap);
  }

  function renderSkillTree(data) {
    const selectedKey = ensureSelectedSkillTreeNode(data);
    ui.skillTreeMap.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'skill-tree-layout';

    const rootWrap = document.createElement('div');
    rootWrap.className = 'skill-tree-root';
    rootWrap.appendChild(createNodeButton(data.rootNode, selectedKey, selectSkillTreeNode));

    const branchAreas = {
      abilities: 'skill-tree-branch skill-tree-branch--abilities',
      arsenal: 'skill-tree-branch skill-tree-branch--arsenal',
      powerUps: 'skill-tree-branch skill-tree-branch--powerups',
    };

    const branchOrder = ['abilities', 'arsenal', 'powerUps'];
    branchOrder.forEach((branchId) => {
      const branch = data.branches.find((entry) => entry.id === branchId);
      const section = document.createElement('section');
      section.className = branchAreas[branch.id];
      section.style.setProperty('--branch-accent', branch.accent);

      const header = document.createElement('div');
      header.className = 'skill-tree-branch__header';
      header.innerHTML = `
        <div>
          <div class="card-label">${branch.icon} Hauptstrang</div>
          <h4>${branch.label}</h4>
          <p>${branch.description}</p>
        </div>
      `;

      const nodesWrap = document.createElement('div');
      nodesWrap.className = 'skill-tree-branch__nodes';
      branch.nodes.forEach((node) => nodesWrap.appendChild(createNodeButton(node, selectedKey, selectSkillTreeNode)));

      section.append(header, nodesWrap);
      layout.appendChild(section);
    });

    layout.appendChild(rootWrap);
    ui.skillTreeMap.appendChild(layout);

    renderSkillTreeDetails(data.nodeMap.get(selectedKey) || data.rootNode);
  }

  function renderUpgradesScreen() {
    ui.upgradeCredits.textContent = String(profile.credits);
    renderSkillTree(buildSkillTreeData());
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
    const specialAbility = getSpecialAbilityDef(actions.getSelectedSpecialAbilityId());
    ui.selectedMissionLabel.textContent = `World ${mission.world} · ${worldDef.themeName} · Level ${mission.level}`;
    ui.selectedMissionStatus.textContent = `${WAVES_PER_LEVEL} Waves · ${helpers.isLevelUnlocked(mission.world, mission.level) ? 'Unlocked' : 'Locked'} · ${worldDef.hudBadge} · Spezial: ${specialAbility.name}`;
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
