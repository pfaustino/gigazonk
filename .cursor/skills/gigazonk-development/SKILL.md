---
name: gigazonk-development
description: >-
  GigaZonk architecture and conventions. Horde survival roguelike with Vite,
  Three.js, village meta, achievements, tutorial, daily challenge, instanced
  enemies. Use when editing GigaZonk, arena biomes, save/meta, UI, or balance.
---

# GigaZonk Development

## Stack

- Vite 8, Three.js, vanilla JS (prefer TS for new data modules)
- Entry: `src/main.js` → `src/game/Game.js`
- Balance: `constants.js`, `data/*.json`, `UpgradeOffers.js`, `SkillTree.js`
- Save: `SaveData.js` → `localStorage` key `gigazonk_save`

## Module map

| Module | Responsibility |
|--------|----------------|
| `Game.js` | State machine; lazy `_ensureCombatManagers()` |
| `CombatController.js` | Hits, procs, auto-fire |
| `EnemyManager.js` | InstancedMesh horde, biome spawn weights |
| `InstancedRockField.js` | Arena rock instancing |
| `AchievementSystem.js` | Meta achievements (`data/achievements.json`) |
| `DailyChallenge.js` | Daily survive goal + coin bonus |
| `Tutorial.js` | First-run tutorial steps |
| `TouchControls.js` | Mobile overlay → `Input.js` |
| `ui/RunSummaryScreen.js` | End-of-run summary |
| `ui/TutorialOverlay.js` | In-arena tutorial card |
| `SaveData.js` | Meta + `runSnapshot`; bump `GAME_VERSION` on schema change |

Full diagram: `ARCHITECTURE.md`.

## Game states

`title` → character select → `village` or `arena` → death (run summary) → village/title.

Run can pause to village via menu; resume from arena portal (`RunSnapshot.js`).

## Performance

- No per-enemy `Mesh` in spawn hot paths — `InstancedMesh` + pools
- Combat managers created on first arena/village enter, not at title boot
- Profile at 300+ enemies before changing `MAX_ENEMIES` or shadow settings

## Conventions

- All four characters playable; `isCharacterPlayable(id)` requires known `CHARACTERS` entry
- Biome friction in `BIOMES`; weighted enemies via `EnemyManager.setBiome()`
- Village rep unlocks: `VILLAGE_LANDMARKS`, `VILLAGE_NPCS` (`minRep`)
- Synergy nova: fire + ice + lightning

## Adding features

1. `data/` or `constants.js`
2. Manager or `ui/*.js` module
3. Wire in `Game.js` / `UI.js` (thin)
4. Save migration if meta changes
5. E2e helper if new player-visible flow
6. `ARCHITECTURE.md` + wiki sync if structural

## Dev hooks (Vite dev / `?dev=1`)

| Hook | Use |
|------|-----|
| `window.__gigazonkGame` | Arena/village actions, UI smoke from e2e |
| `window.__gigazonkErrors.exportJson()` | Structured error export |
| `window.PLAYWRIGHT_THREE.scene` | Scene asserts via `playwrightThree.ts` |
| `#dev-panel` | Skip time, spawn boss, force level-up |

URL flags: `?dev=1`, `?seed=42`, `?biome=frost`, `?coins=500` — see `DEV.md`.

## Verification gates

| Stage | Command | When |
|-------|---------|------|
| 1 | `npm run check` | Any code change |
| 2 | `npm run test:e2e:headed` or `:ui` | UI / menus / HUD |
| 3 | `npm run test:e2e` | Pre-PR |
| 4 | `npm run test:e2e:cross` | UI/e2e/CSS changes |

Helpers: `e2e/helpers/gameFlow.ts`, `gameReady.ts`, `navigation.ts`.

**E2e covers:** title, arena HUD, village, dev level-up, daily label, skill tree, quest board, arena pause/resume.

## Play locally

```powershell
npm run dev
# http://localhost:5173  — or ?dev=1&coins=500 for fast meta testing
```

Pages build behavior: `npm run build && npm run preview` (base `/gigazonk/`).

## Ship

See `.cursor/skills/gigazonk-ship/SKILL.md` for PR, wiki sync, and deploy.
