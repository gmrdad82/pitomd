// The Resting wave from Pito Studio's splash, ported line-for-line from
// the app's CPU shape model (pito-studio src/chroma.rs paint_resting):
// two counter-drifting layers of sine-braided ribbon, each column split
// into 18 soft bands with a quadratic falloff, wearing the house
// gradient pink → purple → blue across the width. Period 18s, same as
// the desktop. prefers-reduced-motion gets one still frame.

const PERIOD = 18.0;
const TAU = Math.PI * 2;
const BANDS = 18;

const PINK = [255, 110, 199];
const PURPLE = [128, 131, 251];
const BLUE = [81, 112, 255];

// (dir, phase, peak, swing, girth) — verbatim from the desktop model.
const LAYERS = [
  [1.0, 0.0, 0.16, 0.24, 0.28],
  [-1.0, 2.9, 0.09, 0.18, 0.22],
];

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// The house gradient bends at 0.55, exactly like the app's theme.
function gradientAt(t) {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.55
    ? mix(PINK, PURPLE, u / 0.55)
    : mix(PURPLE, BLUE, (u - 0.55) / 0.45);
}

// Smoothstep fade over the top/bottom 22% so the wave dissolves before
// it can touch an edge.
function edgeFade(y, h) {
  if (h <= 0) return 1;
  const margin = h * 0.22;
  const top = Math.min(1, Math.max(0, y / margin));
  const bottom = Math.min(1, Math.max(0, (h - y) / margin));
  const near = Math.min(top, bottom);
  return near * near * (3 - 2 * near);
}

function paint(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h);
  const cols = Math.min(180, Math.max(24, Math.floor(w / 4)));
  const step = w / cols;

  for (const [dir, ph, peak, swing, girth] of LAYERS) {
    for (let i = 0; i < cols; i++) {
      const x = i * step;
      const u = i / cols;

      const a = Math.sin(u * 3.1 + (dir * TAU * t) / PERIOD + ph);
      const b = Math.sin(u * 7.7 - (dir * 2 * TAU * t) / PERIOD + 1.7 + ph);
      const c = Math.sin(u * 1.3 + (dir * TAU * t) / PERIOD + 4.2 + ph * 1.3);

      const center = h * (0.5 + swing * a + 0.12 * b);
      const thickness = h * (girth + 0.13 * c);
      const [r, g, bl] = gradientAt(u * 0.8 + 0.1 + 0.1 * a);
      const bandH = (thickness * 2) / BANDS + 1.2;

      for (let s = 0; s < BANDS; s++) {
        const k = s / (BANDS - 1);
        const spread = (k - 0.5) * 2;
        const y = center + spread * thickness;
        const fade =
          Math.pow(Math.max(0, 1 - spread * spread), 1.6) *
          peak *
          edgeFade(y, h);
        if (fade <= 0.002) continue;
        ctx.fillStyle = `rgb(${r} ${g} ${bl} / ${fade.toFixed(3)})`;
        ctx.fillRect(x, y, step + 1, bandH);
      }
    }
  }
}

export function initRestingWave(canvas) {
  if (!canvas || typeof canvas.getContext !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let w = 0;
  let h = 0;
  let raf = null;
  let running = false;
  let born = performance.now();

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) paint(ctx, w, h, media.matches ? 0 : (performance.now() - born) / 1000);
  };

  const stop = () => {
    running = false;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  };

  const start = () => {
    if (running) return;
    if (media.matches) {
      paint(ctx, w, h, 0);
      return;
    }
    running = true;
    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      paint(ctx, w, h, (now - born) / 1000);
    };
    raf = requestAnimationFrame(frame);
  };

  const control = new AbortController();
  const { signal } = control;
  window.addEventListener("resize", fit, { signal, passive: true });
  document.addEventListener(
    "visibilitychange",
    () => (document.hidden ? stop() : start()),
    { signal },
  );
  media.addEventListener?.("change", () => {
    stop();
    if (media.matches) {
      paint(ctx, w, h, 0);
    } else {
      start();
    }
  });

  fit();
  start();
  return {
    destroy() {
      control.abort();
      stop();
    },
  };
}
