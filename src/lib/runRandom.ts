import { RunRng } from './RunRng.js';

let active: RunRng | null = null;

export function setActiveRunRng(rng: RunRng | null): void {
  active = rng;
}

export function getActiveRunRng(): RunRng | null {
  return active;
}

/** Run-scoped random [0,1). Falls back to Math.random when no active run RNG. */
export function runRandom(): number {
  return active ? active.random() : Math.random();
}

export function runRandomInt(max: number): number {
  return active ? active.randomInt(max) : Math.floor(Math.random() * max);
}
