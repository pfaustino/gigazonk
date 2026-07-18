/** Shared Vercel leaderboards service (see github.com/pfaustino/leaderboards). */

export const LEADERBOARD_GAME_ID = 'gigazonk';

/** Set at build time, or defaults to production API host. */
export const LEADERBOARD_API = (
  import.meta.env.VITE_LEADERBOARD_API || 'https://leaderboards-opal.vercel.app'
).replace(/\/$/, '');

/** Build-time write key (visible in client bundle — deters casual spam only). */
export const LEADERBOARD_WRITE_KEY = import.meta.env.VITE_LEADERBOARD_WRITE_KEY ?? '';

export function isGlobalLeaderboardConfigured() {
  return Boolean(LEADERBOARD_WRITE_KEY);
}

/**
 * @returns {Promise<{ ok: true, rows: Array<{ player: string, value: number, meta: object | null }> } | { ok: false, error: string }>}
 */
export async function fetchGlobalLeaderboard(limit = 50) {
  if (!LEADERBOARD_API) {
    return { ok: false, error: 'Global leaderboard URL not configured' };
  }
  try {
    const url = `${LEADERBOARD_API}/api/leaderboard?game=${LEADERBOARD_GAME_ID}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: `Server returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, rows: data.rows ?? [] };
  } catch {
    return { ok: false, error: 'Could not reach leaderboard server' };
  }
}

/**
 * @param {{ player: string, value: number, meta?: Record<string, unknown> }} payload
 */
export async function submitGlobalScore(payload) {
  if (!isGlobalLeaderboardConfigured()) return { ok: false, error: 'not configured' };
  try {
    const res = await fetch(`${LEADERBOARD_API}/api/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Game-Key': LEADERBOARD_WRITE_KEY,
      },
      body: JSON.stringify({
        game: LEADERBOARD_GAME_ID,
        player: payload.player,
        value: payload.value,
        meta: payload.meta,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'network error' };
  }
}
