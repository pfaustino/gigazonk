import { describe, expect, it } from 'vitest';
import { ObstacleGrid } from '../src/game/ObstacleGrid.js';

describe('ObstacleGrid', () => {
  it('queries only nearby obstacles', () => {
    const grid = new ObstacleGrid(10);
    grid.rebuild([
      { type: 'circle', x: 0, z: 0, radius: 1 },
      { type: 'circle', x: 200, z: 200, radius: 1 },
    ]);

    const near = grid.query(0, 0, 2);
    expect(near).toHaveLength(1);
    expect(near[0].x).toBe(0);

    const far = grid.query(200, 200, 2);
    expect(far).toHaveLength(1);
    expect(far[0].x).toBe(200);
  });

  it('dedupes obstacles spanning multiple cells', () => {
    const grid = new ObstacleGrid(8);
    const wide = { type: 'aabb', minX: -5, maxX: 5, minZ: -1, maxZ: 1 };
    grid.rebuild([wide]);
    const hits = grid.query(0, 0, 6);
    expect(hits).toHaveLength(1);
  });
});
