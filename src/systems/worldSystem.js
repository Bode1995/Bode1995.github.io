import { getWorldDefinition } from '../config/worlds.js';

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

export function createWorldMap({ THREE, gameplayConfig, mapRoot, collision, worldIndex = 1 }) {
  clearWorldMap(mapRoot);
  collision.clearColliders();

  const world = getWorldDefinition(worldIndex);
  const env = world.environment;
  const makeMaterial = (config) => new THREE.MeshStandardMaterial(config);
  const shared = createWorldMaterials(THREE, env, makeMaterial);

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
    clone.roughness = THREE.MathUtils.clamp(
      clone.roughness + ((hash(x * 0.7, z * 0.7, salt + 3) - 0.5) * 2) * (options.roughness ?? 0.05),
      0.12,
      1,
    );
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
      mesh.userData.worldTheme = world.key;
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

  const addDecal = ({ x = 0, z = 0, sx = 1, sz = 1, y = 0.03, rotation = 0, material, source = 'decal' }) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotation;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mapRoot.add(mesh);
    registerWorldObject({
      mesh,
      source,
      blocking: false,
      footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation },
    });
    return mesh;
  };

  const addSphere = ({ x = 0, y = 0.5, z = 0, r = 0.5, material, source = 'sphere', blocking = false, collider = null, scale = [1, 1, 1] }) => {
    const mesh = setShadow(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material));
    mesh.position.set(x, y, z);
    mesh.scale.set(...scale);
    mapRoot.add(mesh);
    registerWorldObject({
      mesh,
      source,
      blocking,
      footprint: { type: 'circle', x, z, radius: r * Math.max(scale[0], scale[2]) },
      collider,
    });
    return mesh;
  };

  const addCluster = ({ x, z, radius = 1, count = 4, source = 'cluster', material, height = 1.8, spike = false }) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    for (let i = 0; i < count; i++) {
      const px = (hash(i, x, 11) - 0.5) * radius * 1.2;
      const pz = (hash(z, i, 12) - 0.5) * radius * 1.2;
      const scale = 0.6 + hash(px, pz, 13) * 0.7;
      const geo = spike
        ? new THREE.ConeGeometry(0.28 * scale, height * scale, 6)
        : new THREE.DodecahedronGeometry(0.38 * scale, 0);
      const mesh = setShadow(new THREE.Mesh(geo, varyMaterial(material, x + px, z + pz, 14 + i, { sat: 0.08, light: 0.12 })));
      mesh.position.set(px, spike ? height * scale * 0.5 : 0.28 + scale * 0.18, pz);
      if (spike) mesh.rotation.z = (hash(px, pz, 15) - 0.5) * 0.32;
      group.add(mesh);
    }
    mapRoot.add(group);
    registerWorldObject({
      mesh: group,
      source,
      blocking: false,
      footprint: { type: 'circle', x, z, radius },
    });
    return group;
  };

  const addVent = ({ x, z, h = 2.2, source = 'vent', glow = shared.accent }) => {
    const vent = new THREE.Group();
    vent.position.set(x, 0, z);
    const base = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.74, 0.5, 10), shared.structureDark));
    base.position.y = 0.25;
    const chimney = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, h, 8), shared.structure));
    chimney.position.y = h * 0.5 + 0.38;
    const cap = setShadow(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.48, 8), glow));
    cap.position.y = h + 0.58;
    vent.add(base, chimney, cap);
    mapRoot.add(vent);
    registerWorldObject({
      mesh: vent,
      source,
      blocking: true,
      footprint: { type: 'circle', x, z, radius: 0.72 },
      collider: { type: 'circle', x, z, radius: 0.68 },
    });
    return vent;
  };

  const half = gameplayConfig.arena.size * 0.5;
  const buildableHalf = half - gameplayConfig.arena.padding - 2;
  const groundHeight = 0.16;
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(gameplayConfig.arena.size, groundHeight, gameplayConfig.arena.size),
    shared.ground,
  );
  ground.position.set(0, -(groundHeight * 0.5), 0);
  ground.castShadow = false;
  ground.receiveShadow = true;
  mapRoot.add(ground);
  registerWorldObject({
    mesh: ground,
    source: 'arena-ground',
    blocking: false,
    footprint: { type: 'rect', x: 0, z: 0, width: gameplayConfig.arena.size, depth: gameplayConfig.arena.size, rotation: 0 },
  });

  addWorldSurfaceDecor({ THREE, world, env, shared, varyMaterial, addDecal, addBox, addSphere, addCluster, hash, buildableHalf });
  buildWorldStructures({
    THREE,
    world,
    shared,
    varyMaterial,
    addBox,
    addCylinder,
    addVent,
    addCluster,
    addSphere,
    buildableHalf,
    mapRoot,
    registerWorldObject,
    setShadow,
    hash,
  });

  const audit = collision.finalizeWorldAudit();
  if (audit.missingColliderObjects.length || audit.colliderWarnings.length) {
    console.warn('[WorldAudit] Collider audit detected issues.', { world: world.themeName, ...audit });
  } else {
    console.info('[WorldAudit] Blocking world objects audited successfully.', { world: world.themeName, ...audit });
  }

  return audit;
}

