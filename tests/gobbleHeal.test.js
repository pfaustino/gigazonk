import { describe, it, expect } from 'vitest';
import { gobbleHealForType } from '../src/game/constants.js';

describe('gobbleHealForType', () => {
  it('returns default heal for grunts', () => {
    expect(gobbleHealForType('grunt')).toBe(3);
    expect(gobbleHealForType('frostling')).toBe(3);
  });

  it('returns smaller heal for fast weak types', () => {
    expect(gobbleHealForType('runner')).toBe(2);
    expect(gobbleHealForType('wisp')).toBe(2);
  });

  it('returns larger heal for heavy types', () => {
    expect(gobbleHealForType('brute')).toBe(6);
    expect(gobbleHealForType('elite')).toBe(8);
  });
});
