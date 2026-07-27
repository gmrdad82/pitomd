// countdown.test.js — pins COUNTDOWN v2's pure state machine (owner ruling,
// verbatim in src/lib/countdown.js's header): the real tick-down, the
// gentle weighted time-add (never >3 days/event, 99-day total cap), the
// dd:hh:mm:ss:zzz format, and the bounce geometry primitives that guarantee
// a butterfly's bounding circle never overlaps the countdown box's rect.

import { describe, it, expect } from "vitest";
import {
  SECOND_MS,
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  MAX_TOTAL_MS,
  MAX_ADD_MS,
  DEFAULT_INITIAL_MS,
  createCountdownState,
  tickCountdown,
  addTime,
  pickGentleAddMs,
  MIN_RESET_MS,
  rollResetMs,
  REAL_DEADLINE_ISO,
  MIN_DISPLAY_MS,
  realRemainingMs,
  createElasticState,
  tickElastic,
  pickGentleDeltaMs,
  applyElasticDelta,
  resetElastic,
  formatCountdown,
  formatCountdownParts,
  rectsIntersect,
  circleRectCollision,
  reflectVelocity,
  resolveBounce,
} from "../src/lib/countdown.js";

const seeded = (seed) => () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 10000) / 10000;
};

describe("createCountdownState", () => {
  it("defaults to DEFAULT_INITIAL_MS", () => {
    expect(createCountdownState().remainingMs).toBe(DEFAULT_INITIAL_MS);
  });

  it("accepts a custom starting point", () => {
    expect(createCountdownState(5000).remainingMs).toBe(5000);
  });

  it("clamps a negative seed up to 0", () => {
    expect(createCountdownState(-1000).remainingMs).toBe(0);
  });

  it("clamps an oversized seed down to MAX_TOTAL_MS", () => {
    expect(createCountdownState(MAX_TOTAL_MS * 5).remainingMs).toBe(
      MAX_TOTAL_MS,
    );
  });
});

