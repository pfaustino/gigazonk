# ADR 0005: itch.io HTML5 deployment

## Status

Accepted

## Context

GigaZonk ships to GitHub Pages at `/gigazonk/` and to itch.io as an HTML5 embed. The two hosts require different Vite `base` paths. Players discover the game on [pfaustino.itch.io/gigazonk](https://pfaustino.itch.io/gigazonk).

## Decision

Deploy to itch.io automatically on every push to `main` (Option A), mirroring Pages deploy policy:

1. Workflow `.github/workflows/deploy-itch.yml` runs `npm run check:itch` (lint + tsc + vitest + `build:itch`).
2. **butler** pushes `dist/` to `pfaustino/gigazonk:html5` with `--userversion` from `package.json`.
3. Post-push, `scripts/verify-itch-embed.sh` polls the live embed JS until it contains `GAME_VERSION` (up to ~3 minutes).
4. Secret `BUTLER_API_KEY` lives in GitHub Environment **`itch`** (not in the repo).
5. `workflow_dispatch` allows manual re-push without a commit.

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
- A **legacy manual zip upload** can block the butler `html5` embed from updating (wharf metadata shows the new version while players still get the old embed)

## Stale embed troubleshooting

Symptoms: download label / wharf API show the new `--userversion`, but the title screen or embed JS still shows an older `GAME_VERSION`. Hard refresh does not help — itch is serving stale embed files.

This repo has **never** auto-deleted itch uploads; CI has always been `butler push dist …:html5` only (since `aef3c12`). The usual cause is an old **manual zip** left on the Edit page before butler CI, not a removed script.

Fix:

1. itch.io → **Edit game** → delete the stale HTML5 upload (e.g. `gigazonk-html5.zip`).
2. **Save**, then re-run **Deploy to itch.io** (Actions → Run workflow).
3. Ensure only the butler `html5` channel upload remains, tagged **HTML5 / Playable in browser**, project kind **HTML**.

Local check: `bash scripts/verify-itch-embed.sh "$(node -p "require('./package.json').version")"`

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
