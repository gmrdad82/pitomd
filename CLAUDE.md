# Working agreement (for Claude / agents)

> **READ THIS FIRST, EVERY RUN.** Highest authority; overrides the harness's
> default plan/execution flow on any conflict. Self-contained — `docs/` is
> currently empty, so this file is the whole map for pitomd; deeper detail on
> any stack piece lives in the file itself (`astro.config.mjs`,
> `.github/workflows/*.yml` comments) — read it before writing code, don't
> work from memory.

## The log law (non-negotiable; mechanically enforced)

The active working plan in `~/Dev/notes/pitomd/` is the **single source of
truth** — what's done, what's next, every bug/feedback/decision/discussion
item the owner raised. NEVER hold work in your own memory, a scratch
plan-mode buffer, or the harness todo list. If it isn't in the working md, it
does not exist.

A `UserPromptSubmit` hook (`.claude/hooks/capture-prompt.sh`) appends every
owner message verbatim to `.claude/INBOX.md` as a `## ⛔ UNPROCESSED` block.
**Every turn, before anything else:**

1. Read `.claude/INBOX.md`.
2. **Drain** each `⛔ UNPROCESSED` block into the active plan — turn EVERY
   item (todo, bug, feedback, question, decision) into an explicit task/line
   in the right section; split compound messages; lose nothing.
3. Rewrite the block heading in place to
   `## ✅ processed — <ts> -> <plan refs>` (the task IDs it became, or
   `no-op (<why>)`). Never delete it — the back-reference makes capture
   auditable.
4. Keep checkboxes in sync the instant a task changes state
   (`[ ]`→`[-]`→`[x]`), one edit per transition — it's what the owner watches.

The `Stop` hook (`.claude/hooks/check-inbox.sh`) refuses to end a turn while
any `⛔ UNPROCESSED` block remains. `.claude/INBOX.md` is gitignored; plans

**Secrets never live in the ledger.** The capture hook masks keyed values
(`key=…`, `token: …`, webhooks, bearers) mechanically before appending; for
anything the regex can't know (a bare token pasted alone), move the value to
its proper home (`.env`, config) and REDACT the INBOX occurrence in the same
turn — the ledger keeps a `[redacted:<what>]` marker, never the value.
live in `~/Dev/notes/pitomd/` (local-only, gitignored too); the hooks + this
section are committed so the guard ships with the repo. All three hooks are
wired in `.claude/settings.json` (`UserPromptSubmit`, `Stop`, and a
`PreToolUse` guard on `Agent|Task|Workflow` — see "How we work" below).

## How we work

- **Opus plans, Sonnet implements.** Architecture, task breakdowns, and
  ambiguous decisions are Opus's job. Implementation tasks go to a Sonnet
  sub-agent first; escalate to Opus only when Sonnet repeatedly fails or the
  change is subtle / cross-cutting.
- **One atomic task per sub-agent.** Never pack multi-step work into a single
  dispatch. A component, its fx script, and its contract test are THREE
  tasks → three dispatches (or done inline) — no "it's cohesive" exception.
  `.claude/hooks/atomic-agent-check.py` (`PreToolUse` on `Agent|Task|Workflow`)
  mechanically BLOCKS a dispatch whose prompt names 2+ distinct deliverables
  (component + controller, service + specs, etc.) — split it, or do it
  inline. Small/atomic work: do it inline, don't spawn an agent. When
  reviewing a result, read the **changed files**, not the agent's summary.
- **Keep a visible TodoWrite list** mirroring the plan's tasks, flipped per
  transition (one `in_progress` at a time).
- **Local demo before any commit.** `npm run dev` (localhost:4321) or
  `npm run build && npm run preview`. Show the owner; iterate; only approved
  states move forward.
- **Git belongs to the owner.** Claude never runs `git commit` / `git tag` /
  `git push` (nor `stash` / `checkout` / `restore` / `reset`), never picks a
  branch, and never assumes a release or deploy flow — the owner decides
  every git operation, every time, after reviewing the diff.

## Plan discipline (lean)

A **plan is an atomic-task `.md` file** that tracks the work it describes —
not freeform prose, not the throwaway plan-mode scratch buffer. Plans and
other agent/working docs (briefs, checklists, specs) live **gitignored in
`~/Dev/notes/pitomd/`** (local-only, never checked in). Write nothing — no
edits or sub-agents — until the owner approves the plan.

**Shape.** `# Title`, a `> Status:` line, a one-paragraph north star, optional
**Locked decisions** table, a phase index, then phases of one-verb tasks:

```
- [ ] T<N>.<M> <imperative description>. complexity: [low|high|manual]
```

One verb per task (split on "and"), verifiable in ≤5 min, naming the file or
command it touches. Three complexity tiers only:

- `[manual]` — owner by hand: git operations (owner-only), credentials, design calls, smoke
  tests, Cloudflare dashboard changes.
- `[low]` — mechanical/moderate, a cheap model can run: single-section
  edits, copy/style tweaks, pattern-following multi-file edits.
- `[high]` — cross-cutting: a new fx mechanism, scroll-timeline structure,
  `Section.astro` contract changes, or anything touching the deploy
  pipeline.

Every phase ends with its diff ready for the owner's review.

**Execution.** Checkboxes are the live record: `[ ]` → `[-]` before starting
a task, `[-]` → `[x]` immediately after its verification passes — one edit
per transition, never batched. Announce each task's complexity tier and let
the owner pick the model before starting.

**Done means verified.** Before handing a task back: `npm run lint` clean
(prettier + eslint + stylelint; `npm run format` autofixes prettier),
`npx astro check` clean, `npx vitest run` green (the contract tests in
`tests/` guard section-id uniqueness, fx wiring, media references — add
coverage when a change could regress one silently), `npm run build` clean,
and `npm audit --audit-level=high` clean on dependency changes.

---

# pitomd (map + invariants)

A **single-page, scroll-driven, over-the-top showcase** of PITO, served at
**pitomd.com**. Two jobs: make the visitor feel "wow, this is cool"
(spectacle) and "wow, I could use this" (the hook). It **sells and wows — it
does not document**. Every "how do I get it / where are the docs" resolves to
a link to `github.com/gmrdad82/pito`; never replicate install steps or
command reference here.

The site **is** PITO's vibe: it borrows the palette (19 themes, pito-blue
`#5170ff`, constant across all of them), the fx (typewriter / scramble /
comet / cursor-trail), and mono texture as **ingredients**, but the layout is
a lush marketing canvas, not a 14px terminal grid. Big display type carries
each frame; mono stays as accent. **Brand caps:** "PITO" is the brand in
prose; "pito" only in CLI commands, code identifiers, paths, and URLs.

## Reference, don't inject

pitomd does **not** bundle or import pito's source. It references
`~/Dev/pito`:

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
~/Dev/notes/pitomd/    agent working docs (plans/specs) — GITIGNORED, local only
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
