import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createTerrainReliefFromSeed,
  initTerrainRelief,
  sampleBaseTerrainHeight,
} from '../src/game/TerrainRelief.js';
import {
  repositionFeatureMeshesToTerrain,
  sampleGroundHeight,
  sampleWallCornerHeights,
} from '../src/game/TerrainFeatures.js';
import { ARENA_RELIEF_AMPLITUDE, ARENA_SPAWN_PAD_RADIUS } from '../src/game/constants.js';

const GROUND_WALL_HEIGHT = 2.8;

describe('TerrainRelief', () => {
  it('is flat at the spawn pad center', () => {
    const params = createTerrainReliefFromSeed(42);
    expect(sampleBaseTerrainHeight(0, 0, params)).toBe(0);
    expect(sampleBaseTerrainHeight(5, -5, params)).toBe(0);
  });

  it('ramps up outside the spawn pad', () => {
    const params = createTerrainReliefFromSeed(99);
    const inner = sampleBaseTerrainHeight(ARENA_SPAWN_PAD_RADIUS - 2, 0, params);
    const outer = sampleBaseTerrainHeight(ARENA_SPAWN_PAD_RADIUS + 40, 0, params);
    expect(inner).toBe(0);
    expect(Math.abs(outer)).toBeLessThanOrEqual(ARENA_RELIEF_AMPLITUDE + 0.001);
    expect(Math.abs(outer)).toBeGreaterThan(0.02);
  });

  it('is deterministic for the same seed', () => {
    const a = createTerrainReliefFromSeed(12345);
    const b = createTerrainReliefFromSeed(12345);
    expect(sampleBaseTerrainHeight(80, -120, a)).toBe(sampleBaseTerrainHeight(80, -120, b));
  });

  it('feeds sampleGroundHeight when relief is active', () => {
    initTerrainRelief(7);
    const h = sampleGroundHeight(120, -90, []);
    expect(Math.abs(h)).toBeLessThanOrEqual(ARENA_RELIEF_AMPLITUDE + 0.001);
  });

  it('repositions wall meshes from the lowest corner on relief', () => {
    initTerrainRelief(55);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, GROUND_WALL_HEIGHT, 1.35),
      new THREE.MeshBasicMaterial()
    );
    mesh.userData.terrainAnchor = { kind: 'wall', x: 80, z: -60, w: 10, d: 1.35 };
    mesh.position.set(80, GROUND_WALL_HEIGHT / 2, -60);
    repositionFeatureMeshesToTerrain([mesh]);
    const { min, max } = sampleWallCornerHeights(80, -60, 10, 1.35);
    const meshH = GROUND_WALL_HEIGHT + (max - min);
    expect(mesh.scale.y).toBeCloseTo(meshH / GROUND_WALL_HEIGHT, 4);
    expect(mesh.position.y).toBeCloseTo(min + meshH / 2, 4);
    expect(max - min).toBeGreaterThan(0.01);
  });
});
