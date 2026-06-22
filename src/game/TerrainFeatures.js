import * as THREE from 'three';
import {
  ARENA_LOOT_MAX_RADIUS,
  ARENA_SIZE,
  ARENA_SPAWN_PAD_RADIUS,
} from './constants.js';

const WALL_HEIGHT = 2.8;
const WALL_THICK = 1.35;
const MESA_BASE_TOP_Y = 3.6;
const MESA_MAX_HEIGHT_MULT = 5;
const RAMP_SIDES = ['north', 'south', 'east', 'west'];

/** Hand-tuned inner landmarks — procedural generation fills the rest of the arena. */
const WALL_SEEDS = [
  { x: 0, z: 34, w: 20, d: WALL_THICK },
  { x: 0, z: -34, w: 20, d: WALL_THICK },
  { x: 34, z: 0, w: WALL_THICK, d: 20 },
  { x: -34, z: 0, w: WALL_THICK, d: 20 },
  { x: 24, z: 24, w: 14, d: WALL_THICK },
  { x: -24, z: 24, w: WALL_THICK, d: 14 },
  { x: 24, z: -24, w: WALL_THICK, d: 14 },
  { x: -24, z: -24, w: 14, d: WALL_THICK },
  { x: 42, z: 18, w: 16, d: WALL_THICK },
  { x: -40, z: -16, w: WALL_THICK, d: 16 },
  { x: 18, z: -42, w: 14, d: WALL_THICK },
  { x: -18, z: 42, w: WALL_THICK, d: 14 },
  { x: 0, z: 48, w: 18, d: WALL_THICK },
  { x: 48, z: 0, w: WALL_THICK, d: 18 },
];

const MESA_SEEDS = [
  { cx: 38, cz: 22, w: 14, d: 12, rampSide: 'south', rampLen: 6 },
  { cx: -36, cz: -28, w: 13, d: 13, rampSide: 'east', rampLen: 6.5 },
  { cx: -20, cz: 44, w: 12, d: 11, rampSide: 'north', rampLen: 5.5 },
  { cx: 105, cz: 65, w: 16, d: 14, rampSide: 'west', rampLen: 6 },
  { cx: -90, cz: -110, w: 15, d: 13, rampSide: 'south', rampLen: 6 },
];

function wallClearOfSpawn(wall) {
  const halfW = wall.w / 2;
  const halfD = wall.d / 2;
  const nearX = Math.max(wall.x - halfW, Math.min(0, wall.x + halfW));
  const nearZ = Math.max(wall.z - halfD, Math.min(0, wall.z + halfD));
  return Math.hypot(nearX, nearZ) >= ARENA_SPAWN_PAD_RADIUS;
}

function mesaOverlaps(cx, cz, w, d, mesas, pad = 8) {
  for (const m of mesas) {
    const dx = Math.abs(cx - m.cx);
    const dz = Math.abs(cz - m.cz);
    const minX = (w + m.w) / 2 + pad;
    const minZ = (d + m.d) / 2 + pad;
    if (dx < minX && dz < minZ) return true;
  }
  return false;
}

function finalizeMesa(mesa, heightMult = null) {
  const baseTopY = mesa.baseTopY ?? MESA_BASE_TOP_Y;
  const baseRampLen = mesa.rampLen ?? 6;
  const mult = heightMult ?? (1 + Math.random() * (MESA_MAX_HEIGHT_MULT - 1));
  const topY = baseTopY * mult;
  return {
    cx: mesa.cx,
    cz: mesa.cz,
    w: mesa.w,
    d: mesa.d,
    topY,
    rampSide: mesa.rampSide,
    rampLen: baseRampLen * mult,
    heightMult: mult,
  };
}

