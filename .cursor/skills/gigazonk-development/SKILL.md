---
name: gigazonk-development
description: >-
  GigaZonk-specific architecture and conventions. Horde survival roguelike with
  Vite, Three.js, village meta loop, instanced enemies. Use when editing GigaZonk,
  gigazonk, Zonka Village, arena biomes, or Megabonk-style features.
---

# GigaZonk Development

## Stack

- Vite 8, Three.js, vanilla JS (tsconfig present — prefer TS for new data modules)
- Entry: `src/main.js` → `src/game/Game.js`
- Balance: `src/game/constants.js`, `UpgradeOffers.js`, `upgradeStatSchema.js`, `SkillTree.js`, `UpgradeSystem.js`
- Save: `SaveData.js` key `gigazonk_save` with migrations

## Module map

| Module | Responsibility |
|--------|----------------|
| `Game.js` | State machine: title / village / arena; loop wiring |
| `Player.js` | Movement, combat stats, dodge, magnet |
| `EnemyManager.js` | InstancedMesh horde, spawn, despawn, spatial hash |
| `ProjectileManager.js` | Auto-fire, pierce, elements |
| `UpgradeSystem.js` | Run upgrades + preview math |
| `UI.js` | DOM overlays — split new panels here cautiously |
| `Arena.js` / `Village.js` | Mode-specific scene setup |
| `TerrainFeatures.js` / `TerrainVisuals.js` | Biome terrain |
| `SaveData.js` | Meta progression, skill tree, characters |

## Game states

`title` → `village` → `arena` → death → village. Quick arena skips village.

## Performance constraints

- `MAX_ENEMIES` / instancing — don't add per-enemy Mesh without profiling
- `ENEMY_NEAR_RADIUS` / despawn batching — respect when changing arena size
- Shadow map + instancing — test at 300+ enemies before merging

## Conventions

- Biomes: `BIOMES` in constants; arena randomizes per run
- Characters: unlock via `zonkCoins`; check `isCharacterPlayable`
- Synergy nova: Fire + Ice + Lightning elements
- Procedural audio in `Audio.js` — prefer synth for SFX tweaks

## When adding features

1. Constants or `data/` first
2. Manager class second
3. Wire in `Game.js` last (minimal diff)
4. Update README differentiators and `docs/itch-description.md` if player-visible (do not document `?dev=1` in itch copy — easter egg only)
5. Save migration if meta progression changes
6. Run wiki sync after `ARCHITECTURE.md` changes

## IDE setup

After clone: `npm run setup:extensions` + `npm run setup:mcp`. Extensions in `.vscode/extensions.json`; MCP regenerates `.cursor/mcp.json` (playwright, context7, chrome-devtools, vite-mcp). Three.js e2e: `window.PLAYWRIGHT_THREE.scene` in dev; import from `e2e/helpers/playwrightThree.ts`.

## Verification (layered gates)

Same order as CI; use **headed/ui** while iterating on UI:

| Stage | Command | When |
|-------|---------|------|
| 1 | `npm run check` | Any non-docs code change |
| 2 | `npm run test:e2e:headed` or `:ui` | UI, menus, HUD, navigation |
| 3 | `npm run test:e2e` | Pre-PR; headless CI parity |
| 4 | `npm run test:e2e:cross` | Clicks, keyboard nav, CSS; before PR on UI/e2e |
| — | `npm run test` | Fast loop on `tests/` only |

- Helpers: `e2e/helpers/gameFlow.ts`, `navigation.ts`, `gameReady.ts` — extend before new duplicated steps; wait on `data-game-ready`.
- Boot readiness: `src/lib/gameReady.js` (`title`, `arena-hud`, `village`); lazy `_ensureVillage()` / `_ensureArena()` in `Game.js`.
- CI cross-browser: Xvfb + headed Firefox/WebKit (WebGL on Linux). See `.cursor/rules/browser-game-testing.mdc`.
- Player-visible bug or new flow → add spec + run stage 2.
- Green smoke ≠ full game QA (shop, skill tree, save/resume mid-run not in e2e yet).
- Details: `.cursor/rules/browser-game-testing.mdc`.

## Dev tooling

`?dev=1` panel (`src/dev/DevPanel.js`, `src/dev/DevBuffPicker.js`): pauses arena on open, time skips, spawn horde/boss, **Buffs** catalog (stack upgrades / remove all), god mode, biome override, error export. Wired in Vite dev and via URL flag on live builds. Player-facing docs tease this as a hidden easter egg without revealing the flag.

## Publishing copy

itch.io long/short description source of truth: `docs/itch-description.md`. After edits: `npm run update:itch-description` (copies to clipboard + opens edit page). Butler deploy does not update page text.

## Deploy (dual host — always both)

**Publish = Pages + itch.io.** Never report ship complete without both.

| Host | Live URL | CI workflow | Build |
|------|----------|-------------|-------|
| GitHub Pages | [pfaustino.github.io/gigazonk](https://pfaustino.github.io/gigazonk/) | `deploy-pages.yml` | `npm run build` (`base: '/gigazonk/'`) |
| itch.io | [pfaustino.itch.io/gigazonk](https://pfaustino.itch.io/gigazonk) | `deploy-itch.yml` | `npm run build:itch` (`base: './'`) |

Post-merge agent checklist:

1. `gh pr merge …` (or confirm merge)
2. Wait for / verify **both** deploy workflows on `main`
3. Reply with **both** play links

Local gates: `npm run check:itch` before itch-related changes. Never commit `BUTLER_API_KEY`. Manual re-push: Actions → **Deploy to itch.io**. ADR 0005.
