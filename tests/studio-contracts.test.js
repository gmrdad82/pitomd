// studio-contracts.test.js — content-preservation guards for the PARKED
// Pito Studio showcase.
//
// F4 (GOAL 1 estate freeze) parked this page: it moved from src/pages/
// studio.astro to src/parked/studio.astro (out of pages/, so Astro no
// longer builds it as a route) until Pito Studio actually ships. Its
// content is preserved verbatim, so every non-routing contract below still
// holds against the parked file. The routing/SEO tests that assumed a LIVE
// /studio (cross-page links, the sitemap entry) are gone — there is no live
// route to assert them against; they return the day this page is unparked.
//
// Same discipline as chat-contracts.test.js (read the source as TEXT,
// assert the invariants that bite): its OWN fx contract, its own pricing
// law and its own placeholder discipline — none of which the chat tests
// cover.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const studio = read("src/parked/studio.astro");
const webgl = read("src/scripts/fx-webgl.js");
const base = read("src/layouts/Base.astro");

describe("sections", () => {
  test("every /studio section id is unique", () => {
    const ids = [
      ...studio.matchAll(/^\s*id="([a-z-]+)"|<Section\s+id="([a-z-]+)"/gm),
    ]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(8);
  });

  test("the load-bearing slides exist (H3/H3a/H3b)", () => {
    for (const id of [
      "hero",
      "pipeline",
      "nobody-else",
      "once",
      "price",
      "get",
    ]) {
      expect(studio, `missing #${id}`).toMatch(new RegExp(`id="${id}"`));
    }
    // The "Once." bridge is the Studio answer to chat's Zero. (H3a).
    expect(studio).toContain('text="Once."');
  });

  test("each data-scrolly block declares --steps matching its real step count", () => {
    const blocks = studio
      .split(/<section\s/)
      .filter((b) => b.includes("data-scrolly"));
    expect(blocks.length).toBeGreaterThanOrEqual(2); // pipeline + nobody-else
    for (const block of blocks) {
      const declared = Number(block.match(/--steps:\s*(\d+)/)?.[1]);
      const actual = (block.match(/data-scrolly-step/g) || []).length;
      expect(declared).toBe(actual);
    }
  });
});

describe("the /studio fx contract (H3: plasma / following circle / duotone)", () => {
  test("every pinned mood is plasma or duotone — nothing else, ever", () => {
    const moods = [...studio.matchAll(/data-cursor="([a-z-]+)"/g)].map(
      (m) => m[1],
    );
    expect(moods.length).toBeGreaterThanOrEqual(4);
    for (const mood of moods) {
      expect(["plasma", "duotone"], `illegal mood "${mood}"`).toContain(mood);
    }
  });

  test("moods are author-pinned (stable keys), never a random draw", () => {
    // The page stamps data-cursor in its own markup; if the runtime
    // randomiser still exists it must skip pre-stamped sections rather than
    // overwrite them.
    expect(studio).toContain('data-cursor="plasma"');
    expect(studio).toContain('data-cursor="duotone"');
    const randomPath = join(ROOT, "src/scripts/fx-random.js");
    if (existsSync(randomPath)) {
      const rnd = readFileSync(randomPath, "utf8");
      expect(
        rnd,
        "fx-random.js must respect author-pinned data-cursor",
      ).toContain('getAttribute("data-cursor")');
    }
  });

  test("both renderers exist in fx-webgl.js and are registered", () => {
    expect(webgl).toContain("function plasma(");
    expect(webgl).toContain("function duotone(");
    expect(webgl).toMatch(/const RENDERERS = \{[^}]*plasma[^}]*\}/);
    expect(webgl).toMatch(/const RENDERERS = \{[^}]*duotone[^}]*\}/);
    // duotone samples the section cover, so it must be cover-gated.
    expect(webgl).toMatch(/NEEDS_COVER = new Set\(\[[^\]]*"duotone"/);
  });

  test("every duotone section carries its cover-bed (the renderer samples it)", () => {
    // Split on <Section and check each duotone block mentions a cover-bed.
    const blocks = studio.split(/<Section\s/).slice(1);
    for (const block of blocks) {
      if (!block.includes('data-cursor="duotone"')) continue;
      expect(
        block.includes("cover-bed"),
        "duotone section without a .cover-bed",
      ).toBe(true);
    }
  });

  test("the following circle rides the multi-sub-step rail stops (ring zones)", () => {
    // The steppers are .scrolly blocks — cursor.js ring zones. Pin that the
    // page has them and that cursor.js still treats .scrolly as a ring zone.
    expect(studio).toMatch(/class="scrolly"/);
    expect(read("src/scripts/cursor.js")).toContain(".scrolly");
  });

  test("text fx stay within the shared vocabulary", () => {
    const known = new Set(["comet", "typewriter", "scramble"]);
    for (const [, v] of studio.matchAll(/data-fx="([a-z-]+)"/g)) {
      expect(known.has(v), `unknown data-fx "${v}"`).toBe(true);
    }
  });

  test("every data-reveal variant has a CSS rule", () => {
    const css = ["global.css", "bold.css", "fx.css", "components.css"]
      .map((f) => read(`src/styles/${f}`))
      .join("\n");
    for (const [, v] of new Set(studio.matchAll(/data-reveal="([a-z-]+)"/g))) {
      expect(
        css.includes(`[data-reveal="${v}"]`),
        `no CSS for data-reveal "${v}"`,
      ).toBe(true);
    }
  });
});

