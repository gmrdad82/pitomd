// pointer.js — pointer reactivity (the advanced.team / cuberto feel).
//
// Three cooperating effects, all driven by a single rAF-throttled pointermove:
//   • Global spotlight   — CSS vars --mx/--my (viewport %) on <body> let any
//     element paint a glow that follows the cursor.
//   • Magnetic buttons    — [data-magnetic] elements ease toward the pointer
//     when it's near, springing back on leave.
//   • 3D tilt cards        — [data-tilt] elements rotate toward the pointer.
//   • Cursor comet trail   — a pooled ring of fading dots streaks behind the
//     pointer (pito's cursor_trail, reimagined for a page cursor).
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

  // ── spotlight vars + section-reactive trail colour ──────────
  // Global viewport coords (for the hero) + per-section LOCAL coords so every
  // section's glow tracks the real cursor position. When the cursor crosses into
  // a new section we read that theme's accents and retint the cursor trail —
  // the comet takes on each section's own colour as you move down the page.
  const sections = Array.from(
    document.querySelectorAll(".section, .bridge, .scrolly"),
  );
  let hotId = null;
  const retint = (section) => {
    const cs = getComputedStyle(section);
    const c1 =
      cs.getPropertyValue("--accent-purple").trim() || "var(--pito-blue)";
    const c2 = cs.getPropertyValue("--accent-cyan").trim() || c1;
    body.style.setProperty("--trail-c1", c1);
    body.style.setProperty("--trail-c2", c2);
  };
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
      // retint the trail when entering a new section/bridge/scrolly
      if (inside) {
        const id = s.id || s.dataset.navLabel || String(sections.indexOf(s));
        if (id !== hotId) {
          hotId = id;
          retint(s);
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
      spawnGhost(px, py);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onFrame);
      }
    },
    { passive: true },
  );

  // ── cursor comet trail ───────────────────────────────────
  const TRAIL = 14;
  const ghosts = [];
  const layer = document.createElement("div");
  layer.className = "cursor-trail";
  layer.setAttribute("aria-hidden", "true");
  body.appendChild(layer);
  for (let i = 0; i < TRAIL; i++) {
    const g = document.createElement("span");
    g.className = "cursor-trail__dot";
    layer.appendChild(g);
    ghosts.push({ el: g, life: 0 });
  }
  let head = 0;
  let lastSpawn = 0;

  function spawnGhost(x, y) {
    const now = performance.now();
    if (now - lastSpawn < 16) return;
    lastSpawn = now;
    const g = ghosts[head];
    head = (head + 1) % TRAIL;
    g.life = 1;
    g.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function decay() {
    for (const g of ghosts) {
      if (g.life > 0) {
        g.life -= 0.06;
        g.el.style.opacity = Math.max(0, g.life).toFixed(3);
        g.el.style.scale = (0.4 + g.life * 0.6).toFixed(3);
      }
    }
    requestAnimationFrame(decay);
  }
  requestAnimationFrame(decay);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPointer);
} else {
  initPointer();
}
