import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES, GRUNT_COLORS, QUESTS, SKILL_TREE, SKILL_BRANCHES } from '../src/game/gameData.ts';

describe('gameData', () => {
  it('loads enemy types from JSON', () => {
    expect(ENEMY_TYPES.grunt).toBeDefined();
    expect(ENEMY_TYPES.grunt.color).toBeGreaterThan(0);
    expect(ENEMY_TYPES.runner.speed).toBeGreaterThan(0);
  });

  it('loads grunt color palette', () => {
    expect(GRUNT_COLORS.length).toBeGreaterThan(5);
    expect(GRUNT_COLORS.every((c) => typeof c === 'number')).toBe(true);
  });

  it('loads quests from JSON', () => {
    expect(QUESTS.length).toBeGreaterThan(50);
    expect(QUESTS[0].type).toBeTruthy();
  });

  it('loads skill tree from JSON', () => {
    expect(SKILL_BRANCHES.length).toBe(3);
    expect(SKILL_TREE.length).toBe(30);
    expect(SKILL_TREE[0].perLevel).toBeDefined();
  });
});
