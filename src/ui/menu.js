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
    accent: '#73d5ff',
    icon: '✹',
    anchor: { x: 420, y: 350 },
    nodeKeys: SPECIAL_ABILITY_DEFS.map((ability) => `special:${ability.id}`),
    positions: [
      { x: 250, y: 190 },
      { x: 430, y: 150 },
      { x: 610, y: 190 },
      { x: 420, y: 280 },
    ],
  },
  {
    id: 'arsenal',
    label: 'Arsenal',
    accent: '#ffb55b',
    icon: '⬒',
    anchor: { x: 1180, y: 350 },
    nodeKeys: ['upgrade:baseDamage', 'upgrade:attackSpeed', 'upgrade:maxHealth', 'upgrade:movementSpeed'],
    positions: [
      { x: 1010, y: 190 },
      { x: 1190, y: 150 },
      { x: 1370, y: 190 },
      { x: 1180, y: 280 },
    ],
  },
  {
    id: 'powerUps',
    label: 'Power Ups',
    accent: '#8dffd5',
    icon: '⚡',
    anchor: { x: 800, y: 790 },
    nodeKeys: ['upgrade:burnDamage', 'upgrade:poisonDamage', 'upgrade:slowDuration', 'upgrade:lightningRange', 'upgrade:rocketRadius', 'upgrade:shieldCapacity'],
    positions: [
      { x: 500, y: 690 },
      { x: 680, y: 610 },
      { x: 860, y: 610 },
      { x: 1040, y: 610 },
      { x: 620, y: 790 },
      { x: 980, y: 790 },
    ],
  },
];

const SKILL_TREE_CANVAS = { width: 1600, height: 1100, root: { x: 800, y: 420 } };
const SKILL_TREE_CAMERA = {
  minScale: 0.65,
  maxScale: 1.75,
  zoomStep: 0.15,
  dragThreshold: 8,
  suppressClickMs: 160,
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

  const badge = document.createElement('span');
  badge.className = 'skill-node__badge';
  badge.textContent = node.statusBadge;

  const icon = document.createElement('span');
  icon.className = 'skill-node__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = node.icon;

  const title = document.createElement('strong');
  title.className = 'skill-node__title';
  title.textContent = node.title;

  const level = document.createElement('span');
  level.className = 'skill-node__level';
  level.textContent = node.shortLevelLabel;

  const footer = document.createElement('div');
  footer.className = 'skill-node__footer';

  const status = document.createElement('span');
  status.className = 'skill-node__status';
  status.textContent = node.status;

  const cost = document.createElement('span');
  cost.className = 'skill-node__cost';
  cost.textContent = node.shortCostLabel;

  footer.append(status, cost);
  button.append(badge, icon, title, level, footer);
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
    <div>
      <span class="card-label">Hauptast</span>
      <strong>${branch.label}</strong>
    </div>
  `;
  return marker;
}

function createConnectionPath(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    if (index === points.length - 1) {
      const curveStrength = Math.max(30, Math.abs(next.x - prev.x) * 0.35);
      path += ` C ${prev.x} ${prev.y + 28}, ${next.x - Math.sign(next.x - prev.x || 1) * curveStrength} ${next.y - 30}, ${next.x} ${next.y}`;
    } else {
      path += ` L ${next.x} ${next.y}`;
    }
  }
  return path;
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
      const nodes = branch.nodeKeys.map((key, index) => {
        const [type, id] = key.split(':');
        const node = type === 'special'
          ? buildSpecialAbilityNode(getSpecialAbilityDef(id))
          : buildUpgradeNode(id);
        if (!node) return null;
        const position = branch.positions[index] || branch.anchor;
        node.x = position.x;
        node.y = position.y;
        node.branchId = branch.id;
        nodeMap.set(node.key, node);
        layoutNodes.push(node);
        connections.push({
          key: `${branch.id}:${node.key}`,
          accent: branch.accent,
          path: createConnectionPath([
            SKILL_TREE_CANVAS.root,
            { x: branch.anchor.x, y: branch.anchor.y },
            { x: node.x, y: node.y },
          ]),
        });
        return node;
      }).filter(Boolean);

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

  function renderSkillTreeDetails(node) {
    if (!ui.skillTreeDetails) return;
    ui.skillTreeDetails.innerHTML = '';
    ui.skillTreeDetails.style.setProperty('--detail-accent', node?.accent || '#73d5ff');
    ui.skillTreeDetails.classList.toggle('hidden', !node);

    if (!node) return;

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
      label: 'Schließen',
      onClick: closeSkillTreeDetails,
    });
    closeButton.classList.add('skill-tree-details__close');

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
    ui.skillTreeDetails.append(header, body);
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

    rootEl.querySelector('[data-zoom="in"]')?.addEventListener('click', () => {
      const rect = viewport.getBoundingClientRect();
      zoomAt(view.scale + SKILL_TREE_CAMERA.zoomStep, rect.width / 2, rect.height / 2);
    });
    rootEl.querySelector('[data-zoom="out"]')?.addEventListener('click', () => {
      const rect = viewport.getBoundingClientRect();
      zoomAt(view.scale - SKILL_TREE_CAMERA.zoomStep, rect.width / 2, rect.height / 2);
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
      renderSkillTreeDetails(null);
      return;
    }

    const viewport = document.createElement('div');
    viewport.className = 'skill-tree-viewport';
    viewport.innerHTML = `
      <div class="skill-tree-toolbar" aria-label="Skill-Tree Steuerung">
        <span class="skill-tree-toolbar__hint">Drag zum Verschieben · Wheel/Pinch zum Zoomen</span>
        <div class="skill-tree-toolbar__actions">
          <button class="ghost-btn" type="button" data-zoom="out" aria-label="Rauszoomen">−</button>
          <button class="ghost-btn" type="button" data-zoom="in" aria-label="Reinzoomen">＋</button>
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

    content.append(svg, nodesLayer);
    ui.skillTreeMap.appendChild(viewport);
    attachSkillTreeViewport(viewport, content);
    renderSkillTreeDetails(selectedNode);
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
