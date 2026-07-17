import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../src/game/Player.js';
import {
  ENEMY_TYPES,
  XP_PICKUP_MULT,
  gemVisualScale,
  scaledKillGemXp,
} from '../src/game/constants.js';

function mockScene() {
  return { add: () => {} };
}

describe('XP pickup', () => {
  /** @type {Player} */
  let player;

  beforeEach(() => {
    player = new Player(mockScene());
    player.reset();
  });

  it('grants at least 1 XP for a 1-value gem after pickup mult', () => {
    const before = player.xp;
    player.addXp(1);
    expect(player.xp - before).toBeGreaterThanOrEqual(1);
    expect(Math.floor(1 * XP_PICKUP_MULT)).toBe(0);
  });

  it('wisp enemies award 2 base XP', () => {
    expect(ENEMY_TYPES.wisp.xp).toBe(2);
  });

  it('scales kill gem XP with rift and killXpMult only', () => {
    expect(scaledKillGemXp(3)).toBe(3);
    expect(scaledKillGemXp(3, { killXpMult: 0.2 })).toBeCloseTo(3.6);
    expect(scaledKillGemXp(3, { inRift: true })).toBe(6);
  });

  it('caps gem mesh scale from base enemy XP', () => {
    expect(gemVisualScale(3)).toBeCloseTo(0.65);
    expect(gemVisualScale(100)).toBeCloseTo(gemVisualScale(12));
  });
});
