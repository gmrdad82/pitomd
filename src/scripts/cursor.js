// cursor.js — per-slide cursor personalities + the ring-zone ring.
//
// Two disjoint zones, each with exactly ONE cursor fx (the 5.0.0 cull's
// three keepers: water, the following circle, circle ripples):
//   • Slides (.section) carry a mood via data-cursor, stamped statically in
//     the markup: "ripple" (water rings spread from the pointer; pointerdown
//     drops a bigger splash) or "water" (the WebGL background, fx-webgl.js).
//     The ring is suppressed here.
//   • Ring zones — `.scrolly` steppers, `.bridge` color-bridges, and any
//     `[data-fx-none]` section (opted out of a mood) — carry NO mood: the
//     neon ring (.cursor-ring) is their ONLY fx, trailing the pointer and
//     swelling over anything clickable. Everywhere else (footer) neither
//     shows.
//
// Spawned nodes are appended to the SECTION (position: relative, overflow:
// clip) at section-local coordinates and self-remove on animationend.
// Fine pointers only; no-ops under prefers-reduced-motion.

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

// Elements the cursor ring is shown over — steppers, color-bridges, and any
// section that explicitly opts out of a randomised mood.
const RING_ZONE = ".scrolly, .bridge, [data-fx-none]";

function initCursor() {
  const ring = document.querySelector(".cursor-ring");
  if (reduceMotion || !finePointer) return;

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;
  let raf = null;
  // tx/ty start at a GUESS (viewport centre) — until a real pointermove lands,
  // the scroll fallback below must not hit-test that guess and flash a ghost
  // ring where the mouse isn't.
  let hasPointer = false;

  const tick = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    if (ring) ring.style.transform = `translate(${x}px, ${y}px)`;
    if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  };

  // spawn a personality node inside `host` at viewport coords (cx, cy).
  // `hostRect` lets a caller spawning SIBLINGS share one layout read —
  // spawn's own getBoundingClientRect lands right after style writes, so
  // each un-shared call is a forced reflow (2026-07-20 owner smoke).
  const spawn = (host, cls, cx, cy, hostRect = null) => {
    const r = hostRect || host.getBoundingClientRect();
    const el = document.createElement("i");
    el.className = cls;
    el.style.left = `${cx - r.left}px`;
    el.style.top = `${cy - r.top}px`;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    host.appendChild(el);
  };

  let lastRipple = 0;

  // The ring is the RING ZONES' only fx — show it only while the pointer is
  // over a .scrolly/.bridge/[data-fx-none]; slides use their data-cursor mood
  // instead. (The ring is a single 64px fixed div moved by a transform —
  // cheap; it has nothing to do with the WebGL canvas that blew up to
  // 16000px on those steppers.) Shared by the per-frame pointer step below
  // (recorded e.target) and the scroll listener (elementFromPoint, since the
  // page is scroll-snap driven and content can slide under a stationary
  // pointer without a pointermove ever firing).
  const updateRing = (target) => {
    const onRingZone = !!target?.closest?.(RING_ZONE);
    if (!ring) return;
    ring.classList.toggle("is-on", onRingZone);
    ring.classList.toggle(
      "is-link",
      onRingZone && !!target.closest("a, button, [data-copy]"),
    );
    if (onRingZone) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      // hidden over slides — snap so a later re-entry starts under the cursor
      x = tx;
      y = ty;
    }
  };

  // Gaming mice report pointermove at up to 1000Hz — far above paint rate.
  // The handler ONLY records the latest position + hit target; the ring
  // toggles, closest() hit-tests and ripple spawns run at most once per
  // frame in onMove, scheduled on demand and naturally idle when the
  // pointer is still (same pattern as pointer.js's rAF gate).
  let pointerTarget = null;
  let moveQueued = false;

  // Work was uncapped — onMove ran on every rAF (display refresh, up to
  // 120fps). A ring hit-test/toggle can lag a few ms unnoticed, so cap the
  // WORK to ~30fps: min-interval check inside the rAF callback, skip +
  // re-queue when early (same pattern as pointer.js). The 90ms ripple
  // throttle below is untouched — a separate, coarser gate on top.
  const CURSOR_WORK_MIN_MS = 33; // was: uncapped (ran every rAF)
  let lastWorkTime = 0;

  // Sub-pixel gaming-mouse jitter can't move the ring or flip a hit-test —
  // drop it before it reaches the rAF gate.
  const CURSOR_MOVE_MIN_DELTA_PX = 2; // was: every move queued a frame

  const onMove = (frameTime) => {
    if (frameTime - lastWorkTime < CURSOR_WORK_MIN_MS) {
      requestAnimationFrame(onMove);
      return;
    }
    lastWorkTime = frameTime;
    moveQueued = false;

    updateRing(pointerTarget);

    // ripple mood — slides only (steppers carry no data-cursor)
    const holder = pointerTarget?.closest?.("[data-cursor='ripple']");
    const now = performance.now();
    // 140ms (was 90) + a live-node cap: each ripple pair is two animated,
    // blurred DOM nodes — under a fast sweep the old cadence stacked
    // enough of them to matter on the paint bill (2026-07-20 owner smoke).
    if (
      holder &&
      now - lastRipple > 140 &&
      holder.querySelectorAll(".fx-ripple").length < 6
    ) {
      lastRipple = now;
      const holderRect = holder.getBoundingClientRect();
      spawn(holder, "fx-ripple", tx, ty, holderRect);
      spawn(holder, "fx-ripple fx-ripple--echo", tx, ty, holderRect);
    }
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      const dx = e.clientX - tx;
      const dy = e.clientY - ty;
      if (
        dx * dx + dy * dy <
        CURSOR_MOVE_MIN_DELTA_PX * CURSOR_MOVE_MIN_DELTA_PX
      )
        return;
      tx = e.clientX;
      ty = e.clientY;
      pointerTarget = e.target;
      hasPointer = true;
      if (!moveQueued) {
        moveQueued = true;
        requestAnimationFrame(onMove);
      }
    },
    { passive: true },
  );

  // Scroll-snap means the user often scrolls with the mouse stationary, so a
  // ring zone can slide under (or out from under) the cursor with no
  // pointermove at all. rAF-batch (one pending frame max, same pattern as
  // pointer.js's rect cache) and re-derive the hit target from the last known
  // pointer position.
  let scrollQueued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        if (
          !hasPointer ||
          tx < 0 ||
          ty < 0 ||
          tx > window.innerWidth ||
          ty > window.innerHeight
        )
          return;
        const target = document.elementFromPoint(tx, ty);
        if (target) updateRing(target);
      });
    },
    { passive: true },
  );

  // a bigger splash where you "dip the stick"
  window.addEventListener(
    "pointerdown",
    (e) => {
      const holder = e.target.closest?.("[data-cursor='ripple']");
      if (holder)
        spawn(holder, "fx-ripple fx-ripple--splash", e.clientX, e.clientY);
    },
    { passive: true },
  );

  document.documentElement.addEventListener("pointerleave", () => {
    if (ring) ring.classList.remove("is-on");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCursor);
} else {
  initCursor();
}
