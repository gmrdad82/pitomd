// index-contracts.test.js — static contract guards for the root page
// (owner order, 2026-08-20: one oversized Said hero + the last four blog
// articles; the Studio countdown retired to src/parked/). Same discipline
// as chat-contracts.test.js: read the source as TEXT, assert the
// invariants that would otherwise only surface as a visual regression.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const index = read("src/pages/index.astro");

describe("the Said home", () => {
  test("the countdown teaser is parked, not routed", () => {
    expect(existsSync(join(ROOT, "src/parked/countdown-index.astro"))).toBe(
      true,
    );
    expect(index).not.toContain("countdown");
    expect(index).not.toContain("REAL_DEADLINE_ISO");
  });

  test("the home rides pitomd's own Base — its favicon and theme, not Said's", () => {
    expect(index).toContain('import Base from "../layouts/Base.astro"');
    expect(index).not.toContain("SaidLayout");
    expect(index).not.toContain("said.css");
  });

  test("one oversized hero: the mark and the branded two-tone name with a real gap (owner order, 2026-08-20: no PITO word in the hero)", () => {
    expect(index).toContain('src="/said/icon.svg"');
    expect(index).toContain('<span class="hn-said">Said and</span>');
    expect(index).toContain('{" "}');
    expect(index).not.toMatch(/\.home-name\s*{[^}]*display:\s*flex/s);
    expect(index).not.toContain("home-brand");
  });

  test("the PITO word and the brand gradient live only in the shared components", () => {
    expect(index).not.toContain("#ff6ec7");
    expect(index).toContain(
      'import SaidFooter from "../components/SaidFooter.astro"',
    );
  });

  test("the blog roll is a narrow centered 2x2 with serif reading type (owner ride, 2026-08-20)", () => {
    expect(index).toMatch(/\.home-roll\s*{[^}]*width:\s*min\(880px/s);
    expect(index).toMatch(
      /\.home-roll-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/s,
    );
    expect(index).toMatch(/\.home-card h3\s*{[^}]*var\(--font-serif\)/s);
  });

  test("the blog roll shows at most four entries, released-only in production", () => {
    expect(index).toContain(".slice(0, 4)");
    expect(index).toMatch(/import\.meta\.env\.DEV\s*\?\s*withBadges/);
    expect(index).toContain("released(posts)");
  });
});

describe("the said pages' shots", () => {
  test("every capture referenced by a said page exists in public/", () => {
    const pages = [
      "src/pages/index.astro",
      "src/pages/said/index.astro",
      "src/pages/said/tour.astro",
      "src/pages/said/guides/first-boot.astro",
      "src/pages/said/guides/the-keyboard.astro",
      "src/pages/said/guides/agents-at-the-desk.astro",
    ];
    for (const page of pages) {
      const src = read(page);
      for (const [, ref] of src.matchAll(/src="(\/said\/[^"]+)"/g)) {
        expect(existsSync(join(ROOT, "public", ref)), `missing ${ref}`).toBe(
          true,
        );
      }
    }
  });
});
