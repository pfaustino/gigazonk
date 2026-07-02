import {
  ARENA_RELIEF_AMPLITUDE,
  ARENA_RELIEF_SPAWN_BLEND,
  ARENA_SPAWN_PAD_RADIUS,
} from './constants.js';

/** @typedef {{ p1: number, p2: number, p3: number, p4: number, amp: number }} TerrainReliefParams */

/** @type {TerrainReliefParams | null} */
let activeRelief = null;

function hashSeed(seed) {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return h ^ (h >>> 16);
}

function phaseFromHash(h, scale) {
  return ((h >>> 0) / 0x100000000) * Math.PI * 2 * scale;
}

/** Deterministic rolling-hill params from the run seed. */
export function createTerrainReliefFromSeed(seed) {
  const h = hashSeed(seed);
  return {
    p1: phaseFromHash(h, 1),
    p2: phaseFromHash(h >>> 8, 1.07),
    p3: phaseFromHash(h >>> 16, 0.93),
    p4: phaseFromHash(h >>> 24, 1.13),
    amp: ARENA_RELIEF_AMPLITUDE,
  };
}

export function initTerrainRelief(seed) {
  activeRelief = createTerrainReliefFromSeed(seed);
}

export function clearTerrainRelief() {
  activeRelief = null;
}

export function getActiveTerrainRelief() {
  return activeRelief;
}

function spawnFlattenFactor(x, z) {
  const dist = Math.hypot(x, z);
  const inner = ARENA_SPAWN_PAD_RADIUS;
  const outer = ARENA_SPAWN_PAD_RADIUS + ARENA_RELIEF_SPAWN_BLEND;
  if (dist <= inner) return 0;
  if (dist >= outer) return 1;
  const t = (dist - inner) / (outer - inner);
  return t * t * (3 - 2 * t);
}

function rawReliefNoise(x, z, params) {
  const { p1, p2, p3, p4 } = params;
  return (
    Math.sin(x * 0.012 + p1) * Math.cos(z * 0.011 + p2) +
    0.55 * Math.sin(x * 0.028 + z * 0.019 + p3) +
    0.3 * Math.sin(x * 0.055 - z * 0.042 + p4)
  ) / 1.85;
}

/** Walkable base terrain height at world (x, z). Mesas stack on top via sampleGroundHeight. */
export function sampleBaseTerrainHeight(x, z, params = activeRelief) {
  if (!params) return 0;
  const n = rawReliefNoise(x, z, params);
  return n * params.amp * spawnFlattenFactor(x, z);
}

/**
 * Displace a horizontal PlaneGeometry (mesh rotated -90° on X).
 * Vertex local Y maps to world -Z; height is written to local Z → world Y.
 */
export function applyTerrainReliefToGeometry(geometry, params = activeRelief) {
  if (!geometry || !params) return;
  const pos = geometry.attributes.position;
  if (!pos) return;

  for (let i = 0; i < pos.count; i++) {
    const worldX = pos.getX(i);
    const worldZ = -pos.getY(i);
    pos.setZ(i, sampleBaseTerrainHeight(worldX, worldZ, params));
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}
