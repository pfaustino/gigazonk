import { describe, expect, it } from 'vitest';
import { buildUpgradeOffer, scaleEffectForRarity } from '../src/game/UpgradeOffers.js';
import { UPGRADE_TEMPLATES } from '../src/game/gameData.ts';
import {
  UPGRADE_STAT_CAPS,
  isUpgradeTemplateCapped,
} from '../src/game/upgradeStatSchema.js';
import { UpgradeSystem } from '../src/game/UpgradeSystem.js';

describe('upgradeStatSchema', () => {
  it('documents stack caps used by Player.applyUpgrade', () => {
    expect(UPGRADE_STAT_CAPS.projectilePierce).toBe(5);
    expect(UPGRADE_STAT_CAPS.critChance).toBeGreaterThan(0);
  });

  it('detects capped pierce template', () => {
    const template = UPGRADE_TEMPLATES.find((t) => t.id === 'proj_pierce');
    expect(template).toBeDefined();
    const player = { projectilePierce: 5 };
    expect(isUpgradeTemplateCapped(template.id, template.baseEffect, player)).toBe(true);
  });
});

describe('UpgradeOffers', () => {
  it('scales common damage lower than legendary', () => {
    const template = UPGRADE_TEMPLATES.find((t) => t.id === 'gym_sauce');
    expect(template).toBeDefined();
    const common = scaleEffectForRarity(template.baseEffect, 'common', template);
    const legendary = scaleEffectForRarity(template.baseEffect, 'legendary', template);
    expect(common.damageMult).toBeLessThan(legendary.damageMult);
  });

  it('builds offer with template id and rarity suffix', () => {
    const template = UPGRADE_TEMPLATES.find((t) => t.id === 'battery');
    const offer = buildUpgradeOffer(template, 'rare');
    expect(offer.templateId).toBe('battery');
    expect(offer.id).toBe('battery:rare');
    expect(offer.desc).toBeTruthy();
  });

  it('excludes capped upgrades from roll pool', () => {
    const system = new UpgradeSystem();
    const player = {
      elements: new Set(['fire', 'ice', 'lightning']),
      maxAirJumps: 5,
      projectilePierce: 5,
      evasion: 0.75,
      armor: 0.5,
      critChance: UPGRADE_STAT_CAPS.critChance,
      poisonChance: 1,
      explodeChance: 1,
      killDamageBonus: 0.1,
    };
    const choices = system.getRandomChoices(3, player);
    expect(choices.every((c) => !c.effect.element)).toBe(true);
  });
});
