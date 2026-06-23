# Architecture Decision Records (ADR)

We document significant technical decisions using lightweight ADRs ([Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-vite-threejs-stack.md) | Vite + Three.js vanilla JS stack | Accepted |
| [0002](0002-instanced-enemy-horde.md) | InstancedMesh horde rendering | Accepted |
| [0003](0003-seeded-run-rng.md) | Seeded PRNG for reproducible runs | Accepted |
| [0004](0004-github-pages-deploy.md) | GitHub Pages deployment path | Accepted |

## When to write an ADR

- New persistence format or save migration
- Rendering or performance architecture changes
- Security-sensitive features (auth, storage, third-party APIs)
- Replacing a core library (engine, bundler, test runner)

## Template

Copy `template.md` to `NNNN-short-title.md` and add a row to the index above.
