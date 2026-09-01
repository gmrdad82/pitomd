// announce-select.test.js — guards the article announcer's selection logic
// (tools/announce/select.mjs): frontmatter parsing, the newly-published
// window, the force-slug override, and the share URLs the messages carry.
import { describe, expect, test } from "vitest";
import {
  parseFrontmatter,
  selectAnnouncements,
  postUrls,
  runway,
} from "../tools/announce/select.mjs";

const md = (published, pubDate) =>
  `---\ntitle: "A title"\ndescription: "A line."\npublished: ${published}\npubDate: ${pubDate}\n---\n\nBody.`;

describe("frontmatter parsing", () => {
  test("reads quoted strings, booleans, and dates", () => {
    const data = parseFrontmatter(md(true, "2026-09-03"));
    expect(data.title).toBe("A title");
    expect(data.published).toBe(true);
    expect(data.pubDate).toBe("2026-09-03");
  });

  test("a file with no frontmatter yields null, not a crash", () => {
    expect(parseFrontmatter("just prose")).toBeNull();
  });
});

describe("the newly-published window", () => {
  const posts = [
    { slug: "live-in-window", data: parseFrontmatter(md(true, "2026-09-10")) },
    { slug: "live-before", data: parseFrontmatter(md(true, "2026-09-01")) },
    {
      slug: "draft-in-window",
      data: parseFrontmatter(md(false, "2026-09-10")),
    },
    { slug: "future", data: parseFrontmatter(md(true, "2026-12-01")) },
  ];
  const window = { since: "2026-09-05T00:00:00Z", now: "2026-09-12T00:00:00Z" };

  test("announces only published posts whose pubDate entered the window", () => {
    expect(selectAnnouncements(posts, window).map((p) => p.slug)).toEqual([
      "live-in-window",
    ]);
  });

  test("a draft never announces, whatever its date", () => {
    const drafts = selectAnnouncements(posts, window).filter(
      (p) => p.data.published !== true,
    );
    expect(drafts).toEqual([]);
  });

  test("force slug announces exactly that post, window ignored", () => {
    const picked = selectAnnouncements(posts, {
      ...window,
      forceSlug: "future",
    });
    expect(picked.map((p) => p.slug)).toEqual(["future"]);
  });
});

describe("the runway measure behind the buffer alert", () => {
  const posts = [
    { slug: "gone", data: parseFrontmatter(md(true, "2026-09-01")) },
    { slug: "next", data: parseFrontmatter(md(true, "2026-09-10")) },
    { slug: "later-draft", data: parseFrontmatter(md(false, "2026-09-20")) },
  ];

  test("counts only future posts, split approved vs draft, with days left", () => {
    const state = runway(posts, { now: "2026-09-05T00:00:00Z" });
    expect(state.future.map((p) => p.slug)).toEqual(["next", "later-draft"]);
    expect(state.approved).toBe(1);
    expect(state.drafts).toBe(1);
    expect(state.daysLeft).toBe(15);
  });

  test("an empty schedule reports zero runway", () => {
    const state = runway(posts, { now: "2026-12-31T00:00:00Z" });
    expect(state.future).toEqual([]);
    expect(state.daysLeft).toBe(0);
  });
});

describe("the URLs a message carries", () => {
  test("article, thumbnail, and share intents derive from one base", () => {
    const urls = postUrls("https://pitomd.com/", "some-article", {
      title: "A title",
      description: "A line.",
    });
    expect(urls.url).toBe(
      "https://pitomd.com/said-and-done/blog/some-article/",
    );
    expect(urls.thumb).toBe(
      "https://pitomd.com/said-and-done/blog/thumbs/some-article.png",
    );
    expect(urls.shareX).toContain("x.com/intent/post?text=");
    expect(urls.shareLinkedIn).toContain("linkedin.com/sharing/share-offsite");
    expect(urls.shareX).toContain(encodeURIComponent(urls.url));
    expect(urls.shareText).toBe(`A title — A line. ${urls.url}`);
    expect(urls.shareWhatsApp).toBe(
      `https://wa.me/?text=${encodeURIComponent(urls.shareText)}`,
    );
  });
});