function generateProceduralWalls() {
  const walls = [];
  const half = ARENA_SIZE * 0.5 - 28;

  for (let r = 52; r < half; r += 34) {
    const segments = Math.max(10, Math.round(5 + r / 18));
    for (let i = 0; i < segments; i++) {
      if (Math.random() > 0.78) continue;
      const angle = (i / segments) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
      const x = Math.cos(angle) * (r + (Math.random() - 0.5) * 16);
      const z = Math.sin(angle) * (r + (Math.random() - 0.5) * 16);
      const radial = Math.random() < 0.45;
      const len = 10 + Math.random() * 14;
      const wall = radial
        ? { x, z, w: WALL_THICK, d: len }
        : { x, z, w: len, d: WALL_THICK };
      if (!wallClearOfSpawn(wall)) continue;
      walls.push(wall);
    }
  }

  for (let r = 68; r < half; r += 52) {
    if (Math.random() > 0.82) continue;
    const span = 14 + Math.random() * 18;
    walls.push({ x: 0, z: r, w: span, d: WALL_THICK });
    walls.push({ x: 0, z: -r, w: span, d: WALL_THICK });
    walls.push({ x: r, z: 0, w: WALL_THICK, d: span });
    walls.push({ x: -r, z: 0, w: WALL_THICK, d: span });
  }

  const gridStep = 88;
  for (let gx = -half; gx <= half; gx += gridStep) {
    for (let gz = -half; gz <= half; gz += gridStep) {
      if (Math.random() > 0.68) continue;
      const x = gx + (Math.random() - 0.5) * gridStep * 0.65;
      const z = gz + (Math.random() - 0.5) * gridStep * 0.65;
      if (Math.hypot(x, z) < ARENA_SPAWN_PAD_RADIUS + 14) continue;
      const alongX = Math.random() < 0.5;
      const len = 11 + Math.random() * 16;
      const wall = alongX
        ? { x, z, w: len, d: WALL_THICK }
        : { x, z, w: WALL_THICK, d: len };
      if (!wallClearOfSpawn(wall)) continue;
      walls.push(wall);
    }
  }

  return walls;
}

function generateProceduralMesas() {
  const mesas = [];
  const half = ARENA_SIZE * 0.5 - 36;
  const gridStep = 78;

  for (let gx = -half; gx <= half; gx += gridStep) {
    for (let gz = -half; gz <= half; gz += gridStep) {
      if (Math.random() > 0.58) continue;
      const cx = gx + (Math.random() - 0.5) * gridStep * 0.72;
      const cz = gz + (Math.random() - 0.5) * gridStep * 0.72;
      if (Math.hypot(cx, cz) < ARENA_SPAWN_PAD_RADIUS + 16) continue;

      const w = 10 + Math.random() * 12;
      const d = 9 + Math.random() * 11;
      if (mesaOverlaps(cx, cz, w, d, mesas)) continue;

      mesas.push(
        finalizeMesa({
          cx,
          cz,
          w,
          d,
          rampSide: RAMP_SIDES[Math.floor(Math.random() * RAMP_SIDES.length)],
          rampLen: 5 + Math.random() * 2.5,
        })
      );
    }
  }

  return mesas;
}

function addMesaWallObstacles(mesa, obstacles) {
  const { cx, cz, w, d, rampSide, rampLen } = mesa;
  const hw = w / 2;
  const hd = d / 2;
  const t = WALL_THICK;

  const zMin = rampSide === 'south' ? cz - hd - rampLen : cz - hd;
  const zMax = rampSide === 'north' ? cz + hd + rampLen : cz + hd;
  const xMin = rampSide === 'west' ? cx - hw - rampLen : cx - hw;
  const xMax = rampSide === 'east' ? cx + hw + rampLen : cx + hw;

  if (rampSide !== 'west') {
    obstacles.push({
      type: 'mesa_wall',
      minX: cx - hw - t,
      maxX: cx - hw + t,
      minZ: zMin,
      maxZ: zMax,
      blockBelowY: mesa.topY,
    });
  }
  if (rampSide !== 'east') {
    obstacles.push({
      type: 'mesa_wall',
      minX: cx + hw - t,
      maxX: cx + hw + t,
      minZ: zMin,
      maxZ: zMax,
      blockBelowY: mesa.topY,
    });
  }
  if (rampSide !== 'north') {
    obstacles.push({
      type: 'mesa_wall',
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz + hd - t,
      maxZ: cz + hd + t,
      blockBelowY: mesa.topY,
    });
  }
  if (rampSide !== 'south') {
    obstacles.push({
      type: 'mesa_wall',
      minX: cx - hw,
      maxX: cx + hw,
      minZ: cz - hd - t,
      maxZ: cz - hd + t,
      blockBelowY: mesa.topY,
    });
  }
}

function pushTri(positions, indices, a, b, c) {
  const base = positions.length / 3;
  positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  indices.push(base, base + 1, base + 2);
}

function triNormal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function orientTri(a, b, c, outwardHint) {
  if (dot3(triNormal(a, b, c), outwardHint) < 0) return [a, c, b];
  return [a, b, c];
}

function pushOrientedTri(positions, indices, a, b, c, outwardHint) {
  [a, b, c] = orientTri(a, b, c, outwardHint);
  pushTri(positions, indices, a, b, c);
}

function pushOrientedQuad(positions, indices, a, b, c, d, outwardHint) {
  let tri = orientTri(a, b, c, outwardHint);
  pushTri(positions, indices, tri[0], tri[1], tri[2]);
  tri = orientTri(a, c, d, outwardHint);
  pushTri(positions, indices, tri[0], tri[1], tri[2]);
}

