import { describe, expect, it } from 'vitest';
import {
  blastOriginAtRadius,
  collectBlastVictims,
  enemyHitReach,
  isWithinEnemyHitReach,
} from '../src/game/ProjectileManager.js';

describe('blast radius combat', () => {
  it('computes detonation reach from area and enemy scale', () => {
    expect(enemyHitReach(2, 1)).toBeCloseTo(2.4);
  });

  it('places blast origin on the approach shell, not the enemy center', () => {
    const origin = blastOriginAtRadius(10, 0, 0, 0, 2, 1);
    expect(origin.x).toBeCloseTo(2.4);
    expect(origin.z).toBeCloseTo(0);
    expect(Math.hypot(origin.x, origin.z)).toBeCloseTo(2.4);
  });

  it('detects when a projectile has entered blast reach', () => {
    expect(isWithinEnemyHitReach(2.3, 0, 0, 0, 2, 1)).toBe(true);
    expect(isWithinEnemyHitReach(3, 0, 0, 0, 2, 1)).toBe(false);
  });

  it('collects every enemy overlapping the blast sphere', () => {
    const enemies = [
      { alive: true, x: 0, z: 0, scale: 1 },
      { alive: true, x: 1.5, z: 0, scale: 1 },
      { alive: true, x: 4, z: 0, scale: 1 },
      { alive: false, x: 0.5, z: 0, scale: 1 },
    ];
    const victims = collectBlastVictims(0, 0, 2, enemies);
    expect(victims).toHaveLength(2);
    expect(victims.map((e) => e.x)).toEqual([0, 1.5]);
  });
});
