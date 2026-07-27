import { describe, it, expect } from "vitest";
import { assignCovers, seededRand } from "../src/lib/cover-pool-assign.js";
import pool from "../src/data/cover-pool.json";

const seeded = (seed) => () => {
  // xorshift-ish deterministic rand for reproducible draws
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 10000) / 10000;
};

describe("assignCovers — the no-duplicate deal", () => {
  it("never deals the same cover twice in one visit (1000 draws)", () => {
    for (let round = 0; round < 1000; round++) {
      const deal = assignCovers(pool, 39);
      const names = deal.map((c) => c.f);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("deals exactly the requested slot count", () => {
    expect(assignCovers(pool, 11)).toHaveLength(11);
    expect(assignCovers(pool, pool.length)).toHaveLength(pool.length);
  });

  it("throws instead of duplicating when slots exceed the pool", () => {
    expect(() => assignCovers(pool, pool.length + 1)).toThrow(/exhausted/);
  });

  it("is deterministic under a seeded rand (same visit, same deal)", () => {
    const a = assignCovers(pool, 20, seeded(42));
    const b = assignCovers(pool, 20, seeded(42));
    expect(a).toEqual(b);
  });

  it("the real pool is large enough for every slot on the page (39)", () => {
    expect(pool.length).toBeGreaterThanOrEqual(39);
  });
});

describe("seededRand — the stable-key PRNG (P24)", () => {
  it("same key, same sequence — every visitor, every reload", () => {
    const a = seededRand("covers:2026-07-26");
    const b = seededRand("covers:2026-07-26");
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("same day key deals the SAME covers (the cache win)", () => {
    const a = assignCovers(pool, 39, seededRand("covers:2026-07-26"));
    const b = assignCovers(pool, 39, seededRand("covers:2026-07-26"));
    expect(a).toEqual(b);
  });

  it("a different day key rotates the deal (freshness survives)", () => {
    const a = assignCovers(pool, 39, seededRand("covers:2026-07-26"));
    const b = assignCovers(pool, 39, seededRand("covers:2026-07-27"));
    expect(a.map((c) => c.f)).not.toEqual(b.map((c) => c.f));
  });

  it("emits floats in [0, 1) so the Fisher–Yates index math stays in range", () => {
    const r = seededRand("range-check");
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
