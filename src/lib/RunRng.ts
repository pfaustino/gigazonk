/** Mulberry32 — fast seeded PRNG for reproducible arena runs. */
export class RunRng {
  private readonly seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = seed >>> 0;
  }

  static fromState(seed: number, state: number): RunRng {
    const rng = new RunRng(seed);
    rng.state = state >>> 0;
    return rng;
  }

  getState(): number {
    return this.state >>> 0;
  }

  getSeed(): number {
    return this.seed;
  }

  /** @returns float in [0, 1) */
  random(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** @returns integer in [0, max) */
  randomInt(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.random() * max);
  }

  /** Pick index from weights array. */
  pickWeighted(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    if (total <= 0) return 0;
    let roll = this.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return weights.length - 1;
  }
}
