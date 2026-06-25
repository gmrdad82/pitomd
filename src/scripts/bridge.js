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
    // the flicker pool = the real currencies + extra symbols, for a rich scramble
    const pool = glyphs.concat(SCRAMBLE_POOL.split(""));
    glyphState.set(b, { glyphs, pool, el, counter: 0 });
  }

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const b of bridges) {
      const rect = b.getBoundingClientRect();
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      b.style.setProperty("--bp", p.toFixed(4));

      // Currency scramble: from the very first scroll into the bridge, while the
      // letter is still zooming (p < ~0.5), flicker the glyph on every scroll
      // event. Each move advances the counter, so it scrambles as you scroll.
      const st = glyphState.get(b);
      if (st) {
        if (p > 0 && p < 0.5) {
          st.counter++;
          st.el.textContent = st.pool[st.counter % st.pool.length];
        } else if (p <= 0) {
          st.el.textContent = st.glyphs[0];
        }
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
