import { describe, it, expect } from 'vitest';
import {
  applyRunModifiers,
  rollRunModifierOffers,
  formatRunModifiersToast,
  RUN_BOONS,
  RUN_CURSES,
} from '../src/game/RunModifiers.js';

describe('RunModifiers', () => {
  it('rolls unique boon and curse offers', () => {
    const { boons, curses } = rollRunModifierOffers(3, 3);
    expect(boons).toHaveLength(3);
    expect(curses).toHaveLength(3);
    expect(new Set(boons.map((b) => b.id)).size).toBe(3);
    expect(new Set(curses.map((c) => c.id)).size).toBe(3);
  });

  it('applies boon and curse to player and game', () => {
    const player = {
      maxHp: 100,
      hp: 100,
      speed: 10,
      damage: 20,
      attackRate: 1,
      coinMult: 1,
      pickupRadius: 3,
      magnetRadius: 0,
      runXpMult: 0,
    };
    const game = {};
    const boon = RUN_BOONS[0];
    const curse = RUN_CURSES.find((c) => c.id === 'swarm');

    applyRunModifiers(player, game, { boonId: boon.id, curseId: curse.id });

    expect(player.maxHp).toBe(120);
    expect(game.runModifierEnemyHpMult).toBeCloseTo(1.2);
  });

  it('formats active contract toast', () => {
    const text = formatRunModifiersToast({ boonId: 'iron_will', curseId: 'panic' });
    expect(text).toContain('Iron Will');
    expect(text).toContain('Panic');
  });
});
