const FRONTIER_LAYOUT = {
  surface: {
    decals: [
      { x: -12, z: -14, sx: 8, sz: 18, rot: 0.12 },
      { x: 17, z: 8, sx: 12, sz: 8, rot: -0.2 },
      { x: -28, z: 31, sx: 10, sz: 7, rot: 0.08 },
    ],
  },
  walls: [
    { x: -1, y: 1.45, z: 'northEdge', sx: 72, sy: 2.9, sz: 3, rotation: 0.03, source: 'perimeter-wall-north' },
    { x: 39, y: 1.45, z: -8, sx: 3.2, sy: 2.9, sz: 42, rotation: 0.04, source: 'perimeter-wall-east' },
    { x: -46, y: 1.1, z: 23, sx: 3.6, sy: 2.2, sz: 28, rotation: -0.03, source: 'perimeter-wall-west' },
    { x: 6, y: 1.05, z: 48, sx: 34, sy: 2.1, sz: 3.2, rotation: -0.05, source: 'perimeter-wall-south' },
  ],
  lamps: [[-24, -28], [-7, -23], [13, -19], [29, -10], [-15, 12], [6, 18], [24, 27], [-29, 34]],
  buildings: [
    { x: -35, z: -35, sx: 15, sz: 10, h: 8.2, rotation: 0.12, source: 'building-admin-west' },
    { x: -16, z: -37, sx: 11, sz: 9, h: 7.5, rotation: -0.06, source: 'building-utility-southwest' },
    { x: 37, z: -11, sx: 16, sz: 22, h: 9.4, rotation: Math.PI * 0.5 - 0.06, awning: false, source: 'building-hall-east' },
    { x: 38, z: 18, sx: 11, sz: 14, h: 7.2, rotation: Math.PI * 0.5 + 0.05, source: 'building-kiosk-east' },
    { x: -29, z: 33, sx: 18, sz: 11, h: 7.8, rotation: 0.08, source: 'building-service-northwest' },
    { x: 11, z: 35, sx: 10, sz: 8, h: 4.8, rotation: -0.18, source: 'building-kiosk-north' },
  ],
  planters: [
    { x: -26, z: 21, sx: 11, sz: 14, withTrees: true, treeCount: 3, rotation: 0.15, source: 'planter-grove-west' },
    { x: -9, z: 38, sx: 15, sz: 8, withTrees: true, treeCount: 3, rotation: -0.08, source: 'planter-grove-north' },
    { x: 28, z: 29, sx: 10, sz: 7, withTrees: false, rotation: -0.12, source: 'planter-east-1' },
    { x: 17, z: 14, sx: 8, sz: 5, withTrees: false, rotation: -0.16, source: 'planter-east-2' },
    { x: -22, z: -10, sx: 8, sz: 5, withTrees: false, rotation: 0.08, source: 'planter-centerwest' },
    { x: 42, z: -33, sx: 8, sz: 18, withTrees: false, rotation: 0.04, style: 'berm', source: 'berm-southeast' },
    { x: -43, z: 43, sx: 12, sz: 10, withTrees: true, treeCount: 2, rotation: -0.05, style: 'berm', source: 'berm-northwest' },
    { x: 35, z: 42, sx: 16, sz: 8, withTrees: false, rotation: -0.03, style: 'berm', source: 'berm-northeast' },
  ],
  barriers: [
    { x: -3, z: -6, sx: 5.5, sz: 1.2, rotation: -0.22, source: 'barrier-mid-west' },
    { x: 12, z: 2, sx: 4.2, sz: 1.2, rotation: 0.12, source: 'barrier-mid-center' },
    { x: 22, z: -27, sx: 1.2, sz: 5.8, rotation: 0.08, source: 'barrier-mid-east' },
  ],
  bollards: [[-10, 11], [-4, 14], [2, 17], [8, 20], [20, -16], [24, -14], [28, -12]],
};

