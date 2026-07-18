import { describe, it, expect } from 'vitest';
import { hydrateSave, DEFAULT_SAVE } from '../src/game/SaveData.js';

describe('hydrateSave', () => {
  it('merges partial save with defaults', () => {
    const data = hydrateSave({ zonkCoins: 42 });
    expect(data.zonkCoins).toBe(42);
    expect(data.selectedCharacter).toBe(DEFAULT_SAVE.selectedCharacter);
    expect(data.settings.difficulty).toBe(DEFAULT_SAVE.settings.difficulty);
  });

  it('migrates legacy shop levels into skillLevels', () => {
    const data = hydrateSave({
      shopLevels: { meta_speed: 4 },
      skillLevels: {},
    });
    expect(data.skillLevels.quickstep).toBe(4);
  });

  it('keeps playable character selection', () => {
    const data = hydrateSave({ selectedCharacter: 'knight' });
    expect(data.selectedCharacter).toBe('knight');
  });

  it('falls back to default character when not playable', () => {
    const data = hydrateSave({ selectedCharacter: 'invalid_char' });
    expect(data.selectedCharacter).toBe('fox');
  });

  it('merges new save fields from defaults', () => {
    const data = hydrateSave({ zonkCoins: 10 });
    expect(data.unlockedAchievements).toEqual([]);
    expect(data.tutorialComplete).toBe(false);
    expect(data.dailyChallengeCompleted).toBe(false);
  });

  it('migrates 0.2.2 saves to discover burger quests', () => {
    const data = hydrateSave({
      saveVersion: '0.2.2',
      discoveredQuests: ['kill_50'],
    });
    expect(data.saveVersion).toBe('0.2.4');
    expect(data.discoveredQuests).toEqual(expect.arrayContaining([
      'burgers_1', 'burgers_3', 'gobbles_10', 'gobbles_25',
    ]));
    expect(data.recentRuns).toEqual([]);
    expect(data.bestKills).toBe(0);
  });
});
