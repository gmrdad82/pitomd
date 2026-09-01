// tools/announce/announce.mjs — posts newly published blog articles to the
// owner's Slack (private heads-up with share buttons) and Discord (community
// announcement). Run by .github/workflows/announce.yml after a successful
// deploy; selection logic lives in select.mjs so it stays unit-testable.
//
// Env contract:
//   SINCE                 ISO time of the previous successful deploy
//   NOW                   ISO "now" (defaults to wall clock)
//   FORCE_SLUG            announce exactly this slug, ignoring the window
//   SLACK_WEBHOOK_URL     optional — skipped with a notice when absent
//   DISCORD_WEBHOOK_URL   optional — skipped with a notice when absent
//   SITE                  optional override; defaults to astro.config's site
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, selectAnnouncements, postUrls } from "./select.mjs";

const root = join(import.meta.dirname, "..", "..");

// The canonical origin comes from astro.config.mjs — the repo's single
// source of truth for absolute URLs — with SITE as an escape hatch.
function siteOrigin() {
  if (process.env.SITE) return process.env.SITE;
  const config = readFileSync(join(root, "astro.config.mjs"), "utf8");
  const m = config.match(/site:\s*["']([^"']+)["']/);
  if (!m) throw new Error("astro.config.mjs carries no site — set SITE");
  return m[1];
}

function loadPosts() {
  const dir = join(root, "src", "content", "said-blog");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      slug: f.replace(/\.md$/, ""),
      data: parseFrontmatter(readFileSync(join(dir, f), "utf8")),
    }));
}

async function send(name, url, payload) {
  if (!url) {
    console.log(`${name}: no webhook secret set — skipped`);
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(
      `${name} webhook answered ${res.status}: ${await res.text()}`,
    );
  console.log(`${name}: announced`);
}

// The owner's private heads-up, operational voice (owner ruling 2026-09-01):
// the card reports the publish to HIM — title, when, slug, excerpt — with
// one-click share intents (X, LinkedIn, WhatsApp) and a paste-ready share
// text for surfaces with no intent URL, YouTube Posts chiefly.
function slackPayload(post, urls) {
  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📰 New article live" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${urls.url}|${post.data.title}>*` },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `said-blog · went live ${post.data.pubDate} · ${post.slug}`,
          },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `Excerpt: ${post.data.description}` },
      },
      { type: "image", image_url: urls.thumb, alt_text: post.data.title },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            style: "primary",
            text: { type: "plain_text", text: "Read it" },
            url: urls.url,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "X" },
            url: urls.shareX,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "LinkedIn" },
            url: urls.shareLinkedIn,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "WhatsApp" },
            url: urls.shareWhatsApp,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Share text (copy for YouTube Post & co):\n\`\`\`${urls.shareText}\`\`\``,
        },
      },
    ],
  };
}

// The community announcement: one rich embed in the pito-blue, share links
// as an embed field (Discord renders markdown links only inside embeds).
function discordPayload(post, urls) {
  return {
    embeds: [
      {
        author: { name: "Said and Done. blog" },
        title: post.data.title,
        description: post.data.description,
        url: urls.url,
        color: 0x5170ff,
        image: { url: urls.thumb },
        fields: [
          {
            name: "Spread the word",
            value: `[Share on X](${urls.shareX}) · [Share on LinkedIn](${urls.shareLinkedIn}) · [Share on WhatsApp](${urls.shareWhatsApp})`,
          },
        ],
        footer: { text: "pitomd.com — local-first, yours forever" },
      },
    ],
  };
}

const site = siteOrigin();
const picked = selectAnnouncements(loadPosts(), {
  since: process.env.SINCE ?? new Date(0).toISOString(),
  now: process.env.NOW ?? new Date().toISOString(),
  forceSlug: process.env.FORCE_SLUG || undefined,
});

if (picked.length === 0)
  console.log("nothing newly published — no announcements");
for (const post of picked) {
  const urls = postUrls(site, post.slug, post.data);
  console.log(`announcing: ${post.slug}`);
  await send("slack", process.env.SLACK_WEBHOOK_URL, slackPayload(post, urls));
  await send(
    "discord",
    process.env.DISCORD_WEBHOOK_URL,
    discordPayload(post, urls),
  );
}