/** Closed triangular prism — winding corrected per face so nothing is backface-culled. */
function createSolidRampGeometry(mesa) {
  const { cx, cz, w, d, topY, rampSide, rampLen } = mesa;
  const hw = w / 2;
  const hd = d / 2;
  const positions = [];
  const indices = [];

  let farL;
  let farR;
  let nearL;
  let nearR;
  let nearLTop;
  let nearRTop;
  let slopeHint;
  let sideLeftHint;
  let sideRightHint;
  let backHint;

  if (rampSide === 'south') {
    const zFar = cz - hd - rampLen;
    const zNear = cz - hd;
    farL = [cx - hw, 0, zFar];
    farR = [cx + hw, 0, zFar];
    nearL = [cx - hw, 0, zNear];
    nearR = [cx + hw, 0, zNear];
    nearLTop = [cx - hw, topY, zNear];
    nearRTop = [cx + hw, topY, zNear];
    slopeHint = [0, topY, -rampLen];
    sideLeftHint = [-1, 0, 0];
    sideRightHint = [1, 0, 0];
    backHint = [0, 0, 1];
  } else if (rampSide === 'north') {
    const zNear = cz + hd;
    const zFar = cz + hd + rampLen;
    farL = [cx - hw, 0, zFar];
    farR = [cx + hw, 0, zFar];
    nearL = [cx - hw, 0, zNear];
    nearR = [cx + hw, 0, zNear];
    nearLTop = [cx - hw, topY, zNear];
    nearRTop = [cx + hw, topY, zNear];
    slopeHint = [0, topY, rampLen];
    sideLeftHint = [-1, 0, 0];
    sideRightHint = [1, 0, 0];
    backHint = [0, 0, -1];
  } else if (rampSide === 'east') {
    const xNear = cx + hw;
    const xFar = cx + hw + rampLen;
    farL = [xFar, 0, cz - hd];
    farR = [xFar, 0, cz + hd];
    nearL = [xNear, 0, cz - hd];
    nearR = [xNear, 0, cz + hd];
    nearLTop = [xNear, topY, cz - hd];
    nearRTop = [xNear, topY, cz + hd];
    slopeHint = [rampLen, topY, 0];
    sideLeftHint = [0, 0, -1];
    sideRightHint = [0, 0, 1];
    backHint = [-1, 0, 0];
  } else {
    const xNear = cx - hw;
    const xFar = cx - hw - rampLen;
    farL = [xFar, 0, cz - hd];
    farR = [xFar, 0, cz + hd];
    nearL = [xNear, 0, cz - hd];
    nearR = [xNear, 0, cz + hd];
    nearLTop = [xNear, topY, cz - hd];
    nearRTop = [xNear, topY, cz + hd];
    slopeHint = [-rampLen, topY, 0];
    sideLeftHint = [0, 0, -1];
    sideRightHint = [0, 0, 1];
    backHint = [1, 0, 0];
  }

  pushOrientedQuad(positions, indices, farL, nearL, nearR, farR, [0, -1, 0]);
  pushOrientedQuad(positions, indices, farL, farR, nearRTop, nearLTop, slopeHint);
  pushOrientedTri(positions, indices, farL, nearL, nearLTop, sideLeftHint);
  pushOrientedTri(positions, indices, farR, nearRTop, nearR, sideRightHint);
  pushOrientedQuad(positions, indices, nearL, nearLTop, nearRTop, nearR, backHint);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function generateArenaFeatures() {
  const wallBlueprints = [...WALL_SEEDS, ...generateProceduralWalls()];
  const mesaBlueprints = [
    ...MESA_SEEDS.map(m => finalizeMesa(m)),
    ...generateProceduralMesas(),
  ];

  const mesas = mesaBlueprints;
  const obstacles = [];
  const featureMeshes = [];

  for (const wall of wallBlueprints) {
    if (!wallClearOfSpawn(wall)) continue;
    const halfW = wall.w / 2;
    const halfD = wall.d / 2;
    obstacles.push({
      type: 'aabb',
      minX: wall.x - halfW,
      maxX: wall.x + halfW,
      minZ: wall.z - halfD,
      maxZ: wall.z + halfD,
    });
    featureMeshes.push({ kind: 'wall', x: wall.x, z: wall.z, w: wall.w, d: wall.d });
  }

  for (const mesa of mesas) {
    addMesaWallObstacles(mesa, obstacles);
    featureMeshes.push({ kind: 'mesa', ...mesa });
  }

  return { mesas, obstacles, featureMeshes };
}

export function sampleGroundHeight(x, z, mesas) {
  let h = 0;
  for (const mesa of mesas) {
    h = Math.max(h, sampleMesaHeight(x, z, mesa));
  }
  return h;
}

function sampleMesaHeight(x, z, mesa) {
  const { cx, cz, w, d, topY, rampSide, rampLen } = mesa;
  const hw = w / 2;
  const hd = d / 2;

  if (x >= cx - hw && x <= cx + hw && z >= cz - hd && z <= cz + hd) {
    return topY;
  }

  let inRamp = false;
  let t = 0;

  if (rampSide === 'south') {
    if (x >= cx - hw && x <= cx + hw && z >= cz - hd - rampLen && z < cz - hd) {
      inRamp = true;
      t = (z - (cz - hd - rampLen)) / rampLen;
    }
  } else if (rampSide === 'north') {
    if (x >= cx - hw && x <= cx + hw && z > cz + hd && z <= cz + hd + rampLen) {
      inRamp = true;
      t = 1 - (z - (cz + hd)) / rampLen;
    }
  } else if (rampSide === 'east') {
    if (z >= cz - hd && z <= cz + hd && x > cx + hw && x <= cx + hw + rampLen) {
      inRamp = true;
      t = 1 - (x - (cx + hw)) / rampLen;
    }
  } else if (rampSide === 'west') {
    if (z >= cz - hd && z <= cz + hd && x >= cx - hw - rampLen && x < cx - hw) {
      inRamp = true;
      t = (x - (cx - hw - rampLen)) / rampLen;
    }
  }

  if (inRamp) return topY * THREE.MathUtils.clamp(t, 0, 1);
  return 0;
}

export function resolveCircleAabb(px, pz, radius, box) {
  const cx = THREE.MathUtils.clamp(px, box.minX, box.maxX);
  const cz = THREE.MathUtils.clamp(pz, box.minZ, box.maxZ);
  let dx = px - cx;
  let dz = pz - cz;
  const dist = Math.hypot(dx, dz);

  if (dist >= radius) return { x: px, z: pz };

  if (dist > 0.001) {
    const push = (radius - dist) / dist;
    return { x: px + dx * push, z: pz + dz * push };
  }

  const toLeft = px - box.minX;
  const toRight = box.maxX - px;
  const toTop = box.maxZ - pz;
  const toBottom = pz - box.minZ;
  const min = Math.min(toLeft, toRight, toTop, toBottom);
  if (min === toLeft) px = box.minX - radius;
  else if (min === toRight) px = box.maxX + radius;
  else if (min === toTop) pz = box.maxZ + radius;
  else pz = box.minZ - radius;
  return { x: px, z: pz };
}

export function buildFeatureMeshes(group, featureMeshes, rockColor) {
  const wallMat = new THREE.MeshLambertMaterial({ color: rockColor });
  const mesaMat = new THREE.MeshLambertMaterial({ color: rockColor });
  const rampMat = new THREE.MeshLambertMaterial({ color: rockColor });
  const meshes = [];

  for (const f of featureMeshes) {
    if (f.kind === 'wall') {
      const geo = new THREE.BoxGeometry(f.w, WALL_HEIGHT, f.d);
      const mesh = new THREE.Mesh(geo, wallMat.clone());
      mesh.position.set(f.x, WALL_HEIGHT / 2, f.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
    } else if (f.kind === 'mesa') {
      const { cx, cz, w, d, topY, rampSide, rampLen } = f;
      const platGeo = new THREE.BoxGeometry(w, topY, d);
      const plat = new THREE.Mesh(platGeo, mesaMat.clone());
      plat.position.set(cx, topY / 2, cz);
      plat.castShadow = true;
      plat.receiveShadow = true;
      group.add(plat);
      meshes.push(plat);

      const rampGeo = createSolidRampGeometry(f);
      const ramp = new THREE.Mesh(rampGeo, rampMat.clone());
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      group.add(ramp);
      meshes.push(ramp);
    }
  }

  return meshes;
}

export function tintFeatureMeshes(meshes, rockColor) {
  for (const mesh of meshes) {
    mesh.material.color.setHex(rockColor);
  }
}

/** Keep loot away from walls and mesa tops. */
export function isLootSpotClear(x, z, obstacles, mesas) {
  if (Math.hypot(x, z) > ARENA_LOOT_MAX_RADIUS) return false;
  for (const obs of obstacles) {
    if (obs.type === 'aabb' || obs.type === 'mesa_wall') {
      if (x >= obs.minX - 2 && x <= obs.maxX + 2 && z >= obs.minZ - 2 && z <= obs.maxZ + 2) {
        return false;
      }
    }
  }
  if (sampleGroundHeight(x, z, mesas) > 0.5) return false;
  return true;
}
