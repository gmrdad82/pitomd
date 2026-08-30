import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { released, withBadges, related } from "../src/lib/said-blog.ts";

const post = (id, published, iso) => ({
  id,
  data: { published, pubDate: new Date(iso) },
});

const NOW = new Date("2026-08-20T12:00:00Z");

const pool = [
  post("live-old", true, "2026-08-01"),
  post("live-new", true, "2026-08-20"),
  post("approved-future", true, "2026-09-01"),
  post("draft-past", false, "2026-08-01"),
  post("draft-future", false, "2026-09-10"),
];

describe("the publishing gate", () => {
  test("production releases only approved posts whose date has arrived, newest first", () => {
    expect(released(pool, NOW).map((p) => p.id)).toEqual([
      "live-new",
      "live-old",
    ]);
  });

  test("a draft never ships, however old its date", () => {
    expect(
      released(pool, NOW).find((p) => p.id === "draft-past"),
    ).toBeUndefined();
  });

  test("dev badges: drafts wear draft, approved-but-future wear scheduled, live wear none", () => {
    const badges = Object.fromEntries(
      withBadges(pool, NOW).map(({ post: p, badge }) => [p.id, badge]),
    );
    expect(badges["draft-past"]).toBe("draft");
    expect(badges["draft-future"]).toBe("draft");
    expect(badges["approved-future"]).toBe("scheduled");
    expect(badges["live-new"]).toBeNull();
    expect(badges["live-old"]).toBeNull();
  });

  test("related picks released posts only, never the article itself", () => {
    const ids = related(pool[1], pool, NOW).map((p) => p.id);
    expect(ids).toEqual(["live-old"]);
  });
});

describe("every post carries its shape (owner rulings, 2026-08-25)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, "..", "src", "content", "said-blog");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  test("the collection is not empty", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  test("at least two h2 sections, so the ToC always renders", () => {
    for (const f of files) {
      const s = readFileSync(join(dir, f), "utf8");
      const h2s = (s.match(/^## /gm) || []).length;
      expect(
        h2s,
        `${f} has ${h2s} h2 sections — the ToC needs at least 2`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  test("at least one image, illustration, or screenshot", () => {
    for (const f of files) {
      const s = readFileSync(join(dir, f), "utf8");
      const imgs = (s.match(/^!\[|<img/gm) || []).length;
      expect(imgs, `${f} carries no image`).toBeGreaterThanOrEqual(1);
    }
  });

  test("the docs layout brands Said and Done. in running text", () => {
    const layout = readFileSync(
      join(here, "..", "src", "layouts", "SaidDocsLayout.astro"),
      "utf8",
    );
    expect(layout).toContain("initBrandmark");
  });
});

describe("no reference points at a missing image (owner report, 2026-08-25)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");

  function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.(md|astro)$/.test(entry.name) ? [path] : [];
    });
  }

  test("every /said-and-done asset referenced in content and pages exists in public", () => {
    const files = [
      ...walk(join(root, "src", "content", "said-blog")),
      ...walk(join(root, "src", "pages", "said-and-done")),
    ];
    for (const f of files) {
      const s = readFileSync(f, "utf8");
      const refs = [
        ...s.matchAll(
          /(?:!\[[^\]]*\]\(|src="|src=\{")(\/said-and-done\/[^)"}\s]+)/g,
        ),
      ].map((m) => m[1]);
      for (const ref of refs) {
        expect(
          existsSync(join(root, "public", ref)),
          `${f} references missing asset ${ref}`,
        ).toBe(true);
      }
    }
  });
});
