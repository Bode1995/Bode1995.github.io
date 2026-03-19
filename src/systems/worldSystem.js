function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  material.dispose?.();
}

function disposeObject3D(root) {
  root.traverse((child) => {
    child.geometry?.dispose?.();
    disposeMaterial(child.material);
  });
}

export function clearWorldMap(mapRoot) {
  while (mapRoot.children.length) {
    const child = mapRoot.children[mapRoot.children.length - 1];
    mapRoot.remove(child);
    disposeObject3D(child);
  }
}

export function createWorldMap({ THREE, gameplayConfig, mapRoot, collision }) {
  clearWorldMap(mapRoot);
  collision.clearColliders();

  const makeMaterial = (config) => new THREE.MeshStandardMaterial(config);
  const shared = {
    asphalt: makeMaterial({ color: 0x61625c, roughness: 0.98, metalness: 0.02 }),
    asphaltDark: makeMaterial({ color: 0x4d4f4a, roughness: 1, metalness: 0.01 }),
    concrete: makeMaterial({ color: 0xb9b1a2, roughness: 0.94, metalness: 0.04 }),
    concreteLight: makeMaterial({ color: 0xcec8ba, roughness: 0.91, metalness: 0.03 }),
    paver: makeMaterial({ color: 0xa09587, roughness: 0.95, metalness: 0.03 }),
    gravel: makeMaterial({ color: 0x8c857a, roughness: 1, metalness: 0.01 }),
    curb: makeMaterial({ color: 0xded6c8, roughness: 0.9, metalness: 0.02 }),
    soil: makeMaterial({ color: 0x705a46, roughness: 1, metalness: 0 }),
    grass: makeMaterial({ color: 0x6f8758, roughness: 0.98, metalness: 0 }),
    grassDark: makeMaterial({ color: 0x5a6d45, roughness: 0.98, metalness: 0 }),
    treeTrunk: makeMaterial({ color: 0x6a4b34, roughness: 1, metalness: 0 }),
    foliage: makeMaterial({ color: 0x648852, roughness: 0.96, metalness: 0 }),
    foliageDark: makeMaterial({ color: 0x496740, roughness: 0.96, metalness: 0 }),
    wall: makeMaterial({ color: 0xb4a89a, roughness: 0.94, metalness: 0.04 }),
    wallDark: makeMaterial({ color: 0x897d72, roughness: 0.95, metalness: 0.04 }),
    roof: makeMaterial({ color: 0x77685e, roughness: 0.92, metalness: 0.06 }),
    trim: makeMaterial({ color: 0xd8ceb9, roughness: 0.88, metalness: 0.08 }),
    glass: makeMaterial({ color: 0x9fc5cf, emissive: 0x35505a, emissiveIntensity: 0.07, roughness: 0.28, metalness: 0.24 }),
    metal: makeMaterial({ color: 0x66625b, roughness: 0.72, metalness: 0.22 }),
    lamp: makeMaterial({ color: 0xf0d6a0, emissive: 0xf0c781, emissiveIntensity: 0.44, roughness: 0.4, metalness: 0.18 }),
    bollard: makeMaterial({ color: 0x4f524f, roughness: 0.78, metalness: 0.12 }),
  };

  const hash = (x, z, salt = 0) => {
    const value = Math.sin((x * 12.9898) + (z * 78.233) + (salt * 37.719)) * 43758.5453123;
    return value - Math.floor(value);
  };

  const varyMaterial = (material, x = 0, z = 0, salt = 0, options = {}) => {
    const clone = material.clone();
    const color = clone.color.clone();
    const hsl = {};
    color.getHSL(hsl);
    const hueShift = ((hash(x, z, salt) - 0.5) * 2) * (options.hue ?? 0.012);
    const satShift = ((hash(z, x, salt + 1) - 0.5) * 2) * (options.sat ?? 0.06);
    const lightShift = ((hash(x + z, z - x, salt + 2) - 0.5) * 2) * (options.light ?? 0.08);
    color.setHSL(
      THREE.MathUtils.clamp(hsl.h + hueShift, 0, 1),
      THREE.MathUtils.clamp(hsl.s + satShift, 0, 1),
      THREE.MathUtils.clamp(hsl.l + lightShift, 0, 1),
    );
    clone.color.copy(color);
    clone.roughness = THREE.MathUtils.clamp(clone.roughness + ((hash(x * 0.7, z * 0.7, salt + 3) - 0.5) * 2) * (options.roughness ?? 0.05), 0.15, 1);
    return clone;
  };

  const GROUND_SURFACE_Y = Object.freeze({
    soilBase: 0,
    backdrop: 0.016,
    zoneSoft: 0.08,
    zonePrimary: 0.12,
    zoneAccent: 0.18,
    zoneFocus: 0.24,
    scatter: 0.3,
    scatterDetail: 0.36,
  });

  const createGroundSurfaceMaterial = (material, x = 0, z = 0, salt = 0, options = {}) => varyMaterial(material, x, z, salt, options);

  const createScatterMaterial = (material, x = 0, z = 0, salt = 0, opacity = 0.26, options = {}) => {
    const clone = varyMaterial(material, x, z, salt, options);
    clone.transparent = true;
    clone.opacity = opacity;
    clone.depthWrite = false;
    return clone;
  };

  const setShadow = (mesh, receive = true) => {
    mesh.castShadow = true;
    mesh.receiveShadow = receive;
    return mesh;
  };

  function registerWorldObject({ mesh, source, blocking = false, footprint = null, collider = null }) {
    if (mesh) {
      mesh.userData.worldSource = source;
      mesh.userData.blocking = blocking;
    }
    return collision.registerWorldObject({ source, blocking, footprint, collider });
  }

  const addBox = ({ x = 0, y = 0.1, z = 0, sx, sy, sz, material, receive = true, rotation = 0, source = 'box', blocking = false, collider = null }) => {
    const mesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material), receive);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mapRoot.add(mesh);
    registerWorldObject({
      mesh,
      source,
      blocking,
      footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation },
      collider,
    });
    return mesh;
  };

  const addCylinder = ({ x = 0, y = 0.1, z = 0, rt, rb = rt, h, segments = 12, material, receive = true, source = 'cylinder', blocking = false, collider = null }) => {
    const mesh = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material), receive);
    mesh.position.set(x, y, z);
    mapRoot.add(mesh);
    registerWorldObject({
      mesh,
      source,
      blocking,
      footprint: { type: 'circle', x, z, radius: Math.max(rt, rb) },
      collider,
    });
    return mesh;
  };

  const addGroundPatch = ({ x = 0, z = 0, sx, sz, y = GROUND_SURFACE_Y.zonePrimary, height = 0.08, material, rotation = 0, materialSalt = 0, layer = 0, receiveShadow = true, source = 'ground-patch' }) => {
    const patchHeight = Math.max(height, 0.06);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(sx, patchHeight, sz), createGroundSurfaceMaterial(material, x, z, materialSalt));
    patch.position.set(x, y - (patchHeight * 0.5), z);
    patch.rotation.y = rotation;
    patch.receiveShadow = receiveShadow;
    patch.renderOrder = layer;
    mapRoot.add(patch);
    registerWorldObject({ mesh: patch, source, blocking: false, footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation } });
    return patch;
  };

  const addSurfaceScatter = ({
    x,
    z,
    sx,
    sz,
    count,
    material,
    y = GROUND_SURFACE_Y.scatter,
    height = 0.024,
    maxSize = 5.5,
    opacity = 0.26,
    salt = 0,
    layer = 0,
    excludeRects = [],
    flat = false,
    lift = 0.01,
    source = 'surface-scatter',
  }) => {
    const scatterHeight = Math.max(height, 0.06);
    for (let i = 0; i < count; i++) {
      const px = x + ((hash(i + salt, z, salt + 10) - 0.5) * sx * 0.84);
      const pz = z + ((hash(x, i + salt, salt + 20) - 0.5) * sz * 0.84);
      const width = 1.2 + hash(px, pz, salt + 30) * maxSize;
      const depth = 1 + hash(pz, px, salt + 40) * maxSize * 0.7;
      const rotation = hash(px, pz, salt + 50) * Math.PI;
      const shouldSkip = excludeRects.some((rect) => (
        Math.abs(px - rect.x) <= rect.width * 0.5
        && Math.abs(pz - rect.z) <= rect.depth * 0.5
      ));
      if (shouldSkip) continue;
      const overlayMaterial = createScatterMaterial(material, px, pz, salt + i, opacity, { light: 0.1, sat: 0.04, hue: 0.008, roughness: 0.03 });
      const stain = new THREE.Mesh(new THREE.BoxGeometry(width, scatterHeight, depth), overlayMaterial);
      stain.position.set(px, y + lift - (scatterHeight * 0.5), pz);
      stain.rotation.y = rotation;
      stain.castShadow = false;
      stain.receiveShadow = false;
      stain.renderOrder = layer;
      mapRoot.add(stain);
      registerWorldObject({ mesh: stain, source: `${source}-${i}`, blocking: false, footprint: { type: 'rect', x: px, z: pz, width, depth, rotation } });
    }
  };

  const addPlanter = ({ x, z, sx, sz, withTrees = false, treeCount = 0, blocking = true, rotation = 0, style = 'planter', source = 'planter' }) => {
    const planter = new THREE.Group();
    planter.position.set(x, 0, z);
    planter.rotation.y = rotation;

    const borderMaterial = style === 'berm' ? shared.soil : shared.wallDark;
    const innerMaterial = shared.soil;
    const greensMaterial = withTrees ? shared.grassDark : shared.grass;
    const borderHeight = style === 'berm' ? 0.34 : 0.56;
    const innerInset = style === 'berm' ? 0.24 : 0.58;
    const greensInset = style === 'berm' ? 0.5 : 0.9;

    const border = new THREE.Mesh(new THREE.BoxGeometry(sx, borderHeight, sz), varyMaterial(borderMaterial, x, z, 4));
    border.position.y = borderHeight * 0.5;
    border.castShadow = true;
    border.receiveShadow = true;

    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.8, sx - innerInset), 0.24, Math.max(0.8, sz - innerInset)),
      createGroundSurfaceMaterial(innerMaterial, x + 1.5, z - 1.5, 5),
    );
    inner.position.y = style === 'berm' ? 0.18 : 0.24;
    inner.receiveShadow = true;
    inner.renderOrder = style === 'berm' ? 4 : 5;

    const greens = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.7, sx - greensInset), 0.16, Math.max(0.7, sz - greensInset)),
      createGroundSurfaceMaterial(greensMaterial, x - 1.2, z + 1.2, 6),
    );
    greens.position.y = style === 'berm' ? 0.29 : 0.47;
    greens.receiveShadow = true;
    greens.renderOrder = style === 'berm' ? 6 : 7;

    planter.add(border, inner, greens);

    if (withTrees && treeCount > 0) {
      for (let i = 0; i < treeCount; i++) {
        const px = (hash(i, x, 7) - 0.5) * sx * 0.48;
        const pz = (hash(z, i, 8) - 0.5) * sz * 0.48;
        const trunkHeight = 1.25 + hash(px, pz, 9) * 0.65;
        const crownRadius = 0.76 + hash(pz, px, 10) * 0.42;
        const trunk = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, trunkHeight, 8), shared.treeTrunk));
        trunk.position.set(px, 0.86 + trunkHeight * 0.5, pz);
        const crown = setShadow(new THREE.Mesh(new THREE.SphereGeometry(crownRadius, 9, 8), i % 2 === 0 ? shared.foliage : shared.foliageDark));
        crown.scale.y = 0.86 + hash(px, pz, 11) * 0.4;
        crown.position.set(px + (hash(px, pz, 12) - 0.5) * 0.28, trunk.position.y + trunkHeight * 0.46, pz + (hash(pz, px, 13) - 0.5) * 0.28);
        planter.add(trunk, crown);
      }
    } else {
      const bushCount = Math.max(3, Math.round((sx + sz) / 3.8));
      for (let i = 0; i < bushCount; i++) {
        const radius = 0.34 + hash(i, sx + sz, 14) * 0.26;
        const bush = setShadow(new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 7), i % 2 === 0 ? shared.foliage : shared.foliageDark));
        bush.scale.y = 0.82 + hash(i, z, 15) * 0.3;
        bush.position.set((hash(i, x, 16) - 0.5) * sx * 0.64, 0.72 + radius * 0.22, (hash(z, i, 17) - 0.5) * sz * 0.44);
        planter.add(bush);
      }
    }

    mapRoot.add(planter);
    registerWorldObject({
      mesh: planter,
      source,
      blocking,
      footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation },
      collider: blocking ? { type: 'rect', x, z, width: sx, depth: sz, rotation } : null,
    });
    return planter;
  };

  const addLamp = ({ x, z, h = 3.8, blocking = true, source = 'lamp' }) => {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);

    const base = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.22, 10), shared.bollard));
    base.position.y = 0.11;
    const pole = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, h, 10), shared.metal));
    pole.position.y = h * 0.5 + 0.18;
    const head = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), shared.trim));
    head.position.y = h + 0.16;
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.48), shared.lamp);
    glow.position.y = h + 0.02;

    lamp.add(base, pole, head, glow);
    mapRoot.add(lamp);
    registerWorldObject({
      mesh: lamp,
      source,
      blocking,
      footprint: { type: 'circle', x, z, radius: 0.38 },
      collider: blocking ? { type: 'circle', x, z, radius: 0.4 } : null,
    });
    return lamp;
  };

  const addBuilding = ({ x, z, sx, sz, h, rotation = 0, blocking = true, pad = 1.8, awning = true, source = 'building' }) => {
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    building.rotation.y = rotation;

    const padMesh = new THREE.Mesh(new THREE.BoxGeometry(sx + pad, 0.24, sz + pad), varyMaterial(shared.concrete, x, z, 20));
    padMesh.position.y = 0.12;
    padMesh.receiveShadow = true;

    const shell = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), varyMaterial(shared.wall, x, z, 21)));
    shell.position.y = h * 0.5 + 0.12;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.5, 0.32, sz + 0.5), varyMaterial(shared.roof, x, z, 22));
    roof.position.y = h + 0.44;
    roof.castShadow = true;
    roof.receiveShadow = true;

    const trimBand = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.95, 0.18, sz * 0.95), varyMaterial(shared.trim, x, z, 23));
    trimBand.position.y = Math.min(h - 0.8, 2.3);
    trimBand.receiveShadow = true;

    building.add(padMesh, shell, roof, trimBand);

    const windowRows = Math.max(1, Math.floor((h - 1.4) / 1.5));
    const frontCols = Math.max(2, Math.floor(sx / 2.4));
    const sideCols = Math.max(2, Math.floor(sz / 2.5));
    for (let row = 0; row < windowRows; row++) {
      const wy = 1.16 + row * 1.45;
      for (let col = 0; col < frontCols; col++) {
        const wx = -sx * 0.36 + (frontCols === 1 ? 0 : (col / (frontCols - 1)) * sx * 0.72);
        for (const dir of [-1, 1]) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.12), shared.glass);
          pane.position.set(wx, wy, dir * (sz * 0.5 + 0.07));
          building.add(pane);
        }
      }
      for (let col = 0; col < sideCols; col++) {
        const wz = -sz * 0.34 + (sideCols === 1 ? 0 : (col / (sideCols - 1)) * sz * 0.68);
        for (const dir of [-1, 1]) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.95), shared.glass);
          pane.position.set(dir * (sx * 0.5 + 0.07), wy, wz);
          building.add(pane);
        }
      }
    }

    if (awning) {
      const awningMesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.8, sx * 0.42), 0.14, 1.1), varyMaterial(shared.trim, x + 1, z - 1, 24));
      awningMesh.position.set(0, Math.min(h - 1, 2.6), sz * 0.5 + 0.52);
      awningMesh.castShadow = true;
      awningMesh.receiveShadow = true;
      building.add(awningMesh);
    }

    mapRoot.add(building);
    registerWorldObject({
      mesh: building,
      source,
      blocking,
      footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation },
      collider: blocking ? { type: 'rect', x, z, width: sx, depth: sz, rotation } : null,
    });
    return building;
  };

  const half = gameplayConfig.arena.size * 0.5;
  const buildableHalf = half - gameplayConfig.arena.padding - 2;

  addGroundPatch({ x: 0, z: 0, sx: gameplayConfig.arena.size, sz: gameplayConfig.arena.size, y: GROUND_SURFACE_Y.soilBase, height: 0.16, material: shared.soil, materialSalt: 30, layer: 0, source: 'terrain-soil-base' });
  addGroundPatch({ x: -9, z: -7, sx: 82, sz: 54, y: GROUND_SURFACE_Y.backdrop, height: 0.12, material: shared.grassDark, rotation: 0, materialSalt: 31, layer: 1, receiveShadow: false, source: 'terrain-grass-backdrop' });

  addGroundPatch({ x: 3, z: 5, sx: 76, sz: 60, y: GROUND_SURFACE_Y.zonePrimary, height: 0.1, material: shared.asphalt, rotation: -0.04, materialSalt: 32, layer: 3, source: 'zone-asphalt-main' });
  addGroundPatch({ x: -18, z: -18, sx: 30, sz: 24, y: GROUND_SURFACE_Y.zoneAccent, height: 0.09, material: shared.concrete, rotation: 0.07, materialSalt: 33, layer: 4, source: 'zone-concrete-southwest' });
  addGroundPatch({ x: 23, z: 16, sx: 28, sz: 18, y: GROUND_SURFACE_Y.zoneAccent, height: 0.09, material: shared.paver, rotation: -0.12, materialSalt: 34, layer: 4, source: 'zone-paver-east' });
  addGroundPatch({ x: 31, z: -21, sx: 24, sz: 20, y: GROUND_SURFACE_Y.zonePrimary, height: 0.09, material: shared.gravel, rotation: 0.09, materialSalt: 35, layer: 3, source: 'zone-gravel-southeast' });
  addGroundPatch({ x: -33, z: 25, sx: 18, sz: 19, y: GROUND_SURFACE_Y.zoneSoft, height: 0.09, material: shared.grass, rotation: 0.08, materialSalt: 36, layer: 2, source: 'zone-grass-northwest' });
  addGroundPatch({ x: -1, z: 40, sx: 36, sz: 12, y: GROUND_SURFACE_Y.zoneSoft, height: 0.09, material: shared.grass, rotation: -0.03, materialSalt: 37, layer: 2, source: 'zone-grass-north' });
  addGroundPatch({ x: 5, z: -43, sx: 58, sz: 15, y: GROUND_SURFACE_Y.zoneSoft, height: 0.09, material: shared.grassDark, rotation: 0.04, materialSalt: 38, layer: 2, source: 'zone-grass-south' });
  addGroundPatch({ x: 5, z: 8, sx: 22, sz: 16, y: GROUND_SURFACE_Y.zoneFocus, height: 0.085, material: shared.concreteLight, rotation: -0.08, materialSalt: 39, layer: 5, source: 'zone-concrete-center' });
  addGroundPatch({ x: -42, z: -3, sx: 13, sz: 54, y: GROUND_SURFACE_Y.zonePrimary, height: 0.09, material: shared.gravel, rotation: 0.02, materialSalt: 40, layer: 3, source: 'zone-gravel-west' });

  addSurfaceScatter({ x: 3, z: 5, sx: 76, sz: 60, count: 14, material: shared.asphaltDark, y: GROUND_SURFACE_Y.scatter, height: 0.024, maxSize: 6.5, opacity: 0.22, salt: 41, layer: 6, source: 'scatter-asphalt' });
  addSurfaceScatter({
    x: -18,
    z: -18,
    sx: 30,
    sz: 24,
    count: 8,
    material: shared.concreteLight,
    y: GROUND_SURFACE_Y.scatterDetail,
    height: 0.024,
    maxSize: 4.6,
    opacity: 0.2,
    salt: 42,
    layer: 7,
    flat: true,
    lift: 0.006,
    source: 'scatter-concrete',
  });
  addSurfaceScatter({
    x: 23,
    z: 16,
    sx: 28,
    sz: 18,
    count: 7,
    material: shared.concrete,
    y: GROUND_SURFACE_Y.scatterDetail,
    height: 0.024,
    maxSize: 3.8,
    opacity: 0.18,
    salt: 43,
    layer: 7,
    excludeRects: [{ x: 26.75, z: 15.75, width: 5.5, depth: 5.5 }],
    flat: true,
    lift: 0.006,
    source: 'scatter-paver',
  });
  addSurfaceScatter({ x: 31, z: -21, sx: 24, sz: 20, count: 8, material: shared.soil, y: GROUND_SURFACE_Y.scatter, height: 0.024, maxSize: 3.4, opacity: 0.18, salt: 44, layer: 6, source: 'scatter-gravel' });

  [
    { x: -1, y: 1.45, z: -buildableHalf + 1.3, sx: 72, sy: 2.9, sz: 3, rotation: 0.03, source: 'perimeter-wall-north' },
    { x: 39, y: 1.45, z: -8, sx: 3.2, sy: 2.9, sz: 42, rotation: 0.04, source: 'perimeter-wall-east' },
    { x: -46, y: 1.1, z: 23, sx: 3.6, sy: 2.2, sz: 28, rotation: -0.03, source: 'perimeter-wall-west' },
    { x: 6, y: 1.05, z: 48, sx: 34, sy: 2.1, sz: 3.2, rotation: -0.05, source: 'perimeter-wall-south' },
  ].forEach(({ x, y, z, sx, sy, sz, rotation, source }) => {
    addBox({
      x,
      y,
      z,
      sx,
      sy,
      sz,
      material: varyMaterial(shared.wallDark, x, z, 45 + Math.round(Math.abs(x + z))),
      rotation,
      source,
      blocking: true,
      collider: { type: 'rect', x, z, width: sx, depth: sz, rotation },
    });
  });

  const lampPositions = [
    [-24, -28], [-7, -23], [13, -19], [29, -10],
    [-15, 12], [6, 18], [24, 27], [-29, 34],
  ];
  lampPositions.forEach(([x, z], index) => addLamp({ x, z, h: 3.6 + (index % 3) * 0.25, source: `lamp-${index + 1}` }));

  const buildings = [
    { x: -35, z: -35, sx: 15, sz: 10, h: 8.2, rotation: 0.12, source: 'building-admin-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 7.5, rotation: -0.06, source: 'building-utility-southwest' },
    { x: 37, z: -11, sx: 16, sz: 22, h: 9.4, rotation: Math.PI * 0.5 - 0.06, awning: false, source: 'building-hall-east' },
    { x: 38, z: 18, sx: 11, sz: 14, h: 7.2, rotation: Math.PI * 0.5 + 0.05, source: 'building-kiosk-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 7.8, rotation: 0.08, source: 'building-service-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 4.8, rotation: -0.18, source: 'building-kiosk-north' },
  ];
  buildings.forEach(addBuilding);

  const plantedZones = [
    { x: -26, z: 21, sx: 11, sz: 14, withTrees: true, treeCount: 3, rotation: 0.15, source: 'planter-grove-west' },
    { x: -9, z: 38, sx: 15, sz: 8, withTrees: true, treeCount: 3, rotation: -0.08, source: 'planter-grove-north' },
    { x: 28, z: 29, sx: 10, sz: 7, withTrees: false, rotation: -0.12, source: 'planter-east-1' },
    { x: 17, z: 14, sx: 8, sz: 5, withTrees: false, rotation: -0.16, source: 'planter-east-2' },
    { x: -22, z: -10, sx: 8, sz: 5, withTrees: false, rotation: 0.08, source: 'planter-centerwest' },
    { x: 42, z: -33, sx: 8, sz: 18, withTrees: false, rotation: 0.04, style: 'berm', source: 'berm-southeast' },
    { x: -43, z: 43, sx: 12, sz: 10, withTrees: true, treeCount: 2, rotation: -0.05, style: 'berm', source: 'berm-northwest' },
    { x: 35, z: 42, sx: 16, sz: 8, withTrees: false, rotation: -0.03, style: 'berm', source: 'berm-northeast' },
  ];
  plantedZones.forEach(addPlanter);

  [
    { x: -3, z: -6, sx: 5.5, sz: 1.2, rotation: -0.22, source: 'barrier-mid-west' },
    { x: 12, z: 2, sx: 4.2, sz: 1.2, rotation: 0.12, source: 'barrier-mid-center' },
    { x: 22, z: -27, sx: 1.2, sz: 5.8, rotation: 0.08, source: 'barrier-mid-east' },
  ].forEach(({ x, z, sx, sz, rotation, source }) => {
    addBox({
      x,
      y: 0.36,
      z,
      sx,
      sy: 0.72,
      sz,
      material: varyMaterial(shared.curb, x, z, 49),
      rotation,
      source,
      blocking: true,
      collider: { type: 'rect', x, z, width: sx, depth: sz, rotation },
    });
  });

  [
    [-10, 11], [-4, 14], [2, 17], [8, 20],
    [20, -16], [24, -14], [28, -12],
  ].forEach(([x, z], index) => {
    addCylinder({
      x,
      y: 0.4,
      z,
      rt: 0.24,
      h: 0.8,
      material: shared.bollard,
      source: `bollard-${index + 1}`,
      blocking: true,
      collider: { type: 'circle', x, z, radius: 0.28 },
    });
  });

  const audit = collision.finalizeWorldAudit();
  if (audit.missingColliderObjects.length || audit.colliderWarnings.length) {
    console.warn('[WorldAudit] Collider audit detected issues.', audit);
  } else {
    console.info('[WorldAudit] Blocking world objects audited successfully.', audit);
  }

  return audit;
}
