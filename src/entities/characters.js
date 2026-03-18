export function createCharacterModule(THREE, characterDefs) {
  const sharedGeometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    chest: new THREE.BoxGeometry(1, 1, 1),
    arm: new THREE.BoxGeometry(0.28, 1.05, 0.28),
    forearm: new THREE.BoxGeometry(0.22, 0.7, 0.22),
    leg: new THREE.BoxGeometry(0.34, 1.1, 0.34),
    shin: new THREE.BoxGeometry(0.28, 0.78, 0.28),
    foot: new THREE.BoxGeometry(0.42, 0.24, 0.72),
    head: new THREE.BoxGeometry(0.78, 0.62, 0.72),
    visor: new THREE.BoxGeometry(0.46, 0.18, 0.08),
    shoulder: new THREE.BoxGeometry(0.48, 0.24, 0.88),
    cylinder: new THREE.CylinderGeometry(0.2, 0.2, 1, 10),
    cone: new THREE.ConeGeometry(0.24, 0.8, 10),
    weaponBarrel: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10),
    knee: new THREE.CylinderGeometry(0.16, 0.16, 0.16, 10),
  };

  function createMaterialPalette(def) {
    return {
      base: new THREE.MeshStandardMaterial({ color: def.base, emissive: def.emissive, emissiveIntensity: 0.32, roughness: 0.3, metalness: 0.26 }),
      dark: new THREE.MeshStandardMaterial({ color: def.dark, roughness: 0.66, metalness: 0.12 }),
      accent: new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.2, roughness: 0.22, metalness: 0.36 }),
      trim: new THREE.MeshStandardMaterial({ color: 0xf6ebff, emissive: def.accent, emissiveIntensity: 0.12, roughness: 0.18, metalness: 0.42 }),
    };
  }

  function addMesh(parent, geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function createCharacterRig(def) {
    const palette = createMaterialPalette(def);
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    addMesh(bodyPivot, sharedGeometries.chest, palette.base, [0, 1.46, 0], [0, 0, 0], [1.05 * def.bodyScale[0], 1.28 * def.bodyScale[1], 0.88 * def.bodyScale[2]]);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.35, -0.12], [0.08, 0, 0], [0.88, 0.9, 0.58]);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.78, 0.37], [0, 0, 0], [0.4, 0.18, 0.08]);
    addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.18, 0.39], [0, 0, 0], [0.58, 0.12, 0.06]);

    const head = new THREE.Group();
    head.position.set(0, 2.38, 0.02);
    bodyPivot.add(head);
    addMesh(head, sharedGeometries.head, palette.base, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    addMesh(head, sharedGeometries.visor, palette.accent, [0, 0.02, 0.37], [0, 0, 0], [1.05, 1, 1]);
    addMesh(head, sharedGeometries.box, palette.dark, [0, -0.08, -0.18], [0.12, 0, 0], [0.84, 0.22, 0.62]);

    if (def.head === 'antenna') {
      addMesh(head, sharedGeometries.cylinder, palette.dark, [0.12, 0.52, -0.12], [0, 0, 0], [0.22, 0.5, 0.22]);
      addMesh(head, sharedGeometries.cone, palette.accent, [0.12, 0.9, -0.12], [0, 0, Math.PI], [0.28, 0.3, 0.28]);
    } else if (def.head === 'heavy') {
      addMesh(head, sharedGeometries.box, palette.dark, [0, 0.42, -0.08], [0, 0, 0], [1.15, 0.36, 0.86]);
      addMesh(head, sharedGeometries.box, palette.trim, [0, 0.26, 0.39], [0, 0, 0], [0.44, 0.08, 0.05]);
    } else if (def.head === 'crest') {
      addMesh(head, sharedGeometries.box, palette.accent, [0, 0.54, -0.16], [0.2, 0, 0], [0.22, 0.6, 0.82]);
    } else if (def.head === 'split') {
      addMesh(head, sharedGeometries.box, palette.dark, [-0.25, 0.28, 0], [0, 0.2, 0], [0.2, 0.8, 0.6]);
      addMesh(head, sharedGeometries.box, palette.dark, [0.25, 0.28, 0], [0, -0.2, 0], [0.2, 0.8, 0.6]);
    }

    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    leftArm.position.set(-0.78 * def.bodyScale[0], 1.9, 0.04);
    rightArm.position.set(0.78 * def.bodyScale[0], 1.9, 0.04);
    bodyPivot.add(leftArm, rightArm);

    addMesh(leftArm, sharedGeometries.arm, palette.dark, [0, -0.46, 0.02]);
    addMesh(rightArm, sharedGeometries.arm, palette.dark, [0, -0.46, 0.02]);
    addMesh(leftArm, sharedGeometries.forearm, palette.base, [0, -0.95, 0.08], [0.06, 0, 0], [1, 1.08, 1]);
    addMesh(rightArm, sharedGeometries.forearm, palette.base, [0, -0.95, 0.08], [0.06, 0, 0], [1, 1.08, 1]);

    if (def.shoulderPads) {
      addMesh(leftArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, 0.4], [0.42, 0.3, 0.82]);
      addMesh(rightArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, -0.4], [0.42, 0.3, 0.82]);
      addMesh(leftArm, sharedGeometries.box, palette.accent, [0.1, 0.06, 0.28], [0, 0.1, 0], [0.08, 0.16, 0.22]);
      addMesh(rightArm, sharedGeometries.box, palette.accent, [-0.1, 0.06, 0.28], [0, -0.1, 0], [0.08, 0.16, 0.22]);
    }

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-0.32, 0.92, 0);
    rightLeg.position.set(0.32, 0.92, 0);
    bodyPivot.add(leftLeg, rightLeg);

    const legScale = def.legType === 'long' ? [0.9, 1.3, 0.9] : def.legType === 'heavy' ? [1.2, 0.95, 1.2] : [1, 1, 1];
    const legTilt = def.legType === 'angled' ? 0.2 : def.legType === 'runner' ? 0.12 : 0;
    addMesh(leftLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [legTilt, 0, 0], legScale);
    addMesh(rightLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [-legTilt, 0, 0], legScale);
    addMesh(leftLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [legTilt * 0.3, 0, 0], [1, 1.06, 1]);
    addMesh(rightLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [-legTilt * 0.3, 0, 0], [1, 1.06, 1]);
    addMesh(leftLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(rightLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(leftLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], [0.98, 1, 0.9]);
    addMesh(rightLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], [0.98, 1, 0.9]);

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(0.36, 1.6, 0.62);
    bodyPivot.add(weaponPivot);
    addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0, 0], [0, 0, 0], [0.26, 0.3, 1.52]);
    addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.02, 0.9], [Math.PI / 2, 0, 0], [1, 1, 0.86]);
    addMesh(weaponPivot, sharedGeometries.box, palette.trim, [0, 0.16, 0.18], [0, 0, 0], [0.14, 0.12, 0.84]);

    if (def.weapon === 'cannon') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.22, 0.18], [0, 0, 0], [0.54, 0.42, 0.84]);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, -0.18, 0.5], [0, 0, 0], [0.18, 0.18, 0.5]);
    } else if (def.weapon === 'bladegun') {
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, -0.24, 0.32], [0.6, 0, 0], [0.12, 0.74, 0.54]);
    } else if (def.weapon === 'smg') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.2, -0.2], [0, 0, 0], [0.3, 0.54, 0.25]);
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
    const secondary = Math.sin(time * 7.2 + (isPreview ? 0.6 : 0)) * 0.02;

    rig.bodyPivot.position.y = 0.95 + bounce;
    rig.bodyPivot.rotation.x = -0.18 * runStrength + idleSway * 0.6;
    rig.bodyPivot.rotation.z = idleSway;
    rig.leftLeg.rotation.x = Math.sin(runPhase) * 0.9 * runStrength;
    rig.rightLeg.rotation.x = Math.sin(runPhase + Math.PI) * 0.9 * runStrength;
    rig.leftArm.rotation.x = Math.sin(runPhase + Math.PI) * 0.55 * runStrength - 0.1;
    rig.rightArm.rotation.x = Math.sin(runPhase) * 0.55 * runStrength - 0.1;
    rig.leftArm.rotation.z = -0.03 - secondary;
    rig.rightArm.rotation.z = 0.03 + secondary;

    const breathe = Math.sin(time * 2.2) * (0.045 + 0.04 * (1 - runStrength));
    rig.head.position.y = 2.38 + breathe;
    rig.head.rotation.y = Math.sin(time * 1.7) * 0.08;
    rig.weaponPivot.rotation.x = -0.05 + Math.sin(time * 6.2) * 0.015 * (1 - runStrength);
    rig.weaponPivot.rotation.z = secondary * 0.8;
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
