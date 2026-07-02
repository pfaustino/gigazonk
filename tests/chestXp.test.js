import { describe, it, expect } from 'vitest';
import { CHEST_GUARANTEED_XP, MESA_CACHE_GUARANTEED_XP } from '../src/game/constants.js';
import { mergeChestXpPreview } from '../src/game/UpgradeSystem.js';

describe('chest guaranteed XP', () => {
  it('tunes flat XP per chest type', () => {
    expect(CHEST_GUARANTEED_XP).toBeGreaterThan(0);
    expect(MESA_CACHE_GUARANTEED_XP).toBeGreaterThan(CHEST_GUARANTEED_XP);
  });

  it('merges guaranteed XP into reward preview', () => {
    const preview = [{ label: 'HP', before: '50', after: '75' }];
    const merged = mergeChestXpPreview(preview, 12, 22);
    expect(merged.find((line) => line.label === 'XP')).toEqual({
      label: 'XP',
      before: '12',
      after: '22',
    });
  });

  it('updates an existing XP preview line', () => {
    const preview = [{ label: 'XP', before: '0', after: '13' }];
    const merged = mergeChestXpPreview(preview, 0, 23);
    expect(merged[0]).toEqual({ label: 'XP', before: '0', after: '23' });
  });
});