const LAVA_LAYOUT = {
  surface: {
    decals: [
      { x: -31, z: -2, sx: 7, sz: 30, rot: 0.12 },
      { x: 22, z: -30, sx: 18, sz: 7, rot: -0.24 },
      { x: 12, z: 22, sx: 26, sz: 9, rot: 0.16 },
      { x: -6, z: 30, sx: 12, sz: 8, rot: -0.08 },
    ],
    spireCount: 14,
  },
  walls: [
    { x: -10, y: 1.68, z: 'northEdge', sx: 56, sy: 3.4, sz: 3.2, rotation: -0.04, source: 'lava-rampart-northwest' },
    { x: 28, y: 1.48, z: 'northInset', sx: 18, sy: 2.8, sz: 3.2, rotation: 0.12, source: 'lava-rampart-northeast' },
    { x: 41, y: 1.7, z: -18, sx: 3.8, sy: 3.4, sz: 24, rotation: 0.08, source: 'lava-rampart-east-upper' },
    { x: 45, y: 1.3, z: 24, sx: 3.2, sy: 2.6, sz: 22, rotation: -0.04, source: 'lava-rampart-east-lower' },
    { x: -44, y: 1.28, z: -18, sx: 3.6, sy: 2.5, sz: 26, rotation: -0.08, source: 'lava-rampart-west-upper' },
    { x: -37, y: 1.14, z: 34, sx: 18, sy: 2.2, sz: 3, rotation: 0.06, source: 'lava-rampart-southwest' },
    { x: 14, y: 1.1, z: 46, sx: 30, sy: 2.2, sz: 3.2, rotation: -0.08, source: 'lava-rampart-south' },
  ],
  strongholds: [
    { x: -29, z: -32, sx: 18, sz: 12, h: 7.4, source: 'lava-keep-west' },
    { x: 24, z: -35, sx: 24, sz: 10, h: 7, source: 'lava-forge-south' },
    { x: 33, z: 24, sx: 12, sz: 20, h: 8.6, source: 'lava-citadel-east' },
    { x: -20, z: 32, sx: 22, sz: 11, h: 6.2, source: 'lava-terrace-northwest' },
    { x: 2, z: 18, sx: 10, sz: 9, h: 5.4, source: 'lava-foundry-center' },
  ],
  vents: [[-20, -11], [-10, 7], [10, -5], [23, 8], [34, -11], [-31, 18], [-7, 29], [21, 30], [38, 16]],
  ribs: [
    { x: -8, z: -1, sx: 11, sz: 1.6, rotation: 0.18, source: 'lava-rib-centerwest' },
    { x: 9, z: 10, sx: 1.5, sz: 11.4, rotation: -0.1, source: 'lava-rib-centerspine' },
    { x: 23, z: -16, sx: 8.8, sz: 1.5, rotation: -0.34, source: 'lava-rib-east' },
    { x: -19, z: 22, sx: 1.5, sz: 9.4, rotation: 0.22, source: 'lava-rib-northwest' },
  ],
  obelisks: [[-24, -18], [-15, -2], [-3, 11], [12, 22], [26, 18], [31, -1], [5, -25], [-28, 26]],
};

const ICE_LAYOUT = {
  surface: {
    decals: [
      { x: -27, z: -26, sx: 14, sz: 10, rot: 0.14 },
      { x: 28, z: -14, sx: 11, sz: 18, rot: -0.18 },
      { x: -5, z: 12, sx: 18, sz: 14, rot: 0.08 },
      { x: 24, z: 28, sx: 13, sz: 10, rot: -0.14 },
    ],
    crystalCount: 10,
  },
  walls: [
    { x: -14, y: 1.46, z: 'northEdge', sx: 26, sy: 2.9, sz: 3.2, rotation: -0.06, source: 'ice-cliff-northwest' },
    { x: 18, y: 1.52, z: 'northInset', sx: 34, sy: 3.1, sz: 3.2, rotation: 0.1, source: 'ice-cliff-northeast' },
    { x: 43, y: 1.38, z: -12, sx: 3.2, sy: 2.8, sz: 22, rotation: 0.06, source: 'ice-cliff-east-upper' },
    { x: 37, y: 1.12, z: 33, sx: 18, sy: 2.2, sz: 3, rotation: -0.08, source: 'ice-cliff-southeast' },
    { x: -41, y: 1.22, z: 18, sx: 3.4, sy: 2.4, sz: 28, rotation: -0.04, source: 'ice-cliff-west' },
    { x: -8, y: 1.08, z: 46, sx: 26, sy: 2.1, sz: 3.1, rotation: 0.04, source: 'ice-cliff-southwest' },
  ],
  halls: [
    { x: -30, z: -32, sx: 13, sz: 9, h: 5.9, source: 'ice-store-west' },
    { x: 22, z: -34, sx: 14, sz: 11, h: 6.3, source: 'ice-station-south' },
    { x: 33, z: 16, sx: 10, sz: 18, h: 7.1, source: 'ice-bastion-east' },
    { x: -16, z: 30, sx: 18, sz: 10, h: 5.8, source: 'ice-platform-northwest' },
  ],
  beacons: [[-18, -10], [-4, -4], [14, -14], [28, -4], [-26, 12], [-6, 24], [16, 26], [31, 30]],
  shelves: [
    { x: -11, z: 2, sx: 12, sz: 3.4, rotation: 0.08, source: 'ice-shelf-west-run' },
    { x: 10, z: 6, sx: 3.2, sz: 12, rotation: -0.18, source: 'ice-shelf-center-spine' },
    { x: 2, z: 24, sx: 10, sz: 3.2, rotation: 0.12, source: 'ice-shelf-north-link' },
    { x: 21, z: -22, sx: 9, sz: 3.4, rotation: -0.28, source: 'ice-shelf-southeast' },
    { x: -24, z: 20, sx: 3.1, sz: 10, rotation: 0.22, source: 'ice-shelf-west-pocket' },
  ],
  pylons: [[-23, -20], [-10, 15], [0, 16], [12, 17], [25, 20], [27, -16]],
  snowMounds: [
    { x: -4, z: -24, rx: 2.6, rz: 1.8, h: 0.8, rotation: 0.3, source: 'snowdrift-south-mid' },
    { x: -22, z: 4, rx: 2.2, rz: 1.4, h: 0.72, rotation: -0.2, source: 'snowdrift-west-pocket' },
    { x: 18, z: 4, rx: 2.4, rz: 1.6, h: 0.74, rotation: 0.12, source: 'snowdrift-east-mid' },
    { x: 9, z: 31, rx: 2.1, rz: 1.5, h: 0.68, rotation: -0.18, source: 'snowdrift-north-path' },
  ],
  igloos: [
    { x: -28, z: 18, r: 1.9, entranceRotation: Math.PI * 0.2, source: 'igloo-west' },
    { x: 7, z: -10, r: 2.1, entranceRotation: -Math.PI * 0.5, source: 'igloo-center' },
  ],
  ridges: [
    { x: -9, z: -10, length: 11, depth: 3.1, height: 2.2, rotation: 0.2, source: 'frost-ridge-southwest' },
    { x: 21, z: 22, length: 9, depth: 2.8, height: 2.4, rotation: -0.24, source: 'frost-ridge-east' },
  ],
  icyBoulders: [
    { x: -2, z: 10, radius: 1.2, source: 'ice-boulder-center' },
    { x: 15, z: -24, radius: 1.05, source: 'ice-boulder-southeast' },
    { x: -30, z: -6, radius: 0.95, source: 'ice-boulder-west' },
  ],
};

