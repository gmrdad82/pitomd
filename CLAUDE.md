# pitomd — project guide (for Claude / agents)

## ⛔ THE COMMIT IS THE OWNER'S (owner law, 2026-08-29 — global, all repos)

**Claude never runs `git commit` / `git tag` / `git push` here unless Gamer
Dad explicitly asks for that commit.** Finishing the work is not permission to
commit it — the change is left in the working tree and he is told what to
commit. Never in any case: `stash`, `checkout`, `restore`, `reset`, `clean`,
force-push, amend, or history rewrite. When he does ask: stage the files
explicitly (never `git add .` / `-A`), no AI trailers, this repo's message form.

> The global working agreement (`~/.claude/CLAUDE.md`) applies here; this file
> carries only pitomd specifics. `docs/` is currently empty, so this file is
> the whole map for pitomd; deeper detail on any stack piece lives in the file
> itself (`astro.config.mjs`, `.github/workflows/*.yml` comments) — read it
> before writing code, don't work from memory.

## Working here

- **Local demo before any commit.** `npm run dev` (localhost:4321) or
  `npm run build && npm run preview`. Show the owner; iterate; only approved
  states move forward.
- **Done means verified.** Before handing a task back: `npm run lint` clean
  (prettier + eslint + stylelint; `npm run format` autofixes prettier),
  `npx astro check` clean, `npx vitest run` green (the contract tests in
  `tests/` guard section-id uniqueness, fx wiring, media references — add
  coverage when a change could regress one silently), `npm run build` clean,
  and `npm audit --audit-level=high` clean on dependency changes.

---

# pitomd (map + invariants)

A **single-page, scroll-driven, over-the-top showcase** of Pito, served at
**pitomd.com**. Two jobs: make the visitor feel "wow, this is cool"
(spectacle) and "wow, I could use this" (the hook). It **sells and wows — it
does not document**. Every "how do I get it / where are the docs" resolves to
a link to `github.com/gmrdad82/pito`; never replicate install steps or
command reference here.

The site **is** Pito's vibe: it borrows the palette (19 themes, pito-blue
`#5170ff`, constant across all of them), the fx (typewriter / scramble /
comet / cursor-trail), and mono texture as **ingredients**, but the layout is
a lush marketing canvas, not a 14px terminal grid. Big display type carries
each frame; mono stays as accent. **The name:** "Pito" — capital P, lowercase
rest — is the brand in prose. Never "PITO" (retired 2026-07-25), never "pito".
Lowercase `pito` only in CLI commands, code identifiers, paths, and URLs.

## Reference, don't inject

pitomd does **not** bundle or import pito's source. It references a
local checkout of the private `pito` repo (a sibling directory):

- **Copy/adapt**, don't import: CSS color tokens + the 19 `[data-theme]`
  blocks into pitomd's own `src/styles/`, from
  `pito/app/assets/tailwind/{application,themes}.css`; asset PNGs/GIFs into
  `public/` as needed (feature GIFs + theme PNGs under `pito/docs/media/`,
  avatars under `pito/docs/avatars/`, logo `pito/tmp/logo-p.svg`).
- **Install/CLI casts — reuse pito's shipped GIFs (`pito/docs/media/`), do
  NOT run VHS.** Never run `vhs`, the real `install.sh`, or anything that
  boots the pito Docker stack — it would clobber the owner's local pito
  setup. Only invoke `vhs` if the owner explicitly confirms in the moment.
- pito's Stimulus fx controllers are **conceptual references** only —
  reimplement effects as standalone vanilla modules.
- Never depend on pito at build/deploy time.

---

# Stack (condensed)

**Astro (`output: "static"`) + CSS-first scroll fx + tiny vanilla JS
islands.** Deployed to Cloudflare Pages. No SSR, no server runtime. Node 22
(pinned in `.mise.toml`).

- **Sliding sections** → CSS scroll-snap. **Scroll magic** → CSS
  scroll-driven animations (`animation-timeline: view()/scroll()`) with
  IntersectionObserver fallback. **Theme per section** → `data-theme="…"` on
  each `<section>` (pure CSS cascade). **Reveal fx / nav / pointer
  reactivity** → small vanilla islands under `src/scripts/`.
- Client JS is allowed — keep islands small, vanilla, dependency-free.
- **React/Vite only per-section, if truly warranted** (e.g. a stateful
  demo). Default to vanilla; stop and flag the owner before adding
  `@astrojs/react`.
- Always honor `prefers-reduced-motion` — degrade to clean static frames.
- **`site` is canonical.** `https://pitomd.com` drives absolute URLs / `og:`
  — derive from `Astro.site`, don't hardcode the domain in templates.
- Marketing-page bar: semantic HTML, real `alt` text, no layout shift,
  lazy-load heavy media.

## Commands

```bash
bin/dev          # installs deps on first run, serves http://localhost:4321
npm run dev      # same, without the wrapper
npm run build    # → dist/
npm run preview  # serve the built dist/
npm run lint     # prettier --check . + eslint + stylelint
npm run format   # prettier --write . (fixes prettier)
npx astro check  # type + template check
npx vitest run   # contract tests (tests/)
```

## Structure

```
astro.config.mjs       static output; site = https://pitomd.com
src/
  layouts/Base.astro   <head> (favicons + meta + OG) + <body> slot
  pages/index.astro    the single scroll page
  components/          Section.astro (theme prop → data-theme), ColorBridge, PitoLogo
  scripts/             vanilla fx islands (reveal, pointer, parallax, nav, themes, cursor, ...)
  styles/              token layer + 19 [data-theme] blocks + global/bold/fx/components
  data/                cover-pool.json (masonry cover-wall source data)
  lib/                 cover-pool-assign.js (pure logic, unit-tested)
public/                static assets served verbatim (favicons, GIFs, PNGs, casts)
tests/                 vitest contract tests (section ids, fx wiring, media refs)
tools/shots/           screenshot/capture tooling (Python; venv + auth state gitignored)
<local notes dir>/     agent working docs (plans/specs) — outside the repo (per-person, optional)
```

## CI / deploy

- **Website CI** (`.github/workflows/ci.yml`, single job `lint-and-audit` —
  keep that id, it's the required status check on `main`): `npm audit
--audit-level=high`, prettier, eslint, stylelint, `astro check`,
  `vitest run`, `npm run build`, and a Lighthouse pass
  (`lighthouserc.json`: a11y/SEO/best-practices gated ≥0.9, performance ≥0.5
  a non-blocking warning). Runs on every push and PR.
- **Deploy**: workflow lives in `.github/workflows/deploy.yml` — how and when
  to trigger it is the owner's call each time; ask, never assume.
- Custom domain + DNS live in the Cloudflare dashboard, not this repo.
  Dependabot keeps npm + GitHub Actions current.

## License

AGPL-3.0 (see [`LICENSE`](LICENSE)).

## Language and design canon (owner law, 2026-08-05)

Every language and design decision in this repo — voice, copy,
marks, lockups, interface grammar — follows the Pito estate design
canon (`LANGUAGE-AND-DESIGN-LANGUAGE.md`, kept in the owner's
private dev-notes archive). Sessions on the owner's machine read
it before designing or wording anything user-facing. Per-product
amendments are ratified by the owner; the canon is amended, never
forked.
