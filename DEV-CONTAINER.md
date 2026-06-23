# Dev container + C:\Dev + Google Drive staging

## Layout

| Tier | Path | Role |
|------|------|------|
| Work | `C:\Dev\github-projects` | npm, Cursor, MCP, dev container bind mount |
| Container | `/workspace` | Linux paths; `node_modules` in Docker volume |
| Drive staging | `D:\Users\pfaus\Google Drive\github-projects` | Source-only cloud upload |
| Truth | GitHub | Version control + CI |

Do **not** develop inside the Google Drive folder.

## First-time setup

```powershell
cd "D:\Users\pfaus\Google Drive\github-projects\GigaZonk"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-dev-workspace.ps1
```

Then open **`C:\Dev\github-projects\GigaZonk`** in Cursor (not the Drive copy).

## Daily workflow

```powershell
# Host or dev container
cd C:\Dev\github-projects\GigaZonk
npm run dev                    # :5173 forwarded from container

# After commit + push
npm run gsync                  # C:\Dev -> Drive staging -> cloud
```

## Dev container

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL2 backend).
2. Cursor → **Dev Containers: Reopen in Container**.
3. `postCreateCommand` runs `npm ci` and Playwright Chromium install.
4. Vite listens on `0.0.0.0:5173` — use `http://localhost:5173` on the host for MCP and browser tools.

`node_modules` lives in Docker volume `gigazonk-node_modules` — never synced to Drive.

## MCP (host Cursor)

| Server | Requirement |
|--------|-------------|
| vite-mcp | `npm run dev` + port 5173 forwarded |
| cursor-ide-browser | `http://localhost:5173` |
| chrome-devtools | `npm run setup:mcp` on host; reload MCP |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-dev-workspace.ps1` | Migrate + env + MCP |
| `scripts/migrate-to-c-dev.ps1` | Drive → C:\Dev (excludes build dirs) |
| `scripts/gsync-to-drive.ps1` | C:\Dev → Drive staging |
| `npm run gsync` | gsync wrapper |
