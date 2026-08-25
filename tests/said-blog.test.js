import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
  const dir = join(__dirname, "..", "src", "content", "said-blog");
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
      join(__dirname, "..", "src", "layouts", "SaidDocsLayout.astro"),
      "utf8",
    );
    expect(layout).toContain("said-brandmark.js");
  });
});
