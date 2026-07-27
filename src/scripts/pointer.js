// pointer.js — pointer reactivity (the advanced.team / cuberto feel).
//
// Three cooperating effects, all driven by a single rAF-throttled pointermove:
//   • Mouse parallax      — CSS vars --par-x/--par-y (-1..1) on <body> drive
//     the decor-layer drift (logo accents, pixel coins).
//   • Magnetic buttons    — [data-magnetic] elements ease toward the pointer
//     when it's near, springing back on leave.
//   • 3D tilt cards        — [data-tilt] elements rotate toward the pointer.
//
// (The per-section spotlight — the hot-class + local cursor vars — went with
// the 5.0.0 fx cull; the "glow" cursor mood was its only consumer.)
//
// Everything is disabled under prefers-reduced-motion or on coarse (touch)
// pointers, where these effects are pointless or janky.

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

function initPointer() {
  if (reduceMotion || !finePointer) return;

  const body = document.body;
  let px = window.innerWidth / 2;
  let py = window.innerHeight / 2;
  let ticking = false;

  // ── mouse parallax vars ─────────────────────────────────────
  // Magnet/tilt rects change on scroll/resize, NEVER on a bare pointermove —
  // measure them there (rAF-batched) and let the frame read the cache. A
  // per-move getBoundingClientRect is a read storm the ripple-spawn DOM churn
  // can turn into a forced reflow.
  let remeasureQueued = false;
  const remeasure = () => {
    remeasureQueued = false;
    refreshElementRects();
  };
  const queueRemeasure = () => {
    if (remeasureQueued) return;
    remeasureQueued = true;
    requestAnimationFrame(remeasure);
  };
  window.addEventListener("scroll", queueRemeasure, { passive: true });
  window.addEventListener("resize", queueRemeasure, { passive: true });

  const updateParallaxVars = () => {
    // normalized cursor offset from centre (-1..1) → mouse-parallax for logos
    body.style.setProperty("--par-x", (px / window.innerWidth - 0.5) * 2);
    body.style.setProperty("--par-y", (py / window.innerHeight - 0.5) * 2);
  };

  // ── magnetic buttons ─────────────────────────────────────
  // applyMagnets/applyTilt take PRE-READ rects (see onFrame): reading a rect
  // after the previous element's transform write forced a style flush PER
  // ELEMENT — 27 forced reflows a frame across magnets+tilts was the "shelf
  // lags on mouse move" jank.
  const magnets = Array.from(document.querySelectorAll("[data-magnetic]"));
  const applyMagnets = (rects) => {
    for (let i = 0; i < magnets.length; i++) {
      const el = magnets[i];
      const r = rects[i];
      // offscreen — nothing to pull; skip the math and any style write
      if (r.bottom < -60 || r.top > window.innerHeight + 60) {
        if (el.style.transform) el.style.transform = "";
        continue;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) * 1.2;
      if (dist < radius) {
        // gentle pull, capped so neighbouring buttons never collide
        const pull = (1 - dist / radius) * 0.22;
        const tx = Math.max(-16, Math.min(16, dx * pull));
        const ty = Math.max(-16, Math.min(16, dy * pull));
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        el.style.transform = "";
      }
    }
  };

  // ── 3D tilt ──────────────────────────────────────────────
  // Cached list (cheap per frame — no querySelectorAll in the loop), refreshed
  // ONLY when a [data-tilt] element is actually inserted/removed (dev hot-reload),
  // never on the frequent ripple-spawn mutations.
  let tilts = Array.from(document.querySelectorAll("[data-tilt]"));
  const touchesTilt = (n) =>
    n.nodeType === 1 &&
    (n.matches?.("[data-tilt]") || n.querySelector?.("[data-tilt]"));
  new MutationObserver((muts) => {
    if (
      muts.some((m) => [...m.addedNodes, ...m.removedNodes].some(touchesTilt))
    ) {
      tilts = Array.from(document.querySelectorAll("[data-tilt]"));
      refreshElementRects();
    }
  }).observe(document.body, { childList: true, subtree: true });
  const applyTilt = (rects) => {
    for (let i = 0; i < tilts.length; i++) {
      const el = tilts[i];
      const r = rects[i];
      if (
        px < r.left - 60 ||
        px > r.right + 60 ||
        py < r.top - 60 ||
        py > r.bottom + 60
      ) {
        el.style.transform = "";
        continue;
      }
      const rx = ((py - (r.top + r.height / 2)) / r.height) * -10;
      const ry = ((px - (r.left + r.width / 2)) / r.width) * 10;
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  };

  // Work was uncapped — onFrame ran on every rAF (display refresh, up to
  // 120fps on high-refresh gaming displays), re-reading every magnet/tilt
  // rect and rewriting the spotlight vars that often. The glow/pull/tilt
  // read fine lagging a frame or two, so cap the WORK itself to ~30fps: a
  // min-interval check inside the rAF callback that skips + re-queues when
  // early. px/py keep updating on every qualifying pointermove regardless,
  // so the frame that finally runs still paints the latest position.
  const POINTER_WORK_MIN_MS = 33; // was: uncapped (ran every rAF)
  let lastWorkTime = 0;

  // Gaming mice report pointermove at up to 1000Hz, most of it sub-pixel
  // jitter no spotlight/magnet/tilt update could ever show — drop it before
  // it even reaches the rAF gate.
  const POINTER_MOVE_MIN_DELTA_PX = 2; // was: every move queued a frame

  // Magnet/tilt rects ride the SAME scroll/resize cache as the section
  // rects above (2026-07-20, owner smoke: re-reading them per work frame
  // was a forced reflow 30×/s — the dominant main-thread cost while the
  // mouse moved). The cache deliberately ignores the elements' own
  // transform displacement (≤16px magnet pull / tilt rotation): the
  // untransformed anchor is the CORRECT reference — the old per-frame
  // read fed the pull its own output.
  let magnetRects = [];
  let tiltRects = [];
  function refreshElementRects() {
    magnetRects = magnets.map((el) => el.getBoundingClientRect());
    tiltRects = tilts.map((el) => el.getBoundingClientRect());
  }
  refreshElementRects();

  const onFrame = (now) => {
    if (now - lastWorkTime < POINTER_WORK_MIN_MS) {
      requestAnimationFrame(onFrame);
      return;
    }
    lastWorkTime = now;
    // Style writes only — every layout read now comes from the
    // scroll/resize-refreshed caches; a move frame forces zero reflow.
    updateParallaxVars();
    if (magnets.length) applyMagnets(magnetRects);
    if (tilts.length) applyTilt(tiltRects);
    ticking = false;
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      if (
        dx * dx + dy * dy <
        POINTER_MOVE_MIN_DELTA_PX * POINTER_MOVE_MIN_DELTA_PX
      )
        return;
      px = e.clientX;
      py = e.clientY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onFrame);
      }
    },
    { passive: true },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPointer);
} else {
  initPointer();
}
