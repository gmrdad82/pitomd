// countdown.js — the PURE state machine behind the root teaser's countdown
// (tested by vitest, same discipline as cover-pool-assign.js: no DOM, no
// canvas, injectable rand for determinism).
//
// COUNTDOWN v2 — the owner's ruling (verbatim), superseding the original
// "ever-growing digit count" mechanic:
//
//   1. the counter should be like dd:hh:mm:ss:zzz if possible.
//   2. when any of the butterflies touches the/collides with the countdown
//      a random amount of seconds, minutes, hours or days are added. Be
//      gentle to not add like 100+ days to the counter.
//   3. it should read in 2 rows: dd:hh:mm:ss:zzz and a row below, with
//      smaller fonts Days, Hours, Minutes, Seconds, Milliseconds.
//   4. butterflies should bounce randomly from the countdown. butterflies
//      should not go beneath the countdown.
//
// This module owns three independent, pure concerns:
//
//   - REAL TIME: the counter genuinely ticks DOWN (tickCountdown). The
//     "doesn't make sense" joke isn't the ticking anymore, it's that it can
//     never actually finish — every collision (addTime, fed by
//     pickGentleAddMs's weighted-gentle roll) buys it more time before it
//     reaches zero. It CAN still hit zero (e.g. under prefers-reduced-motion,
//     where nothing ever collides with it) — that's fine, spec-intended.
//   - FORMAT: formatCountdown / formatCountdownParts render the dd:hh:mm:ss:zzz
//     string (and its per-group parts, for the two-row markup).
//   - BOUNCE GEOMETRY: rectsIntersect / circleRectCollision / reflectVelocity /
//     resolveBounce are the pure collision-and-reflection primitives the
//     butterfly flock (src/lib/sky-flock.js) calls every frame so a
//     butterfly's bounding circle can never overlap the countdown box's
//     bounding rect — extracted here (not sky-flock.js) so they're testable
//     without a canvas or a DOM.
//
// All functions are pure: same inputs -> same outputs, no shared mutable
// state, `rand` always injectable (production passes Math.random, tests pass
// a seeded fn).

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// "keep a sane cap so the display never exceeds 99 days total" — two digits
// of `dd` is exactly enough for this cap, by construction.
export const MAX_TOTAL_MS = 99 * DAY_MS;

// "NEVER more than 3 days per event" — enforced both in the weighted roll
// below AND (defense in depth) inside addTime itself, so no caller can ever
// push a single event past it.
export const MAX_ADD_MS = 3 * DAY_MS;

// The page-load starting point. Arbitrary by design (there is no real target
// date — the countdown counts down to nothing in particular); chosen just
// long enough that it reads as a "real" countdown, short enough that
// reduced-motion visitors (who get no collisions, ever) see it move.
export const DEFAULT_INITIAL_MS = 2 * DAY_MS + 3 * HOUR_MS + 7 * MINUTE_MS;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// createCountdownState(initialMs) — the page-load roll. Clamped into
// [0, MAX_TOTAL_MS] so a caller can never hand it a nonsense starting point.
export function createCountdownState(initialMs = DEFAULT_INITIAL_MS) {
  return { remainingMs: clamp(Math.round(initialMs), 0, MAX_TOTAL_MS) };
}

// tickCountdown(state, deltaMs) — a REAL tick down by deltaMs (wall-clock
// milliseconds elapsed since the last frame). Floors at 0 and stays there —
// never negative. Pure: returns a new state.
export function tickCountdown(state, deltaMs) {
  if (!(deltaMs > 0)) return { remainingMs: state.remainingMs };
  return { remainingMs: Math.max(0, state.remainingMs - deltaMs) };
}

// ── Gentle time-add (owner rule 2) ──────────────────────────────────────
//
// Weighted tiers: mostly seconds, often minutes, sometimes hours, rarely
// days — weights are relative (need not sum to 100, but do here for
// readability). Each tier's ms range is chosen so the tiers never overlap
// in the resulting millisecond value (max minutes < min hours < ... etc),
// which is handy for black-box testing: you can tell which tier produced a
// given ms value just by its magnitude.
const ADD_TIERS = [
  { ms: SECOND_MS, min: 1, max: 59, weight: 55 }, // mostly seconds
  { ms: MINUTE_MS, min: 1, max: 59, weight: 30 }, // often minutes
  { ms: HOUR_MS, min: 1, max: 23, weight: 12 }, // sometimes hours
  { ms: DAY_MS, min: 1, max: 3, weight: 3 }, // rarely days (capped at 3)
];

// pickGentleAddMs(rand) — one gentle random amount of time, per the owner's
// weighted distribution. Always > 0, always <= MAX_ADD_MS.
export function pickGentleAddMs(rand = Math.random) {
  const total = ADD_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = rand() * total;
  let tier = ADD_TIERS[ADD_TIERS.length - 1];
  for (const candidate of ADD_TIERS) {
    if (roll < candidate.weight) {
      tier = candidate;
      break;
    }
    roll -= candidate.weight;
  }
  const span = tier.max - tier.min + 1;
  const units = tier.min + Math.floor(rand() * span);
  return Math.min(MAX_ADD_MS, units * tier.ms);
}

