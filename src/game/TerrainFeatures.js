import * as THREE from 'three';
import { ARENA_LOOT_MAX_RADIUS, ARENA_SPAWN_PAD_RADIUS } from './constants.js';

const WALL_HEIGHT = 2.8;
const WALL_THICK = 1.35;

/** Wall segments in world units — inner ring near spawn, outer rings fill the 1200 arena. */
const WALL_BLUEPRINTS = [
  // Inner — just outside spawn pad (~30)
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
  // Mid field
  { x: 0, z: 95, w: 26, d: WALL_THICK },
  { x: 0, z: -95, w: 26, d: WALL_THICK },
  { x: 95, z: 0, w: WALL_THICK, d: 26 },
  { x: -95, z: 0, w: WALL_THICK, d: 26 },
  { x: 70, z: 70, w: 18, d: WALL_THICK },
  { x: -70, z: 70, w: WALL_THICK, d: 18 },
  { x: 70, z: -70, w: WALL_THICK, d: 18 },
  { x: -70, z: -70, w: 18, d: WALL_THICK },
  { x: 120, z: 45, w: 16, d: WALL_THICK },
  { x: -110, z: -50, w: WALL_THICK, d: 16 },
  // Outer field
  { x: 0, z: 210, w: 32, d: WALL_THICK },
  { x: 0, z: -210, w: 32, d: WALL_THICK },
  { x: 210, z: 0, w: WALL_THICK, d: 32 },
  { x: -210, z: 0, w: WALL_THICK, d: 32 },
  { x: 155, z: 155, w: 22, d: WALL_THICK },
  { x: -155, z: 155, w: WALL_THICK, d: 22 },
  { x: 155, z: -155, w: WALL_THICK, d: 22 },
  { x: -155, z: -155, w: 22, d: WALL_THICK },
  { x: 260, z: 90, w: 20, d: WALL_THICK },
  { x: -240, z: -100, w: WALL_THICK, d: 20 },
  // Far edge
  { x: 0, z: 420, w: 36, d: WALL_THICK },
  { x: 0, z: -420, w: 36, d: WALL_THICK },
  { x: 420, z: 0, w: WALL_THICK, d: 36 },
  { x: -420, z: 0, w: WALL_THICK, d: 36 },
  { x: 300, z: 300, w: 24, d: WALL_THICK },
  { x: -300, z: 300, w: WALL_THICK, d: 24 },
  { x: 300, z: -300, w: WALL_THICK, d: 24 },
  { x: -300, z: -300, w: 24, d: WALL_THICK },
];

const MESA_BLUEPRINTS = [
  { cx: 38, cz: 22, w: 14, d: 12, topY: 3.6, rampSide: 'south', rampLen: 6 },
  { cx: -36, cz: -28, w: 13, d: 13, topY: 4, rampSide: 'east', rampLen: 6.5 },
  { cx: -20, cz: 44, w: 12, d: 11, topY: 3.2, rampSide: 'north', rampLen: 5.5 },
  { cx: 105, cz: 65, w: 16, d: 14, topY: 3.8, rampSide: 'west', rampLen: 6 },
  { cx: -90, cz: -110, w: 15, d: 13, topY: 3.5, rampSide: 'south', rampLen: 6 },
  { cx: 200, cz: -140, w: 18, d: 15, topY: 4, rampSide: 'east', rampLen: 7 },
  { cx: -220, cz: 180, w: 17, d: 14, topY: 3.7, rampSide: 'north', rampLen: 6.5 },
  { cx: 350, cz: 250, w: 20, d: 16, topY: 4.2, rampSide: 'west', rampLen: 7.5 },
  { cx: -380, cz: -320, w: 19, d: 17, topY: 4, rampSide: 'south', rampLen: 7 },
  { cx: 460, cz: -200, w: 18, d: 15, topY: 3.9, rampSide: 'east', rampLen: 7 },
];

function wallClearOfSpawn(wall) {
  const halfW = wall.w / 2;
  const halfD = wall.d / 2;
  const nearX = Math.max(wall.x - halfW, Math.min(0, wall.x + halfW));
  const nearZ = Math.max(wall.z - halfD, Math.min(0, wall.z + halfD));
  return Math.hypot(nearX, nearZ) >= ARENA_SPAWN_PAD_RADIUS;
}

export function generateArenaFeatures() {
  const mesas = MESA_BLUEPRINTS.map(m => ({ ...m }));
  const obstacles = [];
  const featureMeshes = [];

  for (const wall of WALL_BLUEPRINTS) {
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

      const rampGeo = new THREE.BoxGeometry(
        rampSide === 'east' || rampSide === 'west' ? rampLen : w,
        0.01,
        rampSide === 'north' || rampSide === 'south' ? rampLen : d
      );
      const ramp = new THREE.Mesh(rampGeo, rampMat.clone());
      const rampAngle = Math.atan2(topY, rampLen);
      if (rampSide === 'south') {
        ramp.rotation.x = rampAngle;
        ramp.position.set(cx, topY / 2, cz - d / 2 - rampLen / 2);
        ramp.scale.set(1, 1, 1 / Math.cos(rampAngle));
      } else if (rampSide === 'north') {
        ramp.rotation.x = -rampAngle;
        ramp.position.set(cx, topY / 2, cz + d / 2 + rampLen / 2);
        ramp.scale.set(1, 1, 1 / Math.cos(rampAngle));
      } else if (rampSide === 'east') {
        ramp.rotation.z = -rampAngle;
        ramp.position.set(cx + w / 2 + rampLen / 2, topY / 2, cz);
        ramp.scale.set(1 / Math.cos(rampAngle), 1, 1);
      } else if (rampSide === 'west') {
        ramp.rotation.z = rampAngle;
        ramp.position.set(cx - w / 2 - rampLen / 2, topY / 2, cz);
        ramp.scale.set(1 / Math.cos(rampAngle), 1, 1);
      }
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
    if (obs.type === 'aabb') {
      if (x >= obs.minX - 2 && x <= obs.maxX + 2 && z >= obs.minZ - 2 && z <= obs.maxZ + 2) {
        return false;
      }
    }
  }
  if (sampleGroundHeight(x, z, mesas) > 0.5) return false;
  return true;
}
