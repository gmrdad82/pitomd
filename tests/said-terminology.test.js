// said-terminology.test.js — guards the Said and Done. product vocabulary
// (owner rulings, 2026-09-01) across every surface that speaks about the app:
// blog posts, the post template, landing/tour/buy/download/guide pages, and
// the Said* components and layouts. The concepts are Notebook, Chapter,
// Page — capitalized. Remarks on a Page split by author: a person leaves a
// Thought, an agent leaves an Update; "comments", "threads", "cards", and
// "Note" are all retired. Lowercase "notes"/"note" stays legal (the
// reader's own markdown files), so only unambiguous words are checked here.
import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function walk(dir, filter) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, filter);
    return filter.test(entry.name) ? [path] : [];
  });
}

const surfaces = [
  ...walk(join(root, "src", "content", "said-blog"), /\.md$/),
  join(root, "src", "data", "blog-post-template.md"),
  ...walk(join(root, "src", "pages", "said-and-done"), /\.astro$/),
  ...walk(join(root, "src", "components"), /^Said.*\.astro$/),
  ...walk(join(root, "src", "layouts"), /^Said.*\.astro$/),
].filter((f) => existsSync(f));

// Prose only: HTML comments are author-facing, <style>/<script> blocks are
// code (blanked, not cut, so line numbers in failure messages stay true).
function prose(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/\S/g, " "))
    .replace(/<style[\s\S]*?<\/style>/g, (m) => m.replace(/\S/g, " "))
    .replace(/<script[\s\S]*?<\/script>/g, (m) => m.replace(/\S/g, " "));
}

// Lowercase "page" survives only in its website sense, never the product's —
// and aria-current="page" is an HTML-mandated literal, not prose.
const GENERIC_PAGE =
  /\b(?:slug|landing|web|home|this) pages?\b|\bthe page open\b|aria-current/;

const rules = [
  { pattern: /\bnotebooks?\b/, want: "Notebook — capitalized product term" },
  { pattern: /\bchapters?\b/, want: "Chapter — capitalized product term" },
  {
    pattern: /\bcomment(?:s|ed|ing)?\b/i,
    want: "Thought (a person's) or Update (an agent's) — never \"comments\"",
  },
  {
    pattern: /\bthreads?\b/i,
    want: 'Thoughts and Updates — the product has no "threads"',
  },
  {
    // "Note" the remark is retired for Thought/Update (owner ruling,
    // 2026-09-01). Only mid-sentence uses are flagged — the fixed-length
    // lookbehind spares sentence-initial "Note the ..." and the blog's
    // "Notes from the desk" heading, where notes means writings/files.
    pattern: /(?<=[a-z,;:—] )Notes?\b/,
    want: "Thought (a person's) or Update (an agent's) — \"Note\" is retired",
  },
  {
    // The app is one single glass experience — theme talk is a stale claim.
    pattern: /(?<!-)\bthemes?\b|\b(?:dark|light) mode\b/i,
    want: "no theme claims — Said and Done. is a single glass experience",
  },
  {
    // The UI object is a Page, not a "card" (owner ruling, 2026-09-01).
    // Hardware and payment senses stay legal; hyphenated CSS classes are
    // spared by the lookbehind/lookahead.
    pattern: /(?<!-)\bcards?\b(?!-)/i,
    want: 'Page — the product has no "cards"',
    unless: /graphics card|card details/,
  },
  {
    // The lookbehind spares hyphen-joined code identifiers (id="first-page").
    pattern: /(?<!-)\bpages?\b/,
    want: "Page — capitalized product term",
    unless: GENERIC_PAGE,
  },
  {
    // "board" is retired (owner ruling, 2026-09-01): the surfaces are the
    // desk and the record. Lookarounds spare shot filenames (board.png,
    // mcp-board, r-board-dark); "keyboard" never word-breaks before board.
    pattern: /(?<![-/])\bboards?\b(?!-|\.png)/i,
    want: 'desk or record — the product has no "board"',
    unless: /lost a board/,
  },
  {
    // Blog prose says "article", never "post" (owner ruling, 2026-09-01).
    // Markdown surfaces only — .astro templates use `post` as an identifier.
    pattern: /\bposts?\b/i,
    want: '"article" — blog prose never says "post"',
    md: true,
  },
];

describe("Said and Done. speaks its own vocabulary (owner ruling, 2026-09-01)", () => {
  test("the surfaces to guard exist", () => {
    expect(surfaces.length).toBeGreaterThan(0);
  });

  for (const rule of rules) {
    test(`every surface says ${rule.want.split(" — ")[0]}`, () => {
      const offenses = [];
      const scanned = rule.md
        ? surfaces.filter((f) => f.endsWith(".md"))
        : surfaces;
      for (const file of scanned) {
        const lines = prose(readFileSync(file, "utf8")).split("\n");
        lines.forEach((line, i) => {
          if (rule.unless && rule.unless.test(line)) return;
          if (rule.pattern.test(line))
            offenses.push(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
        });
      }
      expect(
        offenses,
        `use ${rule.want}; offending lines:\n${offenses.join("\n")}`,
      ).toEqual([]);
    });
  }
});
