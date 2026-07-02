import { describe, expect, it } from 'vitest';
import { arenaTreesEnabledForBiome } from '../src/game/InstancedTreeField.js';

describe('arenaTreesEnabledForBiome', () => {
  it('enables trees only on Zonk Meadows', () => {
    expect(arenaTreesEnabledForBiome('grass')).toBe(true);
    expect(arenaTreesEnabledForBiome('frost')).toBe(false);
    expect(arenaTreesEnabledForBiome('ember')).toBe(false);
    expect(arenaTreesEnabledForBiome(undefined)).toBe(false);
  });
});
