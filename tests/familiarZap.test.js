import { describe, it, expect } from 'vitest';
import { familiarZapDamage } from '../src/game/Effects.js';
import { FAMILIAR_ZAP_DAMAGE_MULT } from '../src/game/constants.js';

describe('familiarZapDamage', () => {
  const player = {
    computeDamageForEnemy: (enemy) => {
      let dmg = 20;
      if (enemy?.isBoss) dmg *= 1.15;
      return dmg;
    },
  };

  it('scales zap damage off player damage for trash', () => {
    const grunt = { hp: 40, alive: true };
    const dmg = familiarZapDamage(grunt, player);
    expect(dmg).toBe(Math.round(20 * FAMILIAR_ZAP_DAMAGE_MULT));
    expect(dmg).toBeLessThan(grunt.hp);
  });

  it('applies boss damage bonuses for Zonk Lords', () => {
    const boss = { hp: 700, maxHp: 700, isBoss: true, alive: true };
    const dmg = familiarZapDamage(boss, player);
    expect(dmg).toBe(Math.round(20 * 1.15 * FAMILIAR_ZAP_DAMAGE_MULT));
    expect(dmg).toBeLessThan(boss.hp);
  });

  it('falls back to enemy hp when player is missing', () => {
    expect(familiarZapDamage({ hp: 12 }, null)).toBe(12);
  });
});
