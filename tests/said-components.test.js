import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const saidSurfaces = [];
const walk = (dir) => {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
    else if (/\.(astro|css)$/.test(name)) saidSurfaces.push(rel);
  }
};
walk("src/pages/said-and-done");
saidSurfaces.push(
  "src/pages/index.astro",
  "src/layouts/SaidLayout.astro",
  "src/layouts/SaidDocsLayout.astro",
  "src/styles/said.css",
  "src/styles/said-docs.css",
);

describe("brand elements exist once, as components (owner order, 2026-08-20)", () => {
  test("the PITO gradient is declared only inside src/components", () => {
    for (const file of saidSurfaces) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(
        src.includes("#ff6ec7"),
        `${file} re-declares the PITO gradient — use <PitoWord /় instead`.replace(
          "়",
          ">",
        ),
      ).toBe(false);
    }
  });

  test("no Said and Done page or layout hand-rolls the lockup or footer markup", () => {
    for (const file of saidSurfaces) {
      const src = readFileSync(join(ROOT, file), "utf8");
      for (const marker of [
        "said-lockup-product",
        "said-done-word",
        "sdoc-footer-brand",
        "home-brand-mark",
      ]) {
        expect(
          src.includes(marker),
          `${file} re-declares "${marker}" — the shared component owns it`,
        ).toBe(false);
      }
    }
  });

  test("the shared components exist and carry the brand exactly once each", () => {
    const pito = readFileSync(
      join(ROOT, "src/components/PitoWord.astro"),
      "utf8",
    );
    expect(pito).toContain("#ff6ec7");
    const brand = readFileSync(
      join(ROOT, "src/components/SaidBrand.astro"),
      "utf8",
    );
    expect(brand).toContain("Said and");
    const footer = readFileSync(
      join(ROOT, "src/components/SaidFooter.astro"),
      "utf8",
    );
    expect(footer).toContain("SaidBrand");
    expect(footer).toContain("PitoWord");
  });
  test("every capture wears one slim shimmering border, staggered and hue-shifted", () => {
    const shot = readFileSync(
      join(ROOT, "src/components/SaidShot.astro"),
      "utf8",
    );
    expect(shot).toContain("--shot-delay");
    expect(shot).toContain("--shot-hue");
    expect(shot).not.toContain("<svg");
    expect(shot).not.toContain("<style>");

    const frame = readFileSync(join(ROOT, "src/styles/said-shot.css"), "utf8");
    expect(frame).toContain("border: 1px solid hsl");
    expect(frame).toContain("said-shot-shimmer");
    expect(frame).toContain(".sdoc-body p > img");

    const css = readFileSync(join(ROOT, "src/styles/said.css"), "utf8");
    expect(css).not.toContain("said-shot-shimmer");

    for (const layout of ["Base", "SaidLayout", "SaidDocsLayout"]) {
      const markup = readFileSync(
        join(ROOT, `src/layouts/${layout}.astro`),
        "utf8",
      );
      expect(markup).toContain("said-shot.css");
    }

    for (const page of [
      "src/pages/index.astro",
      "src/pages/said-and-done/index.astro",
      "src/pages/said-and-done/tour.astro",
      "src/pages/said-and-done/guides/first-boot.astro",
      "src/pages/said-and-done/guides/the-keyboard.astro",
      "src/pages/said-and-done/guides/agents-at-the-desk.astro",
    ]) {
      const markup = readFileSync(join(ROOT, page), "utf8");
      expect(markup).toContain("SaidShot");
      expect(markup).not.toMatch(/<img[^>]*\/said-and-done\/shots\//);
    }
  });
});
