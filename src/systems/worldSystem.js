export function createWorldMap({ THREE, gameplayConfig, mapRoot, addCollider }) {
  const shared = {
    building: new THREE.MeshStandardMaterial({ color: 0x4e6078, roughness: 0.84, metalness: 0.08 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x7f99b8, roughness: 0.65, metalness: 0.12 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xa6e5d2, roughness: 0.4, metalness: 0.2, emissive: 0x10211c }),
    wall: new THREE.MeshStandardMaterial({ color: 0x334753, roughness: 0.9, metalness: 0.06 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5f4e41, roughness: 0.92, metalness: 0.02 }),
    foliageA: new THREE.MeshStandardMaterial({ color: 0x2f8758, roughness: 0.9, metalness: 0.02 }),
    foliageB: new THREE.MeshStandardMaterial({ color: 0x53a76b, roughness: 0.86, metalness: 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x717d8d, roughness: 0.82, metalness: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x88613f, roughness: 0.88, metalness: 0.03 }),
  };

  const half = gameplayConfig.arena.size * 0.5;
  const wallThickness = 2.4;
  const wallHeight = 4.8;
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
  }

  const buildingSpots = [
    [-35, -33, 8, 6, 4.4], [-15, -35, 9, 7, 5], [10, -30, 7, 7, 4], [32, -32, 8, 6, 4.8],
    [-32, -12, 9, 8, 5.2], [34, -10, 8, 8, 4.5], [-36, 14, 10, 7, 5], [-10, 30, 7, 7, 4],
    [15, 28, 9, 6, 4.6], [36, 18, 8, 8, 5.2], [-20, 8, 8, 6, 4.1], [6, 10, 7, 9, 4.6],
  ];

  for (const [x, z, sx, sz, h] of buildingSpots) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), shared.building);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.88, 0.45, sz * 0.88), shared.roof);
    roof.position.y = h + 0.22;
    roof.castShadow = true;
    const glow = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.15, 1, 0.22), shared.trim);
    glow.position.set(0, h * 0.5 + 0.3, sz * 0.5 + 0.08);
    b.add(body, roof, glow);
    mapRoot.add(b);
    addCollider(x, z, Math.max(sx, sz) * 0.58);
  }

  for (let i = -3; i <= 3; i++) {
    const planters = [{ x: i * 8, z: -4, size: 2.4 }, { x: i * 8 + 2.5, z: 4, size: 2.1 }];
    for (const planter of planters) {
      const p = new THREE.Group();
      p.position.set(planter.x, 0, planter.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(planter.size * 0.55, planter.size * 0.68, 0.8, 7), shared.stone);
      base.position.y = 0.4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 6), shared.wood);
      trunk.position.y = 1.2;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(planter.size * 0.8, 2.2, 7), i % 2 === 0 ? shared.foliageA : shared.foliageB);
      crown.position.y = 2.7;
      base.castShadow = trunk.castShadow = crown.castShadow = true;
      base.receiveShadow = true;
      p.add(base, trunk, crown);
      mapRoot.add(p);
      addCollider(planter.x, planter.z, planter.size * 0.42);
    }
  }

  for (let i = 0; i < 22; i++) {
    const x = -44 + (i % 11) * 8.8;
    const z = i < 11 ? -47 : 47;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.6), shared.crate);
    crate.position.set(x, 0.75, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    mapRoot.add(crate);
    addCollider(x, z, 0.95);
  }

  for (const [x, z] of [[-5, -20], [20, -14], [-24, 22], [26, 22], [0, 33]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 1.1, 8), shared.stone);
    pedestal.position.y = 0.55;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 3.4, 6), shared.wall);
    obelisk.position.y = 2.55;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.1, 6), shared.trim);
    cap.position.y = 4.8;
    pedestal.castShadow = obelisk.castShadow = cap.castShadow = true;
    pedestal.receiveShadow = true;
    g.add(pedestal, obelisk, cap);
    mapRoot.add(g);
    addCollider(x, z, 1.2);
  }
}
