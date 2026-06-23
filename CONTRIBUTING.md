# Contributing

Thanks for your interest in GigaZonk.

## Development setup

```bash
npm install
npm run dev
```

See `DEV.md` for URL flags, MCP, and manual test scripts.

## Quality gate

All changes should pass:

```bash
npm run check
```

CI runs the same steps on every pull request.

## Pull requests

1. Branch from `main`
2. Keep scope focused — one feature or fix per PR
3. Update docs if player-visible behavior changes
4. Add Vitest tests for pure logic changes
5. If save schema changes, add a migration in `SaveData.js`

## Architecture decisions

Significant technical choices go in `docs/adr/`. Use `docs/adr/template.md` as a starting point.

## Code style

- Match existing module patterns in `src/game/`
- No per-enemy `Mesh` in spawn hot paths
- Balance changes: `data/` or `constants.js` first
