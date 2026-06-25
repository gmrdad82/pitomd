// pointer.js — pointer reactivity (the advanced.team / cuberto feel).
//
// Three cooperating effects, all driven by a single rAF-throttled pointermove:
//   • Global spotlight   — CSS vars --mx/--my (viewport %) on <body> let any
//     element paint a glow that follows the cursor.
//   • Magnetic buttons    — [data-magnetic] elements ease toward the pointer
//     when it's near, springing back on leave.
//   • 3D tilt cards        — [data-tilt] elements rotate toward the pointer.
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

  // ── spotlight vars ──────────────────────────────────────────
  // Global viewport coords (for the hero) + per-section LOCAL coords so every
  // section's glow tracks the real cursor position.
  const sections = Array.from(
    document.querySelectorAll(".section, .bridge, .scrolly"),
  );
  const updateSpotlight = () => {
    body.style.setProperty("--mx", `${(px / window.innerWidth) * 100}%`);
    body.style.setProperty("--my", `${(py / window.innerHeight) * 100}%`);
    // normalized cursor offset from centre (-1..1) → mouse-parallax for logos
    body.style.setProperty("--par-x", (px / window.innerWidth - 0.5) * 2);
    body.style.setProperty("--par-y", (py / window.innerHeight - 0.5) * 2);
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const inside =
        py >= r.top &&
        py <= r.bottom &&
        r.top < window.innerHeight &&
        r.bottom > 0;
      if (s.classList.contains("section")) {
        s.classList.toggle("is-hot", inside);
        if (inside) {
          s.style.setProperty("--lx", `${((px - r.left) / r.width) * 100}%`);
          s.style.setProperty("--ly", `${((py - r.top) / r.height) * 100}%`);
        }
      }
    }
  };

  // ── magnetic buttons ─────────────────────────────────────
  const magnets = Array.from(document.querySelectorAll("[data-magnetic]"));
  const applyMagnets = () => {
    for (const el of magnets) {
      const r = el.getBoundingClientRect();
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
  const tilts = Array.from(document.querySelectorAll("[data-tilt]"));
  const applyTilt = () => {
    for (const el of tilts) {
      const r = el.getBoundingClientRect();
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

  const onFrame = () => {
    updateSpotlight();
    if (magnets.length) applyMagnets();
    if (tilts.length) applyTilt();
    ticking = false;
  };

  window.addEventListener(
    "pointermove",
    (e) => {
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
