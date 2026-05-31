# pitomd

[![Website CI](https://github.com/gmrdad82/pitomd/actions/workflows/ci.yml/badge.svg)](https://github.com/gmrdad82/pitomd/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Marketing / landing site for [Pito](https://github.com/gmrdad82/pito) —
served at **pitomd.com**, built with Astro and deployed to Cloudflare Pages.

> **status: beta.** The apex surface is currently a thin "under construction"
> placeholder; the real marketing site lands later.

## stack

- Astro (static output, zero JavaScript by default)
- Cloudflare Pages deploy target
- Design tokens mirror the Pito Rails app's Tailwind theme — keep in sync when
  the design system shifts in a way that should reach the marketing surface.

## local development

Requires Node 22 (see `.mise.toml`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # serve the built dist/
```

## layout

```
astro.config.mjs       static output, site = https://pitomd.com
package.json           astro dev / build / preview scripts
public/
  Pito.png             apex-domain logo (favicon / og-image source)
  favicon.ico          multi-size icon generated from Pito.png
  manifest.json        PWA manifest
  robots.txt
src/
  layouts/Base.astro   shared shell — header, footer, theme toggle script
  pages/index.astro    "under construction" placeholder
  styles/global.css    design tokens (kept in parity with the Rails app)
```

## deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to the
`pito-website` Cloudflare Pages project on every push to `main` (and via manual
`workflow_dispatch`). Requires repo secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`.

## theme

Light/dark parity with the Pito app:

- Tokens in `src/styles/global.css` (`:root` + `[data-theme="dark"]`).
- Pre-paint resolver in `<head>` reads `localStorage("pito-theme")`, falls back
  to `prefers-color-scheme`. No theme flash on load.
- `n` keypress (or clicking the `n` keycap) toggles + persists the theme.
  ~20 lines of inline vanilla JS — no framework.

## license

[AGPL-3.0](LICENSE), matching the Pito app.
