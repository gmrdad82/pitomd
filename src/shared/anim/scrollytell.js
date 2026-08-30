const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function initScrolly() {
  const blocks = document.querySelectorAll("[data-scrolly]");
  if (!blocks.length) return;

  const cometize = (el) => {
    if (!el) return;
    const text =
      el.dataset.cometText || (el.dataset.cometText = el.textContent.trim());
    el.textContent = "";
    let ci = 0;
    for (const token of text.split(/([^\S\u00A0]+)/)) {
      if (token === "") continue;
      if (/^\s+$/.test(token)) {
        el.appendChild(document.createTextNode(token));
        continue;
      }
      const word = document.createElement("span");
      word.className = "cword";
      for (const ch of Array.from(token)) {
        const s = document.createElement("span");
        s.className = "cchar";
        s.style.setProperty("--i", ci++);
        s.textContent = ch;
        word.appendChild(s);
      }
      el.appendChild(word);
    }
  };

  blocks.forEach((block) => {
    const steps = Array.from(block.querySelectorAll("[data-scrolly-step]"));
    if (!steps.length) return;
    const progressEl = block.querySelector("[data-scrolly-progress]");
    const dotsRail = block.querySelector("[data-scrolly-dots]");
    const dots = dotsRail
      ? steps.map(() => {
          const dot = document.createElement("span");
          dot.className = "said-ticker-dot";
          dot.appendChild(document.createElement("i"));
          dotsRail.appendChild(dot);
          return dot;
        })
      : [];

    if (reduceMotion) {
      steps.forEach((s) => {
        s.classList.add("is-active");
        s.querySelectorAll('[data-fx="comet"]').forEach((h) => {
          if (h.dataset.cometText) h.textContent = h.dataset.cometText;
        });
      });
      return;
    }

    let ticking = false;
    let current = -1;

    const update = () => {
      ticking = false;
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      if (idx !== current) {
        current = idx;
        steps.forEach((s, i) => {
          s.classList.toggle("is-active", i === idx);
          s.classList.toggle("is-past", i < idx);
        });
        steps[idx].querySelectorAll('[data-fx="comet"]').forEach(cometize);
      }
      if (dots.length) {
        const stepP = Math.min(1, Math.max(0, p * steps.length - idx));
        dots.forEach((dot, i) => {
          dot.classList.toggle("is-on", i === idx);
          const tick = dot.firstChild;
          if (i === idx) {
            tick.style.transform = `scaleX(${stepP.toFixed(3)})`;
            tick.style.transition = "none";
          } else {
            tick.style.transform = "scaleX(0)";
          }
        });
      }
      if (progressEl) {
        progressEl.style.setProperty("--p", p.toFixed(4));
        progressEl.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(
          steps.length,
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
