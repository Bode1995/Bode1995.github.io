import { getWorldDefinition } from '../config/worlds.js';
import { getWorldLayout } from '../config/worldLayouts.js';

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
  const layout = getWorldLayout(env.style);
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

  addWorldSurfaceDecor({ THREE, world, env, layout, shared, varyMaterial, addDecal, addBox, addSphere, addCluster, hash, buildableHalf });
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
    layout,
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

function resolveLayoutZ(value, buildableHalf) {
  if (value === 'northEdge') return -buildableHalf + 1.4;
  if (value === 'northInset') return -buildableHalf + 9.5;
  return value;
}

function addWorldSurfaceDecor({ THREE, env, layout, shared, varyMaterial, addDecal, addSphere, addCluster, hash, buildableHalf }) {
  if (env.style === 'frontier') {
    layout.surface.decals.forEach((patch, index) => {
      addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: shared.mistPlane, source: `frontier-walkway-${index + 1}` });
    });
    return;
  }

  if (env.style === 'lava') {
    const lavaPlane = shared.glowPlane.clone();
    lavaPlane.opacity = 0.42;
    layout.surface.decals.forEach((patch, index) => {
      addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: lavaPlane, source: `lava-rift-${index + 1}` });
    });
    for (let i = 0; i < (layout.surface.spireCount || 0); i++) {
      const x = -buildableHalf + 8 + (i * 7.1) % (buildableHalf * 2 - 12);
      const z = -buildableHalf + 6 + ((i * 11.3) % (buildableHalf * 2 - 10));
      addCluster({ x, z, radius: 1.2 + hash(i, x, 41) * 0.8, count: 4, material: shared.accent, height: 2 + hash(z, i, 42), spike: true, source: `lava-spire-${i + 1}` });
    }
    return;
  }

  if (env.style === 'ice') {
    const frostPlane = shared.mistPlane.clone();
    frostPlane.opacity = 0.18;
    layout.surface.decals.forEach((patch, index) => {
      addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: frostPlane, source: `ice-sheen-${index + 1}` });
    });
    for (let i = 0; i < (layout.surface.crystalCount || 0); i++) {
      const x = -buildableHalf + 9 + (i * 6.6) % (buildableHalf * 2 - 14);
      const z = buildableHalf - 8 - ((i * 9.8) % (buildableHalf * 2 - 12));
      addCluster({ x, z, radius: 1.1 + hash(i, z, 43) * 0.7, count: 5, material: shared.trim, height: 2.4 + hash(x, i, 44), spike: true, source: `ice-crystal-${i + 1}` });
    }
    return;
  }

  const toxicPlane = shared.glowPlane.clone();
  toxicPlane.opacity = 0.3;
  layout.surface.decals.forEach((patch, index) => {
    addDecal({ x: patch.x, z: patch.z, sx: patch.sx, sz: patch.sz, rotation: patch.rot, material: toxicPlane, source: `toxic-sludge-${index + 1}` });
  });
  for (let i = 0; i < (layout.surface.bulbCount || 0); i++) {
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

function buildFrontierWorld({ THREE, layout, shared, varyMaterial, addBox, addCylinder, buildableHalf, mapRoot, registerWorldObject, setShadow, hash }) {
  layout.walls.forEach(({ x, y, z, sx, sy, sz, rotation, source }) => {
    const resolvedZ = resolveLayoutZ(z, buildableHalf);
    addBox({ x, y, z: resolvedZ, sx, sy, sz, material: varyMaterial(shared.structureDark, x, resolvedZ, 45), rotation, source, blocking: true, collider: { type: 'rect', x, z: resolvedZ, width: sx, depth: sz, rotation } });
  });

  layout.lamps.forEach(([x, z], index) => addFrontierLamp({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, h: 3.6 + (index % 3) * 0.25, source: `lamp-${index + 1}` }));
  layout.buildings.forEach((entry) => addFrontierBuilding({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, ...entry }));
  layout.planters.forEach((entry) => addFrontierPlanter({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, hash, ...entry }));

  layout.barriers.forEach(({ x, z, sx, sz, rotation, source }) => {
    addBox({ x, y: 0.36, z, sx, sy: 0.72, sz, material: varyMaterial(shared.trim, x, z, 49), rotation, source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation } });
  });

  layout.bollards.forEach(([x, z], index) => {
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

function buildLavaWorld({ layout, shared, varyMaterial, addBox, addCylinder, addVent, buildableHalf }) {
  layout.walls.forEach((entry) => {
    const z = resolveLayoutZ(entry.z, buildableHalf);
    addBox({ ...entry, z, material: varyMaterial(shared.structureDark, entry.x, z, 61, { sat: 0.12, light: 0.06 }), blocking: true, collider: { type: 'rect', x: entry.x, z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } });
  });

  layout.strongholds.forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 62, { sat: 0.14, light: 0.06 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addBox({ x, y: h + 0.5, z, sx: sx * 0.82, sy: 0.7, sz: sz * 0.82, material: varyMaterial(shared.accent, x, z, 63, { sat: 0.1, light: 0.14 }), source: `${source}-crown`, blocking: false });
  });

  layout.vents.forEach(([x, z], index) => {
    addVent({ x, z, h: 2.2 + (index % 3) * 0.35, source: `lava-vent-${index + 1}` });
  });

  layout.ribs.forEach((entry) => addBox({ ...entry, y: 0.58, sy: 1.16, material: varyMaterial(shared.accent, entry.x, entry.z, 64), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));
  layout.obelisks.forEach(([x, z], index) => {
    addCylinder({ x, y: 0.52, z, rt: 0.28, h: 1.04, material: shared.accent, source: `lava-obelisk-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });
}

function addSnowMound({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, x, z, rx = 2.2, rz = 1.5, h = 0.7, rotation = 0, source = 'snow-mound' }) {
  const mound = new THREE.Group();
  mound.position.set(x, 0, z);
  mound.rotation.y = rotation;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(rx, rz) * 0.72, Math.max(rx, rz), h * 0.42, 10), varyMaterial(shared.soil, x, z, 120, { light: 0.04 }));
  base.position.y = h * 0.18;
  base.scale.set(rx / Math.max(rx, rz), 1, rz / Math.max(rx, rz));
  base.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), varyMaterial(shared.trim, x, z, 121, { sat: 0.02, light: 0.05 }));
  top.scale.set(rx, h, rz);
  top.position.y = h * 0.56;
  top.castShadow = true;
  top.receiveShadow = true;
  mound.add(base, top);
  mapRoot.add(mound);
  registerWorldObject({ mesh: mound, source, blocking: false, footprint: { type: 'rect', x, z, width: rx * 2, depth: rz * 2, rotation } });
}

function addIgloo({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, r = 2, entranceRotation = 0, source = 'igloo' }) {
  const igloo = new THREE.Group();
  igloo.position.set(x, 0, z);
  igloo.rotation.y = entranceRotation;
  const dome = setShadow(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), varyMaterial(shared.structure, x, z, 122, { sat: 0.02, light: 0.08 })));
  dome.position.y = r * 0.78;
  dome.scale.y = 0.9;
  const cutout = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, r * 1.2, r * 0.9), shared.ground);
  cutout.position.set(0, r * 0.58, r * 0.88);
  cutout.visible = false;
  const tunnel = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.55, r * 1.2, 10, 1, false, 0, Math.PI), varyMaterial(shared.structureDark, x + 1, z, 123, { light: 0.04 })));
  tunnel.rotation.z = Math.PI * 0.5;
  tunnel.position.set(0, r * 0.34, r * 0.98);
  const cap = setShadow(new THREE.Mesh(new THREE.BoxGeometry(r * 1.32, 0.16, r * 0.7), varyMaterial(shared.trim, x, z, 124, { light: 0.1 })));
  cap.position.set(0, r * 1.34, -r * 0.08);
  igloo.add(dome, tunnel, cap, cutout);
  mapRoot.add(igloo);
  registerWorldObject({ mesh: igloo, source, blocking: true, footprint: { type: 'circle', x, z, radius: r * 0.92 }, collider: { type: 'circle', x, z, radius: r * 0.9 } });
}

function addFrostRidge({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, length = 10, depth = 3, height = 2.2, rotation = 0, source = 'frost-ridge' }) {
  const ridge = new THREE.Group();
  ridge.position.set(x, 0, z);
  ridge.rotation.y = rotation;
  const body = setShadow(new THREE.Mesh(new THREE.BoxGeometry(length, height, depth), varyMaterial(shared.structureDark, x, z, 125, { sat: 0.02, light: 0.05 })));
  body.position.y = height * 0.5;
  const crest = setShadow(new THREE.Mesh(new THREE.ConeGeometry(depth * 0.42, height * 0.9, 5), varyMaterial(shared.trim, x, z, 126, { light: 0.12 })));
  crest.position.set(0, height + 0.18, 0);
  crest.rotation.z = Math.PI * 0.5;
  crest.scale.set(1.2, length / Math.max(depth, 0.1), 1);
  ridge.add(body, crest);
  mapRoot.add(ridge);
  registerWorldObject({ mesh: ridge, source, blocking: true, footprint: { type: 'rect', x, z, width: length, depth, rotation }, collider: { type: 'rect', x, z, width: length, depth, rotation } });
}

function addIcyBoulder({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x, z, radius = 1, source = 'ice-boulder' }) {
  const boulder = setShadow(new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), varyMaterial(shared.trim, x, z, 127, { sat: 0.03, light: 0.1 })));
  boulder.position.set(x, radius * 0.7, z);
  boulder.scale.set(1.12, 0.9, 0.96);
  mapRoot.add(boulder);
  registerWorldObject({ mesh: boulder, source, blocking: true, footprint: { type: 'circle', x, z, radius: radius * 0.92 }, collider: { type: 'circle', x, z, radius: radius * 0.9 } });
}

function buildIceWorld({ THREE, layout, shared, varyMaterial, addBox, addCylinder, addVent, addCluster, buildableHalf, mapRoot, registerWorldObject, setShadow }) {
  layout.walls.forEach((entry) => {
    const z = resolveLayoutZ(entry.z, buildableHalf);
    addBox({ ...entry, z, material: varyMaterial(shared.trim, entry.x, z, 71, { sat: 0.04, light: 0.08 }), blocking: true, collider: { type: 'rect', x: entry.x, z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } });
  });

  layout.halls.forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 72, { sat: 0.03, light: 0.06 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addCluster({ x, z, radius: Math.max(sx, sz) * 0.18, count: 6, material: shared.trim, height: 2.2, spike: true, source: `${source}-crystals` });
  });

  layout.beacons.forEach(([x, z], index) => {
    addVent({ x, z, h: 2.6 + (index % 2) * 0.28, source: `ice-beacon-${index + 1}`, glow: shared.trim });
  });

  layout.shelves.forEach((entry) => addBox({ ...entry, y: 0.22, sy: 0.44, material: varyMaterial(shared.glass, entry.x, entry.z, 73, { sat: 0.02, light: 0.02 }), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));
  layout.pylons.forEach(([x, z], index) => {
    addCylinder({ x, y: 0.5, z, rt: 0.26, h: 0.94, material: shared.trim, source: `ice-pylon-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });

  layout.snowMounds.forEach((entry) => addSnowMound({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, ...entry }));
  layout.igloos.forEach((entry) => addIgloo({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, ...entry }));
  layout.ridges.forEach((entry) => addFrostRidge({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, ...entry }));
  layout.icyBoulders.forEach((entry) => addIcyBoulder({ THREE, shared, varyMaterial, mapRoot, registerWorldObject, setShadow, x: entry.x, z: entry.z, radius: entry.radius, source: entry.source }));
}

function buildPoisonWorld({ layout, shared, varyMaterial, addBox, addCylinder, addVent, addSphere, buildableHalf }) {
  layout.walls.forEach((entry) => {
    const z = resolveLayoutZ(entry.z, buildableHalf);
    addBox({ ...entry, z, material: varyMaterial(shared.structureDark, entry.x, z, 81, { sat: 0.1, light: 0.02 }), blocking: true, collider: { type: 'rect', x: entry.x, z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } });
  });

  layout.hulks.forEach(({ x, z, sx, sz, h, source }) => {
    addBox({ x, y: h * 0.5, z, sx, sy: h, sz, material: varyMaterial(shared.structure, x, z, 82, { sat: 0.12, light: 0.04 }), source, blocking: true, collider: { type: 'rect', x, z, width: sx, depth: sz, rotation: 0 } });
    addSphere({ x, z, y: h + 0.7, r: 0.7, material: varyMaterial(shared.accent, x, z, 83), source: `${source}-bladder`, scale: [1.4, 0.85, 1.4] });
  });

  layout.stacks.forEach(([x, z], index) => {
    addVent({ x, z, h: 2.1 + (index % 3) * 0.22, source: `poison-stack-${index + 1}`, glow: shared.accent });
  });

  layout.pools.forEach((entry) => addBox({ ...entry, y: 0.16, sy: 0.32, material: varyMaterial(shared.accent, entry.x, entry.z, 84), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));
  layout.pipes.forEach((entry) => addBox({ ...entry, y: 0.42, sy: 0.84, material: varyMaterial(shared.structureDark, entry.x, entry.z, 85), blocking: true, collider: { type: 'rect', x: entry.x, z: entry.z, width: entry.sx, depth: entry.sz, rotation: entry.rotation } }));
  layout.spores.forEach(([x, z], index) => {
    addCylinder({ x, y: 0.45, z, rt: 0.26, h: 0.9, material: shared.foliageDark, source: `poison-spore-${index + 1}`, blocking: true, collider: { type: 'circle', x, z, radius: 0.3 } });
  });
}
