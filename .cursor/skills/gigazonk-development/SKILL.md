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
- Balance: `src/game/constants.js`, `Awards.js`, `SkillTree.js`, `UpgradeSystem.js`
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
4. Update README differentiators table if player-visible
5. Save migration if meta progression changes

## Dev tooling (target)

`DEV.md` cheat keys; `?dev=1` panel — not yet fully implemented; add via `src/dev/` when building test tools.

## Deploy

- Live: GitHub Pages `/gigazonk/` base in production build
- `npm run build:itch` for relative paths
- `npm run deploy` manual gh-pages
