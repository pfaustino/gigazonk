import { describe, it, expect } from 'vitest';
import { formatObjectiveCountdown } from '../src/game/ui/CrazyObjectiveArrow.js';

describe('objective arrow helpers', () => {
  it('formats countdown as m:ss', () => {
    expect(formatObjectiveCountdown(185)).toBe('3:05');
    expect(formatObjectiveCountdown(0.2)).toBe('0:01');
    expect(formatObjectiveCountdown(30)).toBe('0:30');
  });
});
