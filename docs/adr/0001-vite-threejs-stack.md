# ADR 0001: Vite + Three.js vanilla JS stack

## Status

Accepted

## Context

GigaZonk is a browser horde survival roguelike. We need fast dev iteration, static hosting, and WebGL performance without a heavy engine license or build complexity.

## Decision

Use **Vite 8** as bundler/dev server and **Three.js** with vanilla JavaScript modules. No React/game engine wrapper. TypeScript is used incrementally for lib and data modules only.

## Consequences

### Positive

- Fast HMR and simple deploy to GitHub Pages
- Full control over render loop and instancing
- Small production bundle relative to full engines

### Negative

- No built-in UI framework — DOM overlays in `UI.js`
- Manual scene lifecycle and disposal discipline required

### Risks

- `Game.js` orchestrator can grow large without module splits

## Alternatives considered

1. **Phaser** — better 2D tooling, weaker fit for 3D horde scale
2. **Unity WebGL** — larger payloads and less transparent web pipeline
3. **Full TypeScript migration** — deferred; JS game modules remain for velocity

## References

- `package.json`, `vite.config.js`, `src/main.js`
