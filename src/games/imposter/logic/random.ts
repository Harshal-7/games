/** A random number in [0, 1). Tests pass a seeded one; the game uses `cryptoRandom`. */
export type Rng = () => number;

/**
 * Real randomness from the browser. `crypto.getRandomValues` also works on plain
 * http (say, a phone on the same Wi-Fi), unlike `crypto.randomUUID`.
 */
export const cryptoRandom: Rng = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 2 ** 32;
};

/** Small seeded generator (mulberry32) for tests and simulations. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Index picked in proportion to `weights` (all ≥ 0, at least one > 0). */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export function randomItem<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export function randomId(rng: Rng): string {
  return Math.floor(rng() * 2 ** 32)
    .toString(36)
    .padStart(7, "0");
}
