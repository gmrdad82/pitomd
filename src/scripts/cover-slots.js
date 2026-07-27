// cover-slots.js — per-DAY deterministic covers, picked eagerly, loaded
// lazily.
//
// Every cover surface is a [data-cover-slot] (imgs in YOUR SHELF, the slide
// cover-beds, the bridge's parallax wall). On load, ONE shuffled draw from
// the pool (cover-pool-assign) deals a DISTINCT cover to every slot in DOM
// order — the pick happens up front (so the whole visit is consistent and
// duplicate-free) but the BYTES load on approach only:
//   img slots  — src swap keeps loading="lazy" (the browser defers fetch),
//   bed/wall   — the CSS var is applied by an IntersectionObserver two
//                viewports ahead, so backgrounds fetch as you scroll near.
// No-JS keeps the curated server-rendered covers.
//
// STABLE KEY, NOT A RANDOM DRAW (5.0.0 / P24): the deal is seeded by the UTC
// calendar day, so within a day every visitor and every reload deals the
// SAME arrangement — cover fetches hit the browser/CDN cache instead of
// pulling a fresh random subset per visit — while the shelf still rotates
// day to day. The old per-visit unseeded draw is gone.
import pool from "../data/cover-pool.json";
import { assignCovers, seededRand } from "../lib/cover-pool-assign.js";

const VAR_BY_KIND = { bed: "--cover", wall: "--cover-src" };

function init() {
  const slots = Array.from(document.querySelectorAll("[data-cover-slot]"));
  if (!slots.length) return;

  let deal;
  try {
    const dayKey = new Date().toISOString().slice(0, 10); // e.g. "2026-07-26"
    deal = assignCovers(pool, slots.length, seededRand(`covers:${dayKey}`));
  } catch {
    return; // pool smaller than the page — keep the curated defaults
  }

  const pending = [];
  slots.forEach((el, i) => {
    const cover = deal[i];
    const url = `/covers/${cover.f}.jpg`;
    if (el.dataset.coverSlot === "img") {
      // loading="lazy" stays — assignment is eager, the fetch is not.
      el.src = url;
      el.alt = cover.t;
    } else {
      el.dataset.coverUrl = url;
      pending.push(el);
    }
  });

  if (!pending.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        el.style.setProperty(
          VAR_BY_KIND[el.dataset.coverSlot] || "--cover",
          `url('${el.dataset.coverUrl}')`,
        );
        io.unobserve(el);
      }
    },
    { rootMargin: "200% 0%" },
  );
  pending.forEach((el) => io.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
