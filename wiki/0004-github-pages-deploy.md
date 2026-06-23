# ADR 0004: GitHub Pages deployment path

## Status

Accepted

## Context

The game is published as a static site for portfolio and playtesting. Production URL uses a repository subdirectory path on GitHub Pages.

## Decision

Deploy `dist/` via **GitHub Actions** (`deploy-pages.yml`) with Vite `base: '/gigazonk/'` in production builds. Quality gate (`npm run check`) runs before artifact upload. Separate `ci.yml` runs on pull requests.

## Consequences

### Positive

- Free HTTPS hosting tied to `main`
- CI blocks broken builds from reaching Pages

### Negative

- Base path must match repo name unless using custom domain
- itch.io builds use `npm run build:itch` with relative base

### Risks

- Asset 404s if base path drifts from Pages config

## Alternatives considered

1. **Netlify / Cloudflare Pages** — viable for custom domains; added account surface
2. **Deploy without CI gate** — rejected for reliability

## References

- `.github/workflows/deploy-pages.yml`, `vite.config.js`
