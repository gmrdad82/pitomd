# EXTRA — project-specific conventions

Conventions specific to **pitomd** (the Astro marketing site). The root
[`AGENTS.md`](../AGENTS.md) defers to this file on any conflict.

## Surface

- `pitomd.com` — apex marketing / landing site (this repo), deployed to
  Cloudflare Pages.
- The Pito application itself lives in a separate repo
  ([`gmrdad82/pito`](https://github.com/gmrdad82/pito)) and is unrelated to this
  build — only the visual design language is kept in parity (see Theme).

## Build & output

- Astro, `output: "static"`. No SSR, no adapters, no server runtime.
- `npm run build` → `dist/`, a plain static tree Cloudflare Pages serves as-is.
- `site: "https://pitomd.com"` is the canonical origin; absolute URLs / `og:` /
  sitemap derive from it.

## Theme parity

Light/dark tokens in `src/styles/global.css` mirror the Pito Rails app's
Tailwind theme. The pre-paint resolver reads `localStorage("pito-theme")` then
`prefers-color-scheme`. Keep tokens in sync when the app's design system shifts
in a way that should reach the marketing surface — but this repo never imports
from the app; the values are duplicated intentionally.

## CI / deploy

- `.github/workflows/ci.yml` — `npm audit` (high-severity gate), `astro check`,
  build verification, and prettier on `**/*.md`. Runs on every push and PR.
- `.github/workflows/deploy.yml` — builds and publishes `dist/` to the
  `pito-website` Cloudflare Pages project on push to `main` and manual
  `workflow_dispatch`. Requires repo secrets `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID`.
- Custom domain (`pitomd.com`) and DNS are configured in the Cloudflare
  dashboard against the Pages project, not in this repo.

## Branch / release

- Default branch `main`; protected (PR + green CI to merge). No VERSION gating —
  a merge to `main` deploys.
