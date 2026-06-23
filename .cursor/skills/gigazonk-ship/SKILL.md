---
name: gigazonk-ship
description: >-
  Ship GigaZonk to GitHub Pages and itch.io. Use when the user asks to publish,
  push, release, deploy, or ship — always verify and report BOTH hosts.
---

# GigaZonk Ship

## Publish means both hosts

| Host | URL | Workflow |
|------|-----|----------|
| GitHub Pages | https://pfaustino.github.io/gigazonk/ | Deploy to GitHub Pages |
| itch.io | https://pfaustino.itch.io/gigazonk | Deploy to itch.io |

Do **not** tell the user the game is published unless **both** workflow runs on `main` succeeded.

## Ship loop

1. `npm run check` (+ e2e gates if UI/gameplay changed)
2. PR → wait for CI (`quality`, `e2e`, `e2e-cross`)
3. Merge to `main`
4. Verify deploys:

```powershell
gh run list --branch main --workflow "Deploy to GitHub Pages" --limit 1
gh run list --branch main --workflow "Deploy to itch.io" --limit 1
```

5. Report **both** play links to the user

## Builds

- Pages: `npm run build` — Vite `base: '/gigazonk/'`
- itch: `npm run build:itch` — Vite `base: './'`
- itch CI gate: `npm run check:itch`

## If itch deploy fails

- Read `deploy-itch.yml` job log
- Confirm `BUTLER_API_KEY` in GitHub Environment **itch**
- Re-run: Actions → **Deploy to itch.io** → Run workflow
- See `docs/adr/0005-itch-io-deploy.md`

## Do not

- Run butler locally unless user asks
- Deploy from PR branches
- Commit API keys
