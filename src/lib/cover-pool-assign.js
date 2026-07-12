// cover-pool-assign.js — the PURE slot assigner (tested by vitest).
//
// One visit = one shuffled draw: `assignCovers(pool, slotCount, rand)` deals
// `slotCount` DISTINCT entries from the pool (Fisher–Yates over a copy). The
// no-duplicates guarantee is absolute while slotCount <= pool.length — the
// spec the owner asked for: no cover ever appears twice on the page (which
// also means never twice inside YOUR SHELF, a slide's parallax wall, or any
// other slot group). `rand` is injectable so tests can seed it.
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
