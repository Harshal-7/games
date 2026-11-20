import { weightedIndex, type Rng } from "./random";

/**
 * Fair picks, kept like a shared bill (think Splitwise). For anything that picks people
 * round after round: Imposter's imposters, and who talks first.
 *
 * Every round the seats being picked are split evenly between the players at the table:
 * with 5 players and 1 imposter, each player "owes" a fifth of a turn. Being picked
 * pays off one whole turn. A player's balance is what they owe minus what they've
 * taken, so someone who hasn't been picked for a while is owed a turn.
 *
 * The pick stays random, but a bigger balance means a bigger chance:
 * weight = e^(STRENGTH × balance). A small slice of every pick is plain random, so
 * nobody's chance ever drops to zero and the table can never rule anyone out.
 *
 * Over 3 rounds per player, plain random leaves someone never picked in about 1
 * game in 6 (5 players). This keeps everyone within a turn or two of each other and
 * nobody is left out (fair.test.ts checks both).
 */

export type Tally = { owed: number; taken: number };
export type Ledger = Record<string, Tally>;

/** How hard the pick leans towards whoever is owed a turn. */
export const STRENGTH = 2.5;
/** Share of each pick that's plain random: the floor under everyone's chance. */
export const PLAIN_RANDOM = 0.1;

const EMPTY: Tally = { owed: 0, taken: 0 };

/** Weight per player going into a round with `seats` picks (this round's share included). */
function weights(ids: readonly string[], ledger: Ledger, seats: number): number[] {
  const share = seats / ids.length;
  return ids.map((id) => {
    const tally = ledger[id] ?? EMPTY;
    return Math.exp(STRENGTH * (tally.owed + share - tally.taken));
  });
}

/** Weights to chances, with the plain-random floor mixed in. Sums to 1. */
function odds(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => (1 - PLAIN_RANDOM) * (w / total) + PLAIN_RANDOM / weights.length);
}

/** Each player's chance of the first seat this round. */
export function chances(ids: readonly string[], ledger: Ledger, seats = 1): number[] {
  return odds(weights(ids, ledger, seats));
}

/** Picks `seats` different players, leaning towards whoever is owed a turn. */
export function pickFair(ids: readonly string[], ledger: Ledger, seats: number, rng: Rng): string[] {
  const count = Math.min(seats, ids.length);
  const all = weights(ids, ledger, count);
  const pool = ids.map((id, i) => ({ id, weight: all[i] }));
  const picked: string[] = [];
  while (picked.length < count) {
    const i = weightedIndex(odds(pool.map((p) => p.weight)), rng);
    picked.push(pool.splice(i, 1)[0].id);
  }
  return picked;
}

/** Books a finished pick: everyone at the table owes their share, the picked pay a turn. */
export function settle(ids: readonly string[], ledger: Ledger, picked: readonly string[]): Ledger {
  const share = picked.length / ids.length;
  const next: Ledger = { ...ledger };
  for (const id of ids) {
    const tally = next[id] ?? EMPTY;
    next[id] = { owed: tally.owed + share, taken: tally.taken + (picked.includes(id) ? 1 : 0) };
  }
  return next;
}
