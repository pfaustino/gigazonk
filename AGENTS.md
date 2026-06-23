# GigaZonk — Agent Guide

Browser horde survival roguelike: Vite + Three.js, vanilla JS.

## Before coding

1. Read `DEV.md` for test flows.
2. Apply rules in `.cursor/rules/` (auto-loaded).
3. For architecture questions, read `.cursor/skills/gigazonk-development/SKILL.md`.

## Key paths

| Path | Purpose |
|------|---------|
| `src/game/Game.js` | State machine — keep thin |
| `src/game/constants.js` | Balance tables |
| `src/game/SaveData.js` | Persistence + migrations |
| `src/game/EnemyManager.js` | Instanced horde |

## Commands (layered gates)

| Stage | Command |
|-------|---------|
| 1 — Quality | `npm run check` |
| 2 — Show e2e | `npm run test:e2e:headed` or `test:e2e:ui` |
| 3 — CI smoke | `npm run test:e2e` |
| 4 — Cross-browser | `npm run test:e2e:cross` |
| Dev | `npm run dev` |

Full workflow: `.cursor/rules/browser-game-testing.mdc`.

## Do not

- Add per-enemy Mesh in spawn hot paths
- Change save schema without migration
- Commit unless user requests
