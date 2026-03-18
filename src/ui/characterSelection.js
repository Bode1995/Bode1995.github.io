export function setupCharacterSelection({
  THREE,
  ui,
  characterDefs,
  createCharacterRig,
  animateCharacterRig,
  onSelectCharacter,
  isSelectedCharacter,
}) {
  const previewCards = [];

  function renderStatRow(label, value, accent) {
    const maxValue = 5;
    return `
      <div class="character-stat-row">
        <span>${label}</span>
        <div class="character-stat-bar"><div style="width:${(Math.max(0, Math.min(maxValue, value)) / maxValue) * 100}%;background:${accent}"></div></div>
      </div>
    `;
  }

  function createCharacterCard(def) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-card card-surface';
    button.dataset.characterId = def.id;

    const accentColor = `#${(def.accent || 0xffffff).toString(16).padStart(6, '0')}`;
    button.style.setProperty('--character-accent', accentColor);

    const meta = document.createElement('div');
    meta.className = 'character-meta';
    meta.innerHTML = `
      <div class="character-meta-stack">
        <span class="card-chip">${def.roleLabel || 'Pilot'}</span>
        <span class="character-weapon-chip">${def.weaponLabel || def.weapon || 'Weapon'}</span>
      </div>
      <span class="character-accent-dot"></span>
    `;

    const label = document.createElement('div');
    label.className = 'character-name';
    label.textContent = def.name;

    const playstyle = document.createElement('div');
    playstyle.className = 'character-playstyle';
    playstyle.textContent = def.playstyleLabel || 'Adaptive combat frame';

    const subline = document.createElement('div');
    subline.className = 'character-subline';
    subline.textContent = def.classSummary || def.tagline || 'Adaptive combat frame';

    const traitList = document.createElement('div');
    traitList.className = 'character-traits';
    (def.traitTags || []).forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'character-trait';
      tagEl.textContent = tag;
      traitList.append(tagEl);
    });

    const stats = document.createElement('div');
    stats.className = 'character-stats';
    stats.innerHTML = [
      renderStatRow('Mobility', def.uiStats?.mobility || 1, 'linear-gradient(90deg, #66ffd8, #35f3d1)'),
      renderStatRow('Power', def.uiStats?.power || 1, 'linear-gradient(90deg, #ffcf82, #ff8c5d)'),
      renderStatRow('Control', def.uiStats?.control || 1, 'linear-gradient(90deg, #d2a6ff, #9f7dff)'),
    ].join('');

    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'character-preview';
    previewCanvas.width = 220;
    previewCanvas.height = 160;

    button.append(meta, previewCanvas, label, playstyle, subline, traitList, stats);
    ui.characterGrid.append(button);

    const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    previewRenderer.setSize(previewCanvas.width, previewCanvas.height, false);

    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(48, previewCanvas.width / previewCanvas.height, 0.1, 30);
    previewCamera.position.set(0, 3.25, 5.6);
    previewCamera.lookAt(0, 1.45, 0);

    previewScene.add(new THREE.HemisphereLight(0xa8bfff, 0x150f22, 0.72));
    const key = new THREE.DirectionalLight(def.accent || 0xffffff, 1.05);
    key.position.set(3.2, 5.8, 3.6);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(0x8fffea, 0.4);
    fill.position.set(-3.5, 2.5, 1.4);
    previewScene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.45, 0.24, 32),
      new THREE.MeshStandardMaterial({ color: 0x130f22, emissive: def.emissive, emissiveIntensity: 0.22, roughness: 0.78, metalness: 0.15 })
    );
    floor.position.y = -0.08;
    previewScene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.05, 12, 40),
      new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    previewScene.add(ring);

    const rig = createCharacterRig(def);
    rig.root.position.y = 0.08;
    previewScene.add(rig.root);

    button.addEventListener('click', () => {
      onSelectCharacter(def.id);
      refresh();
    });

    button.addEventListener('pointerenter', () => button.classList.add('is-hovered'));
    button.addEventListener('pointerleave', () => button.classList.remove('is-hovered'));

    return { def, button, previewRenderer, previewScene, previewCamera, rig, ring };
  }

  function refresh() {
    for (const card of previewCards) {
      card.button.classList.toggle('is-selected', isSelectedCharacter(card.def.id));
    }
  }

  for (const def of characterDefs) {
    previewCards.push(createCharacterCard(def));
  }
  refresh();

  return {
    refresh,
    renderPreviews(elapsed) {
      for (const [index, card] of previewCards.entries()) {
        card.ring.rotation.z = elapsed * 0.26;
        card.ring.material.opacity = 0.55 + Math.sin(elapsed * 2.4 + index) * 0.18;
        card.rig.root.rotation.y = elapsed * 0.52;
        animateCharacterRig(card.rig, 0.18, elapsed + index, true);
        card.previewRenderer.render(card.previewScene, card.previewCamera);
      }
    },
  };
}
