import { describe, expect, it } from 'vitest';
import { CHARACTERS, PLAYER_BASE } from '../src/game/constants.js';
import { applySkillBonusesToPlayer } from '../src/game/SkillTree.js';

function mockPlayer() {
  return {
    hp: 0,
    level: 1,
    _skillXpMult: 0,
  };
}

describe('CHARACTERS', () => {
  it('gives each playable character a distinct perk kit', () => {
    for (const char of CHARACTERS.filter((c) => c.playable !== false)) {
      expect(char.perks?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('applies fox evasion and faster dodge', () => {
    const fox = CHARACTERS.find((c) => c.id === 'fox');
    const player = mockPlayer();
    applySkillBonusesToPlayer(player, fox.mods, {});
    expect(player.evasion).toBeCloseTo(0.12);
    expect(player.dodgeCooldownMult).toBeCloseTo(0.75);
    expect(player.speed).toBeCloseTo(PLAYER_BASE.speed * 1.2);
  });

  it('applies knight thorns and armor', () => {
    const knight = CHARACTERS.find((c) => c.id === 'knight');
    const player = mockPlayer();
    applySkillBonusesToPlayer(player, knight.mods, {});
    expect(player.thorns).toBe(8);
    expect(player.armor).toBeCloseTo(0.15);
    expect(player.maxHp).toBeCloseTo(PLAYER_BASE.maxHp * 1.35);
  });

  it('applies mage lightning fork and crit', () => {
    const mage = CHARACTERS.find((c) => c.id === 'mage');
    const player = mockPlayer();
    applySkillBonusesToPlayer(player, mage.mods, {});
    expect(player.lightningChains).toBe(4);
    expect(player.critChance).toBeCloseTo(PLAYER_BASE.critChance + 0.1);
  });

  it('applies berserker combo, lifesteal, and hurt speed', () => {
    const berserker = CHARACTERS.find((c) => c.id === 'berserker');
    const player = mockPlayer();
    applySkillBonusesToPlayer(player, berserker.mods, {});
    expect(player.comboMultBonus).toBe(2);
    expect(player.lifesteal).toBeCloseTo(0.05);
    expect(player.hurtSpeedBurst).toBeCloseTo(0.2);
  });
});