const POISON_LAYOUT = {
  surface: {
    decals: [
      { x: -30, z: 16, sx: 10, sz: 20, rot: 0.1 },
      { x: -3, z: -22, sx: 18, sz: 8, rot: -0.26 },
      { x: 20, z: -6, sx: 14, sz: 18, rot: 0.18 },
      { x: 27, z: 28, sx: 10, sz: 12, rot: -0.06 },
    ],
    bulbCount: 11,
  },
  walls: [
    { x: -18, y: 1.36, z: 'northEdge', sx: 34, sy: 2.7, sz: 3.2, rotation: -0.04, source: 'poison-bank-northwest' },
    { x: 22, y: 1.44, z: 'northInset', sx: 26, sy: 2.9, sz: 3.4, rotation: 0.1, source: 'poison-bank-northeast' },
    { x: 43, y: 1.32, z: -21, sx: 3.4, sy: 2.6, sz: 20, rotation: 0.06, source: 'poison-bank-east-upper' },
    { x: 37, y: 1.1, z: 32, sx: 20, sy: 2.1, sz: 3.1, rotation: -0.08, source: 'poison-bank-south' },
    { x: -43, y: 1.2, z: 6, sx: 3.6, sy: 2.4, sz: 32, rotation: -0.06, source: 'poison-bank-west' },
  ],
  hulks: [
    { x: -28, z: -32, sx: 17, sz: 11, h: 5.4, source: 'poison-refinery-west' },
    { x: 5, z: -30, sx: 12, sz: 9, h: 4.9, source: 'poison-lab-south' },
    { x: 30, z: -8, sx: 12, sz: 20, h: 7.4, source: 'poison-spire-east' },
    { x: -18, z: 26, sx: 22, sz: 12, h: 5.6, source: 'poison-grove-northwest' },
    { x: 23, z: 27, sx: 12, sz: 10, h: 4.8, source: 'poison-hatchery-northeast' },
  ],
  stacks: [[-19, -12], [-6, -4], [12, -15], [24, 10], [-29, 18], [-7, 28], [12, 17], [33, 23]],
  pools: [
    { x: -12, z: -8, sx: 10, sz: 5, rotation: 0.14, source: 'poison-pool-southwest' },
    { x: 9, z: 1, sx: 14, sz: 4, rotation: -0.08, source: 'poison-pool-center-lane' },
    { x: -2, z: 22, sx: 8, sz: 4, rotation: 0.12, source: 'poison-pool-north-lane' },
    { x: 25, z: -24, sx: 8, sz: 5, rotation: -0.26, source: 'poison-pool-southeast' },
  ],
  pipes: [
    { x: -1, z: -12, sx: 1.5, sz: 11, rotation: 0.08, source: 'poison-pipe-vertical' },
    { x: 16, z: 14, sx: 9, sz: 1.5, rotation: -0.16, source: 'poison-pipe-east' },
    { x: -18, z: 12, sx: 8.2, sz: 1.4, rotation: 0.22, source: 'poison-pipe-west' },
    { x: 2, z: 31, sx: 1.4, sz: 8.8, rotation: -0.12, source: 'poison-pipe-north' },
  ],
  spores: [[-24, -18], [-14, 14], [-4, 13], [9, 15], [21, 17], [31, 1], [18, -25], [-25, 27]],
};

export const WORLD_LAYOUTS = {
  frontier: FRONTIER_LAYOUT,
  lava: LAVA_LAYOUT,
  ice: ICE_LAYOUT,
  poison: POISON_LAYOUT,
};

export function getWorldLayout(style) {
  return WORLD_LAYOUTS[style] || WORLD_LAYOUTS.frontier;
}
