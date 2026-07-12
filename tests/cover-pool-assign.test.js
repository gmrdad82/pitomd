import { describe, it, expect } from "vitest";
import { assignCovers } from "../src/lib/cover-pool-assign.js";
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
