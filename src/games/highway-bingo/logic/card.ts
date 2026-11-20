import { seeded, type Rng } from "@/party/logic/random";

import type { Code, Size } from "./code";
import { TIERS, type Sight, type Tier } from "./sights";

/**
 * A bingo card, worked out from the code and a seat. Every phone gets the same card for
 * the same code and seat, with nothing sent anywhere.
 *
 * The deal is frozen like the sight lists: the hash, the shuffle and the order of the
 * steps below decide every card, so changing any of them changes every code's cards. A
 * test pins one deal. A different deal needs a new edition.
 */

/** How many of each tier a card gets: the same mix on every card, so nobody gets a harder one. */
export const MIX: Record<Size, Record<Tier, number>> = {
  5: { easy: 10, medium: 10, rare: 4 },
  4: { easy: 7, medium: 7, rare: 2 },
};

/** Seats people can type: 1 is whoever started the game. */
export const MIN_SEAT = 1;
export const MAX_SEAT = 20;

export type Card = {
  size: Size;
  /** Row by row. null is the free middle (5×5 only). */
  cells: (Sight | null)[];
};

/** The free middle of a 5×5 card, or null on 4×4. */
export function freeCell(size: Size): number | null {
  return size === 5 ? 12 : null;
}

export function deal(code: Code, seat: number): Card {
  const { edition, size } = code;
  const rng = seeded(hash(`${code.text}|${seat}|${edition.pack}|${edition.version}|${size}`));
  const picks = TIERS.flatMap((tier) =>
    shuffle(
      edition.sights.filter((s) => s.tier === tier),
      rng,
    ).slice(0, MIX[size][tier]),
  );
  const cells: (Sight | null)[] = shuffle(picks, rng);
  const free = freeCell(size);
  if (free !== null) cells.splice(free, 0, null);
  return { size, cells };
}

/** A string to a 32-bit seed: FNV-1a, then a final mix so close strings land far apart. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Fisher–Yates on a copy. */
function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Every line on a card: the rows, the columns and the two diagonals, as cell numbers. */
export function lines(size: Size): number[][] {
  const range = [...Array(size).keys()];
  return [
    ...range.map((r) => range.map((c) => r * size + c)),
    ...range.map((c) => range.map((r) => r * size + c)),
    range.map((i) => i * size + i),
    range.map((i) => i * size + (size - 1 - i)),
  ];
}

export type Progress = {
  /** Lines with every square marked (the free middle counts). */
  done: number[][];
  /** Every square marked. */
  full: boolean;
  /** The fewest squares still to mark for a line. 0 once there is one. */
  toGo: number;
  /** Squares marked, not counting the free middle. */
  marked: number;
  /** Squares still to mark for a full card. */
  left: number;
};

export function progress(size: Size, marks: readonly number[]): Progress {
  const on = new Set(marks);
  const free = freeCell(size);
  if (free !== null) on.add(free);
  const all = lines(size);
  const done = all.filter((line) => line.every((cell) => on.has(cell)));
  const toGo = Math.min(...all.map((line) => line.filter((cell) => !on.has(cell)).length));
  const left = size * size - on.size;
  return { done, full: left === 0, toGo, marked: free === null ? on.size : on.size - 1, left };
}
