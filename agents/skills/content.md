---
name: content
description: Landing pages, guides, and blog posts — showcase that wows, guides that actually help, SEO that earns curiosity.
triggers: [landing page, guide, blog post, copy, SEO]
---

# Content

## Project context

Three content jobs, one voice (the Pito estate canon — read it first):

1. **Showcase/tour landing pages** — over-the-top good-looking, per
   product: the visitor should feel "wow, this is cool" then "wow, I could
   use this". Spectacle first, hook second, link to get it third.
2. **Guides** — simple, easy to follow, genuinely helpful: one task per
   guide, numbered steps a non-technical reader can complete, screenshots
   where a step has a screen. No API documentation — that lives with the
   products.
3. **Blog posts** — interesting, SEO-minded, and honest: each post adds
   real value or scratches real curiosity, and earns its search ranking by
   answering the thing someone actually typed. The post's job is to give a
   reader justification and incentive to try a PITO product — never a
   thin ad.

## Conventions

- Every piece of copy is a PROPOSAL for the owner's validation — drafts
  ship as decks (location, current, proposed, one-line why where needed).
- SEO basics ride every page: one h1, descriptive title + meta description,
  OG tags via the layout, real headings a skimmer can navigate, internal
  links between guide ↔ landing ↔ post where they genuinely help.
- Brand casing law: "Pito" in prose; product names as the canon rules them.
- Product terminology (Said and Done.): the concepts are **Notebook,
  Chapter, Page** — capitalized in prose when naming the product concept.
  The signed remarks on a Page split by author: a person leaves a
  **Thought**, an MCP/AI agent leaves an **Update** (a mixed strip is
  "Thoughts and Updates"). Never "comments", never "threads", never
  "cards", and **"Note" is retired** — lowercase "notes" is the preferred
  word for the reader's own markdown files and means only that. Generic
  senses stay lowercase (a passing thought, software updates); never let
  a capitalized term share a sentence with its generic twin — reword.
  The app's surfaces are the desk, the record, the dossier, the case
  file, the finder, the Overview — never "board" (a fence may still lose
  a literal one). Blog prose says "article", never "post". This binds every
  Said and Done. surface in this repo — landing/tour, guides, download and
  buy pages, blog posts, and the Said components/layouts — and is enforced
  by `tests/said-terminology.test.js` (runs in `npx vitest run` and CI).
- Product design fact (Said and Done., owner ruling 2026-09-01): the app
  is one single glass experience — light/dark themes are long gone. Never
  claim theme switching or "dark mode"/"light mode"; screenshots showing
  the old themed UI are stale and need recapture, not re-description.
- Product behavior fact (Said and Done., owner ruling 2026-09-01): a
  permanent file watcher runs while the app does — the indexer keeps the
  index live and the filler keeps adjusting and filling Pages from it as
  notes change. Never claim reference scanning is one-shot ("at creation,
  once", "never rescanned"); the true invariants to lean on instead are
  restraint (nothing pinned below the confidence bar) and read-only files.
- Plain words for paying, non-technical readers; zero internal jargon;
  honest claims only — nothing a ride of the real product would contradict.

## Anti-patterns

- A guide that documents flags and internals instead of walking a task.
- Keyword-stuffed filler posts.
- Copy that promises support or features the products don't sell.
