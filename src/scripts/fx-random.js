// fx-random.js — pick each section's cursor fx at random, once per page load.
//
// Runs BEFORE the fx islands (cursor.js / fx-webgl.js) so they read the
// data-cursor it stamps. The site no longer hardcodes a mood per slide; the
// mood is randomised on every refresh under two rules:
//   • no two ADJACENT sections get the same fx (avoids a repeat across a scroll)
//   • image-processing fx (water / halftone / lens sample the cover) only land
//     on a section that HAS a .cover-bed; cover-less sections draw from the
//     abstract pool only.
//
// ONLY one-viewport `.section`s are moody. The pinned `.scrolly` steppers are
// EXCLUDED: they're `height: steps × 100vh` (up to 12 viewports tall), so an
// fx-canvas sized to that full box builds a ~16000px canvas that blows past the
// GPU's max texture size (renders blank/white) and tanks perf — and the cursor
// machinery (glow's ::before, pointer.js's is-hot) is `.section`-scoped anyway.
// The steppers keep their designed background + the global cursor ring only.
//
// Sections can also opt OUT explicitly with `data-fx-none` (e.g. #mcp) — same
// deal as a stepper: no mood is stamped, so they fall back to the plain
// background and get only the global cursor ring (cursor.js treats them as a
// ring zone alongside .scrolly/.bridge). Use this for a section whose content
// needs to read calm/neutral rather than carry a randomised personality.
//
// It runs once and stamps a static attribute — nothing re-randomises mid-session
// (fresh randomness comes from a refresh, per the owner). No cross-refresh cache
// is needed; the heavy cost is the WebGL islands, which fx-webgl.js lazy-loads
// per viewport, so an unlucky layout never spins up more than a couple of GPU
// contexts at once.

(() => {
  // The full mood pool. glow/ripple are CSS/DOM (cursor.js); the rest are WebGL
  // islands (fx-webgl.js). Keep this in sync with fx-webgl.js's RENDERERS.
  const POOL = [
    "glow",
    "ripple",
    "water",
    "fluid",
    "plasma",
    "metaballs",
    "halftone",
    "lens",
  ];
  // These sample the section's cover image, so they need a .cover-bed present.
  const NEEDS_COVER = new Set(["water", "halftone", "lens"]);

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Moods that read as a "FOLLOWING CIRCLE" — perceptually the same effect
  // as the global cursor ring that scrolly steppers and [data-fx-none]
  // sections carry. The old walk skipped ring zones entirely, so a lens
  // section could sit right against a stepper and the viewer scrolled from
  // one following circle into another (owner, 2026-07-20: "this should not
  // happen"). Ring zones now participate in adjacency as an implicit
  // "ring" mood, and the clash is checked BOTH ways (a lens can neither
  // follow a ring zone nor immediately precede one).
  const RING_CLASH = new Set(["lens"]);
  const isRingZone = (el) =>
    el.classList.contains("scrolly") || el.hasAttribute("data-fx-none");

  // Walk EVERY fx-bearing surface in document order — moody `.section`s AND
  // the ring-carrying surfaces (steppers, opt-outs) — so adjacency means
  // what the viewer sees while scrolling. Steppers still never get a mood
  // stamped (the monster-canvas rule in the header stands); they only
  // contribute their implicit ring to the neighbours' constraint.
  const surfaces = Array.from(document.querySelectorAll(".section, .scrolly"));
  let prev = null; // previous surface's perceived mood ("ring" for ring zones)
  for (let i = 0; i < surfaces.length; i++) {
    const step = surfaces[i];
    if (isRingZone(step)) {
      prev = "ring";
      continue;
    }
    const next = surfaces[i + 1];
    const nextIsRing = !!next && isRingZone(next);
    const hasCover = !!step.querySelector(".cover-bed");
    const eligible = POOL.filter(
      (fx) =>
        fx !== prev &&
        !((prev === "ring" || nextIsRing) && RING_CLASH.has(fx)) &&
        (hasCover || !NEEDS_COVER.has(fx)),
    );
    const fx = pick(eligible);
    step.setAttribute("data-cursor", fx);
    prev = fx;
  }
})();
