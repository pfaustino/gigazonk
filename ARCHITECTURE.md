# GigaZonk — Architecture (full scope)

Canonical architecture reference for this repo. Mirrored to the GitHub Wiki (`wiki/` → Wiki tab via CI). Decision history: `docs/adr/`.

## Product summary

Browser horde survival roguelike: village meta loop, procedural arena biomes, instanced enemy hordes, run upgrades, Zonk Rift, meta skill tree. Live: [GitHub Pages `/gigazonk/`](https://pfaustino.github.io/gigazonk/).

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Browser ES modules |
| Render | Three.js r184, WebGL2 |
| Build | Vite 8 |
| Language | JavaScript game modules + TypeScript (`src/lib/`, `gameData.ts`) |
| Test | Vitest (unit), Playwright (e2e) |
| Persist | `localStorage` (`gigazonk_save`) |

## Runtime diagram

```
index.html → main.js
                 ├── lib/errorHandlers (global capture)
                 └── Game.js (orchestrator)
                       ├── Input, CameraController
                       ├── UI.js + GameMenu.js (DOM overlays)
                       ├── Audio.js (procedural + manifest music)
                       ├── SaveData.js (meta + run snapshot)
                       ├── Village.js / Arena.js (scene modes)
                       ├── TerrainFeatures.js / TerrainVisuals.js
                       ├── Player.js
                       ├── EnemyManager.js (InstancedMesh horde)
                       ├── ProjectileManager.js (pooled)
                       ├── GemManager.js (pooled)
                       ├── Interactables.js (chests, shrines, mesa loot)
                       ├── UpgradeSystem.js + Awards.js / gameData.ts
                       ├── QuestSystem.js
                       ├── Effects.js (familiars, rifts, nova, fire trail, domes)
                       ├── ParticleSystem.js
                       ├── CombatController.js
                       ├── RunSnapshot.js
                       ├── UpgradeText.js
                       ├── ui/MenuNavigation.js, TitleScreens.js, HudScreens.js, LevelUpScreen.js
                       └── lib/ RunRng, assert, ErrorReporter, parseDevFlags
```

## Game state machine

| State | Scene | Notes |
|-------|-------|-------|
| `title` | Title UI | Character select → village or arena |
| `village` | `Village.js` | NPCs, shop, skill tree, arena portal |
| `arena` | `Arena.js` | Combat loop, upgrades, bosses, rift |

Flow: `title` → (character select) → `village` or `arena` → death → `village` or title. Run snapshot can resume mid-arena.

## Frame loop (`Game.animate`)

1. `timer.update()` — delta time  
2. Input poll / gamepad  
3. State branch: village update vs arena combat update  
4. Managers: enemies, projectiles, gems, interactables, particles, familiars  
5. `renderer.render(scene, camera)`  
6. UI HUD refresh, audio tick  

Arena combat uses seeded `runRandom()` for loot, spawns, upgrades; static visuals use `Math.random`.

## Module reference

| Module | Responsibility |
|--------|----------------|
| `Game.js` | State machine, loop, snapshots, dev commands; delegates combat to `CombatController` |
| `CombatController.js` | Hit resolution, procs, player auto-fire |
| `RunSnapshot.js` | Mid-arena save capture/restore (player + timers, not battlefield) |
| `UpgradeText.js` | Shared upgrade effect descriptions and format helpers |
| `Player.js` | Movement, stats, dodge, magnet, damage, leveling |
| `EnemyManager.js` | InstancedMesh pool, spawn waves, spatial hash, despawn |
| `ProjectileManager.js` | Auto-fire, pierce, elements, object pool |
| `GemManager.js` | XP gem pool, magnet pickup |
| `Interactables.js` | Field scatter, mesa encounters, loot tables |
| `UpgradeSystem.js` | Run upgrades, preview math, synergy nova |
| `UI.js` | All DOM screens: title, HUD, level-up, shop, quests |
| `GameMenu.js` | Pause / settings overlay |
| `SaveData.js` | Schema version, migrations, `runSnapshot` |
| `Arena.js` | Ground, biomes, rocks, mesa generation |
| `Village.js` | Hub scene props |
| `TerrainFeatures.js` | Mesas, ramps, height queries, loot clearance |
| `TerrainVisuals.js` | Biome textures, ground shader |
| `QuestSystem.js` | Meta quest progress and rewards |
| `Effects.js` | Familiar, Zonk Rift, synergy nova, fire trail, Zonk Dome |
| `Particles.js` | Damage numbers, burst particles |
| `Audio.js` | Web Audio synth SFX + streamed music manifest |
| `CameraController.js` | Follow, shake, settings |
| `constants.js` | Balance caps, `MAX_*`, biome table |
| `gameData.ts` | JSON enemies/upgrades |
| `SkillTree.js` | Meta skill nodes |
| `EntityVisuals.js` | Player/enemy mesh builders |

## Data flow

```
data/enemies.json, data/upgrades.json, data/quests.json, data/skills.json
        ↓
gameData.ts → constants.js / Awards.js / SkillTree.js
        ↓
EnemyManager, UpgradeSystem, Interactables

SaveData ←→ localStorage gigazonk_save
  ├── meta: coins, skills, characters, settings
  └── runSnapshot: player, elapsed, runSeed, rngState, managers state

URL flags (?seed, ?dev, ?biome) → parseDevFlags.ts → Game init
```

## Performance design

- `MAX_ENEMIES` / `InstancedMesh` — no per-enemy `Mesh` in hot path  
- `ENEMY_SOFT_CAP`, batch despawn, `ENEMY_NEAR_RADIUS`  
- Pooled projectiles and gems — **swap-remove** on death keeps update loops O(active)  
- `ObstacleGrid` broadphase for arena collision / projectile blocking (~700 obstacles)  
- Enemy spatial hash uses numeric cell keys and reused cell arrays (no per-frame string keys)  
- Shadow map tuned for horde scale  

### Phase B (performance) — implemented

| Optimization | Module |
|--------------|--------|
| Compact projectile/gem arrays | `ProjectileManager`, `GemManager` |
| Obstacle spatial index | `ObstacleGrid.js`, `Arena.js` |
| Enemy grid numeric keys + buffer reuse | `EnemyManager.js` |
| Mesa height spatial index | `MesaHeightIndex.js`, `Arena.js`, `TerrainFeatures.js` |
| Particle burst pooling + HP bar throttling | `Particles.js` |
| Instanced mesh dirty batching | `EnemyManager.js`, `ProjectileManager.js` |

## Build & deploy

| Command | Output |
|---------|--------|
| `npm run dev` | Vite `:5173`, vite-mcp dev |
| `npm run build` | `dist/` base `/gigazonk/` |
| `npm run build:itch` | Relative base (`./`) for itch.io |
| `npm run check:itch` | lint + tsc + vitest + itch build (CI itch deploy gate) |
| `npm run check` | lint + tsc + vitest + Pages build |
| `npm run test:e2e` | Playwright smoke |

CI: `.github/workflows/ci.yml` — `quality`, `e2e`, `e2e-cross` on PRs.

Deploy on `main`: `deploy-pages.yml` (GitHub Pages), `deploy-itch.yml` (butler → `pfaustino/gigazonk:html5`). Secret `BUTLER_API_KEY` in GitHub Environment **itch**. See ADR 0005.

## Documentation map

| Doc | Purpose |
|-----|---------|
| `DEV.md` | Dev flags, MCP, manual test scripts |
| `RELIABILITY.md` | Error handling tiers |
| `CONTRIBUTING.md` | PR expectations |
| `SECURITY.md` | Vulnerability reporting |
| `docs/adr/` | Architecture decision records |
| `AGENTS.md` | Cursor agent entry |
