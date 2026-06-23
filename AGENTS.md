# GigaZonk — Agent Guide

Browser horde survival roguelike: Vite + Three.js, vanilla JS.

## Before coding

1. Read `DEV.md` for test flows.
2. Follow `.cursor/rules/agent-workflow.mdc` (PLAN → EXECUTE → VERIFY → EMIT).
3. Architecture: `.cursor/skills/gigazonk-development/SKILL.md`.
4. Commit/PR/release: `.cursor/skills/gigazonk-ship/SKILL.md`.

## Key paths

| Path | Purpose |
|------|---------|
| `src/game/Game.js` | State machine — keep thin |
| `src/game/constants.js` | Balance tables |
| `src/game/SaveData.js` | Persistence + migrations |
| `src/game/EnemyManager.js` | Instanced horde |
| `src/game/AchievementSystem.js` | Meta achievements |
| `src/game/ui/RunSummaryScreen.js` | Death / run summary UI |

## Commands (layered gates)

| Stage | Command |
|-------|---------|
| Setup | `npm run setup:extensions`, `npm run setup:mcp` |
| 1 — Quality | `npm run check` |
| 2 — Show e2e | `npm run test:e2e:headed` or `test:e2e:ui` |
| 3 — CI smoke | `npm run test:e2e` |
| 4 — Cross-browser | `npm run test:e2e:cross` |
| Dev | `npm run dev` → http://localhost:5173 |

Full workflow: `.cursor/rules/browser-game-testing.mdc`.

## Do not

- Add per-enemy Mesh in spawn hot paths
- Change save schema without migration + `GAME_VERSION` bump
- Commit unless user requests
- Edit GitHub Wiki UI (sync from `ARCHITECTURE.md` instead)
