const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function initParallax() {
  if (reduceMotion) return;

  const targets = Array.from(
    document.querySelectorAll(
      "#price, #shinies, #free, #hero, #linkage, #chatbox, #footage",
    ),
  );

  if (!targets.length) return;

  let ticking = false;

  function update() {
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const vcenter = scrollY + vh * 0.5;

    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const elCenter = scrollY + rect.top + rect.height * 0.5;
      const p = (vcenter - elCenter) / vh;
      el.style.setProperty(
        "--scroll-p",
        Math.max(-1.5, Math.min(1.5, p)).toFixed(4),
      );
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  update();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initParallax);
} else {
  initParallax();
}
