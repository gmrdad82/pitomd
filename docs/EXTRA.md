# EXTRA — project-specific notes

Conventions specific to **pitomd** (the Astro landing site). The root
[`AGENTS.md`](../AGENTS.md) defers to this file on any conflict.

## Surface

- `pitomd.com` — the landing site (this repo), deployed to Cloudflare Pages.
- The Pito app lives in a separate repo
  ([`gmrdad82/pito`](https://github.com/gmrdad82/pito)); only the visual
  language is kept loosely in parity. This repo never imports from it.

## Build & output

- Astro, `output: "static"`. No SSR, no adapters. Dark-only.
- `npm run build` → `dist/`, a plain static tree Cloudflare Pages serves as-is.
- `site: "https://pitomd.com"` is the canonical origin (absolute URLs / `og:`).
- Tokens in `src/styles/global.css` are the minimal subset the page needs,
  matching the app's Tokyo Night palette (bg `#1a1b26`, brand `#5170ff`).

## CI / deploy

- `.github/workflows/ci.yml` — `npm audit` (high gate), `astro check`, build,
  prettier on `**/*.md`. Every push / PR.
- `.github/workflows/deploy.yml` — builds + publishes `dist/` to the
  `pito-website` Cloudflare Pages project on push to `main` and manual dispatch.
  Requires repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- Custom domain + DNS live in the Cloudflare dashboard, not this repo.

## Branch

Default `main`, protected (PR + green CI to merge). A merge to `main` deploys —
no version gating.
