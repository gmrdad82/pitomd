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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBridges);
} else {
  initBridges();
}
