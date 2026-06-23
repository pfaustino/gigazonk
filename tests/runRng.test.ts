import { describe, expect, it } from 'vitest';
import { RunRng } from '../src/lib/RunRng.ts';
import { getActiveRunRng, runRandom, runRandomInt, setActiveRunRng } from '../src/lib/runRandom.ts';

describe('RunRng', () => {
  it('is deterministic for the same seed', () => {
    const a = new RunRng(42);
    const b = new RunRng(42);
    const seqA = Array.from({ length: 5 }, () => a.random());
    const seqB = Array.from({ length: 5 }, () => b.random());
    expect(seqA).toEqual(seqB);
  });

  it('restores state via fromState', () => {
    const rng = new RunRng(99);
    rng.random();
    rng.random();
    const state = rng.getState();
    const restored = RunRng.fromState(99, state);
    expect(restored.random()).toBe(rng.random());
  });

  it('randomInt stays within bounds', () => {
    const rng = new RunRng(7);
    for (let i = 0; i < 50; i++) {
      const n = rng.randomInt(10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
    }
  });
});

describe('runRandom', () => {
  it('uses active run RNG when set', () => {
    setActiveRunRng(new RunRng(123));
    const first = runRandom();
    const state = getActiveRunRng()!.getState();

    setActiveRunRng(new RunRng(123));
    runRandom();
    const secondFromFresh = runRandom();

    setActiveRunRng(RunRng.fromState(123, state));
    const secondFromRestore = runRandom();

    expect(first).not.toBe(secondFromFresh);
    expect(secondFromRestore).toBe(secondFromFresh);
    setActiveRunRng(null);
  });

  it('runRandomInt uses active RNG', () => {
    setActiveRunRng(new RunRng(555));
    const n = runRandomInt(100);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(100);
    setActiveRunRng(null);
  });
});
