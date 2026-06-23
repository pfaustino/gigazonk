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

## Commands

- `npm run dev` — development
- `npm run build` — verify before suggesting merge

## Do not

- Add per-enemy Mesh in spawn hot paths
- Change save schema without migration
- Commit unless user requests
