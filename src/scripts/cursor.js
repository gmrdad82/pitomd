// cursor.js — per-slide cursor personalities + the ring-zone ring.
//
// Two disjoint zones, each with exactly ONE cursor fx:
//   • Slides (.section) carry a mood via data-cursor: "glow" (the slide's
//     spotlight follows the cursor — CSS reads pointer.js's --lx/--ly + .is-hot),
//     "ripple" (water rings spread from the pointer; pointerdown drops a bigger
//     splash), or a WebGL background (fx-webgl.js). The ring is suppressed here.
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

  // spawn a personality node inside `host` at viewport coords (cx, cy)
  const spawn = (host, cls, cx, cy) => {
    const r = host.getBoundingClientRect();
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
  // 16000px on those steppers.) Shared by the pointermove handler (cheap
  // e.target) and the scroll listener below (elementFromPoint, since the
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

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      hasPointer = true;

      updateRing(e.target);

      // ripple mood — slides only (steppers carry no data-cursor)
      const holder = e.target.closest?.("[data-cursor='ripple']");
      const now = performance.now();
      if (holder && now - lastRipple > 90) {
        lastRipple = now;
        spawn(holder, "fx-ripple", e.clientX, e.clientY);
        spawn(holder, "fx-ripple fx-ripple--echo", e.clientX, e.clientY);
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
