# Cursor Run Mode — stop clicking Run every time

Agents need **Run Mode** enabled in Cursor, not just `permissions.json`.

## One-time setup (30 seconds)

1. **Cursor Settings** → **Agents** → **Run Mode**
2. Choose one:
   - **Run Everything** — no Run clicks (best for solo dev on your own machine)
   - **Allowlist** — uses `permissions.json` allowlists (safer default)
3. **Developer: Reload Window** (`Ctrl+Shift+P`)

## Files that control auto-run

| File | Scope |
|------|--------|
| `~/.cursor/permissions.json` | All projects (Patrick's machine) |
| `.cursor/permissions.json` | This repo (committed for teammates) |

Docs: [cursor.com/docs/reference/permissions](https://cursor.com/docs/reference/permissions)

## If Run still appears

- Run Mode is **Ask** → switch to Allowlist or Run Everything
- Command not in allowlist → add prefix to `terminalAllowlist` (e.g. `npm:run*`)
- **Smart Mode / Auto-review** blocked the call → use Allowlist or Run Everything, or add an `autoRun.allow_instructions` line
- MCP tool blocked → add `server:tool` to `mcpAllowlist` (e.g. `cursor-ide-browser:*`)

## Safe blocks (kept on purpose)

Force-push to `main`, hard reset, and secret writes stay blocked via `autoRun.block_instructions`.
