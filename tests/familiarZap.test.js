import { describe, it, expect } from 'vitest';
import { familiarZapDamage } from '../src/game/Effects.js';
import { FAMILIAR_BOSS_DAMAGE_MULT } from '../src/game/constants.js';

describe('familiarZapDamage', () => {
  const player = {
    computeDamageForEnemy: (enemy) => {
      let dmg = 20;
      if (enemy?.isBoss) dmg *= 1.15;
      return dmg;
    },
  };

  it('one-shots normal trash', () => {
    expect(familiarZapDamage({ hp: 12, alive: true }, player)).toBe(13);
  });

  it('chips Zonk Lords instead of one-shotting', () => {
    const boss = { hp: 700, maxHp: 700, isBoss: true, alive: true };
    const dmg = familiarZapDamage(boss, player);
    expect(dmg).toBe(Math.round(20 * 1.15 * FAMILIAR_BOSS_DAMAGE_MULT));
    expect(dmg).toBeLessThan(boss.hp);
  });

  it('still one-shots mesa guardians', () => {
    const guardian = { hp: 1, isBoss: true, isMesaGuardian: true };
    expect(familiarZapDamage(guardian, player)).toBe(2);
  });
});
