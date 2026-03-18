export function createWorldMap({ THREE, gameplayConfig, mapRoot, addCollider }) {
  const shared = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x5f625c, roughness: 0.98, metalness: 0.02 }),
    asphaltDark: new THREE.MeshStandardMaterial({ color: 0x4c4e49, roughness: 1, metalness: 0.01 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xb9b1a2, roughness: 0.94, metalness: 0.04 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0xcac4b7, roughness: 0.92, metalness: 0.03 }),
    paver: new THREE.MeshStandardMaterial({ color: 0x9e9486, roughness: 0.95, metalness: 0.03 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xddd5c8, roughness: 0.9, metalness: 0.02 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x6d5742, roughness: 1, metalness: 0 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x698253, roughness: 0.98, metalness: 0 }),
    grassDark: new THREE.MeshStandardMaterial({ color: 0x556741, roughness: 0.98, metalness: 0 }),
    treeTrunk: new THREE.MeshStandardMaterial({ color: 0x6a4b34, roughness: 1, metalness: 0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x5f8650, roughness: 0.96, metalness: 0 }),
    foliageDark: new THREE.MeshStandardMaterial({ color: 0x47653d, roughness: 0.96, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xb5a999, roughness: 0.94, metalness: 0.04 }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x8c7f73, roughness: 0.95, metalness: 0.04 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x7a685b, roughness: 0.92, metalness: 0.06 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xd8ccb9, roughness: 0.88, metalness: 0.08 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc5cf, emissive: 0x35505a, emissiveIntensity: 0.07, roughness: 0.28, metalness: 0.24 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x66625b, roughness: 0.72, metalness: 0.22 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xf0d6a0, emissive: 0xf0c781, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.18 }),
    bollard: new THREE.MeshStandardMaterial({ color: 0x4f524f, roughness: 0.78, metalness: 0.12 }),
  };

  const setShadow = (mesh, receive = true) => {
    mesh.castShadow = true;
    mesh.receiveShadow = receive;
    return mesh;
  };

  const addBox = ({ x = 0, y = 0.1, z = 0, sx, sy, sz, material, receive = true }) => {
    const mesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material), receive);
    mesh.position.set(x, y, z);
    mapRoot.add(mesh);
    return mesh;
  };

  const addCylinder = ({ x = 0, y = 0.1, z = 0, rt, rb = rt, h, segments = 12, material, receive = true }) => {
    const mesh = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material), receive);
    mesh.position.set(x, y, z);
    mapRoot.add(mesh);
    return mesh;
  };

  const addGroundPatch = ({ x = 0, z = 0, sx, sz, y = 0.02, material }) => {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.04, sz), material);
    patch.position.set(x, y, z);
    patch.receiveShadow = true;
    mapRoot.add(patch);
    return patch;
  };

  const addPlanter = ({ x, z, sx, sz, withTrees = false, treeCount = 0, collider = true, rotation = 0 }) => {
    const planter = new THREE.Group();
    planter.position.set(x, 0, z);
    planter.rotation.y = rotation;

    const border = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.56, sz), shared.wallDark);
    border.position.y = 0.28;
    border.castShadow = true;
    border.receiveShadow = true;

    const inner = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.8, sx - 0.58), 0.4, Math.max(0.8, sz - 0.58)), shared.soil);
    inner.position.y = 0.24;
    inner.receiveShadow = true;

    const greens = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.7, sx - 0.9), 0.18, Math.max(0.7, sz - 0.9)), withTrees ? shared.grassDark : shared.grass);
    greens.position.y = 0.47;
    greens.receiveShadow = true;

    planter.add(border, inner, greens);

    if (withTrees && treeCount > 0) {
      const cols = Math.ceil(Math.sqrt(treeCount));
      const rows = Math.ceil(treeCount / cols);
      let placed = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols && placed < treeCount; col++, placed++) {
          const px = cols === 1 ? 0 : (-sx * 0.25) + (col / (cols - 1)) * (sx * 0.5);
          const pz = rows === 1 ? 0 : (-sz * 0.25) + (row / (rows - 1)) * (sz * 0.5);
          const trunk = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), shared.treeTrunk));
          trunk.position.set(px, 1.1, pz);
          const crown = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.82, 9, 8), placed % 2 === 0 ? shared.foliage : shared.foliageDark));
          crown.position.set(px, 2.25, pz);
          planter.add(trunk, crown);
        }
      }
    } else {
      const bushCount = Math.max(2, Math.round((sx + sz) / 4));
      for (let i = 0; i < bushCount; i++) {
        const bush = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.45 + (i % 3) * 0.08, 8, 7), i % 2 === 0 ? shared.foliage : shared.foliageDark));
        const tx = bushCount === 1 ? 0 : -sx * 0.28 + (i / (bushCount - 1)) * sx * 0.56;
        const tz = ((i % 2) - 0.5) * Math.min(0.9, sz * 0.18);
        bush.position.set(tx, 0.86, tz);
        planter.add(bush);
      }
    }

    mapRoot.add(planter);
    if (collider) addCollider(x, z, Math.max(sx, sz) * 0.42);
    return planter;
  };

  const addLamp = ({ x, z, h = 3.8 }) => {
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
    return lamp;
  };

  const addBuilding = ({ x, z, sx, sz, h, rotation = 0, collider = true }) => {
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    building.rotation.y = rotation;

    const pad = new THREE.Mesh(new THREE.BoxGeometry(sx + 1.8, 0.26, sz + 1.8), shared.concrete);
    pad.position.y = 0.13;
    pad.receiveShadow = true;

    const shell = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), shared.wall));
    shell.position.y = h * 0.5 + 0.13;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.5, 0.32, sz + 0.5), shared.roof);
    roof.position.y = h + 0.45;
    roof.castShadow = true;
    roof.receiveShadow = true;

    const trimBand = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.96, 0.18, sz * 0.96), shared.trim);
    trimBand.position.y = 2.2;
    trimBand.receiveShadow = true;

    building.add(pad, shell, roof, trimBand);

    const windowRows = Math.max(1, Math.floor((h - 1.4) / 1.5));
    const frontCols = Math.max(2, Math.floor(sx / 2.2));
    const sideCols = Math.max(2, Math.floor(sz / 2.4));
    for (let row = 0; row < windowRows; row++) {
      const wy = 1.2 + row * 1.45;
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

    const awning = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.8, sx * 0.4), 0.14, 1), shared.trim);
    awning.position.set(0, 2.5, sz * 0.5 + 0.48);
    awning.castShadow = true;
    awning.receiveShadow = true;
    building.add(awning);

    mapRoot.add(building);
    if (collider) addCollider(x, z, Math.max(sx, sz) * 0.58);
    return building;
  };

  const half = gameplayConfig.arena.size * 0.5;
  const boundaryOffset = half - 1.8;

  addGroundPatch({ x: 0, z: 0, sx: gameplayConfig.arena.size, sz: gameplayConfig.arena.size, y: 0.02, material: shared.asphalt });
  addGroundPatch({ x: 0, z: 0, sx: gameplayConfig.arena.size * 0.8, sz: gameplayConfig.arena.size * 0.8, y: 0.04, material: shared.asphaltDark });
  addGroundPatch({ x: 0, z: 0, sx: 34, sz: 34, y: 0.055, material: shared.paver });
  addGroundPatch({ x: 0, z: 0, sx: 12, sz: 12, y: 0.07, material: shared.concreteLight });

  addGroundPatch({ x: 0, z: -22, sx: 44, sz: 8, y: 0.05, material: shared.concrete });
  addGroundPatch({ x: 0, z: 22, sx: 44, sz: 8, y: 0.05, material: shared.concrete });
  addGroundPatch({ x: -22, z: 0, sx: 8, sz: 44, y: 0.05, material: shared.concrete });
  addGroundPatch({ x: 22, z: 0, sx: 8, sz: 44, y: 0.05, material: shared.concrete });

  for (const z of [-34, 34]) {
    addGroundPatch({ x: 0, z, sx: 88, sz: 10, y: 0.045, material: shared.concrete });
    for (let x = -36; x <= 36; x += 12) addGroundPatch({ x, z, sx: 6.6, sz: 1.5, y: 0.06, material: shared.curb });
  }
  for (const x of [-34, 34]) {
    addGroundPatch({ x, z: 0, sx: 10, sz: 88, y: 0.045, material: shared.concrete });
    for (let z = -36; z <= 36; z += 12) addGroundPatch({ x, z, sx: 1.5, sz: 6.6, y: 0.06, material: shared.curb });
  }

  const perimeterSegments = [
    { x: 0, z: -boundaryOffset, sx: gameplayConfig.arena.size - 8, sz: 3.2 },
    { x: 0, z: boundaryOffset, sx: gameplayConfig.arena.size - 8, sz: 3.2 },
    { x: -boundaryOffset, z: 0, sx: 3.2, sz: gameplayConfig.arena.size - 8 },
    { x: boundaryOffset, z: 0, sx: 3.2, sz: gameplayConfig.arena.size - 8 },
  ];
  perimeterSegments.forEach(({ x, z, sx, sz }) => {
    addBox({ x, y: 1.5, z, sx, sy: 3, sz, material: shared.wallDark });
    addBox({ x, y: 0.35, z, sx: sx + 0.6, sy: 0.26, sz: sz + 0.6, material: shared.trim, receive: true });
  });

  for (let i = -4; i <= 4; i++) {
    addLamp({ x: i * 12, z: -boundaryOffset + 2.7 });
    addLamp({ x: i * 12, z: boundaryOffset - 2.7 });
    addLamp({ x: -boundaryOffset + 2.7, z: i * 12 });
    addLamp({ x: boundaryOffset - 2.7, z: i * 12 });
  }

  const buildingSpots = [
    [-40, -40, 10, 8, 8], [-23, -41, 12, 8, 9], [0, -40, 14, 8, 8.5], [24, -41, 12, 8, 9], [40, -40, 10, 8, 8],
    [-41, -19, 8, 11, 7.5], [41, -19, 8, 11, 7.5], [-41, 19, 8, 11, 7.5], [41, 19, 8, 11, 7.5],
    [-40, 40, 10, 8, 8], [-23, 41, 12, 8, 9], [0, 40, 14, 8, 8.5], [24, 41, 12, 8, 9], [40, 40, 10, 8, 8],
  ];
  for (const [x, z, sx, sz, h] of buildingSpots) addBuilding({ x, z, sx, sz, h, rotation: Math.abs(x) > Math.abs(z) ? Math.PI / 2 : 0 });

  const plazaPlanters = [
    { x: -12, z: -12, sx: 7, sz: 7, withTrees: true, treeCount: 1 },
    { x: 12, z: -12, sx: 7, sz: 7, withTrees: true, treeCount: 1 },
    { x: -12, z: 12, sx: 7, sz: 7, withTrees: true, treeCount: 1 },
    { x: 12, z: 12, sx: 7, sz: 7, withTrees: true, treeCount: 1 },
  ];
  plazaPlanters.forEach(addPlanter);

  const edgeGreenery = [
    { x: 0, z: -48, sx: 18, sz: 4, withTrees: false },
    { x: 0, z: 48, sx: 18, sz: 4, withTrees: false },
    { x: -48, z: 0, sx: 4, sz: 18, withTrees: false },
    { x: 48, z: 0, sx: 4, sz: 18, withTrees: false },
    { x: -22, z: -48, sx: 10, sz: 4, withTrees: false },
    { x: 22, z: -48, sx: 10, sz: 4, withTrees: false },
    { x: -22, z: 48, sx: 10, sz: 4, withTrees: false },
    { x: 22, z: 48, sx: 10, sz: 4, withTrees: false },
  ];
  edgeGreenery.forEach(addPlanter);

  for (const [x, z, sx, sz] of [[0, -10, 16, 2.4], [0, 10, 16, 2.4], [-10, 0, 2.4, 16], [10, 0, 2.4, 16]]) {
    addBox({ x, y: 0.45, z, sx, sy: 0.9, sz, material: shared.curb });
    addCollider(x, z, Math.max(sx, sz) * 0.32);
  }

  const kiosks = [
    [-24, 0, 6, 4, 4.2], [24, 0, 6, 4, 4.2], [0, -24, 4, 6, 4.2], [0, 24, 4, 6, 4.2],
  ];
  kiosks.forEach(([x, z, sx, sz, h], index) => addBuilding({ x, z, sx, sz, h, rotation: index >= 2 ? Math.PI / 2 : 0 }));

  for (let i = -3; i <= 3; i++) {
    const x = i * 11;
    addCylinder({ x, y: 0.4, z: -5.5, rt: 0.26, h: 0.8, material: shared.bollard });
    addCylinder({ x, y: 0.4, z: 5.5, rt: 0.26, h: 0.8, material: shared.bollard });
    addCylinder({ x: -5.5, y: 0.4, z: x, rt: 0.26, h: 0.8, material: shared.bollard });
    addCylinder({ x: 5.5, y: 0.4, z: x, rt: 0.26, h: 0.8, material: shared.bollard });
  }
}
