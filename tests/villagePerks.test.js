import { describe, it, expect } from 'vitest';
import {
  getActiveVillagePerks,
  getNextVillagePerk,
  isInVillageClearZone,
} from '../src/game/VillagePerks.js';
import { VILLAGE_BUILDING_SLOTS } from '../src/game/constants.js';

describe('VillagePerks', () => {
  it('unlocks perks by reputation tier', () => {
    expect(getActiveVillagePerks(0)).toHaveLength(0);
    expect(getActiveVillagePerks(10).map((p) => p.id)).toEqual(['well']);
    expect(getActiveVillagePerks(50).map((p) => p.id)).toEqual([
      'well', 'merchant', 'banner', 'shrine',
    ]);
  });

  it('reports next perk milestone', () => {
    expect(getNextVillagePerk(0)?.id).toBe('well');
    expect(getNextVillagePerk(10)?.id).toBe('merchant');
    expect(getNextVillagePerk(100)).toBeNull();
  });

  it('keeps building slots off portal clear zone', () => {
    for (const [x, z] of VILLAGE_BUILDING_SLOTS) {
      expect(isInVillageClearZone(x, z, 2.5)).toBe(false);
    }
    expect(isInVillageClearZone(0, 20, 0)).toBe(true);
  });

  it('applies stacked reputation perks to player and run coins', () => {
    const perks = getActiveVillagePerks(30);
    expect(perks.map((p) => p.id)).toEqual(['well', 'merchant', 'banner']);

    const player = {
      maxHp: 100,
      hp: 100,
      damage: 10,
      pickupRadius: 5,
      bossDamageMult: 0,
      _skillXpMult: 0,
    };
    const game = { runCoins: 0 };

    for (const perk of perks) {
      if (perk.maxHpMult) {
        player.maxHp *= 1 + perk.maxHpMult;
        player.hp = player.maxHp;
      }
      if (perk.pickupMult) player.pickupRadius *= 1 + perk.pickupMult;
      if (perk.runCoins) game.runCoins += perk.runCoins;
    }
    player.damage *= 1.05;

    expect(player.maxHp).toBeCloseTo(108, 5);
    expect(player.pickupRadius).toBeCloseTo(5.6, 5);
    expect(game.runCoins).toBe(25);
    expect(player.damage).toBeCloseTo(10.5, 5);
  });
});
