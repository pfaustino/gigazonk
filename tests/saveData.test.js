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

  it('falls back to default character when not playable', () => {
    const data = hydrateSave({ selectedCharacter: 'knight' });
    expect(data.selectedCharacter).toBe('fox');
  });
});
