# Changelog

All notable changes to the pitomd.com landing site are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/); the site aims for
[Semantic Versioning](https://semver.org/). Releases ship to Cloudflare Pages
only when a `v*.*.*` tag is pushed (pushes to main are CI-validated but do not
deploy).

## [5.0.0] — 2026-07-27

> The estate-freeze release. The `v5.0.0` tag was re-cut onto this commit
> (delete-and-recreate), so the 2026-07-24 cut and the freeze ship as one
> release — both are documented here.

### Added

- **The countdown teaser at `/` — "Pito Studio is coming in..."** A
  countdown over ELASTIC TIME: the deadline is real (August 10, the
  visitor's local time) but the display bends — every butterfly that
  bumps the box adds or subtracts a gentle random amount, a touch resets
  the display to something random, and the tick simply runs faster or
  slower so the counter lands on zero exactly on the date no matter what
  happened to it. `dd:hh:mm:ss:zzz`, the milliseconds riding superscript,
  labels right-aligned under their groups. Behind it, the sky ported from
  Pito's own web app as a self-contained canvas, with a three-body
  butterfly flock over it — a yellow, red and green body at
  0.5x/0.9x/1.9x size (and mass), orbiting each other and the box on load
  before it all dissolves into chaotic wander, bouncing off the box and
  off each other by mass along the way, never sticking to anything.
  A small pill in the bottom-right corner points at the free chat.
  Respects reduced motion; the countdown still ticks when the sky stands
  still.
- A top-left "Pito Studio" pill on `/chat` pointing back to `/` — dressed
  as the seller: bold on a purple-to-blue gradient with a breathing glow
  (calm under reduced motion).

### Changed

- **The chat showcase lives at `/chat` now** — the whole restructured
  page (the fat cut, the new copy, the fx cull) moved from the root.
- Titles, meta descriptions, canonicals and the sitemap re-aimed: `/` is
  the teaser, `/chat` is the chat showcase. Nothing else is routed.
- Keyboard chips no longer break mid-token (`--web` stays whole).

- **The terminal client is "pito" now, not "pito-tui"** — the runnable
  binary got renamed upstream (the GitHub repo stays
  `gmrdad82/pito-tui`); the terminal slide's link text and image alt now
  read "pito" to match. Install command and repo URL are untouched.
- **The three CLI casts were re-recorded** — `pito-install-cast`,
  `pito-cli-cast` and `pito-update-cast` showed the old `./pito` operator
  CLI, which is now `pito-cli`. All three were regenerated upstream and
  re-copied here, so the GIFs on the self-host slides match what the
  installer actually prints. The `pito-tui-loop.gif` terminal reel is
  unchanged and gets re-captured separately.
- Upgraded Astro 7.0.7 → 7.1.3.
- Dev tooling bumped: eslint 10.5.0 → 10.7.0, prettier 3.8.4 → 3.9.6,
  stylelint 17.13.0 → 17.14.1, vitest 4.1.9 → 4.1.10; CI and deploy now
  use `actions/setup-node@v7`.

### Removed

- Every pito-tui reference: the terminal-client section, its loop GIF,
  and all repo links. The site sells the free self-hosted chat — and
  teases exactly one unexplained countdown.
- The "Studio is here!" launch sign, everywhere.
- `/studio` is unrouted: the built page parks at `src/parked/` for a
  future launch. Nothing links to it and nothing claims it.

### Security

- **Cleared every open npm advisory — 10 findings (6 high) — that had
  been failing Website CI since 2026-07-21.** All were transitive, so
  only the lockfile moved: `brace-expansion` (DoS via exponential
  expansion), `fast-uri` (two host-confusion advisories), `js-yaml`
  (quadratic CPU on merge-key chains), `postcss` (path traversal via
  `sourceMappingURL`), `sharp` (inherited libvips CVEs), `svgo`
  (`removeScripts` leaving executable scripts intact) and the
  `yaml` → `yaml-language-server` → `@astrojs/language-server` chain.
  `npm audit --audit-level=high` now reports zero.

## [3.1.0] — 2026-07-20

### Changed

- **The fx go on a performance diet (~50%, owner-authorized)** — plasma's
  per-pixel fbm storm drops from 25 octave-units to 12 (3 fbm calls ×
  `OCTAVES = 4`, was 5 × 5 — a 52% cut that keeps the domain-warped soul
  and the cursor pull); fluid's stable-fluids sim shrinks to a 96-grid
  with 7 pressure-Jacobi iterations (was 128/14 — 63-66% less grid work
  per frame, splats and all); metaballs orbit 4 satellites instead of 6.
  Every tuned constant carries its old value in a comment, and
  `tests/contracts.test.js` now pins the budgets as source assertions —
  re-inflating plasma past `calls × octaves ≤ 12` or fluid past half its
  old grid-work fails the suite. Water was already owner-tuned and
  idle-freezing; halftone and lens were already cheap; all three
  untouched.
- **Pointer work samples at ~30fps, not your monitor's refresh** — the
  spotlight/magnetic/tilt handler (`pointer.js`) and the cursor-ring
  handler (`cursor.js`) each gain a 33ms work gate plus a 2px
  min-distance gate, so a 120Hz display (or a 1000Hz mouse) no longer
  buys 4× the style writes. The final position always lands (the
  trailing update survives the gate); presses and leaves stay instant;
  the WebGL engine's own pointer was already 30fps by construction.
- **The move path stops paying layout rent** (owner smoke, same evening) —
  the magnet/tilt rects were still re-read via `getBoundingClientRect`
  every work frame, a forced reflow 30×/second that dominated the
  main-thread cost while the mouse moved; they now ride the same
  scroll/resize cache the section rects already used (the untransformed
  anchor is also the _correct_ reference — the old per-frame read fed the
  magnet pull its own output). Ripples calm down too: 140ms cadence
  (was 90), at most 6 live nodes per section, and each pair shares one
  layout read instead of forcing two more.

### Fixed

- **Two following circles can no longer meet at a scroll boundary**
  (owner smoke) — the mood randomiser skipped scrolly steppers entirely,
  so a `lens` section (a following magnifier circle) could land right
  against a stepper carrying the global cursor ring (a following circle).
  Ring zones now join the adjacency walk as an implicit "ring" mood and
  lens may neither follow nor precede one — the rule is pinned in the
  contract tests.

- **The last "Voyage" comments retext to "local AI"** — three comments the
  3.0.0 sweep missed (`src/pages/index.astro`'s AI-rail-stop and
  pinned-scrollytelling section markers, `src/styles/bold.css`'s
  scrolly-cover-variant note) now describe the local AI section instead of
  the retired vendor name; `id="voyage"` itself is untouched (load-bearing
  for the CI contract).

## [3.0.0] — 2026-07-16

### Added

- **Search shows up in the wild** — `search games for tekken` and
  `search conversations for tekken combos` join the command ticker;
  `search games like tekken` becomes the worked example in the one-chatbox
  copy.
- **FPS chip (F9)** — the same perf-toggle key pito web and pito-tui already
  use, now on the landing site. Nothing exists in the DOM and no rAF loop
  runs until the first press; a second press stops the loop and hides the
  chip. Reads the active theme's tokens so it fits whatever section sits
  under it at toggle time.

### Changed

- **Voyage retires from the pitch — "It runs on your box."** — the pinned
  scrollytelling beat, the "V" ColorBridge splash (now "local AI" / "your
  box. your data. no bill."), the README's stack blurb, and most internal
  comments that named Voyage retext around a 300-million-parameter
  embedding model that ships inside the stack: no API key, no per-call
  bill, no data leaving the server. (A handful of leftover comments
  survived this sweep — see [Unreleased].)
- **"It does the homework. You sign it."** — the games ↔ videos beat drops
  the pure explicit-link framing for suggest-then-confirm: a new vid's
  title gets read the way you would (an MK2 vid stays an MK2 vid, not
  MK1), Pito proposes the link, one confirm wires it — it still never
  links on its own.
- **"Speak your language."** replaces "Just say what you want." — the
  one-chatbox slide's copy now covers the confirm-first behavior: when
  Pito is sure, it answers and shows the command it understood; when it
  isn't, it asks first.
- **One channel, not six** — consolidated to the single **@gmrdad82**
  ("Gamer Dad - Stories"): the retired sub-channel avatars and links are
  gone from the README and the site's channel row, and the ColorBridge
  splash glyph is now **"AI"** (was the leftover "V").
- **The shelf wall shows 15 covers** (was 11) — a wider random draw from
  the cover pool.
- **Footer social buttons pick up the CTA hover** — YouTube / X / Discord
  now fill solid purple with the same glow as the "Watch the tour" button.

## [1.3.1] — 2026-07-12

### Changed

- **The terminal loop, second take** — re-captured against pito-tui
  2.1.0: the natural star sky, faster AI chrome, and the unified modal
  cursor, with the shell-launch frames cut so the loop opens inside
  the client (18.9s, same anti-flicker encoding).

## [1.3.0] — 2026-07-12

### Added

- **The terminal slide** — pito-tui 2.0.0 gets its own stop before the
  finale: a looping capture of the real client (starfield boot, braille
  analytics blooming in color, the game picker) with the pitch it
  earns — close the browser, keep the command deck. Rail label
  "Terminal", between "Free" and "Get Pito".

## [1.2.0] — 2026-07-12

### Added

- **Cover story** — the randomized 66-cover slot system, the AI rail
  stop, and the reversed-V reveal into "Your shelf" (backfilled entry;
  the v1.2.0 tag shipped without its changelog heading).

### Fixed

- **Tag deploys reach production** — a tag checkout is a detached HEAD, so
  wrangler filed the deploy as a "head"-branch preview and pitomd.com kept the
  old build; the deploy now pins `--branch=main`.
- **Deploys are strictly CI-gated** — the Deploy workflow refuses to ship a
  tag until that exact commit has a green Website CI run.

## [1.1.0] — 2026-07-10

### Added

- **"Your AI" (MCP) slide** — introduces Pito's read-only MCP connector: point an
  AI chat client (Claude on your phone, ChatGPT, any MCP client) at your instance
  and it reads your library, approved by your TOTP code. Shows the OAuth consent
  screen; links to GitHub for setup.
- **Randomised cursor moods** — every refresh assigns each section a random
  cursor effect from eight: glow and ripple (CSS/DOM) plus six WebGL ones —
  water, a stable-fluids dye, domain-warp plasma, gooey metaballs, an ASCII
  halftone of the cover, and a chromatic refraction lens. No two adjacent
  sections match, and the image-sampling effects (water/halftone/lens) only land
  where a cover exists. A lazy GPU manager creates a WebGL context only when a
  section nears the viewport and releases it when it scrolls away, so never more
  than a couple are live at once.
- **Cover-art backgrounds** — every section now carries a distinct game-cover
  backdrop, no two neighbours sharing one.
- **Neon "black hole" cursor ring** — a 64px hollow ring with a slowly orbiting
  purple → pito-blue → pink gradient, a razor-thin solid rim and a soft inward
  decay. It is the sole cursor effect over the pinned steppers, the colour
  bridges, and the mood-less "Your AI" slide, and it now re-checks what is
  under the pointer on scroll (scroll-snap can move a zone under a stationary
  mouse).
- **Ambient drift on touch** — phones have no cursor, so the cursor-reactive
  WebGL moods now follow a slow autonomous drift instead of sitting frozen.
- **Caption plates** — on slides where a cover-sampling effect is live, the
  copy sits on translucent YouTube-caption-style plates so it stays readable
  over the art; the right-rail nav gets a matching backing strip and label
  chips (active label in pito-blue, all labels one size, one label at a time).

### Changed

- **Every circle speaks neon** — the lens mood's fat solid-blue rim became a
  thin (~3px) rotating neon edge that fades inward until the refracted art
  shows through (and the lens grew to 200px); the cursor ring and the ripple
  rings share the same hollow purple→blue→pink profile, the ripples keeping
  their watery halo; the halftone dots blend purple → pito-blue across the
  frame instead of flat blue.
- **Glow is glow by itself** — the pointer spotlight used to shine on every
  section regardless of its mood (so ripple slides glowed too); it now exists
  only on slides whose mood is glow.
- **Ambient fx now pay for themselves** — settled water fully freezes (zero
  GPU) until the next ripple, splashes are rate-capped and waves die fast, the
  water sim runs a leaner grid, and the pointer pipeline batches every layout
  read before any style write (no more per-element reflows while the cursor
  moves).

### Fixed

- Typewriter headings reserve their finished height before typing, so the copy
  below no longer jumps down line by line.
- Missing spaces around inline command chips ("manual `footage`",
  "`link` / `unlink`", "exactly one channel").
- Vertical rhythm opened up on the price, shinies, and footage slides.

- **Merged "Plain language" into "One chatbox"** — one slide instead of two that
  said much the same thing; keeps the plain-language GIF and messaging.
- **Deploy is now tag-gated** — a release ships only when a `v*.*.*` tag is pushed,
  not on every push to main (main pushes still run the full Website CI).
- Upgraded Astro 7.0.2 → 7.0.7.

## [1.0.0] — 2026-06-25

- Initial public launch of pitomd.com — the scroll-driven Pito showcase.
