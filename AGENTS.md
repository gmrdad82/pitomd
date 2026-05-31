# AGENTS.md

Agent guidance for **pitomd** — the Astro landing site for
[Pito](https://github.com/gmrdad82/pito), served at pitomd.com and deployed to
Cloudflare Pages. Project-specific notes live in [`docs/EXTRA.md`](docs/EXTRA.md).

## What this is

A static Astro site. **No SSR, no server runtime, dark-only, no client
JavaScript.** Output is a plain `dist/` tree published to Cloudflare Pages. Keep
it that way — reach for an island only when there's truly no static option.

## Commands

Node 22 (pinned in `.mise.toml`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # serve the built dist/
npx astro check  # type + template check (run before pushing)
```

## Structure

```
astro.config.mjs       static output; site = https://pitomd.com
src/
  layouts/Base.astro   <head> (favicons + meta) + <body> slot
  pages/index.astro    the landing page
  styles/global.css    minimal Tokyo Night tokens + layout
public/                static assets copied verbatim (favicons, robots.txt)
```

## Conventions

- **Static-first.** Plain HTML/CSS. Inline small styles (config sets
  `inlineStylesheets: "auto"`). No JS frameworks for presentational work.
- **Dark-only.** No theme toggle, no system-preference detection.
- **`site` is canonical.** `https://pitomd.com` drives absolute URLs / `og:` /
  sitemap — derive from `Astro.site`, don't hardcode the domain in templates.
- Marketing-page bar: semantic HTML, real `alt` text, no layout shift.

## CI / deploy

- `.github/workflows/ci.yml` — `npm audit` (high gate), `astro check`, build,
  prettier on markdown. Runs on every push / PR.
- `.github/workflows/deploy.yml` — builds + publishes `dist/` to the
  `pito-website` Cloudflare Pages project on push to `main` and manual dispatch.
  Needs repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- Dependabot keeps npm + GitHub Actions current.

## License

AGPL-3.0 (see [`LICENSE`](LICENSE)).
