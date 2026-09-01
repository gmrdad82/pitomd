# pitomd

The Pito family's website at **pitomd.com** — marketing, purchases, guides,
and blog. It sells and wows; it does not document APIs. Today the codebase
is the single-page scroll-driven Pito showcase; its future is the family's
storefront: over-the-top showcase/tour landing pages for the PITO products,
plus simple, easy-to-follow guides and SEO-minded blog posts that give
visitors a reason to try them.

Read the matching guide in `agents/skills/` before starting:

- [`agents/skills/web-dev.md`](agents/skills/web-dev.md) — the Astro stack, fx rules, verification
- [`agents/skills/content.md`](agents/skills/content.md) — landing pages, guides, and blog posts
- [`agents/skills/ci-watch.md`](agents/skills/ci-watch.md) — watching a push to green, red triage, Dependabot
- [`agents/skills/release.md`](agents/skills/release.md) — the `[vX.Y.Z]` commit-message release flow

# Hard rules

- No AI tool commits, tags, or pushes here. Deploy
  (`.github/workflows/deploy.yml`) triggers are the owner's call each time —
  ask, never assume.
- **Reference, don't inject**: this site never bundles or imports the
  `pito` repo's source. Copy/adapt tokens and assets from a local sibling
  checkout; fx controllers are conceptual references reimplemented as
  standalone vanilla modules; never depend on pito at build/deploy time.
- **Never run `vhs`, the real `install.sh`, or anything that boots the pito
  Docker stack** — it would clobber the owner's local setup; reuse pito's
  shipped GIFs (`docs/media/`). Only invoke vhs on his explicit in-the-moment
  confirmation.
- **The name**: "Pito" in prose — capital P, lowercase rest; never "PITO"
  here, never "pito" except in CLI commands, identifiers, paths, URLs.
- Voice and design follow the Pito estate design canon (kept in the owner's
  private notes archive) — read it before wording or designing anything.

# Stack (map)

Astro (`output: "static"`) + CSS-first scroll fx + tiny vanilla JS islands,
deployed to Cloudflare Pages. No SSR. Node 22 (`.mise.toml`). Sliding
sections via scroll-snap; scroll magic via CSS scroll-driven animations with
IntersectionObserver fallback; theme per section via `data-theme` cascade
(19 themes, pito-blue `#5170ff` constant). Client JS stays small, vanilla,
dependency-free; React only per-section if truly warranted — flag the owner
before adding `@astrojs/react`. Always honor `prefers-reduced-motion`.
`site` (`https://pitomd.com`) is canonical — derive absolute URLs from
`Astro.site`, never hardcode.

```
astro.config.mjs       static output; site = https://pitomd.com
src/layouts/Base.astro <head> (favicons + meta + OG) + <body> slot
src/pages/index.astro  the single scroll page
src/components/        Section.astro (theme prop), ColorBridge, PitoLogo
src/scripts/           vanilla fx islands
src/styles/            token layer + 19 [data-theme] blocks
src/data/, src/lib/    cover-pool source data + pure logic (unit-tested)
tests/                 vitest contract tests (section ids, fx wiring, media refs)
tools/shots/           screenshot tooling (Python; venv gitignored)
```

# Verification

Local demo before anything moves forward (`bin/dev` → localhost:4321, or
`npm run build && npm run preview`). Done means: `npm run lint` clean
(prettier+eslint+stylelint), `npx astro check` clean, `npx vitest run`
green (add contract coverage when a change could silently regress section
ids / fx wiring / media refs), `npm run build` clean, `npm audit
--audit-level=high` clean on dependency changes. CI runs on every push
(public repo, free minutes; the `lint-and-audit` job id is the required
status check — keep it), including a Lighthouse pass (a11y/SEO/
best-practices ≥ 0.9 gated; performance ≥ 0.5 warns). AGPL-3.0.