describe("tickCountdown — a REAL countdown, ticks DOWN (owner rule 1)", () => {
  it("reduces remainingMs by exactly deltaMs", () => {
    const state = { remainingMs: 10_000 };
    expect(tickCountdown(state, 1234).remainingMs).toBe(10_000 - 1234);
  });

  it("floors at 0 — never goes negative", () => {
    const state = { remainingMs: 500 };
    expect(tickCountdown(state, 800).remainingMs).toBe(0);
  });

  it("stays at 0 once it gets there (this IS allowed — reduced-motion never collides)", () => {
    const state = { remainingMs: 0 };
    expect(tickCountdown(state, 16).remainingMs).toBe(0);
  });

  it("a non-positive delta is a no-op", () => {
    const state = { remainingMs: 10_000 };
    expect(tickCountdown(state, 0).remainingMs).toBe(10_000);
    expect(tickCountdown(state, -5).remainingMs).toBe(10_000);
  });

  it("original state is never mutated (pure)", () => {
    const state = { remainingMs: 10_000 };
    const before = JSON.stringify(state);
    tickCountdown(state, 100);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("pickGentleAddMs — weighted gentle add (owner rule 2)", () => {
  it("never exceeds MAX_ADD_MS (3 days) across a wide sample", () => {
    const rand = seeded(42);
    for (let i = 0; i < 5000; i++) {
      expect(pickGentleAddMs(rand)).toBeLessThanOrEqual(MAX_ADD_MS);
    }
  });

  it("is always a positive amount", () => {
    const rand = seeded(7);
    for (let i = 0; i < 1000; i++) {
      expect(pickGentleAddMs(rand)).toBeGreaterThan(0);
    }
  });

  it("roll=0 always lands in the lightest (seconds) tier", () => {
    // First rand() call is the tier roll; 0 is below the first tier's
    // weight share no matter how the tiers are ordered.
    const seq = [0, 0];
    let call = 0;
    const rand = () => seq[call++];
    const ms = pickGentleAddMs(rand);
    expect(ms).toBeGreaterThanOrEqual(SECOND_MS);
    expect(ms).toBeLessThan(MINUTE_MS);
  });

  it("roll near 1 always lands in the heaviest-tail (days) tier, capped at 3", () => {
    const seq = [0.9999, 0.9999];
    let call = 0;
    const rand = () => seq[call++];
    const ms = pickGentleAddMs(rand);
    expect(ms).toBeGreaterThanOrEqual(DAY_MS);
    expect(ms).toBeLessThanOrEqual(3 * DAY_MS);
  });

  it("the distribution is genuinely weighted: mostly seconds, rarely days", () => {
    // The four tiers' ms ranges never overlap by construction (max minutes
    // < min hours < max hours < min days), so a returned value's magnitude
    // alone tells us which tier produced it.
    const rand = seeded(1234);
    let seconds = 0;
    let minutes = 0;
    let hours = 0;
    let days = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const ms = pickGentleAddMs(rand);
      if (ms < MINUTE_MS) seconds++;
      else if (ms < HOUR_MS) minutes++;
      else if (ms < DAY_MS) hours++;
      else days++;
    }
    expect(seconds / N).toBeGreaterThan(0.4); // "mostly seconds"
    expect(minutes / N).toBeGreaterThan(0.15); // "often minutes"
    expect(days / N).toBeLessThan(0.1); // "rarely days"
    expect(hours + days).toBeLessThan(seconds); // never dominates
  });
});

describe("addTime — applying a gentle add (owner rule 2)", () => {
  it("increases remainingMs by the given amount", () => {
    const state = { remainingMs: 1000 };
    expect(addTime(state, 500).remainingMs).toBe(1500);
  });

  it("clamps the increment itself to MAX_ADD_MS (defense in depth)", () => {
    const state = { remainingMs: 0 };
    expect(addTime(state, 10 * DAY_MS).remainingMs).toBe(MAX_ADD_MS);
  });

  it("never lets the total exceed MAX_TOTAL_MS (99 days)", () => {
    const state = { remainingMs: MAX_TOTAL_MS - 10 };
    expect(addTime(state, DAY_MS).remainingMs).toBe(MAX_TOTAL_MS);
  });

  it("original state is never mutated (pure)", () => {
    const state = { remainingMs: 1000 };
    const before = JSON.stringify(state);
    addTime(state, 500);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("rollResetMs — the tap reset (owner amendment: 'something random every time')", () => {
  it("stays within [MIN_RESET_MS, MAX_TOTAL_MS] across the whole rand range", () => {
    for (const r of [0, 0.001, 0.25, 0.5, 0.75, 0.999, 1 - 1e-12]) {
      const ms = rollResetMs(() => r);
      expect(ms).toBeGreaterThanOrEqual(MIN_RESET_MS);
      expect(ms).toBeLessThanOrEqual(MAX_TOTAL_MS);
    }
  });

  it("rand=0 lands on the floor, rand→1 approaches the 99-day cap (log-uniform)", () => {
    expect(rollResetMs(() => 0)).toBe(MIN_RESET_MS);
    expect(rollResetMs(() => 1 - 1e-12)).toBeGreaterThan(MAX_TOTAL_MS * 0.99);
  });

  it("different rolls give genuinely different values — a reset, not a nudge", () => {
    const values = new Set(
      [0.1, 0.3, 0.5, 0.7, 0.9].map((r) => rollResetMs(() => r)),
    );
    expect(values.size).toBe(5);
  });

  it("spreads across magnitudes: mid-roll is hours-to-days, not always weeks", () => {
    // log-uniform: the halfway roll sits at the geometric mean of the
    // range (~sqrt(10min * 99d) ≈ 10.5 hours), so short lives are common.
    const mid = rollResetMs(() => 0.5);
    expect(mid).toBeGreaterThan(HOUR_MS);
    expect(mid).toBeLessThan(DAY_MS);
  });
});

describe("relative time — the elastic display over a real deadline (owner amendment 5)", () => {
  const T0 = 1_000_000;

  it("the deadline constant parses to a real future-of-2026 date", () => {
    const d = new Date(REAL_DEADLINE_ISO);
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August ("I meant 10 August")
    expect(d.getDate()).toBe(10);
  });

  it("the display starts honest: exactly the real remaining time", () => {
    const state = createElasticState(T0, T0 + 5 * DAY_MS);
    expect(state.displayMs).toBe(5 * DAY_MS);
  });

  it("an untouched countdown ticks at rate 1 — display equals reality", () => {
    let state = createElasticState(T0, T0 + 10_000);
    state = tickElastic(state, T0, T0 + 4_000);
    expect(state.displayMs).toBeCloseTo(6_000, 6);
  });

  it("an inflated display ticks faster, a deflated one slower — same landing", () => {
    // 20s displayed over 10s real → rate 2: one real second burns two.
    let fat = { displayMs: 20_000, deadlineMs: T0 + 10_000 };
    fat = tickElastic(fat, T0, T0 + 1_000);
    expect(fat.displayMs).toBeCloseTo(18_000, 6);
    // 5s displayed over 10s real → rate 0.5: one real second burns half.
    let thin = { displayMs: 5_000, deadlineMs: T0 + 10_000 };
    thin = tickElastic(thin, T0, T0 + 1_000);
    expect(thin.displayMs).toBeCloseTo(4_500, 6);
  });

  it("whatever the display says, it reaches zero exactly at the deadline", () => {
    for (const displayMs of [1_000, 42_000, 90 * DAY_MS]) {
      const state = { displayMs, deadlineMs: T0 + 10_000 };
      const done = tickElastic(state, T0, T0 + 10_000);
      expect(done.displayMs).toBeCloseTo(0, 6);
    }
  });

  it("after the real deadline the display pins to 0 — finished stays finished", () => {
    const state = { displayMs: 12_345, deadlineMs: T0 };
    expect(tickElastic(state, T0 + 1, T0 + 2).displayMs).toBe(0);
    expect(applyElasticDelta(state, HOUR_MS, T0 + 1).displayMs).toBe(0);
    expect(resetElastic(state, T0 + 1, () => 0.5).displayMs).toBe(0);
  });

  it("pickGentleDeltaMs keeps the gentle magnitude and adds a fair sign", () => {
    // rand sequence: tier roll, unit roll, then the sign coin.
    const seq = (values) => {
      let i = 0;
      return () => values[Math.min(i++, values.length - 1)];
    };
    const plus = pickGentleDeltaMs(seq([0, 0, 0.2]));
    const minus = pickGentleDeltaMs(seq([0, 0, 0.8]));
    expect(plus).toBeGreaterThan(0);
    expect(minus).toBeLessThan(0);
    expect(Math.abs(plus)).toBe(Math.abs(minus));
    expect(Math.abs(plus)).toBeLessThanOrEqual(MAX_ADD_MS);
  });

  it("deltas bend only the display, clamped to the floor and the 99-day cap", () => {
    const deadline = T0 + 50 * DAY_MS;
    const base = createElasticState(T0, deadline);
    const up = applyElasticDelta(base, HOUR_MS, T0);
    expect(up.displayMs).toBe(base.displayMs + HOUR_MS);
    expect(up.deadlineMs).toBe(deadline);
    // subtraction can never strand the display at zero pre-deadline
    const low = { displayMs: MIN_DISPLAY_MS + 1000, deadlineMs: deadline };
    expect(applyElasticDelta(low, -DAY_MS, T0).displayMs).toBe(MIN_DISPLAY_MS);
    // and additions respect the two-digit-days ceiling
    const high = { displayMs: MAX_TOTAL_MS - 1000, deadlineMs: deadline };
    expect(applyElasticDelta(high, DAY_MS, T0).displayMs).toBe(MAX_TOTAL_MS);
  });

  it("resetElastic re-rolls the display and never touches the deadline", () => {
    const deadline = T0 + 30 * DAY_MS;
    const state = createElasticState(T0, deadline);
    const reset = resetElastic(state, T0, () => 0.5);
    expect(reset.deadlineMs).toBe(deadline);
    expect(reset.displayMs).toBeGreaterThanOrEqual(MIN_RESET_MS);
    expect(reset.displayMs).toBeLessThanOrEqual(MAX_TOTAL_MS);
  });

  it("realRemainingMs floors at zero", () => {
    expect(realRemainingMs(T0 + 5, T0)).toBe(0);
    expect(realRemainingMs(T0, T0 + 5)).toBe(5);
  });
});

describe("formatCountdown / formatCountdownParts — dd:hh:mm:ss:zzz (owner rules 1 & 3)", () => {
  it("zero-pads every group: dd(2) hh(2) mm(2) ss(2) zzz(3)", () => {
    expect(formatCountdown(1234)).toBe("00:00:00:01:234");
  });

  it("computes each unit correctly for a multi-day value", () => {
    const ms = 2 * DAY_MS + 3 * HOUR_MS + 4 * MINUTE_MS + 5 * SECOND_MS + 6;
    expect(formatCountdown(ms)).toBe("02:03:04:05:006");
  });

  it("formatCountdownParts exposes the same five groups the two-row markup needs", () => {
    const ms = 5 * DAY_MS + 1000;
    expect(formatCountdownParts(ms)).toEqual({
      dd: "05",
      hh: "00",
      mm: "00",
      ss: "01",
      zzz: "000",
    });
  });

  it("never overflows dd at the 99-day cap", () => {
    expect(formatCountdown(MAX_TOTAL_MS)).toBe("99:00:00:00:000");
  });

  it("clamps a negative value to all-zero rather than going negative", () => {
    expect(formatCountdown(-500)).toBe("00:00:00:00:000");
  });

  it("00:00:00:00:000 at zero", () => {
    expect(formatCountdown(0)).toBe("00:00:00:00:000");
  });
});

describe("rectsIntersect — bounce geometry (owner rule 4)", () => {
  const rect = { x: 100, y: 100, width: 50, height: 30 };

  it("true when rects overlap", () => {
    expect(
      rectsIntersect(rect, { x: 120, y: 110, width: 10, height: 10 }),
    ).toBe(true);
  });

  it("false when rects are disjoint", () => {
    expect(rectsIntersect(rect, { x: 0, y: 0, width: 10, height: 10 })).toBe(
      false,
    );
  });

  it("false when merely adjacent (touching edge, no overlap area)", () => {
    expect(
      rectsIntersect(rect, { x: 150, y: 100, width: 10, height: 10 }),
    ).toBe(false);
  });
});

describe("circleRectCollision — bounce geometry (owner rule 4)", () => {
  const rect = { x: 100, y: 100, width: 80, height: 20 };

  it("null when far away", () => {
    expect(circleRectCollision(0, 0, 5, rect)).toBeNull();
  });

  it("null when merely touching (dist === r is not a collision)", () => {
    expect(circleRectCollision(80, 110, 20, rect)).toBeNull();
  });

  it("returns the outward normal + penetration when overlapping from outside", () => {
    // closest point on rect is (100, 115); circle center (85, 115) is 15px
    // to the left with radius 20 => penetration 5, normal points left.
    const hit = circleRectCollision(85, 115, 20, rect);
    expect(hit).toEqual({ nx: -1, ny: 0, penetration: 5 });
  });

  it("pushes toward the nearest edge when the center is inside the rect", () => {
    // rect is 80 wide, 20 tall; center (110,105): distances to
    // left=10 right=70 top=5 bottom=15 -> nearest edge is top.
    const hit = circleRectCollision(110, 105, 3, rect);
    expect(hit).toEqual({ nx: 0, ny: -1, penetration: 8 });
  });
});

describe("reflectVelocity — jittered reflection, not a perfect mirror (owner rule 4)", () => {
  it("mirrors a heading about the normal when jitter is 0", () => {
    // Heading (2,3) hits a wall whose outward normal is (-1,0): the x
    // component flips, the tangential (y) component is untouched.
    expect(reflectVelocity(2, 3, -1, 0, 0)).toEqual({ vx: -2, vy: 3 });
  });

  it("a jitter of 0 never gets a random draw", () => {
    let called = false;
    reflectVelocity(1, 0, -1, 0, 0, () => {
      called = true;
      return 0.5;
    });
    expect(called).toBe(false);
  });

  it("jitter rotates the mirrored heading by a bounded random angle", () => {
    // rand() -> 1 gives the maximum rotation, +jitter radians.
    const jitter = Math.PI / 6; // 30 degrees
    const { vx, vy } = reflectVelocity(1, 0, -1, 0, jitter, () => 1);
    // Mirror of (1,0) about normal (-1,0) is (-1,0); rotating (-1,0) by
    // +30deg gives (-cos(30deg), -sin(30deg)).
    expect(vx).toBeCloseTo(-Math.cos(jitter), 10);
    expect(vy).toBeCloseTo(-Math.sin(jitter), 10);
  });

  it("jitter preserves speed (rotation, not rescale)", () => {
    const before = Math.hypot(4, -7);
    const { vx, vy } = reflectVelocity(4, -7, 0, 1, 0.9, () => 0.37);
    expect(Math.hypot(vx, vy)).toBeCloseTo(before, 8);
  });
});

describe("resolveBounce — the whole per-frame contract (owner rule 4)", () => {
  const rect = { x: 100, y: 100, width: 80, height: 20 };

  it("passes through untouched when there is no collision", () => {
    const result = resolveBounce(0, 0, 1, 1, 5, rect);
    expect(result).toEqual({ x: 0, y: 0, vx: 1, vy: 1, collided: false });
  });

  it("collided circle is pushed fully clear — NEVER overlapping afterward", () => {
    const result = resolveBounce(85, 115, 20, 3, 20, rect, {
      jitter: 0.5,
      rand: seeded(3),
    });
    expect(result.collided).toBe(true);
    // The owner's hard invariant: re-testing the resolved position against
    // the same rect must find no collision at all.
    expect(circleRectCollision(result.x, result.y, 20, rect)).toBeNull();
  });

  it("holds the no-overlap invariant across many random approach angles", () => {
    const rand = seeded(99);
    for (let i = 0; i < 200; i++) {
      const cx = 80 + rand() * 120; // sweeps across/through the rect
      const cy = 90 + rand() * 40;
      const vx = rand() * 2 - 1;
      const vy = rand() * 2 - 1;
      const result = resolveBounce(cx, cy, vx, vy, 12, rect, {
        jitter: 0.8,
        rand,
      });
      if (result.collided) {
        expect(circleRectCollision(result.x, result.y, 12, rect)).toBeNull();
      }
    }
  });
});
