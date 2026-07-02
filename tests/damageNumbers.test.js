import { describe, expect, it } from 'vitest';
import { resolveDamageNumberKind } from '../src/game/Particles.js';

describe('resolveDamageNumberKind', () => {
  it('color-codes elemental hits', () => {
    expect(resolveDamageNumberKind({ element: 'fire' })).toBe('fire');
    expect(resolveDamageNumberKind({ element: 'ice' })).toBe('ice');
    expect(resolveDamageNumberKind({ element: 'lightning' })).toBe('lightning');
  });

  it('combines crit with element tints', () => {
    expect(resolveDamageNumberKind({ isCrit: true, element: 'fire' })).toBe('crit-fire');
    expect(resolveDamageNumberKind({ isCrit: true, element: 'ice' })).toBe('crit-ice');
    expect(resolveDamageNumberKind({ isCrit: true, element: 'lightning' })).toBe('crit-lightning');
    expect(resolveDamageNumberKind({ isCrit: true })).toBe('crit');
  });

  it('resolves special sources', () => {
    expect(resolveDamageNumberKind({ source: 'bonk', isCrit: true })).toBe('bonk');
    expect(resolveDamageNumberKind({ source: 'thorn' })).toBe('thorn');
  });

  it('defaults to neutral physical hits', () => {
    expect(resolveDamageNumberKind({})).toBe('hit');
  });
});
