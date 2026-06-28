# CLAUDE.md — pitomd

Agent guide for **pitomd** — the Astro site for
[Pito](https://github.com/gmrdad82/pito), served at **pitomd.com** and deployed
to Cloudflare Pages.

## The log law (non-negotiable; mechanically enforced)

The active working plan in `docs/claude/plan-*.md` is the **single source of
truth** — every todo, bug, decision, and discussion item the owner raised. NEVER
hold work in your own memory or the harness todo list. If it isn't in the working
md, it does not exist.

A `UserPromptSubmit` hook (`.claude/hooks/capture-prompt.sh`) appends every owner
message verbatim to `docs/claude/INBOX.md` as a `## ⛔ UNPROCESSED` block. **Every
turn, before anything else:**

1. Read `docs/claude/INBOX.md`.
2. **Drain** each `⛔ UNPROCESSED` block into the active plan — turn EVERY item
   into an explicit task/line; split compound messages; lose nothing.
3. Rewrite the block heading in place to `## ✅ processed — <ts> -> <plan refs>`.
   Never delete it — the back-reference makes capture auditable.

The `Stop` hook (`.claude/hooks/check-inbox.sh`) refuses to end a turn while any
`⛔ UNPROCESSED` block remains. `docs/claude/` (INBOX + plans) is gitignored
(local-only); the hooks + this section are committed so the guard ships with the
repo.

## What this is

A **single-page, scroll-driven, over-the-top showcase** of PITO. Two jobs: make
the visitor feel "wow, this is cool" (spectacle) and "wow, I'm a YouTuber — I
could use this" (the hook). It **sells and wows — it does not document**. Every
"how do I get it / where are the docs" resolves to a link to GitHub
(`github.com/gmrdad82/pito`); never replicate install steps or command reference
here.

The site **is** PITO's vibe: it borrows the palette (19 themes, pito-blue
`#5170ff`), the fx (typewriter / scramble / comet / cursor-trail), and mono
texture as **ingredients**, but the layout is a lush marketing canvas, not a 14px
terminal grid. Big display type carries each frame; mono stays as accent.

## Stack

**Astro (`output: "static"`) + CSS-first scroll fx + tiny vanilla JS islands.**
Deployed to Cloudflare Pages. No SSR, no server runtime.

- **Sliding sections** → CSS scroll-snap. **Scroll magic** → CSS scroll-driven
  animations (`animation-timeline: view()/scroll()`) with IntersectionObserver
  fallback. **Theme per section** → `data-theme="…"` on each `<section>` (pure
  CSS cascade). **Reveal fx / nav / pointer reactivity** → small vanilla islands
  under `src/scripts/`.
- **Client JS is allowed now** — but keep islands small, vanilla, and dependency-
  free. This supersedes the old "no client JavaScript" rule.
- **React/Vite only per-section, if truly warranted** (e.g. a live chatbox demo
  or stateful theme playground). Default to vanilla; **stop and flag the owner
  before adding `@astrojs/react`**.
- Always honor `prefers-reduced-motion` — degrade to clean static frames.

## Reference, don't inject

pitomd does **not** bundle or import pito's source. It **references**
`~/Dev/pito`:

- **Copy/adapt** the CSS color tokens + 19 `[data-theme]` blocks into pitomd's
  own CSS (`src/styles/`), from
  `pito/app/assets/tailwind/{application,themes}.css`.
- **Reuse** asset PNGs/GIFs (copy into `public/` as needed): feature GIFs and
  theme PNGs under `pito/docs/media/`, avatars under `pito/docs/avatars/`, logo
  `pito/tmp/logo-p.svg`.
- **Install/CLI casts — reuse pito's shipped GIFs, do NOT run VHS.** The casts
  live in `pito/docs/media/` (`pito-install-cast.gif`, `pito-cli-cast.gif`,
  `pito-update-cast.gif`). Copy those. **Never run `vhs`, the real `install.sh`,
  or anything that boots the pito Docker stack** — it would clobber the owner's
  local pito setup (containers, systemd, secrets). Only invoke `vhs` if the owner
  explicitly confirms in the moment.
- The fx controllers
  (`pito/app/javascript/controllers/pito/{type_fx,diff_reveal,cursor_trail}_controller.js`)
  are Stimulus, coupled to the terminal app — treat them as **conceptual
  references**, reimplement the effects as standalone vanilla modules.
- Never depend on pito at build/deploy time.

`#5170ff` is **pito-blue**, constant across all 19 themes — the through-line
accent.

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
  layouts/Base.astro   <head> (favicons + meta + OG) + <body> slot
  pages/index.astro    the single scroll page
  components/          Section.astro (theme prop → data-theme), section pieces
  scripts/             vanilla fx islands (reveal, pointer, parallax, nav, themes)
  styles/              token layer + 19 [data-theme] blocks + global
public/                static assets served verbatim (favicons, GIFs, PNGs, cast)
docs/claude/           agent working docs (specs/plans) — GITIGNORED, local only
```

## Way of working

- **Local demos before any commit.** `npm run dev` (localhost:4321) and
  `npm run build && npm run preview`. Show the owner; iterate; commit only
  approved states.
- **Atomic tasks**, one verb each; demo each section/batch for sign-off.
- **Deploy**: Cloudflare Pages via `.github/workflows/deploy.yml` on push to
  `main` (project `pito-website`; secrets `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID` already set). A merge to `main` deploys — no version
  gating.
- **Pre-push gate** (mirrors CI): `npm run lint` (prettier `--check .` + eslint
  - stylelint), `npx astro check`, `npm run build` clean. `npm run format`
    fixes prettier. Commit messages are plain — **no `Co-Authored-By` trailers**.
- **`site` is canonical.** `https://pitomd.com` drives absolute URLs / `og:` —
  derive from `Astro.site`, don't hardcode the domain in templates.
- Marketing-page bar: semantic HTML, real `alt` text, no layout shift,
  lazy-load heavy media.
- **Brand caps**: "PITO" is the brand in prose; "pito" only in CLI commands,
  code identifiers, paths, and URLs.

## CI / deploy

- `.github/workflows/ci.yml` — `npm audit` (high gate), prettier (`--check .`),
  eslint (JS islands), stylelint (CSS), `astro check`, build, and a Lighthouse
  job (a11y/SEO/best-practices gated ≥0.9; performance a non-blocking warning).
  Every push / PR.
- `.github/workflows/deploy.yml` — builds + publishes `dist/` to the
  `pito-website` Cloudflare Pages project on push to `main` and manual dispatch.
- Custom domain + DNS live in the Cloudflare dashboard, not this repo.
- Dependabot keeps npm + GitHub Actions current.

## License

AGPL-3.0 (see [`LICENSE`](LICENSE)).