// ── Reset (owner amendment to the tap wiring) ───────────────────────────
//
// "clicking on the countdown should reset to something random every time,
// not just make it bigger and bigger." A tap/click/Enter/Space RESETS the
// countdown to a fresh random remaining time; only butterfly collisions
// still ADD (the gentle roll above). The roll is log-uniform across the
// whole sane range so short and long lives are both common — a linear roll
// would make nearly every reset read as "weeks".
export const MIN_RESET_MS = 10 * MINUTE_MS;

export function rollResetMs(rand = Math.random) {
  const ratio = MAX_TOTAL_MS / MIN_RESET_MS;
  return clamp(
    Math.round(MIN_RESET_MS * ratio ** rand()),
    MIN_RESET_MS,
    MAX_TOTAL_MS,
  );
}

// addTime(state, ms) — apply a gentle add to the countdown. The increment
// itself is clamped to MAX_ADD_MS (defense in depth against a caller passing
// something silly) and the resulting total is clamped to MAX_TOTAL_MS (the
// "never exceeds 99 days total" cap). Pure.
export function addTime(state, ms) {
  const amount = clamp(Math.round(ms), 0, MAX_ADD_MS);
  return { remainingMs: clamp(state.remainingMs + amount, 0, MAX_TOTAL_MS) };
}

// ── Relative time (owner amendment: "Time should be kinda relative") ────
//
// "Basically we calculate that we'll be ready at 10th of September. That
// means that no matter how many days, hours, minutes, seconds we display
// we count them faster or slower. ... Butterflies can add or subtract
// days, hours, minutes or seconds but the duration will remain the same."
// (Date corrected by the owner, same day: "I meant 10 August not 10
// September".)
//
// The DISPLAY is elastic, the DEADLINE is real. The displayed remaining
// time starts as the true wall-clock remaining to the deadline; butterfly
// events and tap resets change only the display. The tick then burns
// display-milliseconds at rate = display / real-remaining — recomputed
// every tick — so display and reality reach zero at the same instant no
// matter what the butterflies did: more display just ticks faster, less
// ticks slower. Parsed by the page in the visitor's local time, so the
// countdown ends at their September 10th.
export const REAL_DEADLINE_ISO = "2026-08-10T00:00:00";

export function realRemainingMs(nowMs, deadlineMs) {
  return Math.max(0, deadlineMs - nowMs);
}

// createElasticState(nowMs, deadlineMs) — the display starts honest: the
// true remaining time (capped at the 99-day display ceiling).
export function createElasticState(nowMs, deadlineMs) {
  return {
    displayMs: Math.min(realRemainingMs(nowMs, deadlineMs), MAX_TOTAL_MS),
    deadlineMs,
  };
}

// tickElastic(state, nowBeforeMs, nowAfterMs) — burn display time at the
// elastic rate. Pure. Once the real deadline has passed the display pins
// to 0 — unlike v2, this countdown genuinely finishes, on the real date.
export function tickElastic(state, nowBeforeMs, nowAfterMs) {
  const real = realRemainingMs(nowBeforeMs, state.deadlineMs);
  if (real <= 0) return { ...state, displayMs: 0 };
  const delta = Math.max(0, nowAfterMs - nowBeforeMs);
  const rate = state.displayMs / real;
  return { ...state, displayMs: Math.max(0, state.displayMs - delta * rate) };
}

// The display floor for events (owner: "Never go bellow 59s"): a
// butterfly subtraction or a cruel reset roll can never leave the display
// under 59 seconds — only the natural elastic tick may run it below, on
// its way to zero at the real deadline.
export const MIN_DISPLAY_MS = 59 * SECOND_MS;

// pickGentleDeltaMs(rand) — the collision roll with a SIGN (owner:
// butterflies "can add or subtract"): same gentle magnitude tiers, then a
// fair coin for the direction.
export function pickGentleDeltaMs(rand = Math.random) {
  const magnitude = pickGentleAddMs(rand);
  return rand() < 0.5 ? magnitude : -magnitude;
}

// applyElasticDelta(state, deltaMs, nowMs) — a butterfly bends the display
// (and therefore the tick speed — never the deadline). Inert once the real
// deadline has passed: a finished countdown stays finished.
export function applyElasticDelta(state, deltaMs, nowMs) {
  if (realRemainingMs(nowMs, state.deadlineMs) <= 0)
    return { ...state, displayMs: 0 };
  const amount = clamp(Math.round(deltaMs), -MAX_ADD_MS, MAX_ADD_MS);
  return {
    ...state,
    displayMs: clamp(state.displayMs + amount, MIN_DISPLAY_MS, MAX_TOTAL_MS),
  };
}

// resetElastic(state, nowMs, rand) — the tap: a fresh random display,
// every time. The rate math absorbs it; the deadline never moves. Inert
// after the deadline, like the deltas.
export function resetElastic(state, nowMs, rand = Math.random) {
  if (realRemainingMs(nowMs, state.deadlineMs) <= 0)
    return { ...state, displayMs: 0 };
  return {
    ...state,
    displayMs: clamp(rollResetMs(rand), MIN_DISPLAY_MS, MAX_TOTAL_MS),
  };
}

