export function createCharacterModule(THREE, characterDefs) {
  const sharedGeometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    slab: new THREE.BoxGeometry(1, 0.5, 1),
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
    narrowCylinder: new THREE.CylinderGeometry(0.12, 0.12, 1, 10),
    cone: new THREE.ConeGeometry(0.24, 0.8, 10),
    weaponBarrel: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10),
    knee: new THREE.CylinderGeometry(0.16, 0.16, 0.16, 10),
    fin: new THREE.BoxGeometry(0.14, 0.7, 0.56),
    blade: new THREE.BoxGeometry(0.08, 0.92, 0.28),
    plate: new THREE.BoxGeometry(0.78, 0.18, 0.62),
    pod: new THREE.CapsuleGeometry(0.14, 0.34, 4, 8),
    disc: new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12),
  };

  function createMaterialPalette(def) {
    const emissiveIntensity = def.silhouette === 'bulwark' ? 0.22 : 0.3;
    const accentIntensity = def.silhouette === 'warden' ? 0.28 : 0.2;
    return {
      base: new THREE.MeshStandardMaterial({
        color: def.base,
        emissive: def.emissive,
        emissiveIntensity,
        roughness: 0.22,
        metalness: 0.42,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: def.dark,
        roughness: 0.7,
        metalness: 0.14,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: def.accent,
        emissive: def.accent,
        emissiveIntensity: accentIntensity,
        roughness: 0.16,
        metalness: 0.54,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: def.trim || 0xf6ebff,
        emissive: def.accent,
        emissiveIntensity: 0.08,
        roughness: 0.1,
        metalness: 0.62,
      }),
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
      chestScale: [1.02 * def.bodyScale[0], 1.22 * def.bodyScale[1], 0.9 * def.bodyScale[2]],
      torsoCoreScale: [0.42, 0.4, 0.12],
      upperChestScale: [0.84, 0.34, 0.58],
      backScale: [0.84, 0.92, 0.6],
      collarScale: [0.7, 0.18, 0.44],
      shoulderOffsetX: 0.78 * def.bodyScale[0],
      shoulderY: 1.92,
      legOffsetX: 0.32,
      hipScale: [0.66, 0.2, 0.52],
      waistScale: [0.56, 0.16, 0.38],
      visorScale: [1.05, 1, 1],
      headScale: [1, 1, 1],
      neckScale: [0.24, 0.2, 0.24],
      armScale: [1, 1, 1],
      forearmScale: [1, 1.06, 1],
      handGuardScale: [0.2, 0.18, 0.32],
      shinScale: [1, 1.08, 1],
      footScale: [0.98, 1, 0.9],
      shoulderScale: [0.42, 0.3, 0.82],
      weaponScale: [0.26, 0.3, 1.52],
      weaponTrimScale: [0.14, 0.12, 0.84],
      weaponBarrelScale: [1, 1, 0.86],
      weaponOffset: [0.36, 1.6, 0.62],
      chestStripe: true,
      chestCore: false,
      thighArmor: false,
      backpack: false,
      skirtArmor: false,
      heelSpurs: false,
      antennaPair: false,
      forearmBlades: false,
      hipFins: false,
      shoulderWings: false,
      shinGuards: false,
      calfPods: false,
      waistPouches: false,
      visorCrown: false,
      headCrest: false,
      sideVanes: false,
      dualMags: false,
      weaponPods: false,
      pose: {
        bodyRotation: [0, 0, 0],
        leftArmRotation: [-0.12, 0, -0.02],
        rightArmRotation: [-0.16, 0, 0.03],
        leftLegRotation: [0.02, 0, 0],
        rightLegRotation: [-0.02, 0, 0],
        headRotation: [0, 0, 0],
        weaponRotation: [-0.05, 0, 0],
        bodyOffsetY: 0.95,
      },
    };

    if (def.silhouette === 'vanguard') {
      return {
        ...baseProfile,
        chestScale: [1.08 * def.bodyScale[0], 1.26 * def.bodyScale[1], 0.94 * def.bodyScale[2]],
        upperChestScale: [0.92, 0.36, 0.62],
        collarScale: [0.82, 0.2, 0.52],
        torsoCoreScale: [0.36, 0.34, 0.1],
        shoulderScale: [0.5, 0.32, 0.88],
        weaponScale: [0.3, 0.28, 1.72],
        weaponTrimScale: [0.12, 0.1, 1.04],
        weaponBarrelScale: [1, 1, 1.04],
        chestCore: true,
        thighArmor: true,
        waistPouches: true,
        shinGuards: true,
        pose: {
          ...baseProfile.pose,
          bodyRotation: [-0.02, 0.14, 0],
          leftArmRotation: [-0.34, 0.06, -0.02],
          rightArmRotation: [-0.52, -0.08, 0.05],
          leftLegRotation: [0.03, -0.02, -0.01],
          rightLegRotation: [-0.03, 0.02, 0.01],
          weaponRotation: [-0.1, 0.08, 0.02],
        },
      };
    }

    if (def.silhouette === 'strider') {
      return {
        ...baseProfile,
        chestScale: [0.92 * def.bodyScale[0], 1.02 * def.bodyScale[1], 0.72 * def.bodyScale[2]],
        upperChestScale: [0.68, 0.28, 0.42],
        backScale: [0.62, 0.78, 0.42],
        collarScale: [0.54, 0.12, 0.24],
        shoulderOffsetX: 0.64 * def.bodyScale[0],
        shoulderY: 1.88,
        legOffsetX: 0.27,
        hipScale: [0.44, 0.14, 0.3],
        waistScale: [0.38, 0.12, 0.22],
        headScale: [0.84, 0.84, 0.94],
        neckScale: [0.18, 0.22, 0.18],
        armScale: [0.82, 1.12, 0.8],
        forearmScale: [0.7, 1.22, 0.72],
        handGuardScale: [0.14, 0.14, 0.22],
        shinScale: [0.84, 1.18, 0.84],
        footScale: [0.78, 0.78, 1.08],
        shoulderScale: [0.26, 0.16, 0.44],
        weaponScale: [0.18, 0.18, 1.36],
        weaponTrimScale: [0.08, 0.08, 0.92],
        weaponBarrelScale: [0.84, 0.84, 1.12],
        weaponOffset: [0.3, 1.56, 0.7],
        antennaPair: true,
        heelSpurs: true,
        sideVanes: true,
        calfPods: true,
        pose: {
          ...baseProfile.pose,
          bodyRotation: [-0.08, 0.26, 0.06],
          leftArmRotation: [-0.42, 0.1, -0.12],
          rightArmRotation: [-0.62, -0.08, 0.14],
          leftLegRotation: [0.08, -0.04, -0.04],
          rightLegRotation: [-0.12, 0.08, 0.08],
          headRotation: [0.06, -0.04, 0],
          weaponRotation: [-0.14, 0.12, 0.08],
          bodyOffsetY: 0.92,
        },
      };
    }

    if (def.silhouette === 'bulwark') {
      return {
        ...baseProfile,
        chestScale: [1.34 * def.bodyScale[0], 1.5 * def.bodyScale[1], 1.08 * def.bodyScale[2]],
        upperChestScale: [1.08, 0.44, 0.76],
        torsoCoreScale: [0.46, 0.48, 0.14],
        backScale: [1.2, 1.14, 0.82],
        collarScale: [0.96, 0.24, 0.62],
        shoulderOffsetX: 0.94 * def.bodyScale[0],
        shoulderY: 2,
        legOffsetX: 0.4,
        hipScale: [0.88, 0.26, 0.7],
        waistScale: [0.76, 0.24, 0.54],
        headScale: [1.14, 1.08, 1.12],
        neckScale: [0.3, 0.22, 0.3],
        armScale: [1.2, 1.06, 1.24],
        forearmScale: [1.18, 1.18, 1.22],
        handGuardScale: [0.28, 0.22, 0.44],
        shinScale: [1.18, 1.04, 1.18],
        footScale: [1.24, 1.06, 1.16],
        shoulderScale: [0.7, 0.42, 1.08],
        weaponScale: [0.48, 0.54, 1.8],
        weaponTrimScale: [0.24, 0.22, 0.86],
        weaponBarrelScale: [1.42, 1.42, 1.24],
        weaponOffset: [0.44, 1.68, 0.72],
        chestCore: true,
        backpack: true,
        skirtArmor: true,
        thighArmor: true,
        shinGuards: true,
        shoulderWings: true,
        waistPouches: true,
        dualMags: true,
        weaponPods: true,
        pose: {
          ...baseProfile.pose,
          bodyRotation: [0.02, 0.08, -0.02],
          leftArmRotation: [-0.18, 0.02, -0.08],
          rightArmRotation: [-0.3, -0.08, 0.12],
          leftLegRotation: [0.04, -0.02, -0.03],
          rightLegRotation: [-0.04, 0.02, 0.03],
          headRotation: [0.02, -0.03, 0],
          weaponRotation: [-0.04, 0.04, 0],
          bodyOffsetY: 0.98,
        },
      };
    }

    if (def.silhouette === 'warden') {
      return {
        ...baseProfile,
        chestScale: [1.02 * def.bodyScale[0], 1.14 * def.bodyScale[1], 0.76 * def.bodyScale[2]],
        upperChestScale: [0.72, 0.3, 0.46],
        torsoCoreScale: [0.3, 0.42, 0.1],
        backScale: [0.68, 0.84, 0.42],
        collarScale: [0.62, 0.16, 0.28],
        shoulderOffsetX: 0.7 * def.bodyScale[0],
        shoulderY: 1.9,
        legOffsetX: 0.31,
        hipScale: [0.58, 0.16, 0.32],
        waistScale: [0.38, 0.12, 0.22],
        headScale: [0.94, 1.02, 0.9],
        armScale: [0.88, 1, 0.82],
        forearmScale: [0.88, 1.1, 0.82],
        handGuardScale: [0.16, 0.16, 0.34],
        footScale: [0.86, 0.92, 0.8],
        shoulderScale: [0.22, 0.16, 0.48],
        weaponScale: [0.2, 0.22, 1.46],
        weaponTrimScale: [0.08, 0.1, 1.08],
        weaponBarrelScale: [0.9, 0.9, 0.96],
        weaponOffset: [0.3, 1.63, 0.56],
        chestCore: true,
        forearmBlades: true,
        hipFins: true,
        visorCrown: true,
        headCrest: true,
        pose: {
          ...baseProfile.pose,
          bodyRotation: [-0.01, 0.18, 0.02],
          leftArmRotation: [-0.26, 0.08, -0.1],
          rightArmRotation: [-0.44, -0.1, 0.1],
          leftLegRotation: [0.02, -0.02, -0.02],
          rightLegRotation: [-0.02, 0.02, 0.02],
          headRotation: [0, -0.08, 0],
          weaponRotation: [-0.08, 0.14, -0.02],
        },
      };
    }

    return {
      ...baseProfile,
      chestScale: [0.86 * def.bodyScale[0], 0.98 * def.bodyScale[1], 0.72 * def.bodyScale[2]],
      upperChestScale: [0.64, 0.26, 0.38],
      torsoCoreScale: [0.28, 0.26, 0.08],
      backScale: [0.62, 0.7, 0.38],
      collarScale: [0.46, 0.1, 0.18],
      shoulderOffsetX: 0.68 * def.bodyScale[0],
      shoulderY: 1.88,
      legOffsetX: 0.28,
      hipScale: [0.48, 0.12, 0.26],
      waistScale: [0.34, 0.1, 0.18],
      headScale: [0.84, 0.9, 0.84],
      neckScale: [0.16, 0.18, 0.16],
      armScale: [0.84, 0.96, 0.78],
      forearmScale: [0.7, 1.18, 0.72],
      handGuardScale: [0.14, 0.14, 0.24],
      shinScale: [0.82, 1.12, 0.84],
      footScale: [0.76, 0.76, 1.02],
      shoulderScale: [0.34, 0.18, 0.64],
      weaponScale: [0.18, 0.18, 1.18],
      weaponTrimScale: [0.07, 0.08, 0.78],
      weaponBarrelScale: [0.76, 0.76, 0.82],
      weaponOffset: [0.24, 1.54, 0.64],
      thighArmor: true,
      heelSpurs: true,
      sideVanes: true,
      dualMags: true,
      weaponPods: true,
      pose: {
        ...baseProfile.pose,
        bodyRotation: [-0.1, 0.34, 0.08],
        leftArmRotation: [-0.56, 0.06, -0.24],
        rightArmRotation: [-0.76, -0.14, 0.26],
        leftLegRotation: [0.1, -0.06, -0.08],
        rightLegRotation: [-0.16, 0.08, 0.12],
        headRotation: [0.06, -0.08, 0],
        weaponRotation: [-0.18, 0.18, 0.12],
        bodyOffsetY: 0.92,
      },
    };
  }

  function buildWeapon(weaponPivot, palette, def, visuals) {
    if (def.weapon === 'cannon') {
      addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0.02, 0.1], [0, 0, 0], [0.52, 0.58, 1.86]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.24, 0.36], [0, 0, 0], [0.72, 0.42, 1.06]);
      addMesh(weaponPivot, sharedGeometries.box, palette.trim, [0, 0.34, -0.2], [0, 0, 0], [0.34, 0.16, 0.44]);
      addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.04, 1.08], [Math.PI / 2, 0, 0], [1.58, 1.58, 1.3]);
      addMesh(weaponPivot, sharedGeometries.disc, palette.dark, [0, -0.08, 0.08], [Math.PI / 2, 0, 0], [1.08, 0.84, 1.08]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0.34, -0.1, 0.12], [0, 0, 0], [0.16, 0.28, 0.62]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [-0.34, -0.1, 0.12], [0, 0, 0], [0.16, 0.28, 0.62]);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, 0.12, 1.18], [0, 0, 0], [0.16, 0.1, 0.28]);
      return;
    }

    if (def.weapon === 'bladegun') {
      addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, -0.04, 0.1], [0, 0, 0], [0.22, 0.24, 1.44]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.1, 0.22], [0, 0, 0], [0.28, 0.16, 1.04]);
      addMesh(weaponPivot, sharedGeometries.blade, palette.accent, [0.22, -0.06, 0.34], [0.54, 0.18, 0.18], [1, 1, 1]);
      addMesh(weaponPivot, sharedGeometries.blade, palette.accent, [-0.22, -0.06, 0.34], [0.54, -0.18, -0.18], [1, 1, 1]);
      addMesh(weaponPivot, sharedGeometries.fin, palette.trim, [0, 0.22, 0.62], [1.2, 0, 0], [0.88, 0.74, 0.56]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.22, -0.16], [0.3, 0, 0], [0.14, 0.62, 0.36]);
      addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, 0, 0.98], [Math.PI / 2, 0, 0], [0.74, 0.74, 0.74]);
      return;
    }

    if (def.weapon === 'smg') {
      const buildSidearm = (x) => {
        addMesh(weaponPivot, sharedGeometries.box, palette.dark, [x, -0.02, 0.04], [0, 0, 0], [0.12, 0.18, 1.08]);
        addMesh(weaponPivot, sharedGeometries.box, palette.base, [x, 0.14, 0.04], [0, 0, 0], [0.16, 0.1, 0.72]);
        addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [x, -0.04, 0.78], [Math.PI / 2, 0, 0], [0.52, 0.52, 0.64]);
        addMesh(weaponPivot, sharedGeometries.box, palette.trim, [x, -0.18, -0.12], [0, 0, 0], [0.1, 0.42, 0.22]);
      };
      buildSidearm(0.22);
      buildSidearm(-0.22);
      addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, 0.08, 0.16], [0, 0, 0], [0.12, 0.06, 0.22]);
      if (visuals.dualMags) {
        addMesh(weaponPivot, sharedGeometries.box, palette.base, [0.22, -0.22, 0.08], [0, 0, 0], [0.08, 0.28, 0.18]);
        addMesh(weaponPivot, sharedGeometries.box, palette.base, [-0.22, -0.22, 0.08], [0, 0, 0], [0.08, 0.28, 0.18]);
      }
      return;
    }

    if (def.weapon === 'carbine') {
      addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, -0.02, 0.12], [0, 0, 0], [0.18, 0.18, 1.32]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.1, 0.12], [0, 0, 0], [0.24, 0.12, 0.92]);
      addMesh(weaponPivot, sharedGeometries.box, palette.trim, [0, 0.18, 0.18], [0, 0, 0], [0.12, 0.08, 0.52]);
      addMesh(weaponPivot, sharedGeometries.cone, palette.accent, [0, -0.02, 1.08], [Math.PI / 2, 0, 0], [0.16, 0.26, 0.16]);
      addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.16, -0.18], [0, 0, 0], [0.12, 0.36, 0.28]);
      addMesh(weaponPivot, sharedGeometries.fin, palette.accent, [0, 0.18, -0.12], [0.18, 0, 0], [0.56, 0.42, 0.38]);
      return;
    }

    addMesh(weaponPivot, sharedGeometries.box, palette.dark, [0, 0, 0.08], [0, 0, 0], [0.22, 0.22, 1.66]);
    addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, 0.12, 0.06], [0, 0, 0], [0.26, 0.16, 0.98]);
    addMesh(weaponPivot, sharedGeometries.weaponBarrel, palette.accent, [0, -0.03, 1.06], [Math.PI / 2, 0, 0], [0.88, 0.88, 1.08]);
    addMesh(weaponPivot, sharedGeometries.box, palette.trim, [0, 0.22, 0.24], [0, 0, 0], [0.12, 0.08, 0.74]);
    addMesh(weaponPivot, sharedGeometries.box, palette.base, [0, -0.16, -0.24], [0, 0, 0], [0.14, 0.42, 0.34]);
    addMesh(weaponPivot, sharedGeometries.box, palette.accent, [0, 0.18, -0.12], [0, 0, 0], [0.08, 0.08, 0.22]);
  }

  function createCharacterRig(def) {
    const palette = createMaterialPalette(def);
    const visuals = createVisualProfile(def);
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    addMesh(bodyPivot, sharedGeometries.chest, palette.base, [0, 1.46, 0], [0, 0, 0], visuals.chestScale);
    addMesh(bodyPivot, sharedGeometries.slab, palette.dark, [0, 1.68, 0.08], [0, 0, 0], visuals.upperChestScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.34, -0.16], [0.08, 0, 0], visuals.backScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.98, 0.06], [0, 0, 0], visuals.collarScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.8, 0.38], [0, 0, 0], [0.38, 0.14, 0.08]);
    if (visuals.chestStripe) addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.18, 0.39], [0, 0, 0], [0.58, 0.12, 0.06]);
    addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.04, 0.02], [0, 0, 0], visuals.hipScale);
    addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 0.92, 0.12], [0, 0, 0], visuals.waistScale);

    if (visuals.chestCore) {
      addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.44, 0.42], [0, 0, 0], visuals.torsoCoreScale);
      addMesh(bodyPivot, sharedGeometries.box, palette.trim, [0, 1.46, 0.48], [0, 0, 0], [visuals.torsoCoreScale[0] * 0.36, visuals.torsoCoreScale[1] * 0.44, 0.04]);
    }
    if (visuals.backpack) {
      addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0, 1.54, -0.56], [0.12, 0, 0], [0.58, 0.9, 0.48]);
      addMesh(bodyPivot, sharedGeometries.box, palette.base, [0, 1.26, -0.62], [0.12, 0, 0], [0.4, 0.24, 0.24]);
      addMesh(bodyPivot, sharedGeometries.box, palette.accent, [0, 1.86, -0.74], [0.12, 0, 0], [0.26, 0.2, 0.14]);
    }
    if (visuals.skirtArmor) {
      addMesh(bodyPivot, sharedGeometries.plate, palette.base, [0, 0.78, 0.28], [0.18, 0, 0], [1.1, 1, 0.96]);
      addMesh(bodyPivot, sharedGeometries.plate, palette.dark, [0, 0.78, -0.16], [-0.1, 0, 0], [0.94, 0.92, 0.72]);
    }
    if (visuals.hipFins) {
      addMesh(bodyPivot, sharedGeometries.fin, palette.accent, [0.46, 1.12, -0.02], [0, 0.18, 0.2], [0.7, 0.76, 0.66]);
      addMesh(bodyPivot, sharedGeometries.fin, palette.accent, [-0.46, 1.12, -0.02], [0, -0.18, -0.2], [0.7, 0.76, 0.66]);
    }
    if (visuals.waistPouches) {
      addMesh(bodyPivot, sharedGeometries.box, palette.dark, [0.36, 0.92, 0.18], [0, 0.08, 0], [0.18, 0.26, 0.16]);
      addMesh(bodyPivot, sharedGeometries.box, palette.dark, [-0.36, 0.92, 0.18], [0, -0.08, 0], [0.18, 0.26, 0.16]);
    }
    if (visuals.sideVanes) {
      addMesh(bodyPivot, sharedGeometries.fin, palette.trim, [0.42, 1.44, -0.12], [0.16, 0.24, 0.34], [0.44, 0.42, 0.36]);
      addMesh(bodyPivot, sharedGeometries.fin, palette.trim, [-0.42, 1.44, -0.12], [0.16, -0.24, -0.34], [0.44, 0.42, 0.36]);
    }

    const head = new THREE.Group();
    head.position.set(0, 2.38, 0.02);
    bodyPivot.add(head);
    addMesh(head, sharedGeometries.box, palette.dark, [0, -0.28, 0], [0, 0, 0], visuals.neckScale);
    addMesh(head, sharedGeometries.head, palette.base, [0, 0, 0], [0, 0, 0], visuals.headScale);
    addMesh(head, sharedGeometries.visor, palette.accent, [0, 0.02, 0.37], [0, 0, 0], visuals.visorScale);
    addMesh(head, sharedGeometries.box, palette.dark, [0, -0.08, -0.18], [0.12, 0, 0], [0.84, 0.22, 0.62]);
    if (visuals.visorCrown) addMesh(head, sharedGeometries.box, palette.trim, [0, 0.26, 0.32], [0, 0, 0], [0.34, 0.08, 0.06]);

    if (def.head === 'antenna') {
      addMesh(head, sharedGeometries.cylinder, palette.dark, [0.12, 0.52, -0.12], [0, 0, 0], [0.18, 0.46, 0.18]);
      addMesh(head, sharedGeometries.cone, palette.accent, [0.12, 0.88, -0.12], [0, 0, Math.PI], [0.22, 0.28, 0.22]);
      if (visuals.antennaPair) {
        addMesh(head, sharedGeometries.cylinder, palette.dark, [-0.14, 0.48, -0.1], [0.08, 0, 0], [0.14, 0.42, 0.14]);
        addMesh(head, sharedGeometries.cone, palette.trim, [-0.14, 0.8, -0.1], [0, 0, Math.PI], [0.18, 0.22, 0.18]);
      }
    } else if (def.head === 'heavy') {
      addMesh(head, sharedGeometries.box, palette.dark, [0, 0.42, -0.08], [0, 0, 0], [1.18, 0.38, 0.88]);
      addMesh(head, sharedGeometries.box, palette.trim, [0, 0.24, 0.39], [0, 0, 0], [0.48, 0.08, 0.05]);
      addMesh(head, sharedGeometries.box, palette.base, [0, -0.16, 0.34], [0, 0, 0], [0.62, 0.12, 0.08]);
    } else if (def.head === 'crest') {
      addMesh(head, sharedGeometries.box, palette.accent, [0, 0.56, -0.16], [0.2, 0, 0], [0.2, 0.64, 0.86]);
      addMesh(head, sharedGeometries.box, palette.trim, [0, 0.12, 0.4], [0, 0, 0], [0.16, 0.26, 0.04]);
      if (visuals.headCrest) addMesh(head, sharedGeometries.fin, palette.trim, [0, 0.36, 0.02], [0.1, 0, Math.PI / 2], [0.5, 0.4, 0.34]);
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
    addMesh(leftArm, sharedGeometries.box, palette.trim, [0, -1.22, 0.18], [0, 0, 0], visuals.handGuardScale);
    addMesh(rightArm, sharedGeometries.box, palette.trim, [0, -1.22, 0.18], [0, 0, 0], visuals.handGuardScale);

    if (def.shoulderPads) {
      addMesh(leftArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, 0.4], visuals.shoulderScale);
      addMesh(rightArm, sharedGeometries.shoulder, palette.base, [0, 0.1, 0], [0, 0, -0.4], visuals.shoulderScale);
      addMesh(leftArm, sharedGeometries.box, palette.accent, [0.1, 0.06, 0.28], [0, 0.1, 0], [0.08, 0.16, 0.22]);
      addMesh(rightArm, sharedGeometries.box, palette.accent, [-0.1, 0.06, 0.28], [0, -0.1, 0], [0.08, 0.16, 0.22]);
      if (visuals.shoulderWings) {
        addMesh(leftArm, sharedGeometries.fin, palette.trim, [-0.18, 0.18, 0], [0, 0, 0.36], [0.64, 0.34, 0.46]);
        addMesh(rightArm, sharedGeometries.fin, palette.trim, [0.18, 0.18, 0], [0, 0, -0.36], [0.64, 0.34, 0.46]);
      }
    }
    if (visuals.forearmBlades) {
      addMesh(leftArm, sharedGeometries.fin, palette.accent, [-0.16, -0.92, 0.24], [0.3, 0, -0.18], [0.82, 0.9, 0.72]);
      addMesh(rightArm, sharedGeometries.fin, palette.accent, [0.16, -0.92, 0.24], [0.3, 0, 0.18], [0.82, 0.9, 0.72]);
    }

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-visuals.legOffsetX, 0.92, 0);
    rightLeg.position.set(visuals.legOffsetX, 0.92, 0);
    bodyPivot.add(leftLeg, rightLeg);

    const legScale = def.legType === 'long' ? [0.88, 1.34, 0.86] : def.legType === 'heavy' ? [1.22, 0.96, 1.2] : [1, 1, 1];
    const legTilt = def.legType === 'angled' ? 0.2 : def.legType === 'runner' ? 0.12 : 0;
    addMesh(leftLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [legTilt, 0, 0], legScale);
    addMesh(rightLeg, sharedGeometries.leg, palette.dark, [0, -0.36, 0.04], [-legTilt, 0, 0], legScale);
    addMesh(leftLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [legTilt * 0.3, 0, 0], visuals.shinScale);
    addMesh(rightLeg, sharedGeometries.shin, palette.base, [0, -0.98, 0.12], [-legTilt * 0.3, 0, 0], visuals.shinScale);
    addMesh(leftLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(rightLeg, sharedGeometries.knee, palette.accent, [0, -0.56, 0.18], [Math.PI / 2, 0, 0], [1, 1, 1]);
    addMesh(leftLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], visuals.footScale);
    addMesh(rightLeg, sharedGeometries.foot, palette.base, [0, -1.38, 0.17], [0, 0, 0], visuals.footScale);

    if (visuals.thighArmor) {
      addMesh(leftLeg, sharedGeometries.box, palette.base, [0, -0.08, 0.22], [0.18, 0, 0], [0.32, 0.48, 0.24]);
      addMesh(rightLeg, sharedGeometries.box, palette.base, [0, -0.08, 0.22], [0.18, 0, 0], [0.32, 0.48, 0.24]);
    }
    if (visuals.shinGuards) {
      addMesh(leftLeg, sharedGeometries.box, palette.trim, [0, -0.96, 0.26], [0.16, 0, 0], [0.2, 0.38, 0.12]);
      addMesh(rightLeg, sharedGeometries.box, palette.trim, [0, -0.96, 0.26], [0.16, 0, 0], [0.2, 0.38, 0.12]);
    }
    if (visuals.calfPods) {
      addMesh(leftLeg, sharedGeometries.pod, palette.dark, [0, -0.86, -0.08], [0, 0, Math.PI / 2], [0.48, 0.62, 0.48]);
      addMesh(rightLeg, sharedGeometries.pod, palette.dark, [0, -0.86, -0.08], [0, 0, Math.PI / 2], [0.48, 0.62, 0.48]);
    }
    if (visuals.heelSpurs) {
      addMesh(leftLeg, sharedGeometries.fin, palette.trim, [0, -1.32, -0.12], [-0.24, 0, 0], [0.52, 0.44, 0.44]);
      addMesh(rightLeg, sharedGeometries.fin, palette.trim, [0, -1.32, -0.12], [-0.24, 0, 0], [0.52, 0.44, 0.44]);
    }

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(...visuals.weaponOffset);
    bodyPivot.add(weaponPivot);
    buildWeapon(weaponPivot, palette, def, visuals);
    if (visuals.weaponPods) {
      addMesh(weaponPivot, sharedGeometries.pod, palette.trim, [0.28, 0.18, 0.12], [0, 0, Math.PI / 2], [0.82, 1, 0.82]);
      addMesh(weaponPivot, sharedGeometries.pod, palette.trim, [-0.28, 0.18, 0.12], [0, 0, Math.PI / 2], [0.82, 1, 0.82]);
    }

    const rig = {
      id: def.id,
      def,
      visuals,
      root,
      bodyPivot,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weaponPivot,
    };

    rig.bodyPivot.position.y = visuals.pose.bodyOffsetY;
    rig.bodyPivot.rotation.set(...visuals.pose.bodyRotation);
    rig.head.rotation.set(...visuals.pose.headRotation);
    rig.leftArm.rotation.set(...visuals.pose.leftArmRotation);
    rig.rightArm.rotation.set(...visuals.pose.rightArmRotation);
    rig.leftLeg.rotation.set(...visuals.pose.leftLegRotation);
    rig.rightLeg.rotation.set(...visuals.pose.rightLegRotation);
    rig.weaponPivot.rotation.set(...visuals.pose.weaponRotation);

    root.userData.characterDef = def;
    return rig;
  }

  function animateCharacterRig(rig, motion, time, isPreview = false) {
    const locomotion = rig?.def?.locomotionProfile || {};
    const pose = rig?.visuals?.pose || {};
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

    rig.bodyPivot.position.y = (pose.bodyOffsetY ?? 0.95) + bounce;
    rig.bodyPivot.rotation.x = (pose.bodyRotation?.[0] || 0) - bodyLean * runStrength + idleSway * 0.6;
    rig.bodyPivot.rotation.y = (pose.bodyRotation?.[1] || 0);
    rig.bodyPivot.rotation.z = (pose.bodyRotation?.[2] || 0) + idleSway;

    rig.leftLeg.rotation.x = (pose.leftLegRotation?.[0] || 0) + Math.sin(runPhase) * legSwing * runStrength;
    rig.leftLeg.rotation.y = (pose.leftLegRotation?.[1] || 0);
    rig.leftLeg.rotation.z = (pose.leftLegRotation?.[2] || 0);
    rig.rightLeg.rotation.x = (pose.rightLegRotation?.[0] || 0) + Math.sin(runPhase + Math.PI) * legSwing * runStrength;
    rig.rightLeg.rotation.y = (pose.rightLegRotation?.[1] || 0);
    rig.rightLeg.rotation.z = (pose.rightLegRotation?.[2] || 0);

    rig.leftArm.rotation.x = (pose.leftArmRotation?.[0] || 0) + Math.sin(runPhase + Math.PI) * armSwing * runStrength;
    rig.leftArm.rotation.y = (pose.leftArmRotation?.[1] || 0);
    rig.leftArm.rotation.z = (pose.leftArmRotation?.[2] || 0) - 0.03 - secondary;
    rig.rightArm.rotation.x = (pose.rightArmRotation?.[0] || 0) + Math.sin(runPhase) * armSwing * runStrength;
    rig.rightArm.rotation.y = (pose.rightArmRotation?.[1] || 0);
    rig.rightArm.rotation.z = (pose.rightArmRotation?.[2] || 0) + 0.03 + secondary;

    if (animationProfile === 'tank') {
      rig.bodyPivot.rotation.y += Math.sin(time * 1.4) * 0.03 * (1 - runStrength * 0.4);
      rig.leftArm.rotation.z -= 0.05;
      rig.rightArm.rotation.z += 0.05;
    } else if (animationProfile === 'scout') {
      rig.bodyPivot.rotation.z += Math.sin(runPhase) * 0.06 * runStrength;
      rig.leftArm.rotation.z -= 0.08 * runStrength;
      rig.rightArm.rotation.z += 0.08 * runStrength;
    } else if (animationProfile === 'sentinel') {
      rig.bodyPivot.rotation.y += Math.sin(time * 1.6) * 0.05 * (1 - runStrength);
      rig.leftArm.rotation.x *= 0.82;
      rig.rightArm.rotation.x *= 0.82;
      rig.weaponPivot.rotation.y = (pose.weaponRotation?.[1] || 0) + Math.sin(time * 2.1) * 0.08 * (1 - runStrength);
    } else if (animationProfile === 'rogue') {
      rig.bodyPivot.rotation.z += Math.sin(runPhase * 0.5) * 0.08 * runStrength;
      rig.leftLeg.rotation.z -= 0.08 * runStrength;
      rig.rightLeg.rotation.z += 0.08 * runStrength;
      rig.leftArm.rotation.z -= 0.1 * runStrength;
      rig.rightArm.rotation.z += 0.1 * runStrength;
    }

    const breathe = Math.sin(time * 2.2) * (0.045 + 0.04 * (1 - runStrength));
    rig.head.position.y = 2.38 + breathe;
    rig.head.rotation.x = pose.headRotation?.[0] || 0;
    rig.head.rotation.y = (pose.headRotation?.[1] || 0) + Math.sin(time * 1.7) * 0.08;
    rig.head.rotation.z = pose.headRotation?.[2] || 0;
    rig.weaponPivot.rotation.x = (pose.weaponRotation?.[0] || -0.05) + Math.sin(time * 6.2) * weaponSway * (1 - runStrength * 0.25);
    if (animationProfile !== 'sentinel') rig.weaponPivot.rotation.y = pose.weaponRotation?.[1] || 0;
    rig.weaponPivot.rotation.z = (pose.weaponRotation?.[2] || 0) + secondary * 0.8;
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
