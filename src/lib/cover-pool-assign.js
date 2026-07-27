// cover-pool-assign.js — the PURE slot assigner (tested by vitest).
//
// One shuffled draw per STABLE KEY: `assignCovers(pool, slotCount, rand)`
// deals `slotCount` DISTINCT entries from the pool (Fisher–Yates over a
// copy). The no-duplicates guarantee is absolute while slotCount <=
// pool.length — the spec the owner asked for: no cover ever appears twice on
// the page (which also means never twice inside YOUR SHELF, a slide's
// parallax wall, or any other slot group). `rand` is injectable; production
// passes `seededRand(<stable key>)`, never Math.random (5.0.0, "randomness
// is the enemy of caching").

// seededRand(key) — a deterministic PRNG derived from a STABLE KEY string
// (xmur3 hash seeding mulberry32). Same key, same sequence, every visitor,
// every reload: the variation comes from the key, never from a random draw
// at render. cover-slots.js keys it by the UTC day, so within any given day
// the page deals ONE arrangement — repeat views hit the browser/CDN image
// cache instead of fetching a fresh random subset — while the shelf still
// rotates day to day.
export function seededRand(key) {
  // xmur3 string hash → 32-bit seed
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let a = (h ^ (h >>> 16)) >>> 0;
  // mulberry32
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assignCovers(pool, slotCount, rand = Math.random) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  if (slotCount > pool.length) {
    throw new Error(
      `cover pool exhausted: ${slotCount} slots > ${pool.length} covers`,
    );
  }
  const deck = pool.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, slotCount);
}
