# Website

Astro landing page for `pitomd.com`, deployed to Cloudflare Pages.

## Status

Phase: Beta. Apex marketing surface is currently a thin "under construction"
placeholder; real marketing site arrives during Theta.

## Stack

- Astro (static output, zero JavaScript by default)
- Cloudflare Pages target
- Design tokens mirror `app/assets/tailwind/application.css` from the Rails
  app — keep in sync when the design system shifts in a way that should reach
  the marketing surface.

## Layout

```
extras/website/
  astro.config.mjs       static output, site = https://pitomd.com
  package.json           astro dev / build / preview scripts
  public/
    Pito.png             apex-domain logo (favicon/og-image source)
    favicon.ico          multi-size icon (64/48/32/16) generated from Pito.png
    manifest.json        PWA manifest, mirrors public/manifest.json in Rails
    robots.txt
  src/
    layouts/Base.astro   shared shell — header, footer, theme toggle script
    pages/index.astro    "under construction" placeholder
    styles/global.css    design tokens duplicated from the Rails app
```

## Local

```bash
cd extras/website
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # serve dist/
```

## Deploy

`.github/workflows/deploy-website.yml` deploys `dist/` to the `pito-website`
Cloudflare Pages project on every push to `main` that touches
`extras/website/**`. Requires repo secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`.

## Theme

Light/dark theme parity with the Rails app:

- Tokens duplicated in `src/styles/global.css` (`:root` + `[data-theme="dark"]`).
- Pre-paint resolver in `<head>` reads `localStorage("pito-theme")`, falls
  back to `prefers-color-scheme`. No theme flash on load.
- `n` keypress (or clicking the `n` keycap) toggles theme, persists to
  localStorage. ~20 lines of inline vanilla JS — no framework.
