export function createWorldMap({ THREE, gameplayConfig, mapRoot, addCollider }) {
  const shared = {
    frame: new THREE.MeshStandardMaterial({ color: 0x1f2232, roughness: 0.64, metalness: 0.38 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x131a29, roughness: 0.82, metalness: 0.12 }),
    trimViolet: new THREE.MeshStandardMaterial({ color: 0xa66bff, emissive: 0x6a2de3, emissiveIntensity: 0.28, roughness: 0.34, metalness: 0.46 }),
    trimTeal: new THREE.MeshStandardMaterial({ color: 0x42f0d0, emissive: 0x1a8d7d, emissiveIntensity: 0.24, roughness: 0.3, metalness: 0.38 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x262d42, roughness: 0.74, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0d111b, roughness: 0.9, metalness: 0.08 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9beaff, emissive: 0x1c5366, emissiveIntensity: 0.2, roughness: 0.18, metalness: 0.4 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffba63, emissive: 0x7d3904, emissiveIntensity: 0.18, roughness: 0.3, metalness: 0.28 }),
  };

  const half = gameplayConfig.arena.size * 0.5;
  const wallThickness = 2.8;
  const wallHeight = 5.2;
  const perimeter = [
    { x: 0, z: -half, sx: gameplayConfig.arena.size, sz: wallThickness },
    { x: 0, z: half, sx: gameplayConfig.arena.size, sz: wallThickness },
    { x: -half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size },
    { x: half, z: 0, sx: wallThickness, sz: gameplayConfig.arena.size },
  ];

  for (const side of perimeter) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(side.sx, wallHeight, side.sz), shared.wall);
    wall.position.set(side.x, wallHeight * 0.5, side.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    mapRoot.add(wall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(side.sx * (side.sx > side.sz ? 0.96 : 1), 0.24, side.sz * (side.sz > side.sx ? 0.96 : 1)), shared.trimViolet);
    rail.position.set(side.x, wallHeight - 0.55, side.z + (Math.abs(side.z) > 0 ? (side.z > 0 ? -0.18 : 0.18) : 0));
    mapRoot.add(rail);
  }

  const laneMarks = [-24, -12, 0, 12, 24];
  for (const z of laneMarks) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(half * 1.45, 0.05, 0.7), shared.trimTeal);
    lane.position.set(0, 0.03, z);
    mapRoot.add(lane);
  }
  for (const x of laneMarks) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, half * 1.45), shared.trimTeal);
    lane.position.set(x, 0.03, 0);
    mapRoot.add(lane);
  }

  const buildingSpots = [
    [-35, -33, 8, 6, 4.8], [-15, -35, 9, 7, 5], [10, -30, 7, 7, 4.2], [32, -32, 8, 6, 5],
    [-32, -12, 9, 8, 5.5], [34, -10, 8, 8, 4.8], [-36, 14, 10, 7, 5.2], [-10, 30, 7, 7, 4.2],
    [15, 28, 9, 6, 4.8], [36, 18, 8, 8, 5.5], [-20, 8, 8, 6, 4.2], [6, 10, 7, 9, 4.8],
  ];

  for (const [x, z, sx, sz, h] of buildingSpots) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), shared.frame);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    const inset = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.92, h * 0.92, sz * 0.9), shared.panel);
    inset.position.y = h * 0.5 + 0.04;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.96, 0.32, sz * 0.96), shared.dark);
    roof.position.y = h + 0.2;
    const bandFront = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.75, 0.24, 0.16), shared.trimTeal);
    bandFront.position.set(0, h * 0.62, sz * 0.5 + 0.08);
    const bandSide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, sz * 0.64), shared.trimViolet);
    bandSide.position.set(sx * 0.5 + 0.08, h * 0.38, 0);
    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.34, 0.7, 0.12), shared.glass);
    windowStrip.position.set(0, h * 0.58, sz * 0.5 + 0.09);
    b.add(body, inset, roof, bandFront, bandSide, windowStrip);
    mapRoot.add(b);
    addCollider(x, z, Math.max(sx, sz) * 0.58);
  }

  for (let i = -3; i <= 3; i++) {
    const pylons = [{ x: i * 8, z: -4, size: 2.4 }, { x: i * 8 + 2.5, z: 4, size: 2.1 }];
    for (const pylon of pylons) {
      const p = new THREE.Group();
      p.position.set(pylon.x, 0, pylon.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(pylon.size * 0.55, pylon.size * 0.72, 0.8, 8), shared.frame);
      base.position.y = 0.4;
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.1, 8), shared.trimTeal);
      core.position.y = 1.55;
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(pylon.size * 0.46, 0), shared.trimViolet);
      crown.position.y = 2.95;
      base.castShadow = core.castShadow = crown.castShadow = true;
      base.receiveShadow = true;
      p.add(base, core, crown);
      mapRoot.add(p);
      addCollider(pylon.x, pylon.z, pylon.size * 0.42);
    }
  }

  for (let i = 0; i < 22; i++) {
    const x = -44 + (i % 11) * 8.8;
    const z = i < 11 ? -47 : 47;
    const crate = new THREE.Group();
    crate.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.45, 1.8), shared.frame);
    body.position.y = 0.72;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 0.18), shared.amber);
    stripe.position.set(0, 0.9, 0.92);
    crate.add(body, stripe);
    crate.traverse((child) => { child.castShadow = true; child.receiveShadow = true; });
    mapRoot.add(crate);
    addCollider(x, z, 0.95);
  }

  for (const [x, z] of [[-5, -20], [20, -14], [-24, 22], [26, 22], [0, 33]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 1.1, 8), shared.frame);
    pedestal.position.y = 0.55;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 3.6, 6), shared.dark);
    obelisk.position.y = 2.65;
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.86, 0), shared.trimTeal);
    cap.position.y = 4.9;
    pedestal.castShadow = obelisk.castShadow = cap.castShadow = true;
    pedestal.receiveShadow = true;
    g.add(pedestal, obelisk, cap);
    mapRoot.add(g);
    addCollider(x, z, 1.2);
  }
}
