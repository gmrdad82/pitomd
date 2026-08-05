// guides.js — the four Pito Studio setup guides' shared metadata.
//
// One source of truth for slug/title/eyebrow/one-liner so the /guides
// docs-home grid, GuideLayout.astro's sidebar, its "on this page" anchor
// list, and its prev/next pager all list the same four entries in the same
// order, without hand-copying them. The four routes themselves are exactly
// the ones Studio's own setup wizard links to
// (internal/ui/studio_cockpit_wizard_render.go) — keep the slugs in sync
// with that file if a route ever moves.

export const guides = [
  {
    slug: "igdb",
    title: "IGDB",
    eyebrow: "Games Library",
    oneLiner:
      "Cover art, release dates, scores and time-to-beat for every game you add.",
    time: "~5 minutes",
  },
  {
    slug: "youtube",
    title: "YouTube",
    eyebrow: "Analytics & uploads",
    oneLiner:
      "Channel and video analytics, plus uploading a rendered timeline straight from Studio.",
    time: "~10 minutes",
  },
  {
    slug: "tiktok",
    title: "TikTok",
    eyebrow: "Analytics & Shorts",
    oneLiner:
      "Performance numbers for what you've posted, and publishing Shorts from Studio.",
    time: "~10 minutes, plus review time",
  },
  {
    slug: "claude",
    title: "Claude",
    eyebrow: "AI features",
    oneLiner:
      "Auto-cut drafts and answers pulled from your own footage, never acting without your approval.",
    time: "~5 minutes",
  },
];

// The six section anchors every one of the four guide pages carries, in
// reading order — GuideLayout.astro's sidebar sub-nav and its "on this
// page" list both render from this instead of each guide re-declaring its
// own headings twice. Keep the `id`s in sync with the actual <section id>
// values inside src/pages/guides/{igdb,youtube,tiktok,claude}.astro.
export const guideSections = [
  { id: "need", label: "What you need" },
  { id: "why", label: "Why Studio wants this" },
  { id: "handled", label: "How it's handled" },
  { id: "steps", label: "Step by step" },
  { id: "limits", label: "Good to know" },
  { id: "done", label: "Back in Studio" },
];
