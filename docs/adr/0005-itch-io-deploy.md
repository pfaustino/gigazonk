# ADR 0005: itch.io HTML5 deployment

## Status

Accepted

## Context

GigaZonk ships to GitHub Pages at `/gigazonk/` and to itch.io as an HTML5 embed. The two hosts require different Vite `base` paths. Players discover the game on [pfaustino.itch.io/gigazonk](https://pfaustino.itch.io/gigazonk).

## Decision

Deploy to itch.io automatically on every push to `main` (Option A), mirroring Pages deploy policy:

1. Workflow `.github/workflows/deploy-itch.yml` runs `npm run check:itch` (lint + tsc + vitest + `build:itch`).
2. **butler** pushes `dist/` to `pfaustino/gigazonk:html5` with `--userversion` from `package.json`.
3. Secret `BUTLER_API_KEY` lives in GitHub Environment **`itch`** (not in the repo).
4. `workflow_dispatch` allows manual re-push without a commit.

Pages deploy (`deploy-pages.yml`) and itch deploy run **in parallel** after merge; each job builds its own artifact.

## Consequences

### Positive

- itch.io stays in sync with `main` without manual butler runs
- Quality gate blocks broken builds from reaching itch
- Relative `base: './'` is isolated to `build:itch` / `check:itch`

### Negative

- Every merge to `main` updates the public itch build (no semver gate)
- Requires one-time itch project + API key setup

### Risks

- Missing or invalid `BUTLER_API_KEY` fails the workflow until configured
- First push must create the `html5` channel in the itch dashboard if not present

## Setup (one-time)

1. Create or open the HTML5 project at [itch.io](https://itch.io) under **pfaustino/gigazonk**.
2. Generate an API key: itch.io → **User settings** → **API keys**.
3. GitHub repo → **Settings** → **Environments** → create **`itch`** → add secret **`BUTLER_API_KEY`**.
4. Merge to `main` or run **Deploy to itch.io** workflow manually.

## Alternatives considered

1. **Tag-only deploy** — rejected for now; faster iteration on itch matches Pages
2. **Manual butler only** — rejected; easy to forget after merge
3. **Shared dist artifact** — rejected; Pages and itch need different `base` paths

## References

- `.github/workflows/deploy-itch.yml`, `package.json` (`check:itch`, `build:itch`)
- ADR 0004 (GitHub Pages deploy)
- [butler docs](https://itch.io/docs/butler/)
