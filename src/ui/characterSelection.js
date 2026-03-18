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

  function createCharacterCard(def) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-card';
    button.dataset.characterId = def.id;

    const label = document.createElement('div');
    label.className = 'character-name';
    label.textContent = def.name;

    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'character-preview';
    previewCanvas.width = 180;
    previewCanvas.height = 140;

    button.append(previewCanvas, label);
    ui.characterGrid.append(button);

    const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    previewRenderer.setSize(previewCanvas.width, previewCanvas.height, false);

    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(50, previewCanvas.width / previewCanvas.height, 0.1, 30);
    previewCamera.position.set(0, 3.3, 5.2);
    previewCamera.lookAt(0, 1.2, 0);

    previewScene.add(new THREE.HemisphereLight(0xbfe9ff, 0x10223a, 0.8));
    const pDir = new THREE.DirectionalLight(0xffffff, 0.9);
    pDir.position.set(3, 6, 3);
    previewScene.add(pDir);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x15324b, roughness: 0.85, metalness: 0.05 })
    );
    floor.position.y = -0.1;
    previewScene.add(floor);

    const rig = createCharacterRig(def);
    rig.root.position.y = 0.1;
    previewScene.add(rig.root);

    button.addEventListener('click', () => {
      onSelectCharacter(def.id);
      refresh();
    });

    button.addEventListener('pointerenter', () => button.classList.add('is-hovered'));
    button.addEventListener('pointerleave', () => button.classList.remove('is-hovered'));

    return { def, button, previewRenderer, previewScene, previewCamera, rig };
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
        card.rig.root.rotation.y = elapsed * 0.5;
        animateCharacterRig(card.rig, 0.12, elapsed + index, true);
        card.previewRenderer.render(card.previewScene, card.previewCamera);
      }
    },
  };
}
