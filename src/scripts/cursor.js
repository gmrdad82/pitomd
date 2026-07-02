// cursor.js — per-slide cursor personalities.
//
// Every slide declares its cursor mood via data-cursor on the <section>:
//   (none)   → the global difference-blend ring (.cursor-ring) trails the
//              pointer and swells over anything clickable.
//   "glow"   → the ring hides; the slide's spotlight follows the cursor
//              (CSS — fx.css reads pointer.js's --lx/--ly + .is-hot).
//   "ripple" → water rings spread from the pointer as it moves, like a stick
//              dragged across a pond; pointerdown drops a bigger splash.
//   "trail"  → the Windows 3.1/95 mouse trail — ghost arrows along the path.
//
// Spawned nodes are appended to the SECTION (position: relative, overflow:
// clip) at section-local coordinates and self-remove on animationend.
// Fine pointers only; no-ops under prefers-reduced-motion.

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

function initCursor() {
  const ring = document.querySelector(".cursor-ring");
  if (reduceMotion || !finePointer) return;

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;
  let raf = null;

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
  let lastTrail = 0;

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;

      const holder = e.target.closest?.("[data-cursor]");
      const mode = holder?.dataset.cursor;

      // the ring rides only on mode-less slides
      if (ring) {
        ring.classList.toggle("is-on", !mode);
        ring.classList.toggle(
          "is-link",
          !mode && !!e.target.closest("a, button, [data-copy]"),
        );
        if (!raf) raf = requestAnimationFrame(tick);
      }

      const now = performance.now();
      if (mode === "ripple" && now - lastRipple > 90) {
        lastRipple = now;
        spawn(holder, "fx-ripple", e.clientX, e.clientY);
        spawn(holder, "fx-ripple fx-ripple--echo", e.clientX, e.clientY);
      } else if (mode === "trail" && now - lastTrail > 30) {
        lastTrail = now;
        spawn(holder, "fx-trail", e.clientX, e.clientY);
      }
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
