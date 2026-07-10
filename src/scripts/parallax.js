// parallax.js — scroll-driven depth layers for #pain, #price, #shinies, #free.
//
// On each scroll frame, reads how far each target section's centre sits from the
// viewport centre (--scroll-p, range roughly -1.5..1.5) and writes it as a CSS
// custom property. The CSS layers combine this with pointer.js's --par-x/--par-y
// in ONE transform (or translate) per element so scroll + cursor compose cleanly.
//
// Disabled under prefers-reduced-motion; the CSS layers then resolve to 0px.

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function initParallax() {
  if (reduceMotion) return;

  const targets = Array.from(
    document.querySelectorAll(
      "#pain, #price, #shinies, #free, #hero, #linkage, #chatbox, #footage",
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
      // Clamp so far-off-screen sections don't over-shift their layers
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

  // Initialise --scroll-p before the first scroll event
  update();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initParallax);
} else {
  initParallax();
}
