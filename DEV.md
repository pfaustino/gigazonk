# GigaZonk — Development Guide

**Workspace:** develop on `C:\Dev\github-projects\GigaZonk` (not Google Drive). See [DEV-CONTAINER.md](./DEV-CONTAINER.md).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5174 (`dev-port.json`). Production base path: `/gigazonk/`.

### First-time machine setup

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-dev-workspace.ps1
```

Then open `C:\Dev\github-projects\GigaZonk` in Cursor → **Reopen in Container** (optional, needs Docker).

Install recommended extensions (Cursor will prompt, or run `npm run setup:extensions`).

## IDE extensions & editor

Workspace recommendations live in `.vscode/extensions.json`. After clone:

```bash
npm run setup:extensions
```

| Layer | Extensions | Purpose |
|-------|------------|---------|
| Quality | ESLint, Error Lens, Pretty TS Errors | `--max-warnings 0` inline; ESLint fix on save |
| Tests | Vitest Explorer, Playwright | Unit `tests/` only; e2e `e2e/` (separate trees) |
| Git / PR | GitLens, GitHub PR + Actions | Blame, pinned CI workflows, no auto-PR on publish |
| Game data | JSON Crack, Rainbow CSV, Schema Store | Visualize `data/*.json` balance tables |
| 3D assets | Super GLB Viewer | Preview `.glb`/`.gltf` in-editor |
| HUD / CSS | HTML CSS Support, CSS Peek | UI templates → `src/style.css` |
| Docs / wiki | Markdown All in One, markdownlint, Code Spell Checker | ADRs + `wiki/` before sync |
| Dev UX | Vite (no auto-start), EditorConfig, Todo Tree, Import Cost | No double dev servers; Three.js import hints |

**Config files:** `.vscode/settings.json` (extension tuning), `.vscode/tasks.json` (`check`, `dev`, e2e), `.editorconfig`. Key defaults: Vitest excludes `e2e/`; Vite extension does not auto-start; spell-check skips `dist/` and `wiki/`; markdown TOC updates on save for long docs.

## Dev URL flags

| Flag | Effect |
|------|--------|
| `?dev=1` | Dev panel on live builds (also auto in `npm run dev`) — pauses arena on open; **Buffs…** catalog for stacking upgrades |
| `?biome=frost` | Force biome on arena start |
| `?coins=500` | Grant meta coins on load |
| `?seed=42` | Fixed run seed for repro |

Dev panel: time skips, spawn/clear horde, god mode, lighting sliders, biome picker, error export, and **Dev → Buffs** (add/remove run upgrades, pause, full heal). Player-facing itch/README copy teases this as a discoverable easter egg without documenting the URL flag.

## MCP (dev)

With `npm run dev`, vite-mcp exposes browser tools at `http://localhost:5174/__mcp` (requires dev server running).

After clone or `npm install` on **`C:\Dev`**:

```bash
npm run setup:mcp         # chrome-devtools launcher + .cursor/mcp.json
npm run setup:extensions  # install .vscode/extensions.json (Cursor or code CLI)
```

Regenerate MCP after dependency updates. Optional: set `GITHUB_TOKEN` in the environment before `setup:mcp` to enable the GitHub MCP server.

| MCP server | Role |
|------------|------|
| `cursor-ide-browser` | Agent click-through in Cursor tab |
| `vite-mcp` | Dev console + localStorage (`npm run dev`) |
| `chrome-devtools` | Network, perf traces, source-mapped stacks |
| `playwright` | Agent browser automation via `@playwright/mcp` |
| `context7` | Up-to-date library docs (Three.js, Vite, Playwright) |
| `github` | Issues/PRs (when `GITHUB_TOKEN` set at setup) |

Reload MCP in Cursor Settings. In dev container, port 5174 is forwarded to the host.

**Three.js e2e:** dev exposes `window.PLAYWRIGHT_THREE.scene` (`src/main.js`). Import `test`/`expect` from `e2e/helpers/playwrightThree.ts` for scene-aware specs (`@timjen/playwright-three`).

**Stage source to Google Drive after ship:**

```bash
npm run gsync
```

**Cross-browser (Firefox + WebKit):** CI `e2e-cross` runs under **Xvfb + headed** browsers so WebGL works on Linux ([Mozilla #1375585](https://bugzilla.mozilla.org/show_bug.cgi?id=1375585)). Locally:

```bash
npm run test:e2e:cross          # Firefox + WebKit cross-browser spec
npm run collect-browser-errors  # cross-browser sweep + JSON summary in test-results/
npm run verify-browser-debug    # sweep + pass/fail gate (pre-ship)
```

**E2e readiness:** boot sets `<html data-game-ready="title|arena-hud|village">` (`src/lib/gameReady.js`). Helpers in `e2e/helpers/gameReady.ts` wait on that attribute — prefer over long blind timeouts.

Agents can read `window.__gigazonkErrors.exportJson()` in dev, or JSON files under `test-results/browser-errors/`.

If `chrome-devtools` still fails to connect, use **cursor-ide-browser** + `browser_cdp` (Log.enable, Runtime.evaluate) — verified working on this machine.

## Quality commands

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (unit)
npm run test:e2e   # Playwright browser smoke
npm run test:e2e:ui    # Playwright UI mode (IDE)
npm run check      # lint + typecheck + unit test + build
```

## Browser testing (Playwright)

Playwright starts Vite automatically (`playwright.config.ts`).

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # visible browser
npm run test:e2e:ui       # interactive UI runner
```

Tests live in `e2e/`. IDE rule: `.cursor/rules/browser-game-testing.mdc`.

**Simple Browser in Cursor:** `Ctrl+Shift+P` → **Simple Browser: Show** → `http://localhost:5174`


## Manual test scripts

### Smoke (5 min)

1. Title → Enter Village
2. Talk to NPC, open shop
3. Arena portal → survive 2 min
4. Die → coins awarded → return village
5. Quick Arena from title

### Combat (10 min)

1. Each character at minute 5
2. Level-up UI: pick upgrade, verify preview matches buff bar
3. Zonk Rift enter/exit
4. Zonk Lord spawn (~2 min)
5. 300+ enemies: check FPS

### Save

1. Earn coins, buy skill, reload page — progress persists
2. After schema change: load an old save blob from backup

## Cheats (localStorage — dev only)

```js
// Console on live site — reset save
localStorage.removeItem('gigazonk_save');
```

## Build & deploy

```bash
npm run build            # GitHub Pages (/gigazonk/)
npm run build:itch       # itch.io (relative paths)
npm run check:itch       # lint + test + itch build (same gate as CI deploy)
npm run deploy           # gh-pages manual
```

**Auto deploy on `main`:** GitHub Pages (`deploy-pages.yml`) + itch.io (`deploy-itch.yml` → [pfaustino/gigazonk](https://pfaustino.itch.io/gigazonk)). Requires `BUTLER_API_KEY` in GitHub Environment **itch** — see ADR 0005.

## AI / Cursor

- Project rules: `.cursor/rules/`
- Project skill: `.cursor/skills/gigazonk-development/`
- Personal skills: `~/.cursor/skills/web-game-development/`, `game-balance-tuning/`, `game-ship-release/`
- MCP: `.cursor/mcp.json` — run `npm run setup:mcp`; add PixelLab in user global `~/.cursor/mcp.json`
- Extensions: `.vscode/extensions.json` — run `npm run setup:extensions`

## Publishing copy

itch.io page text: `docs/itch-description.md` (source of truth). After edits:

```powershell
npm run update:itch-description        # long description → clipboard + open edit page
npm run update:itch-description -- -Short  # short line only
```

Butler CI deploys the **game build** only; paste description manually on itch. Player copy teases the hidden dev easter egg without documenting `?dev=1`.

## Performance budget

- Target: 60 FPS at 300+ instanced enemies on mid-tier laptop
- Watch: shadow casters, gem count (`MAX_GEMS`), projectile pool
