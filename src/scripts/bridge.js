// bridge.js — drives the ColorBridge transitions.
//
// For each [data-bridge] block, sets --bp (0→1) = scroll progress through the
// block, which the CSS maps to the letter zoom, the colour flood, and the
// statement fade. No-ops under reduced motion (CSS shows a static colour panel).

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initBridges() {
  if (reduceMotion) return;
  const bridges = document.querySelectorAll("[data-bridge]");
  if (!bridges.length) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const b of bridges) {
      const rect = b.getBoundingClientRect();
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      b.style.setProperty("--bp", p.toFixed(4));
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

  // Slow, readable glyph shuffle on bridges that opt in (e.g. $ € £).
  for (const b of bridges) {
    const spec = b.getAttribute("data-bridge-glyphs");
    if (!spec) continue;
    const glyphs = spec.trim().split(/\s+/);
    if (glyphs.length < 2) continue;
    const letterEl = b.querySelector(".bridge__letter");
    if (!letterEl) continue;
    let gi = 0;
    setInterval(() => {
      gi = (gi + 1) % glyphs.length;
      letterEl.textContent = glyphs[gi];
    }, 1300);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBridges);
} else {
  initBridges();
}
