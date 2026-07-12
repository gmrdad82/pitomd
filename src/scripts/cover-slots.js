// cover-slots.js — per-VISIT random covers, picked eagerly, loaded lazily.
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
import pool from "../data/cover-pool.json";
import { assignCovers } from "../lib/cover-pool-assign.js";

const VAR_BY_KIND = { bed: "--cover", wall: "--cover-src" };

function init() {
  const slots = Array.from(document.querySelectorAll("[data-cover-slot]"));
  if (!slots.length) return;

  let deal;
  try {
    deal = assignCovers(pool, slots.length);
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
