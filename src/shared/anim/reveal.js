const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*<>/\\|01";

function scramble(el) {
  const final = el.dataset.fxText || el.textContent || "";
  el.textContent = final;
  if (reduceMotion) return;

  const len = final.length;
  let frame = 0;
  const settleEvery = 2;

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

function typewriter(el) {
  const final = el.dataset.fxText || el.textContent || "";
  if (reduceMotion) {
    el.textContent = final;
    return;
  }
  const speed = Number(el.dataset.fxSpeed || 45);
  const chars = Array.from(final);
  el.style.minHeight = `${el.offsetHeight}px`;
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

function comet(el) {
  const final = el.dataset.fxText || el.textContent || "";
  if (reduceMotion) {
    el.textContent = final;
    return;
  }
  el.textContent = "";
  let ci = 0;
  for (const token of final.split(/([^\S\u00A0]+)/)) {
    if (token === "") continue;
    if (/^\s+$/.test(token)) {
      el.appendChild(document.createTextNode(token));
      continue;
    }
    const word = document.createElement("span");
    word.className = "cword";
    for (const ch of Array.from(token)) {
      const span = document.createElement("span");
      span.className = "cchar";
      span.style.setProperty("--i", ci++);
      span.textContent = ch;
      word.appendChild(span);
    }
    el.appendChild(word);
  }
}

function runFx(el) {
  if (el.dataset.fxDone) return;
  el.dataset.fxDone = "1";
  const kind = el.dataset.fx;
  const go = () => {
    el.style.visibility = "visible";
    if (kind === "scramble") scramble(el);
    else if (kind === "typewriter") typewriter(el);
    else if (kind === "comet") comet(el);
  };
  const delay = Number(el.dataset.fxDelay || 0);
  if (delay > 0 && !reduceMotion) setTimeout(go, delay);
  else go();
}

function initReveal() {
  const reveals = document.querySelectorAll("[data-reveal]");
  const fxEls = document.querySelectorAll("[data-fx]:not(.scrolly__big)");

  fxEls.forEach((el) => {
    if (!el.dataset.fxText) el.dataset.fxText = el.textContent.trim();
  });

  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("is-in"));
    fxEls.forEach((el) => {
      el.textContent = el.dataset.fxText;
      el.style.visibility = "visible";
    });
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
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
  );

  reveals.forEach((el) => io.observe(el));
  fxEls.forEach((el) => io.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReveal);
} else {
  initReveal();
}
