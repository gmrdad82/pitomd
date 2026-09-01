// tools/announce/select.mjs — pure logic for the article announcer: parse
// said-blog frontmatter and decide which posts count as "newly published"
// for a given window. No I/O here; announce.mjs feeds it files, the vitest
// contract test feeds it fixtures.

// Parse the leading `--- ... ---` frontmatter block of a markdown source
// into a flat object. Handles the subset the said-blog schema uses:
// quoted/unquoted strings, booleans, and ISO dates. Returns null when the
// source carries no frontmatter fence.
export function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    if (value === "true") value = true;
    else if (value === "false") value = false;
    data[kv[1]] = value;
  }
  return data;
}

// Decide which posts to announce. `posts` is [{ slug, data }] with data
// from parseFrontmatter. A post announces when it is published and its
// pubDate falls inside (since, now] — i.e. it went live between the
// previous deploy and this one. `forceSlug` short-circuits the window and
// announces that one post regardless (the workflow_dispatch path).
export function selectAnnouncements(posts, { since, now, forceSlug }) {
  if (forceSlug) return posts.filter((p) => p.slug === forceSlug);
  const start = new Date(since).getTime();
  const end = new Date(now).getTime();
  return posts.filter((p) => {
    if (p.data?.published !== true) return false;
    const at = new Date(p.data.pubDate).getTime();
    return Number.isFinite(at) && at > start && at <= end;
  });
}

// Measure the publishing runway: how many articles still sit ahead of
// `now`, split into approved (published: true, will go out on their date)
// and drafts awaiting the owner's validation, plus how many days of
// schedule remain until the farthest pubDate. The buffer alert reads this.
export function runway(posts, { now }) {
  const today = new Date(now).getTime();
  const future = posts
    .filter((p) => new Date(p.data?.pubDate).getTime() > today)
    .sort((a, b) => new Date(a.data.pubDate) - new Date(b.data.pubDate));
  const last = future.at(-1);
  return {
    future,
    approved: future.filter((p) => p.data.published === true).length,
    drafts: future.filter((p) => p.data.published !== true).length,
    daysLeft: last
      ? Math.floor((new Date(last.data.pubDate).getTime() - today) / 86400000)
      : 0,
  };
}

// The public URLs a post announces with — one place, so Slack and Discord
// can never drift apart on where things live. shareText is the paste-ready
// blurb for surfaces with no share-intent URL (YouTube Posts, and friends);
// the X intent pre-fills the same text.
export function postUrls(site, slug, data = {}) {
  const base = site.replace(/\/$/, "");
  const url = `${base}/said-and-done/blog/${slug}/`;
  const shareText = data.title
    ? `${data.title} — ${data.description} ${url}`
    : url;
  return {
    url,
    thumb: `${base}/said-and-done/blog/thumbs/${slug}.png`,
    shareText,
    shareX: `https://x.com/intent/post?text=${encodeURIComponent(data.title ? `${data.title} — ${data.description}` : "")}&url=${encodeURIComponent(url)}`,
    shareLinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    shareWhatsApp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
  };
}
