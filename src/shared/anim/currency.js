const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const CURRENCIES = ["$", "€", "£", "¥"];
const POOL = "$€£¥₿¢₽₹₩";

const STEP_PX = 120;

function scrambleTo(el, target) {
  let frames = 8;
  el._scrambling = true;
  const tick = () => {
    if (frames > 0) {
      el.textContent = POOL[Math.floor(Math.random() * POOL.length)];
      frames--;
      setTimeout(tick, 55);
    } else {
      el.textContent = target;
      el._scrambling = false;
    }
  };
  tick();
}

function initCurrency() {
  const els = Array.from(document.querySelectorAll("[data-cur]"));
  if (!els.length || reduceMotion) return;

  const onScreen = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      }
    },
    { rootMargin: "0px 0px -5% 0px" },
  );
  els.forEach((el) => {
    el._cur = 0;
    el._anchorY = window.scrollY;
    io.observe(el);
  });

  let ticking = false;
  function update() {
    const y = window.scrollY;
    for (const el of onScreen) {
      if (el._scrambling) continue;
      if (Math.abs(y - el._anchorY) >= STEP_PX) {
        el._anchorY = y;
        el._cur = (el._cur + 1) % CURRENCIES.length;
        scrambleTo(el, CURRENCIES[el._cur]);
      }
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCurrency);
} else {
  initCurrency();
}
