// currency.js — scrambles the currency symbol on price amounts ON SCROLL.
//
// Each [data-cur] element (the "$" in front of a price) does a short scramble
// burst and settles on a currency ($ € £ ¥) WHEN IT SCROLLS INTO VIEW — not on
// a loop. Scroll away and back and it re-scrambles, landing on the next
// currency. The NUMBER never changes. Reduced-motion leaves the static "$".

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const CURRENCIES = ["$", "€", "£", "¥"];
const POOL = "$€£¥₿¢₽₹₩";

function scrambleTo(el, target) {
  let frames = 9; // quick flicker, then lock — slow enough to read
  const tick = () => {
    if (frames > 0) {
      el.textContent = POOL[Math.floor(Math.random() * POOL.length)];
      frames--;
      setTimeout(tick, 55);
    } else {
      el.textContent = target;
    }
  };
  tick();
}

function initCurrency() {
  const els = Array.from(document.querySelectorAll("[data-cur]"));
  if (!els.length || reduceMotion) return;

  let counter = 0;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          scrambleTo(e.target, CURRENCIES[counter++ % CURRENCIES.length]);
        }
      }
    },
    { threshold: 1, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCurrency);
} else {
  initCurrency();
}
