import { describe, expect, it } from 'vitest';
import {
  formatRunTime,
  recordRun,
  sortRunsByKills,
  sortRunsByTime,
  MAX_RECENT_RUNS,
} from '../src/game/Leaderboard.js';
import { hydrateSave } from '../src/game/SaveData.js';

describe('Leaderboard', () => {
  it('formats survival time as m:ss', () => {
    expect(formatRunTime(0)).toBe('0:00');
    expect(formatRunTime(65)).toBe('1:05');
    expect(formatRunTime(600)).toBe('10:00');
  });

  it('prepends runs and caps history', () => {
    const save = { recentRuns: [], bestKills: 0 };
    let next = recordRun(save, { time: 30, kills: 10, level: 3 });
    expect(next.recentRuns).toHaveLength(1);
    expect(next.recentRuns[0].kills).toBe(10);
    expect(next.bestKills).toBe(10);

    next = recordRun({ ...save, ...next }, { time: 60, kills: 5, level: 5 });
    expect(next.recentRuns[0].time).toBe(60);
    expect(next.bestKills).toBe(10);

    const full = { recentRuns: [], bestKills: 0 };
    for (let i = 0; i < MAX_RECENT_RUNS + 5; i++) {
      Object.assign(full, recordRun(full, { time: i, kills: i, level: 1 }));
    }
    expect(full.recentRuns).toHaveLength(MAX_RECENT_RUNS);
    expect(full.recentRuns[0].time).toBe(MAX_RECENT_RUNS + 4);
  });

  it('sorts by time then kills', () => {
    const runs = [
      { time: 30, kills: 50, level: 1 },
      { time: 90, kills: 10, level: 1 },
      { time: 90, kills: 20, level: 1 },
    ];
    expect(sortRunsByTime(runs).map((r) => r.kills)).toEqual([20, 10, 50]);
    expect(sortRunsByKills(runs).map((r) => r.time)).toEqual([30, 90, 90]);
  });

  it('hydrates leaderboard fields on old saves', () => {
    const data = hydrateSave({ saveVersion: '0.2.3', bestTime: 120 });
    expect(data.recentRuns).toEqual([]);
    expect(data.bestKills).toBe(0);
    expect(data.saveVersion).toBe('0.2.4');
  });
});
