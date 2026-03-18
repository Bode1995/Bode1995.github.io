export function createCharacterModule(THREE, characterDefs) {
  const sharedGeometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    arm: new THREE.BoxGeometry(0.28, 1.05, 0.28),
    leg: new THREE.BoxGeometry(0.32, 1.1, 0.32),
    foot: new THREE.BoxGeometry(0.42, 0.24, 0.72),
    head: new THREE.BoxGeometry(0.78, 0.62, 0.72),
    visor: new THREE.BoxGeometry(0.46, 0.18, 0.08),
    cylinder: new THREE.CylinderGeometry(0.2, 0.2, 1, 8),
    cone: new THREE.ConeGeometry(0.24, 0.8, 8),
    weaponBarrel: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8),
  };

  function createMaterialPalette(def) {
    return {
      base: new THREE.MeshStandardMaterial({ color: def.base, emissive: def.emissive, roughness: 0.42, metalness: 0.18 }),
      dark: new THREE.MeshStandardMaterial({ color: def.dark, roughness: 0.7, metalness: 0.08 }),
      accent: new THREE.MeshStandardMaterial({ color: def.accent, emissive: 0x223344, roughness: 0.35, metalness: 0.26 }),
    };
  }

  function addMesh(parent, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  function createCharacterRig(def) {
    const palette = createMaterialPalette(def);
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    addMesh(bodyPivot, sharedGeometries.box, palette.base, [0, 1.45, 0], [0, 0, 0], [1.05 * def.bodyScale[0], 1.25 * def.bodyScale[1], 0.84 * def.bodyScale[2]]);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 2.1, -0.12], [0.14, 0, 0], [0.92, 0.3, 0.6]);

    const head = new THREE.Group();
    head.position.set(0, 2.35, 0.02);
    bodyPivot.add(head);
    addMesh(head, sharedGeometries.head, palette.base, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    addMesh(head, sharedGeometries.visor, palette.accent, [0, 0.02, 0.37]);

    if (def.head === 'antenna') {
      addMesh(head, sharedGeometries.cylinder, palette.dark, [0.12, 0.52, -0.12], [0, 0, 0], [0.22, 0.5, 0.22]);
      addMesh(head, sharedGeometries.cone, palette.accent, [0.12, 0.9, -0.12], [0, 0, Math.PI], [0.28, 0.3, 0.28]);
    } else if (def.head === 'heavy') {
      addMesh(head, sharedGeometries.box, palette.dark, [0, 0.42, -0.08], [0, 0, 0], [1.15, 0.36, 0.86]);
    } else if (def.head === 'crest') {
      addMesh(head, sharedGeometries.box, palette.accent, [0, 0.54, -0.16], [0.2, 0, 0], [0.22, 0.6, 0.82]);
    } else if (def.head === 'split') {
      addMesh(head, sharedGeometries.box, palette.dark, [-0.25, 0.28, 0], [0, 0.2, 0], [0.2, 0.8, 0.6]);
      addMesh(head, sharedGeometries.box, palette.dark, [0.25, 0.28, 0], [0, -0.2, 0], [0.2, 0.8, 0.6]);
    }

    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    leftArm.position.set(-0.78 * def.bodyScale[0], 1.88, 0);
    rightArm.position.set(0.78 * def.bodyScale[0], 1.88, 0);
    bodyPivot.add(leftArm, rightArm);

    addMesh(leftArm, sharedGeometries.arm, palette.dark, [0, -0.52, 0]);
    addMesh(rightArm, sharedGeometries.arm, palette.dark, [0, -0.52, 0]);

    if (def.shoulderPads) {
      addMesh(leftArm, sharedGeometries.box, palette.base, [0, 0.1, 0], [0, 0, 0.4], [0.4, 0.3, 0.8]);
      addMesh(rightArm, sharedGeometries.box, palette.base, [0, 0.1, 0], [0, 0, -0.4], [0.4, 0.3, 0.8]);
    }

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-0.32, 0.9, 0);
    rightLeg.position.set(0.32, 0.9, 0);
    bodyPivot.add(leftLeg, rightLeg);

    const legScale = def.legType === 'long' ? [0.9, 1.3, 0.9] : def.legType === 'heavy' ? [1.2, 0.95, 1.2] : [1, 1, 1];
    const legTilt = def.legType === 'angled' ? 0.2 : def.legType === 'runner' ? 0.12 : 0;
    addMesh(leftLeg, sharedGeometries.leg, palette.dark, [0, -0.56, 0.04], [legTilt, 0, 0], legScale);
    addMesh(rightLeg, sharedGeometries.leg, palette.dark, [0, -0.56, 0.04], [-legTilt, 0, 0], legScale);
    addMesh(leftLeg, sharedGeometries.foot, palette.base, [0, -1.14, 0.17], [0, 0, 0], [0.95, 1, 0.85]);
    addMesh(rightLeg, sharedGeometries.foot, palette.base, [0, -1.14, 0.17], [0, 0, 0], [0.95, 1, 0.85]);

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(0.36, 1.58, 0.62);
    bodyPivot.add(weaponPivot);
    addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0, 0], [0, 0, 0], [0.24, 0.28, 1.4]);
    addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.02, 0.82], [Math.PI / 2, 0, 0], [1, 1, 0.8]);

    if (def.weapon === 'cannon') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.22, 0.18], [0, 0, 0], [0.5, 0.36, 0.8]);
    } else if (def.weapon === 'bladegun') {
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, -0.24, 0.32], [0.6, 0, 0], [0.12, 0.7, 0.5]);
    } else if (def.weapon === 'smg') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.2, -0.2], [0, 0, 0], [0.28, 0.5, 0.25]);
    } else if (def.weapon === 'carbine') {
      addMesh(weaponPivot, sharedGeometries.cone, palette.accent, [0, -0.02, 1.18], [Math.PI / 2, 0, 0], [0.22, 0.4, 0.22]);
    }

    return {
      id: def.id,
      root,
      bodyPivot,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weaponPivot,
    };
  }

  function animateCharacterRig(rig, motion, time, isPreview = false) {
    const runPhase = time * 11;
    const runStrength = THREE.MathUtils.clamp(motion, 0, 1);
    const bounce = Math.sin(runPhase * 2) * 0.11 * runStrength;
    const idleSway = Math.sin(time * 2.3 + (isPreview ? 1.5 : 0)) * 0.035;

    rig.bodyPivot.position.y = 0.95 + bounce;
    rig.bodyPivot.rotation.x = -0.18 * runStrength + idleSway * 0.6;
    rig.bodyPivot.rotation.z = idleSway;
    rig.leftLeg.rotation.x = Math.sin(runPhase) * 0.9 * runStrength;
    rig.rightLeg.rotation.x = Math.sin(runPhase + Math.PI) * 0.9 * runStrength;
    rig.leftArm.rotation.x = Math.sin(runPhase + Math.PI) * 0.55 * runStrength - 0.1;
    rig.rightArm.rotation.x = Math.sin(runPhase) * 0.55 * runStrength - 0.1;

    const breathe = Math.sin(time * 2.2) * (0.045 + 0.04 * (1 - runStrength));
    rig.head.position.y = 2.35 + breathe;
    rig.head.rotation.y = Math.sin(time * 1.7) * 0.08;
    rig.weaponPivot.rotation.x = -0.05 + Math.sin(time * 6.2) * 0.015 * (1 - runStrength);
  }

  function getCharacterDef(characterId, fallbackId = characterDefs[0]?.id) {
    return characterDefs.find((character) => character.id === characterId) || characterDefs.find((character) => character.id === fallbackId) || characterDefs[0];
  }

  return {
    characterDefs,
    createCharacterRig,
    animateCharacterRig,
    getCharacterDef,
  };
}
