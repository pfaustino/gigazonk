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

## If embed shows an old version (verify step failed)

Butler can succeed while the **Play in browser** embed still serves old JS. CI catches this via `scripts/verify-itch-embed.sh`.

Fix: itch Edit page → delete stale HTML5 upload → Save → re-run **Deploy to itch.io**. There is no butler auto-delete; a leftover manual zip usually caused this.

## itch.io page copy

Source of truth: `docs/itch-description.md`. Update after player-visible features ship:

```powershell
npm run update:itch-description        # long body → clipboard
npm run update:itch-description -- -Short
```

Paste manually on the itch edit page (butler does not sync description text). Do not document `?dev=1` in itch copy — tease the easter egg only.

## Do not

- Run butler locally unless user asks
- Deploy from PR branches
- Commit API keys
