# GitHub portfolio setup

Enterprise-oriented defaults for **pfaustino** repositories. GigaZonk is the reference implementation; copy from `templates/github/` to other repos.

## Profile layout (manual — github.com/settings/profile)

| Field | Recommendation |
|-------|----------------|
| Bio | 1–2 lines: game dev + AI researcher, browser games (Vite/Three.js) |
| Website | Link to GigaZonk Pages demo or portfolio |
| Pinned repos | gigazonk, boycott-evil, solar-system-trader, 3dfps (max 6) |
| README | Create `pfaustino/pfaustino` repo with project table + live demo links |

## Per-repo settings (Settings → General)

For every active repo:

1. **Description** — one line + genre/stack
2. **Topics** — e.g. `game`, `threejs`, `vite`, `roguelike`, `python`, `pygame`
3. **Default branch** — `main` (rename `master` on angry_battery, rpg_new, simple_rpg)
4. **License** — add SPDX license if missing (MIT for libs, GPL for games if intended)

## Security (Settings → Code security)

Enable for each repo:

- [ ] Dependabot alerts
- [ ] Dependabot security updates
- [ ] Code scanning (CodeQL) — workflow in `.github/workflows/codeql.yml`
- [ ] Secret scanning (GitHub default for public repos)

## Branch protection (Settings → Branches → `main`)

Recommended for flagship repos (gigazonk, boycott-evil):

- Require PR before merge (optional for solo dev)
- Require status checks: `CI`, `CodeQL`
- Require branches to be up to date
- Do not allow force push to `main`

## Workflows to copy

| Stack | Copy from |
|-------|-----------|
| Node/Vite games | `templates/github/workflows/ci-node.yml`, `codeql-js.yml` |
| Python apps | `templates/github/workflows/ci-python.yml`, `codeql-python.yml` |
| All | `templates/github/dependabot.yml`, `SECURITY.md`, `CONTRIBUTING.md` |

Rename/adapt `npm run check` per repo.

## ADR backlog by repository

Create `docs/adr/README.md` + 2–4 ADRs per active project:

| Repo | Suggested ADRs |
|------|----------------|
| gigazonk | Done — see `docs/adr/` |
| boycott-evil | Stack (TS/Vite), scan/check pipeline, data privacy |
| ghouls-n-orcs | 2.5D rendering approach, input/combat loop |
| bullet-hell | Bullet patterns, collision strategy |
| solar-system-trader | Elite-style flight model, economy sim |
| 3dfps | Web FPS loop, weapon/projectile architecture |
| phaser_rpg | Phaser vs pygame port scope |
| simple_rpg / rpg_new | Pygame loop, consolidate or archive one |
| receipts | OCR provider choice, Streamlit deploy model |
| angry_battery | Flutter vs web, battery API permissions |
| easy-dmv-coach | Content sourcing, state-specific question DB |
| chrono-splinter | Lore vs tech scope, engine choice |
| civilization-war | RTS/sim architecture (when active) |

Archive stale repos (`rpg_new` if superseded) with README note pointing to successor.

## Apply kit to a repo (script)

```bash
# From gigazonk root, example for solar-system-trader
REPO=../solar-system-trader
cp templates/github/workflows/ci-node.yml "$REPO/.github/workflows/ci.yml"
cp templates/github/workflows/codeql-js.yml "$REPO/.github/workflows/codeql.yml"
cp templates/github/dependabot.yml "$REPO/.github/dependabot.yml"
cp templates/github/SECURITY.md "$REPO/SECURITY.md"
mkdir -p "$REPO/docs/adr" && cp docs/adr/template.md "$REPO/docs/adr/template.md"
```

Then commit and push from that repo.

## OIDC / permissions

Workflows use least privilege:

- CI: `contents: read`
- CodeQL: `contents: read`, `security-events: write`
- Pages deploy: `pages: write`, `id-token: write`
- itch deploy: `contents: read`; secret `BUTLER_API_KEY` in Environment **itch**

Never store secrets in repos. Use GitHub Environments for deploy secrets if needed.

### GigaZonk itch.io (one-time)

1. Project: [pfaustino.itch.io/gigazonk](https://pfaustino.itch.io/gigazonk) (HTML5)
2. itch.io → **API keys** → create key
3. GitHub **gigazonk** → Settings → Environments → **itch** → secret `BUTLER_API_KEY`
4. Merge to `main` or run workflow **Deploy to itch.io**

See `docs/adr/0005-itch-io-deploy.md`.
