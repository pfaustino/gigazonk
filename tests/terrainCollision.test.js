import { describe, expect, it } from 'vitest';
import { isInsideMesaRamp, resolveCircleAabb } from '../src/game/TerrainFeatures.js';

const southRampMesa = {
  cx: 40,
  cz: 20,
  w: 14,
  d: 12,
  topY: 4,
  rampSide: 'south',
  rampLen: 6,
};

describe('mesa ramp collision', () => {
  it('detects south ramp footprint', () => {
    expect(isInsideMesaRamp(40, 11, southRampMesa)).toBe(true);
    expect(isInsideMesaRamp(40, 20, southRampMesa)).toBe(false);
    expect(isInsideMesaRamp(40, 5, southRampMesa)).toBe(false);
  });

  it('does not block ramp approach with plateau-only side walls', () => {
    const hw = southRampMesa.w / 2;
    const hd = southRampMesa.d / 2;
    const westWall = {
      minX: southRampMesa.cx - hw - 0.45,
      maxX: southRampMesa.cx - hw + 0.45,
      minZ: southRampMesa.cz - hd,
      maxZ: southRampMesa.cz + hd,
    };
    const rampApproach = resolveCircleAabb(33, 11, 0.5, westWall);
    expect(rampApproach.x).toBeCloseTo(33, 3);
    expect(rampApproach.z).toBeCloseTo(11, 3);
  });
});
