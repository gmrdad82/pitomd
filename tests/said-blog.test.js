import { describe, expect, test } from "vitest";
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
