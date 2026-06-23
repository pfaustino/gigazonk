# GigaZonk — Reliability & Debugging

## Status

### Tier 1

| Area | Status |
|------|--------|
| Save load | `ErrorReporter` + toast on corrupt save |
| Global handlers | `main.js` — `error` + `unhandledrejection` |
| Lint / test / build | `npm run check` — ESLint, tsc, Vitest, Vite build |
| CI | GitHub Actions runs `npm run check` before deploy |
| Error context | `ErrorReporter` ring buffer + `getErrorContext()` |
| Dev repro | Dev panel (`npm run dev` or `?dev=1`), `runSeed`, URL flags |
| Assertions | `src/lib/assert.ts` — pool bounds, upgrade apply |

### Tier 2

| Area | Status |
|------|--------|
| Seeded RNG | `RunRng` + `runRandom()` for arena combat / loot / quests |
| Snapshot RNG | `runSeed` + `rngState` in run snapshot restore |
| Data JSON | `data/enemies.json`, `data/upgrades.json` via `gameData.ts` |
| TypeScript lib | `src/lib/*.ts` — errors, assert, RNG, dev flags |
| vite-mcp | Dev server MCP at `http://localhost:5173/__mcp` (console + localStorage) |
| chrome-devtools-mcp | Chrome console (source maps), network, perf traces (`.cursor/mcp.json`) |
| Cross-browser e2e | `npm run test:e2e:cross` — Playwright firefox + webkit |
| Error bridge | `window.__gigazonkErrors` in dev for agents / Playwright |
| Tests | `runRng.test.ts`, `gameData.test.ts`, save + skill tree |

`Math.random` remains for session-static visuals (arena rock scatter, village props, audio noise) — not run-deterministic.

## Still open

| Area | Target |
|------|--------|
| Full TS migration | Game modules beyond `lib/` and `gameData.ts` |
| vite-mcp + Vite 8 | Installed with `--legacy-peer-deps` until peer range updated |

## JPL-inspired practices for this repo

1. Split `Game.js` / `UI.js` below ~400 lines per mode/panel.
2. Pool allocations — projectiles/gems already pooled; extend pattern.
3. Document loop bounds next to `MAX_*` constants in `constants.js`.
4. Peer review checklist before merge (skill `reliable-software-quality`).

## Debug workflow

1. Reproduce with `?seed=42` or dev panel (seed + RNG state).
2. Dev panel → Export errors (clipboard) or `window.__gigazonkErrors.exportJson()`.
3. **Chrome:** chrome-devtools-mcp `list_console_messages` or vite-mcp / cursor-ide-browser CDP.
4. **Firefox/Safari:** `npm run collect-browser-errors` → `test-results/browser-errors-summary.json`.
5. Fix + add Vitest for pure logic regression.

## Error codes

| Code | Meaning |
|------|---------|
| `SAVE_PARSE` | localStorage JSON invalid |
| `SAVE_WRITE` | localStorage write failed |
| `UPGRADE_ROLL` | getRandomChoices failed |
| `UPGRADE_UI` | Level-up modal failed |
| `ASSET_LOAD` | Texture / asset load failed |
| `AUDIO_INIT` | Web Audio context failed |
| `AUDIO_MANIFEST` | Music manifest fetch failed |
| `AUDIO_TRACK` | Music file failed |
| `RUNTIME` | window.onerror |
| `UNHANDLED_REJECTION` | unhandled promise rejection |
