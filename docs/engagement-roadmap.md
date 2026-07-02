# Engagement experiments — roadmap

**Branch:** `feat/engagement-experiments`  
**Status:** planning only — do not merge until features are implemented and playtested in isolation.

Goal: more pacing spikes, meaningful mid-run choices, and runs that feel different — without destabilizing the core horde loop.

## Principles

- Ship one experiment per PR (smallest correct diff).
- Each feature behind a dev flag or `?dev=1` toggle until playtested.
- Balance numbers live in `constants.js` / `data/` — not buried in update loops.
- If it breaks pacing or clarity in a 5-minute run, revert.

## Phase 1 — low risk (try first)

| Idea | Touches | Risk |
|------|---------|------|
| Run modifier (boon + curse) at portal | `Game.js`, `UI.js`, `constants.js`, save-safe optional | Low — isolated screen, easy to disable |
| Elite mini-events between boss timers | `Game.js`, `EnemyManager.js`, toasts | Medium — spawn/load; test with `?seed=` |
| Boss phase hazard (ring pulse / rocks) | `Game.js`, `Effects.js`, boss telegraph | Medium — telegraph must be readable |
| Near-miss juice (vignette, heartbeat SFX) | `UI.js`, `Audio.js`, `CameraController.js` | Low — cosmetic |

## Phase 2 — build identity

| Idea | Touches | Risk |
|------|---------|------|
| Element synergy VFX (fire floor, ice burst, chains) | `CombatController.js`, `Particles.js`, `UpgradeSystem.js` | Medium — stacking with existing procs |
| Upgrade evolutions (prereq chains) | `data/upgrades.json`, `UpgradeOffers.js`, UI copy | Medium — save migration if persisted mid-run |
| Third rotating objective (relic courier / beacon siege) | `ObjectiveArrow3D.js`, `Interactables.js`, `QuestSystem.js` | Medium — must not fight burger/citizen UX |
| Character once-per-run ultimates | `Player.js`, `SkillTree.js`, input | Higher — mobile HUD + cooldown clarity |

## Phase 3 — bigger swings (only after Phase 1–2 feel good)

| Idea | Touches | Risk |
|------|---------|------|
| Biome-specific rules (ice slide, brush ambush) | `Arena.js`, `TerrainFeatures.js`, movement | High — collision/terrain edge cases |
| Multi-phase runs (arena → rift slice) | `Game.js`, `RunSnapshot.js`, state machine | High — snapshot + tutorial scope |
| Village run contracts | `QuestSystem.js`, `Village.js`, `data/quests.json` | Medium — meta economy balance |
| Shrine gambles (HP for legendary, etc.) | `Interactables.js`, UI modal | Medium — feel-bad runs if tuned wrong |

## Explicitly not on this branch yet

No gameplay code changes until a Phase 1 item is picked and scoped to a child branch (e.g. `feat/run-modifiers`).

## Suggested child branches

```
feat/engagement-experiments   ← this planning branch
  ├── feat/run-modifiers
  ├── feat/arena-mini-events
  ├── feat/boss-phase-hazards
  └── feat/synergy-vfx
```

## Playtest checklist (any experiment)

- [ ] 5-minute run: pacing not worse (lulls, overwhelm)
- [ ] Mobile + keyboard: new UI/input still works
- [ ] `npm run check` + smoke e2e
- [ ] Save/resume arena if touching run state
- [ ] Dev URL `?seed=42` repro for spawn bugs
