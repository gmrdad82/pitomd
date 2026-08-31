---
name: web-dev
description: Building on the Astro showcase stack — sections, fx islands, themes, and the capture-and-measure bar for anything visual.
triggers: [new section, fx work, layout change, styling, performance]
---

# Web dev

## Project context

The site is a marketing canvas built from Pito's ingredients (palette, fx,
mono texture as accent) — big display type carries each frame; it is not a
14px terminal grid. The map, stack rules, and verification gauntlet live in
`AGENTS.md`.

## Conventions

- A new frame is a `Section.astro` with its own `data-theme`; contract
  tests pin section-id uniqueness — extend them with the section.
- Fx are standalone vanilla modules under `src/scripts/`: CSS-first
  (scroll-snap, `animation-timeline`), IntersectionObserver fallback, and a
  clean static frame under `prefers-reduced-motion` — all three states
  checked, not assumed.
- Heavy media lazy-loads; no layout shift; real `alt` text; semantic HTML —
  the Lighthouse gate enforces what the marketing-page bar promises.
- **Capture and measure before handover**: render the change, screenshot at
  desktop and a narrow viewport, and check the frame against its siblings —
  spacing rhythm, type scale, theme cascade. A visual change without
  captures is unfinished.
- Colors come from the token layer; a hex written in a component belongs in
  `src/styles/` tokens.

## Anti-patterns

- Importing anything from the pito checkout at build time.
- An fx island that assumes JS (no reduced-motion/no-JS fallback).
- Hardcoding `pitomd.com` in a template.
- Adding a framework for a section vanilla could carry.
