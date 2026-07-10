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

  // `.section` only — NOT `.scrolly` (see the header note: a stepper is
  // multi-viewport-tall and would build a monster canvas) — AND excluding any
  // `[data-fx-none]` section that opts out of a randomised mood entirely.
  const steps = Array.from(
    document.querySelectorAll(".section:not([data-fx-none])"),
  );
  let prev = null;
  for (const step of steps) {
    const hasCover = !!step.querySelector(".cover-bed");
    const eligible = POOL.filter(
      (fx) => fx !== prev && (hasCover || !NEEDS_COVER.has(fx)),
    );
    const fx = pick(eligible);
    step.setAttribute("data-cursor", fx);
    prev = fx;
  }
})();
