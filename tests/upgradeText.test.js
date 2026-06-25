import { describe, expect, it } from 'vitest';
import { buildUpgradeOffer } from '../src/game/UpgradeOffers.js';
import { UPGRADE_TEMPLATES } from '../src/game/gameData.ts';
import { formatElementOfferDesc } from '../src/game/UpgradeText.js';

describe('element upgrade copy', () => {
  it('renamed lightning offer and explains shot pool + chains', () => {
    const template = UPGRADE_TEMPLATES.find((t) => t.id === 'lightning');
    expect(template?.name).toBe('Chain Lightning');
    const offer = buildUpgradeOffer(template, 'legendary');
    expect(offer.name).toBe('Chain Lightning');
    expect(offer.desc).toContain('chain');
    expect(offer.desc).toContain('Tri-Zonk Nova');
  });

  it('describes each element effect', () => {
    expect(formatElementOfferDesc({ element: 'fire' })).toContain('burn');
    expect(formatElementOfferDesc({ element: 'ice' })).toContain('slow');
    expect(formatElementOfferDesc({ element: 'lightning', lightningChains: 2 })).toContain('+2 extra chain');
  });
});