// ── Format (owner rule 1 + 3) ────────────────────────────────────────────

function pad(n, width) {
  return String(Math.trunc(n)).padStart(width, "0");
}

// formatCountdownParts(remainingMs) — the five zero-padded group strings, in
// the order the two-row markup needs them (numbers row AND labels row share
// this same order: Days, Hours, Minutes, Seconds, Milliseconds).
export function formatCountdownParts(remainingMs) {
  const clamped = Math.max(0, Math.round(remainingMs));
  const days = Math.floor(clamped / DAY_MS);
  const hours = Math.floor((clamped % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((clamped % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((clamped % MINUTE_MS) / SECOND_MS);
  const millis = clamped % SECOND_MS;
  return {
    dd: pad(days, 2),
    hh: pad(hours, 2),
    mm: pad(minutes, 2),
    ss: pad(seconds, 2),
    zzz: pad(millis, 3),
  };
}

// formatCountdown(remainingMs) — the single dd:hh:mm:ss:zzz string (owner
// rule 1, verbatim format).
export function formatCountdown(remainingMs) {
  const p = formatCountdownParts(remainingMs);
  return `${p.dd}:${p.hh}:${p.mm}:${p.ss}:${p.zzz}`;
}

// ── Bounce geometry (owner rule 4) ───────────────────────────────────────
// Pure primitives only — no canvas, no DOM, no animation-frame timing. The
// caller (sky-flock.js) supplies plain rects/vectors in whatever coordinate
// space it's already working in (it uses page/canvas px).

// rectsIntersect(a, b) — axis-aligned rect overlap test. Rect shape:
// { x, y, width, height }.
export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// circleRectCollision(cx, cy, r, rect) — null if the circle (center cx,cy,
// radius r) doesn't touch rect; otherwise { nx, ny, penetration }: (nx,ny) is
// the unit outward normal (pointing from the rect's surface toward the
// circle's center — the direction to push the circle to clear the rect) and
// penetration is how far the circle center needs to move along that normal
// to no longer overlap.
export function circleRectCollision(cx, cy, r, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  let dx = cx - closestX;
  let dy = cy - closestY;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    // The circle's center is inside the rect (can happen on a fast frame,
    // e.g. right after a resize): push out toward the nearest edge.
    const left = cx - rect.x;
    const right = rect.x + rect.width - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.height - cy;
    const nearest = Math.min(left, right, top, bottom);
    if (nearest === left) return { nx: -1, ny: 0, penetration: r + nearest };
    if (nearest === right) return { nx: 1, ny: 0, penetration: r + nearest };
    if (nearest === top) return { nx: 0, ny: -1, penetration: r + nearest };
    return { nx: 0, ny: 1, penetration: r + nearest };
  }

  if (dist >= r) return null;
  return { nx: dx / dist, ny: dy / dist, penetration: r - dist };
}

// reflectVelocity(vx, vy, nx, ny, jitter, rand) — mirror a heading (vx,vy)
// about the surface normal (nx,ny), then rotate the result by a random angle
// in [-jitter, jitter] radians. jitter=0 is a perfect mirror; the owner asked
// for the opposite ("not a perfect mirror — they are butterflies, add
// jitter"), so callers should always pass a nonzero jitter in production.
export function reflectVelocity(
  vx,
  vy,
  nx,
  ny,
  jitter = 0,
  rand = Math.random,
) {
  const dot = vx * nx + vy * ny;
  let rx = vx - 2 * dot * nx;
  let ry = vy - 2 * dot * ny;

  if (jitter > 0) {
    const angle = (rand() * 2 - 1) * jitter;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const jx = rx * cos - ry * sin;
    const jy = rx * sin + ry * cos;
    rx = jx;
    ry = jy;
  }
  return { vx: rx, vy: ry };
}

// resolveBounce(cx, cy, vx, vy, radius, rect, opts) — the whole per-frame
// contract in one call: guarantees the circle never overlaps rect (owner
// rule 4, "no overlap … ever") by pushing it fully outside along the
// collision normal, and hands back a jittered reflection of its heading so
// the caller can redirect the butterfly's flight. Passthrough (collided:
// false, same cx/cy/vx/vy) when there's no collision.
export function resolveBounce(
  cx,
  cy,
  vx,
  vy,
  radius,
  rect,
  { jitter = 0.6, rand = Math.random } = {},
) {
  const hit = circleRectCollision(cx, cy, radius, rect);
  if (!hit) return { x: cx, y: cy, vx, vy, collided: false };

  const clear = hit.penetration + 0.01; // nudge past the boundary, never on it
  const x = cx + hit.nx * clear;
  const y = cy + hit.ny * clear;
  const { vx: rvx, vy: rvy } = reflectVelocity(
    vx,
    vy,
    hit.nx,
    hit.ny,
    jitter,
    rand,
  );
  return { x, y, vx: rvx, vy: rvy, collided: true };
}
