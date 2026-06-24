// scrollytell.js — pinned scroll-through sequences.
//
// A [data-scrolly] block is taller than the viewport; inside it a sticky stage
// stays pinned while you scroll, and one [data-scrolly-step] at a time becomes
// active based on scroll progress through the block. Big bold messages that
// swap as you scroll (the Voyage game↔channel narrative).
//
// Under prefers-reduced-motion the steps are simply all shown stacked (the CSS
// falls back), and this controller no-ops.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initScrolly() {
  const blocks = document.querySelectorAll("[data-scrolly]");
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const steps = Array.from(block.querySelectorAll("[data-scrolly-step]"));
    if (!steps.length) return;
    const progressEl = block.querySelector("[data-scrolly-progress]");

    if (reduceMotion) {
      steps.forEach((s) => s.classList.add("is-active"));
      return;
    }

    let ticking = false;
    let current = -1;

    const update = () => {
      ticking = false;
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh; // scrollable distance inside the block
      // progress 0..1 as the block scrolls under the sticky stage
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      // map to a step index; clamp to last
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      if (idx !== current) {
        current = idx;
        steps.forEach((s, i) => {
          s.classList.toggle("is-active", i === idx);
          s.classList.toggle("is-past", i < idx);
        });
      }
      if (progressEl) {
        progressEl.style.setProperty("--p", p.toFixed(4));
        progressEl.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(
          steps.length
        ).padStart(2, "0")}`;
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
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrolly);
} else {
  initScrolly();
}
