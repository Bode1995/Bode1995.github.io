import { LEVELS_PER_WORLD, STAT_DEFS, UPGRADE_DEFS, WAVES_PER_LEVEL, WORLDS_COUNT } from '../config/gameConfig.js';
import {
  SPECIAL_ABILITY_DEFS,
  getSpecialAbilityDef,
  getSpecialAbilityUpgradeCost,
  getSpecialAbilityUpgradeValue,
} from '../config/specialAbilities.js';
import { getWorldDefinition } from '../config/worlds.js';
import { getBossesForWorld } from '../config/bosses.js';
import { getCampaignGroupDefinition } from '../config/campaigns.js';

const SKILL_TREE_LAYOUT = {
  canvasPadding: 96,
  nodeDiameter: 76,
  rootDiameter: 92,
  branchDiameter: 108,
  minNodeGap: 28,
  minBranchGap: 34,
};

const SKILL_TREE_BRANCHES = [
  {
    id: 'abilities',
    label: 'Fähigkeiten',
    accent: '#73d5ff',
    icon: '✹',
    anchor: { x: 430, y: 290 },
    nodeKeys: SPECIAL_ABILITY_DEFS.map((ability) => `special:${ability.id}`),
    layout: {
      radius: 180,
      startAngleDeg: 135,
      spreadDeg: 270,
    },
  },
  {
    id: 'arsenal',
    label: 'Arsenal',
    accent: '#ffb55b',
    icon: '⬒',
    anchor: { x: 1170, y: 290 },
    nodeKeys: ['upgrade:baseDamage', 'upgrade:attackSpeed', 'upgrade:maxHealth', 'upgrade:movementSpeed'],
    layout: {
      radius: 180,
      startAngleDeg: -45,
      spreadDeg: 270,
    },
  },
  {
    id: 'powerUps',
    label: 'Power Ups',
    accent: '#8dffd5',
    icon: '⚡',
    anchor: { x: 800, y: 810 },
    nodeKeys: ['upgrade:burnDamage', 'upgrade:poisonDamage', 'upgrade:slowDuration', 'upgrade:lightningRange', 'upgrade:rocketRadius', 'upgrade:shieldCapacity'],
    layout: {
      radius: 214,
      startAngleDeg: 210,
      spreadDeg: 300,
    },
  },
];

const SKILL_TREE_CANVAS = { width: 1600, height: 1140, root: { x: 800, y: 480 } };
const SKILL_TREE_CAMERA = {
  minScale: 0.35,
  maxScale: 1.75,
  zoomStep: 0.15,
  dragThreshold: 8,
  suppressClickMs: 160,
};
const SKILL_TREE_DETAIL_LAYOUT = {
  width: 280,
  minHeight: 188,
  preferredGap: 28,
  edgePadding: 22,
};

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

const UPGRADE_DEFS_BY_ID = new Map(UPGRADE_DEFS.map((def) => [def.id, def]));

