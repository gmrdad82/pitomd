// chat-contracts.test.js — static contract guards for the /chat showcase
// page (renamed from contracts.test.js/index.astro when F4's estate freeze
// moved the chat showcase off the root route — see countdown.test.js and
// index-contracts.test.js for the new `/` teaser).
//
// No browser, no visual snapshots: these read the source (chat.astro, the
// stylesheets, Base.astro, public/) as TEXT and assert the invariants that
// have actually bitten us — fx typos, scrolly step-count drift, media renames,
// unwired scripts — so a refactor can't silently break the page.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const chat = read("src/pages/chat.astro");
const base = read("src/layouts/Base.astro");
const css = ["global.css", "bold.css", "fx.css", "components.css"]
  .map((f) => read(`src/styles/${f}`))
  .join("\n");

describe("sections", () => {
  test("every section id is unique", () => {
    const ids = [
      ...chat.matchAll(/^\s*id="([a-z-]+)"|<Section id="([a-z-]+)"/gm),
    ]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  test("the load-bearing slides exist", () => {
    for (const id of ["hero", "different", "voyage", "get"]) {
      expect(chat).toMatch(new RegExp(`id="${id}"`));
    }
  });
});

describe("the 5.0.0 rail (chat showcase, fat cut — H2)", () => {
  test("exactly EIGHT rail stops, by name, in order (16 → 8, the ~50% cut)", () => {
    // A rail dot exists per section[data-nav-label] (railnav.js).
    // Section.astro stamps data-nav-label from a non-empty label prop;
    // wrapper <section>s carry it literally. Pin both forms, in page order
    // (the lookbehind keeps aria-label and data-copy-label out; the
    // CrossNav pill also takes a `label` prop for its own pill text — F4
    // strips its self-closing tag first so that doesn't false-positive.
    // The strip must tolerate `>` INSIDE quoted attribute values: the
    // seller pill's label is "Pito Studio ->", and a naive [^>]* stops
    // right there, leaks the label, and miscounts the rail).
    const noCrossNav = chat.replace(/<CrossNav\b(?:[^>"]|"[^"]*")*\/>/g, "");
    const labels = [
      ...noCrossNav.matchAll(/(?:data-nav-label|(?<![\w-])label)="([^"]+)"/g),
    ]
      .map((m) => m[1])
      .filter((l) => l.length > 0);
    expect(labels).toEqual([
      "Start",
      "One chatbox",
      "AI",
      "Your library",
      "Not even Studio",
      "Keep shipping",
      "Zero.",
      "Get Pito",
    ]);
  });

  test("the condensed slides live on as sub-slides (owner keep-list intact)", () => {
    // The keep-list: the AI slide, "Not even studio", Zero., Games↔Videos↔
    // Channels (linkage) and Track the footage all survive — restructured
    // into sub-steps, not cut.
    for (const id of [
      "ai-chat",
      "mcp",
      "search-type",
      "search-vibe",
      "library",
      "linkage",
      "footage",
      "price",
      "schedule",
      "shinies",
    ]) {
      expect(chat, `sub-slide ${id} missing`).toMatch(new RegExp(`id="${id}"`));
    }
    expect(chat).toContain("Games &lt;-> Videos &lt;-> Channels.");
    expect(chat).toContain("Track the footage.");
    expect(chat).toContain('text="Zero."');
  });

  test("the cut slides are really gone: pain (H1), terminal client (P4), themes (F2)", () => {
    expect(chat).not.toContain("Log out. Log in. Repeat. Forever.");
    expect(chat).not.toMatch(/id="pain"/);
    expect(chat).not.toMatch(/id="tui"/);
    expect(chat).not.toContain("pito-tui-loop.gif");
    expect(chat).not.toMatch(/id="themes"/);
    expect(chat).not.toContain("Nineteen themes");
    expect(chat).not.toContain("data-theme-cycle");
  });

  test("links: /studio gone (parked, F4), sponsor (P6) and the pito-tui repo (P5) out", () => {
    // Pito Studio's showcase is parked (src/parked/studio.astro, unrouted)
    // until it ships — this page must not link a dead /studio anymore.
    // Scoped to the rendered template — the frontmatter comment is allowed
    // to NAME /studio while explaining that it's parked.
    const body = chat.slice(chat.indexOf("---", 3) + 3);
    expect(body).not.toContain("/studio");
    expect(chat).not.toContain("github.com/gmrdad82/pito-tui");
    expect(chat).not.toContain("github.com/sponsors");
  });

  test("the way back: a top-left CrossNav pill to /", () => {
    expect(chat).toContain("CrossNav");
    expect(chat).toMatch(/href=\{HOME\}|href="\/"/);
    expect(chat).toContain('position="top-left"');
  });

  test("the four purged renderers never come back (H1: fluid, metaballs, halftone, lens)", () => {
    const webgl = read("src/scripts/fx-webgl.js");
    for (const fx of ["fluid", "metaballs", "halftone", "lens"]) {
      expect(webgl, `purged renderer ${fx} resurfaced`).not.toContain(
        `function ${fx}(`,
      );
    }
    // glow went with the cull — no CSS rule, no spotlight machinery.
    expect(css).not.toContain('[data-cursor="glow"]');
    expect(read("src/scripts/pointer.js")).not.toContain('"is-hot"');
  });
});

describe("stable-key covers (P24 — randomness is the enemy of caching)", () => {
  test("the cover deal is seeded by the UTC day, never Math.random", () => {
    const slots = read("src/scripts/cover-slots.js");
    expect(slots).toContain("seededRand");
    expect(slots).not.toContain("Math.random");
    expect(slots).toContain("toISOString().slice(0, 10)");
  });
});

describe("pinned scrollytelling", () => {
  test("each data-scrolly block declares --steps matching its real step count", () => {
    const blocks = chat
      .split(/<section\s/)
      .filter((b) => b.includes("data-scrolly"));
    expect(blocks.length).toBeGreaterThanOrEqual(2); // voyage + not-even-studio
    for (const block of blocks) {
      const declared = Number(block.match(/--steps:\s*(\d+)/)?.[1]);
      const actual = (block.match(/data-scrolly-step/g) || []).length;
      expect(declared).toBe(actual);
    }
  });
});

describe("fx vocabulary", () => {
  test("every data-fx value is one reveal.js implements", () => {
    const known = new Set(["comet", "typewriter", "scramble"]);
    for (const [, v] of chat.matchAll(/data-fx="([a-z-]+)"/g)) {
      expect(known.has(v), `unknown data-fx "${v}"`).toBe(true);
    }
  });

  test("every data-reveal variant has a CSS rule", () => {
    for (const [, v] of new Set(chat.matchAll(/data-reveal="([a-z-]+)"/g))) {
      expect(
        css.includes(`[data-reveal="${v}"]`),
        `no CSS for data-reveal "${v}"`,
      ).toBe(true);
    }
  });

  test("the stamped cursor moods + fx islands are wired (5.0.0 cull)", () => {
    const webgl = read("src/scripts/fx-webgl.js");
    // The 5.0.0 fx cull (owner ruling): the chat keeps exactly three fx —
    // water, the following circle (cursor ring) and circle ripples. Moods
    // are STAMPED IN THE MARKUP as stable keys; the runtime randomiser
    // (fx-random.js) is deleted, so variation derives from a section's
    // identity, never a draw at render — that is what makes the page
    // cacheable (P24).
    expect(existsSync(join(ROOT, "src/scripts/fx-random.js"))).toBe(false);
    expect(base).not.toContain("scripts/fx-random.js");

    // The chat may stamp only the culled pair; every stamped WebGL mood has
    // a renderer, and no two ADJACENT stamps repeat (the old adjacency rule,
    // now an authoring rule).
    const moods = [...chat.matchAll(/data-cursor="([a-z-]+)"/g)].map(
      (m) => m[1],
    );
    expect(moods.length).toBeGreaterThanOrEqual(4);
    for (const mood of moods) {
      expect(["water", "ripple"], `illegal chat mood "${mood}"`).toContain(
        mood,
      );
    }
    for (let i = 1; i < moods.length; i++) {
      expect(moods[i], `adjacent repeat at stamp ${i}`).not.toBe(moods[i - 1]);
    }
    expect(webgl).toContain("function water(");
    // plasma + duotone stay in the engine for /studio's fx contract (H3) —
    // studio-contracts.test.js owns their wiring; here we only pin that the
    // chat never stamps them (checked above via the allow-list).
    expect(webgl).toMatch(/const RENDERERS = \{[^}]*water[^}]*\}/);

    // A `.scrolly` stepper NEVER gets a mood: it is multi-viewport tall, and
    // an fx-canvas sized to it builds a monster canvas that blanks the GPU.
    for (const block of chat.split(/<section\s/)) {
      if (block.includes("data-scrolly")) {
        expect(
          block.slice(0, block.indexOf(">")),
          "a stepper may not carry data-cursor",
        ).not.toContain("data-cursor");
      }
    }

    // Drivers are styled + loaded.
    expect(css).toContain(".fx-ripple");
    expect(css).toContain(".fx-canvas");
    expect(base).toContain("scripts/fx-webgl.js");
    expect(base).toContain("scripts/cursor.js");

    // #mcp opts out of a mood — mood-less, ring-zone only.
    expect(chat).toContain("data-fx-none");
    // The ring shows over steppers, bridges, AND data-fx-none sections.
    const cursor = read("src/scripts/cursor.js");
    expect(cursor).toContain(".scrolly, .bridge, [data-fx-none]");
    // The all-section pointer spotlight (BR3) stays gone.
    expect(read("src/styles/bold.css")).not.toContain(
      ".section.is-hot::before",
    );
  });

  test("the currency scramble stays wired (owner constraint)", () => {
    expect(chat).toContain("data-cur");
    expect(base).toContain("scripts/currency.js");
  });

  test("all fx respect prefers-reduced-motion somewhere", () => {
    expect(read("src/styles/fx.css")).toContain("prefers-reduced-motion");
    expect(read("src/styles/bold.css")).toContain("prefers-reduced-motion");
  });
});

describe("assets", () => {
  test("every referenced /media, /covers, /logo, /social file exists in public/", () => {
    const refs = new Set(
      [
        ...chat.matchAll(
          /(?:src="|--cover:url\(')(\/(?:media|covers|logo|social)\/[^"')]+)/g,
        ),
      ].map((m) => m[1]),
    );
    expect(refs.size).toBeGreaterThan(20);
    for (const ref of refs) {
      expect(
        existsSync(join(ROOT, "public", ref)),
        `missing public${ref}`,
      ).toBe(true);
    }
  });

  test("the hero ticker track holds exactly two copies of the sequence (seamless -50% loop)", () => {
    const ticker = chat.slice(chat.indexOf('class="ticker"'));
    expect(ticker).toContain("Array.from({ length: 2 })");
  });
});

describe("script islands", () => {
  test("every src/scripts file is loaded by Base.astro, or by its own documented page-scoped layout", () => {
    // guide-theme.js is the one deliberate exception (owner restyle order,
    // 2026-07-30): /guides got its own style/script domain, separate from
    // the site-wide fx shell, so its light/dark toggle script is wired
    // from GuideLayout.astro instead of Base.astro — loading it globally
    // would ship dead code to every other route for a button that only
    // exists on /guides pages.
    const guideLayout = read("src/layouts/GuideLayout.astro");
    const saidLayout = read("src/layouts/SaidLayout.astro");
    const pageScoped = {
      "guide-theme.js": guideLayout,
      "said-reveal.js": saidLayout,
    };

    for (const f of readdirSync(join(ROOT, "src/scripts"))) {
      const owner = pageScoped[f] ?? base;
      const ownerLabel = pageScoped[f]
        ? "its page-scoped layout"
        : "Base.astro";
      expect(
        owner.includes(`scripts/${f}`),
        `${f} not wired in ${ownerLabel}`,
      ).toBe(true);
    }
  });
});

describe("fx perf budgets", () => {
  test("plasma's fbm octave x call-site product stays within budget (owner: halved plasma's per-pixel cost, 2026-07-19)", () => {
    const webgl = read("src/scripts/fx-webgl.js");
    const fragStart =
      webgl.indexOf("`", webgl.indexOf("const PLASMA_FRAG")) + 1;
    const plasma = webgl.slice(fragStart, webgl.indexOf("`;", fragStart));

    // Octave loop bound comes from a documented `const int OCTAVES = N;`
    // feeding `for (int i = 0; i < OCTAVES; i++)` (was a bare `< 5`).
    expect(plasma).toContain("for (int i = 0; i < OCTAVES; i++)");
    const octaves = Number(plasma.match(/const int OCTAVES = (\d+);/)?.[1]);
    expect(octaves, "OCTAVES const not found").toBeGreaterThan(0);

    // Every `fbm(` in the frag shader is either the one function
    // definition (`float fbm(vec2 p) {`) or a per-pixel call site.
    const fbmMentions = (plasma.match(/\bfbm\(/g) || []).length;
    const fbmCallSites = fbmMentions - 1;
    expect(fbmCallSites).toBeGreaterThan(0);

    // Budget: (call sites * OCTAVES) <= 12 octave-units/pixel — was 5 fbm
    // calls (q.x, q.y, r.x, r.y, n) * 5 octaves = 25. A future edit that
    // re-inflates either factor past this product regresses the perf work;
    // fix the arithmetic or re-raise the budget with the owner's OK.
    expect(fbmCallSites * octaves).toBeLessThanOrEqual(12);
  });
});

// The fluid + metaballs perf-budget guards left with their renderers — the
// 5.0.0 fx cull deleted both effects outright; only water and plasma (and
// /studio's duotone) remain, and plasma's budget is pinned above.

describe("pointer + cursor work gates", () => {
  test("pointer.js and cursor.js cap rAF work + gate micro-movement (owner: sample the mouse less aggressively, 2026-07-19)", () => {
    const pointer = read("src/scripts/pointer.js");
    const cursor = read("src/scripts/cursor.js");

    // Work-rate gate: onFrame/onMove used to run on every rAF (display
    // refresh, up to 120fps) — both now check a named min-interval const,
    // skipping + re-queueing when early, before any layout read / hit-test
    // / style write.
    expect(pointer).toContain("const POINTER_WORK_MIN_MS =");
    expect(cursor).toContain("const CURSOR_WORK_MIN_MS =");

    // Distance gate: sub-pixel gaming-mouse jitter (up to 1000Hz) is
    // dropped in the pointermove handler itself, before it can queue a
    // frame at all.
    expect(pointer).toContain("const POINTER_MOVE_MIN_DELTA_PX =");
    expect(cursor).toContain("const CURSOR_MOVE_MIN_DELTA_PX =");

    // Discrete events (pointerdown splash, pointerleave ring-hide) stay
    // instant — gating applies only to the high-frequency move stream.
    expect(cursor).toContain('"pointerdown"');
    expect(cursor).toContain('"pointerleave"');
  });
});
