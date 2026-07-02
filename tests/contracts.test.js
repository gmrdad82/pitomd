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

  test("every data-cursor mood is styled and driven", () => {
    const known = new Set(["glow", "ripple", "trail"]);
    for (const [, v] of index.matchAll(/data-cursor="([a-z-]+)"/g)) {
      expect(known.has(v), `unknown data-cursor "${v}"`).toBe(true);
    }
    expect(css).toContain('[data-cursor="glow"]');
    expect(css).toContain(".fx-ripple");
    expect(css).toContain(".fx-trail");
    expect(base).toContain("scripts/cursor.js");
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
