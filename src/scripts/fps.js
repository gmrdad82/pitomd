// fps.js — F9 toggles a floating FPS chip.
//
// F9 is the perf-toggle key pito web and pito-tui already use; this site
// mirrors it. Nothing exists until the first press: no chip in the DOM, no
// rAF loop running — genuinely zero cost until someone asks. Pressing F9
// again stops the loop entirely (not just hides it) and hides the chip.
//
// The count is a true sliding window: every frame timestamp lands in a
// queue, the queue drops anything older than 1s, and the chip reads its
// length — so the number updates every frame instead of jumping once a
// second.

const WINDOW_MS = 1000;

function initFps() {
  let chip = null;
  let raf = null;
  let frameTimes = [];

  const isTypingTarget = (el) =>
    !!el &&
    typeof el.closest === "function" &&
    !!el.closest("input, textarea, [contenteditable='true']");

  const ensureChip = () => {
    if (chip) return chip;
    chip = document.createElement("div");
    chip.className = "fps-chip";
    chip.setAttribute("aria-hidden", "true");
    chip.textContent = "-- fps";
    document.body.appendChild(chip);
    return chip;
  };

  const loop = (now) => {
    frameTimes.push(now);
    const cutoff = now - WINDOW_MS;
    while (frameTimes.length && frameTimes[0] < cutoff) frameTimes.shift();
    chip.textContent = `${frameTimes.length} fps`;
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    ensureChip().classList.add("is-on");
    frameTimes = [];
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (chip) chip.classList.remove("is-on");
  };

  window.addEventListener("keydown", (e) => {
    if (e.key !== "F9" || isTypingTarget(e.target)) return;
    if (raf) stop();
    else start();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFps);
} else {
  initFps();
}
