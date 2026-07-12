# Changelog

All notable changes to the pitomd.com landing site are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/); the site aims for
[Semantic Versioning](https://semver.org/). Releases ship to Cloudflare Pages
only when a `v*.*.*` tag is pushed (pushes to main are CI-validated but do not
deploy).

## [1.3.0] — 2026-07-12

### Added

- **The terminal slide** — pito-tui 2.0.0 gets its own stop before the
  finale: a looping capture of the real client (starfield boot, braille
  analytics blooming in color, the game picker) with the pitch it
  earns — close the browser, keep the command deck. Rail label
  "Terminal", between "Free" and "Get PITO".

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

- **"Your AI" (MCP) slide** — introduces PITO's read-only MCP connector: point an
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

- Initial public launch of pitomd.com — the scroll-driven PITO showcase.
