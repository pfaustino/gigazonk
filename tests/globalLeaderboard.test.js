import { describe, expect, it } from 'vitest';
import { isGlobalLeaderboardConfigured, LEADERBOARD_GAME_ID } from '../src/lib/globalLeaderboard.js';

describe('globalLeaderboard', () => {
  it('uses gigazonk game id', () => {
    expect(LEADERBOARD_GAME_ID).toBe('gigazonk');
  });

  it('reflects whether VITE_LEADERBOARD_WRITE_KEY is set', () => {
    const expected = Boolean(import.meta.env.VITE_LEADERBOARD_WRITE_KEY);
    expect(isGlobalLeaderboardConfigured()).toBe(expected);
  });
});
