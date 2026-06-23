---
name: gigazonk-ship
description: >-
  Ship GigaZonk changes via PR — branch, quality gates, wiki sync, version bump,
  and deploy expectations. Use when committing, opening a PR, merging, releasing,
  or updating ARCHITECTURE.md / wiki after structural work.
---

# GigaZonk Ship

## Pre-ship checklist

```
- [ ] npm run check
- [ ] npm run test:e2e (add test:e2e:cross if UI/e2e changed)
- [ ] Save migration + GAME_VERSION if meta schema changed
- [ ] ARCHITECTURE.md + wiki sync if modules/flows changed
- [ ] README differentiators if player-visible feature
```

## Branch and commit

- Branch: `feat/…`, `fix/…`, `chore/…`
- Pull `main` before new work
- Commit only when user asks; message: `type(scope): why`

PowerShell commit body:

```powershell
git commit -m @"
feat(scope): short why line

Optional detail sentence.
"@
```

## Wiki sync (Windows)

```powershell
& "$env:GITHUB_PROJECTS\_devkit\sync-wiki-folder.ps1" -RepoPath (Get-Location)
```

Commit `wiki/**` with the code change. Do not edit GitHub Wiki UI directly.

## Pull request

```powershell
git push -u origin HEAD
gh pr create --title "..." --body "..."
```

PR body: Summary (bullets), Test plan (checkboxes with commands run).

Use `gh pr checks` and read failed logs before blind reruns. Merge only when user asks.

## Deploy (automatic on main)

| Target | Trigger | URL |
|--------|---------|-----|
| GitHub Pages | merge to `main` | https://pfaustino.github.io/gigazonk/ |
| itch.io | merge to `main` | https://pfaustino.itch.io/gigazonk |

Local preview: `npm run dev` (full dev) or `npm run build && npm run preview` (Pages base path).

## Version tags

Tag `v1.0.0` when characters + tutorial + run summary are playtested and polish PRs merged. Use `gh release create` when user requests a release.
