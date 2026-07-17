import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clearTerrainRelief, initTerrainRelief } from '../src/game/TerrainRelief.js';
import { realignWallObstacleHeights, sampleGroundHeight } from '../src/game/TerrainFeatures.js';
import { InstancedRockField } from '../src/game/InstancedRockField.js';

const GROUND_WALL_HEIGHT = 2.8;

function rockTopY(groundY, radius, scaleY) {
  return groundY + radius * scaleY * 1.5;
}

describe('rock terrain alignment', () => {
  it('matches rock collision tops to relief ground height', () => {
    clearTerrainRelief();
    const group = new THREE.Group();
    const field = new InstancedRockField(group, []);
    const placement = field.placements[0];

    initTerrainRelief(4242);
    field.realignToTerrain([]);
    const groundY = sampleGroundHeight(placement.x, placement.z, []);

    expect(field.obstacles[0].blockBelowY).toBeCloseTo(
      rockTopY(groundY, placement.radius, placement.scaleY),
      4
    );
  });

  it('raises wall blockBelowY with terrain base', () => {
    initTerrainRelief(77);
    const obs = {
      type: 'aabb',
      minX: 74,
      maxX: 86,
      minZ: -61,
      maxZ: -58.65,
      blockBelowY: GROUND_WALL_HEIGHT,
    };
    realignWallObstacleHeights([obs]);
    expect(obs.blockBelowY).toBeGreaterThan(GROUND_WALL_HEIGHT);
  });
});