function formatUpgradeStatus(cost, credits) {
  if (cost == null) return 'Maxed';
  return credits >= cost ? 'Kaufbar' : 'Nicht genug Credits';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createSkillTreeActionButton({ variant = 'ghost-btn', label, disabled = false, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = variant;
  button.textContent = label;
  button.disabled = disabled;
  if (!disabled && typeof onClick === 'function') button.addEventListener('click', onClick);
  return button;
}

function createNodeButton(node, selectedKey, { onSelect, shouldSuppressSelection }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `skill-node${selectedKey === node.key ? ' is-selected' : ''}${node.canAfford ? ' is-affordable' : ''}${node.isMaxed ? ' is-maxed' : ''}${node.isEquipped ? ' is-equipped' : ''}${node.isLocked ? ' is-locked' : ''}${node.isRoot ? ' is-root' : ''}`;
  button.dataset.nodeKey = node.key;
  button.style.setProperty('--node-accent', node.accent);
  button.setAttribute('aria-label', `${node.title}, ${node.status}, ${node.levelLabel}`);
  button.addEventListener('click', () => {
    if (shouldSuppressSelection()) return;
    onSelect(node);
  });

  const icon = document.createElement('span');
  icon.className = 'skill-node__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = node.icon;

  const ring = document.createElement('span');
  ring.className = 'skill-node__ring';
  ring.setAttribute('aria-hidden', 'true');

  const level = document.createElement('span');
  level.className = 'skill-node__level';
  level.textContent = `${node.level}`;
  level.setAttribute('aria-hidden', 'true');

  const status = document.createElement('span');
  status.className = 'skill-node__state-dot';
  status.setAttribute('aria-hidden', 'true');

  button.append(ring, icon, level, status);
  return button;
}

function createBranchMarker(branch) {
  const marker = document.createElement('div');
  marker.className = `skill-tree-branch-marker skill-tree-branch-marker--${branch.id}`;
  marker.style.setProperty('--branch-accent', branch.accent);
  marker.style.left = `${branch.anchor.x}px`;
  marker.style.top = `${branch.anchor.y}px`;
  marker.innerHTML = `
    <span class="skill-tree-branch-marker__icon" aria-hidden="true">${branch.icon}</span>
    <strong>${branch.label}</strong>
  `;
  return marker;
}

function toRadians(angleDeg) {
  return (angleDeg * Math.PI) / 180;
}

function clampPointToCanvas(point, size = SKILL_TREE_LAYOUT.nodeDiameter) {
  const padding = SKILL_TREE_LAYOUT.canvasPadding + (size / 2);
  return {
    x: clamp(point.x, padding, SKILL_TREE_CANVAS.width - padding),
    y: clamp(point.y, padding, SKILL_TREE_CANVAS.height - padding),
  };
}

function createConnectionPath(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    const deltaX = next.x - prev.x;
    const deltaY = next.y - prev.y;
    const controlA = {
      x: prev.x + (deltaX * 0.35),
      y: prev.y + (Math.abs(deltaX) > Math.abs(deltaY) ? 0 : deltaY * 0.2),
    };
    const controlB = {
      x: next.x - (deltaX * 0.35),
      y: next.y - (Math.abs(deltaX) > Math.abs(deltaY) ? 0 : deltaY * 0.2),
    };
    path += ` C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function calculateBranchNodeRadius(branch, nodeCount) {
  const branchRadius = SKILL_TREE_LAYOUT.branchDiameter / 2;
  const nodeRadius = SKILL_TREE_LAYOUT.nodeDiameter / 2;
  const minimumCenterDistance = branchRadius + nodeRadius + SKILL_TREE_LAYOUT.minBranchGap;
  if (nodeCount <= 1) return Math.max(branch.layout?.radius || minimumCenterDistance, minimumCenterDistance);

  const spreadDeg = branch.layout?.spreadDeg || 360;
  const divisor = Math.max(nodeCount - 1, 1);
  const stepRad = toRadians(spreadDeg / divisor);
  const minimumNodeDistance = SKILL_TREE_LAYOUT.nodeDiameter + SKILL_TREE_LAYOUT.minNodeGap;
  const radiusFromNodeGap = minimumNodeDistance / (2 * Math.sin(Math.max(stepRad, 0.35) / 2));
  return Math.max(branch.layout?.radius || minimumCenterDistance, minimumCenterDistance, radiusFromNodeGap);
}

function createBranchNodePositions(branch, nodeCount) {
  if (nodeCount <= 0) return [];
  const radius = calculateBranchNodeRadius(branch, nodeCount);
  const startAngle = branch.layout?.startAngleDeg || 0;
  const spreadDeg = branch.layout?.spreadDeg || 360;
  const divisor = nodeCount === 1 ? 1 : Math.max(nodeCount - 1, 1);

  return Array.from({ length: nodeCount }, (_, index) => {
    const angleDeg = startAngle + ((spreadDeg / divisor) * index);
    const angle = toRadians(angleDeg);
    return clampPointToCanvas({
      x: branch.anchor.x + (Math.cos(angle) * radius),
      y: branch.anchor.y + (Math.sin(angle) * radius),
    });
  });
}

export function createMenuController({ ui, profile, state, helpers, actions }) {
  function getSkillTreeViewState() {
    if (!state.ui.skillTreeView) {
      state.ui.skillTreeView = {
        scale: 1,
        x: 0,
        y: 0,
        initialized: false,
        suppressClickUntil: 0,
      };
    }
    return state.ui.skillTreeView;
  }

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
        <div class="card-topline"><span class="card-state">${unlockedCount > 0 ? 'Online' : 'Locked'}</span></div>
        <strong>${worldDef.themeName}</strong>
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

    getBossesForWorld(selectedWorld).forEach((boss) => {
      const unlocked = helpers.isBossMissionUnlocked(boss.id);
      const completed = !!profile.progression.completedBossMissions?.[boss.id];
      const selected = profile.progression.selectedMissionType === 'boss' && profile.progression.selectedBossMissionId === boss.id;
      const campaign = getCampaignGroupDefinition(boss.campaignGroupId || 'earth');
      const stateLabel = completed ? 'Cleared' : unlocked ? 'Ready' : 'Locked';
      const statusText = completed
        ? 'Wiederholbar'
        : unlocked
          ? 'Boss-Mission bereit'
          : `Freischaltung nach Abschluss der ${campaign.name}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `level-card level-card--boss card-surface${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}${completed ? ' is-complete' : ''}`;
      button.disabled = !unlocked;
      button.title = unlocked ? `${boss.name} starten` : statusText;
      button.innerHTML = `
        <div class="card-topline"><span class="card-chip">${boss.menuChip}</span><span class="card-state">${stateLabel}</span></div>
        <div class="card-label">${boss.menuLabel}</div>
        <strong>${boss.name}</strong>
        <span>${boss.phases} Phasen · ${statusText}</span>
      `;
      if (unlocked) button.addEventListener('click', () => actions.selectBossMission(boss.id));
      ui.levelGrid.appendChild(button);
    });
  }

  function getUpgradeDef(id) {
    return UPGRADE_DEFS_BY_ID.get(id) || null;
  }

  function buildUpgradeNode(defOrId) {
    const def = typeof defOrId === 'string' ? getUpgradeDef(defOrId) : defOrId;
    if (!def) return null;

    const level = helpers.getUpgradeLevel(def.id);
    const maxLevel = helpers.getUpgradeMaxLevel(def.id);
    const cost = helpers.getUpgradeCost(def.id);
    const meta = UPGRADE_NODE_META[def.id] || { icon: '⬒', accent: '#73d5ff' };
    const status = formatUpgradeStatus(cost, profile.credits);
    const maxLabel = maxLevel != null ? ` / ${maxLevel}` : '';
    const isMaxed = cost == null;
    const isRoot = def.id === 'upgradeLimit';

    return {
      key: `upgrade:${def.id}`,
      type: 'upgrade',
      id: def.id,
      accent: meta.accent,
      icon: meta.icon,
      eyebrow: isRoot ? 'Root Node' : 'Upgrade Node',
      title: def.label,
      description: def.description,
      status,
      statusBadge: isRoot ? 'Root' : isMaxed ? 'Maxed' : profile.credits >= (cost || Infinity) ? 'Kaufbar' : 'Gesperrt',
      level,
      maxLevel,
      levelLabel: `Level ${level}${maxLabel}`,
      shortLevelLabel: `Lv ${level}${maxLevel != null ? `/${maxLevel}` : ''}`,
      currentLabel: `Aktuell: ${def.format(level)}`,
      shortCostLabel: cost == null ? 'MAX' : `${cost} C`,
      costLabel: cost == null ? 'Kosten: MAX' : `Kosten: ${cost}`,
      detailValue: def.format(level),
      nextCost: cost,
      canAfford: cost != null && profile.credits >= cost,
      isMaxed,
      isEquipped: false,
      isLocked: cost != null && profile.credits < cost,
      isRoot,
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
      statusBadge: isEquipped ? 'Aktiv' : isMaxed ? 'Maxed' : profile.credits >= (nextCost || Infinity) ? 'Bereit' : 'Gesperrt',
      level,
      maxLevel: ability.upgrade.maxLevel,
      levelLabel: `Level ${level} / ${ability.upgrade.maxLevel}`,
      shortLevelLabel: `Lv ${level}/${ability.upgrade.maxLevel}`,
      currentLabel: `${ability.upgrade.label}: ${ability.upgrade.format(upgradeValue)}`,
      shortCostLabel: nextCost == null ? 'MAX' : `${nextCost} C`,
      costLabel: nextCost == null ? 'Kosten: MAX' : `Upgrade: ${nextCost}`,
      detailValue: ability.upgrade.format(upgradeValue),
      nextCost,
      canAfford: nextCost != null && profile.credits >= nextCost,
      isMaxed,
      isEquipped,
      isLocked: nextCost != null && profile.credits < nextCost,
      isRoot: false,
      cooldownLabel: `Cooldown ${ability.cooldown.toFixed(1)}s`,
      actionLabel: isEquipped ? 'Ausgerüstet' : 'Ausrüsten',
      upgradeLabel: nextCost == null ? 'Maxed' : 'Upgrade kaufen',
      upgradeTitle: ability.upgrade.label,
    };
  }

  function buildSkillTreeData() {
    const nodeMap = new Map();
    const layoutNodes = [];
    const connections = [];
    const rootNode = buildUpgradeNode('upgradeLimit');
    if (rootNode) {
      rootNode.x = SKILL_TREE_CANVAS.root.x;
      rootNode.y = SKILL_TREE_CANVAS.root.y;
      nodeMap.set(rootNode.key, rootNode);
      layoutNodes.push(rootNode);
    }

    const branches = SKILL_TREE_BRANCHES.map((branch) => {
      const positions = createBranchNodePositions(branch, branch.nodeKeys.length);
      const nodes = branch.nodeKeys.map((key, index) => {
        const [type, id] = key.split(':');
        const node = type === 'special'
          ? buildSpecialAbilityNode(getSpecialAbilityDef(id))
          : buildUpgradeNode(id);
        if (!node) return null;
        const position = positions[index] || branch.anchor;
        node.x = position.x;
        node.y = position.y;
        node.branchId = branch.id;
        nodeMap.set(node.key, node);
        layoutNodes.push(node);
        connections.push({
          key: `${branch.id}:${node.key}`,
          accent: branch.accent,
          type: 'branch-node',
          path: createConnectionPath([
            { x: branch.anchor.x, y: branch.anchor.y },
            { x: node.x, y: node.y },
          ]),
        });
        return node;
      }).filter(Boolean);

      if (nodes.length > 0) {
        connections.push({
          key: `root:${branch.id}`,
          accent: branch.accent,
          type: 'root-branch',
          path: createConnectionPath([
            SKILL_TREE_CANVAS.root,
            { x: branch.anchor.x, y: branch.anchor.y },
          ]),
        });
      }

      return {
        ...branch,
        nodes,
      };
    }).filter((branch) => branch.nodes.length > 0);

    return { rootNode, branches, nodeMap, nodes: layoutNodes, connections };
  }

  function getSelectedSkillTreeNode(data) {
    if (!state.ui.activeSkillTreeNode) return null;
    return data.nodeMap.get(state.ui.activeSkillTreeNode) || null;
  }

  function closeSkillTreeDetails() {
    state.ui.activeSkillTreeNode = null;
    renderUpgradesScreen();
  }

  function selectSkillTreeNode(node) {
    state.ui.activeSkillTreeNode = node.key;
    renderUpgradesScreen();
  }

  function triggerNodeUpgrade(node) {
    state.ui.activeSkillTreeNode = node.key;
    if (node.type === 'special') actions.purchaseSpecialAbilityUpgrade(node.id);
    else actions.purchaseUpgrade(node.id);
  }

  function triggerNodeEquip(node) {
    state.ui.activeSkillTreeNode = node.key;
    actions.selectSpecialAbility(node.id);
  }

  function getSkillTreeDetailPlacement(node) {
    const estimatedHeight = node.type === 'special' ? 236 : 212;
    const overlaySize = {
      width: SKILL_TREE_DETAIL_LAYOUT.width,
      height: Math.max(SKILL_TREE_DETAIL_LAYOUT.minHeight, estimatedHeight),
    };
    const nodeRadius = node.isRoot ? (SKILL_TREE_LAYOUT.rootDiameter / 2) : (SKILL_TREE_LAYOUT.nodeDiameter / 2);
    const candidateDirections = [
      { name: 'right', x: node.x + nodeRadius + SKILL_TREE_DETAIL_LAYOUT.preferredGap, y: node.y - (overlaySize.height / 2) },
      { name: 'left', x: node.x - nodeRadius - SKILL_TREE_DETAIL_LAYOUT.preferredGap - overlaySize.width, y: node.y - (overlaySize.height / 2) },
      { name: 'top', x: node.x - (overlaySize.width / 2), y: node.y - nodeRadius - SKILL_TREE_DETAIL_LAYOUT.preferredGap - overlaySize.height },
      { name: 'bottom', x: node.x - (overlaySize.width / 2), y: node.y + nodeRadius + SKILL_TREE_DETAIL_LAYOUT.preferredGap },
    ];
    const minX = SKILL_TREE_DETAIL_LAYOUT.edgePadding;
    const minY = SKILL_TREE_DETAIL_LAYOUT.edgePadding;
    const maxX = SKILL_TREE_CANVAS.width - overlaySize.width - SKILL_TREE_DETAIL_LAYOUT.edgePadding;
    const maxY = SKILL_TREE_CANVAS.height - overlaySize.height - SKILL_TREE_DETAIL_LAYOUT.edgePadding;
    const clampCoordinate = (value, min, max) => (max < min ? min : clamp(value, min, max));

    const scoredCandidates = candidateDirections.map((candidate) => {
      const x = clampCoordinate(candidate.x, minX, maxX);
      const y = clampCoordinate(candidate.y, minY, maxY);
      const overflow = Math.abs(candidate.x - x) + Math.abs(candidate.y - y);
      const centerX = x + (overlaySize.width / 2);
      const centerY = y + (overlaySize.height / 2);
      const distance = Math.hypot(centerX - node.x, centerY - node.y);
      return {
        direction: candidate.name,
        x,
        y,
        score: overflow + distance,
      };
    });

    const bestCandidate = scoredCandidates.sort((left, right) => left.score - right.score)[0];
    return {
      x: bestCandidate.x,
      y: bestCandidate.y,
      direction: bestCandidate.direction,
      width: overlaySize.width,
    };
  }

  function renderSkillTreeDetails(node) {
    const details = document.createElement('aside');
    details.className = 'skill-tree-details';
    details.dataset.nodeDetail = 'true';
    details.style.setProperty('--detail-accent', node.accent || '#73d5ff');
    const placement = getSkillTreeDetailPlacement(node);
    details.style.left = `${placement.x}px`;
    details.style.top = `${placement.y}px`;
    details.style.width = `${placement.width}px`;
    details.dataset.detailDirection = placement.direction;

    const header = document.createElement('div');
    header.className = 'skill-tree-details__header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'skill-tree-details__titlewrap';
    titleWrap.innerHTML = `
      <span class="skill-tree-details__icon" aria-hidden="true">${node.icon}</span>
      <div>
        <div class="card-label">${node.eyebrow}</div>
        <h4>${node.title}</h4>
      </div>
    `;

    const side = document.createElement('div');
    side.className = 'skill-tree-details__header-actions';

    const stateChip = document.createElement('span');
    stateChip.className = 'skill-tree-details__state';
    stateChip.textContent = node.status;

    const closeButton = createSkillTreeActionButton({
      label: '×',
      onClick: closeSkillTreeDetails,
    });
    closeButton.classList.add('skill-tree-details__close');
    closeButton.setAttribute('aria-label', 'Details schließen');
    closeButton.title = 'Details schließen';

    side.append(stateChip, closeButton);
    header.append(titleWrap, side);

    const body = document.createElement('div');
    body.className = 'skill-tree-details__body';

    const description = document.createElement('p');
    description.className = 'skill-tree-details__description';
    description.textContent = node.description;

    const stats = document.createElement('div');
    stats.className = 'skill-tree-details__stats';

    const statEntries = [
      ['Level', node.levelLabel],
      ['Status', node.status],
      ['Aktuell', node.detailValue],
      ['Kosten', node.nextCost == null ? 'MAX' : `${node.nextCost} Credits`],
    ];

    if (node.type === 'special') {
      statEntries.push(['Cooldown', node.cooldownLabel]);
      statEntries.push(['Ausrüstung', node.isEquipped ? 'Aktiv' : 'Nicht ausgerüstet']);
      statEntries.push([node.upgradeTitle, node.detailValue]);
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
    actionsWrap.className = 'skill-tree-details__actions';

    if (node.type === 'special') {
      actionsWrap.appendChild(createSkillTreeActionButton({
        label: node.actionLabel,
        variant: node.isEquipped ? 'ghost-btn' : 'btn',
        disabled: node.isEquipped,
        onClick: () => triggerNodeEquip(node),
      }));
    }

    actionsWrap.appendChild(createSkillTreeActionButton({
      label: node.type === 'special' ? node.upgradeLabel : node.actionLabel,
      variant: node.canAfford ? 'btn' : 'ghost-btn',
      disabled: node.nextCost == null || !node.canAfford,
      onClick: () => triggerNodeUpgrade(node),
    }));

    body.append(description, stats, actionsWrap);
    details.append(header, body);
    return details;
  }

  function centerSkillTreeViewport(windowEl, content, rootEl = windowEl) {
    const view = getSkillTreeViewState();
    const viewportRect = windowEl.getBoundingClientRect();
    if (!viewportRect.width || !viewportRect.height) return;
    view.scale = clamp(view.scale || 1, SKILL_TREE_CAMERA.minScale, SKILL_TREE_CAMERA.maxScale);
    view.x = (viewportRect.width - (SKILL_TREE_CANVAS.width * view.scale)) / 2;
    view.y = (viewportRect.height - (SKILL_TREE_CANVAS.height * view.scale)) / 2;
    view.initialized = true;
    content.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    rootEl.style.setProperty('--skill-tree-scale', `${Math.round(view.scale * 100)}%`);
  }

  function attachSkillTreeViewport(rootEl, content) {
    const view = getSkillTreeViewState();
    const viewport = rootEl.querySelector('.skill-tree-viewport__window');
    const pointers = new Map();
    let dragState = null;
    let pinchState = null;

    function applyTransform() {
      content.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
      rootEl.style.setProperty('--skill-tree-scale', `${Math.round(view.scale * 100)}%`);
    }

    function zoomAt(nextScale, originX, originY) {
      const clampedScale = clamp(nextScale, SKILL_TREE_CAMERA.minScale, SKILL_TREE_CAMERA.maxScale);
      if (clampedScale === view.scale) return;
      const previousScale = view.scale;
      view.x = originX - ((originX - view.x) * (clampedScale / previousScale));
      view.y = originY - ((originY - view.y) * (clampedScale / previousScale));
      view.scale = clampedScale;
      applyTransform();
    }

    function suppressClicks() {
      view.suppressClickUntil = Date.now() + SKILL_TREE_CAMERA.suppressClickMs;
    }

    function getPoint(event) {
      const rect = viewport.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function refreshPinchState() {
      const activePointers = [...pointers.values()];
      if (activePointers.length !== 2) {
        pinchState = null;
        return;
      }
      const [first, second] = activePointers;
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (!pinchState) {
        pinchState = {
          distance,
          scale: view.scale,
          center,
        };
        return;
      }
      const scaleFactor = distance / Math.max(pinchState.distance, 1);
      zoomAt(pinchState.scale * scaleFactor, center.x, center.y);
      const deltaX = center.x - pinchState.center.x;
      const deltaY = center.y - pinchState.center.y;
      view.x += deltaX;
      view.y += deltaY;
      pinchState.center = center;
      applyTransform();
    }

    if (!view.initialized) centerSkillTreeViewport(viewport, content, rootEl);
    else applyTransform();

    viewport.addEventListener('wheel', (event) => {
      event.preventDefault();
      const point = getPoint(event);
      const direction = event.deltaY < 0 ? 1 : -1;
      zoomAt(view.scale + (direction * SKILL_TREE_CAMERA.zoomStep), point.x, point.y);
    }, { passive: false });

    viewport.addEventListener('pointerdown', (event) => {
      viewport.setPointerCapture(event.pointerId);
      const point = getPoint(event);
      pointers.set(event.pointerId, point);
      if (pointers.size === 1) {
        dragState = {
          pointerId: event.pointerId,
          startX: point.x,
          startY: point.y,
          originX: view.x,
          originY: view.y,
          moved: false,
        };
      } else {
        dragState = null;
      }
      refreshPinchState();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      const point = getPoint(event);
      pointers.set(event.pointerId, point);
      if (pointers.size === 2) {
        refreshPinchState();
        return;
      }
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const deltaX = point.x - dragState.startX;
      const deltaY = point.y - dragState.startY;
      if (!dragState.moved && Math.hypot(deltaX, deltaY) >= SKILL_TREE_CAMERA.dragThreshold) {
        dragState.moved = true;
      }
      if (!dragState.moved) return;
      view.x = dragState.originX + deltaX;
      view.y = dragState.originY + deltaY;
      applyTransform();
    });

    function releasePointer(pointerId) {
      pointers.delete(pointerId);
      if (dragState?.pointerId === pointerId && dragState.moved) suppressClicks();
      if (pointers.size <= 1) pinchState = null;
      if (pointers.size === 1) {
        const [remainingPointerId, remainingPoint] = pointers.entries().next().value;
        dragState = {
          pointerId: remainingPointerId,
          startX: remainingPoint.x,
          startY: remainingPoint.y,
          originX: view.x,
          originY: view.y,
          moved: false,
        };
      } else {
        dragState = null;
      }
    }

    viewport.addEventListener('pointerup', (event) => releasePointer(event.pointerId));
    viewport.addEventListener('pointercancel', (event) => releasePointer(event.pointerId));
    viewport.addEventListener('pointerleave', (event) => {
      if (!viewport.hasPointerCapture(event.pointerId)) return;
      releasePointer(event.pointerId);
    });

    rootEl.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => centerSkillTreeViewport(viewport, content, rootEl));
  }

  function renderSkillTree(data) {
    if (!ui.skillTreeMap) return;
    const selectedNode = getSelectedSkillTreeNode(data);
    const selectedKey = selectedNode?.key || null;
    ui.skillTreeMap.innerHTML = '';

    if (!data.rootNode && data.branches.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'skill-tree-empty card-surface';
      emptyState.innerHTML = `
        <div class="card-label">Upgrade-System</div>
        <strong>Keine Upgrade-Knoten verfügbar</strong>
        <span>Die Daten für das Upgrade-Menü konnten nicht vollständig geladen werden. Bitte Seite neu laden.</span>
      `;
      ui.skillTreeMap.appendChild(emptyState);
      return;
    }

    const viewport = document.createElement('div');
    viewport.className = 'skill-tree-viewport';
    viewport.innerHTML = `
      <div class="skill-tree-toolbar" aria-label="Skill-Tree Steuerung">
        <span class="skill-tree-toolbar__hint">Drag zum Verschieben · Wheel/Pinch zum Zoomen</span>
        <div class="skill-tree-toolbar__actions">
          <button class="ghost-btn" type="button" data-zoom="reset">Zentrieren</button>
        </div>
      </div>
      <div class="skill-tree-viewport__window">
        <div class="skill-tree-content"></div>
      </div>
    `;

    const content = viewport.querySelector('.skill-tree-content');
    content.style.width = `${SKILL_TREE_CANVAS.width}px`;
    content.style.height = `${SKILL_TREE_CANVAS.height}px`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'skill-tree-connections');
    svg.setAttribute('viewBox', `0 0 ${SKILL_TREE_CANVAS.width} ${SKILL_TREE_CANVAS.height}`);
    svg.setAttribute('aria-hidden', 'true');

    data.connections.forEach((connection) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', connection.path);
      path.setAttribute('stroke', connection.accent);
      path.setAttribute('class', 'skill-tree-connection');
      svg.appendChild(path);
    });

    const nodesLayer = document.createElement('div');
    nodesLayer.className = 'skill-tree-nodes';

    data.branches.forEach((branch) => nodesLayer.appendChild(createBranchMarker(branch)));

    const shouldSuppressSelection = () => Date.now() < getSkillTreeViewState().suppressClickUntil;
    data.nodes.forEach((node) => {
      const wrap = document.createElement('div');
      wrap.className = `skill-tree-node-wrap skill-tree-node-wrap--${node.branchId || 'root'}`;
      wrap.style.left = `${node.x}px`;
      wrap.style.top = `${node.y}px`;
      wrap.appendChild(createNodeButton(node, selectedKey, { onSelect: selectSkillTreeNode, shouldSuppressSelection }));
      nodesLayer.appendChild(wrap);
    });

    const detailOverlay = selectedNode ? renderSkillTreeDetails(selectedNode) : null;
    if (detailOverlay) content.append(svg, nodesLayer, detailOverlay);
    else content.append(svg, nodesLayer);
    ui.skillTreeMap.appendChild(viewport);
    attachSkillTreeViewport(viewport, content);

    const viewportWindow = viewport.querySelector('.skill-tree-viewport__window');
    viewportWindow.addEventListener('click', (event) => {
      if (shouldSuppressSelection()) return;
      if (event.target.closest('[data-node-key]')) return;
      if (event.target.closest('[data-node-detail="true"]')) return;
      if (!state.ui.activeSkillTreeNode) return;
      closeSkillTreeDetails();
    });
  }

  function renderUpgradesScreen() {
    if (ui.upgradeCredits) ui.upgradeCredits.textContent = String(profile.credits);
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
    if (mission.type === 'boss') {
      const group = getCampaignGroupDefinition(mission.campaignGroupId || 'earth');
      const accessWorld = getWorldDefinition(mission.world);
      ui.selectedMissionLabel.textContent = `${group.name} · ${mission.name}`;
      ui.selectedMissionStatus.textContent = `Gruppen-Endboss · ${helpers.isBossMissionUnlocked(mission.id) ? 'Unlocked' : 'Locked'} · Zugang über ${accessWorld.themeName} · Spezial: ${specialAbility.name}`;
    } else {
      ui.selectedMissionLabel.textContent = `${worldDef.themeName} · Level ${mission.level}`;
      ui.selectedMissionStatus.textContent = `${WAVES_PER_LEVEL} Waves · ${helpers.isLevelUnlocked(mission.world, mission.level) ? 'Unlocked' : 'Locked'} · ${worldDef.hudBadge} · Spezial: ${specialAbility.name}`;
    }
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
    const snapshot = state.pendingResult || null;
    const mission = snapshot?.mission || state.currentMission || { type: 'level', world: state.worldIndex, level: state.levelIndex };
    const bossState = snapshot?.boss || state.boss;
    ui.resultEyebrow.textContent = success ? 'MISSION COMPLETE' : 'EINSATZ BEENDET';
    ui.resultTitle.textContent = success
      ? mission.type === 'boss'
        ? `${bossState.name || mission.label || 'Boss'} besiegt`
        : `${getWorldDefinition(state.worldIndex).themeName} · Level ${state.levelIndex} gesichert`
      : mission.type === 'boss'
        ? 'Bosskampf gescheitert'
        : 'Outpost verloren';
    ui.resultSummary.textContent = success
      ? mission.type === 'boss'
        ? `${bossState.name || mission.label || 'Boss'} überwunden. Finale Phase: ${bossState.phase} / ${bossState.phaseCount}`
        : `Alle ${WAVES_PER_LEVEL} Waves abgeschlossen. Höchste Schwierigkeitswelle: ${state.wave}`
      : mission.type === 'boss'
        ? `Bossphase erreicht: ${bossState.phase} / ${bossState.phaseCount}`
        : `Erreichte Welle: ${state.wave}`;
    ui.finalWave.textContent = String(snapshot?.wave ?? state.wave);
    ui.finalScore.textContent = String(snapshot?.score ?? state.score);
    ui.finalCredits.textContent = String(snapshot?.credits ?? state.runCredits);
    const nextMission = mission.type === 'boss' ? null : actions.getNextMission(state.worldIndex, state.levelIndex);
    ui.nextLevelBtn.classList.toggle('hidden', !success || !nextMission || !helpers.isLevelUnlocked(nextMission.world, nextMission.level));
  }

  return { setMenuScreen, openMenu, renderMenu, showRunResult };
}
