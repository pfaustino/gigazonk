import { describe, expect, it } from 'vitest';
import { MesaHeightIndex } from '../src/game/MesaHeightIndex.js';
import { sampleGroundHeight } from '../src/game/TerrainFeatures.js';

const mesaA = {
  cx: 40,
  cz: 20,
  w: 14,
  d: 12,
  topY: 4,
  rampSide: 'south',
  rampLen: 6,
};

const mesaB = {
  cx: -80,
  cz: -90,
  w: 15,
  d: 13,
  topY: 5,
  rampSide: 'east',
  rampLen: 6,
};

const mesas = [mesaA, mesaB];

describe('MesaHeightIndex', () => {
  it('queries only mesas in the query cell', () => {
    const index = new MesaHeightIndex(16);
    index.rebuild(mesas);

    const nearA = index.query(40, 20);
    expect(nearA).toContain(mesaA);
    expect(nearA).not.toContain(mesaB);

    const nearB = index.query(-80, -90);
    expect(nearB).toContain(mesaB);
    expect(nearB).not.toContain(mesaA);
  });

  it('matches full scan height sampling on plateau and ramp', () => {
    const index = new MesaHeightIndex(32);
    index.rebuild(mesas);

    const points = [
      [40, 20],
      [40, 14],
      [0, 0],
      [-80, -90],
      [-74, -90],
    ];

    for (const [x, z] of points) {
      const full = sampleGroundHeight(x, z, mesas);
      const indexed = sampleGroundHeight(x, z, mesas, index);
      expect(indexed).toBe(full);
    }
  });
});
