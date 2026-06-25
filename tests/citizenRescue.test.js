import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CitizenRescue scatter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('places citizens only on clear ground spots', async () => {
    vi.stubGlobal('document', { addEventListener: () => {} });
    const { CitizenRescue } = await import('../src/game/CitizenRescue.js');
    const scene = { add: () => {} };
    const rescue = new CitizenRescue(scene);
    const arena = {
      obstacles: [{ type: 'aabb', minX: -5, maxX: 5, minZ: -5, maxZ: 5 }],
      mesas: [],
      getGroundHeight: () => 0,
    };
    const placed = rescue.scatter(arena, 3);
    expect(placed).toBeGreaterThan(0);
    for (const citizen of rescue.citizens) {
      const dist = Math.hypot(citizen.x, citizen.z);
      expect(dist).toBeGreaterThanOrEqual(38);
      expect(dist).toBeLessThanOrEqual(145);
      expect(citizen.x < -7 || citizen.x > 7 || citizen.z < -7 || citizen.z > 7).toBe(true);
    }
  });

  it('spawnOne adds a citizen without clearing existing ones', async () => {
    vi.stubGlobal('document', { addEventListener: () => {} });
    const { CitizenRescue } = await import('../src/game/CitizenRescue.js');
    const scene = { add: () => {} };
    const rescue = new CitizenRescue(scene);
    const arena = {
      obstacles: [],
      mesas: [],
      getGroundHeight: () => 0,
    };
    expect(rescue.scatter(arena, 2)).toBe(2);
    expect(rescue.citizens.length).toBe(2);
    expect(rescue.spawnOne(arena)).toBe(true);
    expect(rescue.citizens.length).toBe(3);
  });
});
