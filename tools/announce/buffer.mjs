// tools/announce/buffer.mjs — the low-runway alarm: warns the owner on
// Slack when the scheduled article buffer is thinning. Run weekly by
// .github/workflows/buffer-check.yml; thresholds per the owner's ask
// (2026-09-01): alert when fewer than 5 future articles remain OR the
// schedule runs out within 14 days. ALWAYS=1 posts the status even when
// healthy (the manual-dispatch path).
//
// Env: SLACK_WEBHOOK_URL (required to post), NOW (test override),
//      ALWAYS (post even when healthy).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, runway } from "./select.mjs";

const MIN_COUNT = 5;
const MIN_DAYS = 14;

const root = join(import.meta.dirname, "..", "..");
const dir = join(root, "src", "content", "said-blog");
const posts = !existsSync(dir)
  ? []
  : readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({
        slug: f.replace(/\.md$/, ""),
        data: parseFrontmatter(readFileSync(join(dir, f), "utf8")),
      }));

const now = process.env.NOW ?? new Date().toISOString();
const state = runway(posts, { now });
const low = state.future.length < MIN_COUNT || state.daysLeft < MIN_DAYS;

const nextUp = state.future
  .slice(0, 5)
  .map(
    (p) =>
      `• ${p.data.pubDate} — ${p.data.title}${p.data.published === true ? "" : " _(draft)_"}`,
  )
  .join("\n");

const headline = low
  ? `⚠️ Article buffer is low: ${state.future.length} future articles, schedule ends in ${state.daysLeft} days`
  : `✅ Article buffer is healthy: ${state.future.length} future articles, ${state.daysLeft} days of schedule left`;

console.log(headline);
if (!low && !process.env.ALWAYS) process.exit(0);

const url = process.env.SLACK_WEBHOOK_URL;
if (!url) {
  console.log("slack: no webhook secret set — skipped");
  process.exit(0);
}
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: low ? "⚠️ Article buffer low" : "✅ Article buffer healthy",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${state.future.length} future articles (${state.approved} approved · ${state.drafts} awaiting your validation), schedule runs out in *${state.daysLeft} days*.\nThresholds: alert under ${MIN_COUNT} articles or ${MIN_DAYS} days.${nextUp ? `\n\nNext up:\n${nextUp}` : ""}`,
        },
      },
    ],
  }),
});
if (!res.ok) throw new Error(`slack webhook answered ${res.status}`);
console.log("slack: alerted");
