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
    fin: new THREE.BoxGeometry(0.14, 0.7, 0.56),
    plate: new THREE.BoxGeometry(0.78, 0.18, 0.62),
    pod: new THREE.CapsuleGeometry(0.14, 0.34, 4, 8),
  };

  function createMaterialPalette(def) {
    return {
      base: new THREE.MeshStandardMaterial({ color: def.base, emissive: def.emissive, emissiveIntensity: 0.32, roughness: 0.28, metalness: 0.28 }),
      dark: new THREE.MeshStandardMaterial({ color: def.dark, roughness: 0.68, metalness: 0.12 }),
      accent: new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.22, roughness: 0.22, metalness: 0.38 }),
      trim: new THREE.MeshStandardMaterial({ color: def.trim || 0xf6ebff, emissive: def.accent, emissiveIntensity: 0.12, roughness: 0.16, metalness: 0.46 }),
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

  function createVisualProfile(def) {
    const baseProfile = {
      chestScale: [1.05 * def.bodyScale[0], 1.28 * def.bodyScale[1], 0.88 * def.bodyScale[2]],
      backScale: [0.88, 0.9, 0.58],
      shoulderOffsetX: 0.78 * def.bodyScale[0],
      shoulderY: 1.9,
      legOffsetX: 0.32,
      hipScale: [0.66, 0.2, 0.52],
      waistScale: [0.58, 0.18, 0.42],
      visorScale: [1.05, 1, 1],
      headScale: [1, 1, 1],
      armScale: [1, 1, 1],
      forearmScale: [1, 1.08, 1],
      footScale: [0.98, 1, 0.9],
      weaponScale: [0.26, 0.3, 1.52],
      weaponTrimScale: [0.14, 0.12, 0.84],
      weaponBarrelScale: [1, 1, 0.86],
      weaponOffset: [0.36, 1.6, 0.62],
      chestStripe: true,
      thighArmor: false,
      backpack: false,
      skirtArmor: false,
      heelSpurs: false,
      antennaPair: false,
      forearmBlades: false,
      hipFins: false,
      chestCore: false,
      weaponPods: false,
    };

    if (def.silhouette === 'vanguard') {
      return {
        ...baseProfile,
        chestCore: true,
        thighArmor: true,
        weaponScale: [0.28, 0.32, 1.64],
      };
    }
    if (def.silhouette === 'strider') {
      return {
        ...baseProfile,
        chestScale: [0.94 * def.bodyScale[0], 1.1 * def.bodyScale[1], 0.78 * def.bodyScale[2]],
        backScale: [0.72, 0.72, 0.48],
        shoulderOffsetX: 0.68 * def.bodyScale[0],
        legOffsetX: 0.28,
        hipScale: [0.48, 0.16, 0.34],
        waistScale: [0.42, 0.12, 0.28],
        headScale: [0.88, 0.88, 0.98],
        armScale: [0.92, 1.08, 0.84],
        forearmScale: [0.78, 1.2, 0.78],
        footScale: [0.84, 0.82, 1.08],
        weaponScale: [0.2, 0.2, 1.42],
        weaponTrimScale: [0.08, 0.08, 1.06],
        weaponOffset: [0.28, 1.56, 0.68],
        antennaPair: true,
        heelSpurs: true,
      };
    }
    if (def.silhouette === 'bulwark') {
      return {
        ...baseProfile,
        chestScale: [1.28 * def.bodyScale[0], 1.42 * def.bodyScale[1], 1.02 * def.bodyScale[2]],
        backScale: [1.1, 1.08, 0.78],
        shoulderOffsetX: 0.9 * def.bodyScale[0],
        shoulderY: 1.98,
        legOffsetX: 0.38,
        hipScale: [0.86, 0.26, 0.72],
        waistScale: [0.74, 0.22, 0.6],
        headScale: [1.12, 1.06, 1.08],
        armScale: [1.18, 1.04, 1.2],
        forearmScale: [1.16, 1.14, 1.18],
        footScale: [1.2, 1.04, 1.14],
        weaponScale: [0.42, 0.48, 1.72],
        weaponTrimScale: [0.2, 0.18, 0.72],
        weaponBarrelScale: [1.3, 1.3, 1.12],
        weaponOffset: [0.42, 1.68, 0.7],
        backpack: true,
        skirtArmor: true,
        chestCore: true,
        weaponPods: true,
      };
    }
    if (def.silhouette === 'warden') {
      return {
        ...baseProfile,
        chestScale: [1.02 * def.bodyScale[0], 1.16 * def.bodyScale[1], 0.8 * def.bodyScale[2]],
        backScale: [0.74, 0.82, 0.44],
        shoulderOffsetX: 0.72 * def.bodyScale[0],
        legOffsetX: 0.31,
        hipScale: [0.62, 0.18, 0.34],
        waistScale: [0.4, 0.14, 0.26],
        headScale: [0.96, 1.02, 0.92],
        armScale: [0.9, 1.02, 0.88],
        forearmScale: [0.92, 1.1, 0.88],
        footScale: [0.9, 0.94, 0.84],
        weaponScale: [0.22, 0.24, 1.44],
        weaponTrimScale: [0.08, 0.1, 1.04],
        weaponOffset: [0.32, 1.62, 0.58],
        forearmBlades: true,
        hipFins: true,
      };
    }
    return {
      ...baseProfile,
      chestScale: [0.88 * def.bodyScale[0], 1.02 * def.bodyScale[1], 0.76 * def.bodyScale[2]],
      backScale: [0.68, 0.7, 0.42],
      shoulderOffsetX: 0.7 * def.bodyScale[0],
      legOffsetX: 0.28,
      hipScale: [0.5, 0.14, 0.28],
      waistScale: [0.38, 0.1, 0.22],
      headScale: [0.86, 0.92, 0.88],
      armScale: [0.88, 0.96, 0.82],
      forearmScale: [0.76, 1.18, 0.74],
      footScale: [0.78, 0.8, 1.02],
      weaponScale: [0.18, 0.2, 1.2],
      weaponTrimScale: [0.07, 0.08, 0.82],
      weaponOffset: [0.24, 1.55, 0.64],
      thighArmor: true,
      heelSpurs: true,
      weaponPods: true,
    };
  }

  function buildWeapon(weaponPivot, palette, def, visuals) {
    addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0, 0], [0, 0, 0], visuals.weaponScale);
    addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.02, 0.9], [Math.PI / 2, 0, 0], visuals.weaponBarrelScale);
    addMesh(weaponPivot, sharedGeometries.box, palette.trim, [0, 0.16, 0.18], [0, 0, 0], visuals.weaponTrimScale);

    if (def.weapon === 'cannon') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.24, 0.24], [0, 0, 0], [0.64, 0.54, 1.02]);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, -0.22, 0.52], [0, 0, 0], [0.22, 0.2, 0.56]);
      addMesh(weaponPivot, sharedGeometries.cylinder, palette.dark, [0.22, -0.04, 0.06], [Math.PI / 2, 0, 0], [0.24, 0.34, 0.24]);
      addMesh(weaponPivot, sharedGeometries.cylinder, palette.dark, [-0.22, -0.04, 0.06], [Math.PI / 2, 0, 0], [0.24, 0.34, 0.24]);
    } else if (def.weapon === 'bladegun') {
      addMesh(weaponPivot, sharedGeometries.fin, palette.accent, [0.22, -0.14, 0.28], [0.7, 0.2, 0.16], [1, 1, 1]);
      addMesh(weaponPivot, sharedGeometries.fin, palette.accent, [-0.22, -0.14, 0.28], [0.7, -0.2, -0.16], [1, 1, 1]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.22, 0.4], [0.4, 0, 0], [0.18, 0.86, 0.68]);
    } else if (def.weapon === 'smg') {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0.22, -0.2, -0.12], [0, 0, 0], [0.18, 0.46, 0.28]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [-0.22, -0.2, -0.12], [0, 0, 0], [0.18, 0.46, 0.28]);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0.22, 0, 0.82], [0, 0, 0], [0.08, 0.08, 0.62]);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [-0.22, 0, 0.82], [0, 0, 0], [0.08, 0.08, 0.62]);
    } else if (def.weapon === 'carbine') {
      addMesh(weaponPivot, sharedGeometries.cone, palette.accent, [0, -0.02, 1.2], [Math.PI / 2, 0, 0], [0.18, 0.34, 0.18]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.14, -0.18], [0, 0, 0], [0.14, 0.42, 0.32]);
    } else {
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.06, 0.34], [0, 0, 0], [0.2, 0.16, 0.76]);
    }

    if (visuals.weaponPods) {
      addMesh(weaponPivot, sharedGeometries.pod, palette.trim, [0.28, 0.2, 0.12], [0, 0, Math.PI / 2], [0.82, 1, 0.82]);
      addMesh(weaponPivot, sharedGeometries.pod, palette.trim, [-0.28, 0.2, 0.12], [0, 0, Math.PI / 2], [0.82, 1, 0.82]);
    }
  }

  function createCharacterRig(def) {
    const palette = createMaterialPalette(def);
    const visuals = createVisualProfile(def);
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    addMesh(bodyPivot, sharedGeometries.chest, palette.base, [0, 1.46, 0], [0, 0, 0], visuals.chestScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.34, -0.14], [0.08, 0, 0], visuals.backScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.8, 0.38], [0, 0, 0], [0.42, 0.16, 0.08]);
    if (visuals.chestStripe) addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.18, 0.39], [0, 0, 0], [0.58, 0.12, 0.06]);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.04, 0.02], [0, 0, 0], visuals.hipScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 0.92, 0.12], [0, 0, 0], visuals.waistScale);

    if (visuals.chestCore) {
      addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.46, 0.42], [0, 0, 0], [0.22, 0.38, 0.06]);
      addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.46, 0.46], [0, 0, 0], [0.1, 0.2, 0.03]);
    }
    if (visuals.backpack) {
      addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.54, -0.54], [0.12, 0, 0], [0.54, 0.82, 0.44]);
      addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.84, -0.72], [0.12, 0, 0], [0.22, 0.22, 0.16]);
    }
    if (visuals.skirtArmor) {
      addMesh(bodyPivot, sharedGeometries.plate, palette.base, [0, 0.78, 0.26], [0.16, 0, 0], [1.08, 1, 0.94]);
      addMesh(bodyPivot, sharedGeometries.plate, palette.dark, [0, 0.78, -0.18], [-0.1, 0, 0], [0.92, 0.9, 0.7]);
    }
    if (visuals.hipFins) {
      addMesh(bodyPivot, sharedGeometries.fin, palette.accent, [0.48, 1.18, -0.02], [0, 0.18, 0.2], [0.74, 0.8, 0.7]);
      addMesh(bodyPivot, sharedGeometries.fin, palette.accent, [-0.48, 1.18, -0.02], [0, -0.18, -0.2], [0.74, 0.8, 0.7]);
    }

    const head = new THREE.Group();
    head.position.set(0, 2.38, 0.02);
    bodyPivot.add(head);
    addMesh(head, sharedGeometries.head, palette.base, [0, 0, 0], [0, 0, 0], visuals.headScale);
    addMesh(head, sharedGeometries.visor, palette.accent, [0, 0.02, 0.37], [0, 0, 0], visuals.visorScale);
    addMesh(head, sharedGeometries.box, palette.dark, [0, -0.08, -0.18], [0.12, 0, 0], [0.84, 0.22, 0.62]);

    if (def.head === 'antenna') {
      addMesh(head, sharedGeometries.cylinder, palette.dark, [0.12, 0.52, -0.12], [0, 0, 0], [0.22, 0.5, 0.22]);
      addMesh(head, sharedGeometries.cone, palette.accent, [0.12, 0.9, -0.12], [0, 0, Math.PI], [0.28, 0.3, 0.28]);
      if (visuals.antennaPair) {
        addMesh(head, sharedGeometries.cylinder, palette.dark, [-0.14, 0.48, -0.1], [0.08, 0, 0], [0.16, 0.46, 0.16]);
        addMesh(head, sharedGeometries.cone, palette.trim, [-0.14, 0.82, -0.1], [0, 0, Math.PI], [0.2, 0.22, 0.2]);
      }
    } else if (def.head === 'heavy') {
      addMesh(head, sharedGeometries.box, palette.dark, [0, 0.42, -0.08], [0, 0, 0], [1.15, 0.36, 0.86]);
      addMesh(head, sharedGeometries.box, palette.trim, [0, 0.26, 0.39], [0, 0, 0], [0.44, 0.08, 0.05]);
      addMesh(head, sharedGeometries.box, palette.base, [0, -0.16, 0.34], [0, 0, 0], [0.6, 0.12, 0.08]);
    } else if (def.head === 'crest') {
      addMesh(head, sharedGeometries.box, palette.accent, [0, 0.54, -0.16], [0.2, 0, 0], [0.22, 0.6, 0.82]);
      addMesh(head, sharedGeometries.box, palette.trim, [0, 0.12, 0.4], [0, 0, 0], [0.16, 0.26, 0.04]);
    } else if (def.head === 'split') {
      addMesh(head, sharedGeometries.box, palette.dark, [-0.25, 0.28, 0], [0, 0.2, 0], [0.2, 0.8, 0.6]);
      addMesh(head, sharedGeometries.box, palette.dark, [0.25, 0.28, 0], [0, -0.2, 0], [0.2, 0.8, 0.6]);
      addMesh(head, sharedGeometries.box, palette.accent, [0, 0.06, 0.4], [0, 0, 0], [0.28, 0.14, 0.04]);
    }

    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    leftArm.position.set(-visuals.shoulderOffsetX, visuals.shoulderY, 0.04);
    rightArm.position.set(visuals.shoulderOffsetX, visuals.shoulderY, 0.04);
    bodyPivot.add(leftArm, rightArm);

    addMesh(leftArm, sharedGeometries.arm, palette.dark, [0, -0.46, 0.02], [0, 0, 0], visuals.armScale);
    addMesh(rightArm, sharedGeometries.arm, palette.dark, [0, -0.46, 0.02], [0, 0, 0], visuals.armScale);
    addMesh(leftArm, sharedGeometries.forearm, palette.base, [0, -0.95, 0.08], [0.06, 0, 0], visuals.forearmScale);
    addMesh(rightArm, sharedGeometries.forearm, palette.base, [0, -0.95, 0.08], [0.06, 0, 0], visuals.forearmScale);

    if (def.shoulderPads) {
      addMesh(leftArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, 0.4], [0.42, 0.3, 0.82]);
      addMesh(rightArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, -0.4], [0.42, 0.3, 0.82]);
      addMesh(leftArm, sharedGeometries.box, palette.accent, [0.1, 0.06, 0.28], [0, 0.1, 0], [0.08, 0.16, 0.22]);
      addMesh(rightArm, sharedGeometries.box, palette.accent, [-0.1, 0.06, 0.28], [0, -0.1, 0], [0.08, 0.16, 0.22]);
    }
    if (visuals.forearmBlades) {
      addMesh(leftArm, sharedGeometries.fin, palette.accent, [-0.16, -0.9, 0.26], [0.32, 0, -0.18], [0.88, 0.94, 0.76]);
      addMesh(rightArm, sharedGeometries.fin, palette.accent, [0.16, -0.9, 0.26], [0.32, 0, 0.18], [0.88, 0.94, 0.76]);
    }

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-visuals.legOffsetX, 0.92, 0);
    rightLeg.position.set(visuals.legOffsetX, 0.92, 0);
    bodyPivot.add(leftLeg, rightLeg);

    const legScale = def.legType === 'long' ? [0.9, 1.3, 0.9] : def.legType === 'heavy' ? [1.2, 0.95, 1.2] : [1, 1, 1];
    const legTilt = def.legType === 'angled' ? 0.2 : def.legType === 'runner' ? 0.12 : 0;
    addMesh(leftLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [legTilt, 0, 0], legScale);
    addMesh(rightLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [-legTilt, 0, 0], legScale);
    addMesh(leftLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [legTilt * 0.3, 0, 0], [1, 1.06, 1]);
    addMesh(rightLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [-legTilt * 0.3, 0, 0], [1, 1.06, 1]);
    addMesh(leftLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(rightLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(leftLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], visuals.footScale);
    addMesh(rightLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], visuals.footScale);

    if (visuals.thighArmor) {
      addMesh(leftLeg, sharedGeometries.box, palette.base, [0, -0.08, 0.22], [0.18, 0, 0], [0.32, 0.48, 0.24]);
      addMesh(rightLeg, sharedGeometries.box, palette.base, [0, -0.08, 0.22], [0.18, 0, 0], [0.32, 0.48, 0.24]);
    }
    if (visuals.heelSpurs) {
      addMesh(leftLeg, sharedGeometries.fin, palette.trim, [0, -1.32, -0.12], [-0.24, 0, 0], [0.52, 0.44, 0.44]);
      addMesh(rightLeg, sharedGeometries.fin, palette.trim, [0, -1.32, -0.12], [-0.24, 0, 0], [0.52, 0.44, 0.44]);
    }

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(...visuals.weaponOffset);
    bodyPivot.add(weaponPivot);
    buildWeapon(weaponPivot, palette, def, visuals);

    const rig = {
      id: def.id,
      def,
      root,
      bodyPivot,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weaponPivot,
    };
    root.userData.characterDef = def;
    return rig;
  }

  function animateCharacterRig(rig, motion, time, isPreview = false) {
    const locomotion = rig?.def?.locomotionProfile || {};
    const runPhase = time * (locomotion.runCycleSpeed || 11);
    const runStrength = THREE.MathUtils.clamp(motion, 0, 1);
    const bounce = Math.sin(runPhase * 2) * (locomotion.bounce || 0.11) * runStrength;
    const idleSway = Math.sin(time * 2.3 + (isPreview ? 1.5 : 0)) * (locomotion.idleSway || 0.035);
    const secondary = Math.sin(time * 7.2 + (isPreview ? 0.6 : 0)) * 0.02;
    const armSwing = locomotion.armSwing || 0.55;
    const legSwing = locomotion.legSwing || 0.9;
    const bodyLean = locomotion.bodyLean || 0.18;
    const weaponSway = locomotion.weaponSway || 0.015;
    const animationProfile = locomotion.animationProfile || 'balanced';

    rig.bodyPivot.position.y = 0.95 + bounce;
    rig.bodyPivot.rotation.x = -bodyLean * runStrength + idleSway * 0.6;
    rig.bodyPivot.rotation.z = idleSway;
    rig.leftLeg.rotation.x = Math.sin(runPhase) * legSwing * runStrength;
    rig.rightLeg.rotation.x = Math.sin(runPhase + Math.PI) * legSwing * runStrength;
    rig.leftArm.rotation.x = Math.sin(runPhase + Math.PI) * armSwing * runStrength - 0.1;
    rig.rightArm.rotation.x = Math.sin(runPhase) * armSwing * runStrength - 0.1;
    rig.leftArm.rotation.z = -0.03 - secondary;
    rig.rightArm.rotation.z = 0.03 + secondary;

    if (animationProfile === 'tank') {
      rig.bodyPivot.rotation.y = Math.sin(time * 1.4) * 0.03 * (1 - runStrength * 0.4);
      rig.leftArm.rotation.z -= 0.05;
      rig.rightArm.rotation.z += 0.05;
    } else if (animationProfile === 'scout') {
      rig.bodyPivot.rotation.z += Math.sin(runPhase) * 0.06 * runStrength;
      rig.leftArm.rotation.z -= 0.08 * runStrength;
      rig.rightArm.rotation.z += 0.08 * runStrength;
    } else if (animationProfile === 'sentinel') {
      rig.bodyPivot.rotation.y = Math.sin(time * 1.6) * 0.05 * (1 - runStrength);
      rig.leftArm.rotation.x *= 0.82;
      rig.rightArm.rotation.x *= 0.82;
      rig.weaponPivot.rotation.y = Math.sin(time * 2.1) * 0.08 * (1 - runStrength);
    } else if (animationProfile === 'rogue') {
      rig.bodyPivot.rotation.z += Math.sin(runPhase * 0.5) * 0.08 * runStrength;
      rig.leftLeg.rotation.z = -0.08 * runStrength;
      rig.rightLeg.rotation.z = 0.08 * runStrength;
      rig.leftArm.rotation.z -= 0.1 * runStrength;
      rig.rightArm.rotation.z += 0.1 * runStrength;
    }

    const breathe = Math.sin(time * 2.2) * (0.045 + 0.04 * (1 - runStrength));
    rig.head.position.y = 2.38 + breathe;
    rig.head.rotation.y = Math.sin(time * 1.7) * 0.08;
    rig.weaponPivot.rotation.x = -0.05 + Math.sin(time * 6.2) * weaponSway * (1 - runStrength * 0.25);
    rig.weaponPivot.rotation.z = secondary * 0.8;
  }

  function getCharacterDef(characterId, fallbackId = characterDefs[0]?.id) {
    return characterDefs.find((character) => character.id === characterId)
      || characterDefs.find((character) => character.id === fallbackId)
      || characterDefs[0];
  }

  return {
    characterDefs,
    createCharacterRig,
    animateCharacterRig,
    getCharacterDef,
  };
}