describe("pricing law (H3b + P13)", () => {
  test("the two fixed prices are stated, plainly and only as €89 / $99", () => {
    expect(studio).toContain("€89");
    expect(studio).toContain("$99");
    // No other euro/dollar price may appear — the pair is fixed everywhere.
    for (const [m] of studio.matchAll(/[€$]\s?\d+/g)) {
      expect(["€89", "$99"], `stray price "${m}"`).toContain(
        m.replace(" ", ""),
      );
    }
  });

  test("the page says updates, never the s-word", () => {
    expect(/\bupdate/i.test(studio)).toBe(true);
    expect(
      /\bsupports?\b|\bsupported\b|\bsupport\b/i.test(studio),
      "the word 'support' must not appear in Studio copy (P13)",
    ).toBe(false);
  });

  test("the entitlement is stated: every 5.x, forever, no subscription", () => {
    expect(studio).toMatch(/every 5\.x/i);
    expect(studio).toMatch(/no subscription/i);
  });

  test("no currency scramble on this page — the price block stays fixed", () => {
    // data-cur is the chat page's scramble hook (currency.js). The fixed
    // €89/$99 block must never sit under a cycling symbol (H3b). Word-bounded
    // so the page's data-cursor fx stamps don't false-positive.
    expect(/\bdata-cur\b/.test(studio)).toBe(false);
  });

  test("Linux + NVIDIA are presented, with sourced brand assets", () => {
    expect(studio).toMatch(/Linux/);
    expect(studio).toMatch(/NVIDIA/);
    for (const asset of ["brands/tux.svg", "brands/nvidia.svg"]) {
      expect(existsSync(join(ROOT, "public", asset)), `missing ${asset}`).toBe(
        true,
      );
      // Each shipped brand asset carries its licence note inline.
      const svg = read(`public/${asset}`);
      expect(/trademark/i.test(svg), `${asset} lacks a licence note`).toBe(
        true,
      );
    }
  });
});

