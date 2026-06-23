# ADR 0003: Seeded PRNG for reproducible runs

## Status

Accepted

## Context

Debugging combat, loot, and upgrade rolls requires reproducing the same run. `Math.random()` is neither seedable nor restorable mid-run.

## Decision

Use **mulberry32** (`RunRng`) for arena-scoped randomness via `runRandom()` / `runRandomInt()`. Run snapshots store `runSeed` and `rngState`. Session-static visuals (rock scatter, village props) remain on `Math.random()`.

## Consequences

### Positive

- `?seed=42` and dev panel enable deterministic QA
- Snapshot resume restores RNG stream

### Negative

- Every gameplay random call must use run helpers during arena state
- Partial migration leaves mixed random sources

### Risks

- Missing a `Math.random()` in combat path breaks repro claims

## Alternatives considered

1. **Seed only at run start, no state restore** — insufficient for mid-run save/load
2. **Replace all Math.random globally** — unnecessary for static session visuals

## References

- `src/lib/RunRng.ts`, `src/lib/runRandom.ts`, `src/game/Game.js` snapshot fields
