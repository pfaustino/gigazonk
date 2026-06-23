import { describe, it, expect } from 'vitest';
import { migrateSkillLevels, getSkillById, getSkillUpgradeCost } from '../src/game/SkillTree.js';

describe('migrateSkillLevels', () => {
  it('maps legacy shopLevels to skill ids', () => {
    const levels = migrateSkillLevels({
      shopLevels: { meta_damage: 3, meta_hp: 2 },
      skillLevels: {},
    });
    expect(levels.raw_power).toBe(3);
    expect(levels.thick_skin).toBe(2);
  });

  it('keeps higher skill level when both legacy and new exist', () => {
    const levels = migrateSkillLevels({
      shopLevels: { meta_damage: 2 },
      skillLevels: { raw_power: 5 },
    });
    expect(levels.raw_power).toBe(5);
  });
});

describe('getSkillUpgradeCost', () => {
  it('returns scaled cost for skill level', () => {
    const skill = getSkillById('raw_power');
    expect(skill).toBeTruthy();
    expect(getSkillUpgradeCost(skill, 0)).toBe(skill.baseCost);
    expect(getSkillUpgradeCost(skill, 1)).toBe(skill.baseCost + skill.costStep);
  });
});
