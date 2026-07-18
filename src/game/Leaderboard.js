/** Personal run history — local device only (no backend). */

export const MAX_RECENT_RUNS = 20;

/** @typedef {{
 *   time: number,
 *   kills: number,
 *   level: number,
 *   bosses?: number,
 *   maxCombo?: number,
 *   biome?: string,
 *   character?: string,
 *   coins?: number,
 *   at?: number,
 * }} RunRecord
 */

/** @param {number} seconds */
export function formatRunTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Append a run to recent history and update bests.
 * @param {{ recentRuns?: RunRecord[], bestKills?: number }} save
 * @param {RunRecord} run
 */
export function recordRun(save, run) {
  const entry = { ...run, at: run.at ?? Date.now() };
  const recentRuns = [entry, ...(save.recentRuns ?? [])].slice(0, MAX_RECENT_RUNS);
  const bestKills = Math.max(save.bestKills ?? 0, entry.kills);
  return { recentRuns, bestKills };
}

/**
 * Runs sorted by survival time (longest first).
 * @param {RunRecord[]} runs
 */
export function sortRunsByTime(runs) {
  return [...runs].sort((a, b) => b.time - a.time || b.kills - a.kills);
}

/**
 * Runs sorted by kills (highest first).
 * @param {RunRecord[]} runs
 */
export function sortRunsByKills(runs) {
  return [...runs].sort((a, b) => b.kills - a.kills || b.time - a.time);
}
