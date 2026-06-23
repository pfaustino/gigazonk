# GigaZonk — Development Guide

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (Vite default). Production base path: `/gigazonk/`.

## Dev URL flags

| Flag | Effect |
|------|--------|
| `?dev=1` | Dev panel (also auto in `npm run dev`) |
| `?biome=frost` | Force biome on arena start |
| `?coins=500` | Grant meta coins on load |
| `?seed=42` | Fixed run seed for repro |

Dev panel shows live **seed** and **RNG state** during arena runs.

## MCP (dev)

With `npm run dev`, vite-mcp exposes browser tools at `http://localhost:5173/__mcp` (configured in `.cursor/mcp.json`). Use for console logs and `localStorage` (`gigazonk_save`) inspection.

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
npm run build          # GitHub Pages (/gigazonk/)
npm run build:itch       # itch.io (relative paths)
npm run deploy           # gh-pages manual
```

## AI / Cursor

- Project rules: `.cursor/rules/`
- Project skill: `.cursor/skills/gigazonk-development/`
- Personal skills: `~/.cursor/skills/web-game-development/`, `game-balance-tuning/`, `game-ship-release/`
- MCP: `.cursor/mcp.json` (browser + vite-mcp in dev); add PixelLab in user global `~/.cursor/mcp.json`

## Performance budget

- Target: 60 FPS at 300+ instanced enemies on mid-tier laptop
- Watch: shadow casters, gem count (`MAX_GEMS`), projectile pool
