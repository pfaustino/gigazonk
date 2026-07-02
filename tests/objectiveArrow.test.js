import { describe, it, expect } from 'vitest';
import { formatObjectiveCountdown, formatObjectiveDistanceLabel } from '../src/game/ui/CrazyObjectiveArrow.js';
import { objectiveArrowYaw } from '../src/game/ObjectiveArrow3D.js';

describe('objective arrow helpers', () => {
  it('formats countdown as m:ss', () => {
    expect(formatObjectiveCountdown(185)).toBe('3:05');
    expect(formatObjectiveCountdown(0.2)).toBe('0:01');
    expect(formatObjectiveCountdown(30)).toBe('0:30');
  });

  it('labels objective distance by target type', () => {
    expect(formatObjectiveDistanceLabel('citizen', 114.4)).toBe('Rescue 114m');
    expect(formatObjectiveDistanceLabel('burger', 88.6)).toBe('Gobble Burger 89m');
  });

  it('yaws flat arrow tip toward target on XZ', () => {
    expect(objectiveArrowYaw(0, -10)).toBeCloseTo(0);
    expect(objectiveArrowYaw(10, 0)).toBeCloseTo(-Math.PI / 2);
    expect(objectiveArrowYaw(0, 10)).toBeCloseTo(-Math.PI);
  });
});