function createWorldMaterials(THREE, env, makeMaterial) {
  const translucent = { transparent: true, opacity: 0.88 };
  return {
    ground: makeMaterial({ color: env.groundBase, roughness: 0.98, metalness: 0.02 }),
    structure: makeMaterial({ color: env.detailA, roughness: 0.88, metalness: 0.12 }),
    structureDark: makeMaterial({ color: darkenColor(THREE, env.detailA, 0.48), roughness: 0.94, metalness: 0.08 }),
    accent: makeMaterial({ color: env.detailB, emissive: env.detailB, emissiveIntensity: 0.32, roughness: 0.34, metalness: 0.18 }),
    trim: makeMaterial({ color: env.accent, roughness: 0.56, metalness: 0.14 }),
    glass: makeMaterial({ color: env.accent, emissive: env.detailB, emissiveIntensity: 0.1, roughness: 0.22, metalness: 0.22, ...translucent }),
    foliage: makeMaterial({ color: lightenColor(THREE, env.detailA, 0.12), roughness: 0.96, metalness: 0.02 }),
    foliageDark: makeMaterial({ color: darkenColor(THREE, env.detailA, 0.16), roughness: 0.98, metalness: 0.02 }),
    soil: makeMaterial({ color: darkenColor(THREE, env.groundBase, 0.12), roughness: 1, metalness: 0 }),
    glowPlane: new THREE.MeshBasicMaterial({ color: env.detailB, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }),
    mistPlane: new THREE.MeshBasicMaterial({ color: env.accent, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  };
}

function lightenColor(THREE, colorHex, delta = 0.12) {
  const color = new THREE.Color(colorHex);
  const hsl = {};
  color.getHSL(hsl);
  color.setHSL(hsl.h, Math.max(0, hsl.s - delta * 0.2), Math.min(1, hsl.l + delta));
  return color.getHex();
}

function darkenColor(THREE, colorHex, delta = 0.16) {
  const color = new THREE.Color(colorHex);
  const hsl = {};
  color.getHSL(hsl);
  color.setHSL(hsl.h, Math.min(1, hsl.s + delta * 0.16), Math.max(0, hsl.l - delta));
  return color.getHex();
}

function addWorldSurfaceDecor({ THREE, world, env, shared, varyMaterial, addDecal, addBox, addSphere, addCluster, hash, buildableHalf }) {
  if (env.style === 'frontier') {
    [
      { x: -12, z: -14, sx: 8, sz: 18, rot: 0.12 },
      { x: 17, z: 8, sx: 12, sz: 8, rot: -0.2 },
      { x: -28, z: 31, sx: 10, sz: 7, rot: 0.08 },
    ].forEach((patch, index) => {
      addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: shared.mistPlane, source: `frontier-walkway-${index + 1}` });
    });
    return;
  }

  if (env.style === 'lava') {
    const lavaPlane = shared.glowPlane.clone();
    lavaPlane.opacity = 0.42;
    [
      { x: -18, z: -12, sx: 8, sz: 26, rot: 0.18 },
      { x: 16, z: 20, sx: 10, sz: 20, rot: -0.32 },
      { x: 30, z: -24, sx: 7, sz: 12, rot: 0.1 },
    ].forEach((patch, index) => addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: lavaPlane, source: `lava-rift-${index + 1}` }));
    for (let i = 0; i < 12; i++) {
      const x = -buildableHalf + 8 + (i * 7.1) % (buildableHalf * 2 - 12);
      const z = -buildableHalf + 6 + ((i * 11.3) % (buildableHalf * 2 - 10));
      addCluster({ x, z, radius: 1.2 + hash(i, x, 41) * 0.8, count: 4, material: shared.accent, height: 2 + hash(z, i, 42), spike: true, source: `lava-spire-${i + 1}` });
    }
    return;
  }

  if (env.style === 'ice') {
    const frostPlane = shared.mistPlane.clone();
    frostPlane.opacity = 0.22;
    [
      { x: -20, z: 12, sx: 16, sz: 12, rot: 0.18 },
      { x: 12, z: -18, sx: 14, sz: 9, rot: -0.24 },
      { x: 25, z: 28, sx: 9, sz: 18, rot: 0.08 },
    ].forEach((patch, index) => addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: frostPlane, source: `ice-sheen-${index + 1}` }));
    for (let i = 0; i < 12; i++) {
      const x = -buildableHalf + 9 + (i * 6.6) % (buildableHalf * 2 - 14);
      const z = buildableHalf - 8 - ((i * 9.8) % (buildableHalf * 2 - 12));
      addCluster({ x, z, radius: 1.1 + hash(i, z, 43) * 0.7, count: 5, material: shared.trim, height: 2.4 + hash(x, i, 44), spike: true, source: `ice-crystal-${i + 1}` });
    }
    return;
  }

  const toxicPlane = shared.glowPlane.clone();
  toxicPlane.opacity = 0.3;
  [
    { x: -21, z: -22, sx: 12, sz: 16, rot: 0.12 },
    { x: 14, z: 12, sx: 16, sz: 10, rot: -0.18 },
    { x: 31, z: -2, sx: 8, sz: 18, rot: 0.06 },
  ].forEach((patch, index) => addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: toxicPlane, source: `toxic-sludge-${index + 1}` }));
  for (let i = 0; i < 10; i++) {
    const x = -buildableHalf + 9 + (i * 8.4) % (buildableHalf * 2 - 12);
    const z = -buildableHalf + 7 + ((i * 13.2) % (buildableHalf * 2 - 12));
    addSphere({ x, z, y: 0.32 + hash(i, z, 45) * 0.12, r: 0.44 + hash(x, i, 46) * 0.24, material: varyMaterial(shared.accent, x, z, 47), source: `toxic-bulb-${i + 1}`, scale: [1.2, 0.55, 1.2] });
    addCluster({ x: x + 0.8, z: z - 0.6, radius: 0.8, count: 3, material: shared.foliage, height: 1.6, spike: true, source: `toxic-growth-${i + 1}` });
  }
}

