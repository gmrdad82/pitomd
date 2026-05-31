# AGENTS.md

Agent guidance for **pitomd** — the Astro marketing/landing site for
[Pito](https://github.com/gmrdad82/pito), served at pitomd.com and deployed to
Cloudflare Pages. Project-specific conventions live in
[`docs/EXTRA.md`](docs/EXTRA.md); this file defers to it on any conflict.

## What this is

A static Astro site. **No SSR, no server runtime, zero client JavaScript by
default.** Output is a plain `dist/` tree published to Cloudflare Pages. Keep it
that way — reach for a framework island only when there is no static option.

## Commands

Node 22 (pinned in `.mise.toml`).

```bash
npm install
npm run dev      # local dev server → http://localhost:4321
npm run build    # static build → dist/
npm run preview  # serve the built dist/ locally
npx astro check  # type + template check (run before pushing)
```

## Structure

```
astro.config.mjs       static output; site = https://pitomd.com
src/
  layouts/Base.astro   shared shell (header, footer, theme script)
  pages/               one .astro file per route
  styles/global.css    design tokens (:root + [data-theme="dark"])
public/                static assets copied verbatim (logo, favicon, robots.txt)
docs/                  project docs (plan, log, EXTRA conventions)
```

## Conventions

- **Static-first.** Prefer plain HTML/CSS. Inline small styles (the config sets
  `inlineStylesheets: "auto"`). Don't add JS frameworks for presentational work.
- **Theme parity with the Pito app.** Tokens in `src/styles/global.css` mirror
  the Rails app's Tailwind theme; the pre-paint resolver reads
  `localStorage("pito-theme")` then `prefers-color-scheme` (no flash). When the
  app's design system shifts in a way that should reach the marketing surface,
  update the tokens here to match.
- **`site` is the canonical origin.** `https://pitomd.com` drives absolute URLs,
  `og:` tags, and the sitemap — derive from `Astro.site`, don't hardcode the
  domain in templates.
- **Accessibility + performance** are the bar for a marketing page: semantic
  HTML, real `alt` text, no layout shift, no render-blocking JS.

## Git / CI

- Default branch is `main`. Open a PR for changes; CI must be green.
- `.github/workflows/ci.yml` runs `npm audit` (high gate), `astro check`, a
  build, and prettier on markdown for every push/PR.
- `.github/workflows/deploy.yml` builds and publishes `dist/` to the
  `pito-website` Cloudflare Pages project on push to `main` (and manual
  dispatch). Needs repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- Dependabot (`.github/dependabot.yml`) keeps npm + GitHub Actions current.

## License

AGPL-3.0 (see [`LICENSE`](LICENSE)), matching the Pito app.
