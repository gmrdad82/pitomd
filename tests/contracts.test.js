// contracts.test.js — static contract guards for the showcase page.
//
// No browser, no visual snapshots: these read the source (index.astro, the
// stylesheets, Base.astro, public/) as TEXT and assert the invariants that
// have actually bitten us — fx typos, scrolly step-count drift, media renames,
// unwired scripts — so a refactor can't silently break the page.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const index = read("src/pages/index.astro");
const base = read("src/layouts/Base.astro");
const css = ["global.css", "bold.css", "fx.css", "components.css"]
  .map((f) => read(`src/styles/${f}`))
  .join("\n");

describe("sections", () => {
  test("every section id is unique", () => {
    const ids = [
      ...index.matchAll(/^\s*id="([a-z-]+)"|<Section id="([a-z-]+)"/gm),
    ]
      .map((m) => m[1] || m[2])
      .filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  test("the load-bearing slides exist", () => {
    for (const id of ["hero", "different", "voyage", "get"]) {
      expect(index).toMatch(new RegExp(`id="${id}"`));
    }
  });
});

describe("pinned scrollytelling", () => {
  test("each data-scrolly block declares --steps matching its real step count", () => {
    const blocks = index
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
    for (const [, v] of index.matchAll(/data-fx="([a-z-]+)"/g)) {
      expect(known.has(v), `unknown data-fx "${v}"`).toBe(true);
    }
  });

  test("every data-reveal variant has a CSS rule", () => {
    for (const [, v] of new Set(index.matchAll(/data-reveal="([a-z-]+)"/g))) {
      expect(
        css.includes(`[data-reveal="${v}"]`),
        `no CSS for data-reveal "${v}"`,
      ).toBe(true);
    }
  });

  test("the cursor-mood randomiser + fx islands are wired", () => {
    const rnd = read("src/scripts/fx-random.js");
    const webgl = read("src/scripts/fx-webgl.js");
    // The randomiser pool = the moods the site implements; keep all three
    // (fx-random POOL, fx-webgl RENDERERS, this list) in sync.
    const POOL = [
      "glow",
      "ripple",
      "water",
      "fluid",
      "plasma",
      "metaballs",
      "halftone",
      "lens",
    ];
    for (const fx of POOL)
      expect(rnd, `pool missing ${fx}`).toContain(`"${fx}"`);
    // Every WebGL mood has a renderer factory in the engine.
    for (const fx of [
      "water",
      "fluid",
      "plasma",
      "metaballs",
      "halftone",
      "lens",
    ]) {
      expect(webgl, `renderer missing ${fx}`).toContain(`function ${fx}(`);
    }
    // The following-circle clash rule (2026-07-20): ring zones (steppers /
    // opt-outs) join the adjacency walk as an implicit "ring" mood, and
    // lens — the only pool mood that reads as a following circle — may
    // neither follow nor precede one. Pin the pieces so a refactor can't
    // silently drop the rule.
    expect(rnd).toContain("RING_CLASH");
    expect(rnd).toContain('"lens"');
    expect(rnd).toContain("nextIsRing");
    expect(rnd, "ring zones must join the walk").toContain(
      '".section, .scrolly"',
    );
    // Drivers are styled + loaded, and the randomiser runs BEFORE the fx islands.
    expect(css).toContain('[data-cursor="glow"]');
    expect(css).toContain(".fx-ripple");
    expect(css).toContain(".fx-canvas");
    expect(base).toContain("scripts/fx-random.js");
    expect(base).toContain("scripts/fx-webgl.js");
    expect(base).toContain("scripts/cursor.js");
    expect(base.indexOf("scripts/fx-random.js")).toBeLessThan(
      base.indexOf("scripts/fx-webgl.js"),
    );
    expect(base.indexOf("scripts/fx-random.js")).toBeLessThan(
      base.indexOf("scripts/cursor.js"),
    );
    // The randomiser owns moods now — no hardcoded data-cursor in the markup.
    expect(index).not.toContain("data-cursor=");
    // Steppers and [data-fx-none] opt-outs are RING ZONES: since 2026-07-20
    // they JOIN the adjacency walk (the following-circle clash needs to see
    // them) but are skipped BEFORE any mood is stamped — the real invariant
    // was never the selector, it's that a `.scrolly` NEVER gets a mood: a
    // stepper is multi-viewport tall, and an fx-canvas sized to it builds a
    // monster canvas that blanks the GPU. Pin the walk AND the skip.
    expect(rnd).toContain('querySelectorAll(".section, .scrolly")');
    expect(rnd).toContain("isRingZone(step)");
    expect(rnd, "ring zones must skip BEFORE the stamp").toMatch(
      /isRingZone\(step\)\)\s*\{\s*prev = "ring";\s*continue;/,
    );
    // #mcp opts out of a randomised mood — mood-less, ring-zone only.
    expect(index).toContain("data-fx-none");
    // The ring shows over steppers, bridges, AND data-fx-none sections.
    const cursor = read("src/scripts/cursor.js");
    expect(cursor).toContain(".scrolly, .bridge, [data-fx-none]");
    // The all-section pointer spotlight (BR3) is gone; the mood-scoped glow
    // rule in fx.css is untouched and still standalone.
    expect(read("src/styles/bold.css")).not.toContain(
      ".section.is-hot::before",
    );
    expect(read("src/styles/fx.css")).toContain('[data-cursor="glow"]');
  });

  test("the currency scramble stays wired (owner constraint)", () => {
    expect(index).toContain("data-cur");
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
        ...index.matchAll(
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
    const ticker = index.slice(index.indexOf('class="ticker"'));
    expect(ticker).toContain("Array.from({ length: 2 })");
  });
});

describe("script islands", () => {
  test("every src/scripts file is loaded by Base.astro", () => {
    for (const f of readdirSync(join(ROOT, "src/scripts"))) {
      expect(
        base.includes(`scripts/${f}`),
        `${f} not wired in Base.astro`,
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

describe("fluid + metaballs perf budgets", () => {
  test("fluid's SIM_MAX and PRESSURE_ITERS stay within budget (owner: ~50%+ less grid work, 2026-07-19)", () => {
    const webgl = read("src/scripts/fx-webgl.js");
    const fnStart = webgl.indexOf("function fluid(gl, canvas, section) {");
    const fnEnd = webgl.indexOf("/* ══ plasma — domain-warped fbm", fnStart);
    const fluidSrc = webgl.slice(fnStart, fnEnd);

    const simMax = Number(fluidSrc.match(/const SIM_MAX = (\d+);/)?.[1]);
    const pressureIters = Number(
      fluidSrc.match(/const PRESSURE_ITERS = (\d+);/)?.[1],
    );
    expect(simMax, "SIM_MAX const not found").toBeGreaterThan(0);
    expect(pressureIters, "PRESSURE_ITERS const not found").toBeGreaterThan(0);

    // Budget: 6 fixed full-grid passes + PRESSURE_ITERS Jacobi passes, each
    // touching simW*simH ~ SIM_MAX^2 cells. old = 128^2 * (6+14) = 327,680
    // cell-ops; the budget below is the same formula, so a future edit that
    // re-inflates SIM_MAX or PRESSURE_ITERS past it regresses the perf work
    // (fix the arithmetic or re-raise the budget with the owner's OK).
    const cellOps = simMax * simMax * (6 + pressureIters);
    expect(cellOps).toBeLessThanOrEqual(327680 * 0.5);
  });

  test("metaballs' orbiting blob loop stays within budget (owner: 6->4 blobs, 2026-07-19)", () => {
    const webgl = read("src/scripts/fx-webgl.js");
    const fnStart = webgl.indexOf("/* ══ metaballs — gooey blob field");
    const fnEnd = webgl.indexOf(
      "function metaballs(gl, canvas, section)",
      fnStart,
    );
    const metaballsSrc = webgl.slice(fnStart, fnEnd);

    const blobs = Number(
      metaballsSrc.match(/for \(int i = 0; i < (\d+); i\+\+\)/)?.[1],
    );
    expect(blobs, "orbiting blob loop bound not found").toBeGreaterThan(0);
    // Was 6 (7 blobs total w/ cursor). Budget stays at or under 4 (5 total).
    expect(blobs).toBeLessThanOrEqual(4);
  });
});

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
