// themes.js — the live auto-cycling theme showcase (section 7).
//
// Re-themes a [data-theme-cycle] element in place by swapping its data-theme
// through all 19 pito palettes, updating the visible theme name + a row of
// accent swatches. Pauses on hover/focus; respects reduced motion (still lets
// the visitor step through manually via the prev/next controls).

const THEMES = [
  "tokyo-night",
  "synthwave",
  "dracula",
  "catppuccin-mocha",
  "nord",
  "gruvbox-dark",
  "ayu-dark",
  "ayu-mirage",
  "github-dark",
  "one-dark",
  "solarized-dark",
  "tomorrow-night",
  "catppuccin-latte",
  "ayu-light",
  "github-light",
  "gruvbox-light",
  "one-light",
  "solarized-light",
  "tomorrow",
];

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function initThemeCycle() {
  const stage = document.querySelector("[data-theme-cycle]");
  if (!stage) return;

  const nameEl = stage.querySelector("[data-theme-name]");
  const idxEl = stage.querySelector("[data-theme-index]");
  const prev = stage.querySelector("[data-theme-prev]");
  const next = stage.querySelector("[data-theme-next]");
  const shot = stage.querySelector("[data-theme-shot]");

  let i = 0;
  let timer = null;

  const apply = (n) => {
    i = (n + THEMES.length) % THEMES.length;
    const slug = THEMES[i];
    stage.setAttribute("data-theme", slug);
    if (nameEl) nameEl.textContent = slug;
    if (idxEl)
      idxEl.textContent = `${String(i + 1).padStart(2, "0")} / ${THEMES.length}`;
    if (shot) {
      shot.src = `/media/themes/${slug}.png`;
      shot.alt = `PITO in the ${slug} theme`;
    }
  };

  const start = () => {
    if (reduceMotion || timer) return;
    timer = setInterval(() => apply(i + 1), 2200);
  };
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  prev?.addEventListener("click", () => {
    stop();
    apply(i - 1);
  });
  next?.addEventListener("click", () => {
    stop();
    apply(i + 1);
  });
  stage.addEventListener("pointerenter", stop);
  stage.addEventListener("pointerleave", start);
  stage.addEventListener("focusin", stop);
  stage.addEventListener("focusout", start);

  // Only auto-cycle while the section is on screen.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) start();
        else stop();
      }
    },
    { threshold: 0.4 },
  );
  io.observe(stage);

  apply(0);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeCycle);
} else {
  initThemeCycle();
}