function buildWorldStructures(context) {
  const { world } = context;
  if (world.environment.style === 'frontier') {
    buildFrontierWorld(context);
    return;
  }
  if (world.environment.style === 'lava') {
    buildLavaWorld(context);
    return;
  }
  if (world.environment.style === 'ice') {
    buildIceWorld(context);
    return;
  }
  buildPoisonWorld(context);
}

function buildFrontierWorld({ THREE, shared, varyMaterial, addBox, addCylinder, buildableHalf, mapRoot, registerWorldObject, setShadow, hash }) {
  [
    { x: -1, y: 1.45, z: -buildableHalf + 1.3, sx: 72, sy: 2.9, sz: 3, rotation: 0.03, source: 'perimeter-wall-north' },
    { x: 39, y: 1.45, z: -8, sx: 3.2, sy: 2.9, sz: 42, rotation: 0.04, source: 'perimeter-wall-east' },
    { x: -46, y: 1.1, z: 23, sx: 3.6, sy: 2.2, sz: 28, rotation: -0.03, source: 'perimeter-wall-west' },
    { x: 6, y: 1.05, z: 48, sx: 34, sy: 2.1, sz: 3.2, rotation: -0.05, source: 'perimeter-wall-south' },
  ].forEach(({ x, y, z, sx, sy, sz, rotation, source }) => {
    addBox({ x, y, z, sx, sy, sz, material: varyMaterial(shared.structureDark, x, z, 45), rotation, source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation } });
  });

  const lampPositions = [[-24, -28], [-7, -23], [13, -19], [29, -10], [-15, 12], [6, 18], [24, 27], [-29, 34]];
  lampPositions.forEach(([x, z], index) => addFrontierLamp({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, h: 3.6 + (index % 3) * 0.25, source: `lamp-${index + 1}` }));

  const buildings = [
    { x: -35, z: -35, sx: 15, sz: 10, h: 8.2, rotation: 0.12, source: 'building-admin-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 7.5, rotation: -0.06, source: 'building-utility-southwest' },
    { x: 37, z: -11, sx: 16, sz: 22, h: 9.4, rotation: Math.PI * 0.5 - 0.06, awning: false, source: 'building-hall-east' },
    { x: 38, z: 18, sx: 11, sz: 14, h: 7.2, rotation: Math.PI * 0.5 + 0.05, source: 'building-kiosk-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 7.8, rotation: 0.08, source: 'building-service-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 4.8, rotation: -0.18, source: 'building-kiosk-north' },
  ];
  buildings.forEach((entry) => addFrontierBuilding({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, ...entry }));

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
  plantedZones.forEach((entry) => addFrontierPlanter({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, hash, ...entry }));

  [
    { x: -3, z: -6, sx: 5.5, sz: 1.2, rotation: -0.22, source: 'barrier-mid-west' },
    { x: 12, z: 2, sx: 4.2, sz: 1.2, rotation: 0.12, source: 'barrier-mid-center' },
    { x: 22, z: -27, sx: 1.2, sz: 5.8, rotation: 0.08, source: 'barrier-mid-east' },
  ].forEach(({ x, z, sx, sz, rotation, source }) => {
    addBox({ x, y: 0.36, z, sx, sy: 0.72, sz, material: varyMaterial(shared.trim, x, z, 49), rotation, source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation } });
  });

  [[-10, 11], [-4, 14], [2, 17], [8, 20], [20, -16], [24, -14], [28, -12]].forEach(([x, z], index) => {
    addCylinder({ x, y: 0.4, z, rt: 0.24, h: 0.8, material: shared.structureDark, source: `bollard-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.28 } });
  });
}

function addFrontierLamp({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, h = 3.8, source = 'lamp' }) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  const base = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.22, 10), shared.structureDark));
  base.position.y = 0.11;
  const pole = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, h, 10), shared.structure));
  pole.position.y = h * 0.5 + 0.18;
  const head = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), shared.trim));
  head.position.y = h + 0.16;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.48), shared.accent);
  glow.position.y = h + 0.02;
  lamp.add(base, pole, head, glow);
  mapRoot.add(lamp);
  registerWorldObject({ mesh: lamp, source, blocking: true, footprint: { type: 'circle', x, z, radius: 0.38 }, collider: { type: 'circle', x, z, radius: 0.4 } });
}

function addFrontierBuilding({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, sx, sz, h, rotation = 0, blocking = true, pad = 1.8, awning = true, source = 'building' }) {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  building.rotation.y = rotation;
  const padMesh = new THREE.Mesh(new THREE.BoxGeometry(sx + pad, 0.24, sz + pad), varyMaterial(shared.structure, x, z, 20));
  padMesh.position.y = 0.12;
  padMesh.receiveShadow = true;
  const shell = setShadow(new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), varyMaterial(shared.structure, x, z, 21)));
  shell.position.y = h * 0.5 + 0.12;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.5, 0.32, sz + 0.5), varyMaterial(shared.structureDark, x, z, 22));
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
  registerWorldObject({ mesh: building, source, blocking, footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation }, collider: blocking ? { type: 'rect', x, z, width: sx, depth: sz, rotation } : null });
}

function addFrontierPlanter({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, hash, x, z, sx, sz, withTrees = false, treeCount = 0, blocking = true, rotation = 0, style = 'planter', source = 'planter' }) {
  const planter = new THREE.Group();
  planter.position.set(x, 0, z);
  planter.rotation.y = rotation;
  const borderMaterial = style === 'berm' ? shared.soil : shared.structureDark;
  const innerMaterial = shared.soil;
  const greensMaterial = withTrees ? shared.foliageDark : shared.foliage;
  const borderHeight = style === 'berm' ? 0.34 : 0.56;
  const innerInset = style === 'berm' ? 0.24 : 0.58;
  const greensInset = style === 'berm' ? 0.5 : 0.9;
  const border = new THREE.Mesh(new THREE.BoxGeometry(sx, borderHeight, sz), varyMaterial(borderMaterial, x, z, 4));
  border.position.y = borderHeight * 0.5;
  border.castShadow = true;
  border.receiveShadow = true;
  const inner = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.8, sx - innerInset), 0.24, Math.max(0.8, sz - innerInset)), varyMaterial(innerMaterial, x + 1.5, z - 1.5, 5));
  inner.position.y = style === 'berm' ? 0.18 : 0.24;
  inner.receiveShadow = true;
  const greens = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.7, sx - greensInset), 0.16, Math.max(0.7, sz - greensInset)), varyMaterial(greensMaterial, x - 1.2, z + 1.2, 6));
  greens.position.y = style === 'berm' ? 0.29 : 0.47;
  greens.receiveShadow = true;
  planter.add(border, inner, greens);
  const treeMat = shared.structureDark;
  if (withTrees && treeCount > 0) {
    for (let i = 0; i < treeCount; i++) {
      const px = (hash(i, x, 7) - 0.5) * sx * 0.48;
      const pz = (hash(z, i, 8) - 0.5) * sz * 0.48;
      const trunkHeight = 1.25 + hash(px, pz, 9) * 0.65;
      const crownRadius = 0.76 + hash(pz, px, 10) * 0.42;
      const trunk = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, trunkHeight, 8), treeMat));
      trunk.position.set(px, 0.86 + trunkHeight * 0.5, pz);
      const crown = setShadow(new THREE.Mesh(new THREE.SphereGeometry(crownRadius, 9, 8), i % 2 === 0 ? shared.foliage : shared.foliageDark));
      crown.scale.y = 0.86 + hash(px, pz, 11) * 0.4;
      crown.position.set(px, trunk.position.y + trunkHeight * 0.46, pz);
      planter.add(trunk, crown);
    }
  }
  mapRoot.add(planter);
  registerWorldObject({ mesh: planter, source, blocking, footprint: { type: 'rect', x, z, width: sx, depth: sz, rotation }, collider: blocking ? { type: 'rect', x, z, width: sx, depth: sz, rotation } : null });
}

function buildLavaWorld({ THREE, shared, varyMaterial, addBox, addCylinder, addVent, buildableHalf }) {
  [
    { x: -2, y: 1.65, z: -buildableHalf + 1.4, sx: 74, sy: 3.3, sz: 3.4, rotation: 0.05, source: 'lava-bastion-north' },
    { x: 39, y: 1.6, z: -8, sx: 3.6, sy: 3.2, sz: 44, rotation: 0.04, source: 'lava-bastion-east' },
    { x: -46, y: 1.32, z: 24, sx: 4, sy: 2.6, sz: 30, rotation: -0.03, source: 'lava-bastion-west' },
    { x: 5, y: 1.2, z: 48, sx: 36, sy: 2.4, sz: 3.5, rotation: -0.05, source: 'lava-bastion-south' },
  ].forEach((entry) => addBox({ ...entry, material: varyMaterial(shared.structureDark, entry.x, entry.z, 61, { sat: 0.12, light: 0.06 }), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [
    { x: -35, z: -34, sx: 14, sz: 10, h: 6.8, source: 'lava-forge-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 6.2, source: 'lava-crucible-southwest' },
    { x: 37, z: -11, sx: 15, sz: 20, h: 8.2, source: 'lava-citadel-east' },
    { x: 38, z: 18, sx: 11, sz: 14, h: 6.5, source: 'lava-foundry-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 6.4, source: 'lava-ridge-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 5.2, source: 'lava-smelter-north' },
  ].forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 62, { sat: 0.14, light: 0.06 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addBox({ x, y: h + 0.5, z, sx: sx * 0.82, sy: 0.7, sz: sz * 0.82, material: varyMaterial(shared.accent, x, z, 63, { sat: 0.1, light: 0.14 }), source: `${source}-crown`, blocking: false });
  });

  [[-24, -28], [-7, -23], [13, -19], [29, -10], [-15, 12], [6, 18], [24, 27], [-29, 34]].forEach(([x, z], index) => {
    addVent({ x, z, h: 2.2 + (index % 3) * 0.35, source: `lava-vent-${index + 1}` });
  });

  [
    { x: -3, z: -6, sx: 6.1, sz: 1.5, rotation: -0.22, source: 'lava-rib-west' },
    { x: 12, z: 2, sx: 4.8, sz: 1.5, rotation: 0.12, source: 'lava-rib-center' },
    { x: 22, z: -27, sx: 1.5, sz: 6.2, rotation: 0.08, source: 'lava-rib-east' },
  ].forEach((entry) => addBox({ ...entry, y: 0.58, sy: 1.16, material: varyMaterial(shared.accent, entry.x, entry.z, 64), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [[-10, 11], [-4, 14], [2, 17], [8, 20], [20, -16], [24, -14], [28, -12]].forEach(([x, z], index) => {
    addCylinder({ x, y: 0.52, z, rt: 0.28, h: 1.04, material: shared.accent, source: `lava-obelisk-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });
}

function buildIceWorld({ THREE, shared, varyMaterial, addBox, addCylinder, addVent, addCluster, buildableHalf }) {
  [
    { x: -1, y: 1.4, z: -buildableHalf + 1.4, sx: 72, sy: 2.8, sz: 3.2, rotation: 0.02, source: 'ice-rim-north' },
    { x: 39, y: 1.4, z: -8, sx: 3.2, sy: 2.8, sz: 42, rotation: 0.04, source: 'ice-rim-east' },
    { x: -46, y: 1.15, z: 23, sx: 3.8, sy: 2.3, sz: 28, rotation: -0.02, source: 'ice-rim-west' },
    { x: 6, y: 1.08, z: 48, sx: 34, sy: 2.1, sz: 3.2, rotation: -0.03, source: 'ice-rim-south' },
  ].forEach((entry) => addBox({ ...entry, material: varyMaterial(shared.trim, entry.x, entry.z, 71, { sat: 0.04, light: 0.12 }), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [
    { x: -35, z: -35, sx: 14, sz: 10, h: 6.2, source: 'ice-vault-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 5.8, source: 'ice-bay-southwest' },
    { x: 37, z: -11, sx: 16, sz: 20, h: 7.1, source: 'ice-sanctum-east' },
    { x: 38, z: 18, sx: 10, sz: 14, h: 6.2, source: 'ice-facility-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 6.6, source: 'ice-terrace-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 4.9, source: 'ice-node-north' },
  ].forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 72, { sat: 0.04, light: 0.14 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addCluster({ x, z, radius: Math.max(sx, sz) * 0.18, count: 6, material: shared.trim, height: 2.2, spike: true, source: `${source}-crystals` });
  });

  [[-24, -28], [-7, -23], [13, -19], [29, -10], [-15, 12], [6, 18], [24, 27], [-29, 34]].forEach(([x, z], index) => {
    addVent({ x, z, h: 2.6 + (index % 2) * 0.28, source: `ice-beacon-${index + 1}`, glow: shared.trim });
  });

  [
    { x: -26, z: 21, sx: 11, sz: 14, rotation: 0.15, source: 'ice-field-west' },
    { x: -9, z: 38, sx: 15, sz: 8, rotation: -0.08, source: 'ice-field-north' },
    { x: 28, z: 29, sx: 10, sz: 7, rotation: -0.12, source: 'ice-shelf-east-1' },
    { x: 17, z: 14, sx: 8, sz: 5, rotation: -0.16, source: 'ice-shelf-east-2' },
  ].forEach((entry) => addBox({ ...entry, y: 0.22, sy: 0.44, material: varyMaterial(shared.glass, entry.x, entry.z, 73, { sat: 0.02, light: 0.08 }), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [[-10, 11], [-4, 14], [2, 17], [8, 20], [20, -16], [24, -14], [28, -12]].forEach(([x, z], index) => {
    addCylinder({ x, y: 0.5, z, rt: 0.26, h: 0.94, material: shared.trim, source: `ice-pylon-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });
}

function buildPoisonWorld({ THREE, shared, varyMaterial, addBox, addCylinder, addVent, addSphere, buildableHalf }) {
  [
    { x: -1, y: 1.34, z: -buildableHalf + 1.3, sx: 72, sy: 2.7, sz: 3.3, rotation: 0.03, source: 'poison-reef-north' },
    { x: 39, y: 1.34, z: -8, sx: 3.4, sy: 2.7, sz: 42, rotation: 0.04, source: 'poison-reef-east' },
    { x: -46, y: 1.12, z: 23, sx: 3.8, sy: 2.2, sz: 28, rotation: -0.03, source: 'poison-reef-west' },
    { x: 6, y: 1.05, z: 48, sx: 34, sy: 2.1, sz: 3.4, rotation: -0.05, source: 'poison-reef-south' },
  ].forEach((entry) => addBox({ ...entry, material: varyMaterial(shared.structureDark, entry.x, entry.z, 81, { sat: 0.1, light: 0.02 }), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [
    { x: -35, z: -35, sx: 15, sz: 10, h: 5.6, source: 'poison-bioreactor-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 5.1, source: 'poison-lab-southwest' },
    { x: 37, z: -11, sx: 16, sz: 22, h: 7.2, source: 'poison-refinery-east' },
    { x: 38, z: 18, sx: 11, sz: 14, h: 6.4, source: 'poison-hive-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 5.8, source: 'poison-growth-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 4.6, source: 'poison-node-north' },
  ].forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 82, { sat: 0.12, light: 0.04 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addSphere({ x, z, y: h + 0.7, r: 0.7, material: varyMaterial(shared.accent, x, z, 83), source: `${source}-bladder`, scale: [1.4, 0.85, 1.4] });
  });

  [[-24, -28], [-7, -23], [13, -19], [29, -10], [-15, 12], [6, 18], [24, 27], [-29, 34]].forEach(([x, z], index) => {
    addVent({ x, z, h: 2.1 + (index % 3) * 0.22, source: `poison-stack-${index + 1}`, glow: shared.accent });
  });

  [
    { x: -26, z: 21, sx: 11, sz: 14, rotation: 0.15, source: 'poison-pool-west' },
    { x: -9, z: 38, sx: 15, sz: 8, rotation: -0.08, source: 'poison-pool-north' },
    { x: 28, z: 29, sx: 10, sz: 7, rotation: -0.12, source: 'poison-pool-east-1' },
    { x: 17, z: 14, sx: 8, sz: 5, rotation: -0.16, source: 'poison-pool-east-2' },
  ].forEach((entry) => addBox({ ...entry, y: 0.16, sy: 0.32, material: varyMaterial(shared.accent, entry.x, entry.z, 84), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [
    { x: -3, z: -6, sx: 5.6, sz: 1.3, rotation: -0.22, source: 'poison-pipe-west' },
    { x: 12, z: 2, sx: 4.4, sz: 1.4, rotation: 0.12, source: 'poison-pipe-center' },
    { x: 22, z: -27, sx: 1.4, sz: 5.9, rotation: 0.08, source: 'poison-pipe-east' },
  ].forEach((entry) => addBox({ ...entry, y: 0.42, sy: 0.84, material: varyMaterial(shared.structureDark, entry.x, entry.z, 85), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));

  [[-10, 11], [-4, 14], [2, 17], [8, 20], [20, -16], [24, -14], [28, -12]].forEach(([x, z], index) => {
    addCylinder({ x, y: 0.45, z, rt: 0.26, h: 0.9, material: shared.foliageDark, source: `poison-spore-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });
}
