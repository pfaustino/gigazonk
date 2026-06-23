# ADR 0002: InstancedMesh horde rendering

## Status

Accepted

## Context

The game targets hundreds of simultaneous enemies at 60 FPS on mid-tier laptops. Per-enemy `Mesh` allocation would destroy frame time and GC stability.

## Decision

`EnemyManager` uses **THREE.InstancedMesh** with a fixed pool capped by `MAX_ENEMIES`. Spatial hashing, soft cap, batch despawn, and near-radius physics reduce work per frame.

## Consequences

### Positive

- Predictable memory and draw-call count
- Horde scale is a demonstrable engineering feature

### Negative

- Per-enemy visual variation is limited to instance attributes
- Boss/elite variants need careful mesh/type switching

### Risks

- Changing enemy mesh geometry requires pool rebuild and regression at 300+ count

## Alternatives considered

1. **Object pooling with individual Mesh** — higher CPU and memory
2. **GPU particles for enemies** — harder hitboxes and gameplay logic

## References

- `src/game/EnemyManager.js`, `src/game/constants.js` (`MAX_ENEMIES`, `ENEMY_SOFT_CAP`)
