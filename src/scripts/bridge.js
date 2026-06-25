// bridge.js — drives the ColorBridge transitions.
//
// For each [data-bridge] block, sets --bp (0→1) = scroll progress through the
// block, which the CSS maps to the letter zoom, the colour flood, and the
// statement fade. Bridges with data-bridge-glyphs (e.g. "$ € £ ¥") SCRAMBLE
// their glyph as you scroll between the currencies — the displayed symbol is
// driven by scroll position, with a quick random-flicker burst on each change.
// No-ops under reduced motion (CSS shows a static colour panel).

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SCRAMBLE_POOL = "$€£¥₿¢₽₹元₩";

function initBridges() {
  if (reduceMotion) return;
  const bridges = Array.from(document.querySelectorAll("[data-bridge]"));
  if (!bridges.length) return;

  // per-bridge glyph state
  const glyphState = new Map();
  for (const b of bridges) {
    const spec = b.getAttribute("data-bridge-glyphs");
    if (!spec) continue;
    const glyphs = spec.trim().split(/\s+/);
    if (glyphs.length < 2) continue;
    const el = b.querySelector(".bridge__letter");
    if (!el) continue;
    glyphState.set(b, { glyphs, el, idx: -1, frames: 0 });
  }

  const scrambleTo = (st, targetIdx) => {
    st.idx = targetIdx;
    st.frames = 9; // flicker frames before settling
    const tick = () => {
      if (st.frames > 0) {
        st.el.textContent =
          SCRAMBLE_POOL[Math.floor((performance.now() * 0.05) % SCRAMBLE_POOL.length)];
        st.frames--;
        setTimeout(tick, 32);
      } else {
        st.el.textContent = st.glyphs[st.idx];
      }
    };
    tick();
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const b of bridges) {
      const rect = b.getBoundingClientRect();
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      b.style.setProperty("--bp", p.toFixed(4));

      // scroll-driven currency scramble
      const st = glyphState.get(b);
      if (st) {
        const target = Math.min(st.glyphs.length - 1, Math.floor(p * st.glyphs.length));
        if (target !== st.idx && st.frames === 0) scrambleTo(st, target);
      }
    }
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBridges);
} else {
  initBridges();
}
