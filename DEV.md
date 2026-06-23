# GigaZonk — Development Guide

**Workspace:** develop on `C:\Dev\github-projects\GigaZonk` (not Google Drive). See [DEV-CONTAINER.md](./DEV-CONTAINER.md).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (Vite default). Production base path: `/gigazonk/`.

### First-time machine setup

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-dev-workspace.ps1
```

Then open `C:\Dev\github-projects\GigaZonk` in Cursor → **Reopen in Container** (optional, needs Docker).

## Dev URL flags

| Flag | Effect |
|------|--------|
| `?dev=1` | Dev panel (also auto in `npm run dev`) |
| `?biome=frost` | Force biome on arena start |
| `?coins=500` | Grant meta coins on load |
| `?seed=42` | Fixed run seed for repro |

Dev panel shows live **seed** and **RNG state** during arena runs.

## MCP (dev)

With `npm run dev`, vite-mcp exposes browser tools at `http://localhost:5173/__mcp` (requires dev server running).

After clone or `npm install` on **`C:\Dev`**:

```bash
npm run setup:mcp    # LOCALAPPDATA launcher + .cursor/mcp.json
```

Reload MCP in Cursor Settings. In dev container, port 5173 is forwarded to the host.

**Stage source to Google Drive after ship:**

```bash
npm run gsync
```

**Cross-browser errors:** CI runs Chromium only. Before a release run:

```bash
npm run test:e2e:cross          # all e2e specs on chromium + firefox + webkit
npm run collect-browser-errors  # cross-browser sweep + JSON summary in test-results/
npm run verify-browser-debug    # sweep + pass/fail gate (pre-ship)
```

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

**Simple Browser in Cursor:** `Ctrl+Shift+P` → **Simple Browser: Show** → `http://localhost:5173`


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
- MCP: `.cursor/mcp.json` (browser + vite-mcp in dev); add PixelLab in user global `~/.cursor/mcp.json`

## Performance budget

- Target: 60 FPS at 300+ instanced enemies on mid-tier laptop
- Watch: shadow casters, gem count (`MAX_GEMS`), projectile pool
