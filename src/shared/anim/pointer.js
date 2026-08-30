const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

function initPointer() {
  if (reduceMotion || !finePointer) return;

  const body = document.body;
  let px = window.innerWidth / 2;
  let py = window.innerHeight / 2;
  let ticking = false;

  let remeasureQueued = false;
  const remeasure = () => {
    remeasureQueued = false;
    refreshElementRects();
  };
  const queueRemeasure = () => {
    if (remeasureQueued) return;
    remeasureQueued = true;
    requestAnimationFrame(remeasure);
  };
  window.addEventListener("scroll", queueRemeasure, { passive: true });
  window.addEventListener("resize", queueRemeasure, { passive: true });

  const updateParallaxVars = () => {
    body.style.setProperty("--par-x", (px / window.innerWidth - 0.5) * 2);
    body.style.setProperty("--par-y", (py / window.innerHeight - 0.5) * 2);
  };

  const magnets = Array.from(document.querySelectorAll("[data-magnetic]"));
  const applyMagnets = (rects) => {
    for (let i = 0; i < magnets.length; i++) {
      const el = magnets[i];
      const r = rects[i];
      if (r.bottom < -60 || r.top > window.innerHeight + 60) {
        if (el.style.transform) el.style.transform = "";
        continue;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) * 1.2;
      if (dist < radius) {
        const pull = (1 - dist / radius) * 0.22;
        const tx = Math.max(-16, Math.min(16, dx * pull));
        const ty = Math.max(-16, Math.min(16, dy * pull));
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        el.style.transform = "";
      }
    }
  };

  let tilts = Array.from(document.querySelectorAll("[data-tilt]"));
  const touchesTilt = (n) =>
    n.nodeType === 1 &&
    (n.matches?.("[data-tilt]") || n.querySelector?.("[data-tilt]"));
  new MutationObserver((muts) => {
    if (
      muts.some((m) => [...m.addedNodes, ...m.removedNodes].some(touchesTilt))
    ) {
      tilts = Array.from(document.querySelectorAll("[data-tilt]"));
      refreshElementRects();
    }
  }).observe(document.body, { childList: true, subtree: true });
  const applyTilt = (rects) => {
    for (let i = 0; i < tilts.length; i++) {
      const el = tilts[i];
      const r = rects[i];
      if (
        px < r.left - 60 ||
        px > r.right + 60 ||
        py < r.top - 60 ||
        py > r.bottom + 60
      ) {
        el.style.transform = "";
        continue;
      }
      const rx = ((py - (r.top + r.height / 2)) / r.height) * -10;
      const ry = ((px - (r.left + r.width / 2)) / r.width) * 10;
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  };

  const POINTER_WORK_MIN_MS = 33;
  let lastWorkTime = 0;

  const POINTER_MOVE_MIN_DELTA_PX = 2;

  let magnetRects = [];
  let tiltRects = [];
  function refreshElementRects() {
    magnetRects = magnets.map((el) => el.getBoundingClientRect());
    tiltRects = tilts.map((el) => el.getBoundingClientRect());
  }
  refreshElementRects();

  const onFrame = (now) => {
    if (now - lastWorkTime < POINTER_WORK_MIN_MS) {
      requestAnimationFrame(onFrame);
      return;
    }
    lastWorkTime = now;
    updateParallaxVars();
    if (magnets.length) applyMagnets(magnetRects);
    if (tilts.length) applyTilt(tiltRects);
    ticking = false;
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      if (
        dx * dx + dy * dy <
        POINTER_MOVE_MIN_DELTA_PX * POINTER_MOVE_MIN_DELTA_PX
      )
        return;
      px = e.clientX;
      py = e.clientY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onFrame);
      }
    },
    { passive: true },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPointer);
} else {
  initPointer();
}
