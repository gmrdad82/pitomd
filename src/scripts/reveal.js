// reveal.js — reveal-on-scroll orchestration.
//
// Adds `.is-in` to any [data-reveal] element when it enters the viewport (CSS
// in global.css does the transition). Also drives text fx — scramble and
// typewriter — declared via [data-fx="scramble"|"typewriter"], fired once on
// enter. All effects are skipped under prefers-reduced-motion (content shows
// final state immediately).

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*<>/\\|01";

// Scramble: cycle random glyphs that resolve left-to-right into the final text.
function scramble(el) {
  const final = el.dataset.fxText || el.textContent || "";
  el.textContent = final;
  if (reduceMotion) return;

  const len = final.length;
  let frame = 0;
  const settleEvery = 2; // frames a char scrambles before it locks (× index)

  const tick = () => {
    let out = "";
    let done = true;
    for (let i = 0; i < len; i++) {
      const lockAt = i * settleEvery;
      const ch = final[i];
      if (frame >= lockAt || ch === " " || ch === "\n") {
        out += ch;
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        done = false;
      }
    }
    el.textContent = out;
    frame++;
    if (!done) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Typewriter: type the final text one code point at a time with a blinking
// caret. Honors data-fx-speed (ms per char, default 45).
function typewriter(el) {
  const final = el.dataset.fxText || el.textContent || "";
  if (reduceMotion) {
    el.textContent = final;
    return;
  }
  const speed = Number(el.dataset.fxSpeed || 45);
  const chars = Array.from(final);
  el.textContent = "";
  el.classList.add("is-typing");
  let i = 0;
  const step = () => {
    if (i < chars.length) {
      el.textContent += chars[i++];
      setTimeout(step, speed);
    } else {
      el.classList.remove("is-typing");
    }
  };
  step();
}

function runFx(el) {
  if (el.dataset.fxDone) return;
  el.dataset.fxDone = "1";
  const kind = el.dataset.fx;
  if (kind === "scramble") scramble(el);
  else if (kind === "typewriter") typewriter(el);
}

function initReveal() {
  const reveals = document.querySelectorAll("[data-reveal]");
  const fxEls = document.querySelectorAll("[data-fx]");

  // Stash original text so fx can restore the final string, and clear it so
  // there's no flash of full text before the effect runs.
  fxEls.forEach((el) => {
    if (!el.dataset.fxText) el.dataset.fxText = el.textContent.trim();
    if (!reduceMotion && el.dataset.fx === "typewriter") el.textContent = "";
  });

  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("is-in"));
    fxEls.forEach((el) => (el.textContent = el.dataset.fxText));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        if (el.hasAttribute("data-reveal")) el.classList.add("is-in");
        if (el.hasAttribute("data-fx")) runFx(el);
        obs.unobserve(el);
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );

  reveals.forEach((el) => io.observe(el));
  fxEls.forEach((el) => io.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReveal);
} else {
  initReveal();
}