describe("content preserved while parked (H4 remnants)", () => {
  test("the page's own way-back pill markup survives the move (content preservation)", () => {
    // Not a live routing assertion (no page currently links TO this parked
    // file) — just pinning that the CrossNav markup itself wasn't dropped
    // in the move, so unparking is a routing fix, not an archaeology dig.
    expect(studio).toContain("CrossNav");
  });

  test("distinct titles + descriptions per route", () => {
    expect(studio).toMatch(/const TITLE = "Pito Studio[^"]*"/);
    expect(studio).toMatch(/const DESCRIPTION =/);
    // Base's defaults are the chat card; /studio must pass its own.
    expect(studio).toMatch(/<Base[^>]*\s+title=\{TITLE\}/s);
    expect(studio).toMatch(/description=\{DESCRIPTION\}/);
  });

  test("Base.astro supports per-route og:image + JSON-LD overrides", () => {
    expect(base).toContain("ogImage");
    expect(base).toMatch(/jsonLd\s*\?\?|Astro\.props\.jsonLd/);
    expect(studio).toContain("jsonLd={jsonLd}");
  });

  test("the /studio JSON-LD sells the paid product, both currencies", () => {
    expect(studio).toContain('"Pito Studio"');
    expect(studio).toMatch(/price: "89"[\s\S]*?priceCurrency: "EUR"/);
    expect(studio).toMatch(/price: "99"[\s\S]*?priceCurrency: "USD"/);
    expect(studio).toMatch(/operatingSystem: "Linux/);
  });

  test("the page's own canonical-URL construction survives the move", () => {
    // Content preservation, not a live sitemap assertion (parked — see
    // public/sitemap.xml, which now covers only / and /chat).
    expect(studio).toContain('new URL("/studio/", Astro.site)');
  });

  test("semantic headings: exactly one h1, real h2 sections", () => {
    expect((studio.match(/<h1[\s>]/g) || []).length).toBe(1);
    expect((studio.match(/<h2[\s>]/g) || []).length).toBeGreaterThanOrEqual(6);
  });
});

describe("assets + placeholder discipline (captures are a later phase)", () => {
  test("every referenced public asset exists", () => {
    const refs = new Set(
      [
        ...studio.matchAll(
          /(?:src="|--cover:url\(')(\/(?:media|covers|logo|social|brands|coin)\/[^"')]+)/g,
        ),
      ].map((m) => m[1]),
    );
    expect(refs.size).toBeGreaterThanOrEqual(5);
    for (const ref of refs) {
      expect(
        existsSync(join(ROOT, "public", ref)),
        `missing public${ref}`,
      ).toBe(true);
    }
  });

  test("no premature Studio screenshots — placeholders only", () => {
    // Captures land in a later phase; until then the page may not point an
    // <img> at any not-yet-captured studio media.
    expect(studio).not.toMatch(/src="\/media\/(?:studio|mkt-studio)/);
    // …and the placeholders are the loud, marked kind.
    expect(
      (studio.match(/data-capture="/g) || []).length,
    ).toBeGreaterThanOrEqual(4);
    expect(studio).toContain("shot-todo");
  });

  test("the hero ticker names the real pipeline steps, twice (seamless loop)", () => {
    const ticker = studio.slice(studio.indexOf('class="ticker"'));
    expect(ticker).toContain("Array.from({ length: 2 })");
    for (const step of ["probe", "whisper", "review", "encode"]) {
      expect(ticker).toContain(`>${step}<`);
    }
  });

  test("recordings, never footage — Studio's vocabulary", () => {
    // Scope to the rendered template: the frontmatter comment is allowed to
    // NAME the banned word while stating the rule.
    const body = studio.slice(studio.indexOf("---", 3) + 3);
    expect(/\bfootage\b/i.test(body)).toBe(false);
    expect(/recordings/i.test(body)).toBe(true);
  });

  test("the E7 YouTube walkthrough is on the download page, and says optional", () => {
    // The download page is one of the three surfaces (with `pito --help`
    // and the doctor row) that must explain YouTube-upload setup; the
    // sentences mirror pito-tui's internal/studio/youtube/setup.go.
    expect(studio).toContain('id="youtube-setup"');
    expect(studio).toContain("Uploading to YouTube is optional.");
    for (const step of [
      "Sign in to Google Cloud",
      "Make a project",
      "Turn on YouTube Data API v3",
      "Fill in the consent screen",
      "Create the credentials",
      "Paste them into Pito",
      "Sign in once",
    ]) {
      expect(studio, `missing setup step "${step}"`).toContain(step);
    }
    expect(studio).toContain("https://console.cloud.google.com/");
    // The quota rationale keeps its real numbers (10000 / 1600 / 6).
    expect(studio).toMatch(/10000 units[\s\S]*?1600 of them/);
  });

  test("keyboard labels are words (shift+tab, enter), not glyphs", () => {
    // R1 reversal: shortcut labels are words; only the four arrows may stay
    // glyphs. No ⌃/⇧/⌘/⏎ chips on this page.
    expect(/[⌃⇧⌘⏎⎋]/.test(studio)).toBe(false);
    expect(studio).toContain("shift+tab");
  });
});
