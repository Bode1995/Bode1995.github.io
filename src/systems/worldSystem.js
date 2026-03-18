export function createWorldMap({ THREE, gameplayConfig, mapRoot, addCollider }) {
  const shared = {
    frame: new THREE.MeshStandardMaterial({ color: 0x20283a, roughness: 0.62, metalness: 0.42 }),
    frameDark: new THREE.MeshStandardMaterial({ color: 0x151b29, roughness: 0.78, metalness: 0.18 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x101725, roughness: 0.86, metalness: 0.1 }),
    panelAlt: new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.74, metalness: 0.2 }),
    trimViolet: new THREE.MeshStandardMaterial({ color: 0x8f6fe8, emissive: 0x412078, emissiveIntensity: 0.2, roughness: 0.34, metalness: 0.46 }),
    trimTeal: new THREE.MeshStandardMaterial({ color: 0x38cdbd, emissive: 0x0f6156, emissiveIntensity: 0.16, roughness: 0.34, metalness: 0.32 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x232a3d, roughness: 0.76, metalness: 0.18 }),
    wallAccent: new THREE.MeshStandardMaterial({ color: 0x303b57, roughness: 0.58, metalness: 0.24 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0b1019, roughness: 0.9, metalness: 0.08 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9beaff, emissive: 0x143f4c, emissiveIntensity: 0.16, roughness: 0.2, metalness: 0.38 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb56a, emissive: 0x68310a, emissiveIntensity: 0.14, roughness: 0.34, metalness: 0.26 }),
    warning: new THREE.MeshStandardMaterial({ color: 0xc58d54, emissive: 0x3b2010, emissiveIntensity: 0.08, roughness: 0.5, metalness: 0.22 }),
  };

  const setShadow = (mesh, receive = true) => {
    mesh.castShadow = true;
    mesh.receiveShadow = receive;
    return mesh;
  };

  const addPanel = ({ x, z, sx, sz, y = 0.026, material = shared.panelAlt }) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.03, sz), material);
    panel.position.set(x, y, z);
    panel.receiveShadow = true;
    mapRoot.add(panel);
    return panel;
  };

  const addLine = ({ x = 0, z = 0, sx, sz, y = 0.038, material = shared.trimTeal }) => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.018, sz), material);
    line.position.set(x, y, z);
    mapRoot.add(line);
    return line;
  };

  const half = gameplayConfig.arena.size * 0.5;
  const wallThickness = 2.8;
  const wallHeight = 5.2;

  const perimeter = [
    { x: 0, z: -half, sx: gameplayConfig.arena.size, sz: wallThickness, axis: 'x' },
    { x: 0, z: half, sx: gameplayConfig.arena.size, sz: wallThickness, axis: 'x' },
    { x: -half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size, axis: 'z' },
    { x: half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size, axis: 'z' },
  ];

  for (const side of perimeter) {
    const wall = setShadow(new THREE.Mesh(new THREE.BoxGeometry(side.sx, wallHeight, side.sz), shared.wall));
    wall.position.set(side.x, wallHeight * 0.5, side.z);
    mapRoot.add(wall);

    const inlay = new THREE.Mesh(
      new THREE.BoxGeometry(side.axis === 'x' ? side.sx * 0.94 : 0.42, wallHeight * 0.62, side.axis === 'z' ? side.sz * 0.94 : 0.42),
      shared.frameDark,
    );
    inlay.position.set(side.x, wallHeight * 0.45, side.z + (side.axis === 'x' ? (side.z > 0 ? -0.24 : 0.24) : 0));
    mapRoot.add(inlay);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(side.sx * (side.axis === 'x' ? 0.96 : 1), 0.18, side.sz * (side.axis === 'z' ? 0.96 : 1)),
      shared.trimViolet,
    );
    rail.position.set(side.x, wallHeight - 0.58, side.z + (side.axis === 'x' ? (side.z > 0 ? -0.18 : 0.18) : 0));
    mapRoot.add(rail);

    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(side.sx * (side.axis === 'x' ? 0.98 : 1), 0.3, side.sz * (side.axis === 'z' ? 0.98 : 1)),
      shared.wallAccent,
    );
    lip.position.set(side.x, 0.15, side.z);
    lip.receiveShadow = true;
    mapRoot.add(lip);

    for (let i = -4; i <= 4; i += 2) {
      const brace = setShadow(new THREE.Mesh(
        new THREE.BoxGeometry(side.axis === 'x' ? 1.4 : 0.44, 3.9, side.axis === 'z' ? 1.4 : 0.44),
        shared.frame,
      ));
      if (side.axis === 'x') brace.position.set(i * 12, 1.95, side.z + (side.z > 0 ? -0.48 : 0.48));
      else brace.position.set(side.x + (side.x > 0 ? -0.48 : 0.48), 1.95, i * 12);
      mapRoot.add(brace);

      const lightPort = new THREE.Mesh(
        new THREE.BoxGeometry(side.axis === 'x' ? 0.72 : 0.16, 0.34, side.axis === 'z' ? 0.72 : 0.16),
        shared.trimTeal,
      );
      lightPort.position.copy(brace.position);
      lightPort.position.y = 2.1;
      lightPort.position.add(new THREE.Vector3(0, 0, side.axis === 'x' ? (side.z > 0 ? -0.32 : 0.32) : 0));
      if (side.axis === 'z') lightPort.position.x += side.x > 0 ? -0.32 : 0.32;
      mapRoot.add(lightPort);
    }
  }

  const serviceBands = [-42, -28, -14, 14, 28, 42];
  for (const z of serviceBands) {
    addPanel({ x: 0, z, sx: gameplayConfig.arena.size * 0.76, sz: 3.6, material: z % 28 === 0 ? shared.panel : shared.panelAlt });
  }
  for (const x of serviceBands) {
    addPanel({ x, z: 0, sx: 3.6, sz: gameplayConfig.arena.size * 0.76, material: x % 28 === 0 ? shared.panel : shared.panelAlt });
  }

  const laneMarks = [-36, -18, 0, 18, 36];
  for (const z of laneMarks) {
    addLine({ x: 0, z, sx: gameplayConfig.arena.size * (z === 0 ? 0.82 : 0.74), sz: z === 0 ? 0.42 : 0.24, material: z === 0 ? shared.warning : shared.trimTeal });
    for (let x = -36; x <= 36; x += 12) {
      addPanel({ x, z, sx: 4.2, sz: 1.1, y: 0.024, material: (x + z) % 24 === 0 ? shared.frameDark : shared.panelAlt });
    }
  }
  for (const x of laneMarks) {
    addLine({ x, z: 0, sx: x === 0 ? 0.42 : 0.24, sz: gameplayConfig.arena.size * (x === 0 ? 0.82 : 0.74), material: x === 0 ? shared.warning : shared.trimTeal });
    for (let z = -36; z <= 36; z += 12) {
      addPanel({ x, z, sx: 1.1, sz: 4.2, y: 0.024, material: (x - z) % 24 === 0 ? shared.frameDark : shared.panelAlt });
    }
  }

  const quadrantPanels = [
    [-23, -23, 18, 14], [23, -23, 16, 18], [-23, 23, 16, 18], [23, 23, 18, 14],
    [-6, -26, 10, 14], [8, 24, 12, 16], [25, -4, 14, 12], [-26, 6, 12, 14],
  ];
  quadrantPanels.forEach(([x, z, sx, sz], index) => {
    addPanel({ x, z, sx, sz, material: index % 3 === 0 ? shared.panel : shared.panelAlt });
    addPanel({ x, z, sx: sx * 0.72, sz: sz * 0.72, y: 0.03, material: index % 2 === 0 ? shared.frameDark : shared.panel });
    addLine({ x, z: z - sz * 0.36 + 0.18, sx: sx * 0.58, sz: 0.12, y: 0.041, material: index % 2 === 0 ? shared.trimViolet : shared.trimTeal });
  });

  const buildingSpots = [
    [-35, -33, 8, 6, 4.8], [-15, -35, 9, 7, 5], [10, -30, 7, 7, 4.2], [32, -32, 8, 6, 5],
    [-32, -12, 9, 8, 5.5], [34, -10, 8, 8, 4.8], [-36, 14, 10, 7, 5.2], [-10, 30, 7, 7, 4.2],
    [15, 28, 9, 6, 4.8], [36, 18, 8, 8, 5.5], [-20, 8, 8, 6, 4.2], [6, 10, 7, 9, 4.8],
  ];

  for (const [x, z, sx, sz, h] of buildingSpots) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(sx + 1.6, 0.42, sz + 1.6), shared.frameDark);
    pad.position.y = 0.21;
    pad.receiveShadow = true;

    const skirt = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx + 0.7, 0.8, sz + 0.7), shared.frame));
    skirt.position.y = 0.4;

    const body = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), shared.frame));
    body.position.y = h * 0.5 + 0.26;

    const inset = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.9, h * 0.88, sz * 0.88), shared.panel);
    inset.position.y = h * 0.5 + 0.34;

    const midBand = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.96, 0.3, sz * 0.96), shared.panelAlt);
    midBand.position.y = h * 0.56 + 0.28;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.92, 0.34, sz * 0.92), shared.dark);
    roof.position.y = h + 0.52;

    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.2, sx * 0.34), 0.54, Math.max(1.2, sz * 0.34)), shared.frameDark);
    roofCap.position.y = h + 0.9;

    const bandFront = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.72, 0.2, 0.14), shared.trimTeal);
    bandFront.position.set(0, h * 0.66 + 0.28, sz * 0.5 + 0.08);

    const bandRear = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.4, 0.16, 0.14), shared.warning);
    bandRear.position.set(0, h * 0.36 + 0.26, -sz * 0.5 - 0.08);

    const bandSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, sz * 0.62), shared.trimViolet);
    bandSide.position.set(sx * 0.5 + 0.08, h * 0.42 + 0.26, 0);

    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.28, 0.72, 0.12), shared.glass);
    windowStrip.position.set(0, h * 0.56 + 0.28, sz * 0.5 + 0.09);

    const ventA = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.22, 0.18, 0.5), shared.wallAccent);
    ventA.position.set(-sx * 0.18, h + 0.78, 0);
    const ventB = ventA.clone();
    ventB.position.x = sx * 0.18;

    for (const corner of [
      [-sx * 0.5 - 0.12, 1.1, -sz * 0.5 - 0.12],
      [sx * 0.5 + 0.12, 1.1, -sz * 0.5 - 0.12],
      [-sx * 0.5 - 0.12, 1.1, sz * 0.5 + 0.12],
      [sx * 0.5 + 0.12, 1.1, sz * 0.5 + 0.12],
    ]) {
      const strut = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.8, 0.28), shared.wallAccent));
      strut.position.set(corner[0], corner[1], corner[2]);
      b.add(strut);
    }

    b.add(pad, skirt, body, inset, midBand, roof, roofCap, bandFront, bandRear, bandSide, windowStrip, ventA, ventB);
    mapRoot.add(b);
    addCollider(x, z, Math.max(sx, sz) * 0.58);
  }

  for (let i = -3; i <= 3; i++) {
    const pylons = [{ x: i * 8, z: -4, size: 2.4 }, { x: i * 8 + 2.5, z: 4, size: 2.1 }];
    for (const pylon of pylons) {
      const p = new THREE.Group();
      p.position.set(pylon.x, 0, pylon.z);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(pylon.size * 0.82, pylon.size * 0.92, 0.18, 10), shared.frameDark);
      pad.position.y = 0.09;
      pad.receiveShadow = true;

      const base = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(pylon.size * 0.58, pylon.size * 0.74, 0.82, 10), shared.frame));
      base.position.y = 0.42;

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(pylon.size * 0.42, pylon.size * 0.5, 0.26, 10), shared.wallAccent);
      collar.position.y = 0.88;

      const core = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8), shared.trimTeal));
      core.position.y = 1.76;

      const finA = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.2, pylon.size * 0.82), shared.panelAlt), false);
      finA.position.set(0, 1.72, 0);
      const finB = finA.clone();
      finB.rotation.y = Math.PI / 2;

      const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(pylon.size * 0.28, pylon.size * 0.34, 0.18, 8), shared.trimViolet);
      crownBase.position.y = 2.86;

      const crown = setShadow(new THREE.Mesh(new THREE.OctahedronGeometry(pylon.size * 0.44, 0), shared.trimViolet));
      crown.position.y = 3.24;

      p.add(pad, base, collar, core, finA, finB, crownBase, crown);
      mapRoot.add(p);
      addCollider(pylon.x, pylon.z, pylon.size * 0.42);
    }
  }

  for (let i = 0; i < 22; i++) {
    const x = -44 + (i % 11) * 8.8;
    const z = i < 11 ? -47 : 47;
    const crate = new THREE.Group();
    crate.position.set(x, 0, z);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), shared.frameDark);
    pad.position.y = 0.08;
    pad.receiveShadow = true;

    const body = setShadow(new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.2, 1.82), shared.frame));
    body.position.y = 0.68;

    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.86, 1.48), shared.panelAlt);
    inner.position.y = 0.74;

    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.24, 1.62), shared.frameDark);
    lid.position.y = 1.42;

    const stripeFront = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 0.14), shared.amber);
    stripeFront.position.set(0, 0.98, 0.92);

    const stripeSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.12), shared.trimTeal);
    stripeSide.position.set(0.92, 0.72, 0);

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.26), shared.warning);
    latch.position.set(0, 1.08, 0.96);

    for (const corner of [[-0.68, 0.62, -0.68], [0.68, 0.62, -0.68], [-0.68, 0.62, 0.68], [0.68, 0.62, 0.68]]) {
      const clamp = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 0.18), shared.wallAccent));
      clamp.position.set(corner[0], corner[1], corner[2]);
      crate.add(clamp);
    }

    crate.add(pad, body, inner, lid, stripeFront, stripeSide, latch);
    mapRoot.add(crate);
    addCollider(x, z, 0.95);
  }

  for (const [x, z] of [[-5, -20], [20, -14], [-24, 22], [26, 22], [0, 33]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const basePad = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.18, 10), shared.frameDark);
    basePad.position.y = 0.09;
    basePad.receiveShadow = true;

    const pedestal = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.65, 1.08, 8), shared.frame));
    pedestal.position.y = 0.54;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 18), shared.warning);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.88;

    const obelisk = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 3.2, 6), shared.dark));
    obelisk.position.y = 2.5;

    const braceA = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 1.18), shared.panelAlt));
    braceA.position.set(0, 2.1, 0);
    const braceB = braceA.clone();
    braceB.rotation.y = Math.PI / 2;

    const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.18, 6), shared.trimTeal);
    capBase.position.y = 4.28;

    const cap = setShadow(new THREE.Mesh(new THREE.OctahedronGeometry(0.84, 0), shared.trimTeal));
    cap.position.y = 4.84;

    g.add(basePad, pedestal, ring, obelisk, braceA, braceB, capBase, cap);
    mapRoot.add(g);
    addCollider(x, z, 1.2);
  }
}
